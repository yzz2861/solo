const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const db = require('./database');
const { runAllRules } = require('./ruleEngine');

function generateBatchId() {
  return 'batch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
}

function createBatchRecord(batchType, fileName, count) {
  const stmt = db.prepare(`
    INSERT INTO import_batches (batch_type, file_name, record_count)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(batchType, fileName, count);
  return result.lastInsertRowid;
}

function importMaterialsCSV(filePath, fileName) {
  return new Promise((resolve, reject) => {
    const materials = [];
    const batchId = generateBatchId();

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        materials.push(row);
      })
      .on('end', () => {
        try {
          let inserted = 0;
          let updated = 0;

          const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO materials (material_id, title, content, channel, submit_time)
            VALUES (?, ?, ?, ?, ?)
          `);

          const updateStmt = db.prepare(`
            UPDATE materials
            SET title = ?, content = ?, channel = ?, submit_time = ?
            WHERE material_id = ?
          `);

          const transaction = db.transaction((rows) => {
            for (const row of rows) {
              const materialId = row['素材编号'] || row['material_id'] || row['id'];
              const title = row['标题'] || row['title'] || '';
              const content = row['文案内容'] || row['content'] || '';
              const channel = row['投放渠道'] || row['channel'] || '';
              const submitTime = row['提交时间'] || row['submit_time'] || new Date().toISOString();

              if (!materialId) continue;

              const result = insertStmt.run(materialId, title, content, channel, submitTime);
              if (result.changes > 0) {
                inserted++;
              } else {
                updateStmt.run(title, content, channel, submitTime, materialId);
                updated++;
              }
            }
          });

          transaction(materials);

          let ruleHitCount = 0;
          for (const row of materials) {
            const materialId = row['素材编号'] || row['material_id'] || row['id'];
            if (materialId) {
              const hits = runAllRules(materialId, batchId);
              ruleHitCount += hits.length;
            }
          }

          createBatchRecord('material', fileName, materials.length);

          resolve({
            total: materials.length,
            inserted,
            updated,
            ruleHitCount,
            batchId,
          });
        } catch (err) {
          reject(err);
        }
      })
      .on('error', reject);
  });
}

function importChannelFeedbackJSON(filePath, fileName) {
  return new Promise((resolve, reject) => {
    try {
      const rawData = fs.readFileSync(filePath, 'utf-8');
      let data;
      try {
        data = JSON.parse(rawData);
      } catch (e) {
        return reject(new Error('JSON 格式解析失败'));
      }

      const feedbacks = Array.isArray(data) ? data : (data.feedbacks || data.data || []);
      if (feedbacks.length === 0 && !Array.isArray(data)) {
        feedbacks.push(data);
      }

      const batchId = generateBatchId();
      let inserted = 0;
      let updated = 0;

      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO channel_feedbacks (material_id, channel, status, reject_reason, feedback_time, import_batch)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const updateStmt = db.prepare(`
        UPDATE channel_feedbacks
        SET status = ?, reject_reason = ?, feedback_time = ?
        WHERE material_id = ? AND channel = ? AND import_batch = ?
      `);

      const materialUpsert = db.prepare(`
        INSERT OR IGNORE INTO materials (material_id, title, channel)
        VALUES (?, ?, ?)
      `);

      const transaction = db.transaction((items) => {
        for (const item of items) {
          const materialId = item.material_id || item['素材编号'] || item.id;
          const channel = item.channel || item['渠道'] || '';
          const status = item.status || item['状态'] || (item.reject_reason ? 'rejected' : 'approved');
          const rejectReason = item.reject_reason || item['驳回原因'] || '';
          const feedbackTime = item.feedback_time || item['反馈时间'] || new Date().toISOString();

          if (!materialId) continue;

          materialUpsert.run(materialId, item.title || '', channel);

          const result = insertStmt.run(materialId, channel, status, rejectReason, feedbackTime, batchId);
          if (result.changes > 0) {
            inserted++;
          } else {
            updateStmt.run(status, rejectReason, feedbackTime, materialId, channel, batchId);
            updated++;
          }
        }
      });

      transaction(feedbacks);

      let ruleHitCount = 0;
      for (const item of feedbacks) {
        const materialId = item.material_id || item['素材编号'] || item.id;
        if (materialId) {
          const hits = runAllRules(materialId, batchId);
          ruleHitCount += hits.length;
        }
      }

      createBatchRecord('channel_feedback', fileName, feedbacks.length);

      resolve({
        total: feedbacks.length,
        inserted,
        updated,
        ruleHitCount,
        batchId,
      });
    } catch (err) {
      reject(err);
    }
  });
}

function importReviewCSV(filePath, fileName) {
  return new Promise((resolve, reject) => {
    const reviews = [];
    const batchId = generateBatchId();

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        reviews.push(row);
      })
      .on('end', () => {
        try {
          let inserted = 0;
          let overridden = 0;

          const getLatestReview = db.prepare(`
            SELECT * FROM reviews
            WHERE material_id = ?
            ORDER BY review_time DESC
            LIMIT 1
          `);

          const insertReview = db.prepare(`
            INSERT INTO reviews (material_id, reviewer, review_status, review_opinion, previous_opinion, is_overridden)
            VALUES (?, ?, ?, ?, ?, ?)
          `);

          const materialUpsert = db.prepare(`
            INSERT OR IGNORE INTO materials (material_id, title)
            VALUES (?, ?)
          `);

          const transaction = db.transaction((rows) => {
            for (const row of rows) {
              const materialId = row['素材编号'] || row['material_id'] || row['id'];
              const reviewer = row['审核员'] || row['reviewer'] || '系统';
              const reviewStatus = row['复核状态'] || row['review_status'] || 'pending';
              const reviewOpinion = row['复核意见'] || row['review_opinion'] || '';

              if (!materialId) continue;

              materialUpsert.run(materialId, '');

              const latest = getLatestReview.get(materialId);
              let isOverridden = 0;
              let previousOpinion = '';

              if (latest && latest.review_opinion !== reviewOpinion) {
                isOverridden = 1;
                previousOpinion = latest.review_opinion || '';
                overridden++;
              }

              insertReview.run(
                materialId,
                reviewer,
                reviewStatus,
                reviewOpinion,
                previousOpinion,
                isOverridden
              );
              inserted++;
            }
          });

          transaction(reviews);

          let ruleHitCount = 0;
          for (const row of reviews) {
            const materialId = row['素材编号'] || row['material_id'] || row['id'];
            if (materialId) {
              const hits = runAllRules(materialId, batchId);
              ruleHitCount += hits.length;
            }
          }

          createBatchRecord('review', fileName, reviews.length);

          resolve({
            total: reviews.length,
            inserted,
            overridden,
            ruleHitCount,
            batchId,
          });
        } catch (err) {
          reject(err);
        }
      })
      .on('error', reject);
  });
}

function getImportBatches() {
  return db.prepare('SELECT * FROM import_batches ORDER BY import_time DESC').all();
}

module.exports = {
  importMaterialsCSV,
  importChannelFeedbackJSON,
  importReviewCSV,
  getImportBatches,
  generateBatchId,
};
