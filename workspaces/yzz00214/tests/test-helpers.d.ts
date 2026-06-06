import { MasterData, AnomalyApplicationRecord, SupportingMaterial, HistoricalData, TransactionRecord, ThresholdConfig } from '../src/models';
export declare function createBaseMasterData(overrides?: Partial<MasterData>): MasterData;
export declare function createBaseApplication(anomalyType?: AnomalyApplicationRecord['anomalyType'], overrides?: Partial<AnomalyApplicationRecord>): AnomalyApplicationRecord;
export declare function createVerifiedMaterials(types: string[]): SupportingMaterial[];
export declare function createBaseHistoricalData(overrides?: {
    anomalyCount?: number;
    unresolvedCount?: number;
}): HistoricalData;
export declare function createLowRiskTransactions(): TransactionRecord[];
export declare function createMediumRiskTransactions(): TransactionRecord[];
export declare function createHighRiskTransactions(): TransactionRecord[];
export declare function getDefaultThreshold(): ThresholdConfig;
