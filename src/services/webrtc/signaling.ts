import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Make Pusher globally available for Laravel Echo
declare global {
  interface Window {
    Pusher: typeof Pusher;
  }
}
window.Pusher = Pusher;

export type MessageHandler = (type: string, payload: unknown, senderId?: string) => void;
export type ConnectionHandler = (status: string) => void;

export interface SignalingMessage {
  id?: string;
  type: string;
  match_id?: string;
  matchId?: string;
  room_id?: string;
  roomId?: string;
  sequence?: number;
  timestamp?: number;
  sender_id?: string;
  senderId?: string;
  payload?: unknown;
  sdp?: unknown;
  candidate?: unknown;
}

export class SignalingService {
  apiUrl: string;
  reverbKey: string;
  reverbHost: string;
  reverbPort: string;
  reverbScheme: string;

  echo: Echo<unknown> | null;
  activeChannel: ReturnType<Echo<unknown>['private']> | null;
  matchId: string | null;
  participantId: string | null;
  participantToken: string | null;
  role: string | null;

  sequenceNumber: number;
  lastProcessedSequence: number;
  signalingStatus: string;

  messageHandlers: Set<MessageHandler>;
  connectionHandlers: Set<ConnectionHandler>;
  pollingInterval: NodeJS.Timeout | number | null;
  lastPolledTimestamp: number;
  processedMessageIds: Set<string>;

  constructor() {
    const host = typeof window !== 'undefined' && window.location ? window.location.hostname : '127.0.0.1';
    this.apiUrl = `http://${host}:8000/api`;
    this.reverbKey = (import.meta.env.VITE_REVERB_APP_KEY as string) || 'omaglee-app-key';
    this.reverbHost = host;
    this.reverbPort = (import.meta.env.VITE_REVERB_PORT as string) || '8080';
    this.reverbScheme = (import.meta.env.VITE_REVERB_SCHEME as string) || 'ws';

    this.echo = null;
    this.activeChannel = null;
    this.matchId = null;
    this.participantId = null;
    this.participantToken = null;
    this.role = null;

    this.sequenceNumber = 0;
    this.lastProcessedSequence = 0;
    this.signalingStatus = 'disconnected';

    this.messageHandlers = new Set();
    this.connectionHandlers = new Set();
    this.pollingInterval = null;
    this.lastPolledTimestamp = 0;
    this.processedMessageIds = new Set();
  }

  /**
   * Register a message listener callback: (type, payload, senderId) => void
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Register signaling connection state listener callback: (status) => void
   */
  onConnectionState(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  setSignalingStatus(status: string): void {
    if (this.signalingStatus !== status) {
      this.signalingStatus = status;
      this.connectionHandlers.forEach((handler) => {
        try {
          handler(status);
        } catch (err) {
          console.error('Error in signaling connection state handler:', err);
        }
      });
    }
  }

  /**
   * Dispatch incoming message to listeners with deduplication and stale session filtering.
   */
  notifyHandlers(message: SignalingMessage): void {
    if (!message || !message.type) return;

    // 1. Session Isolation: Reject messages from mismatched or older matches
    const messageMatchId = message.match_id || message.matchId || message.room_id || message.roomId;
    if (messageMatchId && messageMatchId !== this.matchId) {
      return;
    }

    // 2. Duplicate Detection: Check message ID
    if (message.id && this.processedMessageIds.has(message.id)) {
      return;
    }
    if (message.id) {
      this.processedMessageIds.add(message.id);
      if (this.processedMessageIds.size > 300) {
        const oldest = this.processedMessageIds.values().next().value;
        if (oldest) this.processedMessageIds.delete(oldest);
      }
    }

    // 3. Stale sequence filtering
    if (message.sequence !== undefined && message.sequence !== null) {
      if (message.sequence < this.lastProcessedSequence) {
        return; // Stale message discarded
      }
      this.lastProcessedSequence = message.sequence;
    }

    if (message.timestamp) {
      this.lastPolledTimestamp = Math.max(this.lastPolledTimestamp, message.timestamp);
    }

    const type = message.type;
    const payload = message.payload !== undefined ? message.payload : (message.sdp || message.candidate);
    const senderId = message.sender_id || message.senderId;

    this.messageHandlers.forEach((handler) => {
      try {
        handler(type, payload, senderId);
      } catch (err) {
        console.error('Error in signaling message handler:', err);
      }
    });
  }

  /**
   * Authenticate and join an authorized 2-user match on the centralized backend.
   */
  async joinRoom(matchId: string, participantId: string, displayName = 'Omaglee User'): Promise<{ participant_token: string; role: string; is_ready: boolean }> {
    this.matchId = matchId;
    this.participantId = participantId;
    this.sequenceNumber = 0;
    this.lastProcessedSequence = 0;

    const res = await fetch(`${this.apiUrl}/signaling/match/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, roomId: matchId, participantId, displayName }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to join match: HTTP ${res.status}`);
    }

    const data = await res.json();
    this.participantToken = data.participant_token;
    this.role = data.role;

    // Connect to Laravel Reverb WebSocket via Echo
    this.connectReverb(matchId);

    // Also start synchronized fallback polling
    this.startPollingSync();

    return data;
  }

  /**
   * Directly attach and connect to an authorized match generated by the Phase 5 Matchmaking engine.
   */
  attachMatch(matchId: string, participantId: string, participantToken: string, role: string): { matchId: string; participantId: string; participantToken: string; role: string } {
    this.matchId = matchId;
    this.participantId = participantId;
    this.participantToken = participantToken;
    this.role = role;
    this.sequenceNumber = 0;
    this.lastProcessedSequence = 0;

    // Connect to Laravel Reverb WebSocket via Echo
    this.connectReverb(matchId);

    // Also start synchronized fallback polling
    this.startPollingSync();

    return {
      matchId,
      participantId,
      participantToken,
      role,
    };
  }

  /**
   * Connect to Laravel Reverb via Laravel Echo with private channel authorization and reconnect handling.
   */
  connectReverb(matchId: string): void {
    if (this.echo) {
      this.disconnectReverb();
    }

    try {
      this.setSignalingStatus('connecting');

      this.echo = new Echo({
        broadcaster: 'reverb',
        key: this.reverbKey,
        wsHost: this.reverbHost,
        wsPort: parseInt(this.reverbPort, 10),
        wssPort: parseInt(this.reverbPort, 10),
        forceTLS: this.reverbScheme === 'https' || this.reverbScheme === 'wss',
        enabledTransports: ['ws', 'wss'],
        authEndpoint: `${this.apiUrl}/broadcasting/auth`,
        auth: {
          headers: {
            'X-Participant-Token': this.participantToken,
            'X-Participant-ID': this.participantId,
          },
        },
      });

      // Handle Reverb/Pusher lifecycle events
      const connector = this.echo.connector as unknown as { pusher?: { connection?: { bind: (event: string, callback: () => void) => void } } };
      if (connector && connector.pusher && connector.pusher.connection) {
        const pusherConnection = connector.pusher.connection;

        pusherConnection.bind('connected', () => {
          this.setSignalingStatus('connected');
        });

        pusherConnection.bind('connecting', () => {
          this.setSignalingStatus('connecting');
        });

        pusherConnection.bind('unavailable', () => {
          this.setSignalingStatus('fallback');
        });

        pusherConnection.bind('failed', () => {
          this.setSignalingStatus('fallback');
        });

        pusherConnection.bind('disconnected', () => {
          this.setSignalingStatus('reconnecting');
        });
      }

      // Subscribe to private match channel (private-match.{matchId})
      this.activeChannel = this.echo.private(`match.${matchId}`);

      // Listen for discrete events
      this.activeChannel.listen('.match.created', (data: Record<string, unknown>) => {
        this.notifyHandlers({ type: 'call.ready', payload: data, ...data });
      });

      this.activeChannel.listen('.webrtc.offer', (data: { senderId?: string; sdp?: unknown }) => {
        if (data.senderId !== this.participantId) {
          this.notifyHandlers({ type: 'offer', payload: data.sdp, ...data });
        }
      });

      this.activeChannel.listen('.webrtc.answer', (data: { senderId?: string; sdp?: unknown }) => {
        if (data.senderId !== this.participantId) {
          this.notifyHandlers({ type: 'answer', payload: data.sdp, ...data });
        }
      });

      this.activeChannel.listen('.webrtc.ice-candidate', (data: { senderId?: string; candidate?: unknown }) => {
        if (data.senderId !== this.participantId) {
          this.notifyHandlers({ type: 'ice.candidate', payload: data.candidate, ...data });
        }
      });

      this.activeChannel.listen('.user.disconnected', (data: { participantId?: string }) => {
        if (data.participantId !== this.participantId) {
          this.notifyHandlers({ type: 'call.end', payload: data, ...data });
        }
      });

      this.activeChannel.listen('.match.ended', (data: Record<string, unknown>) => {
        this.notifyHandlers({ type: 'call.end', payload: data, ...data });
      });

      // Also listen for legacy event
      this.activeChannel.listen('.signaling.message', (data: { senderId?: string }) => {
        if (data.senderId !== this.participantId) {
          this.notifyHandlers(data as unknown as SignalingMessage);
        }
      });
    } catch (err) {
      console.warn('Laravel Reverb WebSocket initialization deferred. Active on synchronized HTTP fallback:', err);
      this.setSignalingStatus('fallback');
    }
  }

  /**
   * Start polling sync fallback to guarantee signaling delivery under all network conditions.
   */
  startPollingSync(): void {
    this.stopPollingSync();
    this.lastPolledTimestamp = 0;

    this.pollingInterval = setInterval(async () => {
      if (!this.matchId || !this.participantId || !this.participantToken) return;

      try {
        const query = new URLSearchParams({
          matchId: this.matchId,
          roomId: this.matchId,
          participantId: this.participantId,
          participantToken: this.participantToken,
          since: this.lastPolledTimestamp.toString(),
        });

        const res = await fetch(`${this.apiUrl}/signaling/messages/poll?${query}`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages && Array.isArray(data.messages)) {
            data.messages.forEach((msg: SignalingMessage) => this.notifyHandlers(msg));
          }
          if (data.server_time) {
            this.lastPolledTimestamp = Math.max(this.lastPolledTimestamp, data.server_time);
          }
        }
      } catch {
        // Suppress network jitter
      }
    }, 600);
  }

  stopPollingSync(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Dispatch validated SDP offer, answer, or ICE candidate to centralized backend.
   */
  async sendMessage(type: string, payload: unknown, targetId: string | null = null): Promise<unknown> {
    if (!this.matchId || !this.participantId || !this.participantToken) {
      throw new Error('Signaling client is not currently connected to an authorized match.');
    }

    this.sequenceNumber++;
    const messageId = `sig_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = Date.now() / 1000;

    const body = {
      matchId: this.matchId,
      roomId: this.matchId,
      participantId: this.participantId,
      participantToken: this.participantToken,
      type,
      targetId,
      messageId,
      sequenceNumber: this.sequenceNumber,
      timestamp,
      payload,
    };

    const res = await fetch(`${this.apiUrl}/signaling/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Signaling dispatch failed: HTTP ${res.status}`);
    }

    return await res.json();
  }

  /**
   * Disconnect Reverb Echo cleanly.
   */
  disconnectReverb(): void {
    if (this.echo && this.activeChannel && this.matchId) {
      try {
        this.echo.leave(`match.${this.matchId}`);
        this.echo.leave(`room.${this.matchId}`);
        this.echo.disconnect();
      } catch {
        //
      }
    }
    this.echo = null;
    this.activeChannel = null;
  }

  /**
   * Leave match and terminate session cleanly.
   */
  async leaveRoom(): Promise<void> {
    this.stopPollingSync();
    this.disconnectReverb();

    if (this.matchId && this.participantId && this.participantToken) {
      try {
        await fetch(`${this.apiUrl}/signaling/match/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId: this.matchId,
            roomId: this.matchId,
            participantId: this.participantId,
            participantToken: this.participantToken,
          }),
        });
      } catch {
        //
      }
    }

    this.matchId = null;
    this.participantId = null;
    this.participantToken = null;
    this.role = null;
    this.sequenceNumber = 0;
    this.lastProcessedSequence = 0;
    this.messageHandlers.clear();
    this.connectionHandlers.clear();
    this.processedMessageIds.clear();
    this.setSignalingStatus('disconnected');
  }
}

export default SignalingService;
