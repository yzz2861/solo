import Papa from 'papaparse';
import type {
  FiringPlan,
  PlanSegment,
  SpecialEvent,
  WorkBatch,
  StudentWork,
  GlazeRecipe,
  SegmentType,
  ColorDeviation,
  TemperatureUnit,
} from '../types';
import { generateId } from './curveCalc';

export interface PlanParseResult {
  plan: FiringPlan;
  warnings: string[];
}

export interface EventParseResult {
  events: SpecialEvent[];
  warnings: string[];
}

export interface WorksParseResult {
  batches: WorkBatch[];
  allWorks: StudentWork[];
  warnings: string[];
}

const typeMap: Record<string, SegmentType> = {
  'heating': 'heating',
  '升温': 'heating',
  '升温段': 'heating',
  'holding': 'holding',
  '保温': 'holding',
  '保温段': 'holding',
  'cooling': 'cooling',
  '降温': 'cooling',
  '降温段': 'cooling',
};

function detectSegmentType(value: string): SegmentType {
  const v = value.toLowerCase().trim();
  for (const key of Object.keys(typeMap)) {
    if (v.includes(key.toLowerCase())) return typeMap[key];
  }
  const num = Number(value);
  if (!isNaN(num)) {
    if (num > 10) return 'heating';
    if (num < -10) return 'cooling';
    return 'holding';
  }
  return 'heating';
}

function parseNumber(value: any): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.\-]/g, '');
    const num = Number(cleaned);
    return isNaN(num) ? null : num;
  }
  return null;
}

async function parsePlanJSON(file: File, warnings: string[]): Promise<PlanParseResult> {
  const text = await file.text();
  const json = JSON.parse(text);

  let segments: PlanSegment[] = [];
  const planName = json.name || json.title || file.name.replace(/\.[^.]+$/, '');
  let unit: TemperatureUnit = 'C';
  if (json.unit === 'F' || json.unit === '℉') unit = 'F';

  let rawSegments: any[] = [];
  if (json.segments && Array.isArray(json.segments)) rawSegments = json.segments;
  else if (json.stages && Array.isArray(json.stages)) rawSegments = json.stages;
  else if (Array.isArray(json)) rawSegments = json;
  else if (json.plan?.segments) rawSegments = json.plan.segments;

  for (let i = 0; i < rawSegments.length; i++) {
    const s = rawSegments[i];
    const typeStr = s.type || s.stage || s.phase || 'heating';
    const type = detectSegmentType(String(typeStr));
    const startTemp = parseNumber(s.startTemp || s.tempStart || s.fromTemp || 0) ?? 25;
    const endTemp = parseNumber(s.endTemp || s.tempEnd || s.toTemp || s.targetTemp || 0) ?? 100;
    const startTime = parseNumber(s.startTime || s.timeStart || s.fromTime || 0) ?? i;
    const endTime = parseNumber(s.endTime || s.timeEnd || s.toTime || 0) ?? i + 1;
    const rate = parseNumber(s.rate || s.speed);
    const tolerance = parseNumber(s.tolerance || s.tol);
    const duration = endTime - startTime;
    let calcRate: number | undefined;
    if (rate !== null && rate !== undefined) calcRate = rate;
    else if (duration > 0) calcRate = (endTemp - startTemp) / duration;

    segments.push({
      id: generateId(),
      type,
      startTime,
      startTemp,
      endTime,
      endTemp,
      rate: calcRate,
      tolerance: tolerance ?? undefined,
      name: s.name || s.label || s.阶段 || `${typeStr}段 #${i + 1}
    });
  }

  if (segments.length === 0) throw new Error('JSON 中未找到烧成段数据');
  segments.sort((a, b) => a.startTime - b.startTime);

  return {
    plan: {
      id: generateId(),
      name: planName,
      unit,
      description: json.description || `从 ${file.name} 导入的保温计划`,
      segments,
    },
    warnings,
  };
}

async function parsePlanCSV(file: File, warnings: string[]): Promise<PlanParseResult> {
  const text = await file.text();
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const data = results.data as Record<string, any>[];
        if (data.length < 2) { reject(new Error('CSV 至少需要 2 行数据'));
          return;
        }
        const segments: PlanSegment[] = [];
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const typeStr = String(row.type || row.类型 || row.stage || row.阶段 || 'heating');
          const type = detectSegmentType(typeStr));
          const startTime = parseNumber(row.startTime || row.开始时间 || row.t_start || i) ?? i;
          const endTime = parseNumber(row.endTime || row.结束时间 || row.t_end || i + 1) ?? i + 1;
          const startTemp = parseNumber(row.startTemp || row.起始温度 || 25) ?? 25;
          const endTemp = parseNumber(row.endTemp || row.终止温度 || row.temperature || 100) ?? 100;
          const rate = parseNumber(row.rate || row.速率);
          const tolerance = parseNumber(row.tolerance || row.容差);
          const duration = endTime - startTime;
          let calcRate: number | undefined;
          if (rate !== null && rate !== undefined) calcRate = rate;
          else if (duration > 0) calcRate = (endTemp - startTemp) / duration;
          segments.push({
            id: generateId(),
            type,
            startTime,
            startTemp,
            endTime,
            endTemp,
            rate: calcRate,
            tolerance: tolerance ?? undefined,
            name: row.name || row.名称 || row.段名 || `${typeStr}段 #${i + 1}`
          });
        }
        let unit: TemperatureUnit = 'C';
        const unitRow = data.find((r) => r.unit || r.温度单位 || r.tempUnit);
        if (unitRow) {
          const u = String(unitRow.unit || unitRow['温度单位'] || '').toLowerCase();
          if (u.includes('f')) || u.includes('℉')) unit = 'F';
        }
        resolve({
          plan: {
            id: generateId(),
            name: file.name.replace(/\.[^.]+$/, ''),
            unit,
            description: `从 ${file.name} 导入的保温计划，共 ${segments.length} 段`,
            segments,
          },
          warnings,
        });
      },
      error: (err) => reject(err),
    });
  });
}

export async function parsePlanFile(file: File): Promise<PlanParseResult> {
  const warnings: string[] = [];
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'json') return parsePlanJSON(file, warnings);
  if (ext === 'csv') return parsePlanCSV(file, warnings);
  throw new Error('保温计划文件仅支持 JSON 和 CSV 格式');
}

const EVENT_KEYWORDS: { type: SpecialEvent['type']; patterns: RegExp[]; titleKey: string }[] = [
  { type: 'lid_open',
    patterns: [/开盖|开窑门|窑门开启|lid.?open|open.?lid|door.?open/i],
    titleKey: '手动开盖' },
  { type: 'manual_adjust',
    patterns: [/手动|人工|调整|调节|加火|减火|调温|manual|adjust|gas|火力|阀门/],
    titleKey: '人工调整' },
  { type: 'power_loss',
    patterns: [/断电|停电|power.?off|power.?loss|blackout/i],
    titleKey: '断电' },
  { type: 'log_gap',
    patterns: [/断点|中断|missing|gap|pause|暂停/i],
    titleKey: '日志中断' },
  { type: 'other',
    patterns: [/备注|note|remark|event|事件|标记/i],
    titleKey: '备注' },
];

export function detectEventsFromLog(rows: Record<string, any>[]): EventParseResult {
  const events: SpecialEvent[] = [];
  const warnings: string[] = [];
  if (rows.length === 0) return { events, warnings };

  const headers = Object.keys(rows[0]));
  const eventColumn = headers.find((h) =>
    /备注|事件|说明|note|remark|comment|event|状态/i.test(h));
  if (!eventColumn) {
    return { events, warnings: ['未找到事件/备注列，未检测到特殊事件']
    };
  }

  const timeHeaders = headers.filter((h) => /time|时间|timestamp|时刻/i.test(h));
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const eventText = String(row[eventColumn] || '').trim();
    if (!eventText || eventText === 'undefined' || eventText === 'null') continue;

    let matchedType: SpecialEvent['type'] = 'other';
    let matchedTitle = '备注';
    const matchedParams: Record<string, any> = {};
    for (const kw of EVENT_KEYWORDS) {
      if (kw.patterns.some((p) => p.test(eventText))) {
        matchedType = kw.type;
        matchedTitle = kw.titleKey + ': ' + eventText;
        break;
      }
    }

    const timeValue = timeHeaders.length > 0 ? row[timeHeaders[0]] : null;
    let timestamp = Date.now();
    if (timeValue) {
      const t = new Date(String(timeValue))).getTime();
      if (!isNaN(t)) timestamp = t;
    }

    const durationMatch = eventText.match(/(\d+)\s*(分钟|分|min|minute)/i);
    const durationMinutes = durationMatch ? Number(durationMatch[1]) : undefined;
    const openDegreeMatch = eventText.match(/(\d+)\s*[%度]|开度|open.*?(\d+)/i);
    if (openDegreeMatch) matchedParams.openDegree = Number(openDegreeMatch[1]) || Number(openDegreeMatch[2]));
    const tempMatch = eventText.match(/(\d{2,4})\s*[℃°cC度]/);
    if (tempMatch) matchedParams.temperature = Number(tempMatch[1]);

    events.push({
      id: generateId(),
      timestamp,
      timeHours: 0,
      type: matchedType,
      title: matchedTitle,
      description: eventText,
      durationMinutes,
      params: Object.keys(matchedParams)).length > 0 ? matchedParams : undefined,
    });
  }
  events.sort((a, b) => a.timestamp - b.timestamp));
  return { events, warnings };
}

const deviationMap: Record<string, ColorDeviation> = {
  '极佳': 'excellent',
  '完美': 'excellent',
  '优秀': 'excellent',
  '正常': 'good',
  '良好': 'good',
  '微偏': 'slight',
  '轻微': 'slight',
  '明显偏差': 'significant',
  '偏差大': 'significant',
  '失败': 'failed',
  '报废': 'failed',
};

function detectDeviation(value: string): ColorDeviation {
  const v = value.toLowerCase().trim();
  for (const key of Object.keys(deviationMap)) {
    if (v.includes(key.toLowerCase())) return deviationMap[key];
  }
  return 'good';
}

function parseIngredients(text: string): { name: string; percentage: number }[] {
  if (!text) return [];
  const result: { name: string; percentage: number }[] = [];
  const parts = text.split(/[，,、;；\n]/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(.+?)\s*[:：]\s*(\d+(?:\.\d+)?\s*%?$/);
    if (match) {
      result.push({ name: match[1]).trim(), percentage: Number(match[2])));
    } else {
      const numMatch = trimmed.match(/(\d+(?:\.\d+)?/);
      const name = trimmed.replace(/\d+(\.\d+)?%?/g, '').trim();
      if (numMatch && name) result.push({ name, percentage: Number(numMatch[1])));
      else if (name) result.push({ name, percentage: 0));
    }
  }
  return result;
}

function parseWorkFromObject(obj: any, warnings: string[]): StudentWork {
  const glazeName = obj.glazeName || obj.glaze || obj.釉料 || obj.釉 || '';
  const ingredientsText = obj.ingredients || obj.配方 || '';
  const ingredients = typeof ingredientsText === 'string' ? parseIngredients(ingredientsText) : [];
  const firingTemp = Number(obj.firingTemp || obj.烧成温度 || 1240));
  const glaze: GlazeRecipe = {
    id: generateId(),
    name: glazeName,
    ingredients,
    firingTemp: isNaN(firingTemp) ? 1240 : firingTemp,
    notes: obj.glazeNotes || obj.釉料备注 || '',
  };
  const deviationStr = String(obj.colorDeviation || obj.偏差 || obj.grade || obj.评级 || 'good');
  const colorDeviation = detectDeviation(deviationStr));
  return {
    id: generateId(),
    studentName: obj.studentName || obj.学生 || obj.author || obj.姓名 || '',
    workName: obj.workName || obj.作品名 || obj.name || obj.title || '',
    glaze,
    expectedColor: obj.expectedColor || obj.预期颜色 || '',
    actualColor: obj.actualColor || obj.实际颜色 || '',
    colorDeviation,
    notes: obj.notes || obj.备注 || '',
    relatedSegmentIds: obj.relatedSegmentIds || [],
    relatedEventIds: obj.relatedEventIds || [],
    impactExplanation: obj.impactExplanation || obj.影响分析 || '',
    shelfPosition: obj.shelfPosition || obj.窑位 || obj.position || '',
  };
}

async function parseWorksJSON(file: File, warnings: string[]): Promise<WorksParseResult> {
  const text = await file.text();
  const json = JSON.parse(text));
  let batches: WorkBatch[] = [];
  let allWorks: StudentWork[] = [];

  if (json.batches && Array.isArray(json.batches)) {
    for (const b of json.batches) {
      const works = (b.works || b.作品 || b.items || []).map((w: any) =>
        parseWorkFromObject(w, warnings));
      batches.push({
        id: generateId(),
        name: b.name || b.批次名称 || b.batchName || '未命名批次',
        shelfPosition: b.shelfPosition || b.窑位 || b.position || '',
        works,
      });
      allWorks = allWorks.concat(works));
    }
  } else if (json.works && Array.isArray(json.works)) {
    const works = json.works.map((w: any) => parseWorkFromObject(w, warnings));
    batches = [{
      id: generateId(),
      name: json.batchName || json.name || '导入批次',
      shelfPosition: json.shelfPosition || json.窑位 || '',
      works,
    }];
    allWorks = works;
  } else if (Array.isArray(json)) {
    const works = json.map((w) => parseWorkFromObject(w, warnings)));
    batches = [{
      id: generateId(),
      name: file.name.replace(/\.[^.]+$/, ''),
      shelfPosition: '',
      works,
    }];
    allWorks = works;
  } else {
    throw new Error('JSON 中未找到作品数据结构');
  }
  if (allWorks.length === 0) throw new Error('导入文件中没有作品记录');
  return { batches, allWorks, warnings };
}

async function parseWorksCSV(file: File, warnings: string[]): Promise<WorksParseResult> {
  const text = await file.text();
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const data = results.data as Record<string, any>[];
        if (data.length === 0) { reject(new Error('CSV 中没有作品记录'));
          return;
        }
        const works: StudentWork[] = [];
        const batchMap = new Map<string, StudentWork[]>();
        for (const row of data) {
          const work = parseWorkFromObject(row, warnings));
          works.push(work));
          const batchKey = String(row.batchName || row.批次 || row.batches || '导入批次');
          if (!batchMap.has(batchKey)) batchMap.set(batchKey, []));
          batchMap.get(batchKey)!.push(work));
        }
        const batches: WorkBatch[] = Array.from(batchMap.entries())).map(([name, ws]) => ({
          id: generateId(),
          name,
          shelfPosition: '',
          works: ws,
        }));
        resolve({ batches, allWorks: works, warnings });
      },
      error: (err) => reject(err),
    });
  });
}

export async function parseWorksFile(file: File): Promise<WorksParseResult> {
  const warnings: string[] = [];
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'json') return parseWorksJSON(file, warnings);
  if (ext === 'csv') return parseWorksCSV(file, warnings));
  throw new Error('作品文件仅支持 JSON 和 CSV 格式');
}

export function generatePlanTemplateCSV(): string {
  return [
    'type,name,startTime,startTemp,endTime,endTemp,rate,tolerance',
    'heating,低温脱水段,0,25,2,200,87.5,',
    'heating,中温预热段,2,200,6,600,100,',
    'heating,高温升温段,6,600,10,1000,100,',
    'heating,釉烧末段,10,1000,12,1240,120,',
    'holding,高温保温,12,1240,13.5,1240,0,5',
    'cooling,急冷段,13.5,1240,16,900,-136,',
    'cooling,缓冷段,16,900,20,500,-100,',
    'cooling,炉冷至出窑,20,500,26,80,-70,',
  ].join('\n');
}

export function generateWorksTemplateCSV(): string {
  return [
    'studentName,workName,glaze,expectedColor,actualColor,colorDeviation,shelfPosition,notes',
    '张三,荷叶碗,天青釉,温润天青色,青色偏灰,slight,A层左前,升温可能过快',
    '李四,品茗杯,天目釉,深褐油滴,兔毫纹清晰,good,B层中心,',
    '王五,花瓶,月白釉,乳白泛蓝,灰蒙失透,failed,D层左后,靠近窑门温度偏低',
  ].join('\n');
}
        works,
      },
    ];
    allWorks = works;
  } else {
    throw new Error('未能从 JSON 文件中识别作品数据，请检查格式');
  }

  if (allWorks.length === 0) {
    throw new Error('导入的文件中没有找到作品记录');
  }

  return { batches, allWorks, warnings };
}

function parseBatchFromObject(obj: any, warnings: string[]): WorkBatch {
  const works = (obj.works || obj.作品 || obj.items || []).map((w: any) =>
    parseWorkFromObject(w, warnings),
  );

  return {
    id: generateId(),
    name: obj.name || obj.批次名称 || obj.batchName || '未命名批次',
    shelfPosition: obj.shelfPosition || obj.窑位 || obj.position || '',
    works,
  };
}

function parseWorkFromObject(obj: any, warnings: string[]): StudentWork {
  const glazeName = obj.glazeName || obj.glaze || obj.釉料 || obj.釉 || '';
  const ingredientsText = obj.ingredients || obj.配方 || obj.ingredientList || '';
  const ingredients = typeof ingredientsText === 'string' ? parseIngredients(ingredientsText) : [];

  const firingTemp = Number(obj.firingTemp || obj.烧成温度 || obj.targetTemp || 1240);

  const glaze: GlazeRecipe = {
    id: generateId(),
    name: glazeName,
    ingredients,
    firingTemp: isNaN(firingTemp) ? 1240 : firingTemp,
    notes: obj.glazeNotes || obj.釉料备注 || '',
  };

  const deviationStr = String(obj.colorDeviation || obj.偏差 || obj.grade || obj.评级 || 'good');
  const colorDeviation = detectDeviation(deviationStr);

  return {
    id: generateId(),
    studentName: obj.studentName || obj.学生 || obj.author || obj.姓名 || '',
    workName: obj.workName || obj.作品名 || obj.name || obj.title || '',
    glaze,
    expectedColor: obj.expectedColor || obj.预期颜色 || obj.目标色 || '',
    actualColor: obj.actualColor || obj.实际颜色 || obj.出窑颜色 || '',
    colorDeviation,
    notes: obj.notes || obj.备注 || obj.remark || '',
    relatedSegmentIds: obj.relatedSegmentIds || [],
    relatedEventIds: obj.relatedEventIds || [],
    impactExplanation: obj.impactExplanation || obj.影响分析 || obj.讲评 || '',
    shelfPosition: obj.shelfPosition || obj.窑位 || obj.position || '',
    beforePhotoUrl: obj.beforePhotoUrl || obj.素烧图 || undefined,
    afterPhotoUrl: obj.afterPhotoUrl || obj.成瓷图 || undefined,
  };
}

async function parseWorksCSV(file: File, warnings: string[]): Promise<WorksParseResult> {
  const text = await file.text();

  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const data = results.data as Record<string, any>[];

        if (data.length === 0) {
          reject(new Error('CSV 文件中没有作品记录'));
          return;
        }

        const works: StudentWork[] = [];
        const batchMap = new Map<string, StudentWork[]>();

        for (const row of data) {
          const work = parseWorkFromObject(row, warnings);
          works.push(work);

          const batchKey = String(row.batchName || row.批次 || row.batches || '导入批次');
          if (!batchMap.has(batchKey)) batchMap.set(batchKey, []);
          batchMap.get(batchKey)!.push(work);
        }

        const batches: WorkBatch[] = Array.from(batchMap.entries()).map(([name, ws]) => ({
          id: generateId(),
          name,
          shelfPosition: '',
          works: ws,
        }));

        resolve({ batches, allWorks: works, warnings });
      },
      error: (err) => reject(err),
    });
  });
}

// ============ 导出模板生成 ============

export function generatePlanTemplateCSV(): string {
  return [
    'type,name,startTime,startTemp,endTime,endTemp,rate,tolerance',
    'heating,低温脱水段,0,25,2,200,87.5,',
    'heating,中温预热段,2,200,6,600,100,',
    'heating,高温升温段,6,600,10,1000,100,',
    'heating,釉烧末段,10,1000,12,1240,120,',
    'holding,高温保温,12,1240,13.5,1240,0,5',
    'cooling,急冷段,13.5,1240,16,900,-136,',
    'cooling,缓冷段,16,900,20,500,-100,',
    'cooling,炉冷至出窑,20,500,26,80,-70,',
  ].join('\n');
}

export function generateWorksTemplateCSV(): string {
  return [
    'studentName,workName,glaze,expectedColor,actualColor,colorDeviation,shelfPosition,notes',
    '张三,荷叶碗,天青釉,温润天青色,青色偏灰,slight,A层左前,升温可能过快',
    '李四,品茗杯,天目釉,深褐油滴,兔毫纹清晰,good,B层中心,',
    '王五,花瓶,月白釉,乳白泛蓝,灰蒙失透,failed,D层左后,靠近窑门温度偏低',
  ].join('\n');
}
