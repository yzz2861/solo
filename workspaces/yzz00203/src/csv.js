const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

function parseCsvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true
  });
  return records.map((record, index) => ({
    sourceRow: index + 2,
    data: record
  }));
}

function writeCsvFile(filePath, records, columns) {
  const output = stringify(records, {
    header: true,
    columns: columns,
    quoted: true,
    quoted_empty: true
  });
  fs.writeFileSync(filePath, output, 'utf-8');
}

function buildOutputColumns(rules) {
  const baseColumns = [
    'batch_id',
    'source_file',
    'source_row',
    'record_id',
    'status',
    'reason',
    'total_score'
  ];

  const scoreColumns = [];
  if (rules.scoreRules) {
    for (const rule of rules.scoreRules) {
      scoreColumns.push(`${rule.field}_score`);
      scoreColumns.push(`${rule.field}_raw`);
    }
  }

  const dataColumns = [];
  return { baseColumns, scoreColumns, dataColumns };
}

function flattenRecord(result, rules) {
  const flat = {
    batch_id: result.batchId,
    source_file: result.sourceFile,
    source_row: result.sourceRow,
    record_id: result.recordId,
    status: result.status,
    reason: result.reason,
    total_score: result.scoreResult.totalScore,
    raw_total_score: result.scoreResult.rawTotalScore
  };

  if (rules.scoreRules) {
    for (const detail of result.scoreResult.details) {
      flat[`${detail.field}_score`] = detail.score;
      flat[`${detail.field}_raw`] = detail.rawValue;
    }
  }

  for (const [key, value] of Object.entries(result.record)) {
    if (flat[key] === undefined) {
      flat[key] = value;
    }
  }

  return flat;
}

function getOutputColumns(results, rules) {
  if (results.length === 0) {
    return [];
  }

  const firstFlat = flattenRecord(results[0], rules);
  return Object.keys(firstFlat);
}

module.exports = {
  parseCsvFile,
  writeCsvFile,
  flattenRecord,
  getOutputColumns
};
