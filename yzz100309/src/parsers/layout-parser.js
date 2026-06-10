const fs = require('fs');
const path = require('path');

function parseLayoutJSON(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);

  const boxes = [];

  if (Array.isArray(data)) {
    for (const boxData of data) {
      boxes.push(normalizeBox(boxData));
    }
  } else if (data.boxes && Array.isArray(data.boxes)) {
    for (const boxData of data.boxes) {
      boxes.push(normalizeBox(boxData));
    }
  } else {
    boxes.push(normalizeBox(data));
  }

  return boxes;
}

function normalizeBox(boxData) {
  const boxId = boxData.boxId || boxData.id || boxData['冻存盒编号'] || '';
  const rows = boxData.rows || boxData['行数'] || 9;
  const cols = boxData.cols || boxData['列数'] || 9;
  const rowLabels = boxData.rowLabels || generateRowLabels(rows);
  const colLabels = boxData.colLabels || generateColLabels(cols);
  const name = boxData.name || boxData['名称'] || boxId;

  const positions = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const rowLabel = rowLabels[r] || String.fromCharCode(65 + r);
      const colLabel = colLabels[c] || (c + 1).toString();
      positions.push({
        position: `${rowLabel}${colLabel}`,
        row: r,
        col: c,
        occupied: false,
        sampleId: null,
      });
    }
  }

  return {
    boxId,
    name,
    rows,
    cols,
    rowLabels,
    colLabels,
    positions,
    _source: 'layout',
  };
}

function generateRowLabels(count) {
  const labels = [];
  for (let i = 0; i < count; i++) {
    labels.push(String.fromCharCode(65 + i));
  }
  return labels;
}

function generateColLabels(count) {
  const labels = [];
  for (let i = 1; i <= count; i++) {
    labels.push(i.toString());
  }
  return labels;
}

function validatePosition(box, position) {
  return box.positions.some((p) => p.position === position);
}

function getPosition(box, position) {
  return box.positions.find((p) => p.position === position);
}

module.exports = {
  parseLayoutJSON,
  validatePosition,
  getPosition,
};
