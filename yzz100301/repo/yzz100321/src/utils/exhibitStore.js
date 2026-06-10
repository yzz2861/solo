import Papa from 'papaparse';

export const EXHIBIT_STATUS = {
  CONTRACTED: 'contracted',
  CHECKED_OUT: 'checked_out',
  ON_DISPLAY: 'on_display',
  RETURNED: 'returned',
  REVIEWED: 'reviewed',
  OVERDUE: 'overdue',
  ABNORMAL: 'abnormal',
  HANDLER_MISMATCH: 'handler_mismatch',
};

export const STATUS_LABELS = {
  [EXHIBIT_STATUS.CONTRACTED]: '已签约',
  [EXHIBIT_STATUS.CHECKED_OUT]: '已出库',
  [EXHIBIT_STATUS.ON_DISPLAY]: '在展中',
  [EXHIBIT_STATUS.RETURNED]: '已回馆',
  [EXHIBIT_STATUS.REVIEWED]: '已复核',
  [EXHIBIT_STATUS.OVERDUE]: '逾期未回',
  [EXHIBIT_STATUS.ABNORMAL]: '验收异常',
  [EXHIBIT_STATUS.HANDLER_MISMATCH]: '经手人不一致',
};

export const ACCEPTANCE_LEVELS = ['完好', '轻微损伤', '严重损伤', '丢失'];

export function createExhibitStore() {
  let exhibits = new Map();
  let contracts = new Map();
  let checkouts = new Map();
  let returns = new Map();
  let importHistory = new Set();
  let reviewOpinions = new Map();
  let listeners = [];

  function subscribe(listener) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }

  function notify() {
    listeners.forEach(l => l(getState()));
  }

  function getState() {
    return {
      exhibits: Array.from(exhibits.values()),
      contractCount: contracts.size,
      checkoutCount: checkouts.size,
      returnCount: returns.size,
    };
  }

  function generateBatchId(type, data) {
    const sorted = [...data].sort().join('|');
    return `${type}-${hashString(sorted)}`;
  }

  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash + char);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  function parseContractCSV(content) {
    const result = Papa.parse(content, { header: true, skipEmptyLines: true });
    return result.data.map(row => {
      const keys = Object.keys(row);
      const getVal = (candidates) => {
        for (const key of keys) {
          if (candidates.some(c => key.toLowerCase().includes(c.toLowerCase()))) {
            return row[key];
          }
        }
        return '';
      };
      return {
        exhibitId: getVal(['展品编号', 'exhibitId', 'id', '编号']),
        exhibitName: getVal(['展品名称', 'exhibitName', 'name', '名称']),
        category: getVal(['类别', 'category', '分类']),
        level: getVal(['等级', 'level', '珍贵等级', '级别']),
        loanStartDate: getVal(['借出日期', 'loanDate', 'startDate', '开始日期']),
        dueDate: getVal(['应还日期', 'dueDate', 'endDate', '结束日期', '归还日期']),
        handler: getVal(['经手人', 'handler', 'operator', '经办人']),
        borrower: getVal(['借展方', 'borrower', 'lender', '借出单位']),
        contractNo: getVal(['合同编号', 'contractNo', 'contractId']),
        source: 'contract',
      };
    });
  }

  function parseCheckoutCSV(content) {
    const result = Papa.parse(content, { header: true, skipEmptyLines: true });
    return result.data.map(row => {
      const keys = Object.keys(row);
      const getVal = (candidates) => {
        for (const key of keys) {
          if (candidates.some(c => key.toLowerCase().includes(c.toLowerCase()))) {
            return row[key];
          }
        }
        return '';
      };
      return {
        exhibitId: getVal(['展品编号', 'exhibitId', 'id', '编号']),
        exhibitName: getVal(['展品名称', 'exhibitName', 'name', '名称']),
        checkoutDate: getVal(['出库日期', 'checkoutDate', 'scanDate', '扫描日期']),
        handler: getVal(['出库人', 'handler', 'operator', '经手人', '出库经手人']),
        location: getVal(['存放位置', 'location', 'position']),
        source: 'checkout',
      };
    });
  }

  function parseReturnJSON(content) {
    let data;
    try {
      data = JSON.parse(content);
    } catch (e) {
      return [];
    }
    const items = Array.isArray(data) ? data : (data.items || data.exhibits || []);
    return items.map(item => ({
      exhibitId: item.exhibitId || item.展品编号 || item.id || '',
      exhibitName: item.exhibitName || item.展品名称 || item.name || '',
      returnDate: item.returnDate || item.回馆日期 || item.验收日期 || '',
      acceptanceLevel: item.acceptanceLevel || item.验收等级 || item.condition || '',
      handler: item.handler || item.验收人 || item.经手人 || '',
      condition: item.condition || item.状况描述 || item.remarks || '',
      source: 'return',
    }));
  }

  function importContracts(csvContent) {
    const parsed = parseContractCSV(csvContent);
    const ids = parsed.map(p => p.exhibitId).filter(Boolean);
    const batchId = generateBatchId('contract', ids);

    if (importHistory.has(batchId)) {
      return { success: false, message: '该合同清单已导入，请勿重复导入', count: 0 };
    }

    importHistory.add(batchId);

    parsed.forEach(item => {
      if (!item.exhibitId) return;
      contracts.set(item.exhibitId, item);
      if (!exhibits.has(item.exhibitId)) {
        exhibits.set(item.exhibitId, {
          exhibitId: item.exhibitId,
          exhibitName: item.exhibitName,
          category: item.category,
          level: item.level,
        });
      }
    });

    recalcStatus();
    notify();
    return { success: true, message: `成功导入 ${ids.length} 条合同记录`, count: ids.length };
  }

  function importCheckouts(csvContent) {
    const parsed = parseCheckoutCSV(csvContent);
    const ids = parsed.map(p => p.exhibitId).filter(Boolean);
    const batchId = generateBatchId('checkout', ids);

    if (importHistory.has(batchId)) {
      return { success: false, message: '该出库扫描已导入，请勿重复导入', count: 0 };
    }

    importHistory.add(batchId);

    parsed.forEach(item => {
      if (!item.exhibitId) return;
      checkouts.set(item.exhibitId, item);
      if (!exhibits.has(item.exhibitId)) {
        exhibits.set(item.exhibitId, {
          exhibitId: item.exhibitId,
          exhibitName: item.exhibitName,
        });
      }
    });

    recalcStatus();
    notify();
    return { success: true, message: `成功导入 ${ids.length} 条出库记录`, count: ids.length };
  }

  function importReturns(jsonContent) {
    const parsed = parseReturnJSON(jsonContent);
    const ids = parsed.map(p => p.exhibitId).filter(Boolean);
    const batchId = generateBatchId('return', ids);

    if (importHistory.has(batchId)) {
      return { success: false, message: '该回馆验收数据已导入，请勿重复导入', count: 0 };
    }

    importHistory.add(batchId);

    parsed.forEach(item => {
      if (!item.exhibitId) return;
      returns.set(item.exhibitId, item);
      if (!exhibits.has(item.exhibitId)) {
        exhibits.set(item.exhibitId, {
          exhibitId: item.exhibitId,
          exhibitName: item.exhibitName,
        });
      }
    });

    recalcStatus();
    notify();
    return { success: true, message: `成功导入 ${ids.length} 条回馆记录`, count: ids.length };
  }

  function recalcStatus() {
    const today = new Date().toISOString().split('T')[0];

    exhibits.forEach((exhibit, id) => {
      const contract = contracts.get(id);
      const checkout = checkouts.get(id);
      const return_ = returns.get(id);
      const review = reviewOpinions.get(id);

      const updated = { ...exhibit };
      updated.contract = contract || null;
      updated.checkout = checkout || null;
      updated.return = return_ || null;
      updated.review = review || null;

      const statuses = [];
      const warnings = [];

      if (contract) {
        statuses.push(EXHIBIT_STATUS.CONTRACTED);
      }

      if (checkout) {
        statuses.push(EXHIBIT_STATUS.CHECKED_OUT);
        statuses.push(EXHIBIT_STATUS.ON_DISPLAY);
      }

      if (return_) {
        statuses.push(EXHIBIT_STATUS.RETURNED);
      }

      if (review) {
        statuses.push(EXHIBIT_STATUS.REVIEWED);
      }

      if (contract && contract.dueDate && !return_) {
        if (contract.dueDate < today) {
          warnings.push(EXHIBIT_STATUS.OVERDUE);
        }
      }

      if (return_ && return_.acceptanceLevel) {
        const level = return_.acceptanceLevel;
        if (level !== '完好' && level !== '正常' && level !== 'good') {
          warnings.push(EXHIBIT_STATUS.ABNORMAL);
        }
      }

      if (checkout && return_ && checkout.handler && return_.handler) {
        if (checkout.handler !== return_.handler) {
          warnings.push(EXHIBIT_STATUS.HANDLER_MISMATCH);
        }
      }

      updated.statuses = statuses;
      updated.warnings = warnings;
      updated.primaryStatus = warnings.length > 0
        ? warnings[0]
        : (statuses.length > 0 ? statuses[statuses.length - 1] : null);

      exhibits.set(id, updated);
    });
  }

  function setReviewOpinion(exhibitId, opinion) {
    reviewOpinions.set(exhibitId, {
      ...opinion,
      updatedAt: new Date().toISOString(),
    });
    recalcStatus();
    notify();
  }

  function getExhibits() {
    return Array.from(exhibits.values());
  }

  function getFilteredExhibits(filters) {
    let result = getExhibits();

    if (filters.status && filters.status !== 'all') {
      result = result.filter(e =>
        e.statuses.includes(filters.status) || e.warnings.includes(filters.status)
      );
    }

    if (filters.warningType && filters.warningType !== 'all') {
      result = result.filter(e => e.warnings.includes(filters.warningType));
    }

    if (filters.search) {
      const keyword = filters.search.toLowerCase();
      result = result.filter(e =>
      e.exhibitId.toLowerCase().includes(keyword) ||
      (e.exhibitName || '').toLowerCase().includes(keyword) ||
      (e.contract?.borrower || '').toLowerCase().includes(keyword)
    );
    }

    if (filters.level && filters.level !== 'all') {
      result = result.filter(e => (e.level || '') === filters.level);
    }

    return result;
  }

  function getStatistics() {
    const all = getExhibits();
    return {
      total: all.length,
      contracted: all.filter(e => e.statuses.includes(EXHIBIT_STATUS.CONTRACTED)).length,
      checkedOut: all.filter(e => e.statuses.includes(EXHIBIT_STATUS.CHECKED_OUT)).length,
      onDisplay: all.filter(e => e.statuses.includes(EXHIBIT_STATUS.ON_DISPLAY)).length,
      returned: all.filter(e => e.statuses.includes(EXHIBIT_STATUS.RETURNED)).length,
      reviewed: all.filter(e => e.statuses.includes(EXHIBIT_STATUS.REVIEWED)).length,
      overdue: all.filter(e => e.warnings.includes(EXHIBIT_STATUS.OVERDUE)).length,
      abnormal: all.filter(e => e.warnings.includes(EXHIBIT_STATUS.ABNORMAL)).length,
      handlerMismatch: all.filter(e => e.warnings.includes(EXHIBIT_STATUS.HANDLER_MISMATCH)).length,
    };
  }

  function exportReport(exhibitIds) {
    const items = exhibitIds
      ? getExhibits().filter(e => exhibitIds.includes(e.exhibitId))
      : getExhibits();

    const csvRows = [
      ['展品编号', '展品名称', '类别', '等级', '状态', '借展方', '合同编号',
       '借出日期', '应还日期', '出库日期', '出库经手人',
       '回馆日期', '验收等级', '回馆经手人', '状况描述',
       '复核意见', '复核人', '复核日期'],
    ];

    items.forEach(e => {
      const statusLabels = [
        ...e.statuses.map(s => STATUS_LABELS[s]),
        ...e.warnings.map(w => `⚠${STATUS_LABELS[w]}`),
      ].join(' / ');

      csvRows.push([
        e.exhibitId,
        e.exhibitName || '',
        e.category || '',
        e.level || '',
        statusLabels,
        e.contract?.borrower || '',
        e.contract?.contractNo || '',
        e.contract?.loanStartDate || '',
        e.contract?.dueDate || '',
        e.checkout?.checkoutDate || '',
        e.checkout?.handler || '',
        e.return?.returnDate || '',
        e.return?.acceptanceLevel || '',
        e.return?.handler || '',
        e.return?.condition || '',
        e.review?.opinion || '',
        e.review?.reviewer || '',
        e.review?.updatedAt ? e.review.updatedAt.split('T')[0] : '',
      ]);
    });

    return Papa.unparse(csvRows);
  }

  function generateReportHTML(exhibitIds) {
    const items = exhibitIds
      ? getExhibits().filter(e => exhibitIds.includes(e.exhibitId))
      : getExhibits();

    const stats = getStatistics();
    const now = new Date().toLocaleString('zh-CN');

    const warningItems = items.filter(e => e.warnings.length > 0);

    let html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>借展交接报告</title>
  <style>
    body { font-family: "Microsoft YaHei", sans-serif; padding: 30px; }
    h1 { text-align: center; color: #2c3e50; }
    .meta { text-align: center; color: #7f8c8d; margin-bottom: 30px; }
    .stats { display: flex; gap: 20px; margin-bottom: 30px; background: #f8f9fa; padding: 20px; border-radius: 8px; }
    .stat-item { flex: 1; text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; color: #3498db; }
    .stat-label { color: #7f8c8d; margin-top: 5px; }
    .warning-box { background: #fff3cd; border: 1px solid #f0ad4e; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .warning-title { font-weight: bold; color: #8a6d3b; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #34495e; color: white; }
    tr:nth-child(even) { background: #f8f9fa; }
    .warning { color: #e74c3c; }
    .status-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 4px; }
    .status-normal { background: #d4edda; color: #155724; }
    .status-warning { background: #f8d7da; color: #721c24; }
  </style>
</head>
<body>
  <h1>博物馆借展交接报告</h1>
  <div class="meta">报告生成时间：${now}</div>
  
  <div class="stats">
    <div class="stat-item"><div class="stat-value">${stats.total}</div><div class="stat-label">展品总数</div></div>
    <div class="stat-item"><div class="stat-value">${stats.onDisplay}</div><div class="stat-label">在展中</div></div>
    <div class="stat-item"><div class="stat-value">${stats.returned}</div><div class="stat-label">已回馆</div></div>
    <div class="stat-item"><div class="stat-value">${stats.reviewed}</div><div class="stat-label">已复核</div></div>
  </div>

  ${warningItems.length > 0 ? `
  <div class="warning-box">
    <div class="warning-title">⚠ 异常提醒（共 ${warningItems.length} 项）</div>
    <ul>
      <li>逾期未回：${stats.overdue} 件</li>
      <li>验收异常：${stats.abnormal} 件</li>
      <li>经手人不一致：${stats.handlerMismatch} 件</li>
    </ul>
  </div>
  ` : ''}

  <h2>展品清单</h2>
  <table>
    <thead>
      <tr>
        <th>展品编号</th>
        <th>展品名称</th>
        <th>等级</th>
        <th>状态</th>
        <th>借展方</th>
        <th>出库日期</th>
        <th>应还日期</th>
        <th>回馆日期</th>
        <th>验收等级</th>
      </tr>
    </thead>
    <tbody>
`;

    items.forEach(e => {
      const hasWarning = e.warnings.length > 0;
      const statusHTML = [
        ...e.statuses.map(s => `<span class="status-tag status-normal">${STATUS_LABELS[s]}</span>`),
        ...e.warnings.map(w => `<span class="status-tag status-warning">${STATUS_LABELS[w]}</span>`),
      ].join('');

      html += `
      <tr class="${hasWarning ? 'warning' : ''}">
        <td>${e.exhibitId}</td>
        <td>${e.exhibitName || ''}</td>
        <td>${e.level || ''}</td>
        <td>${statusHTML}</td>
        <td>${e.contract?.borrower || ''}</td>
        <td>${e.checkout?.checkoutDate || ''}</td>
        <td>${e.contract?.dueDate || ''}</td>
        <td>${e.return?.returnDate || ''}</td>
        <td>${e.return?.acceptanceLevel || ''}</td>
      </tr>`;
    });

    html += `
    </tbody>
  </table>
</body>
</html>`;

    return html;
  }

  return {
    subscribe,
    getState,
    importContracts,
    importCheckouts,
    importReturns,
    getExhibits,
    getFilteredExhibits,
    getStatistics,
    setReviewOpinion,
    exportReport,
    generateReportHTML,
  };
}
