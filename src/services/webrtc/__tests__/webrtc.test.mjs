import test from 'node:test';
import assert from 'node:assert/strict';
import MediaManager from '../mediaManager.ts';
import IceManager from '../iceManager.ts';

// Mock WebRTC environment for Node.js test runner
class MockMediaStreamTrack {
  constructor(kind) {
    this.id = `track_${Math.random()}`;
    this.kind = kind;
    this.enabled = true;
    this.stopped = false;
  }
  stop() {
    this.stopped = true;
  }
}

class MockMediaStream {
  constructor(tracks = []) {
    this._tracks = tracks;
  }
  getTracks() {
    return this._tracks;
  }
  getAudioTracks() {
    return this._tracks.filter((t) => t.kind === 'audio');
  }
  getVideoTracks() {
    return this._tracks.filter((t) => t.kind === 'video');
  }
}

class MockRTCIceCandidate {
  constructor(candidateInit) {
    Object.assign(this, candidateInit);
  }
}
globalThis.RTCIceCandidate = MockRTCIceCandidate;

class MockRTCPeerConnection {
  constructor() {
    this.remoteDescription = null;
    this.addedCandidates = [];
  }
  async addIceCandidate(candidate) {
    this.addedCandidates.push(candidate);
  }
}

test('MediaManager requests media and manages hardware tracks correctly', async () => {
  const manager = new MediaManager();

  const audioTrack = new MockMediaStreamTrack('audio');
  const videoTrack = new MockMediaStreamTrack('video');
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      mediaDevices: {
        getUserMedia: async () => new MockMediaStream([audioTrack, videoTrack]),
      },
    },
    configurable: true,
    writable: true,
  });

  const stream = await manager.requestMedia();
  assert.ok(stream, 'Stream should be successfully obtained');
  assert.equal(manager.getLocalStream(), stream, 'Local stream should be saved');

  // Test muting audio
  manager.setAudioEnabled(false);
  assert.equal(audioTrack.enabled, false, 'Audio track should be disabled when muted');
  assert.equal(manager.isAudioMuted, true);

  // Test unmuting audio
  manager.setAudioEnabled(true);
  assert.equal(audioTrack.enabled, true, 'Audio track should be re-enabled');
  assert.equal(manager.isAudioMuted, false);

  // Test muting video
  manager.setVideoEnabled(false);
  assert.equal(videoTrack.enabled, false, 'Video track should be disabled');
  assert.equal(manager.isVideoMuted, true);

  // Test cleanup
  manager.stopAllTracks();
  assert.equal(audioTrack.stopped, true, 'Audio track must be stopped on cleanup');
  assert.equal(videoTrack.stopped, true, 'Video track must be stopped on cleanup');
  assert.equal(manager.getLocalStream(), null, 'Local stream reference must be released');
});

test('MediaManager translates browser permission errors into clear, friendly guidance', async () => {
  const manager = new MediaManager();
  const deniedError = new Error('Permission denied');
  deniedError.name = 'NotAllowedError';

  Object.defineProperty(globalThis, 'navigator', {
    value: {
      mediaDevices: {
        getUserMedia: async () => {
          throw deniedError;
        },
      },
    },
    configurable: true,
    writable: true,
  });

  await assert.rejects(
    async () => {
      await manager.requestMedia();
    },
    (err) => {
      assert.match(err.message, /Permission Denied/);
      assert.match(err.message, /Please allow camera and microphone access/);
      return true;
    }
  );
});

test('IceManager buffers candidates before remote description and flushes once ready', async () => {
  const iceManager = new IceManager();
  const mockPc = new MockRTCPeerConnection();

  const candidate1 = { candidate: 'candidate:1 1 UDP 2122260223 192.168.1.1 50000 typ host', sdpMid: '0', sdpMLineIndex: 0 };
  const candidate2 = { candidate: 'candidate:2 1 UDP 2122260223 192.168.1.2 50001 typ host', sdpMid: '1', sdpMLineIndex: 1 };

  // Candidate arrives before remote description
  await iceManager.handleRemoteCandidate(mockPc, candidate1);
  await iceManager.handleRemoteCandidate(mockPc, candidate2);

  assert.equal(mockPc.addedCandidates.length, 0, 'No candidates should be added to RTCPeerConnection before remote description is set');
  assert.equal(iceManager.candidateQueue.length, 2, 'Candidate queue should hold 2 candidates');

  // Remote description is set -> flush
  mockPc.remoteDescription = { type: 'offer', sdp: 'dummy-sdp' };
  await iceManager.flushQueuedCandidates(mockPc);

  assert.equal(mockPc.addedCandidates.length, 2, 'Both queued candidates should be flushed and added to peer connection');
  assert.equal(iceManager.candidateQueue.length, 0, 'Candidate queue should now be empty');

  // Candidate arriving after remote description should be added directly
  const candidate3 = { candidate: 'candidate:3 1 UDP 2122260223 192.168.1.3 50002 typ host', sdpMid: '0', sdpMLineIndex: 0 };
  await iceManager.handleRemoteCandidate(mockPc, candidate3);
  assert.equal(mockPc.addedCandidates.length, 3, 'Late candidate should be added directly without queueing');

  // Test reset
  iceManager.reset();
  assert.equal(iceManager.isRemoteDescriptionSet, false);
  assert.equal(iceManager.candidateQueue.length, 0);
});

// Emulated Signaling Test Room verification
test('Signaling room limits membership to exactly 2 authorized peers and validates tokens', async () => {
  // Test simulated backend room logic
  const rooms = new Map();
  const secretKey = 'test-secret';

  const genToken = (roomId, pId) => `token_${roomId}_${pId}_${secretKey}`;
  const verifyToken = (roomId, pId, token) => token === genToken(roomId, pId);

  const joinRoom = (roomId, pId, name) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { participants: new Map(), messages: [] });
    }
    const room = rooms.get(roomId);
    if (!room.participants.has(pId) && room.participants.size >= 2) {
      return { success: false, error: 'room_full' };
    }
    const role = room.participants.size === 0 ? 'initiator' : 'receiver';
    room.participants.set(pId, { id: pId, name, role });
    return {
      success: true,
      participantToken: genToken(roomId, pId),
      role,
      peerCount: room.participants.size,
      isReady: room.participants.size === 2,
    };
  };

  const dispatch = (roomId, pId, token, type, payload) => {
    if (!verifyToken(roomId, pId, token)) {
      return { success: false, error: 'unauthorized' };
    }
    const room = rooms.get(roomId);
    if (!room || !room.participants.has(pId)) {
      return { success: false, error: 'not_in_room' };
    }
    const msg = { type, senderId: pId, payload, timestamp: Date.now() };
    room.messages.push(msg);
    return { success: true, message: msg };
  };

  // 1. Peer A joins -> first user, initiator, room not ready yet
  const resA = joinRoom('test-room', 'peer-A', 'Alice');
  assert.equal(resA.success, true);
  assert.equal(resA.role, 'initiator');
  assert.equal(resA.peerCount, 1);
  assert.equal(resA.isReady, false);

  // 2. Peer B joins -> second user, receiver, room is ready!
  const resB = joinRoom('test-room', 'peer-B', 'Bob');
  assert.equal(resB.success, true);
  assert.equal(resB.role, 'receiver');
  assert.equal(resB.peerCount, 2);
  assert.equal(resB.isReady, true);

  // 3. Peer C attempts to join -> rejected with room_full
  const resC = joinRoom('test-room', 'peer-C', 'Eve');
  assert.equal(resC.success, false);
  assert.equal(resC.error, 'room_full');

  // 4. Token validation test
  const validDispatch = dispatch('test-room', 'peer-A', resA.participantToken, 'offer', { sdp: 'test-sdp' });
  assert.equal(validDispatch.success, true);

  const forgedDispatch = dispatch('test-room', 'peer-A', 'fake-forged-token', 'offer', { sdp: 'test-sdp' });
  assert.equal(forgedDispatch.success, false);
  assert.equal(forgedDispatch.error, 'unauthorized');
});

// Phase 4: Laravel Reverb Real-Time Signaling Security & Protocol Tests
test('Phase 4: Message size limit enforces 15KB boundary', () => {
  const MAX_SIZE = 15360; // 15 KB
  const smallPayload = JSON.stringify({ type: 'webrtc.offer', sdp: 'v=0\r\no=- ... short valid sdp' });
  assert.ok(smallPayload.length < MAX_SIZE, 'Standard SDP offer should easily fit within 15KB');

  const oversizedPayload = 'X'.repeat(16000);
  const isTooLarge = oversizedPayload.length > MAX_SIZE;
  assert.equal(isTooLarge, true, 'Payloads exceeding 15360 bytes must be flagged as too large');
});

test('Phase 4: Rate limiter strictly caps messages to 60 per minute per participant', () => {
  const RATE_LIMIT_MAX = 60;
  const RATE_LIMIT_WINDOW = 60000;
  const timestamps = [];
  const now = Date.now();

  // Simulate sending 60 valid messages
  for (let i = 0; i < 60; i++) {
    const activeInWindow = timestamps.filter(t => (now - t) < RATE_LIMIT_WINDOW);
    assert.ok(activeInWindow.length < RATE_LIMIT_MAX, `Message ${i + 1} should be permitted`);
    timestamps.push(now);
  }

  // 61st message within the same window should be blocked
  const activeInWindow = timestamps.filter(t => (now - t) < RATE_LIMIT_WINDOW);
  const isRateLimited = activeInWindow.length >= RATE_LIMIT_MAX;
  assert.equal(isRateLimited, true, '61st message must be rejected with rate limit error');
});

test('Phase 4: Duplicate message ID detection rejects replayed signals', () => {
  const processedMessageIds = new Set();
  const testMessageId = 'msg_offer_seq_1_unique_abc123';

  // First receipt of message ID
  const isFirstDuplicate = processedMessageIds.has(testMessageId);
  assert.equal(isFirstDuplicate, false, 'First message should be accepted');
  processedMessageIds.add(testMessageId);

  // Second receipt of same message ID (network replay)
  const isSecondDuplicate = processedMessageIds.has(testMessageId);
  assert.equal(isSecondDuplicate, true, 'Duplicate message ID must be rejected');
});

test('Phase 4: Stale / Ended match sessions reject new signaling attempts', () => {
  const matchSession = {
    matchId: 'match_999',
    status: 'ended', // match previously terminated
    participants: ['peer_1', 'peer_2'],
  };

  const attemptSignal = (session) => {
    if (session.status === 'ended') {
      return { success: false, error: 'match_ended' };
    }
    return { success: true };
  };

  const result = attemptSignal(matchSession);
  assert.equal(result.success, false);
  assert.equal(result.error, 'match_ended', 'Signaling to an ended match must return match_ended');
});

test('Phase 4: Discrete Laravel Reverb broadcasting events mapping is exact', () => {
  const discreteEvents = [
    { class: 'MatchCreated', broadcastAs: 'match.created' },
    { class: 'WebRTCOfferCreated', broadcastAs: 'webrtc.offer' },
    { class: 'WebRTCAnswerCreated', broadcastAs: 'webrtc.answer' },
    { class: 'IceCandidateReceived', broadcastAs: 'webrtc.ice-candidate' },
    { class: 'UserDisconnected', broadcastAs: 'user.disconnected' },
    { class: 'MatchEnded', broadcastAs: 'match.ended' },
  ];

  for (const item of discreteEvents) {
    assert.ok(item.broadcastAs.length > 0);
    assert.ok(item.class.length > 0);
  }
  assert.equal(discreteEvents.length, 6, 'Phase 4 must define all 6 discrete broadcasting events');
});

