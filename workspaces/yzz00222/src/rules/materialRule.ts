import { Material, MaterialType, DispatchItem, Pilot } from '../objects/types';

export interface MaterialCheckResult {
  complete: boolean;
  missingMaterials: Material[];
  invalidMaterials: Material[];
  reasons: string[];
}

const REQUIRED_MATERIALS: MaterialType[] = [
  MaterialType.ID_CARD,
  MaterialType.QUALIFICATION_CERT,
  MaterialType.HEALTH_CERT,
  MaterialType.PHOTO
];

export class MaterialRule {
  static checkMaterials(item: DispatchItem): MaterialCheckResult {
    const missingMaterials: Material[] = [];
    const invalidMaterials: Material[] = [];
    const reasons: string[] = [];

    for (const requiredType of REQUIRED_MATERIALS) {
      const material = item.materials.find(m => m.type === requiredType);
      if (!material || !material.provided) {
        missingMaterials.push({
          type: requiredType,
          name: this.getMaterialName(requiredType),
          provided: false
        });
        reasons.push(`缺少${this.getMaterialName(requiredType)}`);
      } else if (material.valid === false) {
        invalidMaterials.push(material);
        reasons.push(`${this.getMaterialName(requiredType)}无效`);
      } else if (material.expireDate && new Date(material.expireDate) < new Date()) {
        invalidMaterials.push(material);
        reasons.push(`${this.getMaterialName(requiredType)}已过期`);
      }
    }

    return {
      complete: missingMaterials.length === 0 && invalidMaterials.length === 0,
      missingMaterials,
      invalidMaterials,
      reasons
    };
  }

  static getMaterialName(type: MaterialType): string {
    const nameMap: Record<MaterialType, string> = {
      [MaterialType.ID_CARD]: '身份证',
      [MaterialType.QUALIFICATION_CERT]: '资质证书',
      [MaterialType.HEALTH_CERT]: '健康证明',
      [MaterialType.TRAINING_CERT]: '培训证书',
      [MaterialType.SEA_SERVICE]: '海上服务资历',
      [MaterialType.PHOTO]: '照片'
    };
    return nameMap[type] || type;
  }
}

export class PilotQualificationRule {
  static checkPilotQualification(
    item: DispatchItem,
    pilot: Pilot
  ): { valid: boolean; reasons: string[] } {
    const reasons: string[] = [];

    if (new Date(pilot.licenseExpireDate) < new Date()) {
      reasons.push('引航员资质证书已过期');
    }

    if (!pilot.portScope.includes(item.portOfCall)) {
      reasons.push(`引航员无${item.portOfCall}港口引航资质`);
    }

    if (item.shipGrossTonnage > 100000 && pilot.qualificationLevel !== '一级') {
      reasons.push('船舶吨位超过引航员资质等级允许范围');
    }

    return {
      valid: reasons.length === 0,
      reasons
    };
  }
}
