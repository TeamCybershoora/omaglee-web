import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// Simulated Phase 5 Matchmaking Engine Implementation for automated unit testing
class TestMatchmakingEngine {
  constructor() {
    this.sessions = new Map();
    this.waitingQueue = [];
    this.matches = new Map();
    this.secretKey = 'test-matchmaking-secret-key';
  }

  createSession() {
    const sessionUuid = `anon_${crypto.randomBytes(16).toString('hex')}`;
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const session = {
      sessionUuid,
      rawToken,
      tokenHash,
      status: 'idle',
      activeMatchId: null,
      lastSeenAt: Date.now(),
      expiresAt: Date.now() + 86400000,
    };
    this.sessions.set(sessionUuid, session);
    return { sessionUuid, sessionToken: rawToken, session };
  }

  validateSession(sessionUuid, rawToken) {
    const session = this.sessions.get(sessionUuid);
    if (!session) return null;
    if (session.expiresAt && session.expiresAt < Date.now()) return null;
    if (session.rawToken !== rawToken) return null;
    return session;
  }

  genToken(matchId, participantId) {
    return crypto.createHmac('sha256', this.secretKey).update(`${matchId}:${participantId}`).digest('hex');
  }

  joinQueue(sessionUuid, rawToken) {
    const session = this.validateSession(sessionUuid, rawToken);
    if (!session) {
      return { success: false, error: 'invalid_session' };
    }

    // 1. Strict Invariant: One active match per session at any time
    if (session.activeMatchId) {
      const activeMatch = this.matches.get(session.activeMatchId);
      if (activeMatch && activeMatch.status !== 'ended') {
        return {
          success: false,
          error: 'already_in_match',
          message: 'One active match allowed at a time.',
          matchId: activeMatch.id,
        };
      }
      session.activeMatchId = null;
    }

    const now = Date.now();
    const heartbeatCutoff = now - 30000;

    // Deduplicate: Clean up existing queue entry
    this.waitingQueue = this.waitingQueue.filter(q => q.sessionUuid !== session.sessionUuid);

    // Search for waiting eligible stranger
    const strangerIndex = this.waitingQueue.findIndex(
      q => q.status === 'waiting' &&
           q.sessionUuid !== session.sessionUuid &&
           q.lastHeartbeatAt >= heartbeatCutoff &&
           q.expiresAt > now
    );

    if (strangerIndex !== -1) {
      const strangerQueue = this.waitingQueue[strangerIndex];
      const strangerSession = this.sessions.get(strangerQueue.sessionUuid);

      if (strangerSession && !strangerSession.activeMatchId) {
        // ATOMIC PAIRING
        const matchId = `match_${crypto.randomBytes(8).toString('hex')}`;
        const initiatorId = session.sessionUuid;
        const receiverId = strangerSession.sessionUuid;

        const tokenA = this.genToken(matchId, initiatorId);
        const tokenB = this.genToken(matchId, receiverId);

        const match = {
          id: matchId,
          status: 'pending',
          startedAt: now,
          endedAt: null,
          endedReason: null,
          participantAId: initiatorId,
          participantBId: receiverId,
          participantAToken: tokenA,
          participantBToken: tokenB,
        };

        this.matches.set(matchId, match);

        strangerQueue.status = 'matched';
        strangerQueue.matchId = matchId;
        strangerQueue.role = 'receiver';
        strangerQueue.token = tokenB;

        session.activeMatchId = matchId;
        session.status = 'matched';
        strangerSession.activeMatchId = matchId;
        strangerSession.status = 'matched';

        return {
          success: true,
          status: 'matched',
          matchId,
          role: 'initiator',
          participantId: initiatorId,
          participantToken: tokenA,
          channel: `private-match.${matchId}`,
        };
      }
    }

    // No stranger -> wait in queue
    this.waitingQueue.push({
      sessionUuid: session.sessionUuid,
      status: 'waiting',
      joinedAt: now,
      lastHeartbeatAt: now,
      expiresAt: now + 60000,
    });
    session.status = 'waiting';

    return {
      success: true,
      status: 'waiting',
      sessionUuid: session.sessionUuid,
    };
  }

  pollStatus(sessionUuid, rawToken) {
    const session = this.validateSession(sessionUuid, rawToken);
    if (!session) return { success: false, error: 'invalid_session' };

    const q = this.waitingQueue.find(e => e.sessionUuid === sessionUuid);
    if (!q) return { success: true, status: 'idle' };

    q.lastHeartbeatAt = Date.now();

    if (q.status === 'matched') {
      return {
        success: true,
        status: 'matched',
        matchId: q.matchId,
        role: q.role,
        participantToken: q.token,
      };
    }

    if (q.expiresAt < Date.now()) {
      q.status = 'expired';
      session.status = 'idle';
      return { success: true, status: 'expired' };
    }

    return { success: true, status: q.status };
  }

  cancelQueue(sessionUuid, rawToken) {
    const session = this.validateSession(sessionUuid, rawToken);
    if (!session) return { success: false, error: 'invalid_session' };

    this.waitingQueue = this.waitingQueue.filter(q => q.sessionUuid !== sessionUuid);
    session.status = 'idle';
    return { success: true };
  }

  next(sessionUuid, rawToken, matchId) {
    const session = this.validateSession(sessionUuid, rawToken);
    if (!session) return { success: false, error: 'invalid_session' };

    const match = this.matches.get(matchId);
    if (match && match.status !== 'ended') {
      match.status = 'ended';
      match.endedReason = 'next';
      match.endedAt = Date.now();

      const pA = this.sessions.get(match.participantAId);
      const pB = this.sessions.get(match.participantBId);
      if (pA) pA.activeMatchId = null;
      if (pB) pB.activeMatchId = null;
    }

    session.activeMatchId = null;
    return this.joinQueue(sessionUuid, rawToken);
  }

  disconnect(sessionUuid, rawToken, matchId) {
    const session = this.validateSession(sessionUuid, rawToken);
    if (!session) return { success: false, error: 'invalid_session' };

    const match = this.matches.get(matchId);
    if (match && match.status !== 'ended') {
      match.status = 'ended';
      match.endedReason = 'disconnect';
      match.endedAt = Date.now();

      const pA = this.sessions.get(match.participantAId);
      const pB = this.sessions.get(match.participantBId);
      if (pA) pA.activeMatchId = null;
      if (pB) pB.activeMatchId = null;
    }

    session.activeMatchId = null;
    session.status = 'idle';
    return { success: true };
  }
}

// ============================================
// TEST SUITE: PHASE 5 MATCHMAKING ENGINE
// ============================================

test('Phase 5: Anonymous session creation and cryptographic token hashing', () => {
  const engine = new TestMatchmakingEngine();
  const sessionData = engine.createSession();

  assert.ok(sessionData.sessionUuid.startsWith('anon_'));
  assert.equal(typeof sessionData.sessionToken, 'string');
  assert.equal(sessionData.sessionToken.length, 64);

  // Verification matches
  const valid = engine.validateSession(sessionData.sessionUuid, sessionData.sessionToken);
  assert.ok(valid);
  assert.equal(valid.sessionUuid, sessionData.sessionUuid);

  // Invalid token fails
  const invalid = engine.validateSession(sessionData.sessionUuid, 'wrong-token-abc');
  assert.equal(invalid, null);
});

test('Phase 5: Single user joins queue and enters waiting state', () => {
  const engine = new TestMatchmakingEngine();
  const userA = engine.createSession();

  const res = engine.joinQueue(userA.sessionUuid, userA.sessionToken);
  assert.equal(res.success, true);
  assert.equal(res.status, 'waiting');
  assert.equal(engine.waitingQueue.length, 1);
});

test('Phase 5: Two eligible strangers are automatically matched atomically', () => {
  const engine = new TestMatchmakingEngine();
  const userA = engine.createSession();
  const userB = engine.createSession();

  // User A joins -> waits in queue
  const resA = engine.joinQueue(userA.sessionUuid, userA.sessionToken);
  assert.equal(resA.status, 'waiting');

  // User B joins -> automatically matched with User A!
  const resB = engine.joinQueue(userB.sessionUuid, userB.sessionToken);
  assert.equal(resB.status, 'matched');
  assert.equal(resB.role, 'initiator');
  assert.ok(resB.matchId);
  assert.ok(resB.participantToken);

  // User A polls status and receives matched state with receiver role
  const pollA = engine.pollStatus(userA.sessionUuid, userA.sessionToken);
  assert.equal(pollA.status, 'matched');
  assert.equal(pollA.role, 'receiver');
  assert.equal(pollA.matchId, resB.matchId);
  assert.ok(pollA.participantToken);

  // Both have active match recorded
  const sessionA = engine.sessions.get(userA.sessionUuid);
  const sessionB = engine.sessions.get(userB.sessionUuid);
  assert.equal(sessionA.activeMatchId, resB.matchId);
  assert.equal(sessionB.activeMatchId, resB.matchId);
});

test('Phase 5: Invariant: One active match per participant enforced', () => {
  const engine = new TestMatchmakingEngine();
  const userA = engine.createSession();
  const userB = engine.createSession();
  const userC = engine.createSession();

  engine.joinQueue(userA.sessionUuid, userA.sessionToken);
  const matchAB = engine.joinQueue(userB.sessionUuid, userB.sessionToken);
  assert.equal(matchAB.status, 'matched');

  // User A attempts to join queue while already in active matchAB
  const duplicateJoinA = engine.joinQueue(userA.sessionUuid, userA.sessionToken);
  assert.equal(duplicateJoinA.success, false);
  assert.equal(duplicateJoinA.error, 'already_in_match');

  // User C joins queue -> must wait because A and B are occupied in active match
  const resC = engine.joinQueue(userC.sessionUuid, userC.sessionToken);
  assert.equal(resC.status, 'waiting');
});

test('Phase 5: Self-match is strictly prohibited', () => {
  const engine = new TestMatchmakingEngine();
  const userA = engine.createSession();

  // User A joins queue
  engine.joinQueue(userA.sessionUuid, userA.sessionToken);

  // User A sends repeated join queue request -> should deduplicate, not self-match!
  const repeated = engine.joinQueue(userA.sessionUuid, userA.sessionToken);
  assert.equal(repeated.status, 'waiting');
  assert.equal(engine.waitingQueue.length, 1);
});

test('Phase 5: Cancelled user is removed from queue and not matched', () => {
  const engine = new TestMatchmakingEngine();
  const userA = engine.createSession();
  const userB = engine.createSession();

  engine.joinQueue(userA.sessionUuid, userA.sessionToken);
  engine.cancelQueue(userA.sessionUuid, userA.sessionToken);
  assert.equal(engine.waitingQueue.length, 0);

  // User B joins -> no stranger available, waits in queue
  const resB = engine.joinQueue(userB.sessionUuid, userB.sessionToken);
  assert.equal(resB.status, 'waiting');
});

test('Phase 5: Next button ends old match with reason "next" and immediately re-enters queue', () => {
  const engine = new TestMatchmakingEngine();
  const userA = engine.createSession();
  const userB = engine.createSession();
  const userC = engine.createSession();

  // Match A and B
  engine.joinQueue(userA.sessionUuid, userA.sessionToken);
  const matchAB = engine.joinQueue(userB.sessionUuid, userB.sessionToken);
  assert.equal(matchAB.status, 'matched');
  const matchId1 = matchAB.matchId;

  // Pre-queue stranger C
  engine.joinQueue(userC.sessionUuid, userC.sessionToken);

  // User B clicks Next
  const nextResB = engine.next(userB.sessionUuid, userB.sessionToken, matchId1);
  assert.equal(nextResB.status, 'matched');
  assert.notEqual(nextResB.matchId, matchId1);

  // Old match is ended with reason next
  const oldMatch = engine.matches.get(matchId1);
  assert.equal(oldMatch.status, 'ended');
  assert.equal(oldMatch.endedReason, 'next');

  // User A is no longer in active match
  const sessionA = engine.sessions.get(userA.sessionUuid);
  assert.equal(sessionA.activeMatchId, null);
});

test('Phase 5: Disconnect ends match with reason "disconnect" and resets session state', () => {
  const engine = new TestMatchmakingEngine();
  const userA = engine.createSession();
  const userB = engine.createSession();

  engine.joinQueue(userA.sessionUuid, userA.sessionToken);
  const match = engine.joinQueue(userB.sessionUuid, userB.sessionToken);

  const discRes = engine.disconnect(userA.sessionUuid, userA.sessionToken, match.matchId);
  assert.equal(discRes.success, true);

  const endedMatch = engine.matches.get(match.matchId);
  assert.equal(endedMatch.status, 'ended');
  assert.equal(endedMatch.endedReason, 'disconnect');

  const sessionA = engine.sessions.get(userA.sessionUuid);
  const sessionB = engine.sessions.get(userB.sessionUuid);
  assert.equal(sessionA.activeMatchId, null);
  assert.equal(sessionB.activeMatchId, null);
  assert.equal(sessionA.status, 'idle');
});
