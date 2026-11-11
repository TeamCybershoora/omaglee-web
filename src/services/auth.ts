/**
 * Auth Service - Google Identity Services & Session Management
 */

import { AppState, DOMElements, CurrentUser } from '../types';
import { API_URL, GOOGLE_CLIENT_ID } from '../config';
import { showToast } from './ui';
import { startLocalPreview } from './media';

declare global {
  interface Window {
    google?: any;
  }
}

export function loadStoredUser(): CurrentUser | null {
  try {
    const stored = localStorage.getItem('omaglee_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function updateGoogleBtnState(el: DOMElements): void {
  const is18Plus = !!(el.ageCheck && el.ageCheck.checked);
  if (el.googleBtnOverlay) {
    el.googleBtnOverlay.style.display = is18Plus ? 'none' : 'block';
  }
  if (is18Plus && el.authError) {
    el.authError.style.display = 'none';
  }
}

export function showAuthError(el: DOMElements, msg: string): void {
  if (!el.authError || !el.authErrorText) return;
  el.authErrorText.textContent = msg;
  el.authError.style.display = 'flex';
}

export function updateAuthView(state: AppState, el: DOMElements): void {
  state.currentUser = loadStoredUser();

  if (!state.currentUser) {
    if (el.authScreen) el.authScreen.style.display = 'flex';
    if (el.chatScreen) el.chatScreen.style.display = 'none';
    initGoogleSignIn(state, el);
  } else {
    if (el.authScreen) el.authScreen.style.display = 'none';
    if (el.chatScreen) el.chatScreen.style.display = 'flex';

    if (el.userName) el.userName.textContent = state.currentUser.name || 'User';
    if (state.currentUser.picture && el.userAvatar) {
      el.userAvatar.src = state.currentUser.picture;
      el.userAvatar.style.display = 'block';
      if (el.userAvatarPlaceholder) el.userAvatarPlaceholder.style.display = 'none';
    } else {
      if (el.userAvatar) el.userAvatar.style.display = 'none';
      if (el.userAvatarPlaceholder) {
        el.userAvatarPlaceholder.textContent = (state.currentUser.name || 'U').charAt(0).toUpperCase();
        el.userAvatarPlaceholder.style.display = 'flex';
      }
    }

    startLocalPreview(state, el);
  }
}

let googleSdkWaitTimer: ReturnType<typeof setInterval> | null = null;
let googleSdkInitialized = false;

function renderGoogleFallbackPlaceholder(el: DOMElements, retryFn: () => void): void {
  if (!el.googleBtnSlot || el.googleBtnSlot.querySelector('iframe')) return;
  if (el.googleBtnSlot.querySelector('.google-fallback-btn')) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'google-fallback-btn';
  btn.style.cssText =
    'width: 300px; max-width: 100%; height: 40px; border-radius: 999px; border: 1px solid #3c4043; background: #131314; color: #e3e3e3; font-family: inherit; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer;';
  btn.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"/><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"/><path fill="#FBBC05" d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.1-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5L1.6 17.1C3.5 21.1 7.4 24 12 24z"/></svg><span>Continue with Google</span>';
  btn.addEventListener('click', () => {
    if (window.google?.accounts?.id) {
      retryFn();
    } else {
      showToast(el, 'Loading Google Sign-In, please wait a moment...', 'neutral');
      retryFn();
    }
  });
  el.googleBtnSlot.innerHTML = '';
  el.googleBtnSlot.appendChild(btn);
}

export function initGoogleSignIn(state: AppState, el: DOMElements): void {
  if (!el.googleBtnSlot) return;

  const tryRender = (): boolean => {
    if (!window.google?.accounts?.id || !el.googleBtnSlot) return false;
    try {
      if (!googleSdkInitialized) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (resp: any) => handleGoogleCredentialResponse(state, el, resp),
          auto_select: false,
          cancel_on_tap_outside: true
        });
        googleSdkInitialized = true;
      }

      el.googleBtnSlot.innerHTML = '';
      window.google.accounts.id.renderButton(el.googleBtnSlot, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        width: 300
      });

      updateGoogleBtnState(el);
      if (googleSdkWaitTimer) {
        clearInterval(googleSdkWaitTimer);
        googleSdkWaitTimer = null;
      }
      return true;
    } catch (err) {
      console.warn('Google SDK init error:', err);
      return false;
    }
  };

  if (tryRender()) return;

  // Show immediate visible button & retry until async GSI script finishes loading
  renderGoogleFallbackPlaceholder(el, () => tryRender());
  updateGoogleBtnState(el);

  if (!googleSdkWaitTimer) {
    let attempts = 0;
    googleSdkWaitTimer = setInterval(() => {
      attempts++;
      if (tryRender() || attempts >= 80) {
        if (googleSdkWaitTimer) {
          clearInterval(googleSdkWaitTimer);
          googleSdkWaitTimer = null;
        }
      }
    }, 150);
  }
}

export async function handleGoogleCredentialResponse(state: AppState, el: DOMElements, response: any): Promise<void> {
  if (!el.ageCheck || !el.ageCheck.checked) {
    showAuthError(el, 'Please confirm you are at least 18 years old to proceed with Google Sign-In.');
    updateGoogleBtnState(el);
    return;
  }

  try {
    const res = await fetch(`${API_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: response.credential })
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      localStorage.setItem('omaglee_session_uuid', data.sessionUuid);
      localStorage.setItem('omaglee_session_token', data.sessionToken);
      localStorage.setItem('omaglee_user', JSON.stringify(data.user));
      state.sessionUuid = data.sessionUuid;
      state.sessionToken = data.sessionToken;
      updateAuthView(state, el);
    } else {
      decodeJwtFallback(state, el, response.credential);
    }
  } catch {
    decodeJwtFallback(state, el, response.credential);
  }
}

export function decodeJwtFallback(state: AppState, el: DOMElements, credential: string): void {
  try {
    const parts = credential.split('.');
    const payload = JSON.parse(atob(parts[1]));
    const user: CurrentUser = {
      name: payload.name || 'Google User',
      email: payload.email,
      picture: payload.picture || ''
    };
    localStorage.removeItem('omaglee_session_uuid');
    localStorage.removeItem('omaglee_session_token');
    state.sessionUuid = null;
    state.sessionToken = null;
    localStorage.setItem('omaglee_user', JSON.stringify(user));
    updateAuthView(state, el);
  } catch {
    showAuthError(el, 'Google sign in verification failed. Please try again.');
  }
}

export function handleLogout(state: AppState, el: DOMElements, onStopCall: () => void): void {
  onStopCall();
  if (state.localStream) {
    state.localStream.getTracks().forEach(t => t.stop());
    state.localStream = null;
  }
  if (el.localVideo) el.localVideo.srcObject = null;

  localStorage.removeItem('omaglee_user');
  localStorage.removeItem('omaglee_session_uuid');
  localStorage.removeItem('omaglee_session_token');
  state.currentUser = null;
  state.sessionUuid = null;
  state.sessionToken = null;
  updateAuthView(state, el);
  showToast(el, 'Signed out successfully.');
}
