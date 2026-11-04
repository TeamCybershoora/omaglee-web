/**
 * IceManager
 * Centralized ICE configuration management, Coturn short-lived credential consumption,
 * Relay-only privacy mode enforcement, and candidate queue management.
 */

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface BackendIceConfigResponse {
  success: boolean;
  iceServers: IceServerConfig[];
  credentialExpiresAt?: string | null;
  turnConfigured?: boolean;
  defaultTransportPolicy?: 'all' | 'relay';
  note?: string;
}

export class IceManager {
  candidateQueue: RTCIceCandidateInit[];
  isRemoteDescriptionSet: boolean;
  iceConnectionState: string;
  cachedConfiguration: RTCConfiguration | null;
  cachedExpiresAt: number | null;
  privacyMode: boolean;

  constructor() {
    this.candidateQueue = [];
    this.isRemoteDescriptionSet = false;
    this.iceConnectionState = 'new';
    this.cachedConfiguration = null;
    this.cachedExpiresAt = null;
    this.privacyMode = false;
  }

  /**
   * Set privacy mode (Relay-Only). When true, enforces iceTransportPolicy = 'relay'.
   */
  setPrivacyMode(enabled: boolean): void {
    this.privacyMode = Boolean(enabled);
    if (this.cachedConfiguration) {
      this.cachedConfiguration.iceTransportPolicy = this.privacyMode ? 'relay' : 'all';
    }
  }

  /**
   * Get default fallback ICE configuration.
   */
  getDefaultConfiguration(): RTCConfiguration {
    const rawIce = (import.meta.env.VITE_ICE_SERVERS as string) || 'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302';
    const urls = rawIce
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean);

    return {
      iceServers: [
        {
          urls: urls.length > 0 ? urls : ['stun:stun.l.google.com:19302'],
        },
      ],
      iceTransportPolicy: this.privacyMode ? 'relay' : 'all',
      iceCandidatePoolSize: 2,
    };
  }

  /**
   * Fetch secure ICE configuration with short-lived coturn TURN credentials from centralized backend.
   */
  async fetchIceConfiguration(privacyMode = false): Promise<RTCConfiguration> {
    this.setPrivacyMode(privacyMode);

    // Return cached credentials if still valid (with 60-second buffer)
    const now = Date.now();
    if (this.cachedConfiguration && this.cachedExpiresAt && this.cachedExpiresAt - 60000 > now) {
      return {
        ...this.cachedConfiguration,
        iceTransportPolicy: this.privacyMode ? 'relay' : 'all',
      };
    }

    const apiUrl = (import.meta.env.VITE_BACKEND_API_URL as string) || 'http://127.0.0.1:8000/api';
    const sessionUuid = typeof window !== 'undefined' ? localStorage.getItem('omaglee_session_uuid') : null;
    const sessionToken = typeof window !== 'undefined' ? localStorage.getItem('omaglee_session_token') : null;

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (sessionUuid) headers['X-Session-UUID'] = sessionUuid;
      if (sessionToken) headers['X-Session-Token'] = sessionToken;

      const endpoint = `${apiUrl}/webrtc/ice-config${sessionUuid ? `?sessionUuid=${encodeURIComponent(sessionUuid)}` : ''}`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        console.warn(`[IceManager] Backend ICE config returned status ${response.status}. Falling back to default STUN.`);
        return this.getDefaultConfiguration();
      }

      const data: BackendIceConfigResponse = await response.json();

      if (data && Array.isArray(data.iceServers) && data.iceServers.length > 0) {
        const rtcConfig: RTCConfiguration = {
          iceServers: data.iceServers,
          iceTransportPolicy: this.privacyMode ? 'relay' : 'all',
          iceCandidatePoolSize: 2,
        };

        this.cachedConfiguration = rtcConfig;
        if (data.credentialExpiresAt) {
          this.cachedExpiresAt = new Date(data.credentialExpiresAt).getTime();
        } else {
          // Default cache for 5 minutes if no explicit expiry provided
          this.cachedExpiresAt = now + 300000;
        }

        return rtcConfig;
      }
    } catch (err) {
      console.warn('[IceManager] Failed to fetch dynamic ICE configuration:', err);
    }

    return this.getDefaultConfiguration();
  }

  /**
   * Synchronous accessor for cached or default configuration.
   */
  getIceConfiguration(): RTCConfiguration {
    if (this.cachedConfiguration) {
      return {
        ...this.cachedConfiguration,
        iceTransportPolicy: this.privacyMode ? 'relay' : 'all',
      };
    }
    return this.getDefaultConfiguration();
  }

  /**
   * Queue or immediately add an incoming remote ICE candidate.
   */
  async handleRemoteCandidate(peerConnection: RTCPeerConnection | null, candidateInit: RTCIceCandidateInit): Promise<void> {
    if (!candidateInit || !candidateInit.candidate) {
      return;
    }

    if (!this.isRemoteDescriptionSet || !peerConnection || !peerConnection.remoteDescription) {
      // Buffer until remote description is set
      this.candidateQueue.push(candidateInit);
      return;
    }

    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidateInit));
    } catch (err) {
      console.warn('[IceManager] Non-fatal ICE candidate addition warning:', err);
    }
  }

  /**
   * Flush all buffered candidates after remote description is applied.
   */
  async flushQueuedCandidates(peerConnection: RTCPeerConnection | null): Promise<void> {
    this.isRemoteDescriptionSet = true;
    if (!peerConnection || this.candidateQueue.length === 0) {
      return;
    }

    const queue = [...this.candidateQueue];
    this.candidateQueue = [];

    for (const candidateInit of queue) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidateInit));
      } catch (err) {
        console.warn('[IceManager] Failed to add queued ICE candidate:', err);
      }
    }
  }

  /**
   * Reset ICE state on call termination.
   */
  reset(): void {
    this.candidateQueue = [];
    this.isRemoteDescriptionSet = false;
    this.iceConnectionState = 'closed';
  }
}

export default IceManager;
