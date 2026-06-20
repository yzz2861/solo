import { BoxItem, CalculationReport, LayerResult, POSITION_ZONES, POSITION_LABELS, RISK_LEVEL_CONFIG, ShelfConfig, WEIGHT_UNIT_LABELS } from '@/types';
import { fromKg, toKg } from './unitConverter';

const genId = () => Math.random().toString(36).slice(2, 10);

export const buildReport = (
  shelf: ShelfConfig,
  boxes: BoxItem[],
  layerResults: LayerResult[],
  globalWarnings: CalculationReport['globalWarnings'],
  prevVersion: number = 0
): CalculationReport => {
  const totalWeight_kg = layerResults.reduce((s, l) => s + l.totalWeight_kg, 0);
  return {
    id: genId(),
    shelfId: shelf.id,
    calculatedAt: new Date().toISOString(),
    version: prevVersion + 1,
    shelfConfig: { ...shelf },
    boxes: boxes.map((b) => ({ ...b })),
    layerResults: layerResults.map((l) => ({ ...l, zoneWeights: { ...l.zoneWeights } })),
    globalWarnings,
    totalWeight_kg,
  };
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

export const exportPickingListHtml = (report: CalculationReport): string => {
  const { shelfConfig, boxes, layerResults, calculatedAt, version } = report;

  let layersHtml = '';
  for (let i = 0; i < shelfConfig.layerCount; i++) {
    const lr = layerResults[i];
    const layerBoxes = boxes.filter((b) => b.layerIndex === i);
    const riskCfg = RISK_LEVEL_CONFIG[lr.riskLevel];

    let rowsHtml = '';
    if (layerBoxes.length === 0) {
      rowsHtml = `<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:16px;">该层暂无摆放任务</td></tr>`;
    } else {
      layerBoxes.forEach((b, idx) => {
        const weightKg = toKg(b.weight, b.weightUnit);
        const lineKg = weightKg * b.quantity;
        rowsHtml += `
          <tr>
            <td style="border:1px solid #e5e7eb;padding:8px;">${idx + 1}</td>
            <td style="border:1px solid #e5e7eb;padding:8px;font-weight:500;">${escapeHtml(b.name)}</td>
            <td style="border:1px solid #e5e7eb;padding:8px;">${b.weight} ${WEIGHT_UNIT_LABELS[b.weightUnit].split('(')[0]}</td>
            <td style="border:1px solid #e5e7eb;padding:8px;">${b.length_cm}×${b.width_cm}×${b.height_cm}</td>
            <td style="border:1px solid #e5e7eb;padding:8px;text-align:center;">${b.quantity}</td>
            <td style="border:1px solid #e5e7eb;padding:8px;text-align:center;">${POSITION_LABELS[b.positionZone]}</td>
            <td style="border:1px solid #e5e7eb;padding:8px;text-align:right;">${lineKg.toFixed(2)} kg</td>
          </tr>`;
      });
    }

    const contributorHtml = lr.maxContributor
      ? `<span style="color:#b45309;">最大贡献：${escapeHtml(lr.maxContributor.boxName)} (${lr.maxContributor.percent.toFixed(1)}%, ${lr.maxContributor.weight_kg.toFixed(2)} kg)</span>`
      : '';

    layersHtml += `
      <div style="page-break-inside:avoid;margin-bottom:24px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <div style="background:#f3f4f6;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <span style="font-size:18px;font-weight:700;color:#111827;">第 ${i + 1} 层</span>
            <span style="margin-left:12px;padding:2px 10px;border-radius:4px;background:${riskCfg.bg};color:${riskCfg.text};font-weight:600;font-size:13px;">${riskCfg.label}</span>
          </div>
          <div style="text-align:right;">
            <div style="font-size:13px;color:#6b7280;">总重 / 限重</div>
            <div style="font-size:16px;font-weight:700;font-family:monospace;">${lr.totalWeight_kg.toFixed(2)} / ${shelfConfig.layerMaxWeight_kg.toFixed(2)} kg (${lr.utilizationPercent.toFixed(1)}%)</div>
          </div>
        </div>
        <div style="padding:8px 16px;background:#fffbeb;border-bottom:1px solid #fde68a;font-size:13px;">
          安全余量：<strong>${lr.safetyMargin_kg.toFixed(2)} kg</strong>
          ${contributorHtml ? `　|　${contributorHtml}` : ''}
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="border:1px solid #e5e7eb;padding:8px;width:48px;">#</th>
              <th style="border:1px solid #e5e7eb;padding:8px;text-align:left;">货物名称</th>
              <th style="border:1px solid #e5e7eb;padding:8px;width:120px;">单重</th>
              <th style="border:1px solid #e5e7eb;padding:8px;width:130px;">尺寸(cm)</th>
              <th style="border:1px solid #e5e7eb;padding:8px;width:70px;">数量</th>
              <th style="border:1px solid #e5e7eb;padding:8px;width:80px;">位置</th>
              <th style="border:1px solid #e5e7eb;padding:8px;width:110px;text-align:right;">小计</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>`;
  }

  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>摆货清单 - ${escapeHtml(shelfConfig.name)}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:#111827;max-width:960px;margin:0 auto;padding:24px;}h1{margin:0 0 4px 0;}h2{margin:0 0 20px 0;font-size:16px;color:#6b7280;font-weight:400;}.meta{display:flex;gap:24px;padding:16px;background:#f8fafc;border-radius:8px;margin-bottom:24px;font-size:13px;}.meta div span:first-child{display:block;color:#6b7280;font-size:12px;margin-bottom:2px;}.meta div strong{font-family:monospace;}.footer{margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;}</style></head><body>
<h1>📦 仓管摆货清单</h1>
<h2>${escapeHtml(shelfConfig.name)} · 版本 v${version}</h2>
<div class="meta">
  <div><span>生成时间</span><strong>${formatDateTime(calculatedAt)}</strong></div>
  <div><span>货架层数</span><strong>${shelfConfig.layerCount} 层</strong></div>
  <div><span>层板尺寸</span><strong>${shelfConfig.layerWidth_cm}×${shelfConfig.layerDepth_cm} cm</strong></div>
  <div><span>层板限重</span><strong>${shelfConfig.layerMaxWeight_kg} kg</strong></div>
  <div><span>总承重</span><strong>${report.totalWeight_kg.toFixed(2)} kg</strong></div>
</div>
${layersHtml}
<div class="footer">※ 此清单覆盖之前的建议版本，请按最新摆放要求执行。如摆放过程中调整位置请重新计算。</div>
</body></html>`;
};

export const exportCalculationBasisHtml = (report: CalculationReport): string => {
  const { shelfConfig, boxes, layerResults, globalWarnings, calculatedAt, version, totalWeight_kg } = report;

  let warningsHtml = '';
  if (globalWarnings.length > 0) {
    const typeMap = { error: '危险', warning: '警告', info: '提示' };
    const colorMap = { error: '#dc2626', warning: '#f59e0b', info: '#2563eb' };
    warningsHtml = `<h3 style="margin-top:32px;">⚠️ 风险与提醒</h3><table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
      <thead><tr style="background:#fef2f2;"><th style="border:1px solid #e5e7eb;padding:8px;width:80px;">等级</th>
      <th style="border:1px solid #e5e7eb;padding:8px;text-align:left;">信息</th>
      <th style="border:1px solid #e5e7eb;padding:8px;text-align:left;">详情</th></tr></thead><tbody>`;
    globalWarnings.forEach((w) => {
      warningsHtml += `<tr>
        <td style="border:1px solid #e5e7eb;padding:8px;color:${colorMap[w.type]};font-weight:600;">${typeMap[w.type]}</td>
        <td style="border:1px solid #e5e7eb;padding:8px;">${escapeHtml(w.message)}${w.layerIndex !== undefined ? ` (第${w.layerIndex + 1}层)` : ''}</td>
        <td style="border:1px solid #e5e7eb;padding:8px;color:#6b7280;">${escapeHtml(w.detail || '')}</td>
      </tr>`;
    });
    warningsHtml += `</tbody></table>`;
  }

  let layersHtml = '';
  for (let i = 0; i < shelfConfig.layerCount; i++) {
    const lr = layerResults[i];
    const riskCfg = RISK_LEVEL_CONFIG[lr.riskLevel];
    const layerBoxes = boxes.filter((b) => b.layerIndex === i);

    let contributorRows = '';
    const sortedBoxes = [...layerBoxes].sort((a, b) => {
      const wa = toKg(a.weight, a.weightUnit) * a.quantity;
      const wb = toKg(b.weight, b.weightUnit) * b.quantity;
      return wb - wa;
    });
    if (sortedBoxes.length === 0) {
      contributorRows = `<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:12px;">无货物</td></tr>`;
    } else {
      sortedBoxes.forEach((b, idx) => {
        const w = toKg(b.weight, b.weightUnit) * b.quantity;
        const pct = lr.totalWeight_kg > 0 ? (w / lr.totalWeight_kg) * 100 : 0;
        const isMax = lr.maxContributor?.boxId === b.id;
        contributorRows += `<tr style="${isMax ? 'background:#fffbeb;font-weight:600;' : ''}">
          <td style="border:1px solid #e5e7eb;padding:6px;">${idx + 1}${isMax ? ' ⭐' : ''}</td>
          <td style="border:1px solid #e5e7eb;padding:6px;">${escapeHtml(b.name)}</td>
          <td style="border:1px solid #e5e7eb;padding:6px;text-align:right;font-family:monospace;">${w.toFixed(2)}</td>
          <td style="border:1px solid #e5e7eb;padding:6px;text-align:right;font-family:monospace;">${pct.toFixed(1)}%</td>
          <td style="border:1px solid #e5e7eb;padding:6px;text-align:center;">${POSITION_LABELS[b.positionZone]}</td>
        </tr>`;
      });
    }

    let heatmapHtml = '';
    const maxZone = Math.max(...POSITION_ZONES.map((z) => lr.zoneWeights[z]), 0.01);
    for (let r = 0; r < 3; r++) {
      heatmapHtml += '<tr>';
      for (let c = 0; c < 3; c++) {
        const z = POSITION_ZONES[r * 3 + c];
        const val = lr.zoneWeights[z];
        const intensity = Math.min(val / maxZone, 1);
        const green = Math.round(239 - intensity * 180);
        const red = Math.round(34 + intensity * 180);
        const bg = `rgb(${red},${green},68)`;
        const fg = intensity > 0.5 ? '#fff' : '#111827';
        heatmapHtml += `<td style="border:1px solid #e5e7eb;width:90px;height:56px;text-align:center;background:${bg};color:${fg};font-family:monospace;font-size:12px;">
          <div style="font-size:11px;opacity:.8;">${POSITION_LABELS[z]}</div>
          <div style="font-weight:600;">${val.toFixed(1)}</div>
        </td>`;
      }
      heatmapHtml += '</tr>';
    }

    layersHtml += `
      <div style="page-break-inside:avoid;margin-bottom:28px;">
        <h3 style="margin:0 0 12px 0;font-size:17px;">第 ${i + 1} 层
          <span style="margin-left:10px;padding:2px 10px;border-radius:4px;background:${riskCfg.bg};color:${riskCfg.text};font-size:13px;">${riskCfg.label}</span>
        </h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div>
            <div style="font-size:13px;color:#6b7280;margin-bottom:6px;">📊 承重数据</div>
            <div style="background:#f8fafc;border-radius:6px;padding:12px;font-size:13px;line-height:1.9;">
              总重量：<strong style="font-family:monospace;">${lr.totalWeight_kg.toFixed(2)} kg</strong><br>
              层板限重：<strong style="font-family:monospace;">${shelfConfig.layerMaxWeight_kg.toFixed(2)} kg</strong><br>
              利用率：<strong style="font-family:monospace;">${lr.utilizationPercent.toFixed(1)}%</strong><br>
              安全余量：<strong style="font-family:monospace;">${lr.safetyMargin_kg.toFixed(2)} kg</strong><br>
              中心集中度：<strong style="font-family:monospace;">${lr.centerConcentrationRatio.toFixed(1)}%</strong><br>
              箱件总数：<strong style="font-family:monospace;">${lr.boxCount}</strong>
            </div>
            <div style="margin-top:10px;font-size:13px;color:#6b7280;">📐 重量贡献排行</div>
            <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:6px;">
              <thead><tr style="background:#f1f5f9;">
                <th style="border:1px solid #e5e7eb;padding:6px;width:40px;">#</th>
                <th style="border:1px solid #e5e7eb;padding:6px;text-align:left;">名称</th>
                <th style="border:1px solid #e5e7eb;padding:6px;width:80px;text-align:right;">重量(kg)</th>
                <th style="border:1px solid #e5e7eb;padding:6px;width:70px;text-align:right;">占比</th>
                <th style="border:1px solid #e5e7eb;padding:6px;width:60px;text-align:center;">位置</th>
              </tr></thead>
              <tbody>${contributorRows}</tbody>
            </table>
          </div>
          <div>
            <div style="font-size:13px;color:#6b7280;margin-bottom:6px;">🔥 分区载荷热力图（单位加权 kg，中心×1.3 四角×0.9）</div>
            <table style="border-collapse:collapse;margin:0 auto;">
              ${heatmapHtml}
            </table>
            <div style="margin-top:10px;padding:10px;background:#eff6ff;border-radius:6px;font-size:12px;color:#1e40af;line-height:1.6;">
              <strong>计算依据：</strong><br>
              · 利用率 = 总重 / 限重 × 100%　&gt;=100% 超限，80%~100% 警告，&lt;80% 安全<br>
              · 安全余量 = 限重 − 总重<br>
              · 中心集中度 = 中心区(mc)重量 / 该层总重 × 100%　&gt;60% 视为重货集中<br>
              · ⭐ 标记为该层最大重量贡献者
            </div>
          </div>
        </div>
      </div>`;
  }

  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>计算依据 - ${escapeHtml(shelfConfig.name)}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:#111827;max-width:1100px;margin:0 auto;padding:24px;}h1{margin:0 0 4px;}h2{margin:0 0 20px;font-size:16px;color:#6b7280;font-weight:400;}h3{color:#1e3a8a;}.meta{display:flex;gap:20px;padding:16px;background:#f0f9ff;border-radius:8px;margin-bottom:24px;font-size:13px;flex-wrap:wrap;}.meta div{flex:1 1 160px;}.meta span{display:block;color:#0c4a6e;font-size:12px;margin-bottom:2px;}.meta strong{font-family:monospace;color:#075985;}.footer{margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;line-height:1.7;}</style></head><body>
<h1>📋 主管计算依据报告</h1>
<h2>${escapeHtml(shelfConfig.name)} · 版本 v${version}　｜　本报告覆盖旧版本 v${version - 1} 及之前的所有建议</h2>
<div class="meta">
  <div><span>报告编号</span><strong>${report.id}</strong></div>
  <div><span>生成时间</span><strong>${formatDateTime(calculatedAt)}</strong></div>
  <div><span>货架层数</span><strong>${shelfConfig.layerCount} 层</strong></div>
  <div><span>层板尺寸</span><strong>${shelfConfig.layerWidth_cm}×${shelfConfig.layerDepth_cm} cm</strong></div>
  <div><span>层板限重</span><strong>${shelfConfig.layerMaxWeight_kg} kg</strong></div>
  <div><span>单件建议上限</span><strong>${shelfConfig.singleItemLimit_kg} kg</strong></div>
  <div><span>总承载</span><strong>${totalWeight_kg.toFixed(2)} kg</strong></div>
</div>
${warningsHtml}
<h3 style="margin-top:32px;">🧮 分层计算明细</h3>
${layersHtml}
<div class="footer">
  <strong>单位换算：</strong>1 斤 = 0.5 kg，1 磅(lb) = 0.45359237 kg，内部统一按公斤计算。<br>
  <strong>区权因子：</strong>中心 mc ×1.3、四角 ×0.9、四边 ×1.0，用于估算层板局部应力而非绝对承重。<br>
  <strong>风险阈值：</strong>利用率 ≥100% 超限（红）、80%~100% 警告（橙）、<80% 安全（绿）；中心集中度 >60% 触发重货集中提醒。
</div>
</body></html>`;
};

export const exportPickingCsv = (report: CalculationReport): string => {
  const rows: string[] = [
    ['层号', '序号', '货物名称', '单重(kg)', '尺寸(cm)', '数量', '摆放位置', '小计(kg)', '位置编码'].join(','),
  ];
  for (let i = 0; i < report.shelfConfig.layerCount; i++) {
    const layerBoxes = report.boxes.filter((b) => b.layerIndex === i);
    if (layerBoxes.length === 0) {
      rows.push([`第${i + 1}层`, '-', '（空层）', '-', '-', '-', '-', '-', '-'].join(','));
    } else {
      layerBoxes.forEach((b, idx) => {
        const wKg = toKg(b.weight, b.weightUnit);
        rows.push(
          [
            `第${i + 1}层`,
            String(idx + 1),
            `"${b.name.replace(/"/g, '""')}"`,
            wKg.toFixed(2),
            `${b.length_cm}x${b.width_cm}x${b.height_cm}`,
            String(b.quantity),
            POSITION_LABELS[b.positionZone],
            (wKg * b.quantity).toFixed(2),
            b.positionZone,
          ].join(',')
        );
      });
    }
  }
  return '\uFEFF' + rows.join('\n');
};

const downloadBlob = (content: string, mimeType: string, filename: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const downloadPickingList = (report: CalculationReport) => {
  const name = report.shelfConfig.name.replace(/[\\/:*?"<>|]/g, '_');
  downloadBlob(
    exportPickingListHtml(report),
    'text/html;charset=utf-8',
    `${name}_摆货清单_v${report.version}.html`
  );
};

export const downloadPickingCsv = (report: CalculationReport) => {
  const name = report.shelfConfig.name.replace(/[\\/:*?"<>|]/g, '_');
  downloadBlob(
    exportPickingCsv(report),
    'text/csv;charset=utf-8',
    `${name}_摆货清单_v${report.version}.csv`
  );
};

export const downloadCalculationBasis = (report: CalculationReport) => {
  const name = report.shelfConfig.name.replace(/[\\/:*?"<>|]/g, '_');
  downloadBlob(
    exportCalculationBasisHtml(report),
    'text/html;charset=utf-8',
    `${name}_计算依据_v${report.version}.html`
  );
};

export const displayWeight = (kg: number, unit: 'kg' | 'jin' | 'lb' = 'kg'): string => {
  return `${fromKg(kg, unit).toFixed(2)} ${unit === 'kg' ? 'kg' : unit === 'jin' ? '斤' : 'lb'}`;
};
