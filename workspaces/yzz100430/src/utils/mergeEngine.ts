import {
  Village,
  Well,
  SampleRecord,
  LabResult,
  FeedbackRecord,
  MergedRecord,
  ThresholdConfig,
  RiskLevel,
  ExceedFlags,
  MergeStats,
} from '@/types/well';

const parseDate = (s: string) => new Date(s).getTime();

const diffDays = (a: string, b: string) =>
  Math.abs(Math.round((parseDate(a) - parseDate(b)) / 86400000));

export function normalizeNitrate(
  value: number,
  unit: 'mg/L' | 'μg/L' | string,
): number {
  if (!unit) return value;
  if (unit === 'mg/L' || unit === 'mg/l' || unit === 'mg每升') return value;
  if (
    unit === 'μg/L' ||
    unit === 'ug/L' ||
    unit === 'µg/L' ||
    unit === '微克每升' ||
    unit === 'ug每升'
  ) {
    return value / 1000;
  }
  return value;
}

function detectExceeds(
  nitrate: number,
  turbidity: number,
  coliform: number,
  th: ThresholdConfig,
): ExceedFlags {
  const hasNitrate = !isNaN(nitrate) && nitrate >= th.nitrateStop;
  const hasTurbidity = !isNaN(turbidity) && turbidity >= th.turbidityStop;
  const hasColiform = !isNaN(coliform) && coliform >= th.coliformStop;
  const bNitrate = !hasNitrate && !isNaN(nitrate) && nitrate >= th.nitrateRetest;
  const bTurbidity =
    !hasTurbidity && !isNaN(turbidity) && turbidity >= th.turbidityRetest;
  const bColiform =
    !hasColiform && !isNaN(coliform) && coliform >= th.coliformRetest;
  return {
    nitrate: hasNitrate,
    turbidity: hasTurbidity,
    coliform: hasColiform,
    nitrateBoundary: bNitrate,
    turbidityBoundary: bTurbidity,
    coliformBoundary: bColiform,
  };
}

function decideRisk(
  lab: LabResult | undefined,
  sample: SampleRecord | undefined,
  nitrateMgL: number,
  turbidityNtu: number,
  coliformCfu: number,
  hasOdor: boolean,
  missingSample: boolean,
  missingLab: boolean,
  th: ThresholdConfig,
): RiskLevel {
  const stopByValue =
    nitrateMgL >= th.nitrateStop ||
    turbidityNtu >= th.turbidityStop ||
    coliformCfu >= th.coliformStop;

  if (stopByValue) return 'STOP';

  const hasAnyBoundary =
    nitrateMgL >= th.nitrateRetest ||
    turbidityNtu >= th.turbidityRetest ||
    coliformCfu >= th.coliformRetest;

  if (lab && hasOdor && hasAnyBoundary) return 'STOP';
  if (missingSample || missingLab) return 'RETEST';
  if (sample?.postRain && turbidityNtu >= 2) return 'RETEST';
  if (hasOdor) return 'RETEST';
  if (hasAnyBoundary) return 'RETEST';
  if (sample?.postRain) return 'RETEST';

  return 'OBSERVE';
}

export interface MergeContext {
  villages: Village[];
  wells: Well[];
  samples: SampleRecord[];
  labResults: LabResult[];
  feedbacks: FeedbackRecord[];
  thresholds: ThresholdConfig;
}

export function mergeAndAnalyze(ctx: MergeContext): {
  records: MergedRecord[];
  stats: MergeStats;
} {
  const { villages, wells, samples, labResults, feedbacks, thresholds } = ctx;

  const villageById = new Map(villages.map((v) => [v.id, v]));
  const villageByCode = new Map(
    villages.map((v) => [v.code.toLowerCase(), v]),
  );
  const villageByName = new Map(villages.map((v) => [v.name, v]));

  const wellById = new Map(wells.map((w) => [w.id, w]));
  const wellByKey = new Map<string, Well>();
  wells.forEach((w) => {
    const v = villageById.get(w.villageId);
    if (v) {
      wellByKey.set(`${v.code}-${w.officialNo}`.toLowerCase(), w);
      wellByKey.set(`${v.name}-${w.officialNo}`, w);
      wellByKey.set(`${v.name}-${w.commonName}`, w);
      wellByKey.set(`${v.code}-${w.commonName}`.toLowerCase(), w);
    }
  });

  const findWell = (villageKey: string, wellKey: string): Well | undefined => {
    if (!villageKey || !wellKey) return undefined;
    return (
      wellByKey.get(`${villageKey}-${wellKey}`) ||
      wellByKey.get(
        `${villageKey.toLowerCase()}-${wellKey.toLowerCase()}`,
      )
    );
  };

  const findVillage = (key?: string): Village | undefined => {
    if (!key) return undefined;
    return (
      villageByCode.get(key.toLowerCase()) ||
      villageByName.get(key) ||
      villageById.get(key)
    );
  };

  const sampleBySampleId = new Map(samples.map((s) => [s.id, s]));

  const samplesByWell = new Map<string, SampleRecord[]>();
  samples.forEach((s) => {
    if (!samplesByWell.has(s.wellId)) samplesByWell.set(s.wellId, []);
    samplesByWell.get(s.wellId)!.push(s);
  });
  samplesByWell.forEach((list) =>
    list.sort((a, b) => parseDate(a.sampleDate) - parseDate(b.sampleDate)),
  );

  const findClosestSample = (
    wellId: string,
    date: string,
    daysTol: number,
  ): SampleRecord | undefined => {
    const list = samplesByWell.get(wellId);
    if (!list || list.length === 0) return undefined;
    let best: SampleRecord | undefined;
    let bestDiff = Infinity;
    list.forEach((s) => {
      const d = diffDays(s.sampleDate, date);
      if (d <= daysTol && d < bestDiff) {
        best = s;
        bestDiff = d;
      }
    });
    return best;
  };

  const matchFeedbacksForWell = (
    wellId: string,
    date: string,
    daysTol: number,
  ): FeedbackRecord[] => {
    const out: FeedbackRecord[] = [];
    feedbacks.forEach((f) => {
      let matched = false;
      if (f.matchedWellId === wellId) matched = true;
      if (!matched) {
        const fV = findVillage(f.villageName);
        if (fV) {
          const w =
            findWell(fV.code, f.wellNoOrName) ||
            findWell(fV.name, f.wellNoOrName);
          if (w && w.id === wellId) matched = true;
        }
      }
      if (matched && Math.abs(diffDays(f.reportDate, date)) <= daysTol) {
        out.push(f);
      }
    });
    return out;
  };

  const labBySampleId = new Map<string, LabResult>();
  labResults.forEach((l) => {
    if (l.sampleId) labBySampleId.set(l.sampleId, l);
  });

  const allDates = new Set<string>();

  samples.forEach((s) => {
    const w = wellById.get(s.wellId);
    if (!w) return;
    const v = villageById.get(w.villageId);
    if (!v) return;
    allDates.add(`${w.id}__${s.sampleDate}`);
  });

  labResults.forEach((l) => {
    let well: Well | undefined;
    if (l.sampleId && sampleBySampleId.has(l.sampleId)) {
      well = wellById.get(sampleBySampleId.get(l.sampleId)!.wellId);
    }
    if (!well) {
      const v = findVillage(l.villageCode);
      if (v) well = findWell(v.code, l.wellNo) || findWell(v.name, l.wellNo);
    }
    if (!well) return;
    const sample = l.sampleId
      ? sampleBySampleId.get(l.sampleId)
      : findClosestSample(well.id, l.labDate, 3);
    const keyDate = sample ? sample.sampleDate : l.labDate;
    allDates.add(`${well.id}__${keyDate}`);
  });

  const sortedKeys = Array.from(allDates).sort();
  const merged: MergedRecord[] = [];

  sortedKeys.forEach((key) => {
    const [wellId, dateStr] = key.split('__');
    const w = wellById.get(wellId);
    if (!w) return;
    const v = villageById.get(w.villageId);
    if (!v) return;

    const sample =
      samplesByWell.get(w.id)?.find((s) => s.sampleDate === dateStr) ||
      findClosestSample(w.id, dateStr, 1);

    let lab: LabResult | undefined;
    if (sample && labBySampleId.has(sample.id)) {
      lab = labBySampleId.get(sample.id);
    }
    if (!lab) {
      const vCode = v.code.toLowerCase();
      lab = labResults.find(
        (lr) =>
          lr.villageCode.toLowerCase() === vCode &&
          (lr.wellNo === w.officialNo || lr.wellNo === w.commonName) &&
          diffDays(lr.labDate, dateStr) <= 3,
      );
    }

    const nitrateMgL = lab
      ? normalizeNitrate(lab.nitrate, lab.nitrateUnit)
      : NaN;

    const exceeds: ExceedFlags = lab
      ? detectExceeds(
          nitrateMgL,
          lab.turbidity,
          lab.coliform,
          thresholds,
        )
      : {
          nitrate: false,
          turbidity: false,
          coliform: false,
          nitrateBoundary: false,
          turbidityBoundary: false,
          coliformBoundary: false,
        };

    const matchedFeedbacks = matchFeedbacksForWell(w.id, dateStr, 7);
    const hasOdor = matchedFeedbacks.length > 0;
    const missingSample = !sample;
    const missingLab = !lab;

    const risk = decideRisk(
      lab,
      sample,
      nitrateMgL,
      lab ? lab.turbidity : NaN,
      lab ? lab.coliform : NaN,
      hasOdor,
      missingSample,
      missingLab,
      thresholds,
    );

    merged.push({
      id: key,
      wellId: w.id,
      wellCommonName: w.commonName,
      villageId: v.id,
      villageName: v.name,
      sampleDate: dateStr,
      sample,
      lab,
      feedbacks: matchedFeedbacks,
      hasOdorFeedback: hasOdor,
      postRain: !!sample?.postRain,
      missingSample,
      missingLab,
      nitrateMgL,
      turbidityNtu: lab ? lab.turbidity : NaN,
      coliformCfu: lab ? lab.coliform : NaN,
      exceeds,
      riskLevel: risk,
    });
  });

  merged.sort(
    (a, b) =>
      parseDate(b.sampleDate) - parseDate(a.sampleDate) ||
      a.villageName.localeCompare(b.villageName) ||
      a.wellCommonName.localeCompare(b.wellCommonName),
  );

  const stats: MergeStats = {
    totalWells: wells.length,
    totalRecords: merged.length,
    matchedSampleLab: merged.filter((r) => r.sample && r.lab).length,
    missingSample: merged.filter((r) => r.missingSample).length,
    missingLab: merged.filter((r) => r.missingLab).length,
    postRainCount: merged.filter((r) => r.postRain).length,
    odorFeedbackCount: merged.filter((r) => r.hasOdorFeedback).length,
    stopCount: merged.filter((r) => r.riskLevel === 'STOP').length,
    retestCount: merged.filter((r) => r.riskLevel === 'RETEST').length,
    observeCount: merged.filter((r) => r.riskLevel === 'OBSERVE').length,
  };

  return { records: merged, stats };
}
