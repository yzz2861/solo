const fs = require('fs');
const path = require('path');
const { Parser } = require('@json2csv/plainjs');
const { loadAllData } = require('../utils/data-loader');
const { CONFLICT_TYPES } = require('../audit/conflict-detector');
const { STATUS, getAllSamples } = require('../engine/sample-tracker');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function runExport(opts) {
  const data = await loadAllData(opts);
  const { tracker, conflicts, inventory, movements, boxes } = data;

  let records = [];
  let reportType = opts.type || 'full';

  switch (reportType) {
    case 'conflicts':
      records = buildConflictRecords(conflicts, opts);
      break;
    case 'movements':
      records = buildMovementRecords(movements, conflicts, opts);
      break;
    case 'samples':
      records = buildSampleRecords(tracker, conflicts, opts);
      break;
    case 'full':
    default:
      records = buildFullReport(tracker, conflicts, inventory, movements, opts);
      break;
  }

  const outputPath = path.resolve(opts.output);
  const outputDir = path.dirname(outputPath);
  ensureDir(outputDir);

  const ext = path.extname(outputPath).toLowerCase();

  if (ext === '.json') {
    writeJSONReport(outputPath, {
      reportType,
      generatedAt: new Date().toISOString(),
      summary: generateSummary(tracker, conflicts, inventory, movements, boxes),
      records,
    });
  } else {
    writeCSVReport(outputPath, records);
  }

  return {
    outputPath,
    recordCount: records.length,
    reportType,
  };
}

function buildFullReport(tracker, conflicts, inventory, movements, opts) {
  const records = [];
  const conflictMap = buildConflictMap(conflicts);

  for (const sample of tracker.samples.values()) {
    const sampleConflicts = conflictMap.get(sample.sampleId) || [];
    const conflictDescriptions = sampleConflicts.map((c) => c.message).join('; ');
    const conflictTypes = sampleConflicts.map((c) => c.type).join(',');
    const lineNumbers = collectSampleLineNumbers(sample);

    records.push({
      recordType: 'sample',
      sampleId: sample.sampleId,
      sampleName: sample.name,
      currentStatus: sample.status,
      currentBox: sample.currentBox || '',
      currentPosition: sample.currentPosition || '',
      reviewer: sample.reviewer || '',
      reviewDate: sample.reviewDate || '',
      historyCount: sample.history.length,
      moveCount: sample.moveRecords.length,
      hasConflict: sampleConflicts.length > 0 ? '是' : '否',
      conflictCount: sampleConflicts.length,
      conflictTypes: conflictTypes,
      conflictDescription: conflictDescriptions,
      inventoryLineNumber: sample.inventoryLineNumber || '',
      lineNumbers: lineNumbers,
    });
  }

  for (const conflict of conflicts) {
    if (!conflict.sampleId) {
      records.push({
        recordType: 'conflict',
        conflictType: conflict.type,
        severity: conflict.severity,
        message: conflict.message,
        source: conflict.source,
        lineNumber: conflict.lineNumber,
        sampleId: '',
        position: conflict.position || '',
        boxId: conflict.boxId || '',
      });
    }
  }

  return records;
}

function buildConflictRecords(conflicts, opts) {
  return conflicts.map((c) => ({
    type: c.type,
    severity: c.severity,
    sampleId: c.sampleId || '',
    boxId: c.boxId || '',
    position: c.position || '',
    message: c.message,
    source: c.source,
    lineNumber: c.lineNumber,
    conflictingSamples: (c.conflictingSamples || []).join(', '),
    moveOperator: c.moveOperator || '',
    reviewer: c.reviewer || '',
    batchId: c.batchId || '',
  }));
}

function buildMovementRecords(movements, conflicts, opts) {
  const conflictMap = buildConflictMap(conflicts);

  return movements.map((m) => {
    const moveConflicts = conflictMap.get(m.sampleId) || [];
    const relatedConflicts = moveConflicts.filter(
      (c) => c.source === 'movements' && c.lineNumber === m._lineNumber
    );

    return {
      sampleId: m.sampleId,
      fromBox: m.fromBox,
      fromPosition: m.fromPosition,
      toBox: m.toBox,
      toPosition: m.toPosition,
      moveOperator: m.moveOperator,
      moveDate: m.moveDate,
      reviewer: m.reviewer,
      reviewDate: m.reviewDate,
      batchId: m.batchId,
      action: m.action,
      notes: m.notes,
      lineNumber: m._lineNumber,
      hasConflict: relatedConflicts.length > 0 ? '是' : '否',
      conflictDescription: relatedConflicts.map((c) => c.message).join('; '),
      conflictTypes: relatedConflicts.map((c) => c.type).join(','),
    };
  });
}

function buildSampleRecords(tracker, conflicts, opts) {
  const conflictMap = buildConflictMap(conflicts);
  const statusNames = {
    [STATUS.STORED]: '已入库',
    [STATUS.MOVED]: '已移动',
    [STATUS.REVIEWED]: '已复核',
    [STATUS.DISCARDED]: '已废弃',
  };

  return getAllSamples(tracker).map((s) => {
    const sampleConflicts = conflictMap.get(s.sampleId) || [];
    return {
      sampleId: s.sampleId,
      sampleName: s.name,
      status: statusNames[s.status] || s.status,
      statusCode: s.status,
      currentBox: s.currentBox || '',
      currentPosition: s.currentPosition || '',
      reviewer: s.reviewer || '',
      reviewDate: s.reviewDate || '',
      historyCount: s.history.length,
      moveCount: s.moveRecords.length,
      inventoryLineNumber: s.inventoryLineNumber || '',
      hasConflict: sampleConflicts.length > 0 ? '是' : '否',
      conflictCount: sampleConflicts.length,
      conflictTypes: sampleConflicts.map((c) => c.type).join(','),
      conflictDescription: sampleConflicts.map((c) => c.message).join('; '),
    };
  });
}

function buildConflictMap(conflicts) {
  const map = new Map();
  for (const conflict of conflicts) {
    if (!conflict.sampleId) continue;
    if (!map.has(conflict.sampleId)) {
      map.set(conflict.sampleId, []);
    }
    map.get(conflict.sampleId).push(conflict);
  }
  return map;
}

function collectSampleLineNumbers(sample) {
  const lineNumbers = new Set();
  if (sample.inventoryLineNumber) {
    lineNumbers.add(`台账:${sample.inventoryLineNumber}`);
  }
  for (const move of sample.moveRecords) {
    lineNumbers.add(`移动:${move._lineNumber}`);
  }
  return Array.from(lineNumbers).join(', ');
}

function generateSummary(tracker, conflicts, inventory, movements, boxes) {
  const statusCounts = {};
  for (const status of Object.values(STATUS)) {
    statusCounts[status] = 0;
  }
  for (const sample of tracker.samples.values()) {
    statusCounts[sample.status] = (statusCounts[sample.status] || 0) + 1;
  }

  const conflictTypeCounts = {};
  for (const type of Object.values(CONFLICT_TYPES)) {
    conflictTypeCounts[type] = 0;
  }
  for (const conflict of conflicts) {
    conflictTypeCounts[conflict.type] = (conflictTypeCounts[conflict.type] || 0) + 1;
  }

  return {
    inventoryCount: inventory.length,
    movementCount: movements.length,
    boxCount: boxes.length,
    sampleCount: tracker.samples.size,
    statusCounts,
    conflictCount: conflicts.length,
    conflictTypeCounts,
    duplicateMoveCount: tracker.duplicateMovements.length,
  };
}

function writeCSVReport(outputPath, records) {
  if (records.length === 0) {
    fs.writeFileSync(outputPath, '');
    return;
  }

  const parser = new Parser();
  const csv = parser.parse(records);
  fs.writeFileSync(outputPath, csv, 'utf-8');
}

function writeJSONReport(outputPath, data) {
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = {
  runExport,
};
