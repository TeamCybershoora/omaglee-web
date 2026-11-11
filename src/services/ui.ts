/**
 * UI Service - DOM bindings, Notifications, Themes & Modals
 */

import { AppState, DOMElements, NoticeType, CallState } from '../types';

export function getDOMElements(): DOMElements {
  return {
    authScreen: document.getElementById('auth-screen'),
    chatScreen: document.getElementById('chat-screen'),
    googleBtnSlot: document.getElementById('google-btn-slot'),
    googleAuthWrapper: document.getElementById('google-auth-wrapper'),
    googleBtnOverlay: document.getElementById('google-btn-overlay'),
    authAgeLabel: document.getElementById('auth-age-label'),
    ageCheck: document.getElementById('auth-age-check') as HTMLInputElement | null,
    authError: document.getElementById('auth-error-notice'),
    authErrorText: document.getElementById('auth-error-text'),

    onlineBadge: document.querySelectorAll('.online-count-text') as NodeListOf<HTMLElement>,
    themeToggles: document.querySelectorAll('.theme-toggle-btn') as NodeListOf<HTMLElement>,
    userProfilePill: document.getElementById('user-profile-pill'),
    userName: document.getElementById('user-name-text'),
    userAvatar: document.getElementById('user-avatar-img') as HTMLImageElement | null,
    userAvatarPlaceholder: document.getElementById('user-avatar-placeholder'),
    logoutBtn: document.getElementById('logout-btn'),

    localVideo: document.getElementById('local-video') as HTMLVideoElement | null,
    remoteVideo: document.getElementById('remote-video') as HTMLVideoElement | null,
    strangerStandby: document.getElementById('stranger-standby'),
    strangerSearching: document.getElementById('stranger-searching'),
    strangerConnecting: document.getElementById('stranger-connecting'),
    searchingTimer: document.getElementById('searching-timer-text'),

    startBtn: document.getElementById('start-btn'),
    standbyStartBtn: document.getElementById('standby-start-btn'),
    nextBtn: document.getElementById('next-btn'),
    stopBtn: document.getElementById('stop-btn'),

    micBtn: document.getElementById('mic-btn'),
    camBtn: document.getElementById('cam-btn'),
    screenBtn: document.getElementById('screen-btn'),
    localMicBtn: document.getElementById('local-mic-btn'),
    localCamBtn: document.getElementById('local-cam-btn'),
    requestPermsBtn: document.getElementById('request-perms-btn'),

    chatMessages: document.getElementById('chat-messages'),
    chatForm: document.getElementById('chat-input-form') as HTMLFormElement | null,
    chatInput: document.getElementById('chat-text-input') as HTMLInputElement | null,
    chatStatusBadge: document.getElementById('chat-status-badge'),
    mobileChatToggle: document.getElementById('mobile-chat-toggle'),
    mobileChatClose: document.getElementById('mobile-chat-close'),
    chatPanelCard: document.getElementById('chat-panel-card'),

    toast: document.getElementById('notice-toast'),
    toastText: document.getElementById('notice-toast-text'),
    toastClose: document.getElementById('notice-toast-close'),

    reportModal: document.getElementById('report-modal'),
    reportBtn: document.getElementById('report-btn'),
    closeReportBtn: document.getElementById('close-report-btn'),
    dismissReportBtn: document.getElementById('dismiss-report-btn'),
    submitReportBtn: document.getElementById('submit-report-btn'),
    blockStrangerBtn: document.getElementById('block-stranger-btn'),
    reportReason: document.getElementById('report-reason-select') as HTMLSelectElement | null,
    reportDesc: document.getElementById('report-desc-input') as HTMLTextAreaElement | null,

    settingsModal: document.getElementById('settings-modal'),
    settingsBtn: document.getElementById('settings-btn'),
    dockSettingsBtn: document.getElementById('dock-settings-btn'),
    closeSettingsBtn: document.getElementById('close-settings-btn'),
    doneSettingsBtn: document.getElementById('done-settings-btn'),
    resetSettingsBtn: document.getElementById('reset-settings-btn'),
    cameraSelect: document.getElementById('settings-camera-select') as HTMLSelectElement | null,
    micSelect: document.getElementById('settings-mic-select') as HTMLSelectElement | null,
    mirrorSwitch: document.getElementById('mirror-video-switch'),
    mirrorStatusText: document.getElementById('mirror-status-text'),
    autoMuteSwitch: document.getElementById('auto-mute-switch'),
    autoMuteStatusText: document.getElementById('auto-mute-status-text'),
    privacySwitch: document.getElementById('privacy-mode-switch'),
    privacyStatusText: document.getElementById('privacy-status-text'),
    signalingStatusText: document.getElementById('signaling-status-text'),
    signalingTurnNote: document.getElementById('signaling-turn-note'),

    aboutModal: document.getElementById('about-modal'),
    aboutNavBtn: document.getElementById('about-nav-btn'),
    aboutInfoBtn: document.getElementById('about-info-btn'),
    closeAboutBtn: document.getElementById('close-about-btn'),
    doneAboutBtn: document.getElementById('done-about-btn'),
  };
}

let toastTimeout: number | null = null;

export function showToast(el: DOMElements, message: string, type: NoticeType = 'neutral'): void {
  if (!el.toast || !el.toastText) return;
  if (toastTimeout) clearTimeout(toastTimeout as any);

  el.toast.className = `cyber-notice-toast ${type}`;
  el.toastText.textContent = message;
  el.toast.style.display = 'block';

  toastTimeout = setTimeout(() => {
    if (el.toast) el.toast.style.display = 'none';
  }, 4500);
}

export function closeModals(el: DOMElements): void {
  if (el.reportModal) el.reportModal.style.display = 'none';
  if (el.settingsModal) el.settingsModal.style.display = 'none';
  if (el.aboutModal) el.aboutModal.style.display = 'none';
}

const SUN_ICON_SVG =
  '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';

const MOON_ICON_SVG =
  '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';

export function applyTheme(state: AppState, el?: DOMElements): void {
  document.body.className = `theme-${state.theme}`;
  const shell = document.querySelector('.cyber-app-shell');
  if (shell) shell.className = `cyber-app-shell theme-${state.theme}`;
  const authShell = document.getElementById('auth-screen');
  if (authShell) authShell.className = `auth-fullscreen-container theme-${state.theme}`;

  const buttons = el?.themeToggles || (document.querySelectorAll('.theme-toggle-btn') as NodeListOf<HTMLElement>);
  buttons.forEach(btn => {
    btn.innerHTML = state.theme === 'dark' ? SUN_ICON_SVG : MOON_ICON_SVG;
    btn.title = state.theme === 'dark' ? 'Switch to Day Mode' : 'Switch to Night Mode';
  });
}

export function toggleTheme(state: AppState, el?: DOMElements): void {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem('omaglee_theme', state.theme);
  } catch {}
  applyTheme(state, el);
}

export function applyMirrorSetting(state: AppState, el: DOMElements): void {
  if (!el.localVideo) return;
  const shouldMirror = state.mirrorVideo && !state.isScreenSharing;
  el.localVideo.style.transform = shouldMirror ? 'scaleX(-1)' : 'none';
}

export function syncSettingsUI(state: AppState, el: DOMElements): void {
  if (el.mirrorSwitch) el.mirrorSwitch.classList.toggle('active', state.mirrorVideo);
  if (el.mirrorStatusText) el.mirrorStatusText.textContent = state.mirrorVideo ? 'ON' : 'OFF';

  if (el.autoMuteSwitch) el.autoMuteSwitch.classList.toggle('active', state.autoMuteOnJoin);
  if (el.autoMuteStatusText) el.autoMuteStatusText.textContent = state.autoMuteOnJoin ? 'ON' : 'OFF';

  if (el.privacySwitch) el.privacySwitch.classList.toggle('active', state.privacyMode);
  if (el.privacyStatusText) el.privacyStatusText.textContent = state.privacyMode ? 'ON' : 'OFF';

  if (el.signalingTurnNote) {
    if (state.turnAvailable === null) {
      el.signalingTurnNote.textContent = 'Checking relay...';
    } else if (state.turnAvailable) {
      el.signalingTurnNote.textContent = 'TURN Relay Ready';
    } else {
      el.signalingTurnNote.textContent = 'Direct STUN Mode';
    }
  }
}

export function setCallState(state: AppState, el: DOMElements, newState: CallState): void {
  state.callState = newState;

  if (newState === 'IDLE') {
    if (el.strangerStandby) el.strangerStandby.style.display = 'flex';
    if (el.strangerSearching) el.strangerSearching.style.display = 'none';
    if (el.strangerConnecting) el.strangerConnecting.style.display = 'none';
    if (el.remoteVideo) el.remoteVideo.style.display = 'none';
    if (el.startBtn) el.startBtn.style.display = 'inline-flex';
    if (el.nextBtn) el.nextBtn.style.display = 'none';
    if (el.stopBtn) el.stopBtn.style.display = 'none';
    if (el.chatStatusBadge) el.chatStatusBadge.textContent = 'Standby';
    if (el.signalingStatusText) el.signalingStatusText.textContent = 'Standby';
  } else if (newState === 'SEARCHING') {
    if (el.strangerStandby) el.strangerStandby.style.display = 'none';
    if (el.strangerSearching) el.strangerSearching.style.display = 'flex';
    if (el.strangerConnecting) el.strangerConnecting.style.display = 'none';
    if (el.remoteVideo) el.remoteVideo.style.display = 'none';
    if (el.startBtn) el.startBtn.style.display = 'none';
    if (el.nextBtn) el.nextBtn.style.display = 'inline-flex';
    if (el.stopBtn) el.stopBtn.style.display = 'inline-flex';
    if (el.chatStatusBadge) el.chatStatusBadge.textContent = 'Searching...';
    if (el.signalingStatusText) el.signalingStatusText.textContent = 'Searching';
  } else if (newState === 'CONNECTING') {
    if (el.strangerStandby) el.strangerStandby.style.display = 'none';
    if (el.strangerSearching) el.strangerSearching.style.display = 'none';
    if (el.strangerConnecting) el.strangerConnecting.style.display = 'flex';
    if (el.remoteVideo) el.remoteVideo.style.display = 'none';
    if (el.chatStatusBadge) el.chatStatusBadge.textContent = 'Connecting...';
    if (el.signalingStatusText) el.signalingStatusText.textContent = 'Connecting';
  } else if (newState === 'CONNECTED') {
    if (el.strangerStandby) el.strangerStandby.style.display = 'none';
    if (el.strangerSearching) el.strangerSearching.style.display = 'none';
    if (el.strangerConnecting) el.strangerConnecting.style.display = 'none';
    if (el.remoteVideo) el.remoteVideo.style.display = 'block';
    if (el.startBtn) el.startBtn.style.display = 'none';
    if (el.nextBtn) el.nextBtn.style.display = 'inline-flex';
    if (el.stopBtn) el.stopBtn.style.display = 'inline-flex';
    if (el.chatStatusBadge) el.chatStatusBadge.textContent = 'Connected';
    if (el.signalingStatusText) el.signalingStatusText.textContent = 'Connected';
  }
}
