const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3002;
const BASE_PATH = '/api';

const request = (method, path, body = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: BASE_PATH + path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const passed = [];
const failed = [];

const assert = (testName, condition, detail = '') => {
  if (condition) {
    passed.push(testName);
    console.log(`✓ ${testName}${detail ? ' - ' + detail : ''}`);
  } else {
    failed.push(testName);
    console.log(`✗ ${testName}${detail ? ' - ' + detail : ''}`);
  }
};

const assertContains = (testName, text, searchStr, detail = '') => {
  const condition = String(text).indexOf(searchStr) >= 0;
  if (condition) {
    passed.push(testName);
    console.log(`✓ ${testName}${detail ? ' - ' + detail : ''}`);
  } else {
    failed.push(testName);
    console.log(`✗ ${testName}: "${searchStr}" not found`);
  }
};

const runTests = async () => {
  console.log('========================================');
  console.log('  漏扫识别与日报测试');
  console.log('========================================\n');

  try {
    console.log('1. 准备测试数据...');
    
    const instrumentsRes = await request('GET', '/instruments');
    const instruments = instrumentsRes.body.data;
    const scalerTip = instruments.find(i => i.type === 'scaler_tip');
    const mouthMirror = instruments.find(i => i.code === 'INS-007');

    const timestamp = Date.now().toString(36);
    
    const batch1 = await request('POST', '/batches/collect', {
      instrument_ids: [scalerTip.id],
      operator: '测试护士',
      location: '测试治疗间',
      qr_code: 'QR-TEST-STEP1-' + timestamp,
      notes: '测试：回收后未清洗',
    });
    assert('创建回收状态批次', batch1.status === 201);

    const batch2 = await request('POST', '/batches/collect', {
      instrument_ids: [mouthMirror.id],
      operator: '测试护士',
      location: '测试治疗间',
      qr_code: 'QR-TEST-STEP2-' + timestamp,
      notes: '测试：清洗后未灭菌',
    });
    await request('POST', '/batches/scan/cleaning', { qr_code: batch2.body.data.qr_code, operator: '清洗员', location: '清洗室' });
    await request('POST', '/batches/scan/cleaned', { qr_code: batch2.body.data.qr_code, operator: '清洗员', location: '清洗室' });
    assert('创建清洗完成状态批次', batch2.status === 201);

    const batch3 = await request('POST', '/batches/collect', {
      instrument_ids: [scalerTip.id, mouthMirror.id],
      operator: '测试护士',
      location: '测试治疗间',
      qr_code: 'QR-TEST-STEP3-' + timestamp,
      notes: '测试：灭菌后未入柜',
    });
    await request('POST', '/batches/scan/cleaning', { qr_code: batch3.body.data.qr_code, operator: '清洗员', location: '清洗室' });
    await request('POST', '/batches/scan/cleaned', { qr_code: batch3.body.data.qr_code, operator: '清洗员', location: '清洗室' });
    await request('POST', '/batches/scan/sterilizing', { qr_code: batch3.body.data.qr_code, operator: '灭菌员', location: '灭菌室', sterilizer_id: 'STER-001', pot_cycle: 'POT-TEST' });
    await request('POST', '/batches/scan/sterilized', { qr_code: batch3.body.data.qr_code, operator: '灭菌员', location: '灭菌室', expire_days: 180, sterilizer_id: 'STER-001', pot_cycle: 'POT-TEST' });
    assert('创建灭菌成功状态批次', batch3.status === 201);

    const batch4 = await request('POST', '/batches/collect', {
      instrument_ids: [scalerTip.id],
      operator: '测试护士',
      location: '测试治疗间',
      qr_code: 'QR-TEST-STEP4-' + timestamp,
      notes: '测试：入柜后未发放',
    });
    await request('POST', '/batches/scan/cleaning', { qr_code: batch4.body.data.qr_code, operator: '清洗员', location: '清洗室' });
    await request('POST', '/batches/scan/cleaned', { qr_code: batch4.body.data.qr_code, operator: '清洗员', location: '清洗室' });
    await request('POST', '/batches/scan/sterilizing', { qr_code: batch4.body.data.qr_code, operator: '灭菌员', location: '灭菌室', sterilizer_id: 'STER-001', pot_cycle: 'POT-TEST2' });
    await request('POST', '/batches/scan/sterilized', { qr_code: batch4.body.data.qr_code, operator: '灭菌员', location: '灭菌室', expire_days: -1, sterilizer_id: 'STER-001', pot_cycle: 'POT-TEST2' });
    await request('POST', '/batches/scan/stored', { qr_code: batch4.body.data.qr_code, operator: '库管员', location: '无菌柜' });
    assert('创建过期包批次', batch4.status === 201);

    const batch5 = await request('POST', '/batches/collect', {
      instrument_ids: [mouthMirror.id],
      operator: '测试护士',
      location: '测试治疗间',
      qr_code: 'QR-TEST-STEP5-' + timestamp,
      notes: '测试：临期包',
    });
    await request('POST', '/batches/scan/cleaning', { qr_code: batch5.body.data.qr_code, operator: '清洗员', location: '清洗室' });
    await request('POST', '/batches/scan/cleaned', { qr_code: batch5.body.data.qr_code, operator: '清洗员', location: '清洗室' });
    await request('POST', '/batches/scan/sterilizing', { qr_code: batch5.body.data.qr_code, operator: '灭菌员', location: '灭菌室', sterilizer_id: 'STER-001', pot_cycle: 'POT-TEST3' });
    await request('POST', '/batches/scan/sterilized', { qr_code: batch5.body.data.qr_code, operator: '灭菌员', location: '灭菌室', expire_days: 2, sterilizer_id: 'STER-001', pot_cycle: 'POT-TEST3' });
    await request('POST', '/batches/scan/stored', { qr_code: batch5.body.data.qr_code, operator: '库管员', location: '无菌柜' });
    assert('创建临期包批次', batch5.status === 201);

    await new Promise(r => setTimeout(r, 100));

    console.log('\n2. 日报接口测试...');
    const today = new Date().toISOString().slice(0, 10);
    const report = await request('GET', `/reports/daily?date=${today}`);
    assert('日报返回200', report.status === 200);
    assert('日报数据结构完整', report.body.data !== undefined);

    console.log('\n3. 漏扫识别验证...');
    const missedScans = report.body.data.missed_scans;
    assert('漏扫列表为数组', Array.isArray(missedScans));
    assert('漏扫数量 >= 3', missedScans.length >= 3);

    const scanByQR = {};
    missedScans.forEach(ms => {
      scanByQR[ms.qr_code] = ms;
    });

    console.log('\n4. 各状态漏扫场景验证...');
    
    const step1 = scanByQR['QR-TEST-STEP1-' + timestamp];
    assert('找到回收状态漏扫', step1 !== undefined);
    if (step1) {
      assert('回收状态漏扫有pending_next_step问题', step1.issues.some(i => i.type === 'pending_next_step'));
      const issue = step1.issues.find(i => i.type === 'pending_next_step');
      assertContains('问题原因描述待清洗', issue.reason, '待清洗');
      assertContains('缺失清洗环节', issue.missing_next_actions_desc, '清洗');
    }

    const step2 = scanByQR['QR-TEST-STEP2-' + timestamp];
    assert('找到清洗完成状态漏扫', step2 !== undefined);
    if (step2) {
      const issue = step2.issues.find(i => i.type === 'pending_next_step');
      assertContains('问题原因描述已清洗', issue.reason, '已清洗');
      assertContains('缺失灭菌环节', issue.missing_next_actions_desc, '灭菌');
    }

    const step3 = scanByQR['QR-TEST-STEP3-' + timestamp];
    assert('找到灭菌成功状态漏扫', step3 !== undefined);
    if (step3) {
      const issue = step3.issues.find(i => i.type === 'pending_next_step');
      assertContains('问题原因描述灭菌成功', issue.reason, '灭菌成功');
      assertContains('缺失入柜环节', issue.missing_next_actions_desc, '入柜');
    }

    const step4 = scanByQR['QR-TEST-STEP4-' + timestamp];
    assert('找到入柜状态漏扫', step4 !== undefined);
    if (step4) {
      const issue = step4.issues.find(i => i.type === 'pending_next_step');
      assertContains('问题原因描述已入柜', issue.reason, '已入柜');
      assertContains('缺失发放环节', issue.missing_next_actions_desc, '发放');
    }

    console.log('\n5. 过期包识别验证...');
    const expiredBatches = report.body.data.expired_batches;
    assert('过期包列表为数组', Array.isArray(expiredBatches));
    
    const expiredItem = expiredBatches.find(b => b.qr_code === 'QR-TEST-STEP4-' + timestamp);
    assert('找到过期包', expiredItem !== undefined);
    if (expiredItem) {
      assert('过期包有天数信息', expiredItem.days_overdue !== undefined);
      assert('过期包天数 >= 1', expiredItem.days_overdue >= 1);
      assert('过期包有状态描述', expiredItem.status_description === '已入柜');
    }

    console.log('\n6. 临期包识别验证...');
    const expiringBatches = report.body.data.expiring_soon_batches;
    assert('临期包列表为数组', Array.isArray(expiringBatches));
    
    const expiringItem = expiringBatches.find(b => b.qr_code === 'QR-TEST-STEP5-' + timestamp);
    assert('找到临期包', expiringItem !== undefined);
    if (expiringItem) {
      assert('临期包有剩余天数', expiringItem.days_remaining !== undefined);
      assert('临期包剩余天数 <= 3', expiringItem.days_remaining <= 3);
      assert('临期包有状态描述', expiringItem.status_description === '已入柜');
    }

    console.log('\n7. 漏扫记录结构完整性...');
    if (missedScans.length > 0) {
      const sample = missedScans[0];
      assert('漏扫记录有批次ID', sample.batch_id !== undefined);
      assert('漏扫记录有二维码', sample.qr_code !== undefined);
      assert('漏扫记录有包号', sample.bag_no !== undefined);
      assert('漏扫记录有当前状态', sample.current_status !== undefined);
      assert('漏扫记录有状态描述', sample.current_status_desc !== undefined);
      assert('漏扫记录有问题列表', Array.isArray(sample.issues));
      assert('漏扫记录有位置信息', sample.location !== undefined);
      assert('漏扫记录有上次操作时间', sample.time_since_last_action !== undefined);

      const issue = sample.issues[0];
      assert('问题有类型', issue.type !== undefined);
      assert('问题有原因描述', issue.reason !== undefined);
      
      if (issue.type === 'pending_next_step') {
        assert('pending_next_step有当前状态', issue.current_status !== undefined);
        assert('pending_next_step有当前状态描述', issue.current_status_desc !== undefined);
        assert('pending_next_step有缺失动作列表', Array.isArray(issue.missing_next_actions));
        assert('pending_next_step有缺失动作描述', issue.missing_next_actions_desc !== undefined);
        assert('pending_next_step有时间信息', issue.since_time !== undefined);
      }
    }

    console.log('\n8. 日报汇总信息验证...');
    const summary = report.body.data.summary;
    assert('汇总有漏扫数量', summary.missed_scans_count !== undefined);
    assert('汇总有过期包数量', summary.expired_batches_count !== undefined);
    assert('汇总有临期包数量', summary.expiring_soon_count !== undefined);
    assert('汇总有当日扫码数', summary.total_scans_today !== undefined);

    console.log('\n========================================');
    console.log(`通过: ${passed.length} 项`);
    console.log(`失败: ${failed.length} 项`);
    
    if (failed.length > 0) {
      console.log('\n失败的测试:');
      failed.forEach(f => console.log(`  - ${f}`));
      process.exit(1);
    } else {
      console.log('\n所有测试通过 ✓');
      process.exit(0);
    }

  } catch (err) {
    console.error('测试出错:', err.message);
    process.exit(1);
  }
};

runTests();
