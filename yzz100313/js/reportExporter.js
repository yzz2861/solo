const ReportExporter = (function() {
  function generateReport() {
    const routes = DataManager.getRoutes();
    const risks = DataManager.getRisks();
    const reviews = DataManager.getReviews();
    const noFlyZones = DataManager.getNoFlyZones();
    const stats = DataManager.getStats();

    let reportHtml = buildReportHTML(routes, risks, reviews, noFlyZones, stats);
    downloadFile(reportHtml, `飞行复盘报告_${Utils.formatDateShort(new Date())}.html`, 'text/html');
  }

  function buildReportHTML(routes, risks, reviews, noFlyZones, stats) {
    const riskTypeStats = {
      nofly: risks.filter(r => r.type === 'nofly').length,
      height: risks.filter(r => r.type === 'height').length,
      person: risks.filter(r => r.type === 'person').length
    };

    const reviewStatusStats = {
      pending: 0,
      confirmed: 0,
      false_alarm: 0,
      approved: 0
    };
    risks.forEach(r => {
      const review = reviews[r.id];
      const status = review?.status || 'pending';
      reviewStatusStats[status] = (reviewStatusStats[status] || 0) + 1;
    });

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>无人机巡检飞行复盘报告</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      font-size: 14px;
      color: #1f2937;
      background: #f9fafb;
      padding: 20px;
      line-height: 1.6;
    }
    .report-container {
      max-width: 1000px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .report-header {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: white;
      padding: 30px;
    }
    .report-header h1 {
      font-size: 24px;
      margin-bottom: 8px;
    }
    .report-header .report-date {
      opacity: 0.9;
      font-size: 13px;
    }
    .report-body {
      padding: 30px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: #f9fafb;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #111827;
    }
    .stat-label {
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
    }
    .stat-card.danger .stat-value { color: #dc2626; }
    .stat-card.warning .stat-value { color: #d97706; }
    .stat-card.success .stat-value { color: #16a34a; }
    .stat-card.info .stat-value { color: #2563eb; }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    tr:hover td {
      background: #f9fafb;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-danger { background: #fee2e2; color: #dc2626; }
    .badge-warning { background: #fef3c7; color: #d97706; }
    .badge-info { background: #dbeafe; color: #2563eb; }
    .badge-success { background: #dcfce7; color: #16a34a; }
    .badge-gray { background: #e5e7eb; color: #6b7280; }
    .badge-purple { background: #f3e8ff; color: #7c3aed; }

    .risk-detail {
      background: #f9fafb;
      border-radius: 6px;
      padding: 12px;
      margin-top: 8px;
      font-size: 12px;
    }
    .risk-detail-row {
      display: flex;
      margin-bottom: 4px;
    }
    .risk-detail-label {
      color: #6b7280;
      min-width: 80px;
    }
    .risk-detail-value {
      color: #374151;
      font-weight: 500;
    }

    .review-section {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px dashed #d1d5db;
    }
    .review-section h4 {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 6px;
    }

    .route-summary {
      background: #f0fdf4;
      border-left: 4px solid #22c55e;
      padding: 12px;
      margin-bottom: 15px;
      border-radius: 0 6px 6px 0;
    }
    .route-summary.warning {
      background: #fffbeb;
      border-left-color: #f59e0b;
    }
    .route-summary.danger {
      background: #fef2f2;
      border-left-color: #ef4444;
    }

    @media print {
      body { background: white; padding: 0; }
      .report-container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-header">
      <h1>无人机巡检飞行复盘报告</h1>
      <div class="report-date">生成时间：${Utils.formatDate(new Date())}</div>
    </div>
    <div class="report-body">

      <div class="section">
        <h2 class="section-title">总览</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${stats.totalRoutes}</div>
            <div class="stat-label">航线总数</div>
          </div>
          <div class="stat-card danger">
            <div class="stat-value">${stats.totalRisks}</div>
            <div class="stat-label">风险总数</div>
          </div>
          <div class="stat-card warning">
            <div class="stat-value">${stats.pendingRisks}</div>
            <div class="stat-label">待复核</div>
          </div>
          <div class="stat-card info">
            <div class="stat-value">${noFlyZones.length}</div>
            <div class="stat-label">禁飞区</div>
          </div>
        </div>
        <div class="stats-grid">
          <div class="stat-card danger">
            <div class="stat-value">${riskTypeStats.nofly}</div>
            <div class="stat-label">穿越禁飞区</div>
          </div>
          <div class="stat-card warning">
            <div class="stat-value">${riskTypeStats.height}</div>
            <div class="stat-label">高度超限</div>
          </div>
          <div class="stat-card" style="background: #faf5ff;">
            <div class="stat-value" style="color: #7c3aed;">${riskTypeStats.person}</div>
            <div class="stat-label">人员不一致</div>
          </div>
          <div class="stat-card success">
            <div class="stat-value">${reviewStatusStats.confirmed + reviewStatusStats.false_alarm + reviewStatusStats.approved}</div>
            <div class="stat-label">已复核</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">航线列表</h2>
        <table>
          <thead>
            <tr>
              <th>航线编号</th>
              <th>航线名称</th>
              <th>飞手</th>
              <th>审批人</th>
              <th>飞行日期</th>
              <th>航点数</th>
              <th>风险数</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            ${routes.map(route => {
              const routeRisks = risks.filter(r => r.routeId === route.id);
              const hasRisk = routeRisks.length > 0;
              const hasHighRisk = routeRisks.some(r => r.severity === 'high');
              let statusClass = 'success';
              let statusText = '正常';
              if (hasHighRisk) { statusClass = 'danger'; statusText = '高风险'; }
              else if (hasRisk) { statusClass = 'warning'; statusText = '有风险'; }
              return `
                <tr>
                  <td><strong>${Utils.escapeHtml(route.id)}</strong></td>
                  <td>${Utils.escapeHtml(route.name)}</td>
                  <td>${Utils.escapeHtml(route.pilot || '-')}</td>
                  <td>${Utils.escapeHtml(route.approver || '-')}</td>
                  <td>${Utils.escapeHtml(route.flightDate || '-')}</td>
                  <td>${route.actualPoints.length || route.planPoints.length}</td>
                  <td><span class="badge ${routeRisks.length > 0 ? 'badge-danger' : 'badge-gray'}">${routeRisks.length}</span></td>
                  <td><span class="badge badge-${statusClass}">${statusText}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2 class="section-title">风险明细</h2>
        ${risks.length === 0 ? '<p style="color: #6b7280;">暂无风险记录</p>' : ''}
        ${risks.map((risk, idx) => {
          const review = reviews[risk.id];
          const typeBadge = {
            nofly: 'badge-danger',
            height: 'badge-warning',
            person: 'badge-purple'
          }[risk.type] || 'badge-gray';
          const statusBadge = {
            pending: 'badge-gray',
            confirmed: 'badge-danger',
            false_alarm: 'badge-success',
            approved: 'badge-info'
          }[review?.status || 'pending'] || 'badge-gray';

          return `
            <div class="risk-item" style="margin-bottom: 15px; padding: 15px; background: #fafafa; border-radius: 8px; border: 1px solid #e5e7eb;">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <span class="badge ${typeBadge}">${Utils.getRiskTypeLabel(risk.type)}</span>
                <span class="badge ${statusBadge}">${Utils.getRiskStatusLabel(review?.status || 'pending')}</span>
                <strong style="flex: 1;">${Utils.escapeHtml(risk.routeName)}</strong>
                <span style="color: #9ca3af; font-size: 12px;">#${idx + 1}</span>
              </div>
              <p style="color: #374151; margin-bottom: 10px;">${Utils.escapeHtml(risk.description)}</p>

              ${risk.details ? `
                <div class="risk-detail">
                  ${risk.details.zoneName ? `<div class="risk-detail-row"><span class="risk-detail-label">禁飞区：</span><span class="risk-detail-value">${Utils.escapeHtml(risk.details.zoneName)}</span></div>` : ''}
                  ${risk.details.limit !== undefined ? `<div class="risk-detail-row"><span class="risk-detail-label">限高：</span><span class="risk-detail-value">${risk.details.limit}m</span></div>` : ''}
                  ${risk.details.maxHeight !== undefined ? `<div class="risk-detail-row"><span class="risk-detail-label">最大高度：</span><span class="risk-detail-value">${risk.details.maxHeight.toFixed(1)}m</span></div>` : ''}
                  ${risk.details.exceedAmount !== undefined ? `<div class="risk-detail-row"><span class="risk-detail-label">超出：</span><span class="risk-detail-value">${risk.details.exceedAmount.toFixed(1)}m</span></div>` : ''}
                  ${risk.details.pointCount ? `<div class="risk-detail-row"><span class="risk-detail-label">涉及航点：</span><span class="risk-detail-value">${risk.details.pointCount} 个</span></div>` : ''}
                  ${risk.details.pilot ? `<div class="risk-detail-row"><span class="risk-detail-label">飞手：</span><span class="risk-detail-value">${Utils.escapeHtml(risk.details.pilot)}</span></div>` : ''}
                  ${risk.details.approver ? `<div class="risk-detail-row"><span class="risk-detail-label">审批人：</span><span class="risk-detail-value">${Utils.escapeHtml(risk.details.approver)}</span></div>` : ''}
                  ${risk.location ? `<div class="risk-detail-row"><span class="risk-detail-label">位置：</span><span class="risk-detail-value">${risk.location.lat.toFixed(6)}, ${risk.location.lon.toFixed(6)}</span></div>` : ''}
                </div>
              ` : ''}

              ${review ? `
                <div class="review-section">
                  <h4>复核信息</h4>
                  <div class="risk-detail-row"><span class="risk-detail-label">复核人：</span><span class="risk-detail-value">${Utils.escapeHtml(review.reviewer || '-')}</span></div>
                  ${review.comment ? `<div class="risk-detail-row"><span class="risk-detail-label">复核意见：</span><span class="risk-detail-value">${Utils.escapeHtml(review.comment)}</span></div>` : ''}
                  <div class="risk-detail-row"><span class="risk-detail-label">复核时间：</span><span class="risk-detail-value">${Utils.formatDate(review.updatedAt)}</span></div>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>

      <div class="section">
        <h2 class="section-title">禁飞区列表</h2>
        ${noFlyZones.length === 0 ? '<p style="color: #6b7280;">暂无禁飞区数据</p>' : `
          <table>
            <thead>
              <tr>
                <th>编号</th>
                <th>名称</th>
                <th>类型</th>
                <th>限高</th>
              </tr>
            </thead>
            <tbody>
              ${noFlyZones.map(zone => `
                <tr>
                  <td>${Utils.escapeHtml(zone.id)}</td>
                  <td>${Utils.escapeHtml(zone.name)}</td>
                  <td>${Utils.escapeHtml(zone.type || '-')}</td>
                  <td>${zone.maxHeight ? zone.maxHeight + 'm' : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>

    </div>
  </div>
</body>
</html>`;
  }

  function generateCSVReport() {
    const risks = DataManager.getRisks();
    const reviews = DataManager.getReviews();

    const headers = ['编号', '航线编号', '航线名称', '风险类型', '风险描述', '严重程度', '纬度', '经度', '复核状态', '复核人', '复核意见', '复核时间'];
    const rows = risks.map((risk, idx) => {
      const review = reviews[risk.id];
      return [
        idx + 1,
        risk.routeId,
        risk.routeName,
        Utils.getRiskTypeLabel(risk.type),
        risk.description,
        risk.severity === 'high' ? '高' : '中',
        risk.location?.lat?.toFixed(6) || '',
        risk.location?.lon?.toFixed(6) || '',
        Utils.getRiskStatusLabel(review?.status || 'pending'),
        review?.reviewer || '',
        review?.comment || '',
        review?.updatedAt ? Utils.formatDate(review.updatedAt) : ''
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const BOM = '\uFEFF';
    downloadFile(BOM + csvContent, `风险明细_${Utils.formatDateShort(new Date())}.csv`, 'text/csv');
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return {
    generateReport,
    generateCSVReport
  };
})();
