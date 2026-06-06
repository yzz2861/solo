"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const anomaly_card_api_1 = require("../src/api/anomaly-card-api");
const test_helpers_1 = require("./test-helpers");
describe('校园一卡通异常消费API - 四层架构测试', () => {
    let api;
    beforeEach(() => {
        api = new anomaly_card_api_1.AnomalyCardApi((0, test_helpers_1.getDefaultThreshold)());
    });
    describe('低风险场景测试', () => {
        it('低风险且材料齐全应输出"可办理"状态', () => {
            const masterData = (0, test_helpers_1.createBaseMasterData)();
            const application = (0, test_helpers_1.createBaseApplication)('unauthorized_consumption');
            const materials = (0, test_helpers_1.createVerifiedMaterials)(['consumption_proof', 'identity_proof']);
            const historicalData = (0, test_helpers_1.createBaseHistoricalData)({ anomalyCount: 0 });
            const transactions = (0, test_helpers_1.createLowRiskTransactions)();
            const input = {
                masterData,
                application,
                materials,
                historicalData,
                transactions,
                thresholdConfig: (0, test_helpers_1.getDefaultThreshold)()
            };
            const result = api.processApplication(input);
            expect(result.taskStatus).toBe('processable');
            expect(result.taskStatusLabel).toBe('可办理');
            expect(result.riskLevel).toBe('low');
            expect(result.canHandle).toBe(true);
            expect(result.needSupplement).toBe(false);
            expect(result.needReview).toBe(false);
            expect(result.materialStatus.complete).toBe(true);
        });
        it('低风险计算口径验证：金额、频次、地点、时间均正常', () => {
            const masterData = (0, test_helpers_1.createBaseMasterData)();
            const application = (0, test_helpers_1.createBaseApplication)('unauthorized_consumption');
            const materials = (0, test_helpers_1.createVerifiedMaterials)(['consumption_proof', 'identity_proof']);
            const historicalData = (0, test_helpers_1.createBaseHistoricalData)({ anomalyCount: 0 });
            const transactions = (0, test_helpers_1.createLowRiskTransactions)();
            const input = {
                masterData,
                application,
                materials,
                historicalData,
                transactions,
                thresholdConfig: (0, test_helpers_1.getDefaultThreshold)()
            };
            const result = api.processApplication(input);
            const breakdown = result.calculationBasis.breakdown;
            const amountRule = breakdown.find(r => r.ruleType === 'amount');
            expect(amountRule).toBeDefined();
            expect(amountRule.score).toBe(0);
            expect(amountRule.triggered).toBe(false);
            const frequencyRule = breakdown.find(r => r.ruleType === 'frequency');
            expect(frequencyRule).toBeDefined();
            expect(frequencyRule.score).toBe(0);
            expect(frequencyRule.triggered).toBe(false);
            const locationRule = breakdown.find(r => r.ruleType === 'location');
            expect(locationRule).toBeDefined();
            expect(locationRule.triggered).toBe(false);
            const timeRule = breakdown.find(r => r.ruleType === 'time');
            expect(timeRule).toBeDefined();
            expect(timeRule.triggered).toBe(false);
        });
    });
    describe('中风险场景测试', () => {
        it('中风险应输出"需补充"或"复核中"状态，不允许直接通过', () => {
            const masterData = (0, test_helpers_1.createBaseMasterData)();
            const application = (0, test_helpers_1.createBaseApplication)('unauthorized_consumption');
            const materials = (0, test_helpers_1.createVerifiedMaterials)(['consumption_proof', 'identity_proof']);
            const historicalData = (0, test_helpers_1.createBaseHistoricalData)({ anomalyCount: 2, unresolvedCount: 1 });
            const transactions = (0, test_helpers_1.createMediumRiskTransactions)();
            const input = {
                masterData,
                application,
                materials,
                historicalData,
                transactions,
                thresholdConfig: (0, test_helpers_1.getDefaultThreshold)()
            };
            const result = api.processApplication(input);
            expect(result.riskLevel).toBe('medium');
            expect(result.canHandle).toBe(false);
            expect(result.needReview).toBe(true);
            expect(result.taskStatus).toBe('under_review');
            expect(result.taskStatusLabel).toBe('复核中');
            expect(result.reviewReason).toBeDefined();
        });
        it('中风险异常解释应包含具体异常说明', () => {
            const masterData = (0, test_helpers_1.createBaseMasterData)();
            const application = (0, test_helpers_1.createBaseApplication)('unauthorized_consumption');
            const materials = (0, test_helpers_1.createVerifiedMaterials)(['consumption_proof', 'identity_proof']);
            const historicalData = (0, test_helpers_1.createBaseHistoricalData)({ anomalyCount: 0 });
            const transactions = (0, test_helpers_1.createMediumRiskTransactions)();
            const input = {
                masterData,
                application,
                materials,
                historicalData,
                transactions,
                thresholdConfig: (0, test_helpers_1.getDefaultThreshold)()
            };
            const result = api.processApplication(input);
            expect(result.anomalyExplanation).toBeTruthy();
            expect(result.anomalyExplanation.length).toBeGreaterThan(0);
            expect(result.statusReason).toBeTruthy();
        });
        it('中风险但材料不齐应输出"需补充"状态', () => {
            const masterData = (0, test_helpers_1.createBaseMasterData)();
            const application = (0, test_helpers_1.createBaseApplication)('stolen_card');
            const materials = (0, test_helpers_1.createVerifiedMaterials)(['police_report']);
            const historicalData = (0, test_helpers_1.createBaseHistoricalData)({ anomalyCount: 0 });
            const transactions = (0, test_helpers_1.createMediumRiskTransactions)();
            const input = {
                masterData,
                application,
                materials,
                historicalData,
                transactions,
                thresholdConfig: (0, test_helpers_1.getDefaultThreshold)()
            };
            const result = api.processApplication(input);
            expect(result.taskStatus).toBe('supplement_required');
            expect(result.taskStatusLabel).toBe('需补充');
            expect(result.needSupplement).toBe(true);
            expect(result.materialStatus.complete).toBe(false);
            expect(result.materialStatus.missingTypes.length).toBeGreaterThan(0);
        });
    });
    describe('高风险场景测试', () => {
        it('高风险应输出"复核中"状态，必须人工复核，不允许直接通过', () => {
            const masterData = (0, test_helpers_1.createBaseMasterData)();
            const application = (0, test_helpers_1.createBaseApplication)('stolen_card');
            const materials = (0, test_helpers_1.createVerifiedMaterials)(['police_report', 'identity_proof']);
            const historicalData = (0, test_helpers_1.createBaseHistoricalData)({ anomalyCount: 0 });
            const transactions = (0, test_helpers_1.createHighRiskTransactions)();
            const input = {
                masterData,
                application,
                materials,
                historicalData,
                transactions,
                thresholdConfig: (0, test_helpers_1.getDefaultThreshold)()
            };
            const result = api.processApplication(input);
            expect(result.riskLevel).toBe('high');
            expect(result.taskStatus).toBe('under_review');
            expect(result.taskStatusLabel).toBe('复核中');
            expect(result.canHandle).toBe(false);
            expect(result.needReview).toBe(true);
            expect(result.reviewReason).toContain('高风险');
        });
        it('高风险计算口径验证：多个规则触发，总分超过高风险阈值', () => {
            const masterData = (0, test_helpers_1.createBaseMasterData)();
            const application = (0, test_helpers_1.createBaseApplication)('stolen_card');
            const materials = (0, test_helpers_1.createVerifiedMaterials)(['police_report', 'identity_proof']);
            const historicalData = (0, test_helpers_1.createBaseHistoricalData)({ anomalyCount: 0 });
            const transactions = (0, test_helpers_1.createHighRiskTransactions)();
            const input = {
                masterData,
                application,
                materials,
                historicalData,
                transactions,
                thresholdConfig: (0, test_helpers_1.getDefaultThreshold)()
            };
            const result = api.processApplication(input);
            expect(result.totalRiskScore).toBeGreaterThanOrEqual(70);
            expect(result.calculationBasis.totalScore).toBe(result.totalRiskScore);
            const breakdown = result.calculationBasis.breakdown;
            const triggeredRules = breakdown.filter(r => r.triggered);
            expect(triggeredRules.length).toBeGreaterThanOrEqual(2);
            const sumOfScores = breakdown.reduce((sum, r) => sum + r.score, 0);
            expect(sumOfScores).toBe(result.totalRiskScore);
        });
        it('高风险异常解释应详细说明异常项', () => {
            const masterData = (0, test_helpers_1.createBaseMasterData)();
            const application = (0, test_helpers_1.createBaseApplication)('stolen_card');
            const materials = (0, test_helpers_1.createVerifiedMaterials)(['police_report', 'identity_proof']);
            const historicalData = (0, test_helpers_1.createBaseHistoricalData)({ anomalyCount: 0 });
            const transactions = (0, test_helpers_1.createHighRiskTransactions)();
            const input = {
                masterData,
                application,
                materials,
                historicalData,
                transactions,
                thresholdConfig: (0, test_helpers_1.getDefaultThreshold)()
            };
            const result = api.processApplication(input);
            expect(result.anomalyExplanation).toContain('金额');
            expect(result.statusReason).toContain('高风险');
            expect(result.statusReason).toContain('人工复核');
        });
    });
    describe('无法判定/失败场景测试', () => {
        it('卡片已挂失/冻结应输出"已锁定"状态', () => {
            const masterData = (0, test_helpers_1.createBaseMasterData)({
                card: {
                    cardId: 'C2024001',
                    studentId: 'S2024001',
                    cardStatus: 'lost',
                    balance: 500,
                    issueDate: '2022-09-01',
                    lastRechargeDate: '2024-01-15'
                }
            });
            const application = (0, test_helpers_1.createBaseApplication)('lost_card');
            const materials = (0, test_helpers_1.createVerifiedMaterials)(['loss_report', 'identity_proof']);
            const historicalData = (0, test_helpers_1.createBaseHistoricalData)({ anomalyCount: 0 });
            const transactions = (0, test_helpers_1.createLowRiskTransactions)();
            const input = {
                masterData,
                application,
                materials,
                historicalData,
                transactions,
                thresholdConfig: (0, test_helpers_1.getDefaultThreshold)()
            };
            const result = api.processApplication(input);
            expect(result.taskStatus).toBe('locked');
            expect(result.taskStatusLabel).toBe('已锁定');
            expect(result.isLocked).toBe(true);
            expect(result.needReview).toBe(true);
        });
        it('缺少关键材料应输出"需补充"状态，并有失败解释', () => {
            const masterData = (0, test_helpers_1.createBaseMasterData)();
            const application = (0, test_helpers_1.createBaseApplication)('stolen_card');
            const materials = (0, test_helpers_1.createVerifiedMaterials)(['screenshot']);
            const historicalData = (0, test_helpers_1.createBaseHistoricalData)({ anomalyCount: 0 });
            const transactions = (0, test_helpers_1.createLowRiskTransactions)();
            const input = {
                masterData,
                application,
                materials,
                historicalData,
                transactions,
                thresholdConfig: (0, test_helpers_1.getDefaultThreshold)()
            };
            const result = api.processApplication(input);
            expect(result.taskStatus).toBe('supplement_required');
            expect(result.needSupplement).toBe(true);
            expect(result.materialStatus.missingTypes).toContain('police_report');
            expect(result.materialStatus.missingTypes).toContain('identity_proof');
        });
        it('历史异常记录较多且未解决会增加风险分', () => {
            const masterData = (0, test_helpers_1.createBaseMasterData)();
            const application = (0, test_helpers_1.createBaseApplication)('unauthorized_consumption');
            const materials = (0, test_helpers_1.createVerifiedMaterials)(['consumption_proof', 'identity_proof']);
            const historicalData = (0, test_helpers_1.createBaseHistoricalData)({ anomalyCount: 4, unresolvedCount: 2 });
            const transactions = (0, test_helpers_1.createLowRiskTransactions)();
            const input = {
                masterData,
                application,
                materials,
                historicalData,
                transactions,
                thresholdConfig: (0, test_helpers_1.getDefaultThreshold)()
            };
            const result = api.processApplication(input);
            const historicalRule = result.calculationBasis.breakdown.find(r => r.ruleType === 'historical');
            expect(historicalRule).toBeDefined();
            expect(historicalRule.triggered).toBe(true);
            expect(historicalRule.score).toBeGreaterThan(0);
        });
    });
    describe('数据回放测试', () => {
        it('应记录处理过程并支持数据回放', () => {
            const masterData = (0, test_helpers_1.createBaseMasterData)();
            const application = (0, test_helpers_1.createBaseApplication)('unauthorized_consumption');
            const materials = (0, test_helpers_1.createVerifiedMaterials)(['consumption_proof', 'identity_proof']);
            const historicalData = (0, test_helpers_1.createBaseHistoricalData)({ anomalyCount: 0 });
            const transactions = (0, test_helpers_1.createLowRiskTransactions)();
            const input = {
                masterData,
                application,
                materials,
                historicalData,
                transactions,
                thresholdConfig: (0, test_helpers_1.getDefaultThreshold)()
            };
            api.processApplication(input);
            const records = api.getProcessingRecords(application.applicationId);
            expect(records.length).toBeGreaterThan(0);
            expect(records[0].applicationId).toBe(application.applicationId);
            expect(records[0].riskSnapshot).toBeDefined();
        });
        it('数据回放应包含完整的状态转换路径', () => {
            const masterData = (0, test_helpers_1.createBaseMasterData)();
            const application = (0, test_helpers_1.createBaseApplication)('stolen_card');
            const materials = (0, test_helpers_1.createVerifiedMaterials)(['police_report', 'identity_proof']);
            const historicalData = (0, test_helpers_1.createBaseHistoricalData)({ anomalyCount: 0 });
            const transactions = (0, test_helpers_1.createHighRiskTransactions)();
            const input = {
                masterData,
                application,
                materials,
                historicalData,
                transactions,
                thresholdConfig: (0, test_helpers_1.getDefaultThreshold)()
            };
            api.processApplication(input);
            const replayResult = api.replayApplication(application.applicationId);
            expect(replayResult.applicationId).toBe(application.applicationId);
            expect(replayResult.totalSteps).toBeGreaterThan(0);
            expect(replayResult.finalStatus).toBe('under_review');
            expect(replayResult.steps.length).toBe(replayResult.totalSteps);
            expect(replayResult.statusTimeline.length).toBeGreaterThan(0);
            const firstStep = replayResult.steps[0];
            expect(firstStep.fromStatus).toBe('pending');
            expect(firstStep.toStatus).toBe('under_review');
            expect(firstStep.riskScore).toBeGreaterThan(0);
            expect(firstStep.anomalyExplanation).toBeTruthy();
        });
        it('空申请ID的数据回放应返回空结果', () => {
            const replayResult = api.replayApplication('NON_EXISTENT');
            expect(replayResult.totalSteps).toBe(0);
            expect(replayResult.steps.length).toBe(0);
            expect(replayResult.finalStatus).toBe('pending');
        });
    });
    describe('任务状态验证', () => {
        it('可办理状态应满足：低风险 + 材料齐全 + 卡片正常', () => {
            const masterData = (0, test_helpers_1.createBaseMasterData)();
            const application = (0, test_helpers_1.createBaseApplication)('unauthorized_consumption');
            const materials = (0, test_helpers_1.createVerifiedMaterials)(['consumption_proof', 'identity_proof']);
            const historicalData = (0, test_helpers_1.createBaseHistoricalData)({ anomalyCount: 0 });
            const transactions = (0, test_helpers_1.createLowRiskTransactions)();
            const input = {
                masterData,
                application,
                materials,
                historicalData,
                transactions,
                thresholdConfig: (0, test_helpers_1.getDefaultThreshold)()
            };
            const result = api.processApplication(input);
            expect(result.taskStatus).toBe('processable');
            expect(result.canHandle).toBe(true);
            expect(result.riskLevel).toBe('low');
            expect(result.materialStatus.complete).toBe(true);
            expect(result.isLocked).toBe(false);
        });
        it('高风险或缺材料时必须进入复核，不允许直接通过', () => {
            const masterData = (0, test_helpers_1.createBaseMasterData)();
            const application = (0, test_helpers_1.createBaseApplication)('stolen_card');
            const materials = (0, test_helpers_1.createVerifiedMaterials)(['police_report', 'identity_proof']);
            const historicalData = (0, test_helpers_1.createBaseHistoricalData)({ anomalyCount: 0 });
            const transactions = (0, test_helpers_1.createHighRiskTransactions)();
            const input = {
                masterData,
                application,
                materials,
                historicalData,
                transactions,
                thresholdConfig: (0, test_helpers_1.getDefaultThreshold)()
            };
            const result = api.processApplication(input);
            expect(result.canHandle).toBe(false);
            expect(result.needReview).toBe(true);
            expect(result.taskStatus).not.toBe('processable');
            expect(result.reviewReason).toBeTruthy();
        });
    });
});
//# sourceMappingURL=anomaly-card-api.test.js.map