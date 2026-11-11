/**
 * WebRTC Service - PeerConnection, Signaling, ICE & DataChannel
 */

import { AppState, DOMElements, MatchData, SignalingMessage } from '../types';
import { API_URL, DEFAULT_ICE_SERVERS } from '../config';
import { setCallState, showToast } from './ui';
import { startHeartbeat, stopWaitingTimer, stopPolling } from './matchmaking';
import { startLocalPreview } from './media';

// Queue for ICE candidates arriving before remote description is set
let pendingCandidates: RTCIceCandidateInit[] = [];
let disconnectGraceTimer: ReturnType<typeof setTimeout> | null = null;

export async function fetchIceServers(state: AppState): Promise<RTCIceServer[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${API_URL}/webrtc/ice-config`, {
      headers: state.sessionUuid ? { 'X-Session-UUID': state.sessionUuid } : {},
      signal: controller.signal
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      state.turnAvailable = Boolean(data.turnConfigured);
      if (Array.isArray(data.iceServers) && data.iceServers.length > 0) {
        return data.iceServers;
      }
    }
  } catch {
    // Fallback cleanly to default STUN servers
  }
  if (state.turnAvailable === null) state.turnAvailable = false;
  return DEFAULT_ICE_SERVERS;
}

export async function connectMatchedStranger(
  state: AppState,
  el: DOMElements,
  matchData: MatchData,
  appendChatMessage: (sender: string, text: string) => void,
  clearChatMessages: () => void,
  onMatchEnded: (reason: string) => void
): Promise<void> {
  state.activeMatch = matchData;
  state.processedMsgIds.clear();
  pendingCandidates = [];
  if (disconnectGraceTimer) {
    clearTimeout(disconnectGraceTimer);
    disconnectGraceTimer = null;
  }

  stopWaitingTimer(state);
  stopPolling(state);
  setCallState(state, el, 'CONNECTING');

  clearChatMessages();
  appendChatMessage('system', 'Connected with an anonymous stranger. Say hello! 👋');

  startHeartbeat(state);

  // Wait briefly for camera/virtual stream & ICE config before building offer/answer
  const mediaPromise = state.localStream
    ? Promise.resolve()
    : Promise.race([
        startLocalPreview(state, el).catch(() => {}),
        new Promise<void>((resolve) => setTimeout(resolve, 2500))
      ]);

  const [iceServers] = await Promise.all([fetchIceServers(state), mediaPromise]);

  // User may have cancelled while waiting for ICE/media
  if (!state.activeMatch || state.activeMatch.matchId !== matchData.matchId) {
    return;
  }

  const config: RTCConfiguration = {
    iceServers,
    iceTransportPolicy: state.privacyMode && state.turnAvailable ? 'relay' : 'all'
  };

  const pc = new RTCPeerConnection(config);
  state.peerConnection = pc;

  // Connection state change listener with grace period on transient 'disconnected'
  pc.onconnectionstatechange = () => {
    console.log('[WebRTC] Connection state:', pc.connectionState);
    if (pc.connectionState === 'connected') {
      if (disconnectGraceTimer) {
        clearTimeout(disconnectGraceTimer);
        disconnectGraceTimer = null;
      }
      setCallState(state, el, 'CONNECTED');
    } else if (pc.connectionState === 'disconnected') {
      if (!disconnectGraceTimer) {
        disconnectGraceTimer = setTimeout(() => {
          disconnectGraceTimer = null;
          if (state.peerConnection === pc && (pc.connectionState === 'disconnected' || pc.connectionState === 'failed')) {
            onMatchEnded('disconnect');
          }
        }, 4000);
      }
    } else if (pc.connectionState === 'failed') {
      if (disconnectGraceTimer) {
        clearTimeout(disconnectGraceTimer);
        disconnectGraceTimer = null;
      }
      onMatchEnded('disconnect');
    }
  };

  // Attach local media stream tracks
  if (state.localStream) {
    state.localStream.getTracks().forEach(track => {
      pc.addTrack(track, state.localStream!);
    });
  }

  // Handle remote video & audio tracks
  pc.ontrack = (event) => {
    console.log('[WebRTC] Received remote track:', event.track.kind);
    if (event.streams && event.streams[0]) {
      state.remoteStream = event.streams[0];
      if (el.remoteVideo) {
        el.remoteVideo.srcObject = event.streams[0];
      }
    } else {
      if (!state.remoteStream) {
        state.remoteStream = new MediaStream();
      }
      state.remoteStream.addTrack(event.track);
      if (el.remoteVideo) {
        el.remoteVideo.srcObject = state.remoteStream;
      }
    }
    setCallState(state, el, 'CONNECTED');
  };

  // Send local ICE candidates to remote peer via signaling
  pc.onicecandidate = (event) => {
    if (event.candidate && state.activeMatch?.matchId) {
      sendSignalingMessage(state, 'candidate', { candidate: event.candidate.toJSON() });
    }
  };

  // Data Channel for real-time text chat
  if (matchData.role === 'initiator') {
    const dc = pc.createDataChannel('chat', { ordered: true });
    setupDataChannel(state, el, dc, appendChatMessage);
    state.dataChannel = dc;

    pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
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

  startSignalingPoll(state, el, onMatchEnded);
}

export function setupDataChannel(
  state: AppState,
  el: DOMElements,
  dc: RTCDataChannel,
  appendChatMessage: (sender: string, text: string) => void
): void {
  dc.onopen = () => {
    console.log('[WebRTC] DataChannel open');
    if (el.signalingStatusText) el.signalingStatusText.textContent = 'Connected';
    setCallState(state, el, 'CONNECTED');
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

export function startSignalingPoll(state: AppState, el: DOMElements, onMatchEnded: (reason: string) => void): void {
  stopSignalingPoll(state);
  let isPolling = false;

  state.sigPollTimer = setInterval(async () => {
    if (!state.activeMatch?.matchId || !state.peerConnection) return;
    if (isPolling) return;
    isPolling = true;

    try {
      const res = await fetch(
        `${API_URL}/signaling/messages?matchId=${state.activeMatch.matchId}&participantId=${state.activeMatch.participantId}&participantToken=${state.activeMatch.participantToken}`
      );
      if (res.status === 404 || res.status === 410) {
        onMatchEnded('user_leave');
        return;
      }

      const data = await res.json();
      const messages: SignalingMessage[] = data.messages || [];

      // Process messages sequentially in arrival order
      for (const msg of messages) {
        if (msg.id && state.processedMsgIds.has(msg.id)) continue;
        if (msg.id) state.processedMsgIds.add(msg.id);

        await handleIncomingSignalingMessage(state, el, msg, onMatchEnded);
      }

      if (data.status === 'ended' && state.activeMatch) {
        onMatchEnded(data.endedReason || 'user_leave');
      }
    } catch {
      // transient network poll drop
    } finally {
      isPolling = false;
    }
  }, 600);
}

export async function handleIncomingSignalingMessage(
  state: AppState,
  el: DOMElements,
  msg: SignalingMessage,
  onMatchEnded: (reason: string) => void
): Promise<void> {
  const pc = state.peerConnection;
  if (!pc) return;

  if (msg.type === 'offer' && state.activeMatch?.role === 'receiver') {
    try {
      const sdp = msg.payload?.sdp || msg.sdp;
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));

      // Drain queued ICE candidates
      while (pendingCandidates.length > 0) {
        const candidate = pendingCandidates.shift();
        if (candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.warn('Queued candidate error:', e));
        }
      }

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

        // Drain queued ICE candidates
        while (pendingCandidates.length > 0) {
          const candidate = pendingCandidates.shift();
          if (candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.warn('Queued candidate error:', e));
          }
        }
      }
    } catch (err) {
      console.error('Handle answer error:', err);
    }
  } else if (msg.type === 'candidate') {
    try {
      const candidate = msg.payload?.candidate || msg.candidate;
      if (candidate) {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          // Remote description not ready yet -> buffer candidate
          pendingCandidates.push(candidate);
        }
      }
    } catch (err) {
      console.warn('Add ICE candidate error:', err);
    }
  } else if (msg.type === 'leave' || msg.type === 'disconnect' || msg.type === 'match.ended') {
    const reason = msg.payload?.reason || (msg.type === 'match.ended' ? 'user_leave' : 'disconnect');
    onMatchEnded(reason);
  }
}

export function closePeerConnection(state: AppState, el: DOMElements): void {
  stopSignalingPoll(state);
  pendingCandidates = [];
  if (disconnectGraceTimer) {
    clearTimeout(disconnectGraceTimer);
    disconnectGraceTimer = null;
  }

  if (state.dataChannel) {
    try { state.dataChannel.close(); } catch {}
    state.dataChannel = null;
  }
  if (state.peerConnection) {
    state.peerConnection.onconnectionstatechange = null;
    state.peerConnection.ontrack = null;
    state.peerConnection.onicecandidate = null;
    try { state.peerConnection.close(); } catch {}
    state.peerConnection = null;
  }
  if (el.remoteVideo) {
    el.remoteVideo.srcObject = null;
  }
  state.remoteStream = null;
}
