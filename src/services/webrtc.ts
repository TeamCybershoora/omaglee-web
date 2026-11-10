/**
 * WebRTC Service - PeerConnection, Signaling, ICE & DataChannel
 */

import { AppState, DOMElements, MatchData, SignalingMessage } from '../types';
import { API_URL, DEFAULT_ICE_SERVERS } from '../config';
import { setCallState, showToast } from './ui';
import { startHeartbeat } from './matchmaking';

export function connectMatchedStranger(
  state: AppState,
  el: DOMElements,
  matchData: MatchData,
  appendChatMessage: (sender: string, text: string) => void,
  clearChatMessages: () => void,
  onDisconnect: () => void
): void {
  state.activeMatch = matchData;
  state.processedMsgIds.clear();
  setCallState(state, el, 'CONNECTING');

  clearChatMessages();
  appendChatMessage('system', 'Connected with an anonymous stranger. Say hello! 👋');

  startHeartbeat(state);

  const config: RTCConfiguration = {
    iceServers: DEFAULT_ICE_SERVERS,
    iceTransportPolicy: state.privacyMode ? 'relay' : 'all'
  };

  const pc = new RTCPeerConnection(config);
  state.peerConnection = pc;

  if (state.localStream) {
    state.localStream.getTracks().forEach(track => {
      pc.addTrack(track, state.localStream!);
    });
  }

  pc.ontrack = (event) => {
    state.remoteStream = event.streams[0];
    if (el.remoteVideo) {
      el.remoteVideo.srcObject = event.streams[0];
    }
    setCallState(state, el, 'CONNECTED');
  };

  pc.onicecandidate = (event) => {
    if (event.candidate && state.activeMatch?.matchId) {
      sendSignalingMessage(state, 'candidate', { candidate: event.candidate });
    }
  };

  if (matchData.role === 'initiator') {
    const dc = pc.createDataChannel('chat', { ordered: true });
    setupDataChannel(state, el, dc, appendChatMessage);
    state.dataChannel = dc;

    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .then(() => {
        if (pc.localDescription) {
          sendSignalingMessage(state, 'offer', { sdp: pc.localDescription.sdp });
        }
      })
      .catch(err => {
        console.error('Create offer error:', err);
      });
  } else {
    pc.ondatachannel = (event) => {
      setupDataChannel(state, el, event.channel, appendChatMessage);
      state.dataChannel = event.channel;
    };
  }

  startSignalingPoll(state, el, onDisconnect);
}

export function setupDataChannel(
  _state: AppState,
  el: DOMElements,
  dc: RTCDataChannel,
  appendChatMessage: (sender: string, text: string) => void
): void {
  dc.onopen = () => {
    if (el.signalingStatusText) el.signalingStatusText.textContent = 'Connected (P2P)';
  };
  dc.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      appendChatMessage('stranger', data.text || event.data);
    } catch {
      appendChatMessage('stranger', event.data);
    }
  };
  dc.onclose = () => {
    if (el.signalingStatusText) el.signalingStatusText.textContent = 'Disconnected';
  };
}

export async function sendSignalingMessage(state: AppState, type: string, payload: any): Promise<void> {
  if (!state.activeMatch?.matchId) return;
  try {
    await fetch(`${API_URL}/signaling/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId: state.activeMatch.matchId,
        participantId: state.activeMatch.participantId,
        participantToken: state.activeMatch.participantToken,
        type,
        payload
      })
    });
  } catch (err) {
    console.warn('Send signaling error:', err);
  }
}

export function stopSignalingPoll(state: AppState): void {
  if (state.sigPollTimer) {
    clearInterval(state.sigPollTimer as any);
    state.sigPollTimer = null;
  }
}

export function startSignalingPoll(state: AppState, el: DOMElements, onDisconnect: () => void): void {
  stopSignalingPoll(state);
  state.sigPollTimer = setInterval(async () => {
    if (!state.activeMatch?.matchId || !state.peerConnection) return;

    try {
      const res = await fetch(
        `${API_URL}/signaling/messages?matchId=${state.activeMatch.matchId}&participantId=${state.activeMatch.participantId}&participantToken=${state.activeMatch.participantToken}`
      );
      const data = await res.json();
      const messages: SignalingMessage[] = data.messages || [];

      for (const msg of messages) {
        if (msg.id && state.processedMsgIds.has(msg.id)) continue;
        if (msg.id) state.processedMsgIds.add(msg.id);

        handleIncomingSignalingMessage(state, el, msg, onDisconnect);
      }
    } catch {
      // transient network poll drop
    }
  }, 600);
}

export async function handleIncomingSignalingMessage(
  state: AppState,
  el: DOMElements,
  msg: SignalingMessage,
  onDisconnect: () => void
): Promise<void> {
  const pc = state.peerConnection;
  if (!pc) return;

  if (msg.type === 'offer' && state.activeMatch?.role === 'receiver') {
    try {
      const sdp = msg.payload?.sdp || msg.sdp;
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignalingMessage(state, 'answer', { sdp: answer.sdp });
    } catch (err) {
      console.error('Handle offer error:', err);
    }
  } else if (msg.type === 'answer' && state.activeMatch?.role === 'initiator') {
    try {
      const sdp = msg.payload?.sdp || msg.sdp;
      if (pc.signalingState !== 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
      }
    } catch (err) {
      console.error('Handle answer error:', err);
    }
  } else if (msg.type === 'candidate') {
    try {
      const candidate = msg.payload?.candidate || msg.candidate;
      if (candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      console.warn('Add ICE candidate error:', err);
    }
  } else if (msg.type === 'leave' || msg.type === 'disconnect') {
    showToast(el, 'Stranger disconnected or stopped call.');
    onDisconnect();
  }
}

export function closePeerConnection(state: AppState, el: DOMElements): void {
  stopSignalingPoll(state);
  if (state.dataChannel) {
    try { state.dataChannel.close(); } catch {}
    state.dataChannel = null;
  }
  if (state.peerConnection) {
    try { state.peerConnection.close(); } catch {}
    state.peerConnection = null;
  }
  if (el.remoteVideo) {
    el.remoteVideo.srcObject = null;
  }
  state.remoteStream = null;
}
