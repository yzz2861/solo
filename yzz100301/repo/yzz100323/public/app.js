let currentPage = 1;
let pageSize = 20;
let totalPages = 1;
let totalCount = 0;
let currentMaterialId = null;
let currentImportTab = 'materials';

document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadMaterials();
  setupDragAndDrop();
});

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

async function loadStats() {
  try {
    const res = await fetch('/api/export/stats');
    const data = await res.json();

    document.getElementById('statTotal').textContent = data.totalMaterials || 0;
    document.getElementById('statPending').textContent = data.pendingReview || 0;
    document.getElementById('statBanned').textContent = data.hasBannedWordCount || 0;
    document.getElementById('statRejected').textContent = data.channelRejectedCount || 0;
    document.getElementById('statOverridden').textContent = data.overriddenCount || 0;
    document.getElementById('statCompliant').textContent = data.compliantCount || 0;
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

function getFilterParams() {
  const params = new URLSearchParams();
  params.append('page', currentPage);
  params.append('pageSize', pageSize);

  const keyword = document.getElementById('filterKeyword').value.trim();
  if (keyword) params.append('keyword', keyword);

  const reviewStatus = document.getElementById('filterReviewStatus').value;
  if (reviewStatus) params.append('reviewStatus', reviewStatus);

  if (document.getElementById('filterBannedWord').checked) {
    params.append('hasBannedWord', 'true');
  }
  if (document.getElementById('filterChannelRejected').checked) {
    params.append('channelRejected', 'true');
  }
  if (document.getElementById('filterOverridden').checked) {
    params.append('isOverridden', 'true');
  }

  return params;
}

async function loadMaterials() {
  const tbody = document.getElementById('materialsTableBody');
  tbody.innerHTML = '<tr><td colspan="9" class="loading-cell">加载中...</td></tr>';

  try {
    const params = getFilterParams();
    const res = await fetch(`/api/materials?${params.toString()}`);
    const data = await res.json();

    totalCount = data.total;
    totalPages = Math.ceil(totalCount / pageSize) || 1;

    document.getElementById('totalCount').textContent = `共 ${totalCount} 条`;
    document.getElementById('pageInfo').textContent = `第 ${currentPage} 页 / 共 ${totalPages} 页`;

    document.getElementById('btnPrev').disabled = currentPage <= 1;
    document.getElementById('btnNext').disabled = currentPage >= totalPages;

    if (data.list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="empty-cell">暂无数据，请先导入素材</td></tr>';
      return;
    }

    tbody.innerHTML = data.list.map(item => renderMaterialRow(item)).join('');
  } catch (err) {
    console.error('Failed to load materials:', err);
    tbody.innerHTML = '<tr><td colspan="9" class="empty-cell">加载失败</td></tr>';
  }
}

function renderMaterialRow(item) {
  const reviewStatus = item.review_status || 'pending';
  const reviewStatusText = {
    'pending': '待复核',
    'compliant': '合规',
    'non_compliant': '不合规'
  }[reviewStatus] || '未处理';

  const bannedBadge = item.banned_word_count > 0
    ? `<span class="badge badge-danger">${item.banned_word_count}</span>`
    : '<span class="badge badge-secondary">-</span>';

  const rejectedBadge = item.channel_rejected_count > 0
    ? `<span class="badge badge-warning">${item.channel_rejected_count}</span>`
    : '<span class="badge badge-secondary">-</span>';

  const overriddenBadge = item.is_overridden
    ? '<span class="badge badge-purple">已改判</span>'
    : '<span class="badge badge-secondary">-</span>';

  const submitTime = item.submit_time ? item.submit_time.substring(0, 10) : '-';

  return `
    <tr>
      <td><code>${item.material_id}</code></td>
      <td class="material-title-cell" title="${escapeHtml(item.title || '')}">${escapeHtml(item.title || '(无标题)')}</td>
      <td>${escapeHtml(item.channel || '-')}</td>
      <td>${bannedBadge}</td>
      <td>${rejectedBadge}</td>
      <td>${overriddenBadge}</td>
      <td><span class="badge status-${reviewStatus}">${reviewStatusText}</span></td>
      <td>${submitTime}</td>
      <td>
        <button class="action-btn action-btn-view" onclick="viewDetail('${item.material_id}')">查看</button>
        <button class="action-btn action-btn-review" onclick="openReviewFromList('${item.material_id}')">复核</button>
      </td>
    </tr>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function handleFilterKeyup(event) {
  if (event.key === 'Enter') {
    currentPage = 1;
    loadMaterials();
  }
}

function resetFilters() {
  document.getElementById('filterKeyword').value = '';
  document.getElementById('filterReviewStatus').value = '';
  document.getElementById('filterBannedWord').checked = false;
  document.getElementById('filterChannelRejected').checked = false;
  document.getElementById('filterOverridden').checked = false;
  currentPage = 1;
  loadMaterials();
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    loadMaterials();
  }
}

function nextPage() {
  if (currentPage < totalPages) {
    currentPage++;
    loadMaterials();
  }
}

function changePageSize() {
  pageSize = parseInt(document.getElementById('pageSizeSelect').value, 10);
  currentPage = 1;
  loadMaterials();
}

async function viewDetail(materialId) {
  currentMaterialId = materialId;
  const modal = document.getElementById('detailModal');
  const body = document.getElementById('detailModalBody');
  body.innerHTML = '<p>加载中...</p>';
  modal.classList.add('active');

  try {
    const res = await fetch(`/api/materials/${materialId}`);
    const data = await res.json();
    body.innerHTML = renderDetailContent(data);
  } catch (err) {
    body.innerHTML = '<p class="text-red-500">加载失败</p>';
  }
}

function renderDetailContent(data) {
  const { material, ruleHits, channelFeedbacks, reviews } = data;

  const reviewStatusText = {
    'pending': '待复核',
    'compliant': '合规',
    'non_compliant': '不合规'
  };

  const latestReview = reviews.length > 0 ? reviews[0] : null;

  let html = `
    <div class="detail-section">
      <h4>基本信息</h4>
      <div class="detail-grid">
        <div class="detail-item">
          <span class="label">素材编号</span>
          <span class="value"><code>${escapeHtml(material.material_id)}</code></span>
        </div>
        <div class="detail-item">
          <span class="label">投放渠道</span>
          <span class="value">${escapeHtml(material.channel || '-')}</span>
        </div>
        <div class="detail-item">
          <span class="label">提交时间</span>
          <span class="value">${material.submit_time ? escapeHtml(material.submit_time.substring(0, 19).replace('T', ' ')) : '-'}</span>
        </div>
        <div class="detail-item">
          <span class="label">复核状态</span>
          <span class="value">
            <span class="badge status-${latestReview?.review_status || 'pending'}">
              ${reviewStatusText[latestReview?.review_status] || '未处理'}
            </span>
          </span>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <h4>标题</h4>
      <div class="detail-content">${escapeHtml(material.title || '(无标题)')}</div>
    </div>

    <div class="detail-section">
      <h4>文案内容</h4>
      <div class="detail-content">${escapeHtml(material.content || '(无内容)')}</div>
    </div>
  `;

  html += `
    <div class="detail-section">
      <h4>规则命中 (${ruleHits.length})</h4>
  `;

  if (ruleHits.length === 0) {
    html += '<p style="color:#9ca3af;">暂无规则命中</p>';
  } else {
    for (const hit of ruleHits) {
      const typeClass = hit.rule_type;
      html += `
        <div class="rule-hit-item ${typeClass}">
          <div class="rule-hit-title">${escapeHtml(hit.rule_name)}</div>
          <div class="rule-hit-detail">${escapeHtml(hit.hit_detail || '')}</div>
        </div>
      `;
    }
  }
  html += '</div>';

  html += `
    <div class="detail-section">
      <h4>渠道反馈 (${channelFeedbacks.length})</h4>
  `;

  if (channelFeedbacks.length === 0) {
    html += '<p style="color:#9ca3af;">暂无渠道反馈</p>';
  } else {
    for (const fb of channelFeedbacks) {
      const fbClass = fb.status === 'rejected' ? 'rejected' : 'approved';
      const statusText = fb.status === 'rejected' ? '驳回' : '通过';
      html += `
        <div class="feedback-item ${fbClass}">
          <div class="feedback-title">
            ${escapeHtml(fb.channel || '未知渠道')} - ${statusText}
          </div>
          <div class="feedback-detail">
            ${fb.reject_reason ? '原因: ' + escapeHtml(fb.reject_reason) : ''}
          </div>
          <div class="review-meta">
            ${fb.feedback_time ? escapeHtml(fb.feedback_time.substring(0, 19).replace('T', ' ')) : ''}
          </div>
        </div>
      `;
    }
  }
  html += '</div>';

  html += `
    <div class="detail-section">
      <h4>复核记录 (${reviews.length})</h4>
  `;

  if (reviews.length === 0) {
    html += '<p style="color:#9ca3af;">暂无复核记录</p>';
  } else {
    for (const review of reviews) {
      const reviewClass = review.is_overridden ? 'overridden' : '';
      html += `
        <div class="review-item ${reviewClass}">
          <div class="review-title">
            <span class="badge status-${review.review_status}">${reviewStatusText[review.review_status] || review.review_status}</span>
            ${review.is_overridden ? '<span class="badge badge-purple">改判</span>' : ''}
          </div>
          <div class="review-detail">
            ${escapeHtml(review.review_opinion || '(无意见)')}
            ${review.previous_opinion ? '<br><span style="color:#9ca3af; font-size:12px;">原意见: ' + escapeHtml(review.previous_opinion) + '</span>' : ''}
          </div>
          <div class="review-meta">
            审核员: ${escapeHtml(review.reviewer || '未知')} | 
            ${review.review_time ? escapeHtml(review.review_time.substring(0, 19).replace('T', ' ')) : ''}
          </div>
        </div>
      `;
    }
  }
  html += '</div>';

  return html;
}

function closeDetailModal() {
  document.getElementById('detailModal').classList.remove('active');
}

function openReviewFromList(materialId) {
  currentMaterialId = materialId;
  openReviewModal();
}

function openReviewModal() {
  if (!currentMaterialId) return;

  const modal = document.getElementById('reviewModal');
  document.getElementById('reviewMaterialId').value = currentMaterialId;
  document.getElementById('reviewStatus').value = 'pending';
  document.getElementById('reviewOpinion').value = '';

  const savedName = localStorage.getItem('reviewerName');
  if (savedName) {
    document.getElementById('reviewerName').value = savedName;
  }

  modal.classList.add('active');
}

function closeReviewModal() {
  document.getElementById('reviewModal').classList.remove('active');
}

async function submitReview() {
  const status = document.getElementById('reviewStatus').value;
  const opinion = document.getElementById('reviewOpinion').value.trim();
  const reviewer = document.getElementById('reviewerName').value.trim() || '审核员';

  if (!opinion) {
    showToast('请填写复核意见', 'error');
    return;
  }

  localStorage.setItem('reviewerName', reviewer);

  try {
    const res = await fetch(`/api/materials/${currentMaterialId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        review_status: status,
        review_opinion: opinion,
        reviewer: reviewer,
      }),
    });

    const data = await res.json();

    if (data.success) {
      showToast(data.is_overridden ? '复核已提交（检测到改判）' : '复核已提交');
      closeReviewModal();
      closeDetailModal();
      loadMaterials();
      loadStats();
    } else {
      showToast('提交失败', 'error');
    }
  } catch (err) {
    showToast('提交失败', 'error');
  }
}

function openImportModal() {
  document.getElementById('importModal').classList.add('active');
  document.getElementById('importResult').classList.add('hidden');
}

function closeImportModal() {
  document.getElementById('importModal').classList.remove('active');
}

function switchImportTab(tab) {
  currentImportTab = tab;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  document.querySelectorAll('.import-tab-content').forEach(content => {
    content.classList.add('hidden');
  });
  document.getElementById(`tab-${tab}`).classList.remove('hidden');

  document.getElementById('importResult').classList.add('hidden');
}

function setupDragAndDrop() {
  const areas = ['materials', 'channel', 'reviews'];
  for (const area of areas) {
    const el = document.getElementById(`upload-${area}`);
    if (!el) continue;

    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.classList.add('dragover');
    });

    el.addEventListener('dragleave', () => {
      el.classList.remove('dragover');
    });

    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleDroppedFile(area, files[0]);
      }
    });
  }
}

function handleFileSelect(type) {
  const inputId = {
    'materials': 'fileMaterials',
    'channel': 'fileChannel',
    'reviews': 'fileReviews',
  }[type];

  const input = document.getElementById(inputId);
  if (input.files.length > 0) {
    uploadFile(type, input.files[0]);
  }
}

function handleDroppedFile(type, file) {
  uploadFile(type, file);
}

async function uploadFile(type, file) {
  const endpoint = {
    'materials': '/api/import/materials',
    'channel': '/api/import/channel-feedback',
    'reviews': '/api/import/reviews',
  }[type];

  const formData = new FormData();
  formData.append('file', file);

  showToast('正在导入...', 'info');

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();

    if (data.success) {
      showImportResult(type, data);
      showToast('导入成功', 'success');
      loadStats();
      loadMaterials();
    } else {
      showToast(data.error || '导入失败', 'error');
    }
  } catch (err) {
    showToast('导入失败: ' + err.message, 'error');
  }
}

function showImportResult(type, data) {
  const resultDiv = document.getElementById('importResult');
  const body = document.getElementById('importResultBody');

  let html = '';
  if (type === 'materials') {
    html = `
      <p>📊 总计处理: <strong>${data.total}</strong> 条</p>
      <p>✅ 新增素材: <strong>${data.inserted}</strong> 条</p>
      <p>🔄 更新素材: <strong>${data.updated}</strong> 条</p>
      <p>⚠️ 规则命中: <strong>${data.ruleHitCount}</strong> 次</p>
    `;
  } else if (type === 'channel') {
    html = `
      <p>📊 总计处理: <strong>${data.total}</strong> 条</p>
      <p>✅ 新增反馈: <strong>${data.inserted}</strong> 条</p>
      <p>🔄 更新反馈: <strong>${data.updated}</strong> 条</p>
      <p>⚠️ 规则命中: <strong>${data.ruleHitCount}</strong> 次</p>
    `;
  } else if (type === 'reviews') {
    html = `
      <p>📊 总计处理: <strong>${data.total}</strong> 条</p>
      <p>✅ 新增复核: <strong>${data.inserted}</strong> 条</p>
      <p>🔄 改判记录: <strong>${data.overridden}</strong> 条</p>
      <p>⚠️ 规则命中: <strong>${data.ruleHitCount}</strong> 次</p>
    `;
  }

  body.innerHTML = html;
  resultDiv.classList.remove('hidden');
}

function openBannedWordsModal() {
  document.getElementById('bannedWordsModal').classList.add('active');
  loadBannedWords();
}

function closeBannedWordsModal() {
  document.getElementById('bannedWordsModal').classList.remove('active');
}

async function loadBannedWords() {
  const list = document.getElementById('bannedWordsList');
  list.innerHTML = '<p style="padding:20px; text-align:center; color:#9ca3af;">加载中...</p>';

  try {
    const res = await fetch('/api/banned-words');
    const data = await res.json();

    if (data.words.length === 0) {
      list.innerHTML = '<p style="padding:20px; text-align:center; color:#9ca3af;">暂无禁用词</p>';
      return;
    }

    list.innerHTML = data.words.map(w => `
      <div class="banned-word-item">
        <div>
          <span class="banned-word-text">${escapeHtml(w.word)}</span>
          <span class="banned-word-category">${escapeHtml(w.category || '其他')}</span>
        </div>
        <button class="banned-word-delete" onclick="deleteBannedWord(${w.id})">×</button>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = '<p style="padding:20px; text-align:center; color:#ef4444;">加载失败</p>';
  }
}

async function addBannedWord() {
  const word = document.getElementById('newBannedWord').value.trim();
  const category = document.getElementById('newBannedCategory').value;

  if (!word) {
    showToast('请输入禁用词', 'error');
    return;
  }

  try {
    const res = await fetch('/api/banned-words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, category }),
    });

    const data = await res.json();

    if (data.success) {
      showToast(`已添加禁用词"${word}"`);
      document.getElementById('newBannedWord').value = '';
      loadBannedWords();
      loadStats();
      loadMaterials();
    } else {
      showToast(data.message || '添加失败', 'error');
    }
  } catch (err) {
    showToast('添加失败', 'error');
  }
}

async function deleteBannedWord(id) {
  if (!confirm('确定要删除这个禁用词吗？')) return;

  try {
    const res = await fetch(`/api/banned-words/${id}`, {
      method: 'DELETE',
    });

    const data = await res.json();

    if (data.success) {
      showToast('已删除');
      loadBannedWords();
      loadStats();
    } else {
      showToast('删除失败', 'error');
    }
  } catch (err) {
    showToast('删除失败', 'error');
  }
}

function exportReport() {
  const params = new URLSearchParams();

  const hasBannedWord = document.getElementById('filterBannedWord').checked;
  const channelRejected = document.getElementById('filterChannelRejected').checked;
  const isOverridden = document.getElementById('filterOverridden').checked;
  const reviewStatus = document.getElementById('filterReviewStatus').value;

  if (hasBannedWord) params.append('hasBannedWord', 'true');
  if (channelRejected) params.append('channelRejected', 'true');
  if (isOverridden) params.append('isOverridden', 'true');
  if (reviewStatus) params.append('reviewStatus', reviewStatus);

  const url = `/api/export/report?${params.toString()}`;
  window.location.href = url;
  showToast('正在导出报告...');
}

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('active');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
  }
});
