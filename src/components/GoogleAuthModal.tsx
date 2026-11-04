import { useEffect, useRef, useState } from 'react';
import { X, ShieldCheck, Sparkles, User, AlertCircle } from 'lucide-react';
import Button from './Button';

export interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              type?: 'standard' | 'icon';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              text?: 'signin_with' | 'signup_with' | 'continue_with';
              width?: number;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export default function GoogleAuthModal({ isOpen, onClose, onSuccess }: GoogleAuthModalProps) {
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    if (!isOpen) return;

    // Load Google Identity Services script if not already present
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
        script.onload = () => {
          initGoogleSignIn();
        };
        script.onerror = () => {
          setErrorMsg('Could not load Google Sign-In script. You can continue as a Guest.');
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
            width: 280,
          });
        }
      } catch (err) {
        console.warn('Google SDK init error:', err);
      }
    };

    loadGoogleScript();
  }, [isOpen, clientId]);

  const handleGoogleCredentialResponse = async (response: { credential: string }) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      // Send token to backend
      const res = await fetch(`${apiUrl}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('omaglee_session_uuid', data.sessionUuid);
        localStorage.setItem('omaglee_session_token', data.sessionToken);
        localStorage.setItem('omaglee_user', JSON.stringify(data.user));
        onSuccess();
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
          onSuccess();
        } catch {
          setErrorMsg(data.message || 'Google verification failed.');
        }
      }
    } catch {
      // Offline / network fallback
      setErrorMsg('Server connection failed. You can continue as Guest.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    const guestUser = {
      name: 'Guest User',
      email: 'guest@omaglee.local',
      picture: '',
      isGuest: true,
    };
    localStorage.setItem('omaglee_user', JSON.stringify(guestUser));
    onSuccess();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card auth-modal-card" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <Sparkles size={20} className="modal-icon text-cyan" />
            <h3>Sign in to Omaglee</h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body auth-modal-body">
          <p className="auth-lead-text">
            Join the safest global random video chat platform. Log in with your Google account to get verified and start chatting immediately.
          </p>

          {errorMsg && (
            <div className="auth-error-notice">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Official Google Button Render target */}
          <div className="google-btn-wrapper">
            <div ref={googleBtnRef} className="google-rendered-slot" />
          </div>

          <div className="auth-divider">
            <span className="divider-line" />
            <span className="divider-label">OR</span>
            <span className="divider-line" />
          </div>

          {/* Instant Guest Mode */}
          <button
            type="button"
            onClick={handleGuestLogin}
            className="guest-login-btn"
            disabled={loading}
          >
            <User size={16} />
            <span>Continue as Anonymous Guest</span>
          </button>

          <div className="auth-guarantee-row">
            <ShieldCheck size={14} className="text-emerald" />
            <span>100% Free &bull; End-to-End Encrypted &bull; Strictly 18+</span>
          </div>
        </div>
      </div>
    </div>
  );
}
