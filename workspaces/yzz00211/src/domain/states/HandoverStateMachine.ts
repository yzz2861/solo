import {
  HandoverState,
  StateEvent,
  StateTransition,
  StateMachineResult,
  IStateMachine,
  STATE_TRANSITIONS,
} from './StateMachine';

export class HandoverStateMachine implements IStateMachine {
  private currentState: HandoverState;

  constructor(initialState: HandoverState = HandoverState.DRAFT) {
    this.currentState = initialState;
  }

  getCurrentState(): HandoverState {
    return this.currentState;
  }

  canTransition(event: StateEvent): boolean {
    return STATE_TRANSITIONS.some(
      (t) => t.from === this.currentState && t.event === event
    );
  }

  transition(event: StateEvent): StateMachineResult {
    const previousState = this.currentState;
    const transition = STATE_TRANSITIONS.find(
      (t) => t.from === this.currentState && t.event === event
    );

    if (!transition) {
      return {
        success: false,
        currentState: this.currentState,
        previousState,
        event,
        message: `无法从${this.currentState}状态执行${event}操作`,
      };
    }

    this.currentState = transition.to;

    return {
      success: true,
      currentState: this.currentState,
      previousState,
      event,
      message: transition.description,
    };
  }

  getAvailableTransitions(): StateTransition[] {
    return STATE_TRANSITIONS.filter((t) => t.from === this.currentState);
  }

  reset(state: HandoverState): void {
    this.currentState = state;
  }
}
