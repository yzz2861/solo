import type { WorkOrder, Photo, DefectTag, ConfidenceFactor } from "@/types";

interface ConfidenceInput {
  photos: Photo[];
  tags: DefectTag[];
  remark: string;
  hasOldRepair: boolean;
}

export function calculateConfidence(input: ConfidenceInput): {
  overallConfidence: number;
  factors: ConfidenceFactor[];
} {
  const factors: ConfidenceFactor[] = [];
  let baseConfidence = 90;

  const avgClarity =
    input.photos.reduce((sum, p) => sum + p.clarity, 0) / Math.max(input.photos.length, 1);
  if (avgClarity < 60) {
    const impact = Math.round((60 - avgClarity) * 0.3);
    factors.push({
      factor: "照片模糊",
      impact: -impact,
      description: `平均清晰度 ${avgClarity}分，低于正常标准`,
    });
    baseConfidence -= impact;
  }

  const avgBrightness =
    input.photos.reduce((sum, p) => sum + p.brightness, 0) / Math.max(input.photos.length, 1);
  if (avgBrightness < 40 || avgBrightness > 90) {
    const impact = 15;
    factors.push({
      factor: "光线条件差",
      impact: -impact,
      description:
        avgBrightness < 40 ? "光线不足，影响识别准确度" : "反光严重，部分区域过曝",
    });
    baseConfidence -= impact;
  }

  if (input.photos.length < 3) {
    const impact = 15;
    factors.push({
      factor: "多角度照片不足",
      impact: -impact,
      description: `仅 ${input.photos.length} 张照片，建议至少3个不同角度`,
    });
    baseConfidence -= impact;
  }

  if (input.hasOldRepair) {
    const impact = 20;
    factors.push({
      factor: "存在旧维修痕迹",
      impact: -impact,
      description: "检测到历史维修痕迹，新旧损伤可能混淆",
    });
    baseConfidence -= impact;
  }

  if (input.remark && input.tags.length > 0) {
    const hasConflict = checkRemarkConflict(input.remark, input.tags);
    if (hasConflict) {
      const impact = 25;
      factors.push({
        factor: "备注与图片分析冲突",
        impact: -impact,
        description: "师傅备注描述与图片识别结果存在不一致",
      });
      baseConfidence -= impact;
    }
  }

  if (input.tags.some((t) => t.type === "human_damage" && t.confidence > 50)) {
    const tag = input.tags.find((t) => t.type === "human_damage")!;
    const impact = Math.round(tag.confidence * 0.1);
    factors.push({
      factor: "存在人为损坏嫌疑",
      impact: -impact,
      description: "疑似人为损坏的判定需谨慎，建议人工复核",
    });
    baseConfidence -= impact;
  }

  return {
    overallConfidence: Math.max(10, Math.min(98, baseConfidence)),
    factors,
  };
}

function checkRemarkConflict(remark: string, tags: DefectTag[]): boolean {
  const lowerRemark = remark.toLowerCase();

  const keywordMap: Record<string, string[]> = {
    crack: ["裂", "碎", "破", "断"],
    water_damage: ["进水", "漏水", "水浸", "泡水", "湿"],
    missing_part: ["缺", "少", "掉了", "丢", "不见"],
    stain: ["脏", "污", "垢", "斑"],
    human_damage: ["人为", "摔", "碰", "撞", "使用不当"],
    old_repair: ["修过", "之前修", "旧伤", "以前坏"],
  };

  for (const tag of tags) {
    const keywords = keywordMap[tag.type] || [];
    const mentions = keywords.some((k) => lowerRemark.includes(k));
    if (tag.confidence > 70 && !mentions && Math.random() > 0.5) {
      return true;
    }
  }

  return false;
}

export function isDisputedOrder(order: WorkOrder): boolean {
  if (order.confidence < 50) return true;

  const hasTransportDamage = order.tags.some(
    (t) => (t.type === "crack" || t.type === "missing_part") && t.confidence > 60
  );
  const hasHumanDamage = order.tags.some((t) => t.type === "human_damage" && t.confidence > 60);
  if (hasTransportDamage && hasHumanDamage) return true;

  if (order.tagModifyCount >= 3) return true;

  return order.isDisputed;
}
