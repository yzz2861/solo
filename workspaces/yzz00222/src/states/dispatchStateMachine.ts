import { DispatchStatus, ProcessAction, RiskLevel } from '../objects/types';
import { ReviewRule } from '../rules/reviewRule';

export interface StateTransition {
  from: DispatchStatus;
  to: DispatchStatus;
  action: ProcessAction;
  timestamp: string;
  operator?: string;
  remark?: string;
}

export interface StateMachineContext {
  itemId: string;
  currentStatus: DispatchStatus;
  riskLevel: RiskLevel;
  history: StateTransition[];
}

export class DispatchStateMachine {
  private context: StateMachineContext;

  constructor(
    itemId: string,
    initialStatus: DispatchStatus = DispatchStatus.PENDING,
    riskLevel: RiskLevel = RiskLevel.LOW
  ) {
    this.context = {
      itemId,
      currentStatus: initialStatus,
      riskLevel,
      history: []
    };
  }

  getCurrentStatus(): DispatchStatus {
    return this.context.currentStatus;
  }

  getHistory(): StateTransition[] {
    return [...this.context.history];
  }

  getRiskLevel(): RiskLevel {
    return this.context.riskLevel;
  }

  setRiskLevel(riskLevel: RiskLevel): void {
    this.context.riskLevel = riskLevel;
  }

  canTransition(action: ProcessAction): { allowed: boolean; reason?: string } {
    return ReviewRule.canPerformAction(
      this.context.currentStatus,
      action,
      this.context.riskLevel
    );
  }

  transition(
    action: ProcessAction,
    operator?: string,
    remark?: string
  ): { success: boolean; newStatus?: DispatchStatus; reason?: string } {
    const checkResult = this.canTransition(action);
    if (!checkResult.allowed) {
      return { success: false, reason: checkResult.reason };
    }

    const newStatus = this.getTargetStatus(action);
    const transition: StateTransition = {
      from: this.context.currentStatus,
      to: newStatus,
      action,
      timestamp: new Date().toISOString(),
      operator,
      remark
    };

    this.context.history.push(transition);
    this.context.currentStatus = newStatus;

    return { success: true, newStatus };
  }

  private getTargetStatus(action: ProcessAction): DispatchStatus {
    const statusMap: Record<DispatchStatus, Record<ProcessAction, DispatchStatus>> = {
      [DispatchStatus.PENDING]: {
        [ProcessAction.SUBMIT]: DispatchStatus.UNDER_REVIEW,
        [ProcessAction.APPROVE]: DispatchStatus.PENDING,
        [ProcessAction.REJECT]: DispatchStatus.FAILED,
        [ProcessAction.SUPPLEMENT]: DispatchStatus.PENDING,
        [ProcessAction.REVIEW]: DispatchStatus.PENDING,
        [ProcessAction.LOCK]: DispatchStatus.LOCKED,
        [ProcessAction.UNLOCK]: DispatchStatus.PENDING
      },
      [DispatchStatus.APPROVABLE]: {
        [ProcessAction.SUBMIT]: DispatchStatus.APPROVABLE,
        [ProcessAction.APPROVE]: DispatchStatus.APPROVABLE,
        [ProcessAction.REJECT]: DispatchStatus.FAILED,
        [ProcessAction.SUPPLEMENT]: DispatchStatus.SUPPLEMENT_REQUIRED,
        [ProcessAction.REVIEW]: DispatchStatus.UNDER_REVIEW,
        [ProcessAction.LOCK]: DispatchStatus.LOCKED,
        [ProcessAction.UNLOCK]: DispatchStatus.APPROVABLE
      },
      [DispatchStatus.SUPPLEMENT_REQUIRED]: {
        [ProcessAction.SUBMIT]: DispatchStatus.SUPPLEMENT_REQUIRED,
        [ProcessAction.APPROVE]: DispatchStatus.SUPPLEMENT_REQUIRED,
        [ProcessAction.REJECT]: DispatchStatus.FAILED,
        [ProcessAction.SUPPLEMENT]: DispatchStatus.UNDER_REVIEW,
        [ProcessAction.REVIEW]: DispatchStatus.UNDER_REVIEW,
        [ProcessAction.LOCK]: DispatchStatus.LOCKED,
        [ProcessAction.UNLOCK]: DispatchStatus.SUPPLEMENT_REQUIRED
      },
      [DispatchStatus.UNDER_REVIEW]: {
        [ProcessAction.SUBMIT]: DispatchStatus.UNDER_REVIEW,
        [ProcessAction.APPROVE]: DispatchStatus.APPROVABLE,
        [ProcessAction.REJECT]: DispatchStatus.FAILED,
        [ProcessAction.SUPPLEMENT]: DispatchStatus.SUPPLEMENT_REQUIRED,
        [ProcessAction.REVIEW]: DispatchStatus.UNDER_REVIEW,
        [ProcessAction.LOCK]: DispatchStatus.LOCKED,
        [ProcessAction.UNLOCK]: DispatchStatus.UNDER_REVIEW
      },
      [DispatchStatus.LOCKED]: {
        [ProcessAction.SUBMIT]: DispatchStatus.LOCKED,
        [ProcessAction.APPROVE]: DispatchStatus.LOCKED,
        [ProcessAction.REJECT]: DispatchStatus.LOCKED,
        [ProcessAction.SUPPLEMENT]: DispatchStatus.LOCKED,
        [ProcessAction.REVIEW]: DispatchStatus.LOCKED,
        [ProcessAction.LOCK]: DispatchStatus.LOCKED,
        [ProcessAction.UNLOCK]: DispatchStatus.UNDER_REVIEW
      },
      [DispatchStatus.FAILED]: {
        [ProcessAction.SUBMIT]: DispatchStatus.FAILED,
        [ProcessAction.APPROVE]: DispatchStatus.FAILED,
        [ProcessAction.REJECT]: DispatchStatus.FAILED,
        [ProcessAction.SUPPLEMENT]: DispatchStatus.FAILED,
        [ProcessAction.REVIEW]: DispatchStatus.FAILED,
        [ProcessAction.LOCK]: DispatchStatus.FAILED,
        [ProcessAction.UNLOCK]: DispatchStatus.FAILED
      }
    };

    return statusMap[this.context.currentStatus]?.[action] || this.context.currentStatus;
  }

  isFinal(): boolean {
    return (
      this.context.currentStatus === DispatchStatus.FAILED ||
      this.context.currentStatus === DispatchStatus.APPROVABLE
    );
  }

  reset(): void {
    this.context.currentStatus = DispatchStatus.PENDING;
    this.context.history = [];
  }
}
