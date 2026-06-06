export interface StudentMasterData {
  studentId: string;
  name: string;
  department: string;
  grade: string;
  campus: string;
  dormitory: string;
  usualConsumptionPattern: ConsumptionPattern;
}

export interface ConsumptionPattern {
  avgDailyAmount: number;
  avgTransactionCount: number;
  commonLocations: string[];
  commonTimeRange: {
    start: string;
    end: string;
  };
}

export interface CardMasterData {
  cardId: string;
  studentId: string;
  cardStatus: 'normal' | 'lost' | 'frozen' | 'cancelled';
  balance: number;
  issueDate: string;
  lastRechargeDate: string;
}

export interface MasterData {
  student: StudentMasterData;
  card: CardMasterData;
}
