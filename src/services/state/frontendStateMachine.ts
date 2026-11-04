/**
 * FrontendStateMachine
 * Centralized, deterministic finite state machine governing the Omaglee
 * video-chat lifecycle according to Phase 7 specifications.
 */

export type VideoChatState =
  | 'IDLE'
  | 'REQUESTING_MEDIA'
  | 'SEARCHING'
  | 'MATCHED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'CONNECTION_FAILED'
  | 'STOPPING'
  | 'ERROR';

const VALID_TRANSITIONS: Record<VideoChatState, readonly VideoChatState[]> = {
  IDLE: ['REQUESTING_MEDIA', 'SEARCHING', 'MATCHED', 'CONNECTING', 'CONNECTED', 'ERROR'],
  REQUESTING_MEDIA: ['SEARCHING', 'IDLE', 'ERROR'],
  SEARCHING: ['MATCHED', 'STOPPING', 'IDLE', 'ERROR'],
  MATCHED: ['CONNECTING', 'STOPPING', 'SEARCHING', 'ERROR'],
  CONNECTING: ['CONNECTED', 'RECONNECTING', 'CONNECTION_FAILED', 'STOPPING', 'SEARCHING', 'IDLE', 'ERROR'],
  CONNECTED: ['RECONNECTING', 'CONNECTION_FAILED', 'STOPPING', 'SEARCHING', 'IDLE', 'ERROR'],
  RECONNECTING: ['CONNECTED', 'CONNECTION_FAILED', 'STOPPING', 'SEARCHING', 'IDLE', 'ERROR'],
  CONNECTION_FAILED: ['RECONNECTING', 'SEARCHING', 'STOPPING', 'IDLE', 'ERROR'],
  STOPPING: ['IDLE', 'ERROR'],
  ERROR: ['IDLE', 'SEARCHING', 'REQUESTING_MEDIA'],
};

export class FrontendStateMachine {
  private currentState: VideoChatState;
  private listeners: Set<(state: VideoChatState, previousState: VideoChatState) => void>;
  private actionLocks: Map<string, number>;

  constructor(initialState: VideoChatState = 'IDLE') {
    this.currentState = initialState;
    this.listeners = new Set();
    this.actionLocks = new Map();
  }

  /**
   * Get current machine state.
   */
  getState(): VideoChatState {
    return this.currentState;
  }

  /**
   * Check whether a transition from currentState to targetState is valid.
   */
  canTransitionTo(targetState: VideoChatState): boolean {
    if (this.currentState === targetState) return true;
    const allowed = VALID_TRANSITIONS[this.currentState];
    return allowed ? allowed.includes(targetState) : false;
  }

  /**
   * Safely attempt transition to targetState. Returns true if transition succeeded.
   */
  transition(targetState: VideoChatState): boolean {
    if (this.currentState === targetState) {
      return true;
    }

    if (!this.canTransitionTo(targetState)) {
      console.warn(
        `[StateMachine] Invalid transition rejected: ${this.currentState} -> ${targetState}`
      );
      return false;
    }

    const previousState = this.currentState;
    this.currentState = targetState;

    this.listeners.forEach((listener) => {
      try {
        listener(targetState, previousState);
      } catch (err) {
        console.error('[StateMachine] Listener error:', err);
      }
    });

    return true;
  }

  /**
   * Force transition to targetState (used exclusively for fatal cleanup or error resets).
   */
  forceState(targetState: VideoChatState): void {
    const previousState = this.currentState;
    this.currentState = targetState;
    this.listeners.forEach((listener) => {
      try {
        listener(targetState, previousState);
      } catch (err) {
        console.error('[StateMachine] Listener error:', err);
      }
    });
  }

  /**
   * Register a state change listener.
   */
  subscribe(listener: (state: VideoChatState, previousState: VideoChatState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Single-flight action debounce lock to prevent duplicate clicks (e.g. rapid Next / Start / Stop).
   */
  acquireLock(actionName: string, durationMs = 800): boolean {
    const now = Date.now();
    const expiry = this.actionLocks.get(actionName);
    if (expiry && expiry > now) {
      return false; // Action currently locked
    }
    this.actionLocks.set(actionName, now + durationMs);
    return true;
  }

  releaseLock(actionName: string): void {
    this.actionLocks.delete(actionName);
  }

  reset(): void {
    this.actionLocks.clear();
    this.transition('IDLE');
  }
}

export default FrontendStateMachine;
