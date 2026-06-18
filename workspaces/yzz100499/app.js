// ============================================================
// 温泉矿物配比复核系统 - 核心逻辑
// ============================================================

const UNITS = ['mg/L', 'ppm', '%'];

const DEFAULT_MINERALS = [
  { name: '偏硅酸',  sourceValue: 80,  sourceUnit: 'mg/L', makeupValue: null, makeupUnit: 'mg/L', targetMin: 50,  targetMax: 120, targetUnit: 'mg/L' },
  { name: '氟化物',  sourceValue: 5,   sourceUnit: 'mg/L', makeupValue: null, makeupUnit: 'mg/L', targetMin: 2,   targetMax: 10,  targetUnit: 'mg/L' },
  { name: '锶',      sourceValue: 8,   sourceUnit: 'mg/L', makeupValue: null, makeupUnit: 'mg/L', targetMin: 5,   targetMax: 20,  targetUnit: 'mg/L' },
  { name: '总矿化度', sourceValue: 1200, sourceUnit: 'mg/L', makeupValue: null, makeupUnit: 'mg/L', targetMin: 800, targetMax: 2000, targetUnit: 'mg/L' }
];

let currentMinerals = [];
let calculationResult = null;
let currentAlerts = [];
let historyData = [];

// ============================================================
// 单位转换工具
// ============================================================

function convertToMgL(value, unit) {
  if (value === null || value === undefined || value === '') return null;
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  
  switch (unit) {
    case 'mg/L':
      return num;
    case 'ppm':
      return num;
    case '%':
      return num * 10000;
    default:
      return num;
  }
}

function convertFromMgL(valueMgL, targetUnit) {
  if (valueMgL === null || valueMgL === undefined) return null;
  
  switch (targetUnit) {
    case 'mg/L':
      return valueMgL;
    case 'ppm':
      return valueMgL;
    case '%':
      return valueMgL / 10000;
    default:
      return valueMgL;
  }
}

function formatValue(value, unit, decimals = 2) {
  if (value === null || value === undefined) return '-';
  return value.toFixed(decimals) + ' ' + unit;
}

// ============================================================
// 核心计算逻辑
// ============================================================

function calculateMixing(poolVolume, makeupVolume, minerals, filterDuration, filterEfficiency) {
  const results = [];
  const V_total = poolVolume + makeupVolume;
  
  minerals.forEach((mineral, index) => {
    const C_source_mgL = convertToMgL(mineral.sourceValue, mineral.sourceUnit);
    const C_makeup_mgL = mineral.makeupValue !== null && mineral.makeupValue !== '' 
      ? convertToMgL(mineral.makeupValue, mineral.makeupUnit) 
      : null;
    
    const C_target_min_mgL = convertToMgL(mineral.targetMin, mineral.targetUnit);
    const C_target_max_mgL = convertToMgL(mineral.targetMax, mineral.targetUnit);
    
    const isMakeupMissing = C_makeup_mgL === null;
    const assumeSame = document.getElementById('assumeSameAsSource').checked;
    const C_makeup_used = isMakeupMissing ? (assumeSame ? C_source_mgL : null) : C_makeup_mgL;
    
    let C_mixed_mgL = null;
    let C_afterFilter_mgL = null;
    let status = 'normal';
    let calcSteps = {};
    
    if (C_source_mgL !== null && C_makeup_used !== null && V_total > 0) {
      C_mixed_mgL = (C_source_mgL * poolVolume + C_makeup_used * makeupVolume) / V_total;
      
      const filterFactor = 1 - (filterEfficiency / 100) * (filterDuration / 24);
      C_afterFilter_mgL = C_mixed_mgL * Math.max(filterFactor, 0.8);
      
      calcSteps = {
        formula: 'C混 = (C原 × V原 + C补 × V补) / V总',
        sourceMass: C_source_mgL * poolVolume / 1000,
        makeupMass: C_makeup_used * makeupVolume / 1000,
        totalMass: (C_source_mgL * poolVolume + C_makeup_used * makeupVolume) / 1000,
        mixedConc: C_mixed_mgL,
        filterFactor: filterFactor,
        finalConc: C_afterFilter_mgL
      };
      
      if (C_target_min_mgL !== null && C_target_max_mgL !== null) {
        if (C_afterFilter_mgL < C_target_min_mgL) {
          status = 'danger';
        } else if (C_afterFilter_mgL > C_target_max_mgL) {
          status = 'warning';
        } else {
          status = 'normal';
        }
      }
    }
    
    const changePercent = C_source_mgL && C_afterFilter_mgL 
      ? ((C_afterFilter_mgL - C_source_mgL) / C_source_mgL * 100) 
      : null;
    
    results.push({
      index,
      name: mineral.name,
      sourceValue: mineral.sourceValue,
      sourceUnit: mineral.sourceUnit,
      sourceMgL: C_source_mgL,
      makeupValue: mineral.makeupValue,
      makeupUnit: mineral.makeupUnit,
      makeupMgL: C_makeup_mgL,
      isMakeupMissing,
      makeupUsed: C_makeup_used,
      targetMin: mineral.targetMin,
      targetMax: mineral.targetMax,
      targetUnit: mineral.targetUnit,
      targetMinMgL: C_target_min_mgL,
      targetMaxMgL: C_target_max_mgL,
      mixedMgL: C_mixed_mgL,
      afterFilterMgL: C_afterFilter_mgL,
      changePercent,
      status,
      calcSteps,
      targetUnitDisplay: mineral.targetUnit || 'mg/L'
    });
  });
  
  return {
    poolVolume,
    makeupVolume,
    totalVolume: V_total,
    filterDuration,
    filterEfficiency,
    minerals: results
  };
}

// ============================================================
// 异常检测
// ============================================================

function detectAnomalies() {
  const alerts = [];
  
  const startTime = document.getElementById('makeupStartTime').value;
  const endTime = document.getElementById('makeupEndTime').value;
  
  if (startTime && endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (end < start) {
      alerts.push({
        type: 'danger',
        title: '时间逻辑错误',
        message: '补水结束时间早于开始时间，请检查'
      });
    } else {
      const startDay = start.toDateString();
      const endDay = end.toDateString();
      
      if (startDay !== endDay) {
        const hours = (end - start) / (1000 * 60 * 60);
        alerts.push({
          type: 'warning',
          title: '补水时间跨天',
          message: `补水跨越 ${endDay}，时长约 ${hours.toFixed(1)} 小时。建议确认补水期间水质是否稳定，必要时分段取样检测。`
        });
      }
    }
  }
  
  const filterEfficiency = parseFloat(document.getElementById('filterEfficiency').value);
  const filterDuration = parseFloat(document.getElementById('filterDuration').value);
  
  if (!isNaN(filterEfficiency)) {
    if (filterEfficiency > 15) {
      alerts.push({
        type: 'warning',
        title: '过滤效率偏高',
        message: `当前设定过滤效率为 ${filterEfficiency}%，超出正常范围（3-8%）。可能存在过滤异常，请检查过滤设备运行状态和滤料是否需要更换。`
      });
    } else if (filterEfficiency < 2 && filterEfficiency > 0) {
      alerts.push({
        type: 'warning',
        title: '过滤效率偏低',
        message: `当前设定过滤效率为 ${filterEfficiency}%，低于正常范围（3-8%）。可能存在过滤效果不佳的情况，请检查过滤循环系统。`
      });
    }
  }
  
  if (!isNaN(filterDuration) && filterDuration > 24) {
    alerts.push({
      type: 'info',
      title: '过滤时长较长',
      message: `过滤时长 ${filterDuration} 小时超过一天，请注意长时间过滤对矿物质浓度的累积影响。`
    });
  }
  
  const abnormalNotes = document.getElementById('abnormalNotes').value.trim();
  if (abnormalNotes) {
    alerts.push({
      type: 'warning',
      title: '有异常记录',
      message: `备注中记录了异常情况：${abnormalNotes}。请在分析结果时综合考虑。`
    });
  }
  
  currentMinerals.forEach((mineral, index) => {
    if (!mineral.sourceValue || mineral.sourceValue === '') {
      alerts.push({
        type: 'warning',
        title: '数据缺测提醒',
        message: `「${mineral.name}」的原水浓度未填写，无法参与计算。`
      });
    }
    if ((!mineral.makeupValue || mineral.makeupValue === '') && !document.getElementById('assumeSameAsSource').checked) {
      alerts.push({
        type: 'warning',
        title: '补水浓度缺测',
        message: `「${mineral.name}」的补水浓度未填写，且未启用「缺测项默认补水浓度与原水相同」。该指标将无法计算。`
      });
    }
  });
  
  const poolVolume = parseFloat(document.getElementById('poolVolume').value);
  const makeupVolume = parseFloat(document.getElementById('makeupVolume').value);
  if (!isNaN(makeupVolume) && !isNaN(poolVolume) && poolVolume > 0) {
    const makeupRatio = makeupVolume / poolVolume;
    if (makeupRatio > 0.5) {
      alerts.push({
        type: 'info',
        title: '补水量较大',
        message: `补水量占池体的 ${(makeupRatio * 100).toFixed(1)}%，属于大水量补水，对矿物质浓度影响可能较大。`
      });
    }
  }
  
  return alerts;
}

// ============================================================
// 店长版报告
// ============================================================

function generateManagerReport(result, alerts) {
  const testDate = document.getElementById('testDate').value || '未填写';
  const sampleLocation = document.getElementById('sampleLocation').value || '未填写';
  
  let html = `
    <div class="report-title">
      <h2>温泉矿物质配比复核报告（店长版）</h2>
      <p class="report-subtitle">报告生成时间：${new Date().toLocaleString('zh-CN')}</p>
    </div>
  `;
  
  const alertDanger = alerts.filter(a => a.type === 'danger').length;
  const alertWarning = alerts.filter(a => a.type === 'warning').length;
  
  if (alerts.length > 0) {
    html += '<div class="report-section">';
    alerts.forEach(alert => {
      html += `
        <div class="alert-box ${alert.type}">
          <span class="alert-icon">${getAlertIcon(alert.type)}</span>
          <div class="alert-content">
            <div class="alert-title">${alert.title}</div>
            <p>${alert.message}</p>
          </div>
        </div>
      `;
    });
    html += '</div>';
  }
  
  html += `
    <div class="report-section">
      <h3>基本信息</h3>
      <div class="report-info-grid">
        <div class="report-info-item">
          <span class="label">化验日期</span>
          <span class="value">${testDate}</span>
        </div>
        <div class="report-info-item">
          <span class="label">取样位置</span>
          <span class="value">${sampleLocation}</span>
        </div>
        <div class="report-info-item">
          <span class="label">池体体积</span>
          <span class="value">${result.poolVolume.toFixed(1)} m³</span>
        </div>
        <div class="report-info-item">
          <span class="label">补水量</span>
          <span class="value">${result.makeupVolume.toFixed(1)} m³</span>
        </div>
        <div class="report-info-item">
          <span class="label">总水量</span>
          <span class="value">${result.totalVolume.toFixed(1)} m³</span>
        </div>
        <div class="report-info-item">
          <span class="label">补水占比</span>
          <span class="value">${((result.makeupVolume / result.poolVolume) * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  `;
  
  html += `
    <div class="report-section">
      <h3>矿物指标复核结果</h3>
      <table class="result-table">
        <thead>
          <tr>
            <th>指标名称</th>
            <th>原水浓度</th>
            <th>估算浓度</th>
            <th>目标范围</th>
            <th>变化</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  result.minerals.forEach(mineral => {
    const sourceDisplay = mineral.sourceMgL !== null 
      ? formatValue(convertFromMgL(mineral.sourceMgL, mineral.sourceUnit), mineral.sourceUnit)
      : '-';
    
    const estimatedDisplay = mineral.afterFilterMgL !== null
      ? formatValue(convertFromMgL(mineral.afterFilterMgL, mineral.targetUnitDisplay), mineral.targetUnitDisplay)
      : '无法计算';
    
    const targetDisplay = (mineral.targetMin !== '' && mineral.targetMin !== null && mineral.targetMax !== '' && mineral.targetMax !== null)
      ? `${mineral.targetMin} ~ ${mineral.targetMax} ${mineral.targetUnitDisplay}`
      : '未设定';
    
    const changeDisplay = mineral.changePercent !== null
      ? `${mineral.changePercent >= 0 ? '+' : ''}${mineral.changePercent.toFixed(1)}%`
      : '-';
    
    const statusText = {
      'normal': '正常',
      'warning': '偏高',
      'danger': '偏低'
    }[mineral.status] || '-';
    
    html += `
      <tr>
        <td>${mineral.name}</td>
        <td>${sourceDisplay}</td>
        <td><strong>${estimatedDisplay}</strong></td>
        <td>${targetDisplay}</td>
        <td>${changeDisplay}</td>
        <td><span class="status-badge ${mineral.status}">${statusText}</span></td>
      </tr>
    `;
  });
  
  html += `
        </tbody>
      </table>
    </div>
  `;
  
  const abnormalCount = result.minerals.filter(m => m.status !== 'normal' && m.status !== undefined).length;
  const missingCount = result.minerals.filter(m => m.isMakeupMissing).length;
  const needRetest = abnormalCount > 0 || missingCount > 0 || alertWarning > 0;

  const historyComparison = buildHistoryComparison(result, true);
  if (historyComparison.hasComparison) {
    html += historyComparison.html;
  }
  
  let conclusionText = '';
  if (abnormalCount > 0) {
    conclusionText = `本次复核发现 ${abnormalCount} 项指标偏离目标范围，${missingCount > 0 ? `且有 ${missingCount} 项补水数据缺测，` : ''}建议安排水质复测以确认实际浓度。同时建议检查补水水源水质、调整补水速率或考虑补充矿物质药剂。`;
  } else if (missingCount > 0) {
    conclusionText = `主要指标均在目标范围内，但有 ${missingCount} 项补水浓度数据缺测（默认按与原水相同估算）。建议补测补水水源的矿物质含量，以提高复核准确性。`;
  } else if (alertWarning > 0) {
    conclusionText = '主要指标均在目标范围内，但存在一些需要关注的异常情况（如补水跨天、过滤参数异常等）。建议密切关注水质变化，必要时安排加测。';
  } else {
    conclusionText = '本次复核结果显示主要矿物指标均在目标范围内，补水后浓度变化在合理范围内，泉感变淡可能与温度、流量或客人感受有关。建议持续监测水质，定期复测确认。';
  }
  
  html += `
    <div class="conclusion-box">
      <h4>📋 复核结论与建议</h4>
      <p>${conclusionText}</p>
      <p style="margin-top: 8px;">
        <strong>是否需要复测：</strong>
        <span class="status-badge ${needRetest ? 'warning' : 'normal'}">${needRetest ? '建议复测' : '暂不需要'}</span>
      </p>
    </div>
  `;
  
  return html;
}

// ============================================================
// 工程版报告
// ============================================================

function generateEngineerReport(result, alerts) {
  const testDate = document.getElementById('testDate').value || '未填写';
  const sampleLocation = document.getElementById('sampleLocation').value || '未填写';
  const abnormalNotes = document.getElementById('abnormalNotes').value || '无';
  const startTime = document.getElementById('makeupStartTime').value || '未填写';
  const endTime = document.getElementById('makeupEndTime').value || '未填写';
  
  let html = `
    <div class="report-title">
      <h2>温泉矿物质配比复核报告（工程版）</h2>
      <p class="report-subtitle">报告生成时间：${new Date().toLocaleString('zh-CN')}</p>
    </div>
  `;
  
  if (alerts.length > 0) {
    html += '<div class="report-section">';
    alerts.forEach(alert => {
      html += `
        <div class="alert-box ${alert.type}">
          <span class="alert-icon">${getAlertIcon(alert.type)}</span>
          <div class="alert-content">
            <div class="alert-title">${alert.title}</div>
            <p>${alert.message}</p>
          </div>
        </div>
      `;
    });
    html += '</div>';
  }
  
  html += `
    <div class="report-section">
      <h3>一、基础数据</h3>
      <div class="report-info-grid">
        <div class="report-info-item">
          <span class="label">化验日期</span>
          <span class="value">${testDate}</span>
        </div>
        <div class="report-info-item">
          <span class="label">取样位置</span>
          <span class="value">${sampleLocation}</span>
        </div>
        <div class="report-info-item">
          <span class="label">池体体积 V池</span>
          <span class="value">${result.poolVolume.toFixed(2)} m³</span>
        </div>
        <div class="report-info-item">
          <span class="label">补水量 V补</span>
          <span class="value">${result.makeupVolume.toFixed(2)} m³</span>
        </div>
        <div class="report-info-item">
          <span class="label">总水量 V总</span>
          <span class="value">${result.totalVolume.toFixed(2)} m³</span>
        </div>
        <div class="report-info-item">
          <span class="label">补水占比</span>
          <span class="value">${((result.makeupVolume / result.poolVolume) * 100).toFixed(2)}%</span>
        </div>
        <div class="report-info-item">
          <span class="label">补水开始时间</span>
          <span class="value">${startTime}</span>
        </div>
        <div class="report-info-item">
          <span class="label">补水结束时间</span>
          <span class="value">${endTime}</span>
        </div>
        <div class="report-info-item">
          <span class="label">循环过滤时长</span>
          <span class="value">${result.filterDuration} 小时</span>
        </div>
        <div class="report-info-item">
          <span class="label">过滤效率</span>
          <span class="value">${result.filterEfficiency}%</span>
        </div>
      </div>
    </div>
  `;
  
  html += `
    <div class="report-section">
      <h3>二、各指标计算过程</h3>
  `;
  
  result.minerals.forEach(mineral => {
    html += `<div class="calc-section">`;
    html += `<h4 style="margin-bottom: 8px; color: var(--primary-dark);">${mineral.name}</h4>`;
    
    html += `<div class="calc-step">
      <span class="calc-formula">已知条件：</span><br>
      原水浓度 C原 = ${mineral.sourceValue !== '' && mineral.sourceValue !== null ? mineral.sourceValue + ' ' + mineral.sourceUnit : '缺测'}
      ${mineral.sourceMgL !== null ? ` = ${mineral.sourceMgL.toFixed(4)} mg/L` : ''}<br>
      补水浓度 C补 = ${mineral.makeupValue !== '' && mineral.makeupValue !== null ? mineral.makeupValue + ' ' + mineral.makeupUnit : '缺测'}
      ${mineral.isMakeupMissing ? ' (缺测，' + (document.getElementById('assumeSameAsSource').checked ? '按原水估算' : '无法计算') + ')' : ''}
      ${mineral.makeupUsed !== null ? ` → 使用值: ${mineral.makeupUsed.toFixed(4)} mg/L` : ''}
    </div>`;
    
    if (mineral.calcSteps && mineral.calcSteps.formula) {
      html += `<div class="calc-step">
        <span class="calc-formula">混合浓度计算：</span><br>
        ${mineral.calcSteps.formula}<br>
        C混 = (${mineral.sourceMgL.toFixed(4)} × ${result.poolVolume.toFixed(2)} + ${mineral.makeupUsed.toFixed(4)} × ${result.makeupVolume.toFixed(2)}) / ${result.totalVolume.toFixed(2)}<br>
        C混 = ${mineral.calcSteps.mixedConc.toFixed(4)} mg/L
      </div>`;
      
      html += `<div class="calc-step">
        <span class="calc-formula">过滤影响修正：</span><br>
        过滤系数 = 1 - 过滤效率 × (过滤时长 / 24h)<br>
        过滤系数 = 1 - ${result.filterEfficiency}% × (${result.filterDuration} / 24) = ${mineral.calcSteps.filterFactor.toFixed(4)}<br>
        修正后浓度 C终 = C混 × 过滤系数 = ${mineral.calcSteps.finalConc.toFixed(4)} mg/L
      </div>`;
      
      const targetDisplay = (mineral.targetMin !== '' && mineral.targetMin !== null && mineral.targetMax !== '' && mineral.targetMax !== null)
        ? `${mineral.targetMin} ~ ${mineral.targetMax} ${mineral.targetUnitDisplay}`
        : '未设定';
      
      const statusText = {
        'normal': '在目标范围内 ✓',
        'warning': '高于目标上限 ⚠️',
        'danger': '低于目标下限 ❌'
      }[mineral.status] || '-';
      
      html += `<div class="calc-step">
        <span class="calc-formula">目标校验：</span><br>
        目标范围：${targetDisplay}<br>
        估算浓度：${mineral.afterFilterMgL.toFixed(4)} mg/L<br>
        变化幅度：${mineral.changePercent >= 0 ? '+' : ''}${mineral.changePercent.toFixed(2)}%<br>
        <strong>判定结果：<span class="status-badge ${mineral.status}">${statusText}</span></strong>
      </div>`;
    } else {
      html += `<div class="calc-step" style="color: var(--danger-color);">
        ⚠️ 数据不足，无法完成计算
      </div>`;
    }
    
    html += `</div>`;
  });
  
  html += `</div>`;
  
  const uncertainties = [];
  const missingCount = result.minerals.filter(m => m.isMakeupMissing).length;
  if (missingCount > 0) {
    uncertainties.push(`${missingCount} 项补水浓度数据缺测，当前${document.getElementById('assumeSameAsSource').checked ? '按与原水相同估算' : '未参与计算'}，实际值可能存在偏差`);
  }
  if (!isNaN(parseFloat(document.getElementById('filterEfficiency').value))) {
    uncertainties.push('过滤效率为估算值，实际去除率受水温、pH值、滤料状态等多种因素影响');
  }
  uncertainties.push('计算假设补水与原水充分混合，实际混合均匀度可能受水流条件影响');
  if (alerts.some(a => a.title === '补水时间跨天')) {
    uncertainties.push('补水时间跨天，补水水源水质可能存在日间波动');
  }
  if (abnormalNotes && abnormalNotes !== '无') {
    uncertainties.push(`存在异常记录：${abnormalNotes}`);
  }
  
  html += `
    <div class="report-section">
      <h3>三、不确定项与假设条件</h3>
      <ul class="uncertainty-list">
        ${uncertainties.map(u => `<li>${u}</li>`).join('')}
      </ul>
    </div>
  `;
  
  html += `
    <div class="report-section">
      <h3>四、结果汇总表</h3>
      <table class="result-table">
        <thead>
          <tr>
            <th>指标</th>
            <th>原水 (mg/L)</th>
            <th>补水 (mg/L)</th>
            <th>混合后 (mg/L)</th>
            <th>过滤后 (mg/L)</th>
            <th>变化率</th>
            <th>目标范围</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  result.minerals.forEach(mineral => {
    const statusText = {
      'normal': '正常',
      'warning': '偏高',
      'danger': '偏低'
    }[mineral.status] || '-';
    
    html += `
      <tr>
        <td>${mineral.name}</td>
        <td>${mineral.sourceMgL !== null ? mineral.sourceMgL.toFixed(2) : '-'}</td>
        <td>${mineral.makeupUsed !== null ? mineral.makeupUsed.toFixed(2) + (mineral.isMakeupMissing ? '*' : '') : '-'}</td>
        <td>${mineral.mixedMgL !== null ? mineral.mixedMgL.toFixed(2) : '-'}</td>
        <td><strong>${mineral.afterFilterMgL !== null ? mineral.afterFilterMgL.toFixed(2) : '-'}</strong></td>
        <td>${mineral.changePercent !== null ? (mineral.changePercent >= 0 ? '+' : '') + mineral.changePercent.toFixed(1) + '%' : '-'}</td>
        <td>${mineral.targetMinMgL !== null && mineral.targetMaxMgL !== null ? mineral.targetMinMgL.toFixed(0) + '-' + mineral.targetMaxMgL.toFixed(0) : '-'}</td>
        <td><span class="status-badge ${mineral.status}">${statusText}</span></td>
      </tr>
    `;
  });
  
  html += `
        </tbody>
      </table>
      <p style="margin-top: 8px; font-size: 0.8rem; color: var(--text-muted);">* 标注为估算值（缺测项按原水浓度估算）</p>
    </div>
  `;

  const historyComparison = buildHistoryComparison(result, false);
  if (historyComparison.hasComparison) {
    html += historyComparison.html;
  }
  
  html += `
    <div class="report-section">
      <h3>${historyComparison.hasComparison ? '七' : '六'}、工程建议</h3>
      <div class="conclusion-box">
  `;
  
  const suggestions = [];
  
  if (result.minerals.some(m => m.status === 'danger')) {
    const lowMinerals = result.minerals.filter(m => m.status === 'danger').map(m => m.name).join('、');
    suggestions.push(`【偏低指标处理】${lowMinerals} 浓度低于目标下限，建议：① 核实补水水源水质；② 考虑调整补水速率，减少稀释影响；③ 必要时添加对应矿物质药剂。`);
  }
  
  if (result.minerals.some(m => m.status === 'warning')) {
    const highMinerals = result.minerals.filter(m => m.status === 'warning').map(m => m.name).join('、');
    suggestions.push(`【偏高指标处理】${highMinerals} 浓度高于目标上限，建议：① 检查补水水源是否浓度过高；② 适当增加补水量稀释；③ 检查过滤系统是否正常工作。`);
  }
  
  if (missingCount > 0) {
    suggestions.push(`【数据完善】建议补测补水水源的全项矿物质指标，提高复核计算的准确性。`);
  }
  
  suggestions.push('【日常监测】建议每周至少检测一次主要矿物质指标，补水前后各加测一次，建立水质变化趋势档案。');
  suggestions.push('【设备维护】定期检查循环过滤系统，保证过滤效率稳定在设计范围内；每季度对滤料进行评估或更换。');
  
  html += `<ul style="margin-left: 20px; line-height: 2;">`;
  suggestions.forEach(s => {
    html += `<li>${s}</li>`;
  });
  html += `</ul>`;
  
  html += `
      </div>
    </div>
  `;
  
  return html;
}

function getAlertIcon(type) {
  const icons = {
    'warning': '⚠️',
    'danger': '❌',
    'info': 'ℹ️',
    'success': '✅'
  };
  return icons[type] || '⚠️';
}

function buildHistoryComparison(currentResult, forManager = true) {
  if (!historyData || historyData.length === 0) {
    return { hasComparison: false, html: '', analysis: '' };
  }

  const latestRecord = historyData[0];

  let totalChange = 0;
  let comparableCount = 0;
  let significantChanges = [];
  let rows = [];

  latestRecord.minerals.forEach(histMineral => {
    const currentMineral = currentResult
      ? currentResult.minerals.find(m => m.name === histMineral.name)
      : null;

    const histValue = histMineral.afterFilterMgL || histMineral.sourceMgL;
    const currValue = currentMineral
      ? (currentMineral.afterFilterMgL || currentMineral.sourceMgL)
      : null;

    if (histValue !== null && histValue !== undefined && currValue !== null && currValue !== undefined) {
      const diff = currValue - histValue;
      const changePercent = histValue > 0 ? (diff / histValue) * 100 : 0;
      totalChange += Math.abs(changePercent);
      comparableCount++;

      let trend = 'stable';
      let trendText = '稳定';

      if (Math.abs(changePercent) > 10) {
        trend = changePercent > 0 ? 'increase' : 'decrease';
        trendText = changePercent > 0 ? '明显上升' : '明显下降';
        significantChanges.push({
          name: histMineral.name,
          changePercent,
          direction: changePercent > 0 ? '上升' : '下降'
        });
      } else if (Math.abs(changePercent) > 3) {
        trend = changePercent > 0 ? 'increase' : 'decrease';
        trendText = changePercent > 0 ? '略有上升' : '略有下降';
      }

      rows.push({
        name: histMineral.name,
        histValue,
        currValue,
        diff,
        changePercent,
        trend,
        trendText,
        targetUnit: histMineral.targetUnit || 'mg/L',
        histUnit: histMineral.targetUnit || 'mg/L',
        currUnit: currentMineral ? (currentMineral.targetUnitDisplay || 'mg/L') : 'mg/L'
      });
    } else {
      rows.push({
        name: histMineral.name,
        histValue,
        currValue,
        incomplete: true
      });
    }
  });

  let analysisText = '';
  if (comparableCount > 0) {
    const avgChange = totalChange / comparableCount;

    if (significantChanges.length > 0) {
      const names = significantChanges.map(s => `${s.name}(${s.direction}${Math.abs(s.changePercent).toFixed(1)}%)`).join('、');
      analysisText = `与上次记录（${latestRecord.testDate || new Date(latestRecord.date).toLocaleDateString('zh-CN')}）相比，${names} 变化幅度超过 10%，属于显著变化。`;

      if (currentResult && currentResult.makeupVolume > 0) {
        analysisText += ` 结合本次补水量 ${currentResult.makeupVolume.toFixed(1)} m³（占比 ${((currentResult.makeupVolume / currentResult.poolVolume) * 100).toFixed(1)}%）来看，`;

        const allDecreasing = significantChanges.every(s => s.direction === '下降');
        const allIncreasing = significantChanges.every(s => s.direction === '上升');
        if (allDecreasing) {
          analysisText += '各指标普遍下降，主要原因应为补水稀释作用，属于补水后的正常变化。';
        } else if (allIncreasing) {
          analysisText += '各指标普遍上升，可能补水水源矿物质浓度偏高，建议检测补水水质。';
        } else {
          analysisText += '指标有升有降，可能同时受补水水质和检测波动影响，建议复测确认。';
        }
      }
    } else if (avgChange > 3) {
      analysisText = `与上次记录相比，各指标变化幅度在 3-10% 之间，属于轻度波动，可能由检测误差或环境因素引起，建议持续观察。`;
    } else {
      analysisText = `与上次记录相比，各指标变化幅度均在 3% 以内，水质基本稳定，变化应属于正常检测波动范围。`;
    }
  }

  let html = '';

  if (forManager) {
    html += `
      <div class="report-section">
        <h3>📊 历史水样对比</h3>
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 10px;">
          对比记录：${latestRecord.testDate || new Date(latestRecord.date).toLocaleDateString('zh-CN')}
        </p>
        <table class="result-table">
          <thead>
            <tr>
              <th>指标</th>
              <th>上次浓度</th>
              <th>本次浓度</th>
              <th>变化率</th>
              <th>趋势</th>
            </tr>
          </thead>
          <tbody>
    `;

    rows.forEach(row => {
      if (row.incomplete) {
        html += `
          <tr>
            <td>${row.name}</td>
            <td>${row.histValue ? row.histValue.toFixed(2) + ' mg/L' : '-'}</td>
            <td>${row.currValue ? row.currValue.toFixed(2) + ' mg/L' : '-'}</td>
            <td colspan="2" style="color: var(--text-muted);">数据不足</td>
          </tr>
        `;
      } else {
        html += `
          <tr>
            <td>${row.name}</td>
            <td>${formatValue(convertFromMgL(row.histValue, row.histUnit), row.histUnit)}</td>
            <td><strong>${formatValue(convertFromMgL(row.currValue, row.currUnit), row.currUnit)}</strong></td>
            <td class="${row.trend}">${row.changePercent >= 0 ? '+' : ''}${row.changePercent.toFixed(1)}%</td>
            <td><span class="status-badge ${row.trend === 'stable' ? 'normal' : (row.trend === 'increase' ? 'warning' : 'info')}">${row.trendText}</span></td>
          </tr>
        `;
      }
    });

    html += `
          </tbody>
        </table>
        <div class="conclusion-box" style="margin-top: 12px;">
          <h4>🔍 变化原因判断</h4>
          <p>${analysisText || '可对比数据不足，无法进行趋势分析。'}</p>
          <p style="margin-top: 6px; font-size: 0.85rem; color: var(--text-secondary);">
            💡 补水影响通常表现为各项指标同步变化；检测波动则表现为随机升降，幅度一般在 5-10% 以内。
          </p>
        </div>
      </div>
    `;
  } else {
    html += `
      <div class="report-section">
        <h3>六、历史水样对比分析</h3>
        <p style="margin-bottom: 10px; color: var(--text-secondary);">
          对比基准：最近一次历史记录（${latestRecord.testDate || new Date(latestRecord.date).toLocaleDateString('zh-CN')}，
          池体 ${latestRecord.poolVolume.toFixed(1)} m³，补水 ${latestRecord.makeupVolume.toFixed(1)} m³）
        </p>
        <table class="result-table">
          <thead>
            <tr>
              <th>指标</th>
              <th>历史值 (mg/L)</th>
              <th>当前值 (mg/L)</th>
              <th>差值</th>
              <th>变化率</th>
              <th>趋势</th>
            </tr>
          </thead>
          <tbody>
    `;

    rows.forEach(row => {
      if (row.incomplete) {
        html += `
          <tr>
            <td>${row.name}</td>
            <td>${row.histValue !== null && row.histValue !== undefined ? row.histValue.toFixed(2) : '-'}</td>
            <td>${row.currValue !== null && row.currValue !== undefined ? row.currValue.toFixed(2) : '-'}</td>
            <td colspan="3" style="color: var(--text-muted);">数据不完整，无法对比</td>
          </tr>
        `;
      } else {
        html += `
          <tr>
            <td>${row.name}</td>
            <td>${row.histValue.toFixed(2)}</td>
            <td><strong>${row.currValue.toFixed(2)}</strong></td>
            <td class="${row.diff >= 0 ? 'increase' : 'decrease'}">${row.diff >= 0 ? '+' : ''}${row.diff.toFixed(2)}</td>
            <td class="${row.trend}">${row.changePercent >= 0 ? '+' : ''}${row.changePercent.toFixed(2)}%</td>
            <td><span class="status-badge ${row.trend === 'stable' ? 'normal' : (row.trend === 'increase' ? 'warning' : 'info')}">${row.trendText}</span></td>
          </tr>
        `;
      }
    });

    html += `
          </tbody>
        </table>

        <div class="conclusion-box" style="margin-top: 16px;">
          <h4>趋势判断与原因分析</h4>
          <p>${analysisText || '可对比数据不足，无法进行趋势分析。'}</p>

          <p style="margin-top: 10px;"><strong>判断依据说明：</strong></p>
          <ul style="margin-left: 20px; line-height: 1.8; font-size: 0.85rem;">
            <li><strong>补水影响：</strong>各项指标呈同步变化趋势（补水稀释则普遍降低，高浓度补水则普遍升高），变化幅度与补水占比正相关。</li>
            <li><strong>检测波动：</strong>各指标随机升降，无统一方向，变化幅度一般在 5-10% 以内，且绝对值变化较小。</li>
            <li><strong>混合因素：</strong>部分指标同步变化、部分指标随机波动，可能同时受补水和检测误差影响，建议复测确认。</li>
          </ul>
        </div>
      </div>
    `;
  }

  return {
    hasComparison: comparableCount > 0,
    html,
    analysis: analysisText,
    rows,
    significantChanges,
    avgChange: comparableCount > 0 ? totalChange / comparableCount : 0
  };
}

// ============================================================
// 历史记录管理
// ============================================================

function loadHistory() {
  try {
    const stored = localStorage.getItem('hotSpringHistory');
    if (stored) {
      historyData = JSON.parse(stored);
    }
  } catch (e) {
    historyData = [];
  }
  renderHistoryList();
}

function saveToHistory() {
  if (!calculationResult) {
    showAlert('请先完成计算再保存');
    return;
  }
  
  const record = {
    id: Date.now(),
    date: new Date().toISOString(),
    testDate: document.getElementById('testDate').value || new Date().toISOString().split('T')[0],
    sampleLocation: document.getElementById('sampleLocation').value || '',
    poolVolume: calculationResult.poolVolume,
    makeupVolume: calculationResult.makeupVolume,
    filterDuration: calculationResult.filterDuration,
    filterEfficiency: calculationResult.filterEfficiency,
    minerals: calculationResult.minerals.map(m => ({
      name: m.name,
      sourceValue: m.sourceValue,
      sourceUnit: m.sourceUnit,
      sourceMgL: m.sourceMgL,
      afterFilterMgL: m.afterFilterMgL,
      targetUnit: m.targetUnitDisplay
    }))
  };
  
  historyData.unshift(record);
  if (historyData.length > 50) {
    historyData = historyData.slice(0, 50);
  }
  
  try {
    localStorage.setItem('hotSpringHistory', JSON.stringify(historyData));
    renderHistoryList();
    showAlert('保存成功！');
  } catch (e) {
    showAlert('保存失败：' + e.message);
  }
}

function renderHistoryList() {
  const container = document.getElementById('historyList');
  
  if (historyData.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无历史记录</div>';
    return;
  }
  
  let html = '';
  historyData.forEach(record => {
    const dateStr = new Date(record.date).toLocaleString('zh-CN');
    const testDateStr = record.testDate || '-';
    
    html += `
      <div class="history-item" data-id="${record.id}">
        <div class="history-item-header">
          <span class="history-item-date">📅 ${testDateStr}</span>
          <div class="history-item-actions">
            <button class="history-item-btn" onclick="loadRecord(${record.id})">加载</button>
            <button class="history-item-btn" onclick="compareWithCurrent(${record.id})">对比</button>
            <button class="history-item-btn danger" onclick="deleteRecord(${record.id})">删除</button>
          </div>
        </div>
        <div class="history-item-meta">
          <span>🏊 池体: ${record.poolVolume.toFixed(1)} m³</span>
          <span>💧 补水: ${record.makeupVolume.toFixed(1)} m³</span>
          <span>🧪 ${record.minerals.length} 项指标</span>
          <span>🕐 保存于: ${dateStr}</span>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

function loadRecord(id) {
  const record = historyData.find(r => r.id === id);
  if (!record) return;
  
  document.getElementById('poolVolume').value = record.poolVolume;
  document.getElementById('makeupVolume').value = record.makeupVolume;
  document.getElementById('filterDuration').value = record.filterDuration;
  document.getElementById('filterEfficiency').value = record.filterEfficiency;
  document.getElementById('testDate').value = record.testDate || '';
  document.getElementById('sampleLocation').value = record.sampleLocation || '';
  
  currentMinerals = record.minerals.map(m => ({
    name: m.name,
    sourceValue: m.sourceValue,
    sourceUnit: m.sourceUnit,
    makeupValue: null,
    makeupUnit: 'mg/L',
    targetMin: '',
    targetMax: '',
    targetUnit: m.targetUnit || 'mg/L'
  }));
  
  renderMineralTable();
  switchTab('input');
  showAlert('历史数据已加载');
}

function compareWithCurrent(id) {
  const record = historyData.find(r => r.id === id);
  if (!record) return;
  
  const comparisonCard = document.getElementById('comparisonCard');
  const resultContainer = document.getElementById('comparisonResult');
  
  comparisonCard.style.display = 'block';
  
  let html = `
    <p style="margin-bottom: 12px;">
      对比：<strong>历史记录 (${record.testDate || new Date(record.date).toLocaleDateString('zh-CN')})</strong> 
      → <strong>当前数据</strong>
    </p>
    <table class="comparison-table">
      <thead>
        <tr>
          <th>指标名称</th>
          <th>历史浓度</th>
          <th>当前浓度</th>
          <th>差值</th>
          <th>变化率</th>
          <th>趋势判断</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  let totalChange = 0;
  let comparableCount = 0;
  let significantChanges = [];
  
  record.minerals.forEach(histMineral => {
    const currentMineral = calculationResult 
      ? calculationResult.minerals.find(m => m.name === histMineral.name)
      : null;
    
    const histValue = histMineral.afterFilterMgL || histMineral.sourceMgL;
    const currValue = currentMineral 
      ? (currentMineral.afterFilterMgL || currentMineral.sourceMgL)
      : null;
    
    if (histValue !== null && currValue !== null) {
      const diff = currValue - histValue;
      const changePercent = (diff / histValue) * 100;
      totalChange += Math.abs(changePercent);
      comparableCount++;
      
      let trend = 'stable';
      let trendText = '稳定';
      
      if (Math.abs(changePercent) > 10) {
        trend = changePercent > 0 ? 'increase' : 'decrease';
        trendText = changePercent > 0 ? '明显上升' : '明显下降';
        significantChanges.push({
          name: histMineral.name,
          changePercent,
          direction: changePercent > 0 ? '上升' : '下降'
        });
      } else if (Math.abs(changePercent) > 3) {
        trend = changePercent > 0 ? 'increase' : 'decrease';
        trendText = changePercent > 0 ? '略有上升' : '略有下降';
      }
      
      html += `
        <tr>
          <td>${histMineral.name}</td>
          <td>${histValue.toFixed(2)} mg/L</td>
          <td>${currValue.toFixed(2)} mg/L</td>
          <td class="${diff >= 0 ? 'increase' : 'decrease'}">${diff >= 0 ? '+' : ''}${diff.toFixed(2)}</td>
          <td class="${trend}">${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%</td>
          <td class="${trend}">${trendText}</td>
        </tr>
      `;
    } else {
      html += `
        <tr>
          <td>${histMineral.name}</td>
          <td>${histValue ? histValue.toFixed(2) + ' mg/L' : '-'}</td>
          <td>${currValue ? currValue.toFixed(2) + ' mg/L' : '-'}</td>
          <td colspan="3" style="color: var(--text-muted);">数据不完整，无法对比</td>
        </tr>
      `;
    }
  });
  
  html += `
      </tbody>
    </table>
  `;
  
  let analysisText = '';
  if (comparableCount > 0) {
    const avgChange = totalChange / comparableCount;
    
    if (significantChanges.length > 0) {
      const names = significantChanges.map(s => `${s.name}(${s.direction}${Math.abs(s.changePercent).toFixed(1)}%)`).join('、');
      analysisText = `与历史数据相比，${names} 变化幅度超过 10%，属于显著变化。`;
      
      if (calculationResult && calculationResult.makeupVolume > 0) {
        analysisText += ` 结合本次补水量 ${calculationResult.makeupVolume.toFixed(1)} m³（占比 ${((calculationResult.makeupVolume / calculationResult.poolVolume) * 100).toFixed(1)}%）来看，`;
        
        const allDecreasing = significantChanges.every(s => s.direction === '下降');
        if (allDecreasing) {
          analysisText += '各指标普遍下降，主要原因应为补水稀释作用，属于补水后的正常变化。';
        } else {
          analysisText += '指标有升有降，可能同时受补水水质和检测波动影响，建议复测确认。';
        }
      }
    } else if (avgChange > 3) {
      analysisText = '与历史数据相比，各指标变化幅度在 3-10% 之间，属于轻度波动，可能由检测误差或环境因素引起，建议持续观察。';
    } else {
      analysisText = '与历史数据相比，各指标变化幅度均在 3% 以内，水质基本稳定，变化应属于正常检测波动范围。';
    }
  }
  
  html += `
    <div class="comparison-summary">
      <h4>🔍 变化原因分析</h4>
      <p>${analysisText || '可对比数据不足，无法进行趋势分析。'}</p>
      <p style="margin-top: 8px; font-size: 0.85rem; color: var(--text-secondary);">
        💡 <strong>判断依据：</strong>补水影响通常表现为各项指标同步变化（稀释则普遍降低，高浓度补水则普遍升高）；
        检测波动则表现为各指标随机升降，变化幅度一般在 5-10% 以内。
      </p>
    </div>
  `;
  
  resultContainer.innerHTML = html;
  
  document.getElementById('tab-history').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function deleteRecord(id) {
  showConfirm('确定要删除这条历史记录吗？', () => {
    historyData = historyData.filter(r => r.id !== id);
    localStorage.setItem('hotSpringHistory', JSON.stringify(historyData));
    renderHistoryList();
  });
}

function clearHistory() {
  showConfirm('确定要清空所有历史记录吗？此操作不可恢复。', () => {
    historyData = [];
    localStorage.removeItem('hotSpringHistory');
    renderHistoryList();
    document.getElementById('comparisonCard').style.display = 'none';
  });
}

// ============================================================
// UI 交互
// ============================================================

function renderMineralTable() {
  const tbody = document.getElementById('mineralTableBody');
  tbody.innerHTML = '';
  
  currentMinerals.forEach((mineral, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <input type="text" value="${mineral.name}" data-index="${index}" data-field="name" class="mineral-input">
      </td>
      <td>
        <input type="number" value="${mineral.sourceValue !== null && mineral.sourceValue !== undefined ? mineral.sourceValue : ''}" 
               data-index="${index}" data-field="sourceValue" class="mineral-input" step="0.01">
      </td>
      <td>
        <select data-index="${index}" data-field="sourceUnit" class="mineral-input">
          ${UNITS.map(u => `<option value="${u}" ${mineral.sourceUnit === u ? 'selected' : ''}>${u}</option>`).join('')}
        </select>
      </td>
      <td>
        <input type="number" value="${mineral.makeupValue !== null && mineral.makeupValue !== undefined ? mineral.makeupValue : ''}" 
               data-index="${index}" data-field="makeupValue" class="mineral-input" step="0.01"
               placeholder="${document.getElementById('assumeSameAsSource').checked ? '缺测按原水算' : '请填写'}">
      </td>
      <td>
        <select data-index="${index}" data-field="makeupUnit" class="mineral-input">
          ${UNITS.map(u => `<option value="${u}" ${mineral.makeupUnit === u ? 'selected' : ''}>${u}</option>`).join('')}
        </select>
      </td>
      <td>
        <input type="number" value="${mineral.targetMin !== null && mineral.targetMin !== undefined ? mineral.targetMin : ''}" 
               data-index="${index}" data-field="targetMin" class="mineral-input" step="0.01">
      </td>
      <td>
        <input type="number" value="${mineral.targetMax !== null && mineral.targetMax !== undefined ? mineral.targetMax : ''}" 
               data-index="${index}" data-field="targetMax" class="mineral-input" step="0.01">
      </td>
      <td>
        <select data-index="${index}" data-field="targetUnit" class="mineral-input">
          ${UNITS.map(u => `<option value="${u}" ${mineral.targetUnit === u ? 'selected' : ''}>${u}</option>`).join('')}
        </select>
      </td>
      <td>
        <button class="delete-btn" data-index="${index}" title="删除">✕</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  document.querySelectorAll('.mineral-input').forEach(input => {
    input.addEventListener('change', handleMineralChange);
    input.addEventListener('input', handleMineralChange);
  });
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      removeMineral(index);
    });
  });
}

function handleMineralChange(e) {
  const index = parseInt(e.target.dataset.index);
  const field = e.target.dataset.field;
  const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  
  if (currentMinerals[index]) {
    if (e.target.type === 'number') {
      currentMinerals[index][field] = value === '' ? null : parseFloat(value);
    } else {
      currentMinerals[index][field] = value;
    }
  }
}

function addMineral() {
  currentMinerals.push({
    name: '新指标',
    sourceValue: null,
    sourceUnit: 'mg/L',
    makeupValue: null,
    makeupUnit: 'mg/L',
    targetMin: null,
    targetMax: null,
    targetUnit: 'mg/L'
  });
  renderMineralTable();
}

function removeMineral(index) {
  if (currentMinerals.length <= 1) {
    showAlert('至少保留一项指标');
    return;
  }
  currentMinerals.splice(index, 1);
  renderMineralTable();
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === 'tab-' + tabName);
  });
}

function switchReport(reportName) {
  document.querySelectorAll('.report-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.report === reportName);
  });
  document.querySelectorAll('.report-content').forEach(content => {
    content.classList.toggle('active', content.id === 'report-' + reportName);
  });
}

function showAlert(message) {
  const modal = document.getElementById('alertModal');
  const body = document.getElementById('alertModalBody');
  body.innerHTML = `<p>${message}</p>`;
  modal.style.display = 'flex';
}

function showConfirm(message, onConfirm) {
  const modal = document.getElementById('confirmModal');
  const body = document.getElementById('confirmModalBody');
  body.innerHTML = `<p>${message}</p>`;
  modal.style.display = 'flex';
  
  const okBtn = document.getElementById('confirmModalOk');
  const cancelBtn = document.getElementById('confirmModalCancel');
  
  const closeModal = () => {
    modal.style.display = 'none';
    okBtn.removeEventListener('click', handleOk);
    cancelBtn.removeEventListener('click', closeModal);
  };
  
  const handleOk = () => {
    closeModal();
    onConfirm();
  };
  
  okBtn.addEventListener('click', handleOk);
  cancelBtn.addEventListener('click', closeModal);
}

function showAlertsList(alerts) {
  if (alerts.length === 0) return;
  
  const modal = document.getElementById('alertModal');
  const body = document.getElementById('alertModalBody');
  
  let html = '<ul style="list-style: none; padding: 0;">';
  alerts.forEach(alert => {
    html += `
      <li style="margin-bottom: 12px; padding: 10px; background: ${
        alert.type === 'danger' ? '#fef2f2' : alert.type === 'warning' ? '#fffbeb' : '#eff6ff'
      }; border-radius: 6px;">
        <strong>${getAlertIcon(alert.type)} ${alert.title}</strong><br>
        <span style="font-size: 0.85rem;">${alert.message}</span>
      </li>
    `;
  });
  html += '</ul>';
  
  body.innerHTML = html;
  modal.style.display = 'flex';
}

function resetForm() {
  showConfirm('确定要重置所有数据吗？', () => {
    document.getElementById('poolVolume').value = 100;
    document.getElementById('makeupVolume').value = 10;
    document.getElementById('filterDuration').value = 8;
    document.getElementById('filterEfficiency').value = 5;
    document.getElementById('makeupStartTime').value = '';
    document.getElementById('makeupEndTime').value = '';
    document.getElementById('testDate').value = '';
    document.getElementById('sampleLocation').value = '';
    document.getElementById('abnormalNotes').value = '';
    document.getElementById('assumeSameAsSource').checked = true;
    
    currentMinerals = JSON.parse(JSON.stringify(DEFAULT_MINERALS));
    renderMineralTable();
    
    calculationResult = null;
    document.getElementById('managerReport').innerHTML = '<div class="report-placeholder"><p>请先在「数据录入」页填写数据并点击「开始复核计算」</p></div>';
    document.getElementById('engineerReport').innerHTML = '<div class="report-placeholder"><p>请先在「数据录入」页填写数据并点击「开始复核计算」</p></div>';
  });
}

function doCalculate() {
  const poolVolume = parseFloat(document.getElementById('poolVolume').value);
  const makeupVolume = parseFloat(document.getElementById('makeupVolume').value);
  const filterDuration = parseFloat(document.getElementById('filterDuration').value);
  const filterEfficiency = parseFloat(document.getElementById('filterEfficiency').value);
  
  if (isNaN(poolVolume) || poolVolume <= 0) {
    showAlert('请输入有效的池体体积');
    return;
  }
  
  currentAlerts = detectAnomalies();
  
  calculationResult = calculateMixing(poolVolume, makeupVolume, currentMinerals, filterDuration, filterEfficiency);
  
  document.getElementById('managerReport').innerHTML = generateManagerReport(calculationResult, currentAlerts);
  document.getElementById('engineerReport').innerHTML = generateEngineerReport(calculationResult, currentAlerts);
  
  switchTab('report');
  
  if (currentAlerts.length > 0) {
    setTimeout(() => showAlertsList(currentAlerts), 300);
  }
}

function printReport(reportType) {
  const reportEl = document.getElementById(reportType === 'manager' ? 'managerReport' : 'engineerReport');
  if (!reportEl || reportEl.querySelector('.report-placeholder')) {
    showAlert('请先生成报告再打印');
    return;
  }
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>温泉矿物质配比复核报告</title>
      <style>
        body { font-family: "Microsoft YaHei", sans-serif; padding: 20px; }
        .report-title { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #0891b2; padding-bottom: 10px; }
        .report-title h2 { color: #0e7490; margin: 0; }
        .report-subtitle { color: #64748b; font-size: 0.9rem; margin-top: 5px; }
        .report-section { margin-bottom: 20px; }
        .report-section h3 { color: #1e293b; border-left: 3px solid #0891b2; padding-left: 8px; }
        .report-info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; background: #f8fafc; padding: 12px; border-radius: 8px; }
        .report-info-item .label { font-size: 0.8rem; color: #94a3b8; display: block; }
        .report-info-item .value { font-weight: 500; }
        table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background: #f0f9ff; font-weight: 600; color: #64748b; }
        .status-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; }
        .status-badge.normal { background: #dcfce7; color: #166534; }
        .status-badge.warning { background: #fef3c7; color: #92400e; }
        .status-badge.danger { background: #fee2e2; color: #991b1b; }
        .alert-box { padding: 12px; border-radius: 8px; margin-bottom: 10px; display: flex; gap: 10px; }
        .alert-box.warning { background: #fffbeb; border: 1px solid #fcd34d; }
        .alert-box.danger { background: #fef2f2; border: 1px solid #fca5a5; }
        .alert-box.info { background: #eff6ff; border: 1px solid #93c5fd; }
        .conclusion-box { background: #ecfeff; border: 1px solid #22d3ee; border-radius: 8px; padding: 16px; }
        .calc-section { background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 10px; font-family: monospace; font-size: 0.8rem; }
        .uncertainty-list { list-style: none; padding: 0; }
        .uncertainty-list li { padding: 4px 0 4px 20px; position: relative; }
      </style>
    </head>
    <body>
      ${reportEl.innerHTML}
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

// ============================================================
// 初始化
// ============================================================

function init() {
  currentMinerals = JSON.parse(JSON.stringify(DEFAULT_MINERALS));
  renderMineralTable();
  
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  document.getElementById('testDate').value = `${year}-${month}-${day}`;
  
  loadHistory();
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  
  document.querySelectorAll('.report-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchReport(btn.dataset.report));
  });
  
  document.getElementById('calculateBtn').addEventListener('click', doCalculate);
  document.getElementById('resetBtn').addEventListener('click', resetForm);
  document.getElementById('saveToHistoryBtn').addEventListener('click', saveToHistory);
  document.getElementById('addMineralBtn').addEventListener('click', addMineral);
  document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
  document.getElementById('printManagerBtn').addEventListener('click', () => printReport('manager'));
  document.getElementById('printEngineerBtn').addEventListener('click', () => printReport('engineer'));
  
  document.getElementById('alertModalOk').addEventListener('click', () => {
    document.getElementById('alertModal').style.display = 'none';
  });
  
  document.getElementById('assumeSameAsSource').addEventListener('change', renderMineralTable);
  
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', init);
