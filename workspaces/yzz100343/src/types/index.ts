export type HazardStatus =
  | 'PENDING_RECTIFICATION'
  | 'PENDING_REVIEW'
  | 'CLOSED'
  | 'REJECTED';

export type UserRole =
  | 'SAFETY_OFFICER'
  | 'ELECTRICIAN'
  | 'PROJECT_MANAGER'
  | 'SAFETY_INSPECTOR';

export type Team = 'A班' | 'B班' | 'C班' | 'D班';

export interface Rectification {
  id: string;
  hazardId: string;
  description: string;
  photoUrl?: string;
  submittedAt: string;
  submittedBy: UserRole;
}

export interface Review {
  id: string;
  hazardId: string;
  passed: boolean;
  comment: string;
  reviewedAt: string;
  reviewedBy: UserRole;
}

export interface Hazard {
  id: string;
  boxNumber: string;
  location: string;
  description: string;
  photoUrl?: string;
  team: Team;
  deadline: string;
  status: HazardStatus;
  rejectCount: number;
  isOverdue: boolean;
  createdAt: string;
  createdBy: UserRole;
  rectifications: Rectification[];
  reviews: Review[];
}

export interface HazardFilters {
  status?: HazardStatus | 'ALL';
  team?: Team | 'ALL';
  onlyOverdue?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export const STATUS_LABELS: Record<HazardStatus, string> = {
  PENDING_RECTIFICATION: '待整改',
  PENDING_REVIEW: '待复查',
  CLOSED: '已关闭',
  REJECTED: '已打回',
};

export const STATUS_COLORS: Record<HazardStatus, string> = {
  PENDING_RECTIFICATION: 'pending-blue',
  PENDING_REVIEW: 'warning-yellow',
  CLOSED: 'success-green',
  REJECTED: 'danger-red',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  SAFETY_OFFICER: '安全员',
  ELECTRICIAN: '电工',
  PROJECT_MANAGER: '项目经理',
  SAFETY_INSPECTOR: '安监人员',
};

export const TEAMS: Team[] = ['A班', 'B班', 'C班', 'D班'];

export const ALL_STATUSES: HazardStatus[] = [
  'PENDING_RECTIFICATION',
  'PENDING_REVIEW',
  'CLOSED',
  'REJECTED',
];
