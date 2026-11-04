/**
 * PeerConnectionManager
 * Encapsulates the native RTCPeerConnection lifecycle, track attachments,
 * offer/answer negotiation, ICE restart recovery, and connection diagnostics.
 */

export type ConnectionRouteType = 'direct_p2p' | 'turn_relay' | 'unknown';

export interface CandidatePairDiagnostics {
  localCandidateType?: string;
  remoteCandidateType?: string;
  localCandidateAddress?: string;
  remoteCandidateAddress?: string;
  protocol?: string;
}

export interface ConnectionDiagnostics {
  routeType: ConnectionRouteType;
  rttMs: number | null;
  bitrateInKbps: number;
  bitrateOutKbps: number;
  packetLossPercent: number;
  transportPolicy: string;
  candidatePair?: CandidatePairDiagnostics;
  timestamp: number;
}

export interface PeerConnectionManagerOptions {
  onRemoteStream?: (stream: MediaStream) => void;
  onIceCandidate?: (candidate: RTCIceCandidateInit) => void;
  onConnectionStateChange?: (state: string) => void;
  iceConfiguration?: RTCConfiguration;
}

interface PrevTrafficSample {
  timestamp: number;
  bytesReceived: number;
  bytesSent: number;
  packetsLost: number;
  packetsReceived: number;
}

export class PeerConnectionManager {
  peerConnection: RTCPeerConnection | null;
  remoteStream: MediaStream;
  onRemoteStream?: (stream: MediaStream) => void;
  onIceCandidate?: (candidate: RTCIceCandidateInit) => void;
  onConnectionStateChange?: (state: string) => void;
  iceConfiguration?: RTCConfiguration;

  private prevTraffic: PrevTrafficSample | null;

  constructor({ onRemoteStream, onIceCandidate, onConnectionStateChange, iceConfiguration }: PeerConnectionManagerOptions) {
    this.peerConnection = null;
    this.remoteStream = new MediaStream();
    this.onRemoteStream = onRemoteStream;
    this.onIceCandidate = onIceCandidate;
    this.onConnectionStateChange = onConnectionStateChange;
    this.iceConfiguration = iceConfiguration;
    this.prevTraffic = null;
  }

  /**
   * Initialize a new RTCPeerConnection.
   */
  createPeerConnection(localStream: MediaStream | null): RTCPeerConnection {
    if (this.peerConnection) {
      this.close();
    }

    this.remoteStream = new MediaStream();
    this.prevTraffic = null;
    this.peerConnection = new RTCPeerConnection(this.iceConfiguration);

    // Attach local tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        if (this.peerConnection) {
          this.peerConnection.addTrack(track, localStream);
        }
      });
    }

    // Remote track arrival
    this.peerConnection.ontrack = (event: RTCTrackEvent) => {
      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach((track) => {
          if (!this.remoteStream.getTracks().some((t) => t.id === track.id)) {
            this.remoteStream.addTrack(track);
          }
        });
      } else if (event.track) {
        if (!this.remoteStream.getTracks().some((t) => t.id === event.track.id)) {
          this.remoteStream.addTrack(event.track);
        }
      }

      if (this.onRemoteStream) {
        this.onRemoteStream(this.remoteStream);
      }
    };

    // ICE candidate generation
    this.peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate(event.candidate.toJSON());
      }
    };

    // Connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      if (!this.peerConnection) return;
      const state = this.peerConnection.connectionState;
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(state);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      if (!this.peerConnection) return;
      const iceState = this.peerConnection.iceConnectionState;
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(`ice-${iceState}`);
      }
    };

    return this.peerConnection;
  }

  /**
   * Generate an initial SDP Offer.
   */
  async createOffer(): Promise<RTCSessionDescription | null> {
    if (!this.peerConnection) {
      throw new Error('Peer connection has not been initialized.');
    }
    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await this.peerConnection.setLocalDescription(offer);
    return this.peerConnection.localDescription;
  }

  /**
   * Perform an ICE Restart offer generation for network disruption recovery.
   */
  async restartIce(): Promise<RTCSessionDescription | null> {
    if (!this.peerConnection) {
      throw new Error('Peer connection has not been initialized.');
    }

    if (typeof this.peerConnection.restartIce === 'function') {
      try {
        this.peerConnection.restartIce();
      } catch (err) {
        console.warn('[PeerConnectionManager] restartIce() invocation warning:', err);
      }
    }

    const offer = await this.peerConnection.createOffer({
      iceRestart: true,
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await this.peerConnection.setLocalDescription(offer);
    return this.peerConnection.localDescription;
  }

  /**
   * Generate an SDP Answer in response to an offer.
   */
  async createAnswer(): Promise<RTCSessionDescription | null> {
    if (!this.peerConnection) {
      throw new Error('Peer connection has not been initialized.');
    }
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return this.peerConnection.localDescription;
  }

  /**
   * Set Remote Description (Offer or Answer).
   */
  async setRemoteDescription(sdpInit: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection has not been initialized.');
    }
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdpInit));
  }

  /**
   * Gather WebRTC connection statistics via getStats() to classify P2P vs TURN route,
   * measure latency (RTT), packet loss, and calculate bitrate from counter deltas.
   */
  async getConnectionDiagnostics(): Promise<ConnectionDiagnostics | null> {
    if (!this.peerConnection) return null;

    try {
      const stats = await this.peerConnection.getStats();
      let selectedPair: Record<string, unknown> | null = null;
      const candidateMap = new Map<string, Record<string, unknown>>();

      let bytesReceivedTotal = 0;
      let bytesSentTotal = 0;
      let packetsLostTotal = 0;
      let packetsReceivedTotal = 0;

      stats.forEach((report: Record<string, unknown>) => {
        const type = report.type as string;

        if (type === 'local-candidate' || type === 'remote-candidate') {
          candidateMap.set(report.id as string, report);
        }

        if (type === 'candidate-pair') {
          // Identify the active / nominated candidate pair
          if (report.selected === true || report.nominated === true || report.state === 'succeeded') {
            if (!selectedPair || report.nominated === true) {
              selectedPair = report;
            }
          }
        }

        if (type === 'inbound-rtp') {
          if (typeof report.bytesReceived === 'number') {
            bytesReceivedTotal += report.bytesReceived;
          }
          if (typeof report.packetsLost === 'number') {
            packetsLostTotal += report.packetsLost;
          }
          if (typeof report.packetsReceived === 'number') {
            packetsReceivedTotal += report.packetsReceived;
          }
        }

        if (type === 'outbound-rtp') {
          if (typeof report.bytesSent === 'number') {
            bytesSentTotal += report.bytesSent;
          }
        }
      });

      // Classify route type
      let routeType: ConnectionRouteType = 'unknown';
      let rttMs: number | null = null;
      let candidatePairDiag: CandidatePairDiagnostics | undefined = undefined;

      if (selectedPair) {
        const pair = selectedPair as Record<string, unknown>;
        const localCandidate = candidateMap.get(pair.localCandidateId as string);
        const remoteCandidate = candidateMap.get(pair.remoteCandidateId as string);

        const localType = (localCandidate?.candidateType as string) || '';
        const remoteType = (remoteCandidate?.candidateType as string) || '';

        // If either side relies on a 'relay' candidate, the media path is relayed via TURN
        if (localType === 'relay' || remoteType === 'relay') {
          routeType = 'turn_relay';
        } else if (
          (localType === 'host' || localType === 'srflx' || localType === 'prflx') &&
          (remoteType === 'host' || remoteType === 'srflx' || remoteType === 'prflx')
        ) {
          routeType = 'direct_p2p';
        }

        if (typeof pair.currentRoundTripTime === 'number') {
          rttMs = Math.round(pair.currentRoundTripTime * 1000);
        } else if (typeof pair.totalRoundTripTime === 'number' && typeof pair.responsesReceived === 'number' && pair.responsesReceived > 0) {
          rttMs = Math.round(((pair.totalRoundTripTime as number) / (pair.responsesReceived as number)) * 1000);
        }

        candidatePairDiag = {
          localCandidateType: localType,
          remoteCandidateType: remoteType,
          protocol: pair.protocol as string,
        };
      }

      // Calculate instantaneous bandwidth from counter deltas
      const now = Date.now();
      let bitrateInKbps = 0;
      let bitrateOutKbps = 0;
      let packetLossPercent = 0;

      if (this.prevTraffic) {
        const deltaTimeSec = (now - this.prevTraffic.timestamp) / 1000;
        if (deltaTimeSec > 0.3) {
          const deltaInBytes = Math.max(0, bytesReceivedTotal - this.prevTraffic.bytesReceived);
          const deltaOutBytes = Math.max(0, bytesSentTotal - this.prevTraffic.bytesSent);

          bitrateInKbps = Math.round((deltaInBytes * 8) / deltaTimeSec / 1000);
          bitrateOutKbps = Math.round((deltaOutBytes * 8) / deltaTimeSec / 1000);

          const deltaLost = Math.max(0, packetsLostTotal - this.prevTraffic.packetsLost);
          const deltaReceived = Math.max(0, packetsReceivedTotal - this.prevTraffic.packetsReceived);
          const totalExpected = deltaReceived + deltaLost;
          if (totalExpected > 0) {
            packetLossPercent = Math.min(100, Math.round((deltaLost / totalExpected) * 1000) / 10);
          }
        }
      }

      this.prevTraffic = {
        timestamp: now,
        bytesReceived: bytesReceivedTotal,
        bytesSent: bytesSentTotal,
        packetsLost: packetsLostTotal,
        packetsReceived: packetsReceivedTotal,
      };

      const transportPolicy = (this.iceConfiguration?.iceTransportPolicy as string) || 'all';

      return {
        routeType,
        rttMs,
        bitrateInKbps,
        bitrateOutKbps,
        packetLossPercent,
        transportPolicy,
        candidatePair: candidatePairDiag,
        timestamp: now,
      };
    } catch (err) {
      console.warn('[PeerConnectionManager] Diagnostic evaluation warning:', err);
      return null;
    }
  }

  /**
   * Get native RTCPeerConnection instance.
   */
  getInstance(): RTCPeerConnection | null {
    return this.peerConnection;
  }

  /**
   * Close connection and release all resources and listeners.
   */
  close(): void {
    if (this.peerConnection) {
      try {
        this.peerConnection.ontrack = null;
        this.peerConnection.onicecandidate = null;
        this.peerConnection.onconnectionstatechange = null;
        this.peerConnection.oniceconnectionstatechange = null;
        this.peerConnection.close();
      } catch {
        // Ignore
      }
      this.peerConnection = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore
        }
      });
      this.remoteStream = new MediaStream();
    }

    this.prevTraffic = null;
  }
}

export default PeerConnectionManager;
