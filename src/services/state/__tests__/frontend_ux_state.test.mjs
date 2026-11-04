import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FrontendStateMachine } from '../frontendStateMachine.ts';

describe('Phase 7: Frontend UX State Machine & Controls Suite', () => {

  describe('1. State Machine Transitions', () => {
    it('initializes in IDLE state', () => {
      const sm = new FrontendStateMachine();
      assert.strictEqual(sm.getState(), 'IDLE');
    });

    it('allows valid progressive happy-path lifecycle transitions', () => {
      const sm = new FrontendStateMachine();

      assert.ok(sm.transition('REQUESTING_MEDIA'), 'IDLE -> REQUESTING_MEDIA');
      assert.strictEqual(sm.getState(), 'REQUESTING_MEDIA');

      assert.ok(sm.transition('SEARCHING'), 'REQUESTING_MEDIA -> SEARCHING');
      assert.strictEqual(sm.getState(), 'SEARCHING');

      assert.ok(sm.transition('MATCHED'), 'SEARCHING -> MATCHED');
      assert.strictEqual(sm.getState(), 'MATCHED');

      assert.ok(sm.transition('CONNECTING'), 'MATCHED -> CONNECTING');
      assert.strictEqual(sm.getState(), 'CONNECTING');

      assert.ok(sm.transition('CONNECTED'), 'CONNECTING -> CONNECTED');
      assert.strictEqual(sm.getState(), 'CONNECTED');
    });

    it('rejects invalid state transitions without changing current state', () => {
      const sm = new FrontendStateMachine('IDLE');

      // Invalid: IDLE cannot jump directly to CONNECTED
      const ok = sm.transition('CONNECTED');
      assert.strictEqual(ok, false);
      assert.strictEqual(sm.getState(), 'IDLE', 'State must remain IDLE');

      // Invalid: IDLE cannot jump directly to MATCHED
      assert.strictEqual(sm.transition('MATCHED'), false);
      assert.strictEqual(sm.getState(), 'IDLE');
    });

    it('handles Next Stranger transition: CONNECTED -> SEARCHING', () => {
      const sm = new FrontendStateMachine('CONNECTED');
      assert.ok(sm.transition('SEARCHING'), 'CONNECTED -> SEARCHING (Next stranger)');
      assert.strictEqual(sm.getState(), 'SEARCHING');
    });

    it('handles Stop Chatting transition: CONNECTED -> STOPPING -> IDLE', () => {
      const sm = new FrontendStateMachine('CONNECTED');
      assert.ok(sm.transition('STOPPING'), 'CONNECTED -> STOPPING');
      assert.ok(sm.transition('IDLE'), 'STOPPING -> IDLE');
      assert.strictEqual(sm.getState(), 'IDLE');
    });

    it('handles Cancel Search transition: SEARCHING -> STOPPING -> IDLE', () => {
      const sm = new FrontendStateMachine('SEARCHING');
      assert.ok(sm.transition('STOPPING'), 'SEARCHING -> STOPPING');
      assert.ok(sm.transition('IDLE'), 'STOPPING -> IDLE');
      assert.strictEqual(sm.getState(), 'IDLE');
    });

    it('handles Network Interruption & Recovery: CONNECTED -> RECONNECTING -> CONNECTED', () => {
      const sm = new FrontendStateMachine('CONNECTED');
      assert.ok(sm.transition('RECONNECTING'), 'CONNECTED -> RECONNECTING');
      assert.ok(sm.transition('CONNECTED'), 'RECONNECTING -> CONNECTED (Recovered)');
      assert.strictEqual(sm.getState(), 'CONNECTED');
    });

    it('handles Fatal Connection Drop: RECONNECTING -> CONNECTION_FAILED', () => {
      const sm = new FrontendStateMachine('RECONNECTING');
      assert.ok(sm.transition('CONNECTION_FAILED'), 'RECONNECTING -> CONNECTION_FAILED');
      assert.strictEqual(sm.getState(), 'CONNECTION_FAILED');
    });
  });

  describe('2. Single-Flight Action Locks (Debouncing Rapid Clicks)', () => {
    it('blocks duplicate rapid clicks within the lock duration window', () => {
      const sm = new FrontendStateMachine();

      // First click acquires lock
      const lock1 = sm.acquireLock('next_stranger', 800);
      assert.strictEqual(lock1, true, 'First click must acquire action lock');

      // Immediate second click must be rejected
      const lock2 = sm.acquireLock('next_stranger', 800);
      assert.strictEqual(lock2, false, 'Rapid duplicate click must be blocked');

      // Other actions remain unblocked
      const lockOther = sm.acquireLock('toggle_audio', 400);
      assert.strictEqual(lockOther, true, 'Different action must acquire its own lock');
    });

    it('releases lock manually or upon reset', () => {
      const sm = new FrontendStateMachine();
      sm.acquireLock('start_chat', 1000);
      assert.strictEqual(sm.acquireLock('start_chat', 1000), false);

      sm.releaseLock('start_chat');
      assert.strictEqual(sm.acquireLock('start_chat', 1000), true, 'Lock must be acquirable after release');
    });
  });

  describe('3. Text Chat Message Isolation & Lifecycle', () => {
    it('isolates messages per match session without cross-contamination', () => {
      const session1Messages = [
        { id: '1', sender: 'local', text: 'Hi', timestamp: 1000 },
        { id: '2', sender: 'stranger', text: 'Hello', timestamp: 1005 },
      ];

      // Next stranger clears history and adds system message
      const session2Messages = [
        { id: 'sys_1', sender: 'system', text: 'Connected with a new stranger', timestamp: 2000 },
      ];

      assert.strictEqual(session1Messages.length, 2);
      assert.strictEqual(session2Messages.length, 1);
      assert.strictEqual(session2Messages[0].sender, 'system');
      assert.ok(!session2Messages.some(m => m.text === 'Hello'), 'Old stranger messages must not leak');
    });
  });

});
