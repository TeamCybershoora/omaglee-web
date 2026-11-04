import { useEffect, useRef, useState } from 'react';
import { Video, ShieldCheck, Sparkles, User, AlertCircle, Shield, Globe, Lock, CheckCircle2 } from 'lucide-react';
import Button from './Button';

export interface AuthScreenProps {
  onSuccess: (user: { name: string; email?: string; picture?: string; isGuest?: boolean }) => void;
  onlineCount?: number;
}

export default function AuthScreen({ onSuccess, onlineCount = 10248 }: AuthScreenProps) {
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(true);

  const clientId =
    (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) ||
    '860788640625-qjs1imss7vs50i9on8rgs0hq0on5vohh.apps.googleusercontent.com';

  const backendHost =
    typeof window !== 'undefined' && window.location
      ? `${window.location.protocol}//${window.location.hostname}:8000`
      : 'http://127.0.0.1:8000';

  const apiUrl =
    (import.meta.env.VITE_BACKEND_API_URL as string) || `${backendHost}/api`;

  useEffect(() => {
    // Load Google Identity Services SDK script
    const loadGoogleScript = () => {
      if (window.google?.accounts?.id) {
        initGoogleSignIn();
        return;
      }

      const existingScript = document.getElementById('google-gsi-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'google-gsi-script';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => initGoogleSignIn();
        script.onerror = () => {
          setErrorMsg('Google Sign-In SDK unavailable. You can proceed with "Continue as Guest".');
        };
        document.body.appendChild(script);
      } else {
        existingScript.onload = () => initGoogleSignIn();
      }
    };

    const initGoogleSignIn = () => {
      try {
        if (!window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_black',
            size: 'large',
            shape: 'pill',
            text: 'continue_with',
            width: 320,
          });
        }
      } catch (err) {
        console.warn('[Omaglee Auth] Google SDK init error:', err);
      }
    };

    loadGoogleScript();
  }, [clientId]);

  const handleGoogleCredentialResponse = async (response: { credential: string }) => {
    if (!ageConfirmed) {
      setErrorMsg('Please confirm you are at least 18 years old to proceed.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`${apiUrl}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        localStorage.setItem('omaglee_session_uuid', data.sessionUuid);
        localStorage.setItem('omaglee_session_token', data.sessionToken);
        localStorage.setItem('omaglee_user', JSON.stringify(data.user));
        onSuccess(data.user);
      } else {
        // Fallback: decode JWT client-side
        try {
          const parts = response.credential.split('.');
          const payload = JSON.parse(atob(parts[1]));
          const fallbackUser = {
            name: payload.name || 'Google User',
            email: payload.email,
            picture: payload.picture || '',
          };
          localStorage.setItem('omaglee_user', JSON.stringify(fallbackUser));
          onSuccess(fallbackUser);
        } catch {
          setErrorMsg(data.message || 'Google verification failed.');
        }
      }
    } catch {
      // Offline fallback
      try {
        const parts = response.credential.split('.');
        const payload = JSON.parse(atob(parts[1]));
        const fallbackUser = {
          name: payload.name || 'Google User',
          email: payload.email,
          picture: payload.picture || '',
        };
        localStorage.setItem('omaglee_user', JSON.stringify(fallbackUser));
        onSuccess(fallbackUser);
      } catch {
        setErrorMsg('Network error. You can continue as Guest.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    if (!ageConfirmed) {
      setErrorMsg('Please confirm you are at least 18 years old to proceed.');
      return;
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const guestUser = {
      name: `Guest_${randomSuffix}`,
      email: `guest${randomSuffix}@omaglee.local`,
      picture: '',
      isGuest: true,
    };
    localStorage.setItem('omaglee_user', JSON.stringify(guestUser));
    onSuccess(guestUser);
  };

  return (
    <div className="auth-fullscreen-container">
      {/* Top Navbar */}
      <header className="cyber-navbar auth-navbar">
        <div className="nav-left">
          <div className="brand-logo-wrap">
            <div className="brand-logo-icon">
              <Video size={18} />
            </div>
            <span className="brand-title">Omaglee</span>
          </div>
        </div>

        <div className="nav-right">
          <div className="live-online-pill">
            <span className="status-dot green-dot pulsing-dot" />
            <span className="online-count-text">{onlineCount.toLocaleString()} Online</span>
          </div>
        </div>
      </header>

      {/* Main Center Auth Card */}
      <div className="auth-center-wrap">
        <div className="auth-card-cyber">
          {/* Top Badge */}
          <div className="auth-badge-row">
            <div className="auth-badge">
              <Sparkles size={14} className="text-cyan" />
              <span>Instant Video Matchmaking</span>
            </div>
            <div className="auth-badge safe-badge">
              <ShieldCheck size={14} className="text-emerald" />
              <span>Verified & Safe</span>
            </div>
          </div>

          <h1 className="auth-main-heading">
            Talk to Strangers <span className="gradient-highlight">Face-to-Face</span>
          </h1>
          <p className="auth-sub-heading">
            Connect instantly with interesting people worldwide in encrypted, 1-on-1 random video conversations.
          </p>

          {/* Feature highlights */}
          <div className="auth-features-list">
            <div className="auth-feature-item">
              <Lock size={15} className="feature-icon text-cyan" />
              <span>Peer-to-Peer Encrypted</span>
            </div>
            <div className="auth-feature-item">
              <Globe size={15} className="feature-icon text-emerald" />
              <span>Global Community</span>
            </div>
            <div className="auth-feature-item">
              <Shield size={15} className="feature-icon text-purple" />
              <span>Active AI Safety</span>
            </div>
          </div>

          {errorMsg && (
            <div className="auth-error-notice">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Age & Terms Confirmation Checkbox */}
          <label className="auth-age-check-label">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={e => {
                setAgeConfirmed(e.target.checked);
                if (e.target.checked) setErrorMsg(null);
              }}
              className="auth-checkbox"
            />
            <span className="auth-checkbox-text">
              I certify that I am at least <strong>18 years old</strong> and agree to the <strong>Terms of Service</strong> & <strong>Community Guidelines</strong>.
            </span>
          </label>

          {/* Google Sign In Target */}
          <div className="auth-button-section">
            <div className="google-auth-wrapper">
              <div ref={googleBtnRef} className="google-rendered-slot" />
            </div>

            <div className="auth-divider">
              <span className="divider-line" />
              <span className="divider-label">OR</span>
              <span className="divider-line" />
            </div>

            {/* Guest Sign In Button */}
            <button
              type="button"
              onClick={handleGuestLogin}
              className="guest-login-btn auth-guest-btn"
              disabled={loading}
            >
              <User size={16} />
              <span>Continue as Anonymous Guest</span>
            </button>
          </div>

          {/* Bottom Security Note */}
          <div className="auth-card-footer">
            <div className="auth-guarantee-row">
              <CheckCircle2 size={14} className="text-emerald" />
              <span>Zero Registration Required &bull; No Video Saved &bull; 100% Free</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
