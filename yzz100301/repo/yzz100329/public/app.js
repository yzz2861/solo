const state = {
  currentView: 'dashboard',
  poles: { page: 1, pageSize: 20, total: 0, keyword: '' },
  anomalies: { page: 1, pageSize: 20, total: 0, type: '' },
  review: { page: 1, pageSize: 20, total: 0 },
  report: { data: [], stats: null }
};

const titles = {
  dashboard: '数据概览',
  import: '数据导入',
  poles: '灯杆台账',
  chain: '巡修链查询',
  anomalies: '异常检测',
  review: '复核管理',
  report: '闭环报告'
};

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initImport();
  initRefresh();
  initAnomalyFilters();
  initReview();
  initReport();
  initChainSearch();
  initPoles();

  loadDashboard();
});

function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.dataset.view;
      switchView(view);
    });
  });
}

function switchView(view) {
  state.currentView = view;

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === view);
  });

  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active');
  });
  document.getElementById(`view-${view}`).classList.add('active');

  document.getElementById('page-title').textContent = titles[view] || '';

  if (view === 'dashboard') loadDashboard();
  if (view === 'poles') loadPoles();
  if (view === 'anomalies') loadAnomalies();
  if (view === 'review') loadReview();
  if (view === 'import') loadBatches();
}

function initRefresh() {
  document.getElementById('btn-refresh').addEventListener('click', () => {
    const view = state.currentView;
    if (view === 'dashboard') loadDashboard();
    if (view === 'poles') loadPoles();
    if (view === 'anomalies') loadAnomalies();
    if (view === 'review') loadReview();
  });
}

async function loadDashboard() {
  try {
    const [statsRes, batchesRes] = await Promise.all([
      fetch('/api/stats/overview'),
      fetch('/api/batches')
    ]);

    const stats = await statsRes.json();
    const batches = await batchesRes.json();

    document.getElementById('stat-poles').textContent = stats.poles;
    document.getElementById('stat-inspections').textContent = stats.inspections;
    document.getElementById('stat-dispatches').textContent = stats.dispatches;
    document.getElementById('stat-completions').textContent = stats.completions;
    document.getElementById('stat-overdue').textContent = stats.overdue;
    document.getElementById('stat-close-rate').textContent = stats.closeRate;

    document.getElementById('todo-dispatch').textContent = stats.pendingDispatch;
    document.getElementById('todo-completion').textContent = stats.pendingCompletion;
    document.getElementById('todo-review').textContent = stats.pendingReview;
    document.getElementById('todo-reviewed').textContent = stats.reviewed;

    renderBatches(batches.list);
  } catch (e) {
    console.error('加载概览失败:', e);
  }
}

function renderBatches(list) {
  const container = document.getElementById('recent-batches');
  if (!list || list.length === 0) {
    container.innerHTML = '<p class="empty">暂无导入记录</p>';
    return;
  }

  const typeMap = {
    poles: '灯杆台账',
    inspections: '巡检记录',
    dispatches: '派单记录',
    completions: '完工回执'
  };

  container.innerHTML = list.slice(0, 10).map(b => `
    <div class="batch-item">
      <div class="batch-info">
        <div class="batch-type">${typeMap[b.data_type] || b.data_type}</div>
        <div class="batch-time">${b.import_time} · ${b.file_name || '未命名'}</div>
      </div>
      <div class="batch-count">${b.record_count} 条</div>
    </div>
  `).join('');
}

function initImport() {
  const types = ['poles', 'inspections', 'dispatches', 'completions'];

  types.forEach(type => {
    const fileInput = document.getElementById(`file-${type}`);
    const fileNameSpan = document.getElementById(`${type}-file-name`);
    const btnImport = document.getElementById(`btn-import-${type}`);
    const resultDiv = document.getElementById(`${type}-import-result`);

    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) {
        fileNameSpan.textContent = fileInput.files[0].name;
      }
    });

    btnImport.addEventListener('click', async () => {
      const file = fileInput.files[0];
      if (!file) {
        showImportResult(resultDiv, 'error', '请先选择文件');
        return;
      }

      const batchNo = document.getElementById(`batch-${type}`).value.trim();
      const formData = new FormData();
      formData.append('file', file);
      if (batchNo) formData.append('batchNo', batchNo);

      btnImport.disabled = true;
      btnImport.textContent = '导入中...';

      try {
        const res = await fetch(`/api/import/${type}`, {
          method: 'POST',
          body: formData
        });

        const data = await res.json();

        if (res.ok) {
          showImportResult(resultDiv, 'success',
            `导入成功！共 ${data.total} 条，新增 ${data.inserted} 条，跳过 ${data.skipped} 条。批次号：${data.batchNo}`);
          fileInput.value = '';
          fileNameSpan.textContent = '';
          document.getElementById(`batch-${type}`).value = '';
        } else {
          showImportResult(resultDiv, 'error', data.error || '导入失败');
        }
      } catch (e) {
        showImportResult(resultDiv, 'error', '导入出错：' + e.message);
      } finally {
        btnImport.disabled = false;
        btnImport.textContent = '导入';
      }
    });
  });
}

function showImportResult(el, type, msg) {
  el.className = `import-result ${type}`;
  el.textContent = msg;
  setTimeout(() => {
    if (type === 'success') {
      el.className = 'import-result';
      el.textContent = '';
    }
  }, 5000);
}

async function loadBatches() {
  try {
    const res = await fetch('/api/batches');
    const data = await res.json();
  } catch (e) {
    console.error('加载批次失败:', e);
  }
}

function initPoles() {
  document.getElementById('btn-search-poles').addEventListener('click', () => {
    state.poles.keyword = document.getElementById('poles-search').value.trim();
    state.poles.page = 1;
    loadPoles();
  });

  document.getElementById('poles-search').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      state.poles.keyword = e.target.value.trim();
      state.poles.page = 1;
      loadPoles();
    }
  });
}

async function loadPoles() {
  const { page, pageSize, keyword } = state.poles;
  const params = new URLSearchParams({ page, pageSize });
  if (keyword) params.set('keyword', keyword);

  try {
    const res = await fetch(`/api/poles?${params}`);
    const data = await res.json();

    state.poles.total = data.total;
    renderPolesTable(data.list);
    renderPagination('poles-pagination', data.page, data.pageSize, data.total, (p) => {
      state.poles.page = p;
      loadPoles();
    });
  } catch (e) {
    console.error('加载灯杆失败:', e);
  }
}

function renderPolesTable(list) {
  const tbody = document.getElementById('poles-table-body');
  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty">暂无数据</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(p => `
    <tr>
      <td>${escapeHtml(p.pole_no)}</td>
      <td>${escapeHtml(p.location || '-')}</td>
      <td>${escapeHtml(p.road_name || '-')}</td>
      <td>${escapeHtml(p.light_type || '-')}</td>
      <td>${p.power_watt || '-'}</td>
      <td>${p.inspection_count || 0}</td>
      <td>${p.dispatch_count || 0}</td>
      <td>${p.completion_count || 0}</td>
      <td>
        <span class="action-link" onclick="viewChain('${escapeHtml(p.pole_no)}')">查看巡修链</span>
      </td>
    </tr>
  `).join('');
}

function viewChain(poleNo) {
  document.getElementById('chain-pole-no').value = poleNo;
  switchView('chain');
  loadChain(poleNo);
}

function initChainSearch() {
  document.getElementById('btn-chain-search').addEventListener('click', () => {
    const poleNo = document.getElementById('chain-pole-no').value.trim();
    if (poleNo) loadChain(poleNo);
  });

  document.getElementById('chain-pole-no').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const poleNo = e.target.value.trim();
      if (poleNo) loadChain(poleNo);
    }
  });
}

async function loadChain(poleNo) {
  const resultDiv = document.getElementById('chain-result');
  resultDiv.innerHTML = '<p class="empty">加载中...</p>';

  try {
    const res = await fetch(`/api/chain/${encodeURIComponent(poleNo)}`);
    if (!res.ok) {
      resultDiv.innerHTML = '<p class="empty">未找到该灯杆</p>';
      return;
    }

    const data = await res.json();
    renderChain(data);
  } catch (e) {
    resultDiv.innerHTML = '<p class="empty">加载失败</p>';
    console.error(e);
  }
}

function renderChain(data) {
  const resultDiv = document.getElementById('chain-result');
  const { pole, chain } = data;

  const typeLabels = {
    inspection: '巡检发现',
    dispatch: '派单',
    completion: '完工'
  };

  const chainHtml = chain.length === 0
    ? '<p class="empty">暂无巡修记录</p>'
    : `<div class="timeline">
        <h3>巡修时间线</h3>
        ${chain.map(item => `
          <div class="timeline-item ${item.type}">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
              <div class="timeline-type">${typeLabels[item.type]}</div>
              <div class="timeline-date">${item.date || '-'}</div>
              <div class="timeline-detail">
                ${item.type === 'inspection' ? `
                  <div>巡检单号：${escapeHtml(item.inspection_no || '-')}</div>
                  <div>巡检员：${escapeHtml(item.inspector || '-')}</div>
                  <div>故障类型：${escapeHtml(item.fault_type || '-')}</div>
                  <div>故障描述：${escapeHtml(item.fault_description || '-')}</div>
                  <div>故障等级：${escapeHtml(item.fault_level || '-')}</div>
                ` : ''}
                ${item.type === 'dispatch' ? `
                  <div>派单号：${escapeHtml(item.dispatch_no || '-')}</div>
                  <div>派单人：${escapeHtml(item.dispatcher || '-')}</div>
                  <div>维修班组：${escapeHtml(item.repair_team || '-')}</div>
                  <div>截止日期：${escapeHtml(item.deadline || '-')}</div>
                ` : ''}
                ${item.type === 'completion' ? `
                  <div>完工单号：${escapeHtml(item.completion_no || '-')}</div>
                  <div>施工人员：${escapeHtml(item.repairer || '-')}</div>
                  <div>维修内容：${escapeHtml(item.repair_content || '-')}</div>
                  ${item.review_opinion ? `<div>复核意见：${escapeHtml(item.review_opinion)}</div>` : ''}
                ` : ''}
              </div>
              <span class="status-tag ${getStatusClass(item.status)}">${item.status || '-'}</span>
            </div>
          </div>
        `).join('')}
      </div>`;

  resultDiv.innerHTML = `
    <div class="chain-pole-info">
      <h3>灯杆信息</h3>
      <div class="info-grid">
        <div class="info-item">
          <div class="label">灯杆编号</div>
          <div class="value">${escapeHtml(pole.pole_no)}</div>
        </div>
        <div class="info-item">
          <div class="label">位置</div>
          <div class="value">${escapeHtml(pole.location || '-')}</div>
        </div>
        <div class="info-item">
          <div class="label">道路名称</div>
          <div class="value">${escapeHtml(pole.road_name || '-')}</div>
        </div>
        <div class="info-item">
          <div class="label">灯具类型</div>
          <div class="value">${escapeHtml(pole.light_type || '-')}</div>
        </div>
      </div>
    </div>
    ${chainHtml}
  `;
}

function getStatusClass(status) {
  if (!status) return 'pending';
  const s = status.toLowerCase();
  if (s.includes('待')) return 'pending';
  if (s.includes('已派') || s.includes('进行')) return 'processing';
  if (s.includes('完工') || s.includes('已完')) return 'done';
  if (s.includes('复核') || s.includes('闭环')) return 'reviewed';
  if (s.includes('错') || s.includes('异常')) return 'error';
  return 'pending';
}

function initAnomalyFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.anomalies.type = btn.dataset.type;
      state.anomalies.page = 1;
      loadAnomalies();
    });
  });
}

async function loadAnomalies() {
  const { page, pageSize, type } = state.anomalies;
  const params = new URLSearchParams({ page, pageSize });
  if (type) params.set('type', type);

  try {
    const res = await fetch(`/api/anomalies?${params}`);
    const data = await res.json();

    state.anomalies.total = data.total;
    renderAnomaliesTable(data.list);
    renderPagination('anomalies-pagination', data.page, data.pageSize, data.total, (p) => {
      state.anomalies.page = p;
      loadAnomalies();
    });
  } catch (e) {
    console.error('加载异常失败:', e);
  }
}

function renderAnomaliesTable(list) {
  const tbody = document.getElementById('anomalies-table-body');
  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty">暂无异常数据</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(a => `
    <tr>
      <td><span class="anomaly-type-tag ${a.type}">${a.typeName}</span></td>
      <td>${escapeHtml(a.pole_no)}</td>
      <td>${escapeHtml(a.location || '-')}</td>
      <td>${escapeHtml(a.description)}</td>
    </tr>
  `).join('');
}

function initReview() {
}

async function loadReview() {
  const { page, pageSize } = state.review;
  const params = new URLSearchParams({ page, pageSize });

  try {
    const res = await fetch(`/api/completions/pending-review?${params}`);
    const data = await res.json();

    state.review.total = data.total;
    renderReviewTable(data.list);
    renderPagination('review-pagination', data.page, data.pageSize, data.total, (p) => {
      state.review.page = p;
      loadReview();
    });
  } catch (e) {
    console.error('加载复核失败:', e);
  }
}

function renderReviewTable(list) {
  const tbody = document.getElementById('review-table-body');
  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty">暂无待复核数据</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(c => `
    <tr>
      <td>${escapeHtml(c.completion_no || '-')}</td>
      <td>${escapeHtml(c.pole_no || '-')}</td>
      <td>${escapeHtml(c.location || '-')}</td>
      <td>${escapeHtml(c.fault_type || '-')}</td>
      <td>${escapeHtml(c.repairer || '-')}</td>
      <td>${escapeHtml(c.complete_date || '-')}</td>
      <td>${escapeHtml(c.repair_content || '-')}</td>
      <td>
        <span class="action-link" onclick="openReviewModal(${c.id})">复核</span>
      </td>
    </tr>
  `).join('');
}

let currentReviewId = null;

function openReviewModal(id) {
  currentReviewId = id;
  const modal = document.getElementById('modal');
  const body = document.getElementById('modal-body');
  const title = document.getElementById('modal-title');

  title.textContent = '复核完工回执';
  body.innerHTML = `
    <div class="form-group">
      <label>复核结果</label>
      <select id="review-status">
        <option value="已复核">通过</option>
        <option value="复核不通过">不通过</option>
        <option value="需返工">需返工</option>
      </select>
    </div>
    <div class="form-group">
      <label>复核意见</label>
      <textarea id="review-opinion" placeholder="请输入复核意见..."></textarea>
    </div>
    <div class="form-group">
      <label>复核人</label>
      <input type="text" id="reviewer-name" placeholder="请输入复核人姓名">
    </div>
  `;

  modal.classList.add('show');

  document.getElementById('modal-confirm').onclick = async () => {
    const status = document.getElementById('review-status').value;
    const opinion = document.getElementById('review-opinion').value;
    const reviewer = document.getElementById('reviewer-name').value;

    if (!reviewer.trim()) {
      alert('请输入复核人姓名');
      return;
    }

    try {
      const res = await fetch(`/api/completions/${id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_opinion: opinion, reviewer, status })
      });

      if (res.ok) {
        closeModal();
        loadReview();
      } else {
        const data = await res.json();
        alert(data.error || '复核失败');
      }
    } catch (e) {
      alert('复核出错：' + e.message);
    }
  };
}

function closeModal() {
  document.getElementById('modal').classList.remove('show');
  currentReviewId = null;
}

function initReport() {
  document.getElementById('btn-generate-report').addEventListener('click', loadReport);
  document.getElementById('btn-export-csv').addEventListener('click', exportReportCsv);
}

async function loadReport() {
  const startDate = document.getElementById('report-start').value;
  const endDate = document.getElementById('report-end').value;

  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);

  try {
    const res = await fetch(`/api/report/closed-loop?${params}`);
    const data = await res.json();

    state.report.data = data.data;
    state.report.stats = data.stats;
    renderReport(data);
  } catch (e) {
    console.error('生成报告失败:', e);
  }
}

function renderReport(data) {
  const statsDiv = document.getElementById('report-stats');
  const tbody = document.getElementById('report-table-body');

  statsDiv.innerHTML = `
    <div class="report-stat-item">
      <div class="value">${data.stats.total}</div>
      <div class="label">总记录数</div>
    </div>
    <div class="report-stat-item">
      <div class="value" style="color:#52c41a">${data.stats.closed}</div>
      <div class="label">已闭环</div>
    </div>
    <div class="report-stat-item">
      <div class="value" style="color:#fa8c16">${data.stats.pending}</div>
      <div class="label">未闭环</div>
    </div>
    <div class="report-stat-item">
      <div class="value" style="color:#1890ff">${data.stats.closedRate}</div>
      <div class="label">闭环率</div>
    </div>
  `;

  if (!data.data || data.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty">暂无数据</td></tr>';
    return;
  }

  tbody.innerHTML = data.data.map(r => `
    <tr>
      <td>${escapeHtml(r['灯杆编号'] || '')}</td>
      <td>${escapeHtml(r['位置'] || '')}</td>
      <td>${escapeHtml(r['巡检单号'] || '')}</td>
      <td>${escapeHtml(r['故障类型'] || '')}</td>
      <td>${escapeHtml(r['派单号'] || '')}</td>
      <td>${escapeHtml(r['完工单号'] || '')}</td>
      <td><span class="status-tag ${r['当前阶段'] === '复核完成' ? 'reviewed' : r['当前阶段'] === '完工' ? 'done' : r['当前阶段'] === '派单' ? 'processing' : 'pending'}">${r['当前阶段'] || ''}</span></td>
      <td>${r['是否闭环'] === '是' ? '<span class="status-tag reviewed">是</span>' : '<span class="status-tag pending">否</span>'}</td>
    </tr>
  `).join('');
}

function exportReportCsv() {
  const startDate = document.getElementById('report-start').value;
  const endDate = document.getElementById('report-end').value;

  const params = new URLSearchParams({ format: 'csv' });
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);

  window.open(`/api/report/closed-loop?${params}`, '_blank');
}

function renderPagination(containerId, currentPage, pageSize, total, onChange) {
  const container = document.getElementById(containerId);
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';

  html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="window.__page_${containerId}(${currentPage - 1})">上一页</button>`;

  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  if (start > 1) {
    html += `<button onclick="window.__page_${containerId}(1)">1</button>`;
    if (start > 2) html += '<span>...</span>';
  }

  for (let i = start; i <= end; i++) {
    html += `<button class="${i === currentPage ? 'active' : ''}" onclick="window.__page_${containerId}(${i})">${i}</button>`;
  }

  if (end < totalPages) {
    if (end < totalPages - 1) html += '<span>...</span>';
    html += `<button onclick="window.__page_${containerId}(${totalPages})">${totalPages}</button>`;
  }

  html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="window.__page_${containerId}(${currentPage + 1})">下一页</button>`;

  container.innerHTML = html;
  window[`__page_${containerId}`] = onChange;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
