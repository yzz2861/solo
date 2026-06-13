export interface Species {
  id: string;
  name: string;
  emoji: string;
  exhibitId: string;
  defaultFeedAmountGrams: number;
}

export interface Feed {
  id: string;
  name: string;
  unit: string;
  safetyThreshold: number;
}

export interface FeedStock {
  id: string;
  feedId: string;
  currentStock: number;
  lastUpdated: string;
}

export interface Keeper {
  id: string;
  name: string;
  phone: string;
}

export interface Guide {
  id: string;
  name: string;
  phone: string;
}

export interface Exhibit {
  id: string;
  name: string;
  description: string;
}

export interface WaterQualityNote {
  id: string;
  exhibitId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
}

export interface FastingPeriod {
  id: string;
  speciesId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export type SessionStatus = 'scheduled' | 'completed' | 'cancelled';

export interface FeedingSession {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  speciesId: string;
  feedId: string;
  feedAmountGrams: number;
  keeperId: string;
  guideId: string | null;
  exhibitId: string;
  isVisitorVisible: boolean;
  status: SessionStatus;
}

export type AlertType =
  | 'fasting'
  | 'low_stock'
  | 'keeper_conflict'
  | 'time_overlap'
  | 'guide_conflict'
  | 'visitor_overlap';

export type AlertSeverity = 'warning' | 'error';

export interface ConflictAlert {
  id: string;
  sessionId: string | null;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
}
