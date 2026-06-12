function calcRoomMetrics(L, W, H) {
  const volume = L * W * H;
  const wallAreas = {
    north:   W * H,
    south:   W * H,
    east:    L * H,
    west:    L * H,
    floor:   L * W,
    ceiling: L * W
  };
  const totalArea = 2 * (L*W + L*H + W*H);
  return { volume, totalArea, wallAreas };
}

function calcSabineRT(A, V, airM) {
  const denominator = A + (airM || 0) * 4 * V;
  if (denominator <= 0.001) return 5.0;
  const rt = 0.161 * V / denominator;
  return Math.max(0.05, Math.min(5.0, rt));
}

function calcEyringRT(A, V, S, airM) {
  const meanAlpha = A / Math.max(S, 0.001);
  const clampedAlpha = Math.min(meanAlpha, 0.95);
  const airTerm = 4 * V * (airM || 0);
  const denom = (-S * Math.log(1 - clampedAlpha)) + airTerm;
  if (denom <= 0.001) return 5.0;
  const rt = 0.161 * V / denom;
  return Math.max(0.05, Math.min(5.0, rt));
}

function estimateCurtainsAbsorption(curtains) {
  const absorption = {};
  for (const f of FREQ_BANDS) absorption[f] = 0;
  if (!Array.isArray(curtains)) return absorption;
  for (const c of curtains) {
    const type = CURTAIN_TYPES[c.type] || CURTAIN_TYPES.medium;
    const area = Math.max(0, (c.widthM || 0)) * Math.max(0, (c.heightM || 0));
    for (const f of FREQ_BANDS) {
      absorption[f] += area * (type.alpha[f] || 0);
    }
  }
  return absorption;
}

function estimateFurnitureAbsorption(items) {
  const absorption = {};
  for (const f of FREQ_BANDS) absorption[f] = 0;
  if (!Array.isArray(items)) return { absorption, totalEqArea: 0 };
  let totalEqArea = 0;
  for (const item of items) {
    const type = FURNITURE_TYPES[item.type];
    if (!type) continue;
    const count = Math.max(0, item.count || 0);
    const profile = FURNITURE_ALPHA_PROFILES[type.alphaProfile] || FURNITURE_ALPHA_PROFILES.mixed;
    const a = type.eqArea * count;
    totalEqArea += a;
    for (const f of FREQ_BANDS) {
      absorption[f] += a * (profile[f] || 0);
    }
  }
  return { absorption, totalEqArea };
}

function getTargetRTByBand(purposeKey, customTargetRT) {
  const purp = PURPOSES[purposeKey] || PURPOSES.voice_studio;
  if (purposeKey === 'custom' && customTargetRT) {
    const out = {};
    for (const f of FREQ_BANDS) {
      out[f] = {
        min: (customTargetRT[f] && customTargetRT[f].min) || purp.rtRange.min,
        max: (customTargetRT[f] && customTargetRT[f].max) || purp.rtRange.max
      };
    }
    return out;
  }
  const out = {};
  const mid = (purp.rtRange.min + purp.rtRange.max) / 2;
  for (const f of FREQ_BANDS) {
    let boost = 0;
    if (f === 125) boost = (purp.rtRange.max - mid) * 0.7;
    if (f === 250) boost = (purp.rtRange.max - mid) * 0.3;
    if (f === 2000 || f === 4000) boost = -(mid - purp.rtRange.min) * 0.15;
    const center = mid + boost;
    const halfRange = (purp.rtRange.max - purp.rtRange.min) / 2 + (purp.flatness / 2);
    out[f] = {
      min: Math.max(0.10, center - halfRange),
      max: center + halfRange
    };
  }
  return out;
}

function runFullCalculation(scheme) {
  const { L, W, H } = scheme.room;
  const metrics = calcRoomMetrics(L, W, H);
  const { volume: V, totalArea: S, wallAreas } = metrics;

  const surfaceDetail = {};
  let totalBudget = 0;
  const materialBreakdown = [];
  const totalAbsorption = {};
  for (const f of FREQ_BANDS) totalAbsorption[f] = 0;

  for (const key of Object.keys(SURFACE_LABELS)) {
    const surfaceConf = scheme.surfaces[key] || {};
    const areaFull = wallAreas[key];
    const coverage = Math.max(0, Math.min(1, surfaceConf.coverage || 0));
    const coveredArea = areaFull * coverage;
    const uncoveredArea = areaFull * (1 - coverage);

    const alpha = getMaterialAlpha(surfaceConf.materialId, surfaceConf.customAlpha);
    const price = getMaterialPrice(surfaceConf.materialId, surfaceConf.customPrice);
    const matName = getMaterialName(surfaceConf.materialId);

    const defaultAlpha = uncoveredArea > 0
      ? getMaterialAlpha('concrete_raw')
      : null;

    const bandAbsorb = {};
    for (const f of FREQ_BANDS) {
      let a = coveredArea * alpha[f];
      if (defaultAlpha) a += uncoveredArea * defaultAlpha[f];
      bandAbsorb[f] = a;
      totalAbsorption[f] += a;
    }

    const lineCost = coveredArea * price;
    totalBudget += lineCost;

    surfaceDetail[key] = {
      label: SURFACE_LABELS[key],
      totalArea: areaFull,
      coveredArea,
      uncoveredArea,
      coverage,
      materialId: surfaceConf.materialId,
      materialName: matName,
      price,
      lineCost,
      alpha,
      bandAbsorb,
      hasCustomAlpha: !!surfaceConf.customAlpha
    };

    if (coveredArea > 0 && surfaceConf.materialId) {
      const existing = materialBreakdown.find(x => x.materialId === surfaceConf.materialId);
      if (existing) {
        existing.totalArea += coveredArea;
        existing.totalCost += lineCost;
        existing.usedOn.push(SURFACE_LABELS[key]);
      } else {
        materialBreakdown.push({
          materialId: surfaceConf.materialId,
          materialName: matName,
          price,
          totalArea: coveredArea,
          totalCost: lineCost,
          usedOn: [SURFACE_LABELS[key]],
          source: (MATERIALS_DB[surfaceConf.materialId] || {}).source || '未知'
        });
      }
    }
  }

  const curtainsAbsorb = estimateCurtainsAbsorption(scheme.curtains);
  for (const f of FREQ_BANDS) totalAbsorption[f] += curtainsAbsorb[f];

  const curtainsArea = (scheme.curtains || []).reduce((s, c) => {
    return s + Math.max(0, c.widthM || 0) * Math.max(0, c.heightM || 0);
  }, 0);

  const furn = estimateFurnitureAbsorption(scheme.furniture);
  for (const f of FREQ_BANDS) totalAbsorption[f] += furn.absorption[f];

  const rt60ByBand = {};
  const formulaUsed = V < 50 ? 'eyring' : 'sabine';
  const calcFn = (V < 50)
    ? (A, f) => calcEyringRT(A, V, S, AIR_ABSORPTION_M[f])
    : (A, f) => calcSabineRT(A, V, AIR_ABSORPTION_M[f]);

  for (const f of FREQ_BANDS) {
    rt60ByBand[f] = calcFn(totalAbsorption[f], f);
  }

  const target = getTargetRTByBand(scheme.purpose, scheme.customTargetRT);

  const bandEvaluation = {};
  for (const f of FREQ_BANDS) {
    const rt = rt60ByBand[f];
    const t = target[f];
    let status, diff;
    if (rt < t.min) { status = 'dry'; diff = rt - t.min; }
    else if (rt > t.max) { status = 'muddy'; diff = rt - t.max; }
    else { status = 'good'; diff = rt - (t.min + t.max) / 2; }
    bandEvaluation[f] = { rt, targetMin: t.min, targetMax: t.max, status, diff };
  }

  const overall = assessOverall(bandEvaluation, V, scheme.purpose);

  return {
    metrics,
    formulaUsed,
    surfaceDetail,
    materialBreakdown,
    totalBudget,
    curtainsAbsorb,
    curtainsArea,
    furniture: furn,
    totalAbsorption,
    rt60ByBand,
    airAbsorption4mV: Object.fromEntries(FREQ_BANDS.map(f => [f, 4 * V * AIR_ABSORPTION_M[f]])),
    target,
    bandEvaluation,
    overall
  };
}

function assessOverall(bandEval, V, purpose) {
  const order = [125, 250, 500, 1000, 2000, 4000];
  const weighted = [];
  for (const f of order) {
    weighted.push({ band: f, ...bandEval[f] });
  }

  const low = weighted.filter(w => w.band <= 250);
  const mid = weighted.filter(w => w.band >= 500 && w.band <= 2000);
  const high = weighted.filter(w => w.band >= 4000);

  const groupStatus = (arr) => {
    const mud = arr.filter(x => x.status === 'muddy').length;
    const dry = arr.filter(x => x.status === 'dry').length;
    if (mud >= arr.length / 2 + 0.01) return 'muddy';
    if (dry >= arr.length / 2 + 0.01) return 'dry';
    return 'good';
  };

  const lowStat = groupStatus(low);
  const midStat = groupStatus(mid);
  const highStat = groupStatus(high);

  let conclusion, suggestions = [];

  if (lowStat === 'muddy') {
    const excess = Math.max(...low.map(x => Math.max(0, x.rt - x.targetMax)));
    const approxArea = Math.ceil(excess * V * 0.6);
    suggestions.push(`低频偏闷，建议增加约 ${approxArea}㎡ 低频吸声 (100mm玻璃棉/低频陷阱/穿孔板)，重点处理 125-250Hz`);
  } else if (lowStat === 'dry' && V < 30) {
    suggestions.push('低频偏干，小房间可考虑减少全频吸声覆盖比例，保留墙角处理即可');
  }

  if (midStat === 'muddy') {
    suggestions.push('中频偏闷，语言清晰度可能下降，考虑增加布艺软包或 50mm 矿棉板');
  } else if (midStat === 'dry') {
    suggestions.push('中频偏干，听感可能不自然，可减少中高频吸声或加入扩散体');
  }

  if (highStat === 'muddy') {
    suggestions.push('高频偏闷，细节发暗，增加聚酯纤维板或厚地毯');
  } else if (highStat === 'dry') {
    suggestions.push('高频过干，易产生疲劳感，考虑减少地毯/窗帘厚度，用扩散代替吸声');
  }

  if (V < 10) {
    suggestions.unshift('⚠️ 房间体积极小 (<10m³)，驻波效应会非常严重，估算结果仅供参考');
  }

  if (suggestions.length === 0) {
    conclusion = '整体混响时间符合目标用途，听感应较为均衡。';
    suggestions.push('声学表现达标。如需更专业：可在墙角增加少量低频陷阱作保险。');
  } else {
    const bads = [];
    if (lowStat === 'muddy') bads.push('低频');
    if (midStat === 'muddy') bads.push('中频');
    if (highStat === 'muddy') bads.push('高频');
    if (bads.length) conclusion = `${bads.join('+')}偏闷，需重点加强吸声。`;
    else conclusion = '部分频段表现不达标，详见下方建议。';
  }

  return { conclusion, suggestions, lowStat, midStat, highStat };
}
