import {
  MasterData,
  AnomalyApplicationRecord,
  SupportingMaterial,
  HistoricalData,
  TransactionRecord,
  ThresholdConfig,
  DEFAULT_THRESHOLD_CONFIG
} from '../src/models';

export function createBaseMasterData(overrides?: Partial<MasterData>): MasterData {
  const base: MasterData = {
    student: {
      studentId: 'S2024001',
      name: '张三',
      department: '计算机学院',
      grade: '2022级',
      campus: '东校区',
      dormitory: '东苑1号楼',
      usualConsumptionPattern: {
        avgDailyAmount: 50,
        avgTransactionCount: 5,
        commonLocations: ['第一食堂', '第二食堂', '超市', '图书馆'],
        commonTimeRange: {
          start: '07:00',
          end: '22:00'
        }
      }
    },
    card: {
      cardId: 'C2024001',
      studentId: 'S2024001',
      cardStatus: 'normal',
      balance: 500,
      issueDate: '2022-09-01',
      lastRechargeDate: '2024-01-15'
    }
  };

  if (overrides) {
    return {
      student: { ...base.student, ...overrides.student },
      card: { ...base.card, ...overrides.card }
    };
  }

  return base;
}

export function createBaseApplication(
  anomalyType: AnomalyApplicationRecord['anomalyType'] = 'unauthorized_consumption',
  overrides?: Partial<AnomalyApplicationRecord>
): AnomalyApplicationRecord {
  const base: AnomalyApplicationRecord = {
    applicationId: 'APP001',
    cardId: 'C2024001',
    studentId: 'S2024001',
    applyTime: '2024-01-20T10:00:00Z',
    anomalyType,
    anomalyDescription: '发现异常消费',
    involvedTransactions: ['T001', 'T002'],
    claimAmount: 300,
    applicantContact: '13800138000'
  };

  return overrides ? { ...base, ...overrides } : base;
}

export function createVerifiedMaterials(types: string[]): SupportingMaterial[] {
  return types.map((type, index) => ({
    materialId: `MAT${String(index + 1).padStart(3, '0')}`,
    applicationId: 'APP001',
    materialType: type as any,
    materialName: `材料${index + 1}`,
    uploadTime: '2024-01-20T10:00:00Z',
    uploader: 'S2024001',
    verificationStatus: 'verified' as const
  }));
}

export function createBaseHistoricalData(overrides?: {
  anomalyCount?: number;
  unresolvedCount?: number;
}): HistoricalData {
  const anomalyCount = overrides?.anomalyCount || 0;
  const unresolvedCount = overrides?.unresolvedCount || 0;

  const anomalyHistory = [];
  for (let i = 0; i < anomalyCount; i++) {
    anomalyHistory.push({
      anomalyId: `HIS${String(i + 1).padStart(3, '0')}`,
      cardId: 'C2024001',
      studentId: 'S2024001',
      anomalyType: 'abnormal_amount' as const,
      occurTime: `2023-${String(12 - i).padStart(2, '0')}-01T00:00:00Z`,
      resolutionStatus: i < unresolvedCount ? 'unresolved' as const : 'resolved' as const,
      resolutionResult: i < unresolvedCount ? undefined : '已处理',
      involvedAmount: 100 * (i + 1)
    });
  }

  return {
    statusHistory: [],
    anomalyHistory
  };
}

export function createLowRiskTransactions(): TransactionRecord[] {
  return [
    {
      transactionId: 'T001',
      cardId: 'C2024001',
      amount: 15,
      transactionTime: '2024-01-20T08:00:00Z',
      location: '第一食堂',
      merchant: '第一食堂',
      transactionType: 'consume',
      deviceId: 'DEV001'
    },
    {
      transactionId: 'T002',
      cardId: 'C2024001',
      amount: 20,
      transactionTime: '2024-01-20T12:00:00Z',
      location: '第二食堂',
      merchant: '第二食堂',
      transactionType: 'consume',
      deviceId: 'DEV002'
    }
  ];
}

export function createMediumRiskTransactions(): TransactionRecord[] {
  return [
    {
      transactionId: 'T001',
      cardId: 'C2024001',
      amount: 60,
      transactionTime: '2024-01-20T10:00:00Z',
      location: '第一食堂',
      merchant: '第一食堂',
      transactionType: 'consume',
      deviceId: 'DEV001'
    },
    {
      transactionId: 'T002',
      cardId: 'C2024001',
      amount: 65,
      transactionTime: '2024-01-20T14:00:00Z',
      location: '校外便利店',
      merchant: '校外便利店',
      transactionType: 'consume',
      deviceId: 'DEV003'
    }
  ];
}

export function createHighRiskTransactions(): TransactionRecord[] {
  return [
    {
      transactionId: 'T001',
      cardId: 'C2024001',
      amount: 800,
      transactionTime: '2024-01-20T02:00:00Z',
      location: '校外商场',
      merchant: '校外商场',
      transactionType: 'consume',
      deviceId: 'DEV999'
    },
    {
      transactionId: 'T002',
      cardId: 'C2024001',
      amount: 600,
      transactionTime: '2024-01-20T02:10:00Z',
      location: '校外商场',
      merchant: '校外商场',
      transactionType: 'consume',
      deviceId: 'DEV999'
    },
    {
      transactionId: 'T003',
      cardId: 'C2024001',
      amount: 500,
      transactionTime: '2024-01-20T02:15:00Z',
      location: '校外商场',
      merchant: '校外商场',
      transactionType: 'consume',
      deviceId: 'DEV999'
    },
    {
      transactionId: 'T004',
      cardId: 'C2024001',
      amount: 450,
      transactionTime: '2024-01-20T10:00:00Z',
      location: '西校区食堂',
      merchant: '西校区食堂',
      transactionType: 'consume',
      deviceId: 'DEV888'
    }
  ];
}

export function getDefaultThreshold(): ThresholdConfig {
  return { ...DEFAULT_THRESHOLD_CONFIG };
}
