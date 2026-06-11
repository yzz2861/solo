import type { PriceItem, AnomalyAlert, PriceUnit } from "@/types";
import { toJin, calcChangeRate } from "@/types";

const SURGE_THRESHOLD = 30;
const OCR_CONFIDENCE_THRESHOLD = 0.5;
const EXTREME_SURGE_THRESHOLD = 60;

const SIMILAR_NAMES: [string, string][] = [
  ["青菜", "小青菜"],
  ["白菜", "小白菜"],
  ["辣椒", "小米辣"],
  ["生姜", "沙姜"],
];

export function detectAnomalies(items: PriceItem[]): AnomalyAlert[] {
  const alerts: AnomalyAlert[] = [];
  let alertId = 0;
  const aid = () => `a_${++alertId}`;

  for (const item of items) {
    if (item.oralUnit && item.ocrUnit && item.oralUnit !== item.ocrUnit) {
      const oralJin = item.oralPrice !== undefined ? toJin(item.oralPrice, item.oralUnit) : undefined;
      const ocrJin = item.ocrPrice !== undefined ? toJin(item.ocrPrice, item.ocrUnit) : undefined;
      const isConsistent = oralJin !== undefined && ocrJin !== undefined && Math.abs(oralJin - ocrJin) / oralJin < 0.1;

      alerts.push({
        id: aid(),
        itemId: item.id,
        type: "unit_mismatch",
        severity: isConsistent ? "warning" : "error",
        message: `"${item.name}" 口述单位(${item.oralUnit})与OCR单位(${item.ocrUnit})不一致`,
        suggestion: isConsistent
          ? `换算后斤价接近(口述≈${oralJin?.toFixed(1)}元/斤, OCR≈${ocrJin?.toFixed(1)}元/斤)，可能是同价不同标法`
          : `换算后斤价差异大(口述≈${oralJin?.toFixed(1)}元/斤, OCR≈${ocrJin?.toFixed(1)}元/斤)，请核实`,
      });
    }

    if (
      item.confirmedPrice !== undefined &&
      item.confirmedUnit &&
      item.yesterdayPrice !== undefined &&
      item.yesterdayUnit
    ) {
      const rate = calcChangeRate(item.confirmedPrice, item.confirmedUnit, item.yesterdayPrice, item.yesterdayUnit);
      if (Math.abs(rate) > SURGE_THRESHOLD) {
        const direction = rate > 0 ? "上涨" : "下跌";
        alerts.push({
          id: aid(),
          itemId: item.id,
          type: "price_surge",
          severity: Math.abs(rate) > EXTREME_SURGE_THRESHOLD ? "error" : "warning",
          message: `"${item.name}" 较昨日${direction}${Math.abs(rate).toFixed(0)}%(昨${item.yesterdayPrice}元/${item.yesterdayUnit} → 今${item.confirmedPrice}元/${item.confirmedUnit})`,
          suggestion: Math.abs(rate) > EXTREME_SURGE_THRESHOLD
            ? "涨跌幅度过大，建议核实是否为同品种或单位标错"
            : "涨跌幅度较大，请留意是否正常波动",
        });
      }
    }

    if (
      item.oralPrice !== undefined &&
      item.oralUnit &&
      item.yesterdayPrice !== undefined &&
      item.yesterdayUnit
    ) {
      const rate = calcChangeRate(item.oralPrice, item.oralUnit, item.yesterdayPrice, item.yesterdayUnit);
      if (Math.abs(rate) > SURGE_THRESHOLD && item.status === "pending") {
        const direction = rate > 0 ? "上涨" : "下跌";
        const alreadyHas = alerts.some((a) => a.itemId === item.id && a.type === "price_surge");
        if (!alreadyHas) {
          alerts.push({
            id: aid(),
            itemId: item.id,
            type: "price_surge",
            severity: Math.abs(rate) > EXTREME_SURGE_THRESHOLD ? "error" : "warning",
            message: `"${item.name}" 口述价较昨日${direction}${Math.abs(rate).toFixed(0)}%`,
            suggestion: "口述价波动较大，建议与摊主二次确认",
          });
        }
      }
    }

    if (item.ocrConfidence !== undefined && item.ocrConfidence < OCR_CONFIDENCE_THRESHOLD) {
      alerts.push({
        id: aid(),
        itemId: item.id,
        type: "ocr_unclear",
        severity: "error",
        message: `"${item.name}" OCR识别置信度仅${(item.ocrConfidence * 100).toFixed(0)}%，识别结果不可靠`,
        suggestion: "价签识别不清，建议放入待问摊主清单，人工核实后再确认",
      });
    }

    if (item.oralPrice !== undefined && item.oralPrice > 50) {
      alerts.push({
        id: aid(),
        itemId: item.id,
        type: "price_surge",
        severity: "error",
        message: `"${item.name}" 口述价${item.oralPrice}元/${item.oralUnit}过高，可能存在输入错误`,
        suggestion: "价格异常离谱，请与摊主核实后再确认",
      });
    }

    if (item.ocrPrice !== undefined && item.ocrPrice > 50) {
      alerts.push({
        id: aid(),
        itemId: item.id,
        type: "price_surge",
        severity: "error",
        message: `"${item.name}" OCR识别价${item.ocrPrice}元/${item.ocrUnit}过高，可能存在识别错误`,
        suggestion: "价格异常离谱，请与摊主核实后再确认",
      });
    }

    if (item.status === "pending" && item.confirmedPrice === undefined) {
      alerts.push({
        id: aid(),
        itemId: item.id,
        type: "unconfirmed",
        severity: "warning",
        message: `"${item.name}" 尚未确认价格`,
        suggestion: "请选择采纳来源或手动输入确认价",
      });
    }
  }

  for (const [n1, n2] of SIMILAR_NAMES) {
    const i1 = items.find((i) => i.name === n1);
    const i2 = items.find((i) => i.name === n2);
    if (i1 && i2) {
      const p1 = i1.oralPrice !== undefined && i1.oralUnit ? toJin(i1.oralPrice, i1.oralUnit) : undefined;
      const p2 = i2.oralPrice !== undefined && i2.oralUnit ? toJin(i2.oralPrice, i2.oralUnit) : undefined;
      if (p1 !== undefined && p2 !== undefined && Math.abs(p1 - p2) / Math.min(p1, p2) > 0.5) {
        alerts.push({
          id: aid(),
          itemId: i1.id,
          type: "name_variant",
          severity: "warning",
          message: `"${n1}"(${p1.toFixed(1)}元/斤) 与 "${n2}"(${p2.toFixed(1)}元/斤) 名称相似但价格差异较大`,
          suggestion: "请确认是否为不同品种，避免播报时混淆",
        });
      }
    }
  }

  return alerts;
}

export function normalizeToJin(price: number, unit: PriceUnit): number {
  return toJin(price, unit);
}

export function shouldAutoMarkAskVendor(item: PriceItem, anomalies: AnomalyAlert[]): boolean {
  const itemAnomalies = anomalies.filter((a) => a.itemId === item.id);
  
  const hasErrorAnomaly = itemAnomalies.some((a) => a.severity === "error");
  
  const hasExtremeSurge = itemAnomalies.some((a) => a.type === "price_surge" && a.severity === "error");
  
  const hasOcrUnclear = itemAnomalies.some((a) => a.type === "ocr_unclear");
  
  const hasUnitMismatchError = itemAnomalies.some((a) => a.type === "unit_mismatch" && a.severity === "error");
  
  const hasNoPrice = !item.oralPrice && !item.ocrPrice;
  
  const oralTooHigh = item.oralPrice !== undefined && item.oralPrice > 50;
  const ocrTooHigh = item.ocrPrice !== undefined && item.ocrPrice > 50;

  return hasErrorAnomaly || hasExtremeSurge || hasOcrUnclear || hasUnitMismatchError || hasNoPrice || oralTooHigh || ocrTooHigh;
}
