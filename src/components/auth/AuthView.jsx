import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

// ── Screen: Sign in / Sign up ────────────────────────────────────
function LoginScreen({ onForgot, onBack, initialMode = 'login' }) {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth()
  const [isLogin, setIsLogin]     = useState(initialMode === 'login')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [error, setError]         = useState(null)
  const [loading, setLoading]     = useState(false)
  const [verifyMsg, setVerifyMsg] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setVerifyMsg(null)
    setLoading(true)
    try {
      if (isLogin) {
        await signInWithEmail(email, password)
      } else {
        await signUpWithEmail(email, password)
      }
    } catch (err) {
      if (err.code === 'auth/operation-not-allowed') {
        setError("Email/Password sign-in is not enabled. Please enable it in the Firebase Console (Authentication > Sign-in method).")
      } else {
        setError(err.message)
      }
    }
    setLoading(false)
  }

  async function handleGoogleSignIn() {
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      if (err.code === 'auth/unauthorized-domain') {
        setError("This domain is not authorized. Please add '" + window.location.hostname + "' to the Authorized Domains in the Firebase Console.")
      } else {
        setError(err.message)
      }
    }
  }

  // ── Email verify holding screen ──
  if (verifyMsg) {
    return (
      <div style={S.card}>
        <div style={S.icon}>📬</div>
        <h2 style={S.title}>Check your inbox</h2>
        <p style={S.sub}>
          We sent a confirmation link to<br />
          <strong style={{ color: '#e8e9f4' }}>{verifyMsg}</strong>
        </p>
        <p style={{ ...S.sub, opacity: 0.55, fontSize: 13 }}>
          Click the link in the email to activate your account.
          The link expires in 24 hours.
        </p>
        {onBack && (
          <button style={S.backBtn} onClick={onBack}>
            ← Back to Hiro
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={S.card}>

      {/* Back to landing */}
      {onBack && (
        <button style={S.backBtn} onClick={onBack}>
          ← Back
        </button>
      )}

      <div style={S.logo}>hiro</div>
      <h2 style={S.title}>
        {isLogin ? 'Sign in to your Hiro account' : 'Join the future of hiring'}
      </h2>

      {/* Google OAuth */}
      <button style={S.googleBtn} onClick={handleGoogleSignIn}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.706 17.64 9.2z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <div style={S.divider}><span>or</span></div>

      {/* Email / password form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          style={S.input}
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <input
          style={S.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete={isLogin ? 'current-password' : 'new-password'}
        />

        {isLogin && (
          <button type="button" style={S.forgotBtn} onClick={onForgot}>
            Forgot password?
          </button>
        )}

        {error && <p style={S.error}>{error}</p>}

        <button type="submit" style={S.submitBtn} disabled={loading}>
          {loading ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <p style={S.switchTxt}>
        {isLogin ? "Don't have an account? " : 'Already have an account? '}
        <button style={S.switchBtn} onClick={() => { setIsLogin(!isLogin); setError(null) }}>
          {isLogin ? 'Sign up free' : 'Sign in'}
        </button>
      </p>

      {!isLogin && (
        <p style={S.legal}>
          By creating an account you agree to our{' '}
          <a href="#" style={S.legalLink}>Terms</a> and{' '}
          <a href="#" style={S.legalLink}>Privacy Policy</a>.
        </p>
      )}
    </div>
  )
}

// ── Screen: Forgot password ──────────────────────────────────────
function ForgotScreen({ onBack }) {
  const { resetPassword } = useAuth()
  const [email, setEmail]   = useState('')
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div style={S.card}>
        <div style={S.icon}>📨</div>
        <h2 style={S.title}>Reset link sent</h2>
        <p style={S.sub}>
          We emailed a reset link to <strong style={{ color: '#e8e9f4' }}>{email}</strong>.<br />
          Check your inbox (and spam). The link expires in 1 hour.
        </p>
        <button style={S.backBtn} onClick={onBack}>← Back to sign in</button>
      </div>
    )
  }

  return (
    <div style={S.card}>
      <button style={S.backBtn} onClick={onBack}>← Back to sign in</button>
      <div style={S.logo}>hiro</div>
      <h2 style={S.title}>Reset your password</h2>
      <p style={S.sub}>Enter your account email and we&apos;ll send you a reset link.</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          style={S.input}
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        {error && <p style={S.error}>{error}</p>}
        <button type="submit" style={S.submitBtn} disabled={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </div>
  )
}

// ── Screen: Set new password (after reset link) ──────────────────
function ResetPasswordScreen() {
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await updatePassword(password)
      setDone(true)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div style={S.card}>
        <div style={S.icon}>✅</div>
        <h2 style={S.title}>Password updated</h2>
        <p style={S.sub}>Your new password is set. Signing you in…</p>
      </div>
    )
  }

  return (
    <div style={S.card}>
      <div style={S.logo}>hiro</div>
      <h2 style={S.title}>Set a new password</h2>
      <p style={S.sub}>Choose a strong password for your Hiro account.</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          style={S.input}
          type="password"
          placeholder="New password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
        {error && <p style={S.error}>{error}</p>}
        <button type="submit" style={S.submitBtn} disabled={loading}>
          {loading ? 'Saving…' : 'Set new password'}
        </button>
      </form>
    </div>
  )
}

// ── Root AuthView ────────────────────────────────────────────────
export default function AuthView({ onBack, initialMode = 'login' }) {
  const { passwordRecovery } = useAuth()
  const [screen, setScreen] = useState('login')   // 'login' | 'forgot'

  // Password recovery flow takes full priority
  if (passwordRecovery) return (
    <div style={S.root}>
      <ResetPasswordScreen />
    </div>
  )

  return (
    <div style={S.root}>
      {screen === 'forgot'
        ? <ForgotScreen onBack={() => setScreen('login')} />
        : <LoginScreen
            onForgot={() => setScreen('forgot')}
            onBack={onBack}
            initialMode={initialMode}
          />
      }
    </div>
  )
}

// ── Styles ───────────────────────────────────────────────────────
const S = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#06070f',
    padding: '24px 16px',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: 'rgba(14,17,36,0.95)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: '40px 36px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  logo: {
    fontSize: 26,
    fontWeight: 800,
    letterSpacing: '-0.5px',
    background: 'linear-gradient(135deg,#6c47ff,#a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: 2,
  },
  icon: {
    fontSize: 36,
    marginBottom: 4,
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: '#e8e9f4',
    letterSpacing: '-0.3px',
  },
  sub: {
    margin: 0,
    fontSize: 14,
    color: '#9899b0',
    lineHeight: 1.6,
  },
  input: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '12px 14px',
    color: '#e8e9f4',
    fontSize: 14,
    fontFamily: 'Inter, system-ui, sans-serif',
    outline: 'none',
    transition: 'border-color .15s',
  },
  submitBtn: {
    padding: '12px 0',
    borderRadius: 10,
    border: 'none',
    background: 'linear-gradient(135deg,#6c47ff,#4338ca)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Inter, system-ui, sans-serif',
    boxShadow: '0 8px 24px rgba(108,71,255,0.35)',
    transition: 'filter .18s',
    marginTop: 4,
  },
  googleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '11px 0',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.06)',
    color: '#e8e9f4',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Inter, system-ui, sans-serif',
    transition: 'background .15s',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    color: '#5a5b72',
    fontSize: 12,
    '::before': { content: '""', flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' },
  },
  forgotBtn: {
    background: 'none',
    border: 'none',
    color: '#6c47ff',
    fontSize: 13,
    cursor: 'pointer',
    textAlign: 'right',
    fontFamily: 'Inter, system-ui, sans-serif',
    padding: 0,
  },
  switchTxt: {
    textAlign: 'center',
    fontSize: 13,
    color: '#9899b0',
    margin: 0,
  },
  switchBtn: {
    background: 'none',
    border: 'none',
    color: '#6c47ff',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    padding: 0,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#9899b0',
    fontSize: 13,
    cursor: 'pointer',
    padding: 0,
    fontFamily: 'Inter, system-ui, sans-serif',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    transition: 'color .15s',
  },
  error: {
    margin: 0,
    fontSize: 13,
    color: '#fb7185',
    background: 'rgba(251,113,133,0.1)',
    border: '1px solid rgba(251,113,133,0.2)',
    borderRadius: 8,
    padding: '8px 12px',
  },
  legal: {
    textAlign: 'center',
    fontSize: 12,
    color: '#5a5b72',
    margin: 0,
    lineHeight: 1.5,
  },
  legalLink: {
    color: '#6c47ff',
    textDecoration: 'none',
  },
}
