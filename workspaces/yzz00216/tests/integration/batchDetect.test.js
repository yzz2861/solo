const request = require('supertest');
const app = require('../../src/app');
const {
  createPassRecord,
  createBlockRecord,
  createPendingReviewRecord,
  createNoEvidenceRecord
} = require('../helpers/testData');

describe('批量检测 API - POST /api/v1/detect/batch', () => {
  test('批量部分失败：混合多种结果类型', async () => {
    const records = [
      createPassRecord(),
      createBlockRecord(),
      createPendingReviewRecord(),
      createNoEvidenceRecord()
    ];

    records[1].masterData.cowId = 'COW-002';
    records[2].masterData.cowId = 'COW-003';
    records[2].historyList = [
      { sampleDate: '2026-05-20', sccValue: 200000, result: 'PASS' }
    ];
    records[3].masterData.cowId = 'COW-004';

    const response = await request(app)
      .post('/api/v1/detect/batch')
      .send({ records });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.total).toBe(4);
    expect(response.body.data.results.length).toBe(4);

    const summary = response.body.data.summary;
    console.log('\n========================================');
    console.log('  批量检测结果汇总');
    console.log('========================================');
    console.log('  总数:', summary.pass + summary.block + summary.pendingReview + summary.duplicate + summary.invalid);
    console.log('  通过 (PASS):', summary.pass);
    console.log('  拦截 (BLOCK):', summary.block);
    console.log('  待复核 (PENDING_REVIEW):', summary.pendingReview);
    console.log('  重复 (DUPLICATE):', summary.duplicate);
    console.log('  无效 (INVALID):', summary.invalid);
    console.log('  坏行:', summary.badRows);
    console.log('========================================\n');

    expect(summary.pass).toBeGreaterThanOrEqual(1);
    expect(summary.block).toBeGreaterThanOrEqual(1);
    expect(summary.pendingReview).toBeGreaterThanOrEqual(1);
  });

  test('批量检测中包含重复提交 → 重复项被单独标记', async () => {
    const record1 = createPassRecord();
    const record2 = createPassRecord();
    record2.masterData.cowId = 'COW-002';
    const record3 = createPassRecord();
    record3.masterData = { ...record1.masterData };

    const records = [record1, record2, record3];

    const response = await request(app)
      .post('/api/v1/detect/batch')
      .send({ records });

    expect(response.status).toBe(200);
    const summary = response.body.data.summary;

    console.log('\n========================================');
    console.log('  批量重复提交测试');
    console.log('========================================');
    console.log('  总数:', response.body.data.total);
    console.log('  通过:', summary.pass);
    console.log('  重复:', summary.duplicate);
    console.log('========================================\n');

    expect(summary.duplicate).toBe(1);
    expect(summary.pass).toBe(2);

    const dupResult = response.body.data.results.find(r => r.resultCode === 'DUPLICATE');
    expect(dupResult).toBeDefined();
    expect(dupResult.ruleHits.some(r => r.type === 'DUPLICATE_SUBMISSION')).toBe(true);
  });

  test('坏行隔离：无效数据不影响其他记录处理', async () => {
    const validRecord = createPassRecord();
    const invalidRecord = { someInvalidField: 'test' };
    const anotherValid = createBlockRecord();
    anotherValid.masterData.cowId = 'COW-002';

    const records = [validRecord, invalidRecord, anotherValid];

    const response = await request(app)
      .post('/api/v1/detect/batch')
      .send({ records });

    expect(response.status).toBe(200);
    const summary = response.body.data.summary;
    const badRows = response.body.data.badRows;

    console.log('\n========================================');
    console.log('  坏行隔离测试');
    console.log('========================================');
    console.log('  总记录数:', response.body.data.total);
    console.log('  成功处理:', response.body.data.results.length);
    console.log('  坏行数:', badRows.length);
    if (badRows.length > 0) {
      console.log('  坏行详情:');
      badRows.forEach(br => {
        console.log('    - 行号:', br.rowIndex, ', 错误:', br.error);
      });
    }
    console.log('========================================\n');

    expect(badRows.length).toBeGreaterThan(0);
    expect(summary.badRows).toBe(badRows.length);
    expect(response.body.data.results.length).toBeGreaterThan(0);

    badRows.forEach(br => {
      expect(br).toHaveProperty('rowIndex');
      expect(br).toHaveProperty('rowData');
      expect(br).toHaveProperty('error');
    });
  });

  test('结果文件下载：JSON 格式', async () => {
    const records = [
      createPassRecord(),
      createBlockRecord()
    ];
    records[1].masterData.cowId = 'COW-002';

    const batchResp = await request(app)
      .post('/api/v1/detect/batch')
      .send({ records });

    const batchId = batchResp.body.data.batchId;

    const downloadResp = await request(app)
      .get(`/api/v1/batch/${batchId}/download?format=json`);

    expect(downloadResp.status).toBe(200);
    expect(downloadResp.headers['content-type']).toContain('application/json');
    expect(downloadResp.headers['content-disposition']).toContain('attachment');

    const content = JSON.parse(downloadResp.text);
    expect(content.batchId).toBe(batchId);
    expect(content.results.length).toBe(2);

    console.log('\n✅ 结果文件下载测试通过');
    console.log('   文件格式: JSON');
    console.log('   包含记录数:', content.results.length);
  });

  test('结果文件下载：CSV 格式', async () => {
    const records = [
      createPassRecord(),
      createBlockRecord()
    ];
    records[1].masterData.cowId = 'COW-002';

    const batchResp = await request(app)
      .post('/api/v1/detect/batch')
      .send({ records });

    const batchId = batchResp.body.data.batchId;

    const downloadResp = await request(app)
      .get(`/api/v1/batch/${batchId}/download?format=csv`);

    expect(downloadResp.status).toBe(200);
    expect(downloadResp.headers['content-type']).toContain('text/csv');

    const lines = downloadResp.text.trim().split('\n');
    expect(lines.length).toBe(3);

    console.log('\n✅ CSV 结果文件测试通过');
    console.log('   行数:', lines.length, '(含表头)');
  });

  test('坏行文件下载：单独的错误记录文件', async () => {
    const records = [
      createPassRecord(),
      { invalid: 'data' },
      createBlockRecord()
    ];
    records[2].masterData.cowId = 'COW-003';

    const batchResp = await request(app)
      .post('/api/v1/detect/batch')
      .send({ records });

    const batchId = batchResp.body.data.batchId;

    const badRowsResp = await request(app)
      .get(`/api/v1/batch/${batchId}/badrows/download?format=json`);

    expect(badRowsResp.status).toBe(200);

    const content = JSON.parse(badRowsResp.text);
    expect(Array.isArray(content)).toBe(true);
    expect(content.length).toBeGreaterThan(0);

    console.log('\n✅ 坏行文件下载测试通过');
    console.log('   坏行记录数:', content.length);
    if (content.length > 0) {
      console.log('   首行错误:', content[0].error);
    }
  });

  test('查询批次详情', async () => {
    const records = [createPassRecord(), createBlockRecord()];
    records[1].masterData.cowId = 'COW-002';

    const batchResp = await request(app)
      .post('/api/v1/detect/batch')
      .send({ records });

    const batchId = batchResp.body.data.batchId;

    const queryResp = await request(app)
      .get(`/api/v1/batch/${batchId}`);

    expect(queryResp.status).toBe(200);
    expect(queryResp.body.data.batchId).toBe(batchId);
    expect(queryResp.body.data.summary).toBeDefined();
  });

  test('空数组请求 → 返回 400', async () => {
    const response = await request(app)
      .post('/api/v1/detect/batch')
      .send({ records: [] });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_REQUEST');
  });
});
