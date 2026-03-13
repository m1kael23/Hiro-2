import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useApp } from './context/AppContext';
import Topbar from './components/layout/Topbar';
import Sidebar from './components/layout/Sidebar';
import ToastContainer from './components/ui/Toast';
import AuthView from './components/auth/AuthView';
import OnboardingView from './components/auth/OnboardingView';
import SplashScreen from './components/shared/SplashScreen';
import LandingPage from './components/shared/LandingPage';
import NotificationsView from './components/shared/NotificationsView';

// Employer views
import EmpDashboard   from './components/employer/EmpDashboard';
import EmpPipeline    from './components/employer/EmpPipeline';
import EmpCandidates  from './components/employer/EmpCandidates';
import EmpJobs        from './components/employer/EmpJobs';
import EmpCreateJob   from './components/employer/EmpCreateJob';
import EmpTeamDNA     from './components/employer/EmpTeamDNA';
import EmpTracker     from './components/employer/EmpTracker';
import EmpReviews     from './components/employer/EmpReviews';
import EmpCompany     from './components/employer/EmpCompany';
import EmpGhosting    from './components/employer/EmpGhosting';
import EmpPricing     from './components/employer/EmpPricing';
import EmpBench       from './components/employer/EmpBench';
import EmpOfferIntel  from './components/employer/EmpOfferIntel';
import EmpPulse       from './components/employer/EmpPulse';
import EmpVault       from './components/employer/EmpVault';
import EmpSettings    from './components/employer/EmpSettings';

// Candidate views
import CandHome       from './components/candidate/CandHome';
import CandJobs       from './components/candidate/CandJobs';
import CandWorkDNA    from './components/candidate/CandWorkDNA';
import CandMatches    from './components/candidate/CandMatches';
import CandMessages   from './components/candidate/CandMessages';
import CandApps       from './components/candidate/CandApps';
import CandProfile    from './components/candidate/CandProfile';
import CandReviews    from './components/candidate/CandReviews';
import CandStealth    from './components/candidate/CandStealth';
import CandCompany    from './components/candidate/CandCompany';
import CandGhosting   from './components/candidate/CandGhosting';
import CandTrajectory from './components/candidate/CandTrajectory';
import CandBench      from './components/candidate/CandBench';
import CandOfferIntel from './components/candidate/CandOfferIntel';
import CandPulse      from './components/candidate/CandPulse';
import CandVault      from './components/candidate/CandVault';
import CandSettings   from './components/candidate/CandSettings';

// Legal pages
import PrivacyPolicy  from './components/legal/PrivacyPolicy';
import TermsOfService from './components/legal/TermsOfService';
import CookiePolicy   from './components/legal/CookiePolicy';

// New features — Batch 4
import AdminPanel          from './components/admin/AdminPanel';
import ReferralHub         from './components/shared/ReferralHub';
import EmpMessages         from './components/employer/EmpMessages';
import PublicEmployerPage  from './components/employer/PublicEmployerPage';

// Batch 5 — Blind matching
import EmpBlindMatches     from './components/employer/EmpBlindMatches';
import CandBlindMatches    from './components/candidate/CandBlindMatches';

const VIEW_MAP = {
  'emp-dashboard':    EmpDashboard,
  'emp-pipeline':     EmpPipeline,
  'emp-candidates':   EmpCandidates,
  'emp-jobs':         EmpJobs,
  'emp-create-job':   EmpCreateJob,
  'emp-team-dna':     EmpTeamDNA,
  'emp-tracker':      EmpTracker,
  'emp-reviews':      EmpReviews,
  'emp-pulse':        EmpPulse,
  'emp-company':      EmpCompany,
  'emp-ghosting':     EmpGhosting,
  'emp-pricing':      EmpPricing,
  'emp-bench':        EmpBench,
  'emp-offer-intel':  EmpOfferIntel,
  'emp-vault':        EmpVault,
  'emp-settings':     EmpSettings,
  'cand-home':        CandHome,
  'cand-jobs':        CandJobs,
  'cand-matches':     CandMatches,
  'cand-apps':        CandApps,
  'cand-messages':    CandMessages,
  'cand-work-dna':    CandWorkDNA,
  'cand-profile':     CandProfile,
  'cand-trajectory':  CandTrajectory,
  'cand-bench':       CandBench,
  'cand-reviews':     CandReviews,
  'cand-ghosting':    CandGhosting,
  'cand-stealth':     CandStealth,
  'cand-offer-intel': CandOfferIntel,
  'cand-pulse':       CandPulse,
  'cand-vault':       CandVault,
  'cand-company':     CandCompany,
  'cand-settings':    CandSettings,
  'notifications':     NotificationsView,
  'legal-privacy':    PrivacyPolicy,
  'legal-terms':      TermsOfService,
  'legal-cookies':    CookiePolicy,
  // Batch 4 routes
  'admin':                AdminPanel,
  'referral':             ReferralHub,
  'emp-messages':         EmpMessages,
  'public-employer':      PublicEmployerPage,
  // Batch 5 — Blind matching
  'emp-blind-matches':    EmpBlindMatches,
  'cand-blind-matches':   CandBlindMatches,
};

export default function App() {
  const { currentRoute, syncModeFromProfile } = useApp();
  const { session, profile, loading } = useAuth();
  const [authScreen, setAuthScreen] = useState('landing');

  // Sync mode when profile loads
  useEffect(() => {
    if (profile?.mode) syncModeFromProfile(profile.mode);
  }, [profile?.mode, syncModeFromProfile]);

  // ── KEY FIX: when session is cleared (sign out), go to landing ──
  useEffect(() => {
    if (!session && !loading) setAuthScreen('landing');
  }, [session, loading]);

  // ── 1. Loading ──────────────────────────────────────────────────
  if (loading) return <SplashScreen />;

  // ── 2. Unauthenticated ─────────────────────────────────────────
  if (!session) {
    if (currentRoute === 'legal-privacy') return <PrivacyPolicy />;
    if (currentRoute === 'legal-terms')   return <TermsOfService />;
    if (currentRoute === 'legal-cookies') return <CookiePolicy />;

    if (authScreen === 'login' || authScreen === 'signup') {
      return (
        <AuthView
          initialMode={authScreen}
          onBack={() => setAuthScreen('landing')}
        />
      );
    }

    return (
      <LandingPage
        onLogin={() => setAuthScreen('login')}
        onSignup={() => setAuthScreen('signup')}
      />
    );
  }

  // ── 3. Authenticated but no profile ────────────────────────────
  if (!profile) return <OnboardingView />;

  // ── 4. App shell ───────────────────────────────────────────────
  // Enforce role-based routing
  let activeRoute = currentRoute;
  const isEmployer = profile.mode === 'employer';
  
  // Allow shared routes for both modes
  const sharedRoutes = ['admin', 'referral', 'public-employer', 'notifications', 'legal-privacy', 'legal-terms', 'legal-cookies'];
  
  if (!sharedRoutes.includes(activeRoute)) {
    if (isEmployer && activeRoute.startsWith('cand-')) {
      activeRoute = 'emp-dashboard';
    } else if (!isEmployer && activeRoute.startsWith('emp-')) {
      activeRoute = 'cand-home';
    }
  }

  const View = VIEW_MAP[activeRoute] || (isEmployer ? EmpDashboard : CandHome);

  return (
    <div className="app-shell">
      <Topbar />
      <div className="app-body">
        <Sidebar />
        <div className="main-area">
          <View key={activeRoute} employerId={activeRoute === 'public-employer' ? profile?.id : undefined} />
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}