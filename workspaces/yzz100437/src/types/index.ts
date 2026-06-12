export type VoicePart = 'soprano' | 'alto' | 'tenor' | 'bass';

export type UserRole = 'leader' | 'conductor' | 'member';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Member {
  id: string;
  name: string;
  voicePart: VoicePart;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Piece {
  id: string;
  title: string;
  composer: string;
  difficulty: Difficulty;
}

export interface LeaveRecord {
  id: string;
  memberId: string;
  rehearsalDate: string;
  reason: string;
  proficiency: number;
  willPerform: boolean;
  notes: string;
  createdAt: string;
}

export type AlertType = 'duplicate' | 'consecutive' | 'shortage' | 'online';

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  memberId?: string;
  voicePart?: VoicePart;
  rehearsalDate?: string;
  createdAt: string;
  read: boolean;
}

export interface AppState {
  members: Member[];
  pieces: Piece[];
  leaveRecords: LeaveRecord[];
  alerts: Alert[];
  currentRole: UserRole;
  currentMemberId?: string;
}

export interface AppStore extends AppState {
  addMember: (member: Omit<Member, 'id' | 'createdAt'>) => void;
  updateMember: (id: string, data: Partial<Member>) => void;
  deleteMember: (id: string) => void;
  addLeave: (leave: Omit<LeaveRecord, 'id' | 'createdAt'>) => Alert[];
  deleteLeave: (id: string) => void;
  markAlertRead: (id: string) => void;
  clearAlerts: () => void;
  setCurrentRole: (role: UserRole) => void;
  setCurrentMember: (memberId: string) => void;
  addPiece: (piece: Omit<Piece, 'id'>) => void;
  updatePiece: (id: string, data: Partial<Piece>) => void;
  deletePiece: (id: string) => void;
  generateAlerts: () => Alert[];
}

export interface VoicePartInfo {
  key: VoicePart;
  name: string;
  color: string;
}

export interface WeeklyRollCallEntry {
  name: string;
  voicePart: string;
  [key: string]: string;
}

export interface PerformanceListEntry {
  name: string;
  voicePart: string;
  proficiency: number;
  recentAttendance: string;
  willPerform: boolean;
}

export interface PieceProficiency {
  pieceId: string;
  pieceTitle: string;
  voicePart: VoicePart;
  averageProficiency: number;
  attendanceCount: number;
  leaveCount: number;
  shortageRisk: 'low' | 'medium' | 'high';
}

export interface MemberAttendanceStats {
  memberId: string;
  name: string;
  voicePart: VoicePart;
  totalRehearsals: number;
  attendedCount: number;
  leaveCount: number;
  attendanceRate: number;
  consecutiveLeaves: number;
  needsReminder: boolean;
}
