import { RiskLevel, DispatchItem, Pilot, MaterialType } from '../objects/types';

export interface RiskAssessmentResult {
  riskLevel: RiskLevel;
  riskReasons: string[];
  riskScore: number;
}

export class RiskAssessmentRule {
  static assess(item: DispatchItem, pilot?: Pilot): RiskAssessmentResult {
    let score = 0;
    const reasons: string[] = [];

    const shipTypeRisk = this.assessShipTypeRisk(item.shipType);
    score += shipTypeRisk.score;
    reasons.push(...shipTypeRisk.reasons);

    const tonnageRisk = this.assessTonnageRisk(item.shipGrossTonnage);
    score += tonnageRisk.score;
    reasons.push(...tonnageRisk.reasons);

    const materialRisk = this.assessMaterialRisk(item);
    score += materialRisk.score;
    reasons.push(...materialRisk.reasons);

    if (pilot) {
      const pilotRisk = this.assessPilotRisk(pilot, item);
      score += pilotRisk.score;
      reasons.push(...pilotRisk.reasons);
    } else {
      score += 20;
      reasons.push('未获取引航员信息，风险无法准确判定');
    }

    const riskLevel = this.determineRiskLevel(score, reasons);

    return {
      riskLevel,
      riskReasons: reasons,
      riskScore: score
    };
  }

  private static assessShipTypeRisk(shipType: string): { score: number; reasons: string[] } {
    const highRiskTypes = ['油轮', '液化气船', '化学品船', '危险品船'];
    const mediumRiskTypes = ['集装箱船', '散货船', '客船'];

    if (highRiskTypes.includes(shipType)) {
      return { score: 40, reasons: [`船舶类型为${shipType}，属于高风险船舶`] };
    }
    if (mediumRiskTypes.includes(shipType)) {
      return { score: 20, reasons: [`船舶类型为${shipType}，属于中风险船舶`] };
    }
    return { score: 5, reasons: [`船舶类型为${shipType}，风险较低`] };
  }

  private static assessTonnageRisk(tonnage: number): { score: number; reasons: string[] } {
    if (tonnage >= 100000) {
      return { score: 30, reasons: [`船舶总吨位${tonnage}吨，超大型船舶`] };
    }
    if (tonnage >= 50000) {
      return { score: 15, reasons: [`船舶总吨位${tonnage}吨，大型船舶`] };
    }
    if (tonnage >= 10000) {
      return { score: 8, reasons: [`船舶总吨位${tonnage}吨，中型船舶`] };
    }
    return { score: 2, reasons: [`船舶总吨位${tonnage}吨，小型船舶`] };
  }

  private static assessMaterialRisk(item: DispatchItem): { score: number; reasons: string[] } {
    const requiredTypes = [
      MaterialType.ID_CARD,
      MaterialType.QUALIFICATION_CERT,
      MaterialType.HEALTH_CERT
    ];

    let missingCount = 0;
    const missingNames: string[] = [];

    for (const type of requiredTypes) {
      const material = item.materials.find(m => m.type === type);
      if (!material || !material.provided) {
        missingCount++;
        missingNames.push(type);
      }
    }

    if (missingCount >= 2) {
      return { score: 25, reasons: [`缺少${missingCount}项核心材料：${missingNames.join('、')}`] };
    }
    if (missingCount === 1) {
      return { score: 10, reasons: [`缺少1项核心材料：${missingNames[0]}`] };
    }
    return { score: 0, reasons: [] };
  }

  private static assessPilotRisk(
    pilot: Pilot,
    item: DispatchItem
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    if (pilot.serviceYears < 3) {
      score += 15;
      reasons.push(`引航员从业年限${pilot.serviceYears}年，经验不足`);
    }

    if (!pilot.portScope.includes(item.portOfCall)) {
      score += 30;
      reasons.push('引航员无该港口引航资质');
    }

    if (new Date(pilot.licenseExpireDate) < new Date()) {
      score += 50;
      reasons.push('引航员资质证书已过期');
    }

    return { score, reasons };
  }

  private static determineRiskLevel(score: number, reasons: string[]): RiskLevel {
    const hasUndetermined = reasons.some(r => r.includes('无法准确判定'));

    if (hasUndetermined && score >= 30) {
      return RiskLevel.UNDETERMINED;
    }

    if (score >= 50) {
      return RiskLevel.HIGH;
    }
    if (score >= 25) {
      return RiskLevel.MEDIUM;
    }
    return RiskLevel.LOW;
  }
}
