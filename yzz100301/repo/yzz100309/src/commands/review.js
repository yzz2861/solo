const { loadAllData } = require('../utils/data-loader');
const {
  getSampleById,
  getSamplesByStatus,
  getSamplesByReviewer,
  getSamplesByPosition,
  getAllSamples,
  STATUS,
} = require('../engine/sample-tracker');

async function runReview(opts) {
  const data = await loadAllData(opts);
  const { tracker } = data;

  let results = [];

  if (opts.sampleId) {
    const sample = getSampleById(tracker, opts.sampleId);
    if (sample) {
      results = [sample];
    }
  } else if (opts.reviewer) {
    results = getSamplesByReviewer(tracker, opts.reviewer);
  } else if (opts.status) {
    results = getSamplesByStatus(tracker, opts.status);
  } else if (opts.position) {
    for (const box of tracker.boxes.values()) {
      const samples = getSamplesByPosition(tracker, box.boxId, opts.position);
      results.push(...samples);
    }
  } else {
    results = getAllSamples(tracker);
  }

  const statusCounts = {};
  for (const status of Object.values(STATUS)) {
    statusCounts[status] = getSamplesByStatus(tracker, status).length;
  }

  if (!opts.json) {
    printReviewSummary({
      total: tracker.samples.size,
      filtered: results.length,
      statusCounts,
      filter: {
        sampleId: opts.sampleId,
        status: opts.status,
        reviewer: opts.reviewer,
        position: opts.position,
      },
    });

    if (results.length > 0) {
      if (opts.sampleId && results.length === 1) {
        printSampleDetail(results[0]);
      } else {
        printSampleList(results);
      }
    }
  }

  return {
    summary: {
      totalSamples: tracker.samples.size,
      filteredCount: results.length,
      statusCounts,
    },
    samples: results,
  };
}

function printReviewSummary(stats) {
  console.log('========================================');
  console.log('  样本复核查询');
  console.log('========================================');
  console.log();

  const filters = [];
  if (stats.filter.sampleId) filters.push(`样本编号: ${stats.filter.sampleId}`);
  if (stats.filter.status) filters.push(`状态: ${stats.filter.status}`);
  if (stats.filter.reviewer) filters.push(`复核人: ${stats.filter.reviewer}`);
  if (stats.filter.position) filters.push(`位置: ${stats.filter.position}`);

  if (filters.length > 0) {
    console.log('筛选条件:');
    for (const f of filters) {
      console.log(`  ${f}`);
    }
    console.log();
  }

  console.log(`样本总数: ${stats.total}`);
  console.log(`匹配数量: ${stats.filtered}`);
  console.log();
  console.log('状态分布:');
  const statusNames = {
    [STATUS.STORED]: '已入库',
    [STATUS.MOVED]: '已移动',
    [STATUS.REVIEWED]: '已复核',
    [STATUS.DISCARDED]: '已废弃',
  };
  for (const [status, count] of Object.entries(stats.statusCounts)) {
    const name = statusNames[status] || status;
    console.log(`  ${name}: ${count}`);
  }
  console.log();
}

function printSampleList(samples) {
  const statusNames = {
    [STATUS.STORED]: '已入库',
    [STATUS.MOVED]: '已移动',
    [STATUS.REVIEWED]: '已复核',
    [STATUS.DISCARDED]: '已废弃',
  };

  console.log('样本列表:');
  console.log('-'.repeat(60));
  console.log(
    `${'样本编号'.padEnd(15)}${'名称'.padEnd(15)}${'位置'.padEnd(12)}${'状态'.padEnd(10)}${'复核人'.padEnd(10)}`
  );
  console.log('-'.repeat(60));

  for (const sample of samples) {
    const status = statusNames[sample.status] || sample.status;
    const position =
      sample.currentBox && sample.currentPosition
        ? `${sample.currentBox}/${sample.currentPosition}`
        : '-';
    console.log(
      `${(sample.sampleId || '-').padEnd(15)}${(sample.name || '-').padEnd(15)}${position.padEnd(12)}${status.padEnd(10)}${(sample.reviewer || '-').padEnd(10)}`
    );
  }
  console.log();
}

function printSampleDetail(sample) {
  const statusNames = {
    [STATUS.STORED]: '已入库',
    [STATUS.MOVED]: '已移动',
    [STATUS.REVIEWED]: '已复核',
    [STATUS.DISCARDED]: '已废弃',
  };

  console.log('样本详情:');
  console.log('-'.repeat(40));
  console.log(`样本编号: ${sample.sampleId}`);
  console.log(`样本名称: ${sample.name || '-'}`);
  console.log(`当前状态: ${statusNames[sample.status] || sample.status}`);
  if (sample.currentBox && sample.currentPosition) {
    console.log(`当前位置: ${sample.currentBox} / ${sample.currentPosition}`);
  } else {
    console.log(`当前位置: -`);
  }
  console.log(`复核人: ${sample.reviewer || '-'}`);
  console.log(`复核日期: ${sample.reviewDate || '-'}`);
  console.log(`台账行号: ${sample.inventoryLineNumber}`);
  console.log();

  console.log('历史记录:');
  console.log('-'.repeat(40));

  const typeNames = {
    store: '入库',
    move: '移动',
    review: '复核',
    discard: '废弃',
  };

  for (let i = 0; i < sample.history.length; i++) {
    const h = sample.history[i];
    const typeName = typeNames[h.type] || h.type;
    console.log(`${i + 1}. [${typeName}]`);
    if (h.date) console.log(`   日期: ${h.date}`);
    if (h.operator) console.log(`   操作人: ${h.operator}`);
    if (h.reviewer) console.log(`   复核人: ${h.reviewer}`);
    if (h.type === 'move') {
      console.log(`   从: ${h.fromBox}/${h.fromPosition}`);
      console.log(`   到: ${h.toBox}/${h.toPosition}`);
    } else if (h.type === 'store') {
      console.log(`   位置: ${h.boxId}/${h.position}`);
    } else if (h.type === 'discard') {
      console.log(`   原位置: ${h.fromBox}/${h.fromPosition}`);
    }
    console.log(`   来源行: ${h.source === 'inventory' ? '台账' : '移动记录'} 第${h.lineNumber}行`);
    console.log();
  }
}

module.exports = {
  runReview,
};
