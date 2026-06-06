import {
  Drug,
  DrugCategory,
  DrugUnit,
  HandoverApplication,
  ApplicationType,
  ApplicationItem,
  SupportingMaterial,
  MaterialType,
  MaterialStatus,
  ApplicationHistory,
  HistoricalStatusType,
  ThresholdConfig,
  DrugCategory as Cat,
} from '../../src/domain';

export function createMockDrug(overrides: Partial<Drug> = {}): Drug {
  return {
    id: 'drug-001',
    code: 'MZ001',
    name: '吗啡注射液',
    genericName: '盐酸吗啡',
    category: DrugCategory.NARCOTIC,
    specification: '10mg/1ml',
    unit: DrugUnit.AMPOULE,
    dosagePerUnit: 10,
    isHighRisk: false,
    controlledLevel: 2,
    ...overrides,
  };
}

export function createMockHighRiskDrug(overrides: Partial<Drug> = {}): Drug {
  return createMockDrug({
    id: 'drug-high-001',
    code: 'MZ002',
    name: '芬太尼注射液',
    genericName: '枸橼酸芬太尼',
    isHighRisk: true,
    controlledLevel: 3,
    ...overrides,
  });
}

export function createMockApplicationItem(overrides: Partial<ApplicationItem> = {}): ApplicationItem {
  return {
    id: 'item-001',
    drug: createMockDrug(),
    batchNumber: 'B20250101',
    productionDate: '2025-01-01',
    expiryDate: '2027-01-01',
    quantity: 10,
    unitPrice: 25.5,
    remainingQuantity: 6,
    usedQuantity: 4,
    ...overrides,
  };
}

export function createMockHighRiskItem(overrides: Partial<ApplicationItem> = {}): ApplicationItem {
  return createMockApplicationItem({
    id: 'item-high-001',
    drug: createMockHighRiskDrug(),
    batchNumber: 'B20250201',
    quantity: 5,
    unitPrice: 120,
    remainingQuantity: 2,
    usedQuantity: 3,
    ...overrides,
  });
}

export function createMockApplication(
  items: ApplicationItem[],
  overrides: Partial<HandoverApplication> = {}
): HandoverApplication {
  return {
    id: 'app-001',
    applicationNo: 'YYJJ-20250606-001',
    type: ApplicationType.SHIFT_HANDOVER,
    applicantId: 'user-001',
    applicantName: '张医生',
    fromDepartment: '麻醉科',
    toDepartment: '手术室',
    fromWard: '手术一室',
    toWard: 'ICU',
    items,
    submitTime: new Date().toISOString(),
    remark: '白班交接',
    ...overrides,
  };
}

export function createMockMaterial(overrides: Partial<SupportingMaterial> = {}): SupportingMaterial {
  return {
    id: 'mat-001',
    type: MaterialType.PRESCRIPTION,
    name: '麻醉处方单',
    url: '/files/prescription-001.pdf',
    uploadTime: new Date().toISOString(),
    uploaderId: 'user-001',
    status: MaterialStatus.UPLOADED,
    ...overrides,
  };
}

export function createMockHistory(
  overrides: Partial<ApplicationHistory> = {}
): ApplicationHistory {
  return {
    applicationId: 'app-001',
    records: [
      {
        id: 'hist-001',
        applicationId: 'app-001',
        status: HistoricalStatusType.SUBMITTED,
        operatorId: 'user-001',
        operatorName: '张医生',
        operateTime: new Date(Date.now() - 3600000).toISOString(),
        remark: '首次提交',
      },
    ],
    currentStatus: HistoricalStatusType.SUBMITTED,
    reviewCount: 0,
    rejectCount: 0,
    hasHighRiskHistory: false,
    ...overrides,
  };
}

export function createMockThresholdConfig(
  overrides: Partial<ThresholdConfig> = {}
): ThresholdConfig {
  return {
    id: 'threshold-001',
    name: '麻醉药品交接阈值配置',
    version: 'v1.0',
    effectiveTime: '2025-01-01T00:00:00Z',
    categoryThresholds: [
      {
        category: Cat.NARCOTIC,
        maxQuantityPerHandover: 50,
        maxValuePerHandover: 5000,
        maxItemsPerHandover: 5,
      },
      {
        category: Cat.PSYCHOTROPIC_FIRST,
        maxQuantityPerHandover: 30,
        maxValuePerHandover: 3000,
        maxItemsPerHandover: 3,
      },
      {
        category: Cat.PSYCHOTROPIC_SECOND,
        maxQuantityPerHandover: 100,
        maxValuePerHandover: 2000,
        maxItemsPerHandover: 10,
      },
    ],
    generalThreshold: {
      maxTotalQuantity: 100,
      maxTotalValue: 10000,
      maxItemCount: 10,
    },
    highRisk: {
      enableHighRiskReview: true,
      highRiskCategories: [Cat.NARCOTIC, Cat.PSYCHOTROPIC_FIRST],
      highRiskDrugCodes: ['MZ002'],
    },
    material: {
      requiredMaterialTypes: [MaterialType.PRESCRIPTION, MaterialType.USAGE_LOG],
      requireItemLevelMaterials: false,
      minMaterialCount: 2,
    },
    history: {
      maxReviewTimes: 3,
      maxRejectTimes: 2,
      reviewWindowDays: 30,
      enableHistoryCheck: true,
    },
    quantityDeviation: {
      maxDeviationRatio: 0.3,
      enableDeviationCheck: false,
    },
    ...overrides,
  };
}

export function createCompliantScenario() {
  const item1 = createMockApplicationItem({
    id: 'item-1',
    quantity: 10,
    unitPrice: 25,
    remainingQuantity: 6,
    usedQuantity: 4,
  });
  const item2 = createMockApplicationItem({
    id: 'item-2',
    drug: createMockDrug({
      id: 'drug-002',
      code: 'MZ003',
      name: '哌替啶注射液',
      category: DrugCategory.NARCOTIC,
    }),
    batchNumber: 'B20250301',
    quantity: 8,
    unitPrice: 15,
    remainingQuantity: 5,
    usedQuantity: 3,
  });

  const application = createMockApplication([item1, item2], {
    id: 'app-compliant-001',
    applicationNo: 'YYJJ-20250606-001',
  });

  const materials = [
    createMockMaterial({ id: 'mat-1', type: MaterialType.PRESCRIPTION, name: '麻醉处方单' }),
    createMockMaterial({ id: 'mat-2', type: MaterialType.USAGE_LOG, name: '使用登记本' }),
  ];

  const history = createMockHistory({ applicationId: 'app-compliant-001' });
  history.records[0].applicationId = 'app-compliant-001';
  const thresholdConfig = createMockThresholdConfig();

  return { application, materials, history, thresholdConfig };
}

export function createOverThresholdScenario() {
  const items: ApplicationItem[] = [];
  for (let i = 0; i < 12; i++) {
    items.push(
      createMockApplicationItem({
        id: `item-${i + 1}`,
        drug: createMockDrug({
          id: `drug-${i + 1}`,
          code: `MZ${String(i + 10).padStart(3, '0')}`,
          name: `药品${i + 1}`,
        }),
        quantity: 15,
        unitPrice: 100,
        remainingQuantity: 8,
        usedQuantity: 7,
      })
    );
  }

  const application = createMockApplication(items, {
    id: 'app-over-threshold-001',
    applicationNo: 'YYJJ-20250606-002',
  });

  const materials = [
    createMockMaterial({ id: 'mat-1', type: MaterialType.PRESCRIPTION }),
    createMockMaterial({ id: 'mat-2', type: MaterialType.USAGE_LOG }),
  ];

  const history = createMockHistory({ applicationId: 'app-over-threshold-001' });
  history.records[0].applicationId = 'app-over-threshold-001';
  const thresholdConfig = createMockThresholdConfig();

  return { application, materials, history, thresholdConfig };
}

export function createMaterialMissingScenario() {
  const item1 = createMockApplicationItem({ id: 'item-1' });
  const application = createMockApplication([item1], {
    id: 'app-mat-missing-001',
    applicationNo: 'YYJJ-20250606-003',
  });

  const materials = [
    createMockMaterial({ id: 'mat-1', type: MaterialType.OTHER, name: '其他材料' }),
  ];

  const history = createMockHistory({ applicationId: 'app-mat-missing-001' });
  history.records[0].applicationId = 'app-mat-missing-001';
  const thresholdConfig = createMockThresholdConfig();

  return { application, materials, history, thresholdConfig };
}

export function createHighRiskScenario() {
  const highRiskItem = createMockHighRiskItem({ id: 'item-high-1' });
  const normalItem = createMockApplicationItem({ id: 'item-normal-1' });

  const application = createMockApplication([highRiskItem, normalItem], {
    id: 'app-high-risk-001',
    applicationNo: 'YYJJ-20250606-004',
  });

  const materials = [
    createMockMaterial({ id: 'mat-1', type: MaterialType.PRESCRIPTION }),
    createMockMaterial({ id: 'mat-2', type: MaterialType.USAGE_LOG }),
  ];

  const history = createMockHistory({ applicationId: 'app-high-risk-001' });
  history.records[0].applicationId = 'app-high-risk-001';
  const thresholdConfig = createMockThresholdConfig();

  return { application, materials, history, thresholdConfig };
}

export function createHistoryReplayScenario() {
  const item1 = createMockApplicationItem({ id: 'item-1' });
  const application = createMockApplication([item1], {
    id: 'app-history-001',
    applicationNo: 'YYJJ-20250606-005',
  });

  const materials = [
    createMockMaterial({ id: 'mat-1', type: MaterialType.PRESCRIPTION }),
    createMockMaterial({ id: 'mat-2', type: MaterialType.USAGE_LOG }),
  ];

  const history: ApplicationHistory = {
    applicationId: 'app-history-001',
    records: [
      {
        id: 'hist-1',
        applicationId: 'app-history-001',
        status: HistoricalStatusType.SUBMITTED,
        operatorId: 'user-001',
        operatorName: '张医生',
        operateTime: '2025-06-01T09:00:00Z',
        remark: '首次提交',
      },
      {
        id: 'hist-2',
        applicationId: 'app-history-001',
        status: HistoricalStatusType.REVIEW_REQUIRED,
        operatorId: 'user-002',
        operatorName: '李药师',
        operateTime: '2025-06-01T10:00:00Z',
        remark: '材料不全，需复核',
        riskTags: ['材料缺失'],
      },
      {
        id: 'hist-3',
        applicationId: 'app-history-001',
        status: HistoricalStatusType.REJECTED,
        operatorId: 'user-003',
        operatorName: '王主任',
        operateTime: '2025-06-02T09:00:00Z',
        remark: '数量不符，驳回',
        riskTags: ['超量'],
      },
    ],
    currentStatus: HistoricalStatusType.REJECTED,
    reviewCount: 1,
    rejectCount: 1,
    hasHighRiskHistory: true,
  };

  const thresholdConfig = createMockThresholdConfig();

  return { application, materials, history, thresholdConfig };
}

export function createQuantityInconsistentScenario() {
  const badItem = createMockApplicationItem({
    id: 'item-bad',
    quantity: 10,
    remainingQuantity: 5,
    usedQuantity: 3,
  });
  const goodItem = createMockApplicationItem({
    id: 'item-good',
    quantity: 20,
    remainingQuantity: 12,
    usedQuantity: 8,
  });

  const application = createMockApplication([badItem, goodItem], {
    id: 'app-quantity-bad-001',
    applicationNo: 'YYJJ-20250606-006',
  });

  const materials = [
    createMockMaterial({ id: 'mat-1', type: MaterialType.PRESCRIPTION }),
    createMockMaterial({ id: 'mat-2', type: MaterialType.USAGE_LOG }),
  ];

  const history = createMockHistory({ applicationId: 'app-quantity-bad-001' });
  history.records[0].applicationId = 'app-quantity-bad-001';
  const thresholdConfig = createMockThresholdConfig();

  return { application, materials, history, thresholdConfig };
}
