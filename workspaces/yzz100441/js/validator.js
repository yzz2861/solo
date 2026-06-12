function validateScheme(scheme, result) {
  const issues = [];
  const { L, W, H } = scheme.room;
  const units = scheme.units || 'metric';

  if (L <= 0 || W <= 0 || H <= 0 || isNaN(L) || isNaN(W) || isNaN(H)) {
    issues.push({
      level: 'error',
      code: 'NEGATIVE_DIMENSION',
      message: '房间尺寸必须为正数，请检查长宽高输入',
      field: 'room'
    });
    return issues;
  }

  if (units === 'metric') {
    if (L > 30 || W > 30 || H > 12) {
      issues.push({
        level: 'warning',
        code: 'UNIT_MIX_MISMATCH',
        message: '公制下尺寸过大，您是否把英尺误填入米？请核对单位制式',
        field: 'room',
        suggestion: '建议切换到"英制 (ft)"，或检查数字'
      });
    }
    if (L < 0.8 || W < 0.8 || H < 0.8) {
      issues.push({
        level: 'warning',
        code: 'UNIT_MIX_MISMATCH',
        message: '公制下尺寸过小，您是否把厘米误填入米？',
        field: 'room',
        suggestion: '1 米 = 100 厘米，请将厘米值除以 100'
      });
    }
  } else {
    if (L < 3 || W < 3 || H < 3) {
      issues.push({
        level: 'warning',
        code: 'UNIT_MIX_MISMATCH',
        message: '英制下尺寸过小，您是否把米误填入英尺？',
        field: 'room',
        suggestion: '3ft ≈ 0.9m，正常房间至少 8ft×10ft'
      });
    }
    if (L > 100 || W > 100 || H > 40) {
      issues.push({
        level: 'warning',
        code: 'UNIT_MIX_MISMATCH',
        message: '英制下尺寸过大，数字是否合理？',
        field: 'room'
      });
    }
  }

  const V = L * W * H;
  if (V < 10) {
    issues.push({
      level: 'warning',
      code: 'VOLUME_TOO_SMALL',
      message: `房间体积极小 (${V.toFixed(1)}m³ < 10m³)，驻波效应严重，模型可信度下降`,
      field: 'room',
      suggestion: '建议实际测量后再对比，或加入低频陷阱做保险'
    });
  } else if (V > 500) {
    issues.push({
      level: 'info',
      code: 'LARGE_ROOM_NOTE',
      message: `房间体积 ${V.toFixed(0)}m³，已属大空间，扩散体和非均匀吸声排布会更重要`,
      field: 'room'
    });
  }

  for (const key of Object.keys(scheme.surfaces || {})) {
    const s = scheme.surfaces[key];
    if (!s || !s.materialId) {
      issues.push({
        level: 'warning',
        code: 'MATERIAL_UNSELECTED',
        message: `${SURFACE_LABELS[key]}未选择材料，已按清水混凝土默认估算`,
        field: `surface.${key}`
      });
      continue;
    }
    const alpha = getMaterialAlpha(s.materialId, s.customAlpha);
    const missing = FREQ_BANDS.filter(f => alpha[f] === 0 || isNaN(alpha[f]));
    if (missing.length > 0) {
      issues.push({
        level: 'warning',
        code: 'MISSING_ALPHA',
        message: `${SURFACE_LABELS[key]}所选用材料「${getMaterialName(s.materialId)}」在 ${missing.join(', ')}Hz 系数缺失，已用 0.05 占位`,
        field: `surface.${key}`,
        suggestion: '请查找厂家实测数据或手动填写自定义系数'
      });
    }
    const coverage = s.coverage || 0;
    if (coverage > 1.001) {
      issues.push({
        level: 'warning',
        code: 'COVERAGE_OVERFLOW',
        message: `${SURFACE_LABELS[key]}覆盖率 ${(coverage*100).toFixed(0)}% > 100%，已按满贴处理`,
        field: `surface.${key}`
      });
    }
  }

  if (result) {
    const largestWallArea = Math.max(
      (result.metrics.wallAreas.north),
      (result.metrics.wallAreas.east)
    );
    const excessThreshold = largestWallArea * 0.8;
    if (result.furniture.totalEqArea + result.curtainsArea > excessThreshold) {
      issues.push({
        level: 'warning',
        code: 'FURNITURE_EXCESS',
        message: `附加吸声体 (家具+窗帘) 等效面积约 ${(result.furniture.totalEqArea + result.curtainsArea).toFixed(1)}㎡，已超过最大墙面面积 80%`,
        field: 'furniture',
        suggestion: '实际听感可能比估算更干，建议先不放满家具再测量'
      });
    }

    for (const f of FREQ_BANDS) {
      if (result.rt60ByBand[f] > 3.0) {
        issues.push({
          level: 'warning',
          code: 'RT_ABNORMAL',
          message: `${f}Hz 混响时间 ${result.rt60ByBand[f].toFixed(2)}s > 3s，房间可能严重嗡嗡作响`,
          field: `result.${f}`
        });
      }
      if (result.rt60ByBand[f] < 0.1 && V > 20) {
        issues.push({
          level: 'warning',
          code: 'RT_ABNORMAL',
          message: `${f}Hz 混响时间过短 (<0.1s)，可能过度吸声`,
          field: `result.${f}`
        });
      }
    }
  }

  return issues;
}
