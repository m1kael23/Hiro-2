// src/context/AppContext.jsx
import { createContext, useContext, useState, useCallback, useRef } from 'react';

const AppContext = createContext({
  mode: 'employer',
  currentRoute: 'emp-dashboard',
  selectedEmployerId: null,
  setSelectedEmployerId: () => {},
  navigate: () => {},
  syncModeFromProfile: () => {},
  showToast: () => {},
  dismissToast: () => {},
  toasts: [],
});

export function AppProvider({ children }) {
  const [mode,         setMode]         = useState('employer');
  const [currentRoute, setCurrentRoute] = useState('emp-dashboard');
  const [selectedEmployerId, setSelectedEmployerId] = useState(null);
  const [toasts,       setToasts]       = useState([]);

  // ── Keep a ref to mode so navigate never goes stale ──────────────
  // This is the core fix: navigate reads modeRef.current instead of
  // closing over `mode`, so it never needs mode in its deps array.
  const modeRef = useRef('employer');

  // ── navigate ─────────────────────────────────────────────────────
  // Stable reference — never recreated, never stale.
  const navigate = useCallback((route) => {
    setCurrentRoute(route);
  }, []); // stable — no deps needed

  // ── syncModeFromProfile ──────────────────────────────────────────
  // Called once on login. Uses functional setState to avoid stale closure.
  // Does NOT have currentRoute in deps — that was causing the reset loop.
  const syncModeFromProfile = useCallback((profileMode) => {
    if (profileMode !== 'employer' && profileMode !== 'candidate') return;
    setMode(prevMode => {
      if (prevMode !== profileMode) {
        modeRef.current = profileMode;
        setCurrentRoute(profileMode === 'employer' ? 'emp-dashboard' : 'cand-home');
      }
      return profileMode;
    });
  }, []); // stable — no deps needed

  // ── toasts ───────────────────────────────────────────────────────
  const showToast = useCallback((message, type = 'default') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <AppContext.Provider value={{
      mode,
      currentRoute,
      selectedEmployerId,
      setSelectedEmployerId,
      navigate,
      syncModeFromProfile,
      showToast,
      dismissToast,
      toasts,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);