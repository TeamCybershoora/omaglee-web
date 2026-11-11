/**
 * Matchmaking Service - Queue, Status, Heartbeat & Life Cycle
 */

import { AppState, DOMElements, MatchData } from '../types';
import { API_URL } from '../config';
import { setCallState, showToast } from './ui';
import { startLocalPreview } from './media';

export function clearSessionCredentials(state: AppState): void {
  state.sessionUuid = null;
  state.sessionToken = null;
  localStorage.removeItem('omaglee_session_uuid');
  localStorage.removeItem('omaglee_session_token');
}

export async function ensureSession(state: AppState, forceRefresh = false): Promise<{ sessionUuid: string; sessionToken: string }> {
  if (!forceRefresh && state.sessionUuid && state.sessionToken) {
    return { sessionUuid: state.sessionUuid, sessionToken: state.sessionToken };
  }
  if (forceRefresh) {
    clearSessionCredentials(state);
  }
  const res = await fetch(`${API_URL}/matchmaking/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to create session');
  const data = await res.json();
  state.sessionUuid = data.sessionUuid;
  state.sessionToken = data.sessionToken;
  localStorage.setItem('omaglee_session_uuid', data.sessionUuid);
  localStorage.setItem('omaglee_session_token', data.sessionToken);
  return data;
}

async function enqueueWithRecovery(state: AppState): Promise<{ ok: boolean; status: number; data: any }> {
  await ensureSession(state);

  const postQueue = async () => {
    const res = await fetch(`${API_URL}/matchmaking/queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-UUID': state.sessionUuid || '',
        'X-Session-Token': state.sessionToken || ''
      }
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  };

  let result = await postQueue();

  // Recover transparently from server restart / expired session (401)
  if (result.status === 401) {
    await ensureSession(state, true);
    result = await postQueue();
  }

  // Recover transparently from lingering match from closed/refreshed tab (409)
  if (result.status === 409 && result.data?.error === 'already_in_match') {
    await fetch(`${API_URL}/matchmaking/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-UUID': state.sessionUuid || '',
        'X-Session-Token': state.sessionToken || ''
      },
      body: JSON.stringify({ matchId: result.data.matchId })
    }).catch(() => {});
    result = await postQueue();
  }

  return result;
}

export function startWaitingTimer(state: AppState, el: DOMElements): void {
  stopWaitingTimer(state);
  state.waitingSeconds = 0;
  if (el.searchingTimer) el.searchingTimer.textContent = '0s';

  state.waitingTimer = setInterval(() => {
    state.waitingSeconds++;
    if (el.searchingTimer) {
      el.searchingTimer.textContent = `${state.waitingSeconds}s`;
    }
  }, 1000);
}

export function stopWaitingTimer(state: AppState): void {
  if (state.waitingTimer) {
    clearInterval(state.waitingTimer as any);
    state.waitingTimer = null;
  }
}

export function stopPolling(state: AppState): void {
  if (state.pollTimer) {
    clearInterval(state.pollTimer as any);
    state.pollTimer = null;
  }
}

export function stopHeartbeat(state: AppState): void {
  if (state.heartbeatTimer) {
    clearInterval(state.heartbeatTimer as any);
    state.heartbeatTimer = null;
  }
}

export function startHeartbeat(state: AppState): void {
  stopHeartbeat(state);
  state.heartbeatTimer = setInterval(() => {
    if (state.activeMatch?.matchId && state.sessionUuid && state.sessionToken) {
      fetch(`${API_URL}/matchmaking/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-UUID': state.sessionUuid,
          'X-Session-Token': state.sessionToken
        },
        body: JSON.stringify({ matchId: state.activeMatch.matchId })
      }).catch(() => {});
    }
  }, 10000);
}

export async function handleStartChatting(
  state: AppState,
  el: DOMElements,
  connectMatchedStranger: (matchData: MatchData) => void
): Promise<void> {
  // 1. Immediately reflect SEARCHING state and begin waiting timer
  setCallState(state, el, 'SEARCHING');
  startWaitingTimer(state, el);

  // 2. Start camera in background if not already active
  if (!state.localStream) {
    startLocalPreview(state, el).catch(() => {});
  }

  try {
    const { ok, data } = await enqueueWithRecovery(state);
    if (!ok) {
      throw new Error(data?.message || 'Unable to enter matchmaking queue.');
    }

    if (data.status === 'matched' && data.matchId && data.role) {
      stopWaitingTimer(state);
      connectMatchedStranger(data);
    } else {
      startPollingQueue(state, el, connectMatchedStranger);
    }
  } catch (err: any) {
    console.error('Queue error:', err);
    stopWaitingTimer(state);
    setCallState(state, el, 'IDLE');
    showToast(el, err?.message || 'Unable to connect to matchmaking server. Please retry.', 'error');
  }
}

export function startPollingQueue(
  state: AppState,
  el: DOMElements,
  connectMatchedStranger: (matchData: MatchData) => void
): void {
  stopPolling(state);
  let isPolling = false;

  state.pollTimer = setInterval(async () => {
    // If user stopped or match already connected, stop polling
    if (state.callState !== 'SEARCHING') {
      stopPolling(state);
      return;
    }
    if (isPolling) return;
    isPolling = true;

    try {
      const res = await fetch(`${API_URL}/matchmaking/status`, {
        headers: {
          'X-Session-UUID': state.sessionUuid || '',
          'X-Session-Token': state.sessionToken || ''
        }
      });

      // Recover seamlessly if session expired or backend restarted mid-search
      if (res.status === 401) {
        const { ok, data } = await enqueueWithRecovery(state);
        if (ok && data.status === 'matched' && data.matchId && data.role) {
          stopPolling(state);
          stopWaitingTimer(state);
          connectMatchedStranger(data);
        }
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (data.status === 'matched' && data.matchId && data.role) {
        stopPolling(state);
        stopWaitingTimer(state);
        connectMatchedStranger(data);
      } else if (data.status === 'idle' || data.status === 'expired') {
        // Queue search expired on server -> stop searching cleanly
        stopPolling(state);
        stopWaitingTimer(state);
        setCallState(state, el, 'IDLE');
        showToast(el, 'Search timed out. Click Start Call to search again.', 'neutral');
      }
    } catch (err) {
      console.warn('Status poll error:', err);
    } finally {
      isPolling = false;
    }
  }, 1500);
}

export async function handleNextStranger(
  state: AppState,
  el: DOMElements,
  closePeerConnection: () => void,
  connectMatchedStranger: (matchData: MatchData) => void
): Promise<void> {
  const prevMatchId = state.activeMatch?.matchId;

  stopPolling(state);
  stopHeartbeat(state);
  closePeerConnection();
  state.activeMatch = null;

  setCallState(state, el, 'SEARCHING');
  startWaitingTimer(state, el);

  try {
    let result: { ok: boolean; data: any } | null = null;

    if (prevMatchId && state.sessionUuid && state.sessionToken) {
      const nextRes = await fetch(`${API_URL}/matches/${prevMatchId}/next`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-UUID': state.sessionUuid,
          'X-Session-Token': state.sessionToken
        }
      });
      if (nextRes.ok) {
        result = { ok: true, data: await nextRes.json() };
      } else if (nextRes.status === 401) {
        await ensureSession(state, true);
      }
    }

    if (!result) {
      result = await enqueueWithRecovery(state);
    }

    if (!result.ok) {
      throw new Error(result.data?.message || 'Could not search for next stranger.');
    }

    if (result.data.status === 'matched' && result.data.matchId && result.data.role) {
      stopWaitingTimer(state);
      connectMatchedStranger(result.data);
    } else {
      startPollingQueue(state, el, connectMatchedStranger);
    }
  } catch (err: any) {
    stopWaitingTimer(state);
    setCallState(state, el, 'IDLE');
    showToast(el, err?.message || 'Could not search for next stranger. Try again.', 'error');
  }
}

export function handleStopCall(
  state: AppState,
  el: DOMElements,
  closePeerConnection: () => void
): void {
  stopPolling(state);
  stopWaitingTimer(state);
  stopHeartbeat(state);
  closePeerConnection();

  if (state.sessionUuid && state.sessionToken) {
    fetch(`${API_URL}/matchmaking/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-UUID': state.sessionUuid,
        'X-Session-Token': state.sessionToken
      }
    }).catch(() => {});

    if (state.activeMatch?.matchId) {
      fetch(`${API_URL}/matchmaking/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-UUID': state.sessionUuid,
          'X-Session-Token': state.sessionToken
        },
        body: JSON.stringify({ matchId: state.activeMatch.matchId })
      }).catch(() => {});
    }
  }

  state.activeMatch = null;
  setCallState(state, el, 'IDLE');
  showToast(el, 'Call stopped. Both users in idle standby.');
}
