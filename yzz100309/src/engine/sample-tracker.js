const { getPosition } = require('../parsers/layout-parser');

const STATUS = {
  STORED: 'stored',
  MOVED: 'moved',
  REVIEWED: 'reviewed',
  DISCARDED: 'discarded',
};

function buildSampleTracker(inventory, boxes, movements) {
  const samples = new Map();
  const boxMap = new Map();
  const overwriteConflicts = [];

  for (const box of boxes) {
    boxMap.set(box.boxId, JSON.parse(JSON.stringify(box)));
  }

  for (const inv of inventory) {
    if (!inv.sampleId) continue;

    const sample = {
      sampleId: inv.sampleId,
      name: inv.name,
      currentBox: inv.boxId,
      currentPosition: inv.position,
      status: inv.status || STATUS.STORED,
      history: [
        {
          type: 'store',
          boxId: inv.boxId,
          position: inv.position,
          operator: inv.operator,
          date: inv.storeDate,
          source: 'inventory',
          lineNumber: inv._lineNumber,
        },
      ],
      inventoryLineNumber: inv._lineNumber,
      moveRecords: [],
      reviewer: null,
      reviewDate: null,
    };

    samples.set(inv.sampleId, sample);

    const box = boxMap.get(inv.boxId);
    if (box) {
      const pos = getPosition(box, inv.position);
      if (pos) {
        pos.occupied = true;
        pos.sampleId = inv.sampleId;
      }
    }
  }

  const appliedMovements = new Set();
  const duplicateMovements = [];

  for (const move of movements) {
    const moveKey = generateMoveKey(move);

    if (appliedMovements.has(moveKey)) {
      duplicateMovements.push({
        ...move,
        reason: 'duplicate-move',
      });
      continue;
    }

    appliedMovements.add(moveKey);

    const sample = samples.get(move.sampleId);

    if (!sample) {
      continue;
    }

    sample.moveRecords.push(move);

    if (move.action === 'discard' || move.action === '废弃') {
      const oldBox = boxMap.get(sample.currentBox);
      if (oldBox) {
        const oldPos = getPosition(oldBox, sample.currentPosition);
        if (oldPos) {
          oldPos.occupied = false;
          oldPos.sampleId = null;
        }
      }

      sample.history.push({
        type: 'discard',
        fromBox: sample.currentBox,
        fromPosition: sample.currentPosition,
        operator: move.moveOperator,
        date: move.moveDate,
        source: 'movements',
        lineNumber: move._lineNumber,
      });

      sample.status = STATUS.DISCARDED;
      sample.currentBox = null;
      sample.currentPosition = null;
      continue;
    }

    const oldBox = boxMap.get(sample.currentBox);
    if (oldBox && sample.currentPosition) {
      const oldPos = getPosition(oldBox, sample.currentPosition);
      if (oldPos && oldPos.sampleId === move.sampleId) {
        oldPos.occupied = false;
        oldPos.sampleId = null;
      }
    }

    const newBox = boxMap.get(move.toBox);
    if (newBox) {
      const newPos = getPosition(newBox, move.toPosition);
      if (newPos) {
        if (
          newPos.occupied &&
          newPos.sampleId &&
          newPos.sampleId !== move.sampleId
        ) {
          overwriteConflicts.push({
            incomingSampleId: move.sampleId,
            occupyingSampleId: newPos.sampleId,
            boxId: move.toBox,
            position: move.toPosition,
            moveLineNumber: move._lineNumber,
            moveDate: move.moveDate,
            moveOperator: move.moveOperator,
          });
        }
        newPos.occupied = true;
        newPos.sampleId = move.sampleId;
      }
    }

    sample.history.push({
      type: 'move',
      fromBox: sample.currentBox,
      fromPosition: sample.currentPosition,
      toBox: move.toBox,
      toPosition: move.toPosition,
      operator: move.moveOperator,
      date: move.moveDate,
      source: 'movements',
      lineNumber: move._lineNumber,
    });

    sample.currentBox = move.toBox;
    sample.currentPosition = move.toPosition;

    if (sample.status !== STATUS.DISCARDED) {
      sample.status = STATUS.MOVED;
    }

    if (move.reviewer) {
      sample.history.push({
        type: 'review',
        boxId: move.toBox,
        position: move.toPosition,
        reviewer: move.reviewer,
        moveOperator: move.moveOperator,
        date: move.reviewDate || move.moveDate,
        source: 'movements',
        lineNumber: move._lineNumber,
      });
      sample.reviewer = move.reviewer;
      sample.reviewDate = move.reviewDate || move.moveDate;
      if (sample.status !== STATUS.DISCARDED) {
        sample.status = STATUS.REVIEWED;
      }
    }
  }

  return {
    samples,
    boxes: boxMap,
    duplicateMovements,
    overwriteConflicts,
    STATUS,
  };
}

function generateMoveKey(move) {
  if (move.batchId && move.sampleId) {
    return `batch:${move.batchId}:${move.sampleId}`;
  }
  return `${move.sampleId}:${move.fromBox}:${move.fromPosition}:${move.toBox}:${move.toPosition}:${move.moveDate}:${move.moveOperator}`;
}

function getSampleById(tracker, sampleId) {
  return tracker.samples.get(sampleId) || null;
}

function getSamplesByStatus(tracker, status) {
  const results = [];
  for (const sample of tracker.samples.values()) {
    if (sample.status === status) {
      results.push(sample);
    }
  }
  return results;
}

function getSamplesByReviewer(tracker, reviewer) {
  const results = [];
  for (const sample of tracker.samples.values()) {
    if (sample.reviewer === reviewer) {
      results.push(sample);
    }
  }
  return results;
}

function getSamplesByPosition(tracker, boxId, position) {
  const results = [];
  for (const sample of tracker.samples.values()) {
    if (sample.currentBox === boxId && sample.currentPosition === position) {
      results.push(sample);
    }
  }
  return results;
}

function getAllSamples(tracker) {
  return Array.from(tracker.samples.values());
}

module.exports = {
  STATUS,
  buildSampleTracker,
  getSampleById,
  getSamplesByStatus,
  getSamplesByReviewer,
  getSamplesByPosition,
  getAllSamples,
};
