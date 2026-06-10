const fs = require('fs');
const csv = require('csv-parser');

function parseCSVWithLineNumbers(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    let lineNumber = 1;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', () => {
        lineNumber = 2;
      })
      .on('data', (data) => {
        results.push({
          ...data,
          _lineNumber: lineNumber,
        });
        lineNumber++;
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

function parseInventoryCSV(filePath) {
  return parseCSVWithLineNumbers(filePath).then((rows) => {
    return rows.map((row) => ({
      sampleId: row.sampleId || row['样本编号'] || row.sample_id || '',
      name: row.name || row['样本名称'] || row.name || '',
      boxId: row.boxId || row['冻存盒编号'] || row.box_id || '',
      position: row.position || row['位置'] || row.pos || '',
      operator: row.operator || row['入库人'] || row.operator || '',
      storeDate: row.storeDate || row['入库日期'] || row.store_date || '',
      status: row.status || row['状态'] || 'stored',
      _lineNumber: row._lineNumber,
      _source: 'inventory',
    }));
  });
}

function parseMovementsCSV(filePath) {
  return parseCSVWithLineNumbers(filePath).then((rows) => {
    return rows.map((row) => ({
      sampleId: row.sampleId || row['样本编号'] || row.sample_id || '',
      fromBox: row.fromBox || row['原冻存盒'] || row.from_box || '',
      fromPosition: row.fromPosition || row['原位置'] || row.from_pos || '',
      toBox: row.toBox || row['目标冻存盒'] || row.to_box || '',
      toPosition: row.toPosition || row['目标位置'] || row.to_pos || '',
      moveOperator: row.moveOperator || row['移动人'] || row.move_operator || '',
      moveDate: row.moveDate || row['移动日期'] || row.move_date || '',
      reviewer: row.reviewer || row['复核人'] || row.reviewer_name || '',
      reviewDate: row.reviewDate || row['复核日期'] || row.review_date || '',
      batchId: row.batchId || row['批次号'] || row.batch_id || '',
      action: row.action || row['操作类型'] || 'move',
      notes: row.notes || row['备注'] || '',
      _lineNumber: row._lineNumber,
      _source: 'movements',
    }));
  });
}

module.exports = {
  parseCSVWithLineNumbers,
  parseInventoryCSV,
  parseMovementsCSV,
};
