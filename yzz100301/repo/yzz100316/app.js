const STORAGE_KEY = 'property_repair_data_v1';

let appData = {
  repairs: [],
  partsPickups: [],
  completions: [],
  reviews: {},
  inventory: {}
};

function loadFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      appData = JSON.parse(saved);
    }
  } catch (e) {
    console.error('加载数据失败:', e);
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  } catch (e) {
    console.error('保存数据失败:', e);
  }
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((header, idx) => {
      row[header.trim()] = values[idx] || '';
    });
    result.push(row);
  }

  return result;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function toCSV(data, columns) {
  const header = columns.map(c => c.label).join(',');
  const rows = data.map(row => {
    return columns.map(col => {
      let val = row[col.key] || '';
      val = String(val);
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        val = '"' + val.replace(/"/g, '""') + '"';
      }
      return val;
    }).join(',');
  });
  return [header, ...rows].join('\n');
}

function downloadFile(content, filename, type = 'text/csv;charset=utf-8;') {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show ' + type;

  setTimeout(() => {
    toast.className = 'toast ' + type;
  }, 3000);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function getRepairStatus(repair) {
  const orderNo = repair.维修单号 || repair.orderNo;
  const pickup = appData.partsPickups.find(p => p.维修单号 === orderNo || p.orderNo === orderNo);
  const completion = appData.completions.find(c => c.维修单号 === orderNo || c.orderNo === orderNo);
  const review = appData.reviews[orderNo];

  if (review && review.status) {
    return 'reviewed';
  }
  if (completion) {
    return 'completed';
  }
  if (pickup) {
    return 'picked';
  }
  return 'pending';
}

function getStatusLabel(status) {
  const labels = {
    pending: '待领料',
    picked: '施工中',
    completed: '待复核',
    reviewed: '已复核'
  };
  return labels[status] || '未知';
}

function getStatusClass(status) {
  const classes = {
    pending: 'gray',
    picked: 'blue',
    completed: 'yellow',
    reviewed: 'green'
  };
  return classes[status] || 'gray';
}

function getIssues(repair) {
  const issues = [];
  const orderNo = repair.维修单号 || repair.orderNo;
  const pickup = appData.partsPickups.find(p => p.维修单号 === orderNo || p.orderNo === orderNo);
  const completion = appData.completions.find(c => c.维修单号 === orderNo || c.orderNo === orderNo);

  if (pickup && !completion) {
    issues.push({ type: 'uncompleted', label: '领用未完工' });
  }

  if (pickup && completion) {
    const picker = pickup.领用人 || pickup.picker || '';
    const worker = completion.完工人 || completion.worker || '';
    if (picker && worker && picker !== worker) {
      issues.push({ type: 'workerMismatch', label: `完工人不一致(${picker} vs ${worker})` });
    }
  }

  if (pickup && pickup.备件) {
    const parts = pickup.备件 || pickup.parts || [];
    parts.forEach(part => {
      const name = part.名称 || part.name || '';
      const qty = parseFloat(part.数量 || part.qty || 0);
      const stock = appData.inventory[name] || 0;
      if (qty > stock && stock > 0) {
        issues.push({ type: 'insufficient', label: `${name}库存不足(需${qty}/库存${stock})` });
      }
    });
  }

  const duplicatePickups = appData.partsPickups.filter(p =>
    (p.维修单号 === orderNo || p.orderNo === orderNo)
  );
  if (duplicatePickups.length > 1) {
    issues.push({ type: 'duplicate', label: `重复领用${duplicatePickups.length}次` });
  }

  return issues;
}

function hasIssue(repair, issueType) {
  const issues = getIssues(repair);
  return issues.some(i => i.type === issueType);
}

function getMergedRepairs() {
  return appData.repairs.map(repair => {
    const orderNo = repair.维修单号 || repair.orderNo;
    const status = getRepairStatus(repair);
    const issues = getIssues(repair);
    const pickup = appData.partsPickups.find(p => p.维修单号 === orderNo || p.orderNo === orderNo);
    const completion = appData.completions.find(c => c.维修单号 === orderNo || c.orderNo === orderNo);
    const review = appData.reviews[orderNo];

    return {
      ...repair,
      orderNo,
      status,
      statusLabel: getStatusLabel(status),
      issues,
      hasIssues: issues.length > 0,
      pickup,
      completion,
      review
    };
  });
}

function getFilteredRepairs() {
  let repairs = getMergedRepairs();

  const community = document.getElementById('filterCommunity').value;
  if (community) {
    repairs = repairs.filter(r => (r.小区名称 || r.community) === community);
  }

  const status = document.getElementById('filterStatus').value;
  if (status) {
    repairs = repairs.filter(r => r.status === status);
  }

  if (document.getElementById('filterInsufficient').checked) {
    repairs = repairs.filter(r => hasIssue(r, 'insufficient'));
  }

  if (document.getElementById('filterWorkerMismatch').checked) {
    repairs = repairs.filter(r => hasIssue(r, 'workerMismatch'));
  }

  if (document.getElementById('filterUncompleted').checked) {
    repairs = repairs.filter(r => hasIssue(r, 'uncompleted'));
  }

  if (document.getElementById('filterDuplicate').checked) {
    repairs = repairs.filter(r => hasIssue(r, 'duplicate'));
  }

  const search = document.getElementById('searchOrder').value.trim();
  if (search) {
    repairs = repairs.filter(r =>
      (r.维修单号 || r.orderNo || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.报修内容 || r.content || '').toLowerCase().includes(search.toLowerCase())
    );
  }

  const sortBy = document.getElementById('sortBy').value;
  repairs.sort((a, b) => {
    switch (sortBy) {
      case 'date_desc':
        return new Date(b.报修日期 || b.date) - new Date(a.报修日期 || a.date);
      case 'date_asc':
        return new Date(a.报修日期 || a.date) - new Date(b.报修日期 || b.date);
      case 'order_asc':
        return (a.维修单号 || a.orderNo || '').localeCompare(b.维修单号 || b.orderNo || '');
      case 'order_desc':
        return (b.维修单号 || b.orderNo || '').localeCompare(a.维修单号 || a.orderNo || '');
      default:
        return 0;
    }
  });

  return repairs;
}

function updateStats() {
  const repairs = getMergedRepairs();
  const stats = {
    total: repairs.length,
    pending: 0,
    picked: 0,
    completed: 0,
    reviewed: 0,
    issues: 0
  };

  repairs.forEach(r => {
    stats[r.status] = (stats[r.status] || 0) + 1;
    if (r.hasIssues) stats.issues++;
  });

  document.getElementById('statTotal').textContent = stats.total;
  document.getElementById('statPending').textContent = stats.pending;
  document.getElementById('statPicked').textContent = stats.picked;
  document.getElementById('statCompleted').textContent = stats.completed;
  document.getElementById('statReviewed').textContent = stats.reviewed;
  document.getElementById('statIssues').textContent = stats.issues;

  document.getElementById('resultCount').textContent = getFilteredRepairs().length;
}

function updateCommunityFilter() {
  const communities = new Set();
  appData.repairs.forEach(r => {
    const c = r.小区名称 || r.community;
    if (c) communities.add(c);
  });

  const select = document.getElementById('filterCommunity');
  const currentValue = select.value;

  select.innerHTML = '<option value="">全部小区</option>';
  Array.from(communities).sort().forEach(c => {
    const option = document.createElement('option');
    option.value = c;
    option.textContent = c;
    select.appendChild(option);
  });

  select.value = currentValue;
}

function renderTable() {
  const repairs = getFilteredRepairs();
  const tbody = document.getElementById('tableBody');

  if (repairs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">
          <div class="empty-icon">${appData.repairs.length === 0 ? '📂' : '🔍'}</div>
          <p>${appData.repairs.length === 0 ? '暂无数据，请先导入报修单、领用记录和完工记录' : '没有符合条件的记录'}</p>
          ${appData.repairs.length === 0 ? '<button class="btn btn-primary" onclick="document.getElementById(\'fileRepair\').click()">导入报修单</button>' : ''}
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = repairs.map(repair => {
    const orderNo = repair.维修单号 || repair.orderNo;
    const community = repair.小区名称 || repair.community || '-';
    const content = repair.报修内容 || repair.content || '-';
    const reporter = repair.报修人 || repair.reporter || '-';
    const status = repair.status;
    const issues = repair.issues;

    let pickupStatus = '<span class="status-tag gray">未领料</span>';
    if (repair.pickup) {
      const pickupCount = appData.partsPickups.filter(p =>
        (p.维修单号 === orderNo || p.orderNo === orderNo)
      ).length;
      pickupStatus = `<span class="status-tag blue">已领料${pickupCount > 1 ? '(' + pickupCount + '次)' : ''}</span>`;
    }

    let completeStatus = '<span class="status-tag gray">未完工</span>';
    if (repair.completion) {
      completeStatus = `<span class="status-tag ${status === 'reviewed' ? 'green' : 'yellow'}">${status === 'reviewed' ? '已完工' : '待复核'}</span>`;
    }

    let reviewStatus = '<span class="status-tag gray">未复核</span>';
    if (repair.review && repair.review.status) {
      const reviewClass = repair.review.status === 'pass' ? 'green' : 'red';
      const reviewLabel = repair.review.status === 'pass' ? '通过' : '驳回';
      reviewStatus = `<span class="status-tag ${reviewClass}">${reviewLabel}</span>`;
    }

    let issueHtml = '';
    if (issues.length > 0) {
      issueHtml = '<div class="issue-tags">' +
        issues.map(i => `<span class="issue-tag">${i.label}</span>`).join('') +
        '</div>';
    }

    return `
      <tr>
        <td><strong>${orderNo}</strong></td>
        <td>${community}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${content}">${content}</td>
        <td>${reporter}</td>
        <td>${pickupStatus}</td>
        <td>${completeStatus}</td>
        <td>${reviewStatus}</td>
        <td>${issueHtml || '<span style="color:#9ca3af">-</span>'}</td>
        <td>
          <div class="action-btns">
            <button class="btn-action primary" onclick="showDetail('${orderNo}')">详情</button>
            <button class="btn-action" onclick="showReview('${orderNo}')">复核</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  updateStats();
}

function showDetail(orderNo) {
  const repair = appData.repairs.find(r => (r.维修单号 || r.orderNo) === orderNo);
  if (!repair) {
    showToast('未找到该维修单', 'error');
    return;
  }

  const pickup = appData.partsPickups.find(p => (p.维修单号 || p.orderNo) === orderNo);
  const allPickups = appData.partsPickups.filter(p => (p.维修单号 || p.orderNo) === orderNo);
  const completion = appData.completions.find(c => (c.维修单号 || c.orderNo) === orderNo);
  const review = appData.reviews[orderNo];
  const issues = getIssues(repair);
  const status = getRepairStatus(repair);

  let partsHtml = '';
  if (allPickups.length > 0) {
    partsHtml = allPickups.map((p, idx) => {
      const parts = p.备件 || p.parts || [];
      const totalCost = parts.reduce((sum, part) => {
        return sum + (parseFloat(part.数量 || part.qty || 0) * parseFloat(part.单价 || part.price || 0));
      }, 0);

      return `
        <div style="margin-bottom:${idx < allPickups.length - 1 ? '16px' : '0'};">
          <div style="font-size:12px;color:#6b7280;margin-bottom:8px;">
            第 ${idx + 1} 次领用 | 日期：${formatDate(p.领用日期 || p.date)} | 领用人：${p.领用人 || p.picker || '-'}
          </div>
          <table class="parts-table">
            <thead>
              <tr>
                <th>备件名称</th>
                <th>数量</th>
                <th>单价</th>
                <th>金额</th>
                <th>库存状态</th>
              </tr>
            </thead>
            <tbody>
              ${parts.map(part => {
                const name = part.名称 || part.name || '';
                const qty = parseFloat(part.数量 || part.qty || 0);
                const price = parseFloat(part.单价 || part.price || 0);
                const amount = (qty * price).toFixed(2);
                const stock = appData.inventory[name] || 0;
                const stockStatus = stock >= qty
                  ? '<span class="status-tag green">充足</span>'
                  : `<span class="status-tag red">不足(库存${stock})</span>`;
                return `
                  <tr>
                    <td>${name}</td>
                    <td>${qty}</td>
                    <td>¥${price.toFixed(2)}</td>
                    <td>¥${amount}</td>
                    <td>${stockStatus}</td>
                  </tr>
                `;
              }).join('')}
              <tr style="font-weight:600;background:#f9fafb;">
                <td colspan="3" style="text-align:right;">合计</td>
                <td>¥${totalCost.toFixed(2)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }).join('');
  } else {
    partsHtml = '<p style="color:#9ca3af;text-align:center;padding:20px 0;">暂无领用记录</p>';
  }

  let issuesHtml = '';
  if (issues.length > 0) {
    issuesHtml = `
      <div class="issue-list">
        <h4>⚠️ 异常提醒</h4>
        <ul>
          ${issues.map(i => `<li>${i.label}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  const timelineSteps = [
    {
      status: 'done',
      title: '报修受理',
      desc: repair.报修内容 || repair.content || '',
      date: `报修日期：${formatDate(repair.报修日期 || repair.date)} | 报修人：${repair.报修人 || repair.reporter || '-'}`
    },
    {
      status: pickup ? 'done' : 'pending',
      title: pickup ? '备件领用' : '待领料',
      desc: pickup ? `${(pickup.备件 || pickup.parts || []).length} 种备件` : '尚未领用备件',
      date: pickup ? `领用日期：${formatDate(pickup.领用日期 || pickup.date)} | 领用人：${pickup.领用人 || pickup.picker || '-'}` : ''
    },
    {
      status: completion ? 'done' : (pickup ? 'current' : 'pending'),
      title: completion ? '维修完工' : (pickup ? '施工中' : '待施工'),
      desc: completion ? (completion.完工说明 || completion.note || '') : (pickup ? '正在施工中' : '等待领料'),
      date: completion ? `完工日期：${formatDate(completion.完工日期 || completion.date)} | 完工人：${completion.完工人 || completion.worker || '-'}` : ''
    },
    {
      status: review && review.status ? 'done' : (completion ? 'current' : 'pending'),
      title: review && review.status ? (review.status === 'pass' ? '复核通过' : '复核驳回') : (completion ? '待复核' : '待复核'),
      desc: review && review.comment ? review.comment : (completion ? '等待主管复核' : ''),
      date: review && review.date ? `复核日期：${formatDate(review.date)} | 复核人：${review.reviewer || '-'}` : ''
    }
  ];

  const bodyHtml = `
    ${issuesHtml}

    <div class="detail-section">
      <h3>📋 维修进度</h3>
      <div class="timeline">
        ${timelineSteps.map(step => `
          <div class="timeline-item ${step.status}">
            <div class="timeline-title">${step.title}</div>
            <div class="timeline-desc">${step.desc}</div>
            ${step.date ? `<div class="timeline-date">${step.date}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>

    <div class="detail-section">
      <h3>🏠 报修信息</h3>
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">维修单号</span>
          <span class="detail-value">${orderNo}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">小区名称</span>
          <span class="detail-value">${repair.小区名称 || repair.community || '-'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">报修日期</span>
          <span class="detail-value">${formatDate(repair.报修日期 || repair.date)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">报修人</span>
          <span class="detail-value">${repair.报修人 || repair.reporter || '-'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">联系电话</span>
          <span class="detail-value">${repair.联系电话 || repair.phone || '-'}</span>
        </div>
        <div class="detail-item full">
          <span class="detail-label">报修内容</span>
          <span class="detail-value">${repair.报修内容 || repair.content || '-'}</span>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <h3>🔧 备件领用</h3>
      ${partsHtml}
    </div>

    ${completion ? `
      <div class="detail-section">
        <h3>✅ 完工记录</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">完工日期</span>
            <span class="detail-value">${formatDate(completion.完工日期 || completion.date)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">完工人</span>
            <span class="detail-value">${completion.完工人 || completion.worker || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">用时(小时)</span>
            <span class="detail-value">${completion['用时(小时)'] || completion.hours || '-'}</span>
          </div>
          <div class="detail-item full">
            <span class="detail-label">完工说明</span>
            <span class="detail-value">${completion.完工说明 || completion.note || '-'}</span>
          </div>
        </div>
      </div>
    ` : ''}

    ${review && review.status ? `
      <div class="detail-section">
        <h3>📝 复核记录</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">复核结果</span>
            <span class="detail-value">
              <span class="status-tag ${review.status === 'pass' ? 'green' : 'red'}">
                ${review.status === 'pass' ? '通过' : '驳回'}
              </span>
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-label">复核日期</span>
            <span class="detail-value">${formatDate(review.date)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">复核人</span>
            <span class="detail-value">${review.reviewer || '-'}</span>
          </div>
          <div class="detail-item full">
            <span class="detail-label">复核意见</span>
            <span class="detail-value" style="white-space:pre-wrap;">${review.comment || '-'}</span>
          </div>
        </div>
      </div>
    ` : ''}
  `;

  const footerHtml = `
    <button class="btn btn-outline" onclick="closeModal()">关闭</button>
    <button class="btn btn-primary" onclick="showReview('${orderNo}')">${review && review.status ? '修改复核' : '进行复核'}</button>
  `;

  openModal(orderNo + ' 维修单详情', bodyHtml, footerHtml);
}

function showReview(orderNo) {
  const repair = appData.repairs.find(r => (r.维修单号 || r.orderNo) === orderNo);
  if (!repair) {
    showToast('未找到该维修单', 'error');
    return;
  }

  const review = appData.reviews[orderNo] || { status: '', comment: '', reviewer: '', date: '' };

  const bodyHtml = `
    <div class="detail-section">
      <h3>📋 维修单信息</h3>
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">维修单号</span>
          <span class="detail-value"><strong>${orderNo}</strong></span>
        </div>
        <div class="detail-item">
          <span class="detail-label">小区</span>
          <span class="detail-value">${repair.小区名称 || repair.community || '-'}</span>
        </div>
        <div class="detail-item full">
          <span class="detail-label">报修内容</span>
          <span class="detail-value">${repair.报修内容 || repair.content || '-'}</span>
        </div>
      </div>
    </div>

    <div class="review-section">
      <h3 style="font-size:14px;font-weight:600;margin-bottom:12px;color:#374151;">📝 复核意见</h3>
      
      <div class="review-status">
        <label>
          <input type="radio" name="reviewStatus" value="pass" ${review.status === 'pass' ? 'checked' : ''} />
          <span style="color:#059669;">✅ 通过</span>
        </label>
        <label>
          <input type="radio" name="reviewStatus" value="reject" ${review.status === 'reject' ? 'checked' : ''} />
          <span style="color:#dc2626;">❌ 驳回</span>
        </label>
      </div>

      <textarea id="reviewComment" placeholder="请输入复核意见...">${review.comment || ''}</textarea>

      <div style="margin-top:12px;">
        <label style="font-size:13px;color:#6b7280;">复核人：</label>
        <input type="text" id="reviewerName" placeholder="请输入复核人姓名" 
               value="${review.reviewer || ''}" 
               style="width:200px;padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;" />
      </div>
    </div>
  `;

  const footerHtml = `
    <button class="btn btn-outline" onclick="closeModal()">取消</button>
    <button class="btn btn-success" onclick="saveReview('${orderNo}')">保存复核</button>
  `;

  openModal(orderNo + ' 复核', bodyHtml, footerHtml);
}

function saveReview(orderNo) {
  const statusEl = document.querySelector('input[name="reviewStatus"]:checked');
  const comment = document.getElementById('reviewComment').value.trim();
  const reviewer = document.getElementById('reviewerName').value.trim();

  if (!statusEl) {
    showToast('请选择复核结果', 'warning');
    return;
  }

  if (!reviewer) {
    showToast('请输入复核人姓名', 'warning');
    return;
  }

  appData.reviews[orderNo] = {
    status: statusEl.value,
    comment: comment,
    reviewer: reviewer,
    date: new Date().toISOString().split('T')[0]
  };

  saveToStorage();
  closeModal();
  renderTable();
  showToast('复核意见已保存', 'success');
}

function openModal(title, bodyHtml, footerHtml) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('modalFooter').innerHTML = footerHtml || '';
  document.getElementById('detailModal').classList.add('show');
}

function closeModal() {
  document.getElementById('detailModal').classList.remove('show');
}

function importRepairCSV(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const text = e.target.result;
      const data = parseCSV(text);

      if (data.length === 0) {
        showToast('CSV 文件为空', 'error');
        return;
      }

      const newCount = data.length;
      const existingMap = new Map();
      appData.repairs.forEach(r => {
        existingMap.set(r.维修单号 || r.orderNo, r);
      });

      let added = 0;
      let updated = 0;

      data.forEach(row => {
        const orderNo = row.维修单号 || row.orderNo;
        if (orderNo) {
          if (existingMap.has(orderNo)) {
            Object.assign(existingMap.get(orderNo), row);
            updated++;
          } else {
            appData.repairs.push(row);
            added++;
          }
        }
      });

      saveToStorage();
      updateCommunityFilter();
      renderTable();
      showToast(`导入完成：新增 ${added} 条，更新 ${updated} 条`, 'success');
    } catch (err) {
      console.error(err);
      showToast('导入失败：' + err.message, 'error');
    }
  };
  reader.readAsText(file, 'UTF-8');
}

function importPartsJSON(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const text = e.target.result;
      const data = JSON.parse(text);

      if (!Array.isArray(data)) {
        showToast('JSON 格式错误：应为数组', 'error');
        return;
      }

      let added = 0;
      let skipped = 0;

      data.forEach(pickup => {
        const orderNo = pickup.维修单号 || pickup.orderNo;
        if (!orderNo) {
          skipped++;
          return;
        }

        const existing = appData.partsPickups.find(p => {
          const pNo = p.维修单号 || p.orderNo;
          const pDate = p.领用日期 || p.date;
          const npDate = pickup.领用日期 || pickup.date;
          const pPicker = p.领用人 || p.picker || '';
          const npPicker = pickup.领用人 || pickup.picker || '';
          return pNo === orderNo && pDate === npDate && pPicker === npPicker;
        });

        if (existing) {
          skipped++;
        } else {
          appData.partsPickups.push(pickup);
          added++;
        }
      });

      saveToStorage();
      renderTable();
      showToast(`导入完成：新增 ${added} 条，跳过重复 ${skipped} 条`, 'success');
    } catch (err) {
      console.error(err);
      showToast('导入失败：' + err.message, 'error');
    }
  };
  reader.readAsText(file, 'UTF-8');
}

function importCompletionCSV(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const text = e.target.result;
      const data = parseCSV(text);

      if (data.length === 0) {
        showToast('CSV 文件为空', 'error');
        return;
      }

      let added = 0;
      let updated = 0;
      let skipped = 0;

      data.forEach(row => {
        const orderNo = row.维修单号 || row.orderNo;
        if (!orderNo) {
          skipped++;
          return;
        }

        const existing = appData.completions.find(c =>
          (c.维修单号 === orderNo || c.orderNo === orderNo)
        );

        if (existing) {
          Object.assign(existing, row);
          updated++;
        } else {
          appData.completions.push(row);
          added++;
        }
      });

      saveToStorage();
      renderTable();
      showToast(`导入完成：新增 ${added} 条，更新 ${updated} 条`, 'success');
    } catch (err) {
      console.error(err);
      showToast('导入失败：' + err.message, 'error');
    }
  };
  reader.readAsText(file, 'UTF-8');
}

function exportReport() {
  const repairs = getMergedRepairs();

  if (repairs.length === 0) {
    showToast('暂无数据可导出', 'warning');
    return;
  }

  const communities = {};
  repairs.forEach(r => {
    const community = r.小区名称 || r.community || '未知';
    if (!communities[community]) {
      communities[community] = { total: 0, pending: 0, picked: 0, completed: 0, reviewed: 0, issues: 0, cost: 0 };
    }
    communities[community].total++;
    communities[community][r.status] = (communities[community][r.status] || 0) + 1;
    if (r.hasIssues) communities[community].issues++;

    const allPickups = appData.partsPickups.filter(p =>
      (p.维修单号 === r.orderNo || p.orderNo === r.orderNo)
    );
    allPickups.forEach(p => {
      const parts = p.备件 || p.parts || [];
      parts.forEach(part => {
        const qty = parseFloat(part.数量 || part.qty || 0);
        const price = parseFloat(part.单价 || part.price || 0);
        communities[community].cost += qty * price;
      });
    });
  });

  const summaryRows = Object.entries(communities).map(([name, data]) => ({
    community: name,
    total: data.total,
    pending: data.pending,
    picked: data.picked,
    completed: data.completed,
    reviewed: data.reviewed,
    issues: data.issues,
    cost: data.cost.toFixed(2),
    closeRate: data.total > 0 ? ((data.reviewed / data.total) * 100).toFixed(1) + '%' : '0%'
  }));

  const detailRows = repairs.map(r => {
    const allPickups = appData.partsPickups.filter(p =>
      (p.维修单号 === r.orderNo || p.orderNo === r.orderNo)
    );
    const totalCost = allPickups.reduce((sum, p) => {
      const parts = p.备件 || p.parts || [];
      return sum + parts.reduce((s, part) => {
        const qty = parseFloat(part.数量 || part.qty || 0);
        const price = parseFloat(part.单价 || part.price || 0);
        return s + qty * price;
      }, 0);
    }, 0);

    return {
      orderNo: r.orderNo,
      community: r.小区名称 || r.community || '-',
      date: formatDate(r.报修日期 || r.date),
      reporter: r.报修人 || r.reporter || '-',
      content: r.报修内容 || r.content || '-',
      status: r.statusLabel,
      pickupDate: r.pickup ? formatDate(r.pickup.领用日期 || r.pickup.date) : '-',
      picker: r.pickup ? (r.pickup.领用人 || r.pickup.picker || '-') : '-',
      completeDate: r.completion ? formatDate(r.completion.完工日期 || r.completion.date) : '-',
      worker: r.completion ? (r.completion.完工人 || r.completion.worker || '-') : '-',
      cost: totalCost.toFixed(2),
      issues: r.issues.map(i => i.label).join('; ') || '无',
      reviewStatus: r.review ? (r.review.status === 'pass' ? '通过' : '驳回') : '未复核',
      reviewComment: r.review ? (r.review.comment || '') : '',
      reviewer: r.review ? (r.review.reviewer || '') : ''
    };
  });

  const summaryCSV = toCSV(summaryRows, [
    { key: 'community', label: '小区名称' },
    { key: 'total', label: '总工单' },
    { key: 'pending', label: '待领料' },
    { key: 'picked', label: '施工中' },
    { key: 'completed', label: '待复核' },
    { key: 'reviewed', label: '已完成' },
    { key: 'issues', label: '异常单' },
    { key: 'closeRate', label: '闭环率' },
    { key: 'cost', label: '备件费用(元)' }
  ]);

  const detailCSV = toCSV(detailRows, [
    { key: 'orderNo', label: '维修单号' },
    { key: 'community', label: '小区名称' },
    { key: 'date', label: '报修日期' },
    { key: 'reporter', label: '报修人' },
    { key: 'content', label: '报修内容' },
    { key: 'status', label: '当前状态' },
    { key: 'pickupDate', label: '领用日期' },
    { key: 'picker', label: '领用人' },
    { key: 'completeDate', label: '完工日期' },
    { key: 'worker', label: '完工人' },
    { key: 'cost', label: '备件费用(元)' },
    { key: 'issues', label: '异常标记' },
    { key: 'reviewStatus', label: '复核状态' },
    { key: 'reviewComment', label: '复核意见' },
    { key: 'reviewer', label: '复核人' }
  ]);

  const reportContent = `小区维修闭环报告
生成日期：${new Date().toLocaleDateString('zh-CN')}
========================================

一、各小区汇总
========================================
${summaryCSV}

二、明细清单
========================================
${detailCSV}
`;

  const dateStr = new Date().toISOString().split('T')[0];
  downloadFile(reportContent, `小区维修闭环报告_${dateStr}.csv`);
  showToast('报告导出成功', 'success');
}

function loadDemoData() {
  appData = {
    repairs: [
      { 维修单号: 'WX20240601001', 报修日期: '2024-06-01', 小区名称: '阳光花园', 报修人: '张三', 报修内容: '客厅空调不制冷，需要检修', 联系电话: '13800138001' },
      { 维修单号: 'WX20240601002', 报修日期: '2024-06-01', 小区名称: '阳光花园', 报修人: '李四', 报修内容: '卫生间水龙头漏水', 联系电话: '13800138002' },
      { 维修单号: 'WX20240602003', 报修日期: '2024-06-02', 小区名称: '翠湖苑', 报修人: '王五', 报修内容: '电梯故障，3楼按钮失灵', 联系电话: '13800138003' },
      { 维修单号: 'WX20240602004', 报修日期: '2024-06-02', 小区名称: '翠湖苑', 报修人: '赵六', 报修内容: '楼道灯不亮', 联系电话: '13800138004' },
      { 维修单号: 'WX20240603005', 报修日期: '2024-06-03', 小区名称: '阳光花园', 报修人: '钱七', 报修内容: '家里插座没电', 联系电话: '13800138005' },
      { 维修单号: 'WX20240603006', 报修日期: '2024-06-03', 小区名称: '金色家园', 报修人: '孙八', 报修内容: '窗户密封不严，漏风', 联系电话: '13800138006' },
      { 维修单号: 'WX20240604007', 报修日期: '2024-06-04', 小区名称: '金色家园', 报修人: '周九', 报修内容: '门禁系统故障', 联系电话: '13800138007' },
      { 维修单号: 'WX20240604008', 报修日期: '2024-06-04', 小区名称: '翠湖苑', 报修人: '吴十', 报修内容: '下水道堵塞', 联系电话: '13800138008' }
    ],
    partsPickups: [
      {
        维修单号: 'WX20240601001',
        领用日期: '2024-06-02',
        领用人: '李师傅',
        备件: [
          { 名称: '空调氟利昂', 数量: 2, 单价: 150 },
          { 名称: '空调过滤网', 数量: 1, 单价: 35 }
        ]
      },
      {
        维修单号: 'WX20240601002',
        领用日期: '2024-06-01',
        领用人: '王师傅',
        备件: [
          { 名称: '水龙头阀芯', 数量: 1, 单价: 25 },
          { 名称: '生料带', 数量: 1, 单价: 5 }
        ]
      },
      {
        维修单号: 'WX20240601002',
        领用日期: '2024-06-02',
        领用人: '王师傅',
        备件: [
          { 名称: '水龙头总成', 数量: 1, 单价: 120 }
        ]
      },
      {
        维修单号: 'WX20240602003',
        领用日期: '2024-06-02',
        领用人: '张师傅',
        备件: [
          { 名称: '电梯按钮', 数量: 2, 单价: 80 }
        ]
      },
      {
        维修单号: 'WX20240602004',
        领用日期: '2024-06-03',
        领用人: '李师傅',
        备件: [
          { 名称: 'LED灯泡', 数量: 3, 单价: 20 },
          { 名称: '声控开关', 数量: 1, 单价: 45 }
        ]
      },
      {
        维修单号: 'WX20240603005',
        领用日期: '2024-06-03',
        领用人: '赵师傅',
        备件: [
          { 名称: '插座面板', 数量: 2, 单价: 15 },
          { 名称: '绝缘胶带', 数量: 1, 单价: 8 }
        ]
      },
      {
        维修单号: 'WX20240604008',
        领用日期: '2024-06-04',
        领用人: '钱师傅',
        备件: [
          { 名称: '疏通剂', 数量: 2, 单价: 30 }
        ]
      }
    ],
    completions: [
      { 维修单号: 'WX20240601001', 完工日期: '2024-06-03', 完工人: '李师傅', 完工说明: '已加氟利昂，更换过滤网，制冷正常', '用时(小时)': 2 },
      { 维修单号: 'WX20240601002', 完工日期: '2024-06-02', 完工人: '张师傅', 完工说明: '更换水龙头总成，漏水问题解决', '用时(小时)': 1.5 },
      { 维修单号: 'WX20240602003', 完工日期: '2024-06-03', 完工人: '张师傅', 完工说明: '更换电梯按钮，恢复正常', '用时(小时)': 1 },
      { 维修单号: 'WX20240602004', 完工日期: '2024-06-04', 完工人: '李师傅', 完工说明: '更换灯泡和声控开关', '用时(小时)': 0.5 },
      { 维修单号: 'WX20240604008', 完工日期: '2024-06-05', 完工人: '王师傅', 完工说明: '使用疏通剂后下水通畅', '用时(小时)': 1 }
    ],
    reviews: {
      'WX20240601001': { status: 'pass', comment: '维修及时，客户满意', reviewer: '刘主管', date: '2024-06-04' },
      'WX20240602003': { status: 'pass', comment: '电梯维保到位', reviewer: '刘主管', date: '2024-06-04' },
      'WX20240602004': { status: 'reject', comment: '请确认所有楼道灯都已更换', reviewer: '刘主管', date: '2024-06-05' }
    },
    inventory: {
      '空调氟利昂': 5,
      '空调过滤网': 3,
      '水龙头阀芯': 10,
      '生料带': 20,
      '水龙头总成': 0,
      '电梯按钮': 1,
      'LED灯泡': 2,
      '声控开关': 5,
      '插座面板': 8,
      '绝缘胶带': 15,
      '疏通剂': 1
    }
  };

  saveToStorage();
  updateCommunityFilter();
  renderTable();
  showToast('示例数据已加载', 'success');
}

function clearAllData() {
  if (!confirm('确定要清空所有数据吗？此操作不可撤销。')) {
    return;
  }

  appData = {
    repairs: [],
    partsPickups: [],
    completions: [],
    reviews: {},
    inventory: {}
  };

  saveToStorage();
  updateCommunityFilter();
  renderTable();
  showToast('数据已清空', 'success');
}

function resetFilters() {
  document.getElementById('filterCommunity').value = '';
  document.getElementById('filterStatus').value = '';
  document.getElementById('filterInsufficient').checked = false;
  document.getElementById('filterWorkerMismatch').checked = false;
  document.getElementById('filterUncompleted').checked = false;
  document.getElementById('filterDuplicate').checked = false;
  document.getElementById('searchOrder').value = '';
  renderTable();
}

function initEvents() {
  document.getElementById('fileRepair').addEventListener('change', function(e) {
    if (e.target.files[0]) {
      importRepairCSV(e.target.files[0]);
    }
  });

  document.getElementById('fileParts').addEventListener('change', function(e) {
    if (e.target.files[0]) {
      importPartsJSON(e.target.files[0]);
    }
  });

  document.getElementById('fileComplete').addEventListener('change', function(e) {
    if (e.target.files[0]) {
      importCompletionCSV(e.target.files[0]);
    }
  });

  document.getElementById('btnImportDemo').addEventListener('click', loadDemoData);
  document.getElementById('btnExportReport').addEventListener('click', exportReport);
  document.getElementById('btnClearAll').addEventListener('click', clearAllData);
  document.getElementById('btnResetFilter').addEventListener('click', resetFilters);

  document.getElementById('filterCommunity').addEventListener('change', renderTable);
  document.getElementById('filterStatus').addEventListener('change', renderTable);
  document.getElementById('filterInsufficient').addEventListener('change', renderTable);
  document.getElementById('filterWorkerMismatch').addEventListener('change', renderTable);
  document.getElementById('filterUncompleted').addEventListener('change', renderTable);
  document.getElementById('filterDuplicate').addEventListener('change', renderTable);
  document.getElementById('searchOrder').addEventListener('input', renderTable);
  document.getElementById('sortBy').addEventListener('change', renderTable);

  document.getElementById('detailModal').addEventListener('click', function(e) {
    if (e.target === this) {
      closeModal();
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeModal();
    }
  });
}

function init() {
  loadFromStorage();
  updateCommunityFilter();
  renderTable();
  initEvents();
}

document.addEventListener('DOMContentLoaded', init);
