/**
 * Matchmaking Service - Queue, Status, Heartbeat & Life Cycle
 */

import { AppState, DOMElements, MatchData } from '../types';
import { API_URL } from '../config';
import { setCallState, showToast } from './ui';
import { startLocalPreview } from './media';

export async function ensureSession(state: AppState): Promise<{ sessionUuid: string; sessionToken: string }> {
  if (state.sessionUuid && state.sessionToken) {
    return { sessionUuid: state.sessionUuid, sessionToken: state.sessionToken };
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
    await ensureSession(state);
    const res = await fetch(`${API_URL}/matchmaking/queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-UUID': state.sessionUuid || '',
        'X-Session-Token': state.sessionToken || ''
      }
    });
    const data = await res.json();

    if (data.status === 'matched' && data.matchId && data.role) {
      stopWaitingTimer(state);
      connectMatchedStranger(data);
    } else {
      startPollingQueue(state, el, connectMatchedStranger);
    }
  } catch (err) {
    console.error('Queue error:', err);
    stopWaitingTimer(state);
    setCallState(state, el, 'IDLE');
    showToast(el, 'Unable to connect to matchmaking server. Please retry.', 'error');
  }
}

export function startPollingQueue(
  state: AppState,
  el: DOMElements,
  connectMatchedStranger: (matchData: MatchData) => void
): void {
  stopPolling(state);
  state.pollTimer = setInterval(async () => {
    // If user stopped or match already connected, stop polling
    if (state.callState !== 'SEARCHING') {
      stopPolling(state);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/matchmaking/status`, {
        headers: {
          'X-Session-UUID': state.sessionUuid || '',
          'X-Session-Token': state.sessionToken || ''
        }
      });
      const data = await res.json();

      if (data.status === 'matched' && data.matchId && data.role) {
        stopPolling(state);
        stopWaitingTimer(state);
        connectMatchedStranger(data);
      } else if (data.status === 'idle') {
        // Queue search expired on server
        stopPolling(state);
        stopWaitingTimer(state);
        setCallState(state, el, 'IDLE');
        showToast(el, 'Search timed out. Click Start Call to search again.', 'neutral');
      }
    } catch (err) {
      console.warn('Status poll error:', err);
    }
  }, 1500);
}

export async function handleNextStranger(
  state: AppState,
  el: DOMElements,
  closePeerConnection: () => void,
  connectMatchedStranger: (matchData: MatchData) => void
): Promise<void> {
  stopPolling(state);
  stopHeartbeat(state);
  closePeerConnection();

  if (state.activeMatch?.matchId && state.sessionUuid && state.sessionToken) {
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
  state.activeMatch = null;

  setCallState(state, el, 'SEARCHING');
  startWaitingTimer(state, el);

  try {
    await ensureSession(state);
    const res = await fetch(`${API_URL}/matchmaking/queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-UUID': state.sessionUuid || '',
        'X-Session-Token': state.sessionToken || ''
      }
    });
    const data = await res.json();

    if (data.status === 'matched' && data.matchId && data.role) {
      stopWaitingTimer(state);
      connectMatchedStranger(data);
    } else {
      startPollingQueue(state, el, connectMatchedStranger);
    }
  } catch {
    stopWaitingTimer(state);
    setCallState(state, el, 'IDLE');
    showToast(el, 'Could not search for next stranger. Try again.', 'error');
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
