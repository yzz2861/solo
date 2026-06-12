import type { DefectTag, EvidenceArea, Photo, DefectType } from "@/types";

const defectTypes: DefectType[] = [
  "crack",
  "missing_part",
  "stain",
  "water_damage",
  "human_damage",
  "old_repair",
];

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 11)}`;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface AIAnalysisResult {
  tags: DefectTag[];
  evidenceAreas: EvidenceArea[];
}

export function simulateAIAnalysis(
  orderId: string,
  photos: Photo[],
  remark: string
): AIAnalysisResult {
  const tags: DefectTag[] = [];
  const evidenceAreas: EvidenceArea[] = [];

  const numDefects = randomInt(1, 4);
  const selectedTypes = new Set<DefectType>();

  while (selectedTypes.size < numDefects) {
    selectedTypes.add(randomChoice(defectTypes));
  }

  let tagIndex = 0;
  for (const defectType of selectedTypes) {
    const baseConfidence = randomInt(55, 95);
    const tag: DefectTag = {
      id: randomId("tag"),
      orderId,
      type: defectType,
      confidence: baseConfidence,
      source: "ai",
      createdAt: new Date().toISOString(),
    };
    tags.push(tag);

    const numAreas = randomInt(1, 3);
    for (let i = 0; i < numAreas; i++) {
      const photo = photos[tagIndex % photos.length];
      const area: EvidenceArea = {
        id: randomId("area"),
        photoId: photo.id,
        tagType: defectType,
        x: randomInt(10, 70),
        y: randomInt(10, 60),
        width: randomInt(15, 35),
        height: randomInt(15, 30),
        description: generateAreaDescription(defectType),
      };
      evidenceAreas.push(area);
    }
    tagIndex++;
  }

  if (remark) {
    const lowerRemark = remark.toLowerCase();
    if (lowerRemark.includes("裂") || lowerRemark.includes("碎")) {
      if (!tags.some((t) => t.type === "crack")) {
        tags.push({
          id: randomId("tag"),
          orderId,
          type: "crack",
          confidence: 75,
          source: "ai",
          createdAt: new Date().toISOString(),
        });
      }
    }
    if (lowerRemark.includes("水")) {
      if (!tags.some((t) => t.type === "water_damage")) {
        tags.push({
          id: randomId("tag"),
          orderId,
          type: "water_damage",
          confidence: 70,
          source: "ai",
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  return { tags, evidenceAreas };
}

function generateAreaDescription(defectType: DefectType): string {
  const descriptions: Record<DefectType, string[]> = {
    crack: [
      "左侧面板可见约3cm长裂纹",
      "边角处有碎裂痕迹",
      "表面有细微裂纹分布",
    ],
    missing_part: [
      "底部脚垫缺失一个",
      "配件包中缺少固定螺丝",
      "门把手装饰盖缺失",
    ],
    stain: [
      "顶面有黄褐色污渍",
      "侧面可见明显手印",
      "底部有积灰和污渍",
    ],
    water_damage: [
      "底部有明显水渍痕迹",
      "电路板区域有进水痕迹",
      "侧面有水印残留",
    ],
    human_damage: [
      "有明显的硬物敲击痕迹",
      "划痕方向符合人为拖拽特征",
      "变形区域受力点集中",
    ],
    old_repair: [
      "有拆装机痕迹，螺丝有拧动痕迹",
      "密封胶为后期重新涂抹",
      "标签有撕毁重贴痕迹",
    ],
  };
  return randomChoice(descriptions[defectType]);
}

export function generatePhotoQuality(): { clarity: number; brightness: number } {
  const qualityRoll = Math.random();
  if (qualityRoll < 0.15) {
    return {
      clarity: randomInt(30, 55),
      brightness: randomInt(25, 45),
    };
  }
  if (qualityRoll < 0.3) {
    return {
      clarity: randomInt(60, 75),
      brightness: randomInt(80, 95),
    };
  }
  return {
    clarity: randomInt(78, 95),
    brightness: randomInt(50, 80),
  };
}
