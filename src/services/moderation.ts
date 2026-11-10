/**
 * Moderation Service - Reporting & Blocking Abuse
 */

import { AppState, DOMElements } from '../types';
import { API_URL } from '../config';
import { closeModals, showToast } from './ui';

export async function handleSubmitReport(
  state: AppState,
  el: DOMElements,
  onNextStranger: () => void
): Promise<void> {
  if (!state.sessionUuid || !state.sessionToken) {
    showToast(el, 'No active session found.', 'error');
    return;
  }

  const reason = el.reportReason?.value || 'nudity_inappropriate';
  const description = el.reportDesc?.value || 'Reported via Safety Modal';

  try {
    const res = await fetch(`${API_URL}/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-UUID': state.sessionUuid,
        'X-Session-Token': state.sessionToken
      },
      body: JSON.stringify({
        matchId: state.activeMatch?.matchId || null,
        reason,
        description
      })
    });

    if (res.ok) {
      closeModals(el);
      if (el.reportDesc) el.reportDesc.value = '';
      showToast(el, 'Report received. Our moderation team has been notified.', 'success');
      onNextStranger();
    } else {
      showToast(el, 'Failed to submit report. Please try again.', 'error');
    }
  } catch {
    showToast(el, 'Failed to submit report. Please try again.', 'error');
  }
}

export async function handleBlockStranger(
  state: AppState,
  el: DOMElements,
  onNextStranger: () => void
): Promise<void> {
  if (!state.sessionUuid || !state.sessionToken || !state.activeMatch?.matchId) {
    showToast(el, 'No active match to block.', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_URL}/blocks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-UUID': state.sessionUuid,
        'X-Session-Token': state.sessionToken
      },
      body: JSON.stringify({
        matchId: state.activeMatch.matchId,
        reason: 'User blocked by participant'
      })
    });

    if (res.ok) {
      closeModals(el);
      showToast(el, 'Stranger blocked. You will never be matched again.');
      onNextStranger();
    }
  } catch {
    showToast(el, 'Failed to block stranger.', 'error');
  }
}
