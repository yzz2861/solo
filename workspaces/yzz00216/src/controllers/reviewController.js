const detectionService = require('../services/detectionService');

async function submitForReview(req, res) {
  try {
    const { resultId } = req.params;
    const { reviewer, comment } = req.body;

    if (!reviewer) {
      return res.status(400).json({
        error: '缺少复核人信息 reviewer',
        code: 'INVALID_REQUEST'
      });
    }

    const reviewRecord = detectionService.submitForReview(resultId, reviewer, comment || '');

    console.log('\n========== 提交复核 ==========');
    console.log(`复核记录ID: ${reviewRecord.id}`);
    console.log(`检测结果ID: ${reviewRecord.resultId}`);
    console.log(`复核人: ${reviewRecord.reviewer}`);
    console.log(`状态: ${reviewRecord.status}`);
    console.log('================================\n');

    res.json({
      success: true,
      data: reviewRecord
    });
  } catch (error) {
    console.error('[提交复核] 错误:', error);
    if (error.message.includes('不存在')) {
      return res.status(404).json({
        error: error.message,
        code: 'NOT_FOUND'
      });
    }
    res.status(400).json({
      error: error.message,
      code: 'BAD_REQUEST'
    });
  }
}

async function processReview(req, res) {
  try {
    const { reviewId } = req.params;
    const { decision, decisionReason, reviewer } = req.body;

    if (!decision || !['APPROVE', 'REJECT'].includes(decision)) {
      return res.status(400).json({
        error: '无效的决策，必须为 APPROVE 或 REJECT',
        code: 'INVALID_REQUEST'
      });
    }

    const { review, result } = detectionService.processReview(
      reviewId,
      decision,
      decisionReason || '',
      reviewer
    );

    console.log('\n========== 复核处理结果 ==========');
    console.log(`复核ID: ${reviewId}`);
    console.log(`决策: ${decision === 'APPROVE' ? '通过' : '驳回'}`);
    console.log(`最终结果: ${result.resultCode}`);
    console.log(`原因: ${result.reason}`);
    console.log('==================================\n');

    res.json({
      success: true,
      data: {
        review,
        result: result.toJSON ? result.toJSON() : result
      }
    });
  } catch (error) {
    console.error('[处理复核] 错误:', error);
    if (error.message.includes('不存在')) {
      return res.status(404).json({
        error: error.message,
        code: 'NOT_FOUND'
      });
    }
    res.status(400).json({
      error: error.message,
      code: 'BAD_REQUEST'
    });
  }
}

async function getReview(req, res) {
  try {
    const { reviewId } = req.params;
    const review = detectionService.getReview(reviewId);

    if (!review) {
      return res.status(404).json({
        error: '复核记录不存在',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error('[查询复核] 错误:', error);
    res.status(500).json({
      error: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
}

async function listPendingReviews(req, res) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 20;

    const result = detectionService.listPendingReviews(page, pageSize);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[待复核列表] 错误:', error);
    res.status(500).json({
      error: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
}

module.exports = {
  submitForReview,
  processReview,
  getReview,
  listPendingReviews
};
