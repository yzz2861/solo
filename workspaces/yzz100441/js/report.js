const SCHEME_COLORS = [
  '#ff8a3d',
  '#4ecdc4',
  '#a29bfe',
  '#ff6b81',
  '#55efc4'
];

function statusBadge(status) {
  if (status === 'good') return '<span class="badge badge-good">✅ 适中</span>';
  if (status === 'muddy') return '<span class="badge badge-bad">❌ 偏闷</span>';
  if (status === 'dry') return '<span class="badge badge-dry">⚠️ 偏干</span>';
  return '';
}

function renderOwnerReport(container, scheme, result, issues) {
  const { metrics, totalBudget, bandEvaluation, overall, materialBreakdown, surfaceDetail, formulaUsed } = result;
  const purposeName = (PURPOSES[scheme.purpose] || PURPOSES.voice_studio).name;

  const issueHtml = issues && issues.length
    ? `<div class="issue-block">${issues.map(i =>
        `<div class="issue-item issue-${i.level}">
           <strong>[${i.level === 'error' ? '错误' : i.level === 'warning' ? '提醒' : '提示'}]</strong> ${i.message}
           ${i.suggestion ? `<div class="issue-suggest">💡 ${i.suggestion}</div>` : ''}
         </div>`).join('')}</div>`
    : '';

  const bandRows = FREQ_BANDS.map(f => {
    const ev = bandEvaluation[f];
    return `<tr>
      <td>${f}Hz</td>
      <td class="num">${ev.rt.toFixed(2)} s</td>
      <td class="num">${ev.targetMin.toFixed(2)} ~ ${ev.targetMax.toFixed(2)} s</td>
      <td>${statusBadge(ev.status)}</td>
      <td>
        <div class="rt-bar">
          <div class="rt-target" style="left:${Math.max(0, ev.targetMin/2*100)}%;width:${(ev.targetMax-ev.targetMin)/2*100}%"></div>
          <div class="rt-actual ${ev.status}" style="left:${Math.min(97, ev.rt/2*100)}%"></div>
        </div>
      </td>
    </tr>`;
  }).join('');

  const matRows = materialBreakdown.length
    ? materialBreakdown.map(m => `
        <tr>
          <td>${m.materialName}</td>
          <td>${m.usedOn.join('、')}</td>
          <td class="num">${m.totalArea.toFixed(1)} ㎡</td>
          <td class="num">¥${m.price.toFixed(0)}/㎡</td>
          <td class="num strong">¥${m.totalCost.toFixed(0)}</td>
        </tr>`).join('')
    : `<tr><td colspan="5" class="empty">暂无可计费材料（墙面使用了零单价材料）</td></tr>`;

  const surfaceRows = Object.keys(SURFACE_LABELS).map(k => {
    const s = surfaceDetail[k];
    return `<tr>
      <td>${s.label}</td>
      <td>${s.materialName}${s.hasCustomAlpha ? ' <span class="tag-custom">自定义系数</span>' : ''}</td>
      <td class="num">${s.totalArea.toFixed(1)}㎡</td>
      <td class="num">${(s.coverage*100).toFixed(0)}%</td>
      <td class="num">${s.coveredArea.toFixed(1)}㎡</td>
      <td class="num strong">¥${s.lineCost.toFixed(0)}</td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <div class="owner-header">
      <div>
        <h3>${scheme.name || '未命名方案'}</h3>
        <div class="sub">用途：${purposeName} · 计算模型：${formulaUsed === 'eyring' ? 'Eyring 小房间修正' : 'Sabine 经典'} · 体积 ${metrics.volume.toFixed(1)}m³</div>
      </div>
      <div class="price-tag">
        <span class="label">预估材料总价</span>
        <span class="price">¥${totalBudget.toFixed(0)}</span>
      </div>
    </div>

    ${issueHtml}

    <div class="verdict ${overall.lowStat === 'good' && overall.midStat === 'good' && overall.highStat === 'good' ? 'verdict-good' : 'verdict-warn'}">
      <h4>📋 一句话结论</h4>
      <p>${overall.conclusion}</p>
    </div>

    <h4 class="sec-title">🎚 各频段混响时间 (RT₆₀)</h4>
    <table class="data-table band-table">
      <thead><tr><th>频段</th><th>实际</th><th>目标范围</th><th>评价</th><th>示意（0~2s）</th></tr></thead>
      <tbody>${bandRows}</tbody>
    </table>

    <h4 class="sec-title">💡 调整建议</h4>
    <ul class="suggest-list">
      ${overall.suggestions.map(s => `<li>${s}</li>`).join('')}
    </ul>

    <h4 class="sec-title">📐 各面材料与面积</h4>
    <table class="data-table">
      <thead><tr><th>面</th><th>材料</th><th>总面积</th><th>覆盖率</th><th>贴材面积</th><th>费用</th></tr></thead>
      <tbody>${surfaceRows}</tbody>
    </table>

    <h4 class="sec-title">💰 材料清单与预算</h4>
    <table class="data-table mat-table">
      <thead><tr><th>材料</th><th>用于</th><th>采购面积</th><th>单价</th><th>小计</th></tr></thead>
      <tbody>${matRows}</tbody>
      <tfoot>
        <tr>
          <td colspan="4" class="total-label">合计（仅材料，不含施工）</td>
          <td class="num strong total-price">¥${totalBudget.toFixed(0)}</td>
        </tr>
      </tfoot>
    </table>
    <div class="budget-note">* 施工费通常为材料费的 50%~100%，建议按 ¥${(totalBudget*1.5).toFixed(0)} ~ ¥${(totalBudget*2).toFixed(0)} 预留总预算</div>
  `;
}

function renderAcousticianReport(container, scheme, result, issues) {
  const {
    metrics, formulaUsed, surfaceDetail, materialBreakdown, totalBudget,
    curtainsAbsorb, curtainsArea, furniture, totalAbsorption,
    rt60ByBand, airAbsorption4mV, target, bandEvaluation, overall
  } = result;
  const { L, W, H } = scheme.room;
  const V = metrics.volume, S = metrics.totalArea;
  const purposeName = (PURPOSES[scheme.purpose] || PURPOSES.voice_studio).name;

  const formulaLine = formulaUsed === 'eyring'
    ? `RT₆₀ = 0.161·V / [ -S·ln(1-ᾱ) + 4mV ]   (V=${V.toFixed(1)} m³ < 50 m³ → Eyring-Norris)`
    : `RT₆₀ = 0.161·V / (A + 4mV)   (V=${V.toFixed(1)} m³ ≥ 50 m³ → Sabine)`;

  const surfaceAlphaRows = Object.keys(SURFACE_LABELS).map(k => {
    const s = surfaceDetail[k];
    return `<tr>
      <td>${s.label}</td>
      <td class="num">${s.totalArea.toFixed(2)}</td>
      <td class="num">${s.coverage.toFixed(2)}</td>
      <td>${s.materialName}${s.hasCustomAlpha ? ' <span class="tag-custom">CUSTOM</span>' : ''}</td>
      ${FREQ_BANDS.map(f => `<td class="num">${s.alpha[f].toFixed(3)}</td>`).join('')}
      ${FREQ_BANDS.map(f => `<td class="num dim">${s.bandAbsorb[f].toFixed(3)}</td>`).join('')}
    </tr>`;
  }).join('');

  const extraRows = `
    <tr class="extra-row">
      <td>窗帘 (Σ=${curtainsArea.toFixed(2)}㎡)</td>
      <td class="num">${curtainsArea.toFixed(2)}</td>
      <td class="num">-</td>
      <td>按类型估算</td>
      ${FREQ_BANDS.map(f => `<td class="num dim">-</td>`).join('')}
      ${FREQ_BANDS.map(f => `<td class="num">${curtainsAbsorb[f].toFixed(3)}</td>`).join('')}
    </tr>
    <tr class="extra-row">
      <td>家具 (等效 ${furniture.totalEqArea.toFixed(2)}㎡)</td>
      <td class="num">${furniture.totalEqArea.toFixed(2)}</td>
      <td class="num">-</td>
      <td>经验估算</td>
      ${FREQ_BANDS.map(f => `<td class="num dim">-</td>`).join('')}
      ${FREQ_BANDS.map(f => `<td class="num">${furniture.absorption[f].toFixed(3)}</td>`).join('')}
    </tr>
    <tr class="total-row">
      <td>Σ 总吸声 A (Sabine)</td>
      <td class="num">${S.toFixed(2)}</td>
      <td class="num">-</td>
      <td></td>
      ${FREQ_BANDS.map(f => `<td class="num strong">${totalAbsorption[f].toFixed(3)}</td>`).join('')}
      ${FREQ_BANDS.map(f => `<td class="num strong">${totalAbsorption[f].toFixed(3)}</td>`).join('')}
    </tr>
  `;

  const bandCalcRows = FREQ_BANDS.map(f => {
    const A = totalAbsorption[f];
    const meanAlpha = A / Math.max(S, 0.001);
    const fourMV = airAbsorption4mV[f];
    const denom = formulaUsed === 'eyring'
      ? (-S * Math.log(1 - Math.min(meanAlpha, 0.95)) + fourMV)
      : (A + fourMV);
    return `<tr>
      <td>${f} Hz</td>
      <td class="num">${A.toFixed(3)}</td>
      <td class="num">${meanAlpha.toFixed(4)}</td>
      <td class="num">${AIR_ABSORPTION_M[f].toFixed(4)}</td>
      <td class="num">${fourMV.toFixed(3)}</td>
      <td class="num">${denom.toFixed(3)}</td>
      <td class="num strong">${rt60ByBand[f].toFixed(3)}</td>
      <td class="num">[${target[f].min.toFixed(2)}, ${target[f].max.toFixed(2)}]</td>
      <td>${bandEvaluation[f].status === 'good' ? '✓' : bandEvaluation[f].status === 'muddy' ? '↑' : '↓'}</td>
    </tr>`;
  }).join('');

  const uncert = `
    <div class="uncertainty">
      <h5>⚠️ 不确定度与假设声明</h5>
      <ol>
        <li>材料吸声系数容差 ±15%（GB/T 20247-2006 混响室法的复现性），实际 RT₆₀ 可能偏差 ±15%。</li>
        <li>家具等效吸声为经验估算，容差 ±30%；若放置不规则大件（乐器/箱体），建议现场补测。</li>
        <li>空气吸声按 T=20°C, RH=50% 取 ISO 9613-1 近似值；温湿度变化 ≥±10°C/±20%RH 时 4kHz 可偏差 20%。</li>
        <li>未考虑扩散体、非矩形几何、门窗缝隙漏声、结构共振等高阶效应；V<10m³ 时简正模式密度不足，模型适用度低。</li>
        <li>各面按均匀覆盖简化，角落与边界效应未显式建模。</li>
      </ol>
    </div>`;

  const sources = [...new Set(materialBreakdown.map(m => `${m.materialName}: ${m.source}`))].join('; ');

  const criticalFreq = Math.max(0, Math.min(200, 2000 * Math.pow(V, -1/3)));

  container.innerHTML = `
    <h3>🎓 声学师报告 — ${scheme.name || 'Unnamed'}</h3>
    <div class="sub-info">
      房间尺寸：L=${L.toFixed(2)}m × W=${W.toFixed(2)}m × H=${H.toFixed(2)}m
      · V=${V.toFixed(2)}m³ · Sₜₒₜₐₗ=${S.toFixed(2)}㎡
      · 用途：${purposeName}
      · 临界频率 fc ≈ ${criticalFreq.toFixed(0)} Hz
    </div>

    <h4 class="sec-title">① 采用公式</h4>
    <pre class="formula-block">${formulaLine}
系数 0.161 = 24 × ln(10) / (c)   取声速 c = 343 m/s (@20°C)</pre>

    <h4 class="sec-title">② 各面吸声计算明细表 (α / A = S×α)</h4>
    <div class="table-wrap">
    <table class="data-table small-font">
      <thead>
        <tr>
          <th rowspan="2">表面</th>
          <th rowspan="2">面积 S (㎡)</th>
          <th rowspan="2">覆盖比</th>
          <th rowspan="2">材料</th>
          <th colspan="${FREQ_BANDS.length}">吸声系数 α</th>
          <th colspan="${FREQ_BANDS.length}">吸声量 A (㎡ Sabine)</th>
        </tr>
        <tr>${FREQ_BANDS.map(f => `<th>${f}</th>`).join('')}${FREQ_BANDS.map(f => `<th class="dim">${f}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${surfaceAlphaRows}
        ${extraRows}
      </tbody>
    </table>
    </div>

    <h4 class="sec-title">③ 各频段 RT₆₀ 计算过程</h4>
    <div class="table-wrap">
    <table class="data-table small-font">
      <thead>
        <tr>
          <th>f</th><th>A (㎡)</th><th>ᾱ = A/S</th>
          <th>m (1/m)</th><th>4mV</th><th>分母</th><th>RT₆₀ (s)</th>
          <th>目标区间</th><th>Δ</th>
        </tr>
      </thead>
      <tbody>${bandCalcRows}</tbody>
    </table>
    </div>

    <h4 class="sec-title">④ 材料与预算</h4>
    <table class="data-table small-font">
      <thead>
        <tr><th>材料</th><th>引用来源</th><th>合计面积(㎡)</th><th>单价</th><th>小计</th></tr>
      </thead>
      <tbody>
        ${materialBreakdown.length
          ? materialBreakdown.map(m => `<tr>
              <td>${m.materialName}</td>
              <td class="dim">${m.source}</td>
              <td class="num">${m.totalArea.toFixed(2)}</td>
              <td class="num">¥${m.price.toFixed(0)}</td>
              <td class="num strong">¥${m.totalCost.toFixed(0)}</td>
            </tr>`).join('')
          : '<tr><td colspan="5" class="empty">无</td></tr>'}
      </tbody>
      <tfoot><tr><td colspan="4" class="total-label">TOTAL</td><td class="num strong total-price">¥${totalBudget.toFixed(0)}</td></tr></tfoot>
    </table>
    <div class="dim">系数来源：${sources || '默认数据库'}</div>

    <h4 class="sec-title">⑤ 诊断结论</h4>
    <div class="verdict ${overall.lowStat === 'good' && overall.midStat === 'good' && overall.highStat === 'good' ? 'verdict-good' : 'verdict-warn'}">
      <p><strong>结论：</strong>${overall.conclusion}</p>
      <ul>${overall.suggestions.map(s => `<li>${s}</li>`).join('')}</ul>
    </div>

    ${uncert}

    ${issues && issues.length ? `<h4 class="sec-title">⑥ 输入校验记录</h4>` + issues.map(i =>
      `<div class="issue-item issue-${i.level}">[${i.code}] ${i.message}</div>`).join('') : ''}
  `;
}

function printReport(which) {
  const target = which === 'owner' ? 'owner-report' : 'acoustician-report';
  const el = document.getElementById(target);
  if (!el) return;
  const w = window.open('', '_blank');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${which === 'owner' ? '老板版报告' : '声学师报告'}</title>
    <style>
      body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;max-width:960px;margin:24px auto;padding:0 16px;color:#222}
      h3{border-bottom:2px solid #ff8a3d;padding-bottom:6px}
      .sec-title{margin-top:22px;padding-left:8px;border-left:4px solid #ff8a3d;color:#2d3436}
      table{border-collapse:collapse;width:100%;margin:8px 0 16px}
      th,td{border:1px solid #ddd;padding:6px 8px;font-size:13px;text-align:left}
      th{background:#fafafa}
      .num{text-align:right;font-variant-numeric:tabular-nums}
      .strong{font-weight:600}
      .dim{color:#888}
      .total-label{text-align:right}
      .total-price{color:#e17055;font-size:14px}
      .badge{padding:2px 6px;border-radius:4px;font-size:12px}
      .badge-good{background:#dff9e8;color:#107c41}
      .badge-bad{background:#ffe3e3;color:#c0392b}
      .badge-dry{background:#fff5d6;color:#b8860b}
      .verdict-good{background:#eafaf1;border:1px solid #27ae60;padding:12px 16px;border-radius:8px}
      .verdict-warn{background:#fff4e6;border:1px solid #e67e22;padding:12px 16px;border-radius:8px}
      .suggest-list{line-height:1.9}
      .issue-item{padding:6px 10px;margin:4px 0;border-radius:4px;background:#fff9e6;border-left:4px solid #f39c12}
      .issue-error{background:#fdecea;border-left-color:#e74c3c}
      .formula-block{background:#0f1624;color:#74b9ff;padding:12px 16px;border-radius:8px;font-family:"SF Mono",Menlo,Consolas,monospace;overflow-x:auto}
      .uncertainty{background:#f8f9fa;border:1px dashed #aaa;padding:12px 16px;border-radius:8px;font-size:13px}
      .tag-custom{background:#a29bfe;color:#fff;padding:1px 5px;border-radius:4px;font-size:11px}
    </style></head><body>${el.innerHTML}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 300);
}
