import { useApp } from '../../context/AppContext';

export default function ToastContainer() {
  const { toasts } = useApp();

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}>
          <span style={{ fontSize: 14 }}>
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : '◈'}
          </span>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
