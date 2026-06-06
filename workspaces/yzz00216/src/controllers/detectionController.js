const detectionService = require('../services/detectionService');

async function detectSingle(req, res) {
  try {
    const { body } = req;

    if (!body.masterData) {
      return res.status(400).json({
        error: '缺少主数据 masterData',
        code: 'INVALID_REQUEST'
      });
    }
    if (!body.applicationData) {
      return res.status(400).json({
        error: '缺少申请数据 applicationData',
        code: 'INVALID_REQUEST'
      });
    }

    const result = detectionService.detectSingle(body);

    console.log('\n========== 单条检测结果 ==========');
    console.log(`业务键: ${result.businessKey}`);
    console.log(`结果: ${result.resultCode} (${result.getResultLabel ? result.getResultLabel() : ''})`);
    console.log(`原因: ${result.reason}`);
    console.log(`命中规则: ${result.ruleHits.map(r => r.label).join(', ') || '无'}`);
    console.log(`是否需复核: ${result.needReview ? '是' : '否'}`);
    console.log('==================================\n');

    res.json({
      success: true,
      data: result.toJSON ? result.toJSON() : result
    });
  } catch (error) {
    console.error('[单条检测] 错误:', error);
    res.status(500).json({
      error: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
}

async function detectBatch(req, res) {
  try {
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        error: '批量检测需要提供 records 数组',
        code: 'INVALID_REQUEST'
      });
    }

    const batchResult = detectionService.detectBatch(records);

    console.log('\n========== 批量检测结果 ==========');
    console.log(`批次ID: ${batchResult.batchId}`);
    console.log(`总数: ${batchResult.total}`);
    console.log(`通过: ${batchResult.passCount}`);
    console.log(`拦截: ${batchResult.blockCount}`);
    console.log(`待复核: ${batchResult.pendingReviewCount}`);
    console.log(`重复: ${batchResult.duplicateCount}`);
    console.log(`坏行: ${batchResult.badRows.length}`);
    console.log('==================================\n');

    res.json({
      success: true,
      data: batchResult.toJSON()
    });
  } catch (error) {
    console.error('[批量检测] 错误:', error);
    res.status(500).json({
      error: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
}

async function getResult(req, res) {
  try {
    const { id } = req.params;
    const result = detectionService.getResult(id);

    if (!result) {
      return res.status(404).json({
        error: '检测结果不存在',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: result.toJSON ? result.toJSON() : result
    });
  } catch (error) {
    console.error('[查询结果] 错误:', error);
    res.status(500).json({
      error: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
}

async function getBatch(req, res) {
  try {
    const { batchId } = req.params;
    const batch = detectionService.getBatch(batchId);

    if (!batch) {
      return res.status(404).json({
        error: '批次不存在',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: batch.toJSON ? batch.toJSON() : batch
    });
  } catch (error) {
    console.error('[查询批次] 错误:', error);
    res.status(500).json({
      error: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
}

async function downloadResult(req, res) {
  try {
    const { batchId } = req.params;
    const format = req.query.format || 'json';

    const content = detectionService.generateResultFile(batchId, format);

    const fileName = `batch_${batchId}_result.${format}`;
    const contentType = format === 'csv' ? 'text/csv' : 'application/json';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(content);
  } catch (error) {
    console.error('[下载结果] 错误:', error);
    res.status(500).json({
      error: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
}

async function downloadBadRows(req, res) {
  try {
    const { batchId } = req.params;
    const format = req.query.format || 'json';

    const content = detectionService.generateBadRowsFile(batchId, format);

    const fileName = `batch_${batchId}_badrows.${format}`;
    const contentType = format === 'csv' ? 'text/csv' : 'application/json';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(content);
  } catch (error) {
    console.error('[下载坏行] 错误:', error);
    res.status(500).json({
      error: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
}

module.exports = {
  detectSingle,
  detectBatch,
  getResult,
  getBatch,
  downloadResult,
  downloadBadRows
};
