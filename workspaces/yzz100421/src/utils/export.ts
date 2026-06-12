import type { LayoutScheme, OverflowWarning } from '../types';

export function formatNumber(num: number, digits = 2): string {
  if (num == null || Number.isNaN(num)) return '-';
  if (!Number.isFinite(num)) return String(num);
  return num.toFixed(digits);
}

function escapeHtml(value: unknown): string {
  const s = value == null ? '' : String(value);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const severityText: Record<string, string> = {
  danger: '严重',
  warning: '警告',
};

const typeText: Record<string, string> = {
  fireDoor: '消防门',
  pedestrian: '行人通道',
  forklift: '叉车通道',
  forbidden: '禁区',
};

function formatTimestamp(ts: number): string {
  if (!ts) return '-';
  try {
    return new Date(ts).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return String(ts);
  }
}

export function buildReportHtml(
  scheme: LayoutScheme,
  warnings: OverflowWarning[],
  screenshotDataUrl?: string,
): string {
  const { agvParams, corridorParams, entities } = scheme;

  const entityCount: Record<string, number> = {};
  for (const e of entities) {
    entityCount[e.type] = (entityCount[e.type] ?? 0) + 1;
  }

  const sortedWarnings = [...(warnings ?? [])].sort(
    (a, b) => (a.severity === 'danger' ? 0 : 1) - (b.severity === 'danger' ? 0 : 1),
  );

  const dangerCount = sortedWarnings.filter((w) => w.severity === 'danger').length;
  const warningCount = sortedWarnings.filter((w) => w.severity === 'warning').length;

  const summaryRows = `
<tr>
  <td style="width:160px;">方案名称</td>
  <td>${escapeHtml(scheme.name)}</td>
  <td style="width:160px;">方案 ID</td>
  <td><code style="font-size:12px;color:#666;">${escapeHtml(scheme.id)}</code></td>
</tr>
<tr>
  <td>场景类型</td>
  <td>${scheme.scenarioType === 'peak' ? '高峰' : scheme.scenarioType === 'offPeak' ? '低峰' : '通用'}</td>
  <td>创建时间</td>
  <td>${formatTimestamp(scheme.createdAt)}</td>
</tr>
<tr>
  <td>更新时间</td>
  <td>${formatTimestamp(scheme.updatedAt)}</td>
  <td>风险评分</td>
  <td>${scheme.metrics.riskScore}</td>
</tr>`;

  const agvRows = `
<tr><td>车体长度</td><td>${formatNumber(agvParams.lengthMeters)} m</td>
    <td>车体宽度</td><td>${formatNumber(agvParams.widthMeters)} m</td></tr>
<tr><td>最小转弯半径</td><td>${formatNumber(agvParams.turningRadius)} m</td>
    <td>充满电时间</td><td>${formatNumber(agvParams.chargeMinutes, 0)} 分钟</td></tr>
<tr><td>低电量阈值</td><td>${formatNumber(agvParams.lowBatteryThreshold, 0)}%</td>
    <td>高峰车辆数</td><td>${agvParams.peakCount}</td></tr>
<tr><td>平峰车辆数</td><td>${agvParams.offPeakCount}</td>
    <td colspan="2"></td></tr>`;

  const corridorRows = `
<tr><td>主通道宽度</td><td>${formatNumber(corridorParams.mainCorridorWidth)} m</td>
    <td>叉车作业通道</td><td>${formatNumber(corridorParams.forkliftWidth)} m</td></tr>
<tr><td>消防净空距离</td><td>${formatNumber(corridorParams.fireClearance)} m</td>
    <td colspan="2"></td></tr>`;

  const entityTypeLabels: Record<string, string> = {
    charger: '充电桩',
    waitZone: '等待区',
    pedestrian: '行人通道',
    fireDoor: '消防门',
    agvPath: 'AGV 路径',
    forbidden: '禁入区域',
  };

  const entityRows = Object.entries(entityCount)
    .map(
      ([type, count]) => `
<tr>
  <td>${escapeHtml(entityTypeLabels[type] || type)}</td>
  <td style="text-align:right;">${count}</td>
</tr>`,
    )
    .join('');

  const metricsRows = `
<tr><td>占地总面积</td><td>${formatNumber(scheme.metrics.landUsage)} m²</td>
    <td>充电桩数</td><td>${scheme.metrics.chargerCount}</td></tr>
<tr><td>等待区容量</td><td>${scheme.metrics.waitCapacity} 辆</td>
    <td>预估最大排队</td><td>${scheme.metrics.maxQueueLength} 辆</td></tr>`;

  const warningSummary = `
<span style="margin-right:16px;">严重：<b style="color:#EF4444;">${dangerCount}</b></span>
<span>警告：<b style="color:#F59E0B;">${warningCount}</b></span>`;

  const warningRows =
    sortedWarnings.length > 0
      ? sortedWarnings
          .map(
            (w) => `
<tr>
  <td style="color:${w.severity === 'danger' ? '#EF4444' : '#F59E0B'};font-weight:600;">${severityText[w.severity] || w.severity}</td>
  <td>${escapeHtml(typeText[w.type] || w.type)}</td>
  <td>${escapeHtml(w.message)}</td>
  <td>${w.position ? `(${formatNumber(w.position.x)}, ${formatNumber(w.position.z)})` : '—'}</td>
</tr>`,
          )
          .join('')
      : `<tr><td colspan="4" style="text-align:center;color:#999;">无警告信息</td></tr>`;

  const screenshotBlock = screenshotDataUrl
    ? `
<section style="margin-top:20px;">
  <h3 style="font-size:16px;border-left:4px solid #2563EB;padding-left:8px;">布局截图</h3>
  <div style="margin-top:12px;text-align:center;border:1px solid #e8e8e8;border-radius:6px;padding:12px;background:#fafafa;">
    <img src="${escapeHtml(screenshotDataUrl)}" alt="布局截图" style="max-width:100%;max-height:600px;border-radius:4px;" />
  </div>
</section>`
    : '';

  const adjustmentRows = entities
    .filter((e) => e.type === 'fireDoor' || e.type === 'charger')
    .map((e) => {
      const suggestion =
        e.type === 'fireDoor'
          ? '确保消防门净空范围内无排队AGV，建议预留至少1.4m净空'
          : '建议充电桩间距不低于3m，排队区设于等待区内';
      return `
<tr>
  <td>${escapeHtml(e.name)}</td>
  <td>(${formatNumber(e.position.x)}, ${formatNumber(e.position.z)})</td>
  <td>${escapeHtml(suggestion)}</td>
</tr>`;
    })
    .join('');

  const reviewPoints = `
<tr><td>消防门净空是否满足规范（≥1.4m）</td><td>□</td></tr>
<tr><td>主通道宽度是否满足叉车双向通行（≥2倍叉车宽）</td><td>□</td></tr>
<tr><td>AGV转弯半径是否满足最小要求</td><td>□</td></tr>
<tr><td>排队溢出是否影响行人通道</td><td>□</td></tr>
<tr><td>充电桩间距是否满足安全要求</td><td>□</td></tr>
<tr><td>等待区容量是否覆盖高峰回充需求</td><td>□</td></tr>`;

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>AGV充电布局方案报告 - ${escapeHtml(scheme.name)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif; margin: 0; padding: 32px; background: #f5f7fa; color: #222; }
    .wrap { max-width: 1080px; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); padding: 32px 40px 40px; }
    h1 { margin: 0 0 4px; font-size: 24px; }
    .sub { color: #888; margin-bottom: 24px; font-size: 13px; }
    section { margin-top: 28px; }
    h3 { font-size: 16px; border-left: 4px solid #2563EB; padding-left: 8px; margin: 0 0 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { border: 1px solid #e8e8e8; padding: 8px 12px; text-align: left; vertical-align: middle; }
    th { background: #fafafa; font-weight: 600; }
    tr:nth-child(even) td { background: #fcfcfc; }
    code { background: #f6f8fa; padding: 2px 4px; border-radius: 3px; color: #d6336c; }
    @media print {
      body { padding: 0; background: #fff; }
      .wrap { box-shadow: none; max-width: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>AGV充电布局方案报告</h1>
    <div class="sub">生成时间：${formatTimestamp(Date.now())}</div>

    <section>
      <h3>基础信息</h3>
      <table><tbody>${summaryRows}</tbody></table>
    </section>

    ${screenshotBlock}

    <section>
      <h3>参数概览</h3>
      <table>
        <thead><tr><th colspan="4">AGV 本体参数</th></tr></thead>
        <tbody>${agvRows}</tbody>
      </table>
      <table style="margin-top:12px;">
        <thead><tr><th colspan="4">通道与约束参数</th></tr></thead>
        <tbody>${corridorRows}</tbody>
      </table>
    </section>

    <section>
      <h3>布局实体统计</h3>
      <table>
        <thead><tr><th>实体类型</th><th style="width:120px;text-align:right;">数量</th></tr></thead>
        <tbody>${entityRows || '<tr><td colspan="2" style="text-align:center;color:#999;">暂无实体</td></tr>'}</tbody>
      </table>
    </section>

    <section>
      <h3>方案指标</h3>
      <table><tbody>${metricsRows}</tbody></table>
    </section>

    <section>
      <h3>警告汇总</h3>
      <div style="margin-bottom:12px;">${warningSummary}</div>
      <table>
        <thead>
          <tr><th style="width:80px;">级别</th><th style="width:120px;">类型</th><th>详细描述</th><th style="width:140px;">位置</th></tr>
        </thead>
        <tbody>${warningRows}</tbody>
      </table>
    </section>

    <section>
      <h3>调整位置建议</h3>
      <table>
        <thead><tr><th>实体名称</th><th>当前坐标</th><th>建议调整</th></tr></thead>
        <tbody>${adjustmentRows || '<tr><td colspan="3" style="text-align:center;color:#999;">暂无调整建议</td></tr>'}</tbody>
      </table>
    </section>

    <section>
      <h3>预计容量</h3>
      <table>
        <tbody>
          <tr><td>充电桩数量</td><td>${scheme.metrics.chargerCount} 个</td></tr>
          <tr><td>等待区容量</td><td>${scheme.metrics.waitCapacity} 辆</td></tr>
          <tr><td>高峰回充支持</td><td>${agvParams.peakCount} 辆</td></tr>
          <tr><td>低峰回充支持</td><td>${agvParams.offPeakCount} 辆</td></tr>
          <tr><td>预估充电周转率</td><td>${scheme.metrics.chargerCount > 0 ? formatNumber(60 / agvParams.chargeMinutes * scheme.metrics.chargerCount, 1) : 0} 辆/小时</td></tr>
        </tbody>
      </table>
    </section>

    <section>
      <h3>复核点清单</h3>
      <table>
        <thead><tr><th>复核项目</th><th style="width:60px;">确认</th></tr></thead>
        <tbody>${reviewPoints}</tbody>
      </table>
    </section>
  </div>
</body>
</html>`;
}
