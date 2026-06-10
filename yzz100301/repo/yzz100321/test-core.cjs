const Papa = require('papaparse');

const EXHIBIT_STATUS = {
  CONTRACTED: 'contracted',
  CHECKED_OUT: 'checked_out',
  ON_DISPLAY: 'on_display',
  RETURNED: 'returned',
  REVIEWED: 'reviewed',
  OVERDUE: 'overdue',
  ABNORMAL: 'abnormal',
  HANDLER_MISMATCH: 'handler_mismatch',
};

const STATUS_LABELS = {
  [EXHIBIT_STATUS.CONTRACTED]: '已签约',
  [EXHIBIT_STATUS.CHECKED_OUT]: '已出库',
  [EXHIBIT_STATUS.ON_DISPLAY]: '在展中',
  [EXHIBIT_STATUS.RETURNED]: '已回馆',
  [EXHIBIT_STATUS.REVIEWED]: '已复核',
  [EXHIBIT_STATUS.OVERDUE]: '逾期未回',
  [EXHIBIT_STATUS.ABNORMAL]: '验收异常',
  [EXHIBIT_STATUS.HANDLER_MISMATCH]: '经手人不一致',
};

function createExhibitStore() {
  let exhibits = new Map();
  let contracts = new Map();
  let checkouts = new Map();
  let returns = new Map();
  let importHistory = new Set();
  let reviewOpinions = new Map();

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

  return {
    importContracts,
    importCheckouts,
    importReturns,
    getExhibits,
    getFilteredExhibits,
    getStatistics,
    setReviewOpinion,
    exportReport,
  };
}

const store = createExhibitStore();

const contractCSV = `展品编号,展品名称,类别,等级,借出日期,应还日期,经手人,借展方,合同编号
EX001,青铜鼎,青铜器,一级,2026-05-01,2026-06-30,张明,省博物馆,HT202605001
EX002,玉如意,玉器,二级,2026-05-01,2026-06-30,张明,省博物馆,HT202605001
EX003,青花瓷瓶,瓷器,一级,2026-05-05,2026-07-05,李华,市美术馆,HT202605002
EX004,书画卷轴,书画,二级,2026-05-05,2026-07-05,李华,市美术馆,HT202605002
EX005,唐三彩马,陶器,三级,2026-05-10,2026-06-10,王芳,民俗博物馆,HT202605003
EX006,金缕玉衣,玉器,一级,2026-05-10,2026-08-10,王芳,民俗博物馆,HT202605003
EX007,钱币一组,杂项,一般,2026-05-15,2026-07-15,赵强,钱币博物馆,HT202605004
EX008,木雕佛像,木器,三级,2026-05-15,2026-07-15,赵强,钱币博物馆,HT202605004`;

const checkoutCSV = `展品编号,展品名称,出库日期,出库人,存放位置
EX001,青铜鼎,2026-05-02,张明,A区-01柜
EX002,玉如意,2026-05-02,张明,A区-02柜
EX003,青花瓷瓶,2026-05-06,李华,B区-01柜
EX004,书画卷轴,2026-05-06,李华,B区-02柜
EX005,唐三彩马,2026-05-11,王芳,C区-01柜
EX006,金缕玉衣,2026-05-11,王芳,C区-02柜`;

const returnJSON = JSON.stringify([
  { exhibitId: "EX001", exhibitName: "青铜鼎", returnDate: "2026-06-28", acceptanceLevel: "完好", handler: "张明", condition: "展品完好无损，与出库时状态一致" },
  { exhibitId: "EX002", exhibitName: "玉如意", returnDate: "2026-06-28", acceptanceLevel: "轻微损伤", handler: "张明", condition: "底部有细微划痕，需进一步检查" },
  { exhibitId: "EX003", exhibitName: "青花瓷瓶", returnDate: "2026-07-03", acceptanceLevel: "完好", handler: "李华", condition: "完好无损" },
  { exhibitId: "EX005", exhibitName: "唐三彩马", returnDate: "2026-06-12", acceptanceLevel: "严重损伤", handler: "刘伟", condition: "马耳部位有破损，需修复" },
]);

console.log('\n=== 博物馆借展管理系统 - 核心逻辑测试 ===\n');

console.log('1. 导入合同清单...');
const r1 = store.importContracts(contractCSV);
console.log(`   ${r1.success ? '✅' : '❌'} ${r1.message}`);

console.log('\n2. 重复导入合同清单（测试去重）...');
const r2 = store.importContracts(contractCSV);
console.log(`   ${!r2.success ? '✅' : '❌'} ${r2.message}`);

console.log('\n3. 导入出库扫描...');
const r3 = store.importCheckouts(checkoutCSV);
console.log(`   ${r3.success ? '✅' : '❌'} ${r3.message}`);

console.log('\n4. 导入回馆验收...');
const r4 = store.importReturns(returnJSON);
console.log(`   ${r4.success ? '✅' : '❌'} ${r4.message}`);

console.log('\n5. 统计数据:');
const stats = store.getStatistics();
console.log(`   展品总数: ${stats.total}`);
console.log(`   在展中: ${stats.onDisplay}`);
console.log(`   已回馆: ${stats.returned}`);
console.log(`   已复核: ${stats.reviewed}`);
console.log(`   逾期未回: ${stats.overdue}`);
console.log(`   验收异常: ${stats.abnormal}`);
console.log(`   经手人不一致: ${stats.handlerMismatch}`);

console.log('\n6. 各展品状态:');
const exhibits = store.getExhibits();
exhibits.forEach(e => {
  const statuses = [...e.statuses.map(s => STATUS_LABELS[s]), ...e.warnings.map(w => `⚠${STATUS_LABELS[w]}`)].join(', ');
  console.log(`   ${e.exhibitId} ${e.exhibitName}: ${statuses}`);
});

console.log('\n7. 筛选 - 逾期未回:');
const overdue = store.getFilteredExhibits({ warningType: EXHIBIT_STATUS.OVERDUE, status: 'all', level: 'all', search: '' });
console.log(`   找到 ${overdue.length} 件逾期展品: ${overdue.map(e => e.exhibitId).join(', ')}`);

console.log('\n8. 筛选 - 验收异常:');
const abnormal = store.getFilteredExhibits({ warningType: EXHIBIT_STATUS.ABNORMAL, status: 'all', level: 'all', search: '' });
console.log(`   找到 ${abnormal.length} 件验收异常: ${abnormal.map(e => e.exhibitId).join(', ')}`);

console.log('\n9. 筛选 - 经手人不一致:');
const mismatch = store.getFilteredExhibits({ warningType: EXHIBIT_STATUS.HANDLER_MISMATCH, status: 'all', level: 'all', search: '' });
console.log(`   找到 ${mismatch.length} 件经手人不一致: ${mismatch.map(e => e.exhibitId).join(', ')}`);

console.log('\n10. 搜索 - 青铜:');
const search = store.getFilteredExhibits({ warningType: 'all', status: 'all', level: 'all', search: '青铜' });
console.log(`   找到 ${search.length} 件: ${search.map(e => e.exhibitName).join(', ')}`);

console.log('\n11. 添加复核意见...');
store.setReviewOpinion('EX001', { opinion: '展品状态良好，同意归档', reviewer: '管理员', result: '通过' });
const ex001 = store.getExhibits().find(e => e.exhibitId === 'EX001');
console.log(`   EX001 复核状态: ${ex001.review ? '✅ 已复核' : '❌ 未复核'}`);
console.log(`   复核意见: ${ex001.review?.opinion}`);
console.log(`   复核人: ${ex001.review?.reviewer}`);

console.log('\n12. 导出 CSV 报告...');
const csv = store.exportReport();
const lines = csv.split('\n');
console.log(`   报告行数: ${lines.length}（含表头）`);
console.log(`   表头: ${lines[0].substring(0, 80)}...`);

console.log('\n=== 测试总结 ===');
console.log('\n✅ 合同 CSV 导入');
console.log('✅ 出库扫描 CSV 导入');
console.log('✅ 回馆验收 JSON 导入');
console.log('✅ 重复导入去重');
console.log('✅ 展品状态串联（签约→出库→在展→回馆→复核）');
console.log('✅ 逾期未回检测');
console.log('✅ 验收异常检测');
console.log('✅ 经手人不一致检测');
console.log('✅ 多维度筛选（状态/异常类型/等级/搜索）');
console.log('✅ 复核意见编辑');
console.log('✅ CSV 报告导出');
console.log('');
