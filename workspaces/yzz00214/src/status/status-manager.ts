import {
  TaskStatus,
  StatusTransitionTrigger,
  STATUS_TRANSITIONS,
  TASK_STATUS_LABELS
} from './task-status';
import { RiskLevel } from '../rules';

export interface StateTransitionResult {
  success: boolean;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  trigger: StatusTransitionTrigger;
  reason: string;
}

export interface StatusDeterminationInput {
  riskLevel: RiskLevel;
  materialComplete: boolean;
  hasCriticalMissing: boolean;
  isCardLocked: boolean;
  currentStatus?: TaskStatus;
}

export interface StatusDeterminationResult {
  targetStatus: TaskStatus;
  statusLabel: string;
  statusReason: string;
  requireReview: boolean;
  reviewReason?: string;
  canDirectApprove: boolean;
}

export class StatusManager {
  private currentStatus: TaskStatus = 'pending';

  constructor(initialStatus: TaskStatus = 'pending') {
    this.currentStatus = initialStatus;
  }

  getCurrentStatus(): TaskStatus {
    return this.currentStatus;
  }

  getCurrentStatusLabel(): string {
    return TASK_STATUS_LABELS[this.currentStatus];
  }

  canTransition(trigger: StatusTransitionTrigger): boolean {
    return STATUS_TRANSITIONS.some(
      t => t.from === this.currentStatus && t.trigger === trigger
    );
  }

  transition(trigger: StatusTransitionTrigger, reason?: string): StateTransitionResult {
    const transition = STATUS_TRANSITIONS.find(
      t => t.from === this.currentStatus && t.trigger === trigger
    );

    if (!transition) {
      return {
        success: false,
        fromStatus: this.currentStatus,
        toStatus: this.currentStatus,
        trigger,
        reason: `无法从${TASK_STATUS_LABELS[this.currentStatus]}状态通过${trigger}触发转换`
      };
    }

    const fromStatus = this.currentStatus;
    this.currentStatus = transition.to;

    return {
      success: true,
      fromStatus,
      toStatus: transition.to,
      trigger,
      reason: reason || transition.description
    };
  }

  determineStatus(input: StatusDeterminationInput): StatusDeterminationResult {
    const {
      riskLevel,
      materialComplete,
      hasCriticalMissing,
      isCardLocked
    } = input;

    if (isCardLocked) {
      return {
        targetStatus: 'locked',
        statusLabel: TASK_STATUS_LABELS['locked'],
        statusReason: '卡片已锁定，需先解锁',
        requireReview: true,
        reviewReason: '卡片处于锁定状态，需复核解锁',
        canDirectApprove: false
      };
    }

    const materialIncomplete = !materialComplete || hasCriticalMissing;

    if (materialIncomplete) {
      const reasons: string[] = [];
      if (hasCriticalMissing) {
        reasons.push('缺少必备佐证材料');
      } else if (!materialComplete) {
        reasons.push('佐证材料不完整');
      }

      return {
        targetStatus: 'under_review',
        statusLabel: TASK_STATUS_LABELS['under_review'],
        statusReason: `${reasons.join('，')}，需人工复核`,
        requireReview: true,
        reviewReason: '材料不完整或缺材料，不允许直接通过，需人工复核确认',
        canDirectApprove: false
      };
    }

    if (riskLevel === 'high') {
      return {
        targetStatus: 'under_review',
        statusLabel: TASK_STATUS_LABELS['under_review'],
        statusReason: '高风险异常，需人工复核',
        requireReview: true,
        reviewReason: '风险等级为高风险，不允许直接通过，必须人工复核',
        canDirectApprove: false
      };
    }

    if (riskLevel === 'medium') {
      return {
        targetStatus: 'under_review',
        statusLabel: TASK_STATUS_LABELS['under_review'],
        statusReason: '中风险异常，建议人工复核',
        requireReview: true,
        reviewReason: '风险等级为中风险，需复核确认',
        canDirectApprove: false
      };
    }

    if (riskLevel === 'low') {
      return {
        targetStatus: 'processable',
        statusLabel: TASK_STATUS_LABELS['processable'],
        statusReason: '低风险且材料齐全，可直接办理',
        requireReview: false,
        canDirectApprove: true
      };
    }

    return {
      targetStatus: 'failed',
      statusLabel: TASK_STATUS_LABELS['failed'],
      statusReason: '无法判定风险等级',
      requireReview: true,
      reviewReason: '风险等级无法判定，需人工介入',
      canDirectApprove: false
    };
  }
}
