const http = require('http');

const HOST = 'localhost';
const PORT = 3000;

function request(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: '/api' + path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      const bodyStr = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          // not JSON, keep as string
        }
        resolve({ status: res.statusCode, data: parsed, raw: data });
      });
    });

    req.on('error', (e) => {
      reject(new Error(`请求失败: ${e.message}`));
    });

    req.setTimeout(5000, () => {
      req.destroy(new Error('请求超时'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 开始 API 功能测试...\n');
  let passed = 0;
  let failed = 0;

  function test(name, condition, detail = '') {
    if (condition) {
      console.log(`  ✅ ${name}`);
      passed++;
    } else {
      console.log(`  ❌ ${name} ${detail ? '- ' + detail : ''}`);
      failed++;
    }
  }

  try {
    console.log('1️⃣  健康检查');
    try {
      const health = await request('/health');
      test('服务正常响应', health.status === 200 && health.data && health.data.status === 'ok',
        `状态码: ${health.status}`);
    } catch (e) {
      test('服务正常响应', false, e.message);
      console.log('\n❌ 无法连接服务，请确认服务已启动: npm start');
      process.exit(1);
    }
    console.log();

    console.log('2️⃣  申报导入（去重测试）');
    const declBody = {
      batch_id: 'TEST-BATCH-API-001',
      records: [
        { package_no: 'API001', sender_name: '测试发件1', receiver_name: '测试收件1', category: '服饰', item_name: 'T恤', declared_value: 100, receiver_id_no: '110101199001011234' },
        { package_no: 'API002', sender_name: '测试发件2', receiver_name: '测试收件2', category: '电子产品', item_name: '手机壳', declared_value: 50 }
      ]
    };
    const imp1 = await request('/declaration/import', 'POST', declBody);
    test('首次导入成功', imp1.status === 200 && imp1.data && imp1.data.created === 2,
      `创建: ${imp1.data?.created}, 状态: ${imp1.status}`);

    const imp2 = await request('/declaration/import', 'POST', declBody);
    test('重复导入全部跳过', imp2.status === 200 && imp2.data && imp2.data.skipped === 2,
      `跳过: ${imp2.data?.skipped}`);
    console.log();

    console.log('3️⃣  资料补录导入');
    const suppBody = {
      batch_id: 'TEST-SUPP-API-001',
      records: [
        { package_no: 'API001', id_proof_url: '/id/api001.jpg', id_proof_type: '身份证', id_verified: true, item_category: '服饰' },
        { package_no: 'API002', id_proof_url: '', id_verified: false, item_category: '数码配件' }
      ]
    };
    const supp = await request('/supplementary/import', 'POST', suppBody);
    test('补录导入成功', supp.status === 200 && supp.data && supp.data.created === 2,
      `创建: ${supp.data?.created}`);
    console.log();

    console.log('4️⃣  海关查验导入');
    const inspBody = {
      batch_id: 'TEST-INSP-API-001',
      records: [
        { package_no: 'API001', inspect_result: 'pass', inspector: '测试关员', category_match: true, id_match: true, value_match: true },
        { package_no: 'API002', inspect_result: 'fail', inspector: '测试关员', notes: '缺身份证' }
      ]
    };
    const insp = await request('/inspection/import', 'POST', inspBody);
    test('查验导入成功', insp.status === 200 && insp.data && insp.data.created === 2,
      `创建: ${insp.data?.created}`);
    console.log();

    console.log('5️⃣  包裹全状态查询');
    const pkg = await request('/packages/API001');
    test('能查到完整信息',
      pkg.status === 200 && pkg.data &&
      pkg.data.declarations && pkg.data.declarations.length > 0 &&
      pkg.data.supplementary && pkg.data.supplementary.length > 0 &&
      pkg.data.inspections && pkg.data.inspections.length > 0,
      `状态码: ${pkg.status}`);
    test('issues 数组存在', pkg.data && Array.isArray(pkg.data.issues));
    test('状态为查验通过', pkg.data && pkg.data.status === 'inspection_pass',
      `状态: ${pkg.data?.status}`);
    console.log();

    console.log('6️⃣  异常包裹查询');
    const missingId = await request('/packages/anomaly/missing-id');
    test('缺身份证明接口正常', missingId.status === 200 && missingId.data && Array.isArray(missingId.data.data),
      `状态码: ${missingId.status}`);
    if (missingId.data) {
      console.log(`     当前缺身份证包裹: ${missingId.data.total} 个`);
    }

    const catMis = await request('/packages/anomaly/category-mismatch');
    test('品类不一致接口正常', catMis.status === 200 && catMis.data && Array.isArray(catMis.data.data));

    const failRel = await request('/packages/anomaly/failed-but-released');
    test('查验未过仍放行接口正常', failRel.status === 200 && failRel.data && Array.isArray(failRel.data.data));

    const allAnom = await request('/packages/anomaly/all');
    test('异常汇总接口正常', allAnom.status === 200 && allAnom.data && allAnom.data.anomalies,
      `状态码: ${allAnom.status}`);
    if (allAnom.data) {
      console.log(`     异常汇总: 缺身份证=${allAnom.data.anomalies.missing_id_proof}, 品类不一致=${allAnom.data.anomalies.category_mismatch}, 查验未过仍放行=${allAnom.data.anomalies.failed_but_released}`);
    }
    console.log();

    console.log('7️⃣  人工复核');
    const reviewBody = {
      reviewer: '测试复核员',
      comment: '这是一条复核意见，确认资料完整。',
      status: 'reviewing'
    };
    const rev = await request('/review/API001', 'POST', reviewBody);
    test('复核提交成功', rev.status === 200 && rev.data && rev.data.latest_review,
      `状态码: ${rev.status}`);
    test('包裹状态已更新', rev.data && rev.data.package && rev.data.package.status === 'reviewing',
      `状态: ${rev.data?.package?.status}`);

    const rev2 = await request('/review/API002', 'POST', {
      reviewer: '测试复核员',
      comment: '资料缺失，需补录身份证明',
      status: 'held'
    });
    test('第二个包裹复核成功', rev2.status === 200);
    console.log();

    console.log('8️⃣  补录报告导出（JSON）');
    const report = await request('/export/report?format=json');
    test('JSON 报告正常', report.status === 200 && report.data && report.data.summary && Array.isArray(report.data.data),
      `状态码: ${report.status}`);
    if (report.data) {
      test('报告包含异常标记', report.data.data.some(r => 'has_issues' in r));
      console.log(`     报告包裹数: ${report.data.summary.total}`);
    }

    const reportIssues = await request('/export/report?format=json&only_issues=true');
    test('仅异常筛选正常', reportIssues.status === 200 && reportIssues.data,
      `状态码: ${reportIssues.status}`);
    console.log();

    console.log('9️⃣  补录报告导出（CSV）');
    const csv = await request('/export/report?format=csv');
    test('CSV 报告正常', csv.status === 200 && typeof csv.data === 'string',
      `状态码: ${csv.status}`);
    if (typeof csv.data === 'string') {
      test('CSV 包含表头行', csv.data.includes('包裹号') && csv.data.includes('状态'));
    }
    console.log();

    console.log('🔟  包裹列表分页');
    const list = await request('/packages?page=1&limit=5');
    test('列表分页正常', list.status === 200 && list.data && list.data.total > 0 && Array.isArray(list.data.data),
      `状态码: ${list.status}`);
    console.log();

    console.log('─'.repeat(50));
    console.log(`\n📊 测试结果: 通过 ${passed} 项，失败 ${failed} 项`);
    if (failed === 0) {
      console.log('🎉 所有测试通过！');
    } else {
      console.log('⚠️  有测试未通过，请检查。');
      process.exit(1);
    }
  } catch (err) {
    console.error('\n❌ 测试运行出错:', err.message);
    console.log(err.stack);
    process.exit(1);
  }
}

runTests();
