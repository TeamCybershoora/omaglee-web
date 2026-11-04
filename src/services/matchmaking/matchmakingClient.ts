/**
 * MatchmakingClient
 * Manages anonymous visitor session creation, waiting queue operations,
 * polling/heartbeat, and match lifecycle (Next / Disconnect).
 */
const BACKEND_URL =
  typeof window !== 'undefined' && window.location
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

export interface SessionData {
  sessionUuid: string;
  sessionToken: string;
}

export interface MatchmakingResult {
  success: boolean;
  status: 'matched' | 'waiting' | 'expired' | 'idle';
  matchId?: string;
  role?: 'initiator' | 'receiver';
  participantId?: string;
  participantToken?: string;
  channel?: string;
  message?: string;
  pollIntervalMs?: number;
}

export class MatchmakingClient {
  sessionUuid: string | null;
  sessionToken: string | null;
  expiresAt: string | null;

  constructor() {
    this.sessionUuid = localStorage.getItem('omaglee_session_uuid') || null;
    this.sessionToken = localStorage.getItem('omaglee_session_token') || null;
    this.expiresAt = localStorage.getItem('omaglee_session_expires') || null;
  }

  /**
   * Ensure a valid anonymous session exists, creating one if missing or expired.
   */
  async ensureSession(): Promise<SessionData> {
    const now = Date.now();
    if (this.sessionUuid && this.sessionToken && this.expiresAt) {
      if (new Date(this.expiresAt).getTime() > now + 60000) {
        return {
          sessionUuid: this.sessionUuid,
          sessionToken: this.sessionToken,
        };
      }
    }

    // Create a new anonymous session
    const response = await fetch(`${BACKEND_URL}/api/matchmaking/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to initialize anonymous session: HTTP ${response.status}`);
    }

    const data = await response.json();
    this.sessionUuid = data.sessionUuid;
    this.sessionToken = data.sessionToken;
    this.expiresAt = data.expiresAt;

    if (this.sessionUuid && this.sessionToken && this.expiresAt) {
      localStorage.setItem('omaglee_session_uuid', this.sessionUuid);
      localStorage.setItem('omaglee_session_token', this.sessionToken);
      localStorage.setItem('omaglee_session_expires', this.expiresAt);
    }

    return {
      sessionUuid: this.sessionUuid as string,
      sessionToken: this.sessionToken as string,
    };
  }

  /**
   * Standard headers with anonymous session credentials.
   */
  getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Session-UUID': this.sessionUuid || '',
      'X-Session-Token': this.sessionToken || '',
    };
  }

  /**
   * Request to enter the matchmaking queue (alias: joinQueue).
   */
  async startMatchmaking(): Promise<MatchmakingResult> {
    await this.ensureSession();

    const response = await fetch(`${BACKEND_URL}/api/matchmaking/start`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        sessionUuid: this.sessionUuid,
        sessionToken: this.sessionToken,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error(data.message || `Access suspended: ${data.reason || 'Community guidelines violation'}`);
      }
      if (response.status === 401) {
        // Expired -> clear and retry once
        this.clearSession();
        await this.ensureSession();
        return this.startMatchmaking();
      }
      throw new Error(data.message || `Matchmaking request failed (HTTP ${response.status})`);
    }

    return data;
  }

  /**
   * Alias for startMatchmaking to enter queue.
   */
  async joinQueue(): Promise<MatchmakingResult> {
    return this.startMatchmaking();
  }

  /**
   * Alias for disconnectMatch.
   */
  async leaveMatch(matchId: string): Promise<{ success: boolean }> {
    return this.disconnectMatch(matchId);
  }

  /**
   * Status check for an active match.
   */
  async getMatchStatus(_matchId?: string): Promise<{ status: string }> {
    try {
      const res = await this.pollStatus();
      return { status: res.status || 'active' };
    } catch {
      return { status: 'ended' };
    }
  }

  /**
   * Poll matchmaking status while in waiting queue.
   */
  async pollStatus(): Promise<MatchmakingResult> {
    if (!this.sessionUuid || !this.sessionToken) return { success: true, status: 'idle' };

    const response = await fetch(
      `${BACKEND_URL}/api/matchmaking/status?sessionUuid=${encodeURIComponent(this.sessionUuid)}&sessionToken=${encodeURIComponent(this.sessionToken)}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        this.clearSession();
        return { success: false, status: 'expired' };
      }
      throw new Error(`Status check failed (HTTP ${response.status})`);
    }

    return await response.json();
  }

  /**
   * Cancel waiting in matchmaking queue.
   */
  async cancelMatchmaking(): Promise<{ success: boolean }> {
    if (!this.sessionUuid || !this.sessionToken) return { success: true };

    try {
      const response = await fetch(`${BACKEND_URL}/api/matchmaking/cancel`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          sessionUuid: this.sessionUuid,
          sessionToken: this.sessionToken,
        }),
      });
      return await response.json();
    } catch {
      return { success: false };
    }
  }

  /**
   * Request next stranger (skips current match and enters queue).
   */
  async nextMatch(matchId: string): Promise<MatchmakingResult> {
    await this.ensureSession();

    const response = await fetch(`${BACKEND_URL}/api/matches/${encodeURIComponent(matchId)}/next`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        sessionUuid: this.sessionUuid,
        sessionToken: this.sessionToken,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `Next match request failed (HTTP ${response.status})`);
    }
    return data;
  }

  /**
   * Disconnect active match gracefully.
   */
  async disconnectMatch(matchId: string): Promise<{ success: boolean }> {
    if (!this.sessionUuid || !this.sessionToken || !matchId) return { success: true };

    try {
      const response = await fetch(`${BACKEND_URL}/api/matches/${encodeURIComponent(matchId)}/disconnect`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          sessionUuid: this.sessionUuid,
          sessionToken: this.sessionToken,
        }),
      });
      return await response.json();
    } catch {
      return { success: false };
    }
  }

  /**
   * Send heartbeat to keep match alive.
   */
  async sendHeartbeat(matchId: string): Promise<void> {
    if (!matchId) return;
    try {
      await fetch(`${BACKEND_URL}/api/matches/${encodeURIComponent(matchId)}/heartbeat`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
    } catch {
      // Ignore background heartbeat fails
    }
  }

  /**
   * Clear local session credentials.
   */
  clearSession(): void {
    this.sessionUuid = null;
    this.sessionToken = null;
    this.expiresAt = null;
    localStorage.removeItem('omaglee_session_uuid');
    localStorage.removeItem('omaglee_session_token');
    localStorage.removeItem('omaglee_session_expires');
  }
}

export const matchmakingClient = new MatchmakingClient();
export default matchmakingClient;
