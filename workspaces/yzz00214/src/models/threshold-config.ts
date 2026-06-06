export interface ThresholdConfig {
  amountThreshold: AmountThreshold;
  frequencyThreshold: FrequencyThreshold;
  locationThreshold: LocationThreshold;
  timeThreshold: TimeThreshold;
  riskScoreThreshold: RiskScoreThreshold;
  materialThreshold: MaterialThreshold;
}

export interface AmountThreshold {
  singleTransactionHigh: number;
  singleTransactionMedium: number;
  dailyTotalHigh: number;
  dailyTotalMedium: number;
  deviationFromAverageHigh: number;
  deviationFromAverageMedium: number;
}

export interface FrequencyThreshold {
  dailyCountHigh: number;
  dailyCountMedium: number;
  hourlyCountHigh: number;
  shortIntervalCount: number;
  shortIntervalMinutes: number;
}

export interface LocationThreshold {
  crossCampusWithinHours: number;
  unusualLocationWeight: number;
}

export interface TimeThreshold {
  lateNightStart: string;
  lateNightEnd: string;
  unusualTimeWeight: number;
}

export interface RiskScoreThreshold {
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
}

export interface MaterialThreshold {
  minRequiredMaterials: number;
  requireVerification: boolean;
}

export const DEFAULT_THRESHOLD_CONFIG: ThresholdConfig = {
  amountThreshold: {
    singleTransactionHigh: 500,
    singleTransactionMedium: 200,
    dailyTotalHigh: 1000,
    dailyTotalMedium: 500,
    deviationFromAverageHigh: 3,
    deviationFromAverageMedium: 2
  },
  frequencyThreshold: {
    dailyCountHigh: 20,
    dailyCountMedium: 10,
    hourlyCountHigh: 5,
    shortIntervalCount: 3,
    shortIntervalMinutes: 5
  },
  locationThreshold: {
    crossCampusWithinHours: 2,
    unusualLocationWeight: 20
  },
  timeThreshold: {
    lateNightStart: '23:00',
    lateNightEnd: '06:00',
    unusualTimeWeight: 15
  },
  riskScoreThreshold: {
    highRisk: 70,
    mediumRisk: 40,
    lowRisk: 0
  },
  materialThreshold: {
    minRequiredMaterials: 2,
    requireVerification: true
  }
};
