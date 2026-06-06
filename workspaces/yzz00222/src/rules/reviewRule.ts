import { RiskLevel, ProcessAction, DispatchStatus } from '../objects/types';
import { RiskAssessmentResult } from './riskAssessmentRule';
import { MaterialCheckResult } from './materialRule';

export interface ReviewRuleResult {
  reviewRequired: boolean;
  canDirectApprove: boolean;
  reasons: string[];
  suggestedStatus: DispatchStatus;
}

export class ReviewRule {
  static evaluate(
    riskResult: RiskAssessmentResult,
    materialResult: MaterialCheckResult
  ): ReviewRuleResult {
    const reasons: string[] = [];
    let reviewRequired = false;
    let canDirectApprove = true;

    if (riskResult.riskLevel === RiskLevel.HIGH) {
      reviewRequired = true;
      canDirectApprove = false;
      reasons.push('高风险申请，必须进入复核流程，不允许直接通过');
    }

    if (riskResult.riskLevel === RiskLevel.UNDETERMINED) {
      reviewRequired = true;
      canDirectApprove = false;
      reasons.push('风险等级无法判定，必须进入复核流程，不允许直接通过');
    }

    if (!materialResult.complete) {
      reviewRequired = true;
      canDirectApprove = false;
      reasons.push('申请材料不齐全，需补充材料后进入复核');
    }

    if (riskResult.riskLevel === RiskLevel.MEDIUM && !materialResult.complete) {
      reasons.push('中风险且材料不齐全，需复核确认');
    }

    let suggestedStatus: DispatchStatus;
    if (!materialResult.complete) {
      suggestedStatus = DispatchStatus.SUPPLEMENT_REQUIRED;
    } else if (reviewRequired) {
      suggestedStatus = DispatchStatus.UNDER_REVIEW;
    } else {
      suggestedStatus = DispatchStatus.APPROVABLE;
    }

    return {
      reviewRequired,
      canDirectApprove,
      reasons,
      suggestedStatus
    };
  }

  static canPerformAction(
    currentStatus: DispatchStatus,
    action: ProcessAction,
    riskLevel: RiskLevel
  ): { allowed: boolean; reason?: string } {
    const transitions: Record<DispatchStatus, Record<ProcessAction, boolean>> = {
      [DispatchStatus.PENDING]: {
        [ProcessAction.SUBMIT]: true,
        [ProcessAction.APPROVE]: false,
        [ProcessAction.REJECT]: false,
        [ProcessAction.SUPPLEMENT]: false,
        [ProcessAction.REVIEW]: false,
        [ProcessAction.LOCK]: false,
        [ProcessAction.UNLOCK]: false
      },
      [DispatchStatus.APPROVABLE]: {
        [ProcessAction.SUBMIT]: false,
        [ProcessAction.APPROVE]: true,
        [ProcessAction.REJECT]: true,
        [ProcessAction.SUPPLEMENT]: false,
        [ProcessAction.REVIEW]: true,
        [ProcessAction.LOCK]: true,
        [ProcessAction.UNLOCK]: false
      },
      [DispatchStatus.SUPPLEMENT_REQUIRED]: {
        [ProcessAction.SUBMIT]: false,
        [ProcessAction.APPROVE]: false,
        [ProcessAction.REJECT]: true,
        [ProcessAction.SUPPLEMENT]: true,
        [ProcessAction.REVIEW]: true,
        [ProcessAction.LOCK]: true,
        [ProcessAction.UNLOCK]: false
      },
      [DispatchStatus.UNDER_REVIEW]: {
        [ProcessAction.SUBMIT]: false,
        [ProcessAction.APPROVE]: true,
        [ProcessAction.REJECT]: true,
        [ProcessAction.SUPPLEMENT]: true,
        [ProcessAction.REVIEW]: false,
        [ProcessAction.LOCK]: true,
        [ProcessAction.UNLOCK]: false
      },
      [DispatchStatus.LOCKED]: {
        [ProcessAction.SUBMIT]: false,
        [ProcessAction.APPROVE]: false,
        [ProcessAction.REJECT]: false,
        [ProcessAction.SUPPLEMENT]: false,
        [ProcessAction.REVIEW]: false,
        [ProcessAction.LOCK]: false,
        [ProcessAction.UNLOCK]: true
      },
      [DispatchStatus.FAILED]: {
        [ProcessAction.SUBMIT]: false,
        [ProcessAction.APPROVE]: false,
        [ProcessAction.REJECT]: false,
        [ProcessAction.SUPPLEMENT]: false,
        [ProcessAction.REVIEW]: false,
        [ProcessAction.LOCK]: false,
        [ProcessAction.UNLOCK]: false
      }
    };

    const allowed = transitions[currentStatus]?.[action] ?? false;

    if (!allowed) {
      return {
        allowed: false,
        reason: `当前状态${currentStatus}不允许执行${action}操作`
      };
    }

    if (action === ProcessAction.APPROVE && riskLevel === RiskLevel.HIGH) {
      return {
        allowed: false,
        reason: '高风险申请不允许直接通过，必须经复核流程'
      };
    }

    return { allowed: true };
  }
}
