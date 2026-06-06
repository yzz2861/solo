import { HandoverState, StateEvent } from './StateMachine';
import { HandoverStateMachine } from './HandoverStateMachine';
import { RuleEngineOutput } from '../rules';

export enum DecisionType {
  PASS = 'pass',
  REJECT = 'reject',
  REVIEW_REQUIRED = 'review_required',
}

export interface AutoDecisionResult {
  decision: DecisionType;
  targetState: HandoverState;
  reasons: string[];
  riskTags: string[];
  ruleResults: RuleEngineOutput;
}

export class StateDecisionEngine {
  private stateMachine: HandoverStateMachine;

  constructor(initialState: HandoverState = HandoverState.DRAFT) {
    this.stateMachine = new HandoverStateMachine(initialState);
  }

  evaluate(ruleOutput: RuleEngineOutput): AutoDecisionResult {
    const reasons: string[] = [];

    if (ruleOutput.shouldReject) {
      const errorResults = ruleOutput.results.filter(
        (r) => r.severity === 'error'
      );
      errorResults.forEach((r) => reasons.push(r.message));

      return {
        decision: DecisionType.REJECT,
        targetState: HandoverState.REJECTED,
        reasons,
        riskTags: ruleOutput.riskTags,
        ruleResults: ruleOutput,
      };
    }

    if (ruleOutput.requiresReview) {
      const reviewResults = ruleOutput.results.filter(
        (r) => r.severity === 'review' || r.severity === 'warning'
      );
      reviewResults.forEach((r) => reasons.push(r.message));

      return {
        decision: DecisionType.REVIEW_REQUIRED,
        targetState: HandoverState.REVIEW_REQUIRED,
        reasons,
        riskTags: ruleOutput.riskTags,
        ruleResults: ruleOutput,
      };
    }

    return {
      decision: DecisionType.PASS,
      targetState: HandoverState.PASSED,
      reasons: ['所有校验规则通过'],
      riskTags: ruleOutput.riskTags,
      ruleResults: ruleOutput,
    };
  }

  executeTransition(event: StateEvent) {
    return this.stateMachine.transition(event);
  }

  getCurrentState(): HandoverState {
    return this.stateMachine.getCurrentState();
  }

  getStateMachine(): HandoverStateMachine {
    return this.stateMachine;
  }
}
