const App = (function() {
  let currentRouteId = null;
  let currentRiskId = null;

  function init() {
    DataManager.loadFromStorage();
    MapViewer.init();
    bindEvents();
    renderRouteList();
    updateStats();
    refreshExportButton();
  }

  function bindEvents() {
    document.getElementById('file-route').addEventListener('change', handleRouteFiles);
    document.getElementById('file-nofly').addEventListener('change', handleNoFlyFiles);
    document.getElementById('file-pilot').addEventListener('change', handlePilotFiles);

    document.getElementById('filter-nofly').addEventListener('change', handleFilterChange);
    document.getElementById('filter-height').addEventListener('change', handleFilterChange);
    document.getElementById('filter-person').addEventListener('change', handleFilterChange);
    document.getElementById('filter-reviewed').addEventListener('change', handleFilterChange);

    document.getElementById('btn-export-report').addEventListener('click', () => {
      ReportExporter.generateReport();
      Utils.toast('报告已导出', 'success');
    });

    document.getElementById('btn-clear-all').addEventListener('click', handleClearAll);

    document.getElementById('btn-save-review').addEventListener('click', handleSaveReview);

    document.querySelectorAll('[data-close]').forEach(el => {
      el.addEventListener('click', closeReviewModal);
    });
  }

  async function handleRouteFiles(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    let totalAdded = 0;
    let totalSkipped = 0;

    for (const file of files) {
      try {
        const result = await DataManager.importRouteCSV(file);
        if (result.skipped) {
          totalSkipped++;
        } else {
          totalAdded += result.count;
        }
      } catch (err) {
        Utils.toast(`导入失败: ${file.name} - ${err.message}`, 'error');
      }
    }

    if (totalAdded > 0) {
      RiskAnalyzer.analyzeAll();
      renderRouteList();
      MapViewer.renderNoFlyZones();
      refreshExportButton();
      updateStats();
      Utils.toast(`成功导入 ${totalAdded} 条航线`, 'success');
    }
    if (totalSkipped > 0) {
      Utils.toast(`${totalSkipped} 个文件重复，已跳过`, 'warning');
    }

    e.target.value = '';
  }

  async function handleNoFlyFiles(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    let totalAdded = 0;
    let totalSkipped = 0;

    for (const file of files) {
      try {
        const result = await DataManager.importNoFlyGeoJSON(file);
        if (result.skipped) {
          totalSkipped++;
        } else {
          totalAdded += result.count;
        }
      } catch (err) {
        Utils.toast(`导入失败: ${file.name} - ${err.message}`, 'error');
      }
    }

    if (totalAdded > 0 || DataManager.hasData()) {
      if (DataManager.hasData()) {
        RiskAnalyzer.analyzeAll();
        renderRouteList();
      }
      MapViewer.renderNoFlyZones();
      if (currentRouteId) {
        MapViewer.showRoute(currentRouteId);
        renderRiskList();
        renderRouteDetail();
      }
      updateStats();
      refreshExportButton();
      Utils.toast(`成功导入 ${totalAdded} 个禁飞区`, 'success');
    }
    if (totalSkipped > 0) {
      Utils.toast(`${totalSkipped} 个文件重复，已跳过`, 'warning');
    }

    e.target.value = '';
  }

  async function handlePilotFiles(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    let totalAdded = 0;
    let totalSkipped = 0;

    for (const file of files) {
      try {
        const result = await DataManager.importPilotJSON(file);
        if (result.skipped) {
          totalSkipped++;
        } else {
          totalAdded += result.count;
        }
      } catch (err) {
        Utils.toast(`导入失败: ${file.name} - ${err.message}`, 'error');
      }
    }

    if (totalAdded > 0 || DataManager.hasData()) {
      if (DataManager.hasData()) {
        RiskAnalyzer.analyzeAll();
        renderRouteList();
      }
      if (currentRouteId) {
        MapViewer.showRoute(currentRouteId);
        renderRiskList();
        renderRouteDetail();
      }
      updateStats();
      refreshExportButton();
      Utils.toast(`成功导入 ${totalAdded} 条飞手记录`, 'success');
    }
    if (totalSkipped > 0) {
      Utils.toast(`${totalSkipped} 个文件重复，已跳过`, 'warning');
    }

    e.target.value = '';
  }

  function handleFilterChange() {
    renderRouteList();
    if (currentRouteId) {
      renderRiskList();
    }
  }

  function getActiveFilters() {
    const types = [];
    if (document.getElementById('filter-nofly').checked) types.push('nofly');
    if (document.getElementById('filter-height').checked) types.push('height');
    if (document.getElementById('filter-person').checked) types.push('person');

    const onlyUnreviewed = document.getElementById('filter-reviewed').checked;

    return { types, onlyUnreviewed };
  }

  function renderRouteList() {
    const container = document.getElementById('route-list');
    const routes = DataManager.getRoutes();
    const filters = getActiveFilters();

    document.getElementById('route-count').textContent = routes.length;

    if (routes.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <p>暂无航线数据</p>
          <small>请先导入 CSV 文件</small>
        </div>
      `;
      return;
    }

    const routeItems = routes.map(route => {
      const allRisks = DataManager.getRisksByRouteId(route.id);
      const filteredRisks = RiskAnalyzer.filterRisks(allRisks, filters);
      const riskCount = filteredRisks.length;
      const hasHighRisk = filteredRisks.some(r => r.severity === 'high');

      let statusClass = 'status-normal';
      let statusText = '正常';
      if (hasHighRisk) {
        statusClass = 'status-danger';
        statusText = '高风险';
      } else if (riskCount > 0) {
        statusClass = 'status-warning';
        statusText = '有风险';
      }

      const isActive = route.id === currentRouteId;

      const pointCount = route.actualPoints.length > 0 ? route.actualPoints.length : route.planPoints.length;

      return `
        <div class="route-item ${isActive ? 'active' : ''}" data-route-id="${route.id}">
          <div class="route-item-header">
            <span class="route-name">${Utils.escapeHtml(route.name)}</span>
            <span class="route-status ${statusClass}">${statusText}</span>
          </div>
          <div class="route-meta">
            <span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${pointCount} 点
            </span>
            <span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              ${riskCount} 风险
            </span>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = routeItems;

    container.querySelectorAll('.route-item').forEach(item => {
      item.addEventListener('click', () => {
        selectRoute(item.dataset.routeId);
      });
    });
  }

  function selectRoute(routeId) {
    currentRouteId = routeId;
    currentRiskId = null;
    MapViewer.showRoute(routeId);
    renderRouteList();
    renderRouteDetail();
    renderRiskList();
  }

  function renderRouteDetail() {
    const container = document.getElementById('route-detail');
    if (!currentRouteId) return;

    const route = DataManager.getRouteById(currentRouteId);
    if (!route) return;

    const risks = DataManager.getRisksByRouteId(route.id);
    const reviews = DataManager.getReviews();

    let totalDistance = 0;
    let maxHeight = 0;
    const points = route.actualPoints.length > 0 ? route.actualPoints : route.planPoints;

    if (points.length >= 2) {
      for (let i = 1; i < points.length; i++) {
        const from = turf.point([points[i-1].lon, points[i-1].lat]);
        const to = turf.point([points[i].lon, points[i].lat]);
        totalDistance += turf.distance(from, to, { units: 'meters' });
      }
    }

    points.forEach(p => {
      if (p.height > maxHeight) maxHeight = p.height;
    });

    container.innerHTML = `
      <div class="detail-section">
        <h4>基本信息</h4>
        <div class="detail-row">
          <span class="detail-label">航线编号</span>
          <span class="detail-value">${Utils.escapeHtml(route.id)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">航线名称</span>
          <span class="detail-value">${Utils.escapeHtml(route.name)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">飞行日期</span>
          <span class="detail-value">${Utils.escapeHtml(route.flightDate || '-')}</span>
        </div>
      </div>

      <div class="detail-section">
        <h4>人员信息</h4>
        <div class="detail-row">
          <span class="detail-label">飞手</span>
          <span class="detail-value">${Utils.escapeHtml(route.pilot || '-')}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">审批人</span>
          <span class="detail-value">${Utils.escapeHtml(route.approver || '-')}</span>
        </div>
      </div>

      <div class="detail-section">
        <h4>飞行数据</h4>
        <div class="detail-row">
          <span class="detail-label">计划航点</span>
          <span class="detail-value">${route.planPoints.length} 个</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">实际航点</span>
          <span class="detail-value">${route.actualPoints.length} 个</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">飞行里程</span>
          <span class="detail-value">${Utils.formatDistance(totalDistance)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">最大高度</span>
          <span class="detail-value">${maxHeight.toFixed(1)} m</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">限高</span>
          <span class="detail-value">${route.maxHeight} m</span>
        </div>
      </div>

      <div class="detail-section">
        <h4>风险统计</h4>
        <div class="stats-grid">
          <div class="stat-card danger">
            <div class="stat-value">${risks.length}</div>
            <div class="stat-label">总风险</div>
          </div>
          <div class="stat-card warning">
            <div class="stat-value">${risks.filter(r => !reviews[r.id] || reviews[r.id].status === 'pending').length}</div>
            <div class="stat-label">待复核</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderRiskList() {
    const container = document.getElementById('risk-list');
    const filters = getActiveFilters();

    if (!currentRouteId) {
      document.getElementById('risk-count').textContent = '0';
      return;
    }

    let risks = DataManager.getRisksByRouteId(currentRouteId);
    risks = RiskAnalyzer.filterRisks(risks, filters);

    document.getElementById('risk-count').textContent = risks.length;

    if (risks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <p>暂无风险记录</p>
        </div>
      `;
      return;
    }

    const riskCards = risks.map(risk => {
      const review = DataManager.getReview(risk.id);
      const status = review?.status || 'pending';
      const isActive = risk.id === currentRiskId;

      return `
        <div class="risk-card ${isActive ? 'active' : ''}" data-risk-id="${risk.id}">
          <div class="risk-header">
            <span class="risk-type ${risk.type}">${Utils.getRiskTypeLabel(risk.type)}</span>
            <span class="risk-status ${status}">${Utils.getRiskStatusLabel(status)}</span>
          </div>
          <div class="risk-desc">${Utils.escapeHtml(risk.description)}</div>
          <div class="risk-meta">
            ${risk.location ? `<span>📍 ${risk.location.lat.toFixed(4)}, ${risk.location.lon.toFixed(4)}</span>` : ''}
          </div>
          ${review && review.comment ? `
            <div class="risk-review">
              <strong>复核意见：</strong>${Utils.escapeHtml(review.comment)}
            </div>
          ` : ''}
          <div class="risk-action">
            <button class="btn-link" data-review="${risk.id}">
              ${review ? '修改复核' : '填写复核'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = riskCards;

    container.querySelectorAll('.risk-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-review]')) return;
        highlightRisk(card.dataset.riskId);
      });
    });

    container.querySelectorAll('[data-review]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openReviewModal(btn.dataset.review);
      });
    });
  }

  function highlightRisk(riskId) {
    currentRiskId = riskId;
    MapViewer.highlightRisk(riskId);
    renderRiskList();
  }

  function openReviewModal(riskId) {
    currentRiskId = riskId;
    const risk = DataManager.getRisks().find(r => r.id === riskId);
    const review = DataManager.getReview(riskId);

    if (!risk) return;

    document.getElementById('review-risk-summary').innerHTML = `
      <div class="type-label">
        <span class="risk-type ${risk.type}" style="margin-right: 8px;">${Utils.getRiskTypeLabel(risk.type)}</span>
        ${Utils.escapeHtml(risk.routeName)}
      </div>
      <div style="color: #374151;">${Utils.escapeHtml(risk.description)}</div>
    `;

    document.getElementById('review-status').value = review?.status || 'pending';
    document.getElementById('review-comment').value = review?.comment || '';
    document.getElementById('reviewer').value = review?.reviewer || '';

    document.getElementById('review-modal').classList.add('show');
  }

  function closeReviewModal() {
    document.getElementById('review-modal').classList.remove('show');
  }

  function handleSaveReview() {
    if (!currentRiskId) return;

    const status = document.getElementById('review-status').value;
    const comment = document.getElementById('review-comment').value.trim();
    const reviewer = document.getElementById('reviewer').value.trim();

    DataManager.saveReview(currentRiskId, {
      status,
      comment,
      reviewer
    });

    closeReviewModal();
    renderRouteList();
    renderRiskList();
    renderRouteDetail();
    MapViewer.refresh();
    updateStats();

    Utils.toast('复核意见已保存', 'success');
  }

  function handleClearAll() {
    if (!confirm('确定要清空所有数据吗？此操作不可撤销。')) return;

    DataManager.clearAll();
    currentRouteId = null;
    currentRiskId = null;

    renderRouteList();
    renderRiskList();
    renderRouteDetail();
    document.getElementById('risk-count').textContent = '0';
    document.getElementById('route-count').textContent = '0';
    MapViewer.renderNoFlyZones();
    MapViewer.clearHighlight();
    refreshExportButton();
    updateStats();

    Utils.toast('数据已清空', 'success');
  }

  function refreshExportButton() {
    const btn = document.getElementById('btn-export-report');
    btn.disabled = !DataManager.hasData();
  }

  function updateStats() {
    const stats = DataManager.getStats();
  }

  return {
    init,
    selectRoute,
    highlightRisk,
    renderRouteList
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
