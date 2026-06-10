const { loadAllData } = require('../utils/data-loader');
const { CONFLICT_TYPES } = require('../audit/conflict-detector');

async function runMove(opts) {
  const data = await loadAllData(opts);
  const { tracker, movements, conflicts } = data;

  const moveConflicts = conflicts.filter(
    (c) =>
      c.type === CONFLICT_TYPES.POSITION_CONFLICT ||
      c.type === CONFLICT_TYPES.DUPLICATE_MOVE ||
      c.type === CONFLICT_TYPES.MISSING_SAMPLE ||
      c.type === CONFLICT_TYPES.INVALID_POSITION
  );

  const appliedMoves = [];
  const skippedMoves = [];

  for (const move of movements) {
    const isDuplicate = tracker.duplicateMovements.some(
      (d) => d.sampleId === move.sampleId && d._lineNumber === move._lineNumber
    );

    const sample = tracker.samples.get(move.sampleId);

    if (isDuplicate) {
      skippedMoves.push({
        ...move,
        reason: 'duplicate-move',
      });
    } else if (!sample) {
      skippedMoves.push({
        ...move,
        reason: 'missing-sample',
      });
    } else {
      appliedMoves.push(move);
    }
  }

  if (!opts.json) {
    printMoveSummary({
      totalMoves: movements.length,
      appliedMoves: appliedMoves.length,
      skippedMoves: skippedMoves.length,
      duplicateCount: tracker.duplicateMovements.length,
      missingCount: skippedMoves.filter((m) => m.reason === 'missing-sample').length,
      isDryRun: opts.dryRun,
      batchId: opts.batchId,
    });

    if (skippedMoves.length > 0) {
      printSkippedMoves(skippedMoves);
    }

    if (moveConflicts.length > 0) {
      printMoveConflicts(moveConflicts);
    }
  }

  return {
    summary: {
      totalMoves: movements.length,
      appliedMoves: appliedMoves.length,
      skippedMoves: skippedMoves.length,
      duplicateCount: tracker.duplicateMovements.length,
      missingCount: skippedMoves.filter((m) => m.reason === 'missing-sample').length,
      isDryRun: !!opts.dryRun,
      batchId: opts.batchId || null,
    },
    appliedMoves,
    skippedMoves,
    conflicts: moveConflicts,
    tracker,
  };
}

function printMoveSummary(stats) {
  console.log('========================================');
  console.log('  移动处理报告');
  console.log('========================================');
  console.log();
  if (stats.batchId) {
    console.log(`批次号: ${stats.batchId}`);
  }
  if (stats.isDryRun) {
    console.log('模式: 预览模式 (dry-run)');
  }
  console.log();
  console.log(`移动记录总数: ${stats.totalMoves}`);
  console.log(`成功应用: ${stats.appliedMoves}`);
  console.log(`跳过数量: ${stats.skippedMoves}`);
  console.log(`  重复移动: ${stats.duplicateCount}`);
  console.log(`  样本缺失: ${stats.missingCount}`);
  console.log();
}

function printSkippedMoves(skippedMoves) {
  console.log('【跳过的移动记录】');
  console.log('-'.repeat(40));
  for (const move of skippedMoves) {
    const reasonText = {
      'duplicate-move': '重复移动',
      'missing-sample': '样本缺失',
    }[move.reason] || move.reason;

    console.log(`  行${move._lineNumber} - ${move.sampleId || '无编号'} - ${reasonText}`);
    if (move.batchId) {
      console.log(`      批次: ${move.batchId}`);
    }
  }
  console.log();
}

function printMoveConflicts(conflicts) {
  console.log('【移动相关冲突】');
  console.log('-'.repeat(40));
  for (const conflict of conflicts) {
    const typeText = {
      [CONFLICT_TYPES.POSITION_CONFLICT]: '位置冲突',
      [CONFLICT_TYPES.DUPLICATE_MOVE]: '重复移动',
      [CONFLICT_TYPES.MISSING_SAMPLE]: '样本缺失',
      [CONFLICT_TYPES.INVALID_POSITION]: '无效位置',
    }[conflict.type] || conflict.type;

    console.log(`  [${typeText}] 行${conflict.lineNumber} - ${conflict.message}`);
  }
  console.log();
}

module.exports = {
  runMove,
};
