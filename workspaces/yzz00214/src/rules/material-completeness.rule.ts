import { BaseRule, RuleResult } from './base-rule';
import { TransactionRecord, MasterData, ThresholdConfig, SupportingMaterial, AnomalyApplicationRecord } from '../models';
import { REQUIRED_MATERIALS_BY_ANOMALY_TYPE } from '../models/supporting-material';

export interface MaterialRuleContext {
  materials: SupportingMaterial[];
  application: AnomalyApplicationRecord;
}

export class MaterialCompletenessRule extends BaseRule {
  ruleName = '材料完整性检测规则';
  ruleType = 'material';

  evaluate(
    transactions: TransactionRecord[],
    masterData: MasterData,
    thresholdConfig: ThresholdConfig,
    context?: MaterialRuleContext
  ): RuleResult {
    const materials = context?.materials || [];
    const application = context?.application;
    const { materialThreshold } = thresholdConfig;

    if (!application) {
      return {
        ruleName: this.ruleName,
        ruleType: this.ruleType,
        triggered: true,
        riskScore: 100,
        explanation: '缺少申请记录，无法判断材料完整性',
        details: {}
      };
    }

    const requiredTypes = REQUIRED_MATERIALS_BY_ANOMALY_TYPE[application.anomalyType] || [];
    const verifiedMaterials = materials.filter(m => m.verificationStatus === 'verified');
    const pendingMaterials = materials.filter(m => m.verificationStatus === 'pending');

    const missingRequiredTypes: string[] = [];
    for (const reqType of requiredTypes) {
      const hasType = verifiedMaterials.some(m => m.materialType === reqType);
      if (!hasType) {
        missingRequiredTypes.push(reqType);
      }
    }

    const materialCount = verifiedMaterials.length;
    const meetsMinCount = materialCount >= materialThreshold.minRequiredMaterials;
    const hasAllRequired = missingRequiredTypes.length === 0;

    let riskScore = 0;
    const explanations: string[] = [];
    const details: Record<string, any> = {
      anomalyType: application.anomalyType,
      requiredMaterialTypes: requiredTypes,
      submittedMaterials: materials.length,
      verifiedMaterials: verifiedMaterials.length,
      pendingMaterials: pendingMaterials.length,
      missingRequiredTypes,
      meetsMinCount,
      hasAllRequired
    };

    if (!hasAllRequired) {
      riskScore += 40;
      explanations.push(`缺少必备材料：${missingRequiredTypes.join('、')}`);
    }

    if (!meetsMinCount) {
      riskScore += 20;
      explanations.push(`佐证材料数量不足，已验证${materialCount}份，最少需要${materialThreshold.minRequiredMaterials}份`);
    }

    if (pendingMaterials.length > 0) {
      riskScore += 10;
      explanations.push(`有${pendingMaterials.length}份材料待审核验证`);
    }

    if (riskScore === 0) {
      explanations.push('材料完整且已验证');
    }

    return {
      ruleName: this.ruleName,
      ruleType: this.ruleType,
      triggered: riskScore > 0,
      riskScore,
      explanation: explanations.join('；'),
      details
    };
  }
}
