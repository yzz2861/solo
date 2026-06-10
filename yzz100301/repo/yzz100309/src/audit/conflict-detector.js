const { getPosition } = require('../parsers/layout-parser');
const { STATUS } = require('../engine/sample-tracker');

const CONFLICT_TYPES = {
  POSITION_CONFLICT: 'position-conflict',
  MISSING_SAMPLE: 'missing-sample',
  REVIEWER_MISMATCH: 'reviewer-mismatch',
  DUPLICATE_MOVE: 'duplicate-move',
  INVALID_POSITION: 'invalid-position',
  EMPTY_SAMPLE_ID: 'empty-sample-id',
};

function detectAllConflicts(tracker, inventory, movements) {
  const conflicts = [];

  conflicts.push(...detectPositionConflicts(tracker));
  conflicts.push(...detectMissingSamples(tracker, movements));
  conflicts.push(...detectReviewerMismatch(tracker, movements));
  conflicts.push(...detectDuplicateMoves(tracker));
  conflicts.push(...detectInvalidPositions(tracker, inventory, movements));
  conflicts.push(...detectEmptySampleIds(inventory, movements));

  return conflicts.sort((a, b) => a.lineNumber - b.lineNumber);
}

function detectPositionConflicts(tracker) {
  const conflicts = [];

  for (const box of tracker.boxes.values()) {
    const positionMap = new Map();

    for (const sample of tracker.samples.values()) {
      if (sample.status === STATUS.DISCARDED) continue;
      if (sample.currentBox !== box.boxId) continue;
      if (!sample.currentPosition) continue;

      const pos = sample.currentPosition;
      if (!positionMap.has(pos)) {
        positionMap.set(pos, []);
      }
      positionMap.get(pos).push(sample);
    }

    for (const [position, samples] of positionMap.entries()) {
      if (samples.length > 1) {
        for (const sample of samples) {
          conflicts.push({
            type: CONFLICT_TYPES.POSITION_CONFLICT,
            severity: 'high',
            sampleId: sample.sampleId,
            boxId: box.boxId,
            position: position,
            message: `位置冲突：${box.boxId} ${position} 存在 ${samples.length} 个样本：${samples.map((s) => s.sampleId).join(', ')}`,
            lineNumber: sample.inventoryLineNumber,
            source: 'inventory',
            conflictingSamples: samples.map((s) => s.sampleId),
          });
        }

        for (const sample of samples) {
          for (const move of sample.moveRecords) {
            if (move.toPosition === position && move.toBox === box.boxId) {
              const alreadyHasMove = conflicts.some(
                (c) =>
                  c.type === CONFLICT_TYPES.POSITION_CONFLICT &&
                  c.sampleId === sample.sampleId &&
                  c.source === 'movements' &&
                  c.moveLineNumber === move._lineNumber
              );
              if (!alreadyHasMove) {
                conflicts.push({
                  type: CONFLICT_TYPES.POSITION_CONFLICT,
                  severity: 'high',
                  sampleId: sample.sampleId,
                  boxId: box.boxId,
                  position: position,
                  message: `位置冲突：移动记录导致 ${box.boxId} ${position} 存在多个样本`,
                  lineNumber: move._lineNumber,
                  moveLineNumber: move._lineNumber,
                  source: 'movements',
                  conflictingSamples: samples.map((s) => s.sampleId),
                });
              }
            }
          }
        }
      }
    }
  }

  return conflicts;
}

function detectMissingSamples(tracker, movements) {
  const conflicts = [];
  const seenMissing = new Set();

  for (const move of movements) {
    if (!move.sampleId) continue;
    if (seenMissing.has(move.sampleId)) continue;

    const sample = tracker.samples.get(move.sampleId);
    if (!sample) {
      seenMissing.add(move.sampleId);
      conflicts.push({
        type: CONFLICT_TYPES.MISSING_SAMPLE,
        severity: 'medium',
        sampleId: move.sampleId,
        message: `样本缺失：台账中找不到样本编号 ${move.sampleId}，但移动记录中存在`,
        lineNumber: move._lineNumber,
        source: 'movements',
      });
    }
  }

  return conflicts;
}

function detectReviewerMismatch(tracker, movements) {
  const conflicts = [];

  for (const sample of tracker.samples.values()) {
    const moveRecords = sample.moveRecords.filter((m) => m.action !== 'discard' && m.action !== '废弃');

    for (let i = 0; i < moveRecords.length; i++) {
      const move = moveRecords[i];
      if (!move.reviewer) continue;

      if (move.moveOperator && move.reviewer && move.moveOperator === move.reviewer) {
        conflicts.push({
          type: CONFLICT_TYPES.REVIEWER_MISMATCH,
          severity: 'medium',
          sampleId: sample.sampleId,
          message: `复核人不一致：移动人(${move.moveOperator})与复核人(${move.reviewer})为同一人`,
          lineNumber: move._lineNumber,
          source: 'movements',
          moveOperator: move.moveOperator,
          reviewer: move.reviewer,
        });
      }

      if (i > 0) {
        const prevMove = moveRecords[i - 1];
        if (prevMove.reviewer && move.reviewer && prevMove.reviewer !== move.reviewer) {
          // This is not necessarily an error, just different reviewers
        }
      }
    }
  }

  return conflicts;
}

function detectDuplicateMoves(tracker) {
  const conflicts = [];

  for (const dup of tracker.duplicateMovements) {
    conflicts.push({
      type: CONFLICT_TYPES.DUPLICATE_MOVE,
      severity: 'low',
      sampleId: dup.sampleId,
      message: `重复移动：样本 ${dup.sampleId} 的移动记录重复，已跳过`,
      lineNumber: dup._lineNumber,
      source: 'movements',
      batchId: dup.batchId,
    });
  }

  return conflicts;
}

function detectInvalidPositions(tracker, inventory, movements) {
  const conflicts = [];

  for (const inv of inventory) {
    if (!inv.sampleId || !inv.boxId || !inv.position) continue;

    const box = tracker.boxes.get(inv.boxId);
    if (!box) continue;

    const pos = getPosition(box, inv.position);
    if (!pos) {
      conflicts.push({
        type: CONFLICT_TYPES.INVALID_POSITION,
        severity: 'high',
        sampleId: inv.sampleId,
        boxId: inv.boxId,
        position: inv.position,
        message: `无效位置：${inv.boxId} 中不存在位置 ${inv.position}`,
        lineNumber: inv._lineNumber,
        source: 'inventory',
      });
    }
  }

  for (const move of movements) {
    if (!move.sampleId) continue;

    if (move.toBox && move.toPosition) {
      const box = tracker.boxes.get(move.toBox);
      if (box) {
        const pos = getPosition(box, move.toPosition);
        if (!pos) {
          conflicts.push({
            type: CONFLICT_TYPES.INVALID_POSITION,
            severity: 'high',
            sampleId: move.sampleId,
            boxId: move.toBox,
            position: move.toPosition,
            message: `无效位置：移动目标 ${move.toBox} 中不存在位置 ${move.toPosition}`,
            lineNumber: move._lineNumber,
            source: 'movements',
          });
        }
      }
    }

    if (move.fromBox && move.fromPosition) {
      const box = tracker.boxes.get(move.fromBox);
      if (box) {
        const pos = getPosition(box, move.fromPosition);
        if (!pos) {
          conflicts.push({
            type: CONFLICT_TYPES.INVALID_POSITION,
            severity: 'medium',
            sampleId: move.sampleId,
            boxId: move.fromBox,
            position: move.fromPosition,
            message: `无效位置：移动来源 ${move.fromBox} 中不存在位置 ${move.fromPosition}`,
            lineNumber: move._lineNumber,
            source: 'movements',
          });
        }
      }
    }
  }

  return conflicts;
}

function detectEmptySampleIds(inventory, movements) {
  const conflicts = [];

  for (const inv of inventory) {
    if (!inv.sampleId || inv.sampleId.trim() === '') {
      conflicts.push({
        type: CONFLICT_TYPES.EMPTY_SAMPLE_ID,
        severity: 'medium',
        message: '样本编号缺失：台账中存在空的样本编号',
        lineNumber: inv._lineNumber,
        source: 'inventory',
      });
    }
  }

  for (const move of movements) {
    if (!move.sampleId || move.sampleId.trim() === '') {
      conflicts.push({
        type: CONFLICT_TYPES.EMPTY_SAMPLE_ID,
        severity: 'medium',
        message: '样本编号缺失：移动记录中存在空的样本编号',
        lineNumber: move._lineNumber,
        source: 'movements',
      });
    }
  }

  return conflicts;
}

function getConflictsByType(conflicts, type) {
  if (type === 'all') return conflicts;
  return conflicts.filter((c) => c.type === type);
}

function groupConflictsByType(conflicts) {
  const groups = {};
  for (const type of Object.values(CONFLICT_TYPES)) {
    groups[type] = [];
  }
  for (const conflict of conflicts) {
    if (!groups[conflict.type]) {
      groups[conflict.type] = [];
    }
    groups[conflict.type].push(conflict);
  }
  return groups;
}

module.exports = {
  CONFLICT_TYPES,
  detectAllConflicts,
  detectPositionConflicts,
  detectMissingSamples,
  detectReviewerMismatch,
  detectDuplicateMoves,
  detectInvalidPositions,
  detectEmptySampleIds,
  getConflictsByType,
  groupConflictsByType,
};
