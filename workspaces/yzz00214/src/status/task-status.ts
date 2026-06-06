export type TaskStatus =
  | 'processable'
  | 'supplement_required'
  | 'locked'
  | 'failed'
  | 'under_review'
  | 'pending';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  processable: '可办理',
  supplement_required: '需补充',
  locked: '已锁定',
  failed: '失败',
  under_review: '复核中',
  pending: '待处理'
};

export type StatusTransitionTrigger =
  | 'submit'
  | 'risk_evaluate'
  | 'material_check'
  | 'review'
  | 'lock'
  | 'unlock'
  | 'fail'
  | 'supplement'
  | 'approve'
  | 'reject';

export interface StatusTransition {
  from: TaskStatus;
  to: TaskStatus;
  trigger: StatusTransitionTrigger;
  description: string;
}

export const STATUS_TRANSITIONS: StatusTransition[] = [
  { from: 'pending', to: 'processable', trigger: 'submit', description: '提交申请，进入可办理状态' },
  { from: 'pending', to: 'supplement_required', trigger: 'material_check', description: '材料不齐，需补充' },
  { from: 'processable', to: 'under_review', trigger: 'risk_evaluate', description: '高风险需复核' },
  { from: 'processable', to: 'supplement_required', trigger: 'material_check', description: '材料不齐，需补充' },
  { from: 'processable', to: 'locked', trigger: 'lock', description: '锁定异常卡片' },
  { from: 'processable', to: 'failed', trigger: 'fail', description: '办理失败' },
  { from: 'supplement_required', to: 'processable', trigger: 'supplement', description: '补充材料后可办理' },
  { from: 'supplement_required', to: 'under_review', trigger: 'risk_evaluate', description: '补充材料后仍需复核' },
  { from: 'supplement_required', to: 'failed', trigger: 'fail', description: '逾期未补充，失败' },
  { from: 'under_review', to: 'processable', trigger: 'approve', description: '复核通过' },
  { from: 'under_review', to: 'locked', trigger: 'lock', description: '复核确认高风险，锁定' },
  { from: 'under_review', to: 'supplement_required', trigger: 'reject', description: '复核需补充材料' },
  { from: 'under_review', to: 'failed', trigger: 'fail', description: '复核不通过，失败' },
  { from: 'locked', to: 'under_review', trigger: 'unlock', description: '申请解锁，进入复核' },
  { from: 'locked', to: 'processable', trigger: 'unlock', description: '解锁成功，可办理' }
];
