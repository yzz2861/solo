const request = require('supertest');
const app = require('../../src/app');
const {
  createPassRecord,
  createPendingReviewRecord
} = require('../helpers/testData');

describe('人工复核 API', () => {
  describe('复核入口 - POST /api/v1/result/:resultId/review', () => {
    test('待复核记录可以成功提交复核', async () => {
      const data = createPendingReviewRecord();
      data.historyList = [
        { sampleDate: '2026-05-20', sccValue: 200000, result: 'PASS' }
      ];

      const detectResp = await request(app)
        .post('/api/v1/detect/single')
        .send(data);

      const resultId = detectResp.body.data.id;
      expect(detectResp.body.data.resultCode).toBe('PENDING_REVIEW');
      expect(detectResp.body.data.needReview).toBe(true);

      const reviewResp = await request(app)
        .post(`/api/v1/result/${resultId}/review`)
        .send({
          reviewer: '张审核员',
          comment: '请复核该记录'
        });

      expect(reviewResp.status).toBe(200);
      expect(reviewResp.body.success).toBe(true);
      expect(reviewResp.body.data.status).toBe('PENDING');
      expect(reviewResp.body.data.reviewer).toBe('张审核员');

      console.log('\n========================================');
      console.log('  复核入口测试');
      console.log('========================================');
      console.log('  检测结果ID:', resultId);
      console.log('  原结果:', detectResp.body.data.resultCode);
      console.log('  复核记录ID:', reviewResp.body.data.id);
      console.log('  复核人:', reviewResp.body.data.reviewer);
      console.log('  复核状态:', reviewResp.body.data.status);
      console.log('========================================\n');
    });

    test('非待复核记录不能提交复核', async () => {
      const detectResp = await request(app)
        .post('/api/v1/detect/single')
        .send(createPassRecord());

      const resultId = detectResp.body.data.id;
      expect(detectResp.body.data.resultCode).toBe('PASS');

      const reviewResp = await request(app)
        .post(`/api/v1/result/${resultId}/review`)
        .send({ reviewer: '张审核员' });

      expect(reviewResp.status).toBe(400);
      expect(reviewResp.body.code).toBe('BAD_REQUEST');
    });

    test('缺少复核人信息 → 返回 400', async () => {
      const data = createPendingReviewRecord();
      data.historyList = [
        { sampleDate: '2026-05-20', sccValue: 200000, result: 'PASS' }
      ];

      const detectResp = await request(app)
        .post('/api/v1/detect/single')
        .send(data);

      const reviewResp = await request(app)
        .post(`/api/v1/result/${detectResp.body.data.id}/review`)
        .send({ comment: '无复核人' });

      expect(reviewResp.status).toBe(400);
    });
  });

  describe('复核处理 - POST /api/v1/review/:reviewId/process', () => {
    test('复核通过 (APPROVE) → 结果变为 PASS', async () => {
      const data = createPendingReviewRecord();
      data.historyList = [
        { sampleDate: '2026-05-20', sccValue: 200000, result: 'PASS' }
      ];

      const detectResp = await request(app)
        .post('/api/v1/detect/single')
        .send(data);

      const resultId = detectResp.body.data.id;

      const reviewResp = await request(app)
        .post(`/api/v1/result/${resultId}/review`)
        .send({ reviewer: '李主管' });

      const reviewId = reviewResp.body.data.id;

      const processResp = await request(app)
        .post(`/api/v1/review/${reviewId}/process`)
        .send({
          decision: 'APPROVE',
          decisionReason: '经核实，体细胞数超标为采样误差，实际合格',
          reviewer: '王经理'
        });

      expect(processResp.status).toBe(200);
      expect(processResp.body.success).toBe(true);
      expect(processResp.body.data.review.status).toBe('APPROVED');
      expect(processResp.body.data.result.resultCode).toBe('PASS');
      expect(processResp.body.data.result.reviewStatus).toBe('APPROVED');
      expect(processResp.body.data.result.reason).toContain('复核通过');

      console.log('\n========================================');
      console.log('  复核通过测试');
      console.log('========================================');
      console.log('  复核ID:', reviewId);
      console.log('  决策: APPROVE (通过)');
      console.log('  最终结果:', processResp.body.data.result.resultCode);
      console.log('  原因:', processResp.body.data.result.reason);
      console.log('  复核人:', processResp.body.data.result.reviewer);
      console.log('========================================\n');
    });

    test('复核驳回 (REJECT) → 结果变为 BLOCK', async () => {
      const data = createPendingReviewRecord();
      data.historyList = [
        { sampleDate: '2026-05-20', sccValue: 200000, result: 'PASS' }
      ];

      const detectResp = await request(app)
        .post('/api/v1/detect/single')
        .send(data);

      const resultId = detectResp.body.data.id;

      const reviewResp = await request(app)
        .post(`/api/v1/result/${resultId}/review`)
        .send({ reviewer: '李主管' });

      const reviewId = reviewResp.body.data.id;

      const processResp = await request(app)
        .post(`/api/v1/review/${reviewId}/process`)
        .send({
          decision: 'REJECT',
          decisionReason: '体细胞数确实超标，且无合理解释，予以拦截',
          reviewer: '王经理'
        });

      expect(processResp.status).toBe(200);
      expect(processResp.body.success).toBe(true);
      expect(processResp.body.data.review.status).toBe('REJECTED');
      expect(processResp.body.data.result.resultCode).toBe('BLOCK');
      expect(processResp.body.data.result.reviewStatus).toBe('REJECTED');
      expect(processResp.body.data.result.reason).toContain('复核驳回');

      console.log('\n========================================');
      console.log('  复核驳回测试');
      console.log('========================================');
      console.log('  复核ID:', reviewId);
      console.log('  决策: REJECT (驳回)');
      console.log('  最终结果:', processResp.body.data.result.resultCode);
      console.log('  原因:', processResp.body.data.result.reason);
      console.log('========================================\n');
    });

    test('已处理的复核记录不能重复处理', async () => {
      const data = createPendingReviewRecord();
      data.historyList = [
        { sampleDate: '2026-05-20', sccValue: 200000, result: 'PASS' }
      ];

      const detectResp = await request(app)
        .post('/api/v1/detect/single')
        .send(data);

      const reviewResp = await request(app)
        .post(`/api/v1/result/${detectResp.body.data.id}/review`)
        .send({ reviewer: '李主管' });

      const reviewId = reviewResp.body.data.id;

      await request(app)
        .post(`/api/v1/review/${reviewId}/process`)
        .send({ decision: 'APPROVE', decisionReason: 'ok' });

      const secondProcess = await request(app)
        .post(`/api/v1/review/${reviewId}/process`)
        .send({ decision: 'REJECT', decisionReason: 'reject again' });

      expect(secondProcess.status).toBe(400);
      expect(secondProcess.body.code).toBe('BAD_REQUEST');
    });

    test('无效的决策值 → 返回 400', async () => {
      const data = createPendingReviewRecord();
      data.historyList = [
        { sampleDate: '2026-05-20', sccValue: 200000, result: 'PASS' }
      ];

      const detectResp = await request(app)
        .post('/api/v1/detect/single')
        .send(data);

      const reviewResp = await request(app)
        .post(`/api/v1/result/${detectResp.body.data.id}/review`)
        .send({ reviewer: '李主管' });

      const processResp = await request(app)
        .post(`/api/v1/review/${reviewResp.body.data.id}/process`)
        .send({ decision: 'INVALID_DECISION' });

      expect(processResp.status).toBe(400);
    });
  });

  describe('待复核列表 - GET /api/v1/reviews/pending', () => {
    test('可以分页查询待复核记录', async () => {
      for (let i = 0; i < 5; i++) {
        const data = createPendingReviewRecord();
        data.masterData.cowId = `COW-REVIEW-${i}`;
        data.masterData.batchNo = `BATCH-REVIEW-${i}`;
        data.historyList = [
          { sampleDate: '2026-05-20', sccValue: 200000, result: 'PASS' }
        ];

        const detectResp = await request(app)
          .post('/api/v1/detect/single')
          .send(data);

        await request(app)
          .post(`/api/v1/result/${detectResp.body.data.id}/review`)
          .send({ reviewer: '测试审核员' });
      }

      const listResp = await request(app)
        .get('/api/v1/reviews/pending?page=1&pageSize=3');

      expect(listResp.status).toBe(200);
      expect(listResp.body.data.total).toBe(5);
      expect(listResp.body.data.items.length).toBe(3);
      expect(listResp.body.data.page).toBe(1);
      expect(listResp.body.data.pageSize).toBe(3);

      console.log('\n========================================');
      console.log('  待复核列表测试');
      console.log('========================================');
      console.log('  总数:', listResp.body.data.total);
      console.log('  当前页:', listResp.body.data.page);
      console.log('  每页条数:', listResp.body.data.pageSize);
      console.log('  当前页记录数:', listResp.body.data.items.length);
      console.log('========================================\n');
    });
  });

  describe('复核记录查询 - GET /api/v1/review/:reviewId', () => {
    test('可以查询复核记录详情', async () => {
      const data = createPendingReviewRecord();
      data.historyList = [
        { sampleDate: '2026-05-20', sccValue: 200000, result: 'PASS' }
      ];

      const detectResp = await request(app)
        .post('/api/v1/detect/single')
        .send(data);

      const reviewResp = await request(app)
        .post(`/api/v1/result/${detectResp.body.data.id}/review`)
        .send({ reviewer: '李主管', comment: '请重点复核' });

      const reviewId = reviewResp.body.data.id;

      const queryResp = await request(app)
        .get(`/api/v1/review/${reviewId}`);

      expect(queryResp.status).toBe(200);
      expect(queryResp.body.data.id).toBe(reviewId);
      expect(queryResp.body.data.status).toBe('PENDING');
      expect(queryResp.body.data.comment).toBe('请重点复核');
    });
  });
});
