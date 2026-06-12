import type { DefectType, OrderStatus } from "@/types";

export const DEFECT_TYPE_CONFIG: Record<
  DefectType,
  { label: string; color: string; bgColor: string; borderColor: string; lightBg: string }
> = {
  crack: {
    label: "裂纹",
    color: "text-red-600",
    bgColor: "bg-red-500",
    borderColor: "border-red-500",
    lightBg: "bg-red-50",
  },
  missing_part: {
    label: "缺件",
    color: "text-amber-600",
    bgColor: "bg-amber-500",
    borderColor: "border-amber-500",
    lightBg: "bg-amber-50",
  },
  stain: {
    label: "污渍",
    color: "text-purple-600",
    bgColor: "bg-purple-500",
    borderColor: "border-purple-500",
    lightBg: "bg-purple-50",
  },
  water_damage: {
    label: "进水",
    color: "text-blue-600",
    bgColor: "bg-blue-500",
    borderColor: "border-blue-500",
    lightBg: "bg-blue-50",
  },
  human_damage: {
    label: "疑似人为损坏",
    color: "text-pink-600",
    bgColor: "bg-pink-500",
    borderColor: "border-pink-500",
    lightBg: "bg-pink-50",
  },
  old_repair: {
    label: "旧维修痕迹",
    color: "text-gray-600",
    bgColor: "bg-gray-500",
    borderColor: "border-gray-500",
    lightBg: "bg-gray-50",
  },
};

export const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bgColor: string; dotColor: string }
> = {
  pending: {
    label: "待初筛",
    color: "text-slate-600",
    bgColor: "bg-slate-100",
    dotColor: "bg-slate-400",
  },
  screened: {
    label: "已初筛",
    color: "text-sky-600",
    bgColor: "bg-sky-50",
    dotColor: "bg-sky-500",
  },
  customer_reviewed: {
    label: "客服已审核",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    dotColor: "bg-indigo-500",
  },
  quality_check: {
    label: "待质检",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    dotColor: "bg-amber-500",
  },
  quality_passed: {
    label: "质检通过",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    dotColor: "bg-emerald-500",
  },
  disputed: {
    label: "争议件",
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    dotColor: "bg-rose-500",
  },
  closed: {
    label: "已结案",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    dotColor: "bg-gray-400",
  },
};

export const APPLIANCE_TYPES = [
  "冰箱",
  "洗衣机",
  "空调",
  "电视",
  "热水器",
  "油烟机",
  "燃气灶",
  "微波炉",
  "洗碗机",
  "净化器",
];

export const PHOTO_ANGLES = ["正面", "侧面", "背面", "顶部", "底部", "细节特写"];

export const CONFIDENCE_THRESHOLDS = {
  high: 80,
  medium: 60,
  low: 50,
};

export const DISPUTE_RULES = [
  { id: "low_confidence", label: "整体置信度低于50%", check: (confidence: number) => confidence < 50 },
  { id: "multi_damage", label: "同时存在运输损坏和人为损坏且置信度均>60%", check: (_: number, tags: any[]) => {
      const hasTransport = tags.some(t => t.type === "crack" || t.type === "missing_part");
      const hasHuman = tags.some(t => t.type === "human_damage");
      return hasTransport && hasHuman;
  }},
];
