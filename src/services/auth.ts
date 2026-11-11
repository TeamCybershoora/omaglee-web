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

export function initGoogleSignIn(state: AppState, el: DOMElements): void {
  if (!window.google?.accounts?.id || !el.googleBtnSlot) return;

  try {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (resp: any) => handleGoogleCredentialResponse(state, el, resp),
      auto_select: false,
      cancel_on_tap_outside: true
    });

    el.googleBtnSlot.innerHTML = '';
    window.google.accounts.id.renderButton(el.googleBtnSlot, {
      theme: 'filled_black',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      width: 300
    });

    updateGoogleBtnState(el);
  } catch (err) {
    console.warn('Google SDK init error:', err);
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
