/**
 * Omaglee Web Client - TypeScript Entry Point
 * Instant Random Video Chat with WebRTC, Google Authentication & Safety Moderation
 */

import { AppState, DOMElements, MatchData } from './types';
import { API_URL } from './config';
import { getDOMElements, showToast, closeModals, toggleTheme, applyTheme, applyMirrorSetting, syncSettingsUI, setCallState } from './services/ui';
import { startLocalPreview, toggleAudio, toggleVideo, toggleScreenShare, populateMediaDevices, switchMediaDevices, updateMediaButtonStates } from './services/media';
import { updateAuthView, updateGoogleBtnState, handleLogout } from './services/auth';
import { handleStartChatting, handleNextStranger, handleStopCall, stopPolling, stopHeartbeat, stopWaitingTimer } from './services/matchmaking';
import { connectMatchedStranger, closePeerConnection, fetchIceServers } from './services/webrtc';
import { clearChatMessages, appendChatMessage, handleSendChatMessage } from './services/chat';
import { handleSubmitReport, handleBlockStranger } from './services/moderation';

export class OmagleeApp {
  public state: AppState;
  public el!: DOMElements;

  constructor() {
    const autoMuteOnJoin = localStorage.getItem('omaglee_auto_mute') === 'true';
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
      isAudioMuted: autoMuteOnJoin,
      isVideoMuted: false,
      isScreenSharing: false,
      privacyMode: localStorage.getItem('omaglee_privacy_mode') === 'true',
      mirrorVideo: localStorage.getItem('omaglee_mirror_video') !== 'false',
      autoMuteOnJoin,
      selectedCameraId: localStorage.getItem('omaglee_camera_id') || '',
      selectedMicId: localStorage.getItem('omaglee_mic_id') || '',
      turnAvailable: null,
      onlineCount: 10248,
      waitingSeconds: 0,
      pollTimer: null,
      waitingTimer: null,
      heartbeatTimer: null,
      sigPollTimer: null,
      processedMsgIds: new Set<string>(),
      theme: localStorage.getItem('omaglee_theme') === 'dark' ? 'dark' : 'light'
    };
  }

  public init(): void {
    this.el = getDOMElements();
    applyTheme(this.state, this.el);
    applyMirrorSetting(this.state, this.el);
    syncSettingsUI(this.state, this.el);
    updateMediaButtonStates(this.state, this.el);
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

    if (el.settingsBtn) el.settingsBtn.addEventListener('click', () => this.openSettingsModal());
    if (el.dockSettingsBtn) el.dockSettingsBtn.addEventListener('click', () => this.openSettingsModal());
    if (el.closeSettingsBtn) el.closeSettingsBtn.addEventListener('click', () => closeModals(el));
    if (el.doneSettingsBtn) el.doneSettingsBtn.addEventListener('click', () => closeModals(el));
    if (el.resetSettingsBtn) el.resetSettingsBtn.addEventListener('click', () => this.resetSettings());
    if (el.cameraSelect) {
      el.cameraSelect.addEventListener('change', () => {
        this.state.selectedCameraId = el.cameraSelect?.value || '';
        localStorage.setItem('omaglee_camera_id', this.state.selectedCameraId);
        switchMediaDevices(this.state, el);
      });
    }
    if (el.micSelect) {
      el.micSelect.addEventListener('change', () => {
        this.state.selectedMicId = el.micSelect?.value || '';
        localStorage.setItem('omaglee_mic_id', this.state.selectedMicId);
        switchMediaDevices(this.state, el);
      });
    }
    if (el.mirrorSwitch) el.mirrorSwitch.addEventListener('click', () => this.toggleMirrorVideo());
    if (el.autoMuteSwitch) el.autoMuteSwitch.addEventListener('click', () => this.toggleAutoMuteOnJoin());
    if (el.privacySwitch) el.privacySwitch.addEventListener('click', () => this.togglePrivacyMode());

    if (el.aboutNavBtn) el.aboutNavBtn.addEventListener('click', () => { if (el.aboutModal) el.aboutModal.style.display = 'flex'; });
    if (el.aboutInfoBtn) el.aboutInfoBtn.addEventListener('click', () => { if (el.aboutModal) el.aboutModal.style.display = 'flex'; });
    if (el.closeAboutBtn) el.closeAboutBtn.addEventListener('click', () => closeModals(el));
    if (el.doneAboutBtn) el.doneAboutBtn.addEventListener('click', () => closeModals(el));

    // Theme Toggle
    el.themeToggles.forEach(btn => btn.addEventListener('click', () => toggleTheme(this.state, el)));

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
      (reason: string) => this.handleRemoteMatchEnded(reason)
    );
  }

  private handleRemoteMatchEnded(reason: string): void {
    if (!this.state.activeMatch && this.state.callState === 'IDLE') return;
    stopPolling(this.state);
    stopHeartbeat(this.state);
    stopWaitingTimer(this.state);
    closePeerConnection(this.state, this.el);
    this.state.activeMatch = null;

    if (reason === 'next') {
      showToast(this.el, 'Stranger skipped. Searching for next connection...', 'neutral');
      this.startChatting();
    } else {
      setCallState(this.state, this.el, 'IDLE');
      showToast(this.el, 'Call ended. Click Start Call to connect again.');
    }
  }

  private async openSettingsModal(): Promise<void> {
    if (this.el.settingsModal) this.el.settingsModal.style.display = 'flex';
    syncSettingsUI(this.state, this.el);
    await populateMediaDevices(this.state, this.el);
    if (this.state.turnAvailable === null) {
      await fetchIceServers(this.state);
      syncSettingsUI(this.state, this.el);
    }
  }

  private toggleMirrorVideo(): void {
    this.state.mirrorVideo = !this.state.mirrorVideo;
    localStorage.setItem('omaglee_mirror_video', String(this.state.mirrorVideo));
    applyMirrorSetting(this.state, this.el);
    syncSettingsUI(this.state, this.el);
    showToast(this.el, this.state.mirrorVideo ? 'Self-video mirror enabled.' : 'Self-video mirror disabled.');
  }

  private toggleAutoMuteOnJoin(): void {
    this.state.autoMuteOnJoin = !this.state.autoMuteOnJoin;
    localStorage.setItem('omaglee_auto_mute', String(this.state.autoMuteOnJoin));
    syncSettingsUI(this.state, this.el);
    if (this.state.autoMuteOnJoin && !this.state.isAudioMuted) {
      toggleAudio(this.state, this.el);
    }
    showToast(
      this.el,
      this.state.autoMuteOnJoin ? 'Microphone will start muted on calls.' : 'Microphone will start unmuted on calls.'
    );
  }

  private async togglePrivacyMode(): Promise<void> {
    if (this.state.turnAvailable === null) {
      await fetchIceServers(this.state);
    }
    this.state.privacyMode = !this.state.privacyMode;
    localStorage.setItem('omaglee_privacy_mode', String(this.state.privacyMode));
    syncSettingsUI(this.state, this.el);

    if (this.state.privacyMode && !this.state.turnAvailable) {
      showToast(this.el, 'Privacy preference saved. Direct mode stays active until a TURN server is configured.', 'warning');
    } else {
      showToast(
        this.el,
        this.state.privacyMode
          ? 'Relay-Only Privacy Mode enabled. Direct IP discovery blocked via TURN.'
          : 'Privacy Mode disabled. Standard direct connection restored.'
      );
    }
  }

  private async resetSettings(): Promise<void> {
    this.state.mirrorVideo = true;
    this.state.autoMuteOnJoin = false;
    this.state.privacyMode = false;
    this.state.selectedCameraId = '';
    this.state.selectedMicId = '';
    localStorage.removeItem('omaglee_mirror_video');
    localStorage.removeItem('omaglee_auto_mute');
    localStorage.removeItem('omaglee_privacy_mode');
    localStorage.removeItem('omaglee_camera_id');
    localStorage.removeItem('omaglee_mic_id');

    applyMirrorSetting(this.state, this.el);
    syncSettingsUI(this.state, this.el);
    await switchMediaDevices(this.state, this.el);
    await populateMediaDevices(this.state, this.el);
    showToast(this.el, 'Settings reset to defaults.', 'success');
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
