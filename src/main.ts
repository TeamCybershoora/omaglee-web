/**
 * Omaglee Web Client - TypeScript Entry Point
 * Instant Random Video Chat with WebRTC, Google Authentication & Safety Moderation
 */

import { AppState, DOMElements, MatchData } from './types';
import { API_URL } from './config';
import { getDOMElements, showToast, closeModals, toggleTheme } from './services/ui';
import { startLocalPreview, toggleAudio, toggleVideo, toggleScreenShare } from './services/media';
import { updateAuthView, updateGoogleBtnState, handleLogout } from './services/auth';
import { handleStartChatting, handleNextStranger, handleStopCall } from './services/matchmaking';
import { connectMatchedStranger, closePeerConnection } from './services/webrtc';
import { clearChatMessages, appendChatMessage, handleSendChatMessage } from './services/chat';
import { handleSubmitReport, handleBlockStranger } from './services/moderation';

export class OmagleeApp {
  public state: AppState;
  public el!: DOMElements;

  constructor() {
    this.state = {
      currentUser: null,
      sessionUuid: localStorage.getItem('omaglee_session_uuid'),
      sessionToken: localStorage.getItem('omaglee_session_token'),
      callState: 'IDLE',
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      dataChannel: null,
      activeMatch: null,
      isAudioMuted: false,
      isVideoMuted: false,
      isScreenSharing: false,
      privacyMode: false,
      onlineCount: 10248,
      waitingSeconds: 0,
      pollTimer: null,
      waitingTimer: null,
      heartbeatTimer: null,
      sigPollTimer: null,
      processedMsgIds: new Set<string>(),
      theme: 'light'
    };
  }

  public init(): void {
    this.el = getDOMElements();
    this.setupEventListeners();
    this.registerUnloadCleanup();
    updateAuthView(this.state, this.el);
  }

  private registerUnloadCleanup(): void {
    window.addEventListener('beforeunload', () => {
      const { sessionUuid, sessionToken, activeMatch, callState } = this.state;
      if (!sessionUuid || !sessionToken) return;

      const headers = {
        'Content-Type': 'application/json',
        'X-Session-UUID': sessionUuid,
        'X-Session-Token': sessionToken
      };

      if (callState === 'SEARCHING') {
        fetch(`${API_URL}/matchmaking/cancel`, { method: 'POST', headers, keepalive: true }).catch(() => {});
      }
      if (activeMatch?.matchId) {
        fetch(`${API_URL}/matchmaking/leave`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ matchId: activeMatch.matchId }),
          keepalive: true
        }).catch(() => {});
      }
    });
  }

  private setupEventListeners(): void {
    const el = this.el;

    // Auth listeners
    if (el.logoutBtn) {
      el.logoutBtn.addEventListener('click', () => {
        handleLogout(this.state, el, () => this.stopCall());
      });
    }

    if (el.ageCheck) {
      el.ageCheck.addEventListener('change', () => updateGoogleBtnState(el));
    }

    if (el.googleBtnOverlay) {
      el.googleBtnOverlay.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!el.ageCheck || !el.ageCheck.checked) {
          showToast(el, '⚠️ Please certify that you are at least 18 years old by ticking the checkbox above.', 'warning');
          if (el.authAgeLabel) {
            el.authAgeLabel.classList.add('age-highlight-pulse');
            setTimeout(() => el.authAgeLabel?.classList.remove('age-highlight-pulse'), 900);
          }
          if (el.ageCheck) el.ageCheck.focus();
        }
      });
    }

    // Call Actions
    if (el.startBtn) {
      el.startBtn.addEventListener('click', () => this.startChatting());
    }
    if (el.standbyStartBtn) {
      el.standbyStartBtn.addEventListener('click', () => this.startChatting());
    }
    if (el.nextBtn) {
      el.nextBtn.addEventListener('click', () => this.nextStranger());
    }
    if (el.stopBtn) {
      el.stopBtn.addEventListener('click', () => this.stopCall());
    }

    // Media Controls
    if (el.micBtn) el.micBtn.addEventListener('click', () => toggleAudio(this.state, el));
    if (el.camBtn) el.camBtn.addEventListener('click', () => toggleVideo(this.state, el));
    if (el.screenBtn) el.screenBtn.addEventListener('click', () => toggleScreenShare(this.state, el));
    if (el.localMicBtn) el.localMicBtn.addEventListener('click', () => toggleAudio(this.state, el));
    if (el.localCamBtn) el.localCamBtn.addEventListener('click', () => toggleVideo(this.state, el));
    if (el.requestPermsBtn) el.requestPermsBtn.addEventListener('click', () => startLocalPreview(this.state, el));

    // Chat Form
    if (el.chatForm) {
      el.chatForm.addEventListener('submit', (e) => handleSendChatMessage(this.state, el, e));
    }

    // Mobile Chat Drawer
    if (el.mobileChatToggle) {
      el.mobileChatToggle.addEventListener('click', () => {
        el.chatPanelCard?.classList.toggle('mobile-open');
      });
    }
    if (el.mobileChatClose) {
      el.mobileChatClose.addEventListener('click', () => {
        el.chatPanelCard?.classList.remove('mobile-open');
      });
    }

    // Modals
    if (el.reportBtn) el.reportBtn.addEventListener('click', () => { if (el.reportModal) el.reportModal.style.display = 'flex'; });
    if (el.closeReportBtn) el.closeReportBtn.addEventListener('click', () => closeModals(el));
    if (el.dismissReportBtn) el.dismissReportBtn.addEventListener('click', () => closeModals(el));
    if (el.submitReportBtn) el.submitReportBtn.addEventListener('click', () => handleSubmitReport(this.state, el, () => this.nextStranger()));
    if (el.blockStrangerBtn) el.blockStrangerBtn.addEventListener('click', () => handleBlockStranger(this.state, el, () => this.nextStranger()));

    if (el.settingsBtn) el.settingsBtn.addEventListener('click', () => { if (el.settingsModal) el.settingsModal.style.display = 'flex'; });
    if (el.closeSettingsBtn) el.closeSettingsBtn.addEventListener('click', () => closeModals(el));
    if (el.doneSettingsBtn) el.doneSettingsBtn.addEventListener('click', () => closeModals(el));
    if (el.privacySwitch) el.privacySwitch.addEventListener('click', () => this.togglePrivacyMode());

    if (el.aboutNavBtn) el.aboutNavBtn.addEventListener('click', () => { if (el.aboutModal) el.aboutModal.style.display = 'flex'; });
    if (el.aboutInfoBtn) el.aboutInfoBtn.addEventListener('click', () => { if (el.aboutModal) el.aboutModal.style.display = 'flex'; });
    if (el.closeAboutBtn) el.closeAboutBtn.addEventListener('click', () => closeModals(el));
    if (el.doneAboutBtn) el.doneAboutBtn.addEventListener('click', () => closeModals(el));

    // Theme Toggle
    el.themeToggles.forEach(btn => btn.addEventListener('click', () => toggleTheme(this.state)));

    // Toast Dismiss
    if (el.toastClose) el.toastClose.addEventListener('click', () => { if (el.toast) el.toast.style.display = 'none'; });

    // Online Count Simulation
    setInterval(() => {
      this.state.onlineCount += Math.floor(Math.random() * 5) - 2;
      el.onlineBadge.forEach(badge => {
        badge.textContent = `${this.state.onlineCount.toLocaleString()} Online`;
      });
    }, 8000);
  }

  public startChatting(): void {
    handleStartChatting(this.state, this.el, (matchData: MatchData) => this.onMatched(matchData));
  }

  public nextStranger(): void {
    handleNextStranger(
      this.state,
      this.el,
      () => closePeerConnection(this.state, this.el),
      (matchData: MatchData) => this.onMatched(matchData)
    );
  }

  public stopCall(): void {
    handleStopCall(this.state, this.el, () => closePeerConnection(this.state, this.el));
  }

  private onMatched(matchData: MatchData): void {
    connectMatchedStranger(
      this.state,
      this.el,
      matchData,
      (sender, text) => appendChatMessage(this.el, sender, text),
      () => clearChatMessages(this.el),
      () => this.stopCall()
    );
  }

  private togglePrivacyMode(): void {
    this.state.privacyMode = !this.state.privacyMode;
    if (this.el.privacySwitch) this.el.privacySwitch.classList.toggle('active', this.state.privacyMode);
    if (this.el.privacyStatusText) this.el.privacyStatusText.textContent = this.state.privacyMode ? 'ON' : 'OFF';
    showToast(
      this.el,
      this.state.privacyMode
        ? 'Relay-Only Privacy Mode enabled. Direct IP discovery blocked via TURN.'
        : 'Privacy Mode disabled. Standard direct P2P connectivity restored.'
    );
  }
}

// Auto-instantiate when document is loaded
const app = new OmagleeApp();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

export default app;
