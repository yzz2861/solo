export enum HandoverState {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  REVIEW_REQUIRED = 'review_required',
  REVIEWING = 'reviewing',
  PASSED = 'passed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum StateEvent {
  SUBMIT = 'submit',
  REVIEW = 'review',
  APPROVE = 'approve',
  REJECT = 'reject',
  REVIEW_APPROVE = 'review_approve',
  REVIEW_REJECT = 'review_reject',
  CANCEL = 'cancel',
  RESUBMIT = 'resubmit',
}

export interface StateTransition {
  from: HandoverState;
  event: StateEvent;
  to: HandoverState;
  description: string;
}

export const STATE_TRANSITIONS: StateTransition[] = [
  { from: HandoverState.DRAFT, event: StateEvent.SUBMIT, to: HandoverState.SUBMITTED, description: '提交申请' },
  { from: HandoverState.SUBMITTED, event: StateEvent.REVIEW, to: HandoverState.REVIEW_REQUIRED, description: '转入复核' },
  { from: HandoverState.SUBMITTED, event: StateEvent.APPROVE, to: HandoverState.PASSED, description: '审核通过' },
  { from: HandoverState.SUBMITTED, event: StateEvent.REJECT, to: HandoverState.REJECTED, description: '审核驳回' },
  { from: HandoverState.REVIEW_REQUIRED, event: StateEvent.REVIEW, to: HandoverState.REVIEWING, description: '开始复核' },
  { from: HandoverState.REVIEWING, event: StateEvent.REVIEW_APPROVE, to: HandoverState.PASSED, description: '复核通过' },
  { from: HandoverState.REVIEWING, event: StateEvent.REVIEW_REJECT, to: HandoverState.REJECTED, description: '复核驳回' },
  { from: HandoverState.REVIEW_REQUIRED, event: StateEvent.RESUBMIT, to: HandoverState.SUBMITTED, description: '重新提交' },
  { from: HandoverState.REJECTED, event: StateEvent.RESUBMIT, to: HandoverState.SUBMITTED, description: '重新提交' },
  { from: HandoverState.DRAFT, event: StateEvent.CANCEL, to: HandoverState.CANCELLED, description: '取消申请' },
  { from: HandoverState.SUBMITTED, event: StateEvent.CANCEL, to: HandoverState.CANCELLED, description: '取消申请' },
  { from: HandoverState.REVIEW_REQUIRED, event: StateEvent.CANCEL, to: HandoverState.CANCELLED, description: '取消申请' },
];

export interface StateMachineResult {
  success: boolean;
  currentState: HandoverState;
  previousState: HandoverState;
  event: StateEvent;
  message: string;
}

export interface IStateMachine {
  getCurrentState(): HandoverState;
  canTransition(event: StateEvent): boolean;
  transition(event: StateEvent): StateMachineResult;
  getAvailableTransitions(): StateTransition[];
}
