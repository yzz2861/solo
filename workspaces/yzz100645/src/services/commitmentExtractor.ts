import type {
  ConfidenceLevel,
  ConfidenceReason,
  Email,
  Commitment,
  ExtractedField,
} from "@/types";

const uuid = () => Math.random().toString(36).slice(2, 10);

const splitSentences = (text: string): { sentence: string; start: number; end: number }[] => {
  const result: { sentence: string; start: number; end: number }[] = [];
  const regex = /([^。！？!?\n]*[。！？!?\n]|[^。！？!?\n]+$)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const s = m[0].trim();
    if (s) result.push({ sentence: s, start: m.index, end: m.index + m[0].length });
  }
  return result;
};

const computeNextWednesday = (): string => {
  const d = new Date();
  const day = d.getDay();
  const diff = day <= 3 ? 3 - day : 3 + (7 - day);
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
};

const toDateStr = (y: string, m: string, d: string) => {
  const mm = String(parseInt(m)).padStart(2, "0");
  const dd = String(parseInt(d)).padStart(2, "0");
  const yy = y.length === 2 ? `20${y}` : y;
  return `${yy}-${mm}-${dd}`;
};

const parseRelativeDate = (expr: string): { date: string | null; vague: boolean } => {
  const vagueMarkers = ["大概", "左右", "前后", "附近", "可能", "应该", "初步"];
  const vague = vagueMarkers.some((w) => expr.includes(w));

  let m = expr.match(/下(?:个)?周([一二三四五六日天])/);
  if (m) {
    const d = new Date();
    const dayMap: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 };
    const target = dayMap[m[1]] ?? 3;
    const diff = target - d.getDay() + 7;
    d.setDate(d.getDate() + diff);
    return { date: d.toISOString().slice(0, 10), vague };
  }

  if (/下(?:个)?周三/.test(expr)) return { date: computeNextWednesday(), vague };

  m = expr.match(/本月(\d{1,2})(?:[日号])/);
  if (m) {
    const d = new Date();
    d.setDate(parseInt(m[1]));
    return { date: d.toISOString().slice(0, 10), vague };
  }

  m = expr.match(/(\d{1,2})月(\d{1,2})(?:[日号])/);
  if (m) {
    const year = new Date().getFullYear().toString();
    return { date: toDateStr(year, m[1], m[2]), vague };
  }

  m = expr.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/);
  if (m) return { date: toDateStr(m[1], m[2], m[3]), vague };

  if (/月底/.test(expr)) {
    const d = new Date();
    d.setMonth(d.getMonth() + 1, 0);
    return { date: d.toISOString().slice(0, 10), vague: true };
  }
  if (/月初/.test(expr)) {
    const d = new Date();
    d.setMonth(d.getMonth() + 1, 1);
    return { date: d.toISOString().slice(0, 10), vague: true };
  }
  if (/收到订单后\s*(\d+)\s*个?工作日?/.test(expr)) {
    return { date: expr.match(/收到订单后\s*(\d+)\s*个?工作日?/)?.[0] || null, vague: true };
  }
  return { date: null, vague };
};

const emptyField = <T,>(): ExtractedField<T> => ({
  value: null,
  confidence: "high",
  reasons: [],
  evidenceSentence: "",
  evidenceRange: [0, 0],
  isEdited: false,
});

interface ExtractContext {
  isForwarded: boolean;
  hasOcr: boolean;
  hasRevocation: boolean;
}

export const computeConfidence = (
  baseLevel: ConfidenceLevel,
  reasons: ConfidenceReason[],
  ctx: ExtractContext
): { confidence: ConfidenceLevel; reasons: ConfidenceReason[] } => {
  const allReasons = [...reasons];
  let level = baseLevel;

  if (ctx.isForwarded && !allReasons.includes("forward_chain")) {
    allReasons.push("forward_chain");
  }
  if (ctx.hasOcr && !allReasons.includes("screenshot_ocr")) {
    allReasons.push("screenshot_ocr");
  }
  if (ctx.hasRevocation && !allReasons.includes("context_revocation")) {
    allReasons.push("context_revocation");
  }

  const lowCount = allReasons.filter((r) =>
    ["forward_chain", "screenshot_ocr", "vague_time", "context_revocation"].includes(r)
  ).length;

  if (lowCount >= 2) level = "low";
  else if (lowCount === 1 && level === "high") level = "medium";
  else if (lowCount >= 1 && level === "medium") level = "low";

  if (allReasons.length === 0) allReasons.push("direct_statement");
  return { confidence: level, reasons: allReasons };
};

export const extractCommitment = (email: Email): Commitment => {
  const content = email.content;
  const sentences = splitSentences(content);

  const revocationPatterns = /(之前|以前|原先|刚才|上次|之前说|更正|变更|改为|修正|取消|之前承诺)/;
  const hasRevocation = revocationPatterns.test(content);
  const hasOcr = email.attachments.some((a) => a.isOcrProcessed);

  const ctx: ExtractContext = {
    isForwarded: email.isForwarded,
    hasOcr,
    hasRevocation,
  };

  let deliveryField: ExtractedField<string> = emptyField();
  const deliveryRegexes = [
    /([^，,。；;\n]*?(?:预计|计划|安排|交期|交付|发货|发出|出货)[^，,。；;\n]*?(?:日|号|周[一二三四五六日天]|月底|月初|工作日|左右|前后)?)/,
    /([^，,。；;\n]*?(?:下周三|下个周三|下星期[一二三四五六日天]|本周[一二三四五六日天]|月底|月初)[^，,。；;\n]*)/,
  ];
  for (const s of sentences) {
    for (const re of deliveryRegexes) {
      const m = s.sentence.match(re);
      if (m) {
        const { date, vague } = parseRelativeDate(m[0]);
        if (date) {
          const reasons: ConfidenceReason[] = ["direct_statement"];
          if (vague) reasons.push("vague_time");
          const { confidence, reasons: finalReasons } = computeConfidence(
            vague ? "medium" : "high",
            reasons,
            ctx
          );
          deliveryField = {
            value: date,
            confidence,
            reasons: finalReasons,
            evidenceSentence: s.sentence,
            evidenceRange: [s.start, s.end],
            isEdited: false,
          };
          break;
        }
      }
    }
    if (deliveryField.value) break;
  }

  let quantityField: ExtractedField<number> = emptyField();
  const qtyRegex = /(\d+(?:[.,]\d+)?)\s*(?:个|只|件|套|台|吨|kg|克|张|米|万|万套|pcs?)/i;
  for (const s of sentences) {
    const m = s.sentence.match(qtyRegex);
    if (m) {
      let num = parseFloat(m[1].replace(/,/g, ""));
      if (/万/.test(m[0])) num *= 10000;
      const { confidence, reasons } = computeConfidence("high", ["direct_statement"], ctx);
      quantityField = {
        value: num,
        confidence,
        reasons,
        evidenceSentence: s.sentence,
        evidenceRange: [s.start, s.end],
        isEdited: false,
      };
      break;
    }
  }

  let priceField: ExtractedField<number> = emptyField();
  const priceRegexes = [
    /(?:价格|单价|金额)[^0-9]*?(?:人民币|RMB|¥|￥|\$|USD)?\s*(\d+(?:[.,]\d+)?)/i,
    /(?:人民币|RMB|¥|￥|\$|USD)\s*(\d+(?:[.,]\d+)?)\s*(?:元|\/|每个|每件|每套|每台|每吨|每只|pcs?)?/i,
    /按上次[^，,。；;\n]*(?:价格|单价)/,
  ];
  for (const s of sentences) {
    let matched = false;
    for (let i = 0; i < priceRegexes.length; i++) {
      const m = s.sentence.match(priceRegexes[i]);
      if (m) {
        if (i === 2) {
          const { confidence, reasons } = computeConfidence("medium", ["direct_statement"], ctx);
          priceField = {
            value: null,
            confidence,
            reasons,
            evidenceSentence: s.sentence,
            evidenceRange: [s.start, s.end],
            isEdited: false,
          };
        } else {
          const priceStr = (m[1] || "").replace(/,/g, "");
          const price = priceStr ? parseFloat(priceStr) : null;
          const { confidence, reasons } = computeConfidence("high", ["direct_statement"], ctx);
          priceField = {
            value: price,
            confidence,
            reasons,
            evidenceSentence: s.sentence,
            evidenceRange: [s.start, s.end],
            isEdited: false,
          };
        }
        matched = true;
        break;
      }
    }
    if (matched) break;
  }

  let altField: ExtractedField<string[]> = emptyField();
  const altRegexes = [
    /(?:替代料|替代|代替|替换)[^。！？!?\n]*[:：]?([^。！？!?\n]*)/,
    /如果[^，,。；;\n]*?(?:缺货|没有|不足)[^，,。；;\n]*?(?:用|换成|改用)([^，,。；;\n]*)/,
  ];
  for (const s of sentences) {
    for (const re of altRegexes) {
      const m = s.sentence.match(re);
      if (m) {
        const items = (m[1] || s.sentence)
          .split(/[、，,；;]/)
          .map((x) => x.trim())
          .filter(Boolean);
        const { confidence, reasons } = computeConfidence("medium", ["direct_statement"], ctx);
        altField = {
          value: items.length ? items : [],
          confidence,
          reasons,
          evidenceSentence: s.sentence,
          evidenceRange: [s.start, s.end],
          isEdited: false,
        };
        break;
      }
    }
    if (altField.value && altField.value.length) break;
  }
  if (!altField.value) {
    altField.value = [];
  }

  let termsField: ExtractedField<string> = emptyField();
  const termsKeywords = [
    "付款条件", "付款方式", "MOQ", "起订量", "最小起订", "包装", "运费",
    "发票", "税", "未税", "含税", "分批", "款到", "月结", "承兑",
  ];
  for (const s of sentences) {
    if (termsKeywords.some((k) => s.sentence.includes(k))) {
      const { confidence, reasons } = computeConfidence("medium", ["direct_statement"], ctx);
      termsField = {
        value: s.sentence,
        confidence,
        reasons,
        evidenceSentence: s.sentence,
        evidenceRange: [s.start, s.end],
        isEdited: false,
      };
      break;
    }
  }

  const ocrAttachment = email.attachments.find((a) => a.isOcrProcessed);
  if (ocrAttachment && ocrAttachment.ocrText) {
    const priceMatch = ocrAttachment.ocrText.match(/(\d+(?:[.,]\d+)?)\s*元/);
    if (priceMatch && !priceField.value) {
      const { confidence, reasons } = computeConfidence("low", ["screenshot_ocr"], ctx);
      priceField = {
        value: parseFloat(priceMatch[1].replace(/,/g, "")),
        confidence,
        reasons,
        evidenceSentence: `[截图OCR] ${ocrAttachment.ocrText}`,
        evidenceRange: [0, 0],
        isEdited: false,
      };
    }
  }

  return {
    id: `cmt-${uuid()}`,
    emailId: email.id,
    supplierId: email.supplierId,
    supplierName: email.supplierName,
    deliveryDate: deliveryField,
    quantity: quantityField,
    price: priceField,
    alternativeMaterials: altField,
    additionalTerms: termsField,
    status: "pending",
    linkedOrderIds: [],
    createdAt: new Date().toISOString(),
    auditLogs: [],
  };
};
