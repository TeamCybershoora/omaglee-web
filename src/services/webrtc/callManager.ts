import MediaManager from './mediaManager';
import IceManager from './iceManager';
import PeerConnectionManager, { ConnectionDiagnostics } from './peerConnection';
import SignalingService from './signaling';

export interface CallManagerOptions {
  onStateChange?: (state: string, meta?: { message?: string; phase?: string }) => void;
  onLocalStream?: (stream: MediaStream | null) => void;
  onRemoteStream?: (stream: MediaStream | null) => void;
  onSignalingStateChange?: (status: string) => void;
  onDiagnostics?: (diagnostics: ConnectionDiagnostics) => void;
  onChatMessage?: (msg: { text: string; timestamp: number }) => void;
  onError?: (error: Error) => void;
  privacyMode?: boolean;
}

export interface MatchDataInput {
  matchId: string;
  role: 'initiator' | 'receiver';
  participantId: string;
  participantToken: string;
  channel?: string;
}

/**
 * CallManager
 * Master coordinator for WebRTC two-participant session lifecycle,
 * TURN relay fallback, network recovery, and connection monitoring.
 */
export class CallManager {
  onStateChange?: (state: string, meta?: { message?: string; phase?: string }) => void;
  onLocalStream?: (stream: MediaStream | null) => void;
  onRemoteStream?: (stream: MediaStream | null) => void;
  onSignalingStateChange?: (status: string) => void;
  onDiagnostics?: (diagnostics: ConnectionDiagnostics) => void;
  onChatMessage?: (msg: { text: string; timestamp: number }) => void;
  onError?: (error: Error) => void;

  mediaManager: MediaManager;
  iceManager: IceManager;
  signaling: SignalingService;
  peerConnectionManager: PeerConnectionManager | null;

  roomId: string | null;
  participantId: string;
  role: 'initiator' | 'receiver' | string | null;
  callState: string;
  isCallActive: boolean;
  privacyMode: boolean;

  private diagnosticsTimer: NodeJS.Timeout | number | null;
  private recoveryTimer: NodeJS.Timeout | number | null;
  private isRestartingIce: boolean;
  private boundOnlineHandler: () => void;
  private boundOfflineHandler: () => void;

  constructor({
    onStateChange,
    onLocalStream,
    onRemoteStream,
    onSignalingStateChange,
    onDiagnostics,
    onChatMessage,
    onError,
    privacyMode = false,
  }: CallManagerOptions = {}) {
    this.onStateChange = onStateChange;
    this.onLocalStream = onLocalStream;
    this.onRemoteStream = onRemoteStream;
    this.onSignalingStateChange = onSignalingStateChange;
    this.onDiagnostics = onDiagnostics;
    this.onChatMessage = onChatMessage;
    this.onError = onError;

    this.mediaManager = new MediaManager();
    this.iceManager = new IceManager();
    this.signaling = new SignalingService();
    this.peerConnectionManager = null;

    this.roomId = null;
    this.participantId = `peer_${Math.random().toString(36).substring(2, 9)}`;
    this.role = null;
    this.callState = 'idle';
    this.isCallActive = false;
    this.privacyMode = Boolean(privacyMode);

    this.diagnosticsTimer = null;
    this.recoveryTimer = null;
    this.isRestartingIce = false;

    if (this.onSignalingStateChange) {
      this.signaling.onConnectionState(this.onSignalingStateChange);
    }

    // Network resilience event listeners
    this.boundOnlineHandler = this.handleNetworkOnline.bind(this);
    this.boundOfflineHandler = this.handleNetworkOffline.bind(this);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.boundOnlineHandler);
      window.addEventListener('offline', this.boundOfflineHandler);
    }
  }

  /**
   * Set privacy mode (Relay-Only).
   */
  setPrivacyMode(enabled: boolean): void {
    this.privacyMode = Boolean(enabled);
    this.iceManager.setPrivacyMode(this.privacyMode);
  }

  /**
   * Update internal and external call state.
   */
  setState(newState: string, meta: { message?: string; phase?: string } = {}): void {
    this.callState = newState;
    if (this.onStateChange) {
      this.onStateChange(newState, meta);
    }
  }

  /**
   * Ensure local hardware tracks (camera & microphone) are acquired.
   */
  async prepareMedia(): Promise<MediaStream> {
    const existing = this.mediaManager.getLocalStream();
    if (!existing) {
      this.setState('requesting_media');
      const localStream = await this.mediaManager.requestMedia();
      if (this.onLocalStream) {
        this.onLocalStream(localStream);
      }
      return localStream;
    }
    return existing;
  }

  /**
   * Connect to an authorized match established by the Random Matchmaking engine.
   */
  async connectToMatch(matchData: MatchDataInput): Promise<void> {
    const { matchId, role, participantId, participantToken } = matchData;
    this.resetConnectionOnly();

    this.roomId = matchId;
    this.participantId = participantId;
    this.role = role;
    this.isCallActive = true;
    this.isRestartingIce = false;

    try {
      // 1. Ensure local camera/mic stream is ready
      const localStream = await this.prepareMedia();

      // 2. Fetch centralized ICE / Coturn TURN configuration
      const iceConfig = await this.iceManager.fetchIceConfiguration(this.privacyMode);

      // 3. Setup RTCPeerConnection Manager
      this.peerConnectionManager = new PeerConnectionManager({
        iceConfiguration: iceConfig,
        onRemoteStream: (remoteStream) => {
          if (this.onRemoteStream) {
            this.onRemoteStream(remoteStream);
          }
        },
        onIceCandidate: (candidate) => {
          this.signaling.sendMessage('ice.candidate', candidate).catch(() => {});
        },
        onConnectionStateChange: (state) => {
          this.handleConnectionStateChange(state);
        },
      });

      const pc = this.peerConnectionManager.createPeerConnection(localStream);

      // 4. Register Signaling message dispatcher
      this.signaling.onMessage((type, payload) => {
        this.handleSignalingMessage(type, payload, pc);
      });

      // 5. Attach to matchmaking match
      this.setState('joining_room');
      this.signaling.attachMatch(matchId, participantId, participantToken, role);

      if (role === 'initiator') {
        setTimeout(() => {
          this.onRoomReady();
        }, 300);
      } else {
        this.setState('negotiating', { phase: 'awaiting_offer' });
      }
    } catch (err: unknown) {
      this.handleError(err instanceof Error ? err : new Error(String(err)));
      this.resetConnectionOnly();
    }
  }

  /**
   * Handle connection state updates and trigger network recovery or diagnostics.
   */
  private handleConnectionStateChange(state: string): void {
    if (!this.isCallActive) return;

    if (state === 'connected' || state === 'ice-connected' || state === 'ice-completed') {
      this.clearRecoveryTimer();
      this.isRestartingIce = false;
      this.setState('connected');
      this.startDiagnosticsMonitoring();
    } else if (state === 'disconnected' || state === 'ice-disconnected') {
      // Temporary network disruption: inform user and start recovery countdown
      this.setState('reconnecting', { message: 'Connection interrupted. Attempting network recovery...' });
      this.scheduleRecoveryAttempt(4000);
    } else if (state === 'failed' || state === 'ice-failed') {
      // Direct connection failure: trigger immediate ICE restart
      this.setState('reconnecting', { message: 'Connection dropped. Triggering ICE restart with TURN fallback...' });
      this.attemptIceRestart();
    }
  }

  /**
   * Schedule automatic ICE restart if interrupted connection does not recover.
   */
  private scheduleRecoveryAttempt(delayMs: number): void {
    if (this.recoveryTimer) return;

    this.recoveryTimer = setTimeout(() => {
      this.recoveryTimer = null;
      if (this.isCallActive && (this.callState === 'reconnecting' || this.callState === 'disconnected')) {
        console.log('[CallManager] Disconnection timeout expired. Attempting ICE restart recovery.');
        this.attemptIceRestart();
      }
    }, delayMs);
  }

  private clearRecoveryTimer(): void {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
  }

  /**
   * Trigger ICE Restart for network change or connection recovery.
   */
  async attemptIceRestart(): Promise<void> {
    if (!this.isCallActive || !this.peerConnectionManager || this.isRestartingIce) return;

    this.isRestartingIce = true;
    this.clearRecoveryTimer();

    try {
      if (this.role === 'initiator') {
        console.log('[CallManager] Initiating ICE restart offer...');
        const restartOffer = await this.peerConnectionManager.restartIce();
        if (restartOffer) {
          await this.signaling.sendMessage('ice.restart', restartOffer);
        }
      } else {
        console.log('[CallManager] Requesting ICE restart from initiator...');
        await this.signaling.sendMessage('request.ice.restart', { reason: 'connection_interrupted' });
      }
    } catch (err) {
      console.warn('[CallManager] ICE restart attempt failed:', err);
      this.isRestartingIce = false;
    }
  }

  /**
   * User-triggered manual retry / reconnection action.
   */
  async retryConnection(): Promise<void> {
    this.setState('reconnecting', { message: 'Manual reconnection initiated...' });
    await this.attemptIceRestart();
  }

  /**
   * Handler for window 'online' event.
   */
  private handleNetworkOnline(): void {
    console.log('[CallManager] Browser came online.');
    if (this.isCallActive) {
      this.setState('reconnecting', { message: 'Network restored. Re-establishing media stream...' });
      setTimeout(() => {
        this.attemptIceRestart();
      }, 500);
    }
  }

  /**
   * Handler for window 'offline' event.
   */
  private handleNetworkOffline(): void {
    console.log('[CallManager] Browser went offline.');
    if (this.isCallActive) {
      this.setState('reconnecting', { message: 'No internet connection detected.' });
    }
  }

  /**
   * Start periodic diagnostics polling (evaluating route type, latency, bandwidth).
   */
  private startDiagnosticsMonitoring(): void {
    this.stopDiagnosticsMonitoring();

    let diagnosticTick = 0;

    this.diagnosticsTimer = setInterval(async () => {
      if (!this.isCallActive || !this.peerConnectionManager) {
        this.stopDiagnosticsMonitoring();
        return;
      }

      const diag = await this.peerConnectionManager.getConnectionDiagnostics();
      if (diag) {
        if (this.onDiagnostics) {
          this.onDiagnostics(diag);
        }

        // Periodically submit aggregated diagnostics to backend (every ~10 seconds) without leaking user IP
        diagnosticTick++;
        if (diagnosticTick % 4 === 0 && this.roomId) {
          this.reportDiagnostics(diag).catch(() => {});
        }
      }
    }, 2500);
  }

  private stopDiagnosticsMonitoring(): void {
    if (this.diagnosticsTimer) {
      clearInterval(this.diagnosticsTimer);
      this.diagnosticsTimer = null;
    }
  }

  /**
   * Post diagnostics report to centralized backend.
   */
  private async reportDiagnostics(diag: ConnectionDiagnostics): Promise<void> {
    const apiUrl = (import.meta.env.VITE_BACKEND_API_URL as string) || 'http://127.0.0.1:8000/api';
    const sessionUuid = typeof window !== 'undefined' ? localStorage.getItem('omaglee_session_uuid') : null;
    const sessionToken = typeof window !== 'undefined' ? localStorage.getItem('omaglee_session_token') : null;

    if (!sessionUuid || !sessionToken || !this.roomId) return;

    try {
      await fetch(`${apiUrl}/webrtc/diagnostics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-UUID': sessionUuid,
          'X-Session-Token': sessionToken,
        },
        body: JSON.stringify({
          matchId: this.roomId,
          routeType: diag.routeType,
          rttMs: diag.rttMs,
          packetLossPercent: diag.packetLossPercent,
          privacyMode: this.privacyMode,
        }),
      });
    } catch {
      // Diagnostic reporting failure is non-fatal
    }
  }

  /**
   * Teardown peer connection and signaling, while keeping camera/mic active for rapid Next re-pairing.
   */
  resetConnectionOnly(): void {
    this.stopDiagnosticsMonitoring();
    this.clearRecoveryTimer();
    this.isRestartingIce = false;

    if (this.peerConnectionManager) {
      this.peerConnectionManager.close();
      this.peerConnectionManager = null;
    }
    if (this.onRemoteStream) {
      this.onRemoteStream(null);
    }
    this.iceManager.reset();
    this.signaling.leaveRoom().catch(() => {});
    this.roomId = null;
    this.role = null;
  }

  /**
   * Initialize and start a controlled 2-user test call session.
   */
  async startCall(roomId = 'test-room-1', displayName = 'Omaglee User'): Promise<void> {
    if (this.isCallActive) {
      await this.endCall();
    }

    this.roomId = roomId;
    this.isCallActive = true;
    this.isRestartingIce = false;

    try {
      this.setState('requesting_media');
      const localStream = await this.mediaManager.requestMedia();
      if (this.onLocalStream) {
        this.onLocalStream(localStream);
      }

      const iceConfig = await this.iceManager.fetchIceConfiguration(this.privacyMode);
      this.peerConnectionManager = new PeerConnectionManager({
        iceConfiguration: iceConfig,
        onRemoteStream: (remoteStream) => {
          if (this.onRemoteStream) {
            this.onRemoteStream(remoteStream);
          }
        },
        onIceCandidate: (candidate) => {
          this.signaling.sendMessage('ice.candidate', candidate).catch(() => {});
        },
        onConnectionStateChange: (state) => {
          this.handleConnectionStateChange(state);
        },
      });

      const pc = this.peerConnectionManager.createPeerConnection(localStream);

      this.signaling.onMessage((type, payload) => {
        this.handleSignalingMessage(type, payload, pc);
      });

      this.setState('joining_room');
      const joinData = await this.signaling.joinRoom(roomId, this.participantId, displayName);
      this.role = joinData.role;

      if (joinData.is_ready) {
        this.onRoomReady();
      } else {
        this.setState('waiting_peer');
      }
    } catch (err: unknown) {
      this.handleError(err instanceof Error ? err : new Error(String(err)));
      await this.endCall();
    }
  }

  /**
   * Triggered when room occupancy reaches 2 participants.
   */
  async onRoomReady(): Promise<void> {
    if (!this.isCallActive || !this.peerConnectionManager) return;

    if (this.role === 'initiator') {
      try {
        this.setState('negotiating', { phase: 'creating_offer' });
        const offer = await this.peerConnectionManager.createOffer();
        await this.signaling.sendMessage('offer', offer);
      } catch (err: unknown) {
        this.handleError(err instanceof Error ? err : new Error(String(err)));
      }
    } else {
      this.setState('negotiating', { phase: 'awaiting_offer' });
    }
  }

  /**
   * Process incoming signaling events from remote peer.
   */
  async handleSignalingMessage(type: string, payload: unknown, pc: RTCPeerConnection): Promise<void> {
    if (!this.isCallActive || !pc || !this.peerConnectionManager) return;

    try {
      if (type === 'call.ready') {
        await this.onRoomReady();
      } else if (type === 'offer' || type === 'ice.restart') {
        this.setState('negotiating', { phase: 'processing_offer' });
        await this.peerConnectionManager.setRemoteDescription(payload as RTCSessionDescriptionInit);
        await this.iceManager.flushQueuedCandidates(pc);

        const answer = await this.peerConnectionManager.createAnswer();
        await this.signaling.sendMessage('answer', answer);
        this.isRestartingIce = false;
      } else if (type === 'answer') {
        this.setState('negotiating', { phase: 'processing_answer' });
        await this.peerConnectionManager.setRemoteDescription(payload as RTCSessionDescriptionInit);
        await this.iceManager.flushQueuedCandidates(pc);
        this.isRestartingIce = false;
      } else if (type === 'ice.candidate') {
        await this.iceManager.handleRemoteCandidate(pc, payload as RTCIceCandidateInit);
      } else if (type === 'request.ice.restart') {
        if (this.role === 'initiator') {
          console.log('[CallManager] Received request.ice.restart from peer. Generating restart offer...');
          const restartOffer = await this.peerConnectionManager.restartIce();
          if (restartOffer) {
            await this.signaling.sendMessage('ice.restart', restartOffer);
          }
        }
      } else if (type === 'chat.message') {
        const payloadObj = payload as { text?: string; timestamp?: number };
        if (this.onChatMessage && payloadObj && typeof payloadObj.text === 'string') {
          this.onChatMessage({
            text: payloadObj.text,
            timestamp: payloadObj.timestamp || Date.now(),
          });
        }
      } else if (type === 'call.end') {
        this.setState('disconnected', { message: 'The other participant ended the session.' });
        if (this.onRemoteStream) {
          this.onRemoteStream(null);
        }
      }
    } catch (err) {
      console.error('[CallManager] Error handling signaling message:', err);
    }
  }

  /**
   * Send text chat message to matched stranger.
   */
  async sendChatMessage(text: string): Promise<void> {
    if (!this.isCallActive || !this.roomId) {
      throw new Error('No active match available for text chat.');
    }
    await this.signaling.sendMessage('chat.message', {
      text,
      timestamp: Date.now(),
    });
  }

  /**
   * Toggle audio track enabled status.
   */
  setAudioEnabled(enabled: boolean): boolean {
    return this.mediaManager.setAudioEnabled(enabled);
  }

  /**
   * Toggle video track enabled status.
   */
  setVideoEnabled(enabled: boolean): boolean {
    return this.mediaManager.setVideoEnabled(enabled);
  }

  /**
   * Error handler.
   */
  handleError(err: Error): void {
    console.error('CallManager Error:', err);
    if (this.onError) {
      this.onError(err);
    }
  }

  /**
   * Complete, idempotent teardown and cleanup routine.
   */
  async endCall(): Promise<void> {
    this.isCallActive = false;
    this.stopDiagnosticsMonitoring();
    this.clearRecoveryTimer();

    // 1. Notify peer of termination
    try {
      await this.signaling.sendMessage('call.end', { reason: 'user_ended' });
    } catch {
      // Ignore
    }

    // 2. Stop all hardware tracks
    this.mediaManager.stopAllTracks();
    if (this.onLocalStream) {
      this.onLocalStream(null);
    }

    // 3. Close RTCPeerConnection and release streams
    if (this.peerConnectionManager) {
      this.peerConnectionManager.close();
      this.peerConnectionManager = null;
    }
    if (this.onRemoteStream) {
      this.onRemoteStream(null);
    }

    // 4. Reset ICE candidate queues
    this.iceManager.reset();

    // 5. Leave backend signaling room
    await this.signaling.leaveRoom();

    this.roomId = null;
    this.role = null;
    this.setState('idle');
  }

  /**
   * Start and return local media stream
   */
  async startLocalStream(): Promise<MediaStream> {
    return this.prepareMedia();
  }

  /**
   * Stop local camera and microphone stream
   */
  stopLocalStream(): void {
    if (this.mediaManager) {
      this.mediaManager.stopLocalMedia();
    }
  }

  /**
   * Clean up global window event listeners.
   */
  destroy(): void {
    this.endCall().catch(() => {});
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.boundOnlineHandler);
      window.removeEventListener('offline', this.boundOfflineHandler);
    }
  }

  /**
   * Alias for destroy
   */
  cleanup(): void {
    this.destroy();
  }
}

export default CallManager;
