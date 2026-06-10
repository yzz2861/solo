const { loadAllData } = require('../utils/data-loader');
const { getConflictsByType, groupConflictsByType, CONFLICT_TYPES } = require('../audit/conflict-detector');
const { getAllSamples } = require('../engine/sample-tracker');

async function runAudit(opts) {
  const data = await loadAllData(opts);
  const { conflicts, tracker, inventory, movements, boxes } = data;

  const filteredConflicts = getConflictsByType(conflicts, opts.type);
  const groupedConflicts = groupConflictsByType(filteredConflicts);

  const sampleCount = tracker.samples.size;
  const conflictCount = filteredConflicts.length;
  const highSeverityCount = filteredConflicts.filter((c) => c.severity === 'high').length;
  const mediumSeverityCount = filteredConflicts.filter((c) => c.severity === 'medium').length;
  const lowSeverityCount = filteredConflicts.filter((c) => c.severity === 'low').length;

  if (!opts.json) {
    printAuditSummary({
      sampleCount,
      conflictCount,
      highSeverityCount,
      mediumSeverityCount,
      lowSeverityCount,
      inventoryCount: inventory.length,
      movementCount: movements.length,
      boxCount: boxes.length,
    });

    if (filteredConflicts.length > 0) {
      printConflictDetails(groupedConflicts);
    }
  }

  return {
    summary: {
      sampleCount,
      conflictCount,
      highSeverityCount,
      mediumSeverityCount,
      lowSeverityCount,
      inventoryCount: inventory.length,
      movementCount: movements.length,
      boxCount: boxes.length,
    },
    conflicts: filteredConflicts,
    groupedConflicts,
    samples: getAllSamples(tracker),
  };
}

function printAuditSummary(stats) {
  console.log('========================================');
  console.log('  样本冻存审计报告');
  console.log('========================================');
  console.log();
  console.log(`台账记录数: ${stats.inventoryCount}`);
  console.log(`移动记录数: ${stats.movementCount}`);
  console.log(`冻存盒数量: ${stats.boxCount}`);
  console.log(`有效样本数: ${stats.sampleCount}`);
  console.log();
  console.log('----------------------------------------');
  console.log(`问题总数: ${stats.conflictCount}`);
  console.log(`  高严重: ${stats.highSeverityCount}`);
  console.log(`  中严重: ${stats.mediumSeverityCount}`);
  console.log(`  低严重: ${stats.lowSeverityCount}`);
  console.log('----------------------------------------');
  console.log();
}

function printConflictDetails(groupedConflicts) {
  const typeNames = {
    [CONFLICT_TYPES.POSITION_CONFLICT]: '位置冲突',
    [CONFLICT_TYPES.MISSING_SAMPLE]: '样本缺失',
    [CONFLICT_TYPES.REVIEWER_MISMATCH]: '复核人不一致',
    [CONFLICT_TYPES.DUPLICATE_MOVE]: '重复移动',
    [CONFLICT_TYPES.INVALID_POSITION]: '无效位置',
    [CONFLICT_TYPES.EMPTY_SAMPLE_ID]: '样本编号缺失',
  };

  for (const [type, list] of Object.entries(groupedConflicts)) {
    if (list.length === 0) continue;

    const name = typeNames[type] || type;
    console.log(`【${name}】(${list.length} 条)`);
    console.log('-'.repeat(40));

    for (const conflict of list) {
      const severityLabel = {
        high: '高',
        medium: '中',
        low: '低',
      }[conflict.severity] || conflict.severity;

      console.log(`  [${severityLabel}] 行${conflict.lineNumber} - ${conflict.message}`);
      if (conflict.sampleId) {
        console.log(`      样本编号: ${conflict.sampleId}`);
      }
      if (conflict.source) {
        console.log(`      来源文件: ${conflict.source === 'inventory' ? '样本台账' : '移动记录'}`);
      }
      console.log();
    }
    console.log();
  }
}

module.exports = {
  runAudit,
};
