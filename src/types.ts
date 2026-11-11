/**
 * Omaglee Web Client - Type Definitions
 */

export interface CurrentUser {
  name: string;
  email?: string;
  picture?: string;
  isGuest?: boolean;
}

export type CallState = 'IDLE' | 'SEARCHING' | 'CONNECTING' | 'CONNECTED';

export interface MatchData {
  matchId: string;
  role: 'initiator' | 'receiver';
  participantId: string;
  participantToken: string;
  channel?: string;
}

export interface SignalingMessage {
  id?: string;
  match_id?: string;
  sender_id?: string;
  type: string;
  payload?: any;
  sdp?: string;
  candidate?: RTCIceCandidateInit;
  sequence?: number;
  timestamp?: number;
}

export type NoticeType = 'success' | 'error' | 'warning' | 'neutral';

export interface AppState {
  currentUser: CurrentUser | null;
  sessionUuid: string | null;
  sessionToken: string | null;
  callState: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;
  dataChannel: RTCDataChannel | null;
  activeMatch: MatchData | null;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  privacyMode: boolean;
  mirrorVideo: boolean;
  autoMuteOnJoin: boolean;
  selectedCameraId: string;
  selectedMicId: string;
  turnAvailable: boolean | null;
  onlineCount: number;
  waitingSeconds: number;
  pollTimer: number | null;
  waitingTimer: number | null;
  heartbeatTimer: number | null;
  sigPollTimer: number | null;
  processedMsgIds: Set<string>;
  theme: 'light' | 'dark';
}

export interface DOMElements {
  authScreen: HTMLElement | null;
  chatScreen: HTMLElement | null;
  googleBtnSlot: HTMLElement | null;
  googleAuthWrapper: HTMLElement | null;
  googleBtnOverlay: HTMLElement | null;
  authAgeLabel: HTMLElement | null;
  ageCheck: HTMLInputElement | null;
  authError: HTMLElement | null;
  authErrorText: HTMLElement | null;

  onlineBadge: NodeListOf<HTMLElement>;
  themeToggles: NodeListOf<HTMLElement>;
  userProfilePill: HTMLElement | null;
  userName: HTMLElement | null;
  userAvatar: HTMLImageElement | null;
  userAvatarPlaceholder: HTMLElement | null;
  logoutBtn: HTMLElement | null;

  localVideo: HTMLVideoElement | null;
  remoteVideo: HTMLVideoElement | null;
  strangerStandby: HTMLElement | null;
  strangerSearching: HTMLElement | null;
  strangerConnecting: HTMLElement | null;
  searchingTimer: HTMLElement | null;

  startBtn: HTMLElement | null;
  standbyStartBtn: HTMLElement | null;
  nextBtn: HTMLElement | null;
  stopBtn: HTMLElement | null;

  micBtn: HTMLElement | null;
  camBtn: HTMLElement | null;
  screenBtn: HTMLElement | null;
  localMicBtn: HTMLElement | null;
  localCamBtn: HTMLElement | null;
  requestPermsBtn: HTMLElement | null;

  chatMessages: HTMLElement | null;
  chatForm: HTMLFormElement | null;
  chatInput: HTMLInputElement | null;
  chatStatusBadge: HTMLElement | null;
  mobileChatToggle: HTMLElement | null;
  mobileChatClose: HTMLElement | null;
  chatPanelCard: HTMLElement | null;

  toast: HTMLElement | null;
  toastText: HTMLElement | null;
  toastClose: HTMLElement | null;

  reportModal: HTMLElement | null;
  reportBtn: HTMLElement | null;
  closeReportBtn: HTMLElement | null;
  dismissReportBtn: HTMLElement | null;
  submitReportBtn: HTMLElement | null;
  blockStrangerBtn: HTMLElement | null;
  reportReason: HTMLSelectElement | null;
  reportDesc: HTMLTextAreaElement | null;

  settingsModal: HTMLElement | null;
  settingsBtn: HTMLElement | null;
  dockSettingsBtn: HTMLElement | null;
  closeSettingsBtn: HTMLElement | null;
  doneSettingsBtn: HTMLElement | null;
  resetSettingsBtn: HTMLElement | null;
  cameraSelect: HTMLSelectElement | null;
  micSelect: HTMLSelectElement | null;
  mirrorSwitch: HTMLElement | null;
  mirrorStatusText: HTMLElement | null;
  autoMuteSwitch: HTMLElement | null;
  autoMuteStatusText: HTMLElement | null;
  privacySwitch: HTMLElement | null;
  privacyStatusText: HTMLElement | null;
  signalingStatusText: HTMLElement | null;
  signalingTurnNote: HTMLElement | null;

  aboutModal: HTMLElement | null;
  aboutNavBtn: HTMLElement | null;
  aboutInfoBtn: HTMLElement | null;
  closeAboutBtn: HTMLElement | null;
  doneAboutBtn: HTMLElement | null;
}
