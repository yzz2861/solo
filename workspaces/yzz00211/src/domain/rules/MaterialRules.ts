import { IRule, RuleResult, RuleCategory, RuleSeverity, RuleEngineInput } from './RuleTypes';
import { MaterialType, MaterialStatus } from '../objects';

export class RequiredMaterialRule implements IRule {
  id = 'MATERIAL_001';
  name = '必需材料校验';
  category = RuleCategory.MATERIAL;

  execute(input: RuleEngineInput): RuleResult {
    const { materials, thresholdConfig } = input;
    const { requiredMaterialTypes, minMaterialCount } = thresholdConfig.material;

    const validMaterials = materials.filter(
      (m) => m.status === MaterialStatus.UPLOADED || m.status === MaterialStatus.VERIFIED
    );

    const missingTypes: string[] = [];
    requiredMaterialTypes.forEach((type) => {
      const hasType = validMaterials.some((m) => m.type === type);
      if (!hasType) {
        missingTypes.push(type);
      }
    });

    const detail: Record<string, unknown> = {
      uploadedCount: validMaterials.length,
      requiredMinCount: minMaterialCount,
      missingTypes,
    };

    let passed = true;
    let severity = RuleSeverity.PASS;
    let message = '必需材料校验通过';

    if (missingTypes.length > 0) {
      passed = false;
      severity = RuleSeverity.REVIEW;
      message = `缺少必需材料：${missingTypes.join('、')}，需复核`;
    } else if (validMaterials.length < minMaterialCount) {
      passed = false;
      severity = RuleSeverity.REVIEW;
      message = `材料数量不足：上传${validMaterials.length}份，最少需要${minMaterialCount}份，需复核`;
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      category: this.category,
      severity,
      passed,
      message,
      detail,
    };
  }
}

export class ItemLevelMaterialRule implements IRule {
  id = 'MATERIAL_002';
  name = '明细级材料校验';
  category = RuleCategory.MATERIAL;

  execute(input: RuleEngineInput): RuleResult {
    const { materials, application, thresholdConfig } = input;

    if (!thresholdConfig.material.requireItemLevelMaterials) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        category: this.category,
        severity: RuleSeverity.PASS,
        passed: true,
        message: '明细级材料校验未启用，跳过',
      };
    }

    const highRiskItems = application.items.filter((item) => item.drug.isHighRisk);
    const itemsWithoutMaterial: string[] = [];
    const detail: Record<string, unknown> = {};

    highRiskItems.forEach((item) => {
      const hasMaterial = materials.some(
        (m) =>
          m.relatedItemId === item.id &&
          (m.status === MaterialStatus.UPLOADED || m.status === MaterialStatus.VERIFIED)
      );
      if (!hasMaterial) {
        itemsWithoutMaterial.push(item.id);
        detail[item.id] = item.drug.name;
      }
    });

    const passed = itemsWithoutMaterial.length === 0;
    return {
      ruleId: this.id,
      ruleName: this.name,
      category: this.category,
      severity: passed ? RuleSeverity.PASS : RuleSeverity.REVIEW,
      passed,
      message: passed
        ? '明细级材料校验通过'
        : `${itemsWithoutMaterial.length}个高风险药品明细缺少佐证材料，需复核`,
      detail,
      affectedItems: itemsWithoutMaterial,
    };
  }
}

export class MaterialValidityRule implements IRule {
  id = 'MATERIAL_003';
  name = '材料有效性校验';
  category = RuleCategory.MATERIAL;

  execute(input: RuleEngineInput): RuleResult {
    const { materials } = input;

    const invalidMaterials = materials.filter((m) => m.status === MaterialStatus.INVALID);
    const detail: Record<string, unknown> = {};

    invalidMaterials.forEach((m) => {
      detail[m.id] = {
        name: m.name,
        type: m.type,
        remark: m.verificationRemark || '无',
      };
    });

    const passed = invalidMaterials.length === 0;
    return {
      ruleId: this.id,
      ruleName: this.name,
      category: this.category,
      severity: passed ? RuleSeverity.PASS : RuleSeverity.WARNING,
      passed,
      message: passed
        ? '材料有效性校验通过'
        : `存在${invalidMaterials.length}份无效材料`,
      detail,
      affectedItems: invalidMaterials.map((m) => m.id),
    };
  }
}
