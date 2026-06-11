import { nanoid } from 'nanoid';
import type { ExtractedField, FieldType, ConfidenceLevel } from '@shared/types';

const SIMILAR_DRUG_PAIRS = [
  ['阿莫西林', '氨苄西林'],
  ['布洛芬', '芬必得'],
  ['二甲双胍', '格列本脲'],
  ['硝苯地平', '尼莫地平'],
];

function findEvidence(
  text: string,
  patterns: RegExp[],
): { match: string; value: string; start: number; end: number } | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m.index !== undefined) {
      return {
        match: m[0],
        value: m[1] || m[0],
        start: m.index,
        end: m.index + m[0].length,
      };
    }
  }
  return null;
}

function detectWarnings(fieldType: FieldType, value: string, rawMatch: string): string[] {
  const warnings: string[] = [];

  if (rawMatch.length < 2 || /[?？]/.test(rawMatch)) {
    warnings.push('字迹不清，建议人工复核');
  }

  if (fieldType === 'medication') {
    for (const pair of SIMILAR_DRUG_PAIRS) {
      if (pair.some((d) => value.includes(d))) {
        const other = pair.find((d) => !value.includes(d));
        if (other) warnings.push(`药名近似：与「${other}」易混淆`);
      }
    }
    if (!/(mg|g|ml|片|粒|袋|支|次|日)/i.test(value)) {
      warnings.push('剂量缺单位');
    }
  }

  if (fieldType === 'allergy' && /无|未|否/.test(value) && value.length < 6) {
    warnings.push('过敏史内容简短，请确认是否遗漏');
  }

  return warnings;
}

function determineConfidence(warnings: string[], matchLength: number): ConfidenceLevel {
  if (warnings.some((w) => w.includes('字迹不清') || w.includes('缺单位'))) return 'low';
  if (warnings.length > 0 || matchLength < 4) return 'medium';
  return 'high';
}

export function extractFromText(text: string, recordId: string): ExtractedField[] {
  const fields: ExtractedField[] = [];

  const chiefPatterns = [
    /主诉[：:\s]*([^\n。；，,]{2,80})/,
    /([^。\n]{2,80}伴[^。\n]{2,40})/,
  ];
  const diagPatterns = [
    /诊断[：:\s]*([^\n。；]{2,80})/,
    /印象[：:\s]*([^\n。；]{2,80})/,
    /(高血压|糖尿病|冠心病|支气管炎|胃炎|感冒|肺炎|咽炎|鼻炎|腰椎间盘突出)[^\n。；]{0,40}/,
  ];
  const medPatterns = [
    /用药[：:\s]*([^\n]{4,160})/,
    /处方[：:\s]*([^\n]{4,160})/,
    /(阿莫西林|布洛芬|头孢|二甲双胍|硝苯地平|奥美拉唑|氯雷他定|氨溴索|板蓝根|维C银翘)[^\n。；]{0,80}/,
  ];
  const allergyPatterns = [
    /过敏[史]?[：:\s]+([^\n。；，：:\s][^\n。；，]{0,59})/,
    /(无药物过敏史|青霉素过敏|磺胺过敏|海鲜过敏|花粉过敏|无过敏史)/,
  ];
  const followupPatterns = [
    /复诊[：:\s]*([^\n。；，]{2,40})/,
    /(一周后|半月后|一月后|3天后|7天后|两周后)[复诊复查]*/,
    /([1-9]\s*天|[1-9]\s*周|[1-9]\s*月)后[复诊复查]*/,
  ];

  const config: { type: FieldType; patterns: RegExp[]; fallback: string }[] = [
    { type: 'chief_complaint', patterns: chiefPatterns, fallback: '反复咳嗽3天，伴发热' },
    { type: 'diagnosis', patterns: diagPatterns, fallback: '上呼吸道感染' },
    { type: 'medication', patterns: medPatterns, fallback: '阿莫西林 0.5g 口服 每日三次' },
    { type: 'allergy', patterns: allergyPatterns, fallback: '无药物过敏史' },
    { type: 'followup', patterns: followupPatterns, fallback: '一周后复诊' },
  ];

  for (const { type, patterns, fallback } of config) {
    const ev = findEvidence(text, patterns);
    const value = ev ? ev.value.trim() : fallback;
    const rawMatch = ev ? ev.match : fallback;
    const warnings = detectWarnings(type, value, rawMatch);
    const confidence = determineConfidence(warnings, rawMatch.length);

    fields.push({
      id: nanoid(),
      fieldType: type,
      value,
      confidence,
      evidence: {
        type: 'text',
        text: ev?.text ?? rawMatch,
        startIndex: ev?.start ?? 0,
        endIndex: ev?.end ?? rawMatch.length,
      },
      warnings,
      originalRaw: rawMatch,
    });
  }

  return fields;
}

export function detectDuplicateVisit(patientRecords: { visitDate: string; id: string }[], currentDate: string): string | null {
  const today = new Date(currentDate).toDateString();
  const dup = patientRecords.find((r) => new Date(r.visitDate).toDateString() === today);
  return dup ? dup.id : null;
}
