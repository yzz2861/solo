export interface Member {
  id: string;
  name: string;
  avatar?: string;
  sectionId: string;
  joinDate: string;
  phone?: string;
  email?: string;
  note?: string;
  isLeader: boolean;
}

export interface Section {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface SectionHistory {
  id: string;
  memberId: string;
  fromSectionId: string | null;
  toSectionId: string;
  changeDate: string;
  reason?: string;
}

export interface Sheet {
  id: string;
  title: string;
  composer?: string;
  filePath: string;
  fileValid: boolean;
  totalBars: number;
  difficulty: 'easy' | 'medium' | 'hard';
  sectionIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Practice {
  id: string;
  memberId: string;
  sheetId: string;
  practicedBars: string;
  mastery: number;
  note: string;
  teacherModified: boolean;
  lastPracticeDate: string;
}

export interface Attendance {
  id: string;
  date: string;
  memberId: string;
  status: 'present' | 'absent' | 'late' | 'leave';
  reason?: string;
  note?: string;
}

export interface Performance {
  id: string;
  name: string;
  date: string;
  location?: string;
  description?: string;
  songIds: string[];
  requiredMastery: number;
}

export interface PerformanceConfirm {
  id: string;
  performanceId: string;
  memberId: string;
  confirmed: boolean;
  confirmedAt?: string;
}

export type ViewMode = 'leader' | 'member';

export interface AppState {
  viewMode: ViewMode;
  currentMemberId: string | null;
  sidebarCollapsed: boolean;
}
