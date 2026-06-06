const request = require('supertest');
const app = require('../../src/app');
const {
  createPassRecord,
  createBlockRecord,
  createPendingReviewRecord,
  createNoEvidenceRecord
} = require('../helpers/testData');

describe('单条检测 API - POST /api/v1/detect/single', () => {
  test('单条成功：体细胞正常 → 返回 PASS', async () => {
    const response = await request(app)
      .post('/api/v1/detect/single')
      .send(createPassRecord());

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.resultCode).toBe('PASS');
    expect(response.body.data.resultLabel).toBe('通过');
    expect(response.body.data.needReview).toBe(false);
    expect(response.body.data.reason).toBeDefined();
    expect(response.body.data.ruleHits).toEqual([]);
    expect(response.body.data.masterData).toBeDefined();
    expect(response.body.data.sccValue).toBe(200000);

    console.log('✅ 单条成功测试通过：');
    console.log('   结果:', response.body.data.resultCode, '-', response.body.data.resultLabel);
    console.log('   原因:', response.body.data.reason);
  });

  test('单条拦截：体细胞超标 + 历史多次超标 → 返回 BLOCK', async () => {
    const response = await request(app)
      .post('/api/v1/detect/single')
      .send(createBlockRecord());

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.resultCode).toBe('BLOCK');
    expect(response.body.data.resultLabel).toBe('拦截');
    expect(response.body.data.needReview).toBe(false);
    expect(response.body.data.ruleHits.length).toBeGreaterThan(0);

    const ruleTypes = response.body.data.ruleHits.map(r => r.type);
    expect(ruleTypes).toContain('SCC_EXCEED');
    expect(ruleTypes).toContain('HISTORY_REPEAT_EXCEED');

    console.log('✅ 单条拦截测试通过：');
    console.log('   结果:', response.body.data.resultCode, '-', response.body.data.resultLabel);
    console.log('   原因:', response.body.data.reason);
    console.log('   命中规则:', ruleTypes.join(', '));
  });

  test('单条待复核：体细胞超标但历史正常 → 返回 PENDING_REVIEW', async () => {
    const data = createPendingReviewRecord();
    data.historyList = [
      { sampleDate: '2026-05-20', sccValue: 200000, result: 'PASS' }
    ];

    const response = await request(app)
      .post('/api/v1/detect/single')
      .send(data);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.resultCode).toBe('PENDING_REVIEW');
    expect(response.body.data.resultLabel).toBe('待复核');
    expect(response.body.data.needReview).toBe(true);
    expect(response.body.data.reviewStatus).toBe('PENDING');

    console.log('✅ 单条待复核测试通过：');
    console.log('   结果:', response.body.data.resultCode, '-', response.body.data.resultLabel);
    console.log('   原因:', response.body.data.reason);
    console.log('   复核状态:', response.body.data.reviewStatus);
  });

  test('重复提交：同一业务键提交两次 → 第二次返回 DUPLICATE', async () => {
    const record = createPassRecord();

    const firstResponse = await request(app)
      .post('/api/v1/detect/single')
      .send(record);

    expect(firstResponse.body.data.resultCode).toBe('PASS');

    const secondResponse = await request(app)
      .post('/api/v1/detect/single')
      .send(record);

    expect(secondResponse.status).toBe(200);
    expect(secondResponse.body.success).toBe(true);
    expect(secondResponse.body.data.resultCode).toBe('DUPLICATE');
    expect(secondResponse.body.data.resultLabel).toBe('重复提交');
    expect(secondResponse.body.data.needReview).toBe(false);

    const dupHits = secondResponse.body.data.ruleHits.filter(r => r.type === 'DUPLICATE_SUBMISSION');
    expect(dupHits.length).toBeGreaterThan(0);

    console.log('✅ 重复提交测试通过：');
    console.log('   第一次结果:', firstResponse.body.data.resultCode);
    console.log('   第二次结果:', secondResponse.body.data.resultCode, '-', secondResponse.body.data.resultLabel);
    console.log('   原因:', secondResponse.body.data.reason);
  });

  test('参数校验：缺少 masterData → 返回 400', async () => {
    const response = await request(app)
      .post('/api/v1/detect/single')
      .send({ applicationData: { sccValue: 100000 } });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_REQUEST');
  });

  test('可以通过 ID 查询检测结果', async () => {
    const detectResp = await request(app)
      .post('/api/v1/detect/single')
      .send(createPassRecord());

    const resultId = detectResp.body.data.id;

    const queryResp = await request(app)
      .get(`/api/v1/result/${resultId}`);

    expect(queryResp.status).toBe(200);
    expect(queryResp.body.data.id).toBe(resultId);
    expect(queryResp.body.data.resultCode).toBe('PASS');
  });
});
