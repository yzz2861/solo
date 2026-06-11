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

const log = (title, data) => {
  console.log(`\n=== ${title} ===`);
  if (data !== undefined) {
    console.log(typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
  }
};

const passed = [];
const failed = [];

const assert = (testName, condition, detail = '') => {
  if (condition) {
    passed.push(testName);
    console.log(`  ✓ ${testName}${detail ? ' - ' + detail : ''}`);
  } else {
    failed.push(testName);
    console.log(`  ✗ ${testName}${detail ? ' - ' + detail : ''}`);
  }
};

const runTests = async () => {
  console.log('========================================');
  console.log('  牙科器械灭菌追踪 API 测试');
  console.log('========================================');

  try {
    log('1. 健康检查');
    const health = await request('GET', '/health');
    assert('健康检查返回200', health.status === 200);
    assert('健康检查消息正确', health.body.message === '牙科器械灭菌追踪API运行正常');

    log('2. 器械管理');
    const instrumentsRes = await request('GET', '/instruments');
    assert('获取器械列表成功', instrumentsRes.status === 200 && instrumentsRes.body.success);
    assert('器械数量 >= 8', instrumentsRes.body.data.length >= 8);

    const instruments = instrumentsRes.body.data;
    const scalerTip = instruments.find(i => i.type === 'scaler_tip');
    const forceps = instruments.find(i => i.type === 'forceps');
    const mouthMirror = instruments.find(i => i.code === 'INS-007');
    const probe = instruments.find(i => i.code === 'INS-008');

    log('3. 回收扫码 - 创建洁牙批次（指定二维码）');
    const testQR = 'QR-TEST-001-ABC';
    const collect1 = await request('POST', '/batches/collect', {
      instrument_ids: [scalerTip.id, mouthMirror.id],
      operator: '护士A',
      location: '治疗间1',
      notes: '洁牙使用后回收',
      qr_code: testQR,
    });
    assert('创建批次返回201', collect1.status === 201);
    assert('批次状态为 collected', collect1.body.data.status === 'collected');
    assert('二维码正确', collect1.body.data.qr_code === testQR);
    assert('包含2件器械', collect1.body.data.items.length === 2);
    const batch1 = collect1.body.data;

    log('4. 重复扫码检测 - 同一二维码重复回收提示');
    const duplicateRes = await request('POST', '/batches/collect', {
      instrument_ids: [scalerTip.id],
      operator: '护士B',
      location: '治疗间1',
      qr_code: testQR,
    });
    assert('重复扫码不报错', duplicateRes.status === 200);
    assert('返回重复警告标志', duplicateRes.body.duplicate_warning === true);
    assert('提示消息包含已回收', duplicateRes.body.message.indexOf('已在') >= 0);
    assert('返回已有批次信息', duplicateRes.body.existing_batch !== undefined);

    log('5. 创建拔牙钳批次（自动生成二维码）');
    const collect2 = await request('POST', '/batches/collect', {
      instrument_ids: [forceps.id, probe.id],
      operator: '护士B',
      location: '治疗间2',
      notes: '拔牙后回收',
    });
    assert('创建批次成功', collect2.status === 201);
    assert('自动生成QR码', collect2.body.data.qr_code.startsWith('QR-'));
    const batch2 = collect2.body.data;

    log('6. 状态流转 - 清洗中');
    const cleaning1 = await request('POST', '/batches/scan/cleaning', {
      qr_code: batch1.qr_code,
      operator: '清洗员张姐',
      location: '清洗室',
    });
    assert('状态变为 cleaning', cleaning1.body.data.status === 'cleaning');

    log('7. 状态流转 - 清洗完成');
    const cleaned1 = await request('POST', '/batches/scan/cleaned', {
      qr_code: batch1.qr_code,
      operator: '清洗员张姐',
      location: '清洗室',
    });
    assert('状态变为 cleaned', cleaned1.body.data.status === 'cleaned');
    assert('有清洗完成时间', cleaned1.body.data.cleaned_at !== null);

    log('8. 状态流转 - 灭菌中（含锅次信息）');
    const sterilizing1 = await request('POST', '/batches/scan/sterilizing', {
      qr_code: batch1.qr_code,
      operator: '灭菌员李师傅',
      location: '灭菌室',
      sterilizer_id: 'STER-001',
      pot_cycle: 'POT-20260611-001',
    });
    assert('状态变为 sterilizing', sterilizing1.body.data.status === 'sterilizing');
    assert('灭菌锅ID正确', sterilizing1.body.data.sterilizer_id === 'STER-001');

    log('9. 状态流转 - 灭菌成功（设置过期时间）');
    const sterilized1 = await request('POST', '/batches/scan/sterilized', {
      qr_code: batch1.qr_code,
      operator: '灭菌员李师傅',
      location: '灭菌室',
      expire_days: 180,
      sterilizer_id: 'STER-001',
      pot_cycle: 'POT-20260611-001',
    });
    assert('状态变为 sterilized', sterilized1.body.data.status === 'sterilized');
    assert('有灭菌时间', sterilized1.body.data.sterilized_at !== null);
    assert('有过期时间', sterilized1.body.data.expire_at !== null);

    log('10. 状态流转 - 入柜');
    const stored1 = await request('POST', '/batches/scan/stored', {
      qr_code: batch1.qr_code,
      operator: '库管员王姐',
      location: '无菌柜A区',
    });
    assert('状态变为 stored', stored1.body.data.status === 'stored');
    assert('有入柜时间', stored1.body.data.stored_at !== null);

    log('11. 灭菌失败流程测试');
    await request('POST', '/batches/scan/cleaning', {
      qr_code: batch2.qr_code, operator: '清洗员张姐', location: '清洗室',
    });
    await request('POST', '/batches/scan/cleaned', {
      qr_code: batch2.qr_code, operator: '清洗员张姐', location: '清洗室',
    });
    await request('POST', '/batches/scan/sterilizing', {
      qr_code: batch2.qr_code, operator: '灭菌员李师傅', location: '灭菌室',
      sterilizer_id: 'STER-001', pot_cycle: 'POT-20260611-002',
    });

    const failResult = await request('POST', '/batches/sterilization-fail', {
      qr_code: batch2.qr_code,
      operator: '灭菌员李师傅',
      notes: '温度不达标，灭菌失败',
    });
    assert('失败后状态为 sterilization_failed', failResult.body.data.status === 'sterilization_failed');

    log('12. 灭菌失败批次不能入柜');
    const tryStore = await request('POST', '/batches/scan/stored', {
      qr_code: batch2.qr_code, operator: '库管员王姐',
    });
    assert('入柜失败返回400', tryStore.status === 400);
    assert('错误说明状态流转问题', tryStore.body.error.indexOf('无法从') >= 0);

    log('13. 灭菌失败批次重新处理');
    const reprocess = await request('POST', '/batches/reprocess', {
      qr_code: batch2.qr_code,
      operator: '灭菌员李师傅',
      notes: '重新清洗后再次灭菌',
    });
    assert('重新处理后状态为 cleaned', reprocess.body.data.status === 'cleaned');

    log('14. 创建治疗记录');
    const treatment = await request('POST', '/treatments', {
      patient_id: 'P-10086',
      patient_name: '张三',
      doctor: '王医生',
      treatment_type: '超声波洁牙',
      treatment_date: new Date().toISOString().slice(0, 10),
      clinic_room: '治疗间1',
      notes: '常规洁牙+抛光',
    });
    assert('创建治疗记录成功', treatment.status === 201);
    assert('状态为 scheduled', treatment.body.data.status === 'scheduled');
    const treatment1 = treatment.body.data;

    log('15. 提前取包 - 按当天治疗计划领取');
    const pickup = await request('POST', `/treatments/${treatment1.id}/pickup`, {
      qr_code: batch1.qr_code,
      operator: '护士A',
    });
    assert('领取成功', pickup.status === 200);
    assert('批次状态变为 issued', pickup.body.data.instruments[0].batch_status === 'issued');
    assert('有领取时间', pickup.body.data.instruments[0].picked_up_at !== null);

    log('16. 使用器械 - 绑定治疗记录');
    const useResult = await request('POST', `/treatments/${treatment1.id}/use`, {
      qr_code: batch1.qr_code,
      operator: '护士A',
    });
    assert('使用成功', useResult.status === 200);
    assert('治疗状态变为 in_progress', useResult.body.data.status === 'in_progress');
    assert('批次状态变为 used', useResult.body.data.instruments[0].batch_status === 'used');
    assert('有使用时间', useResult.body.data.instruments[0].used_at !== null);

    log('17. 已使用器械不能回库');
    const tryReturn = await request('POST', `/treatments/${treatment1.id}/return`, {
      qr_code: batch1.qr_code,
      operator: '护士A',
    });
    assert('归还失败', tryReturn.status === 400);
    assert('错误说明已使用', tryReturn.body.error.indexOf('已用于患者') >= 0);

    log('18. 完成治疗');
    const complete = await request('POST', `/treatments/${treatment1.id}/complete`);
    assert('治疗完成', complete.status === 200);
    assert('状态为 completed', complete.body.data.status === 'completed');

    log('19. 反向追踪 - 按患者查链路');
    const traceByPatient = await request('GET', `/trace/patient/${treatment1.patient_id}`);
    assert('追踪成功', traceByPatient.status === 200);
    assert('找到治疗记录', traceByPatient.body.data.length >= 1);
    assert('关联了器械批次', traceByPatient.body.data[0].instrument_batches.length >= 1);

    log('20. 反向追踪 - 按二维码查完整链路');
    const traceByQR = await request('GET', `/trace/qr/${batch1.qr_code}`);
    assert('追踪成功', traceByQR.status === 200);
    const trace = traceByQR.body.data;
    assert('有批次信息', trace.batch_info !== undefined);
    assert('有扫码历史', trace.scan_history.length > 0);
    assert('有治疗使用记录', trace.treatment_usage.length >= 1);

    log('21. 反向追踪 - 按器械查历史');
    const traceByInst = await request('GET', `/trace/instrument/${scalerTip.code}`);
    assert('追踪成功', traceByInst.status === 200);
    assert('找到器械信息', traceByInst.body.data.instrument.code === scalerTip.code);
    assert('有历史批次', traceByInst.body.data.batch_history.length >= 1);

    log('22. 反向追踪 - 按锅次查');
    const traceByPot = await request('GET', '/trace/pot-cycle/POT-20260611-001');
    assert('追踪成功', traceByPot.status === 200);
    assert('有统计信息', traceByPot.body.data.stats !== undefined);
    assert('有批次列表', traceByPot.body.data.batches.length >= 1);

    log('23. 日报 - 过期包与漏扫环节');
    const today = new Date().toISOString().slice(0, 10);
    const report = await request('GET', `/reports/daily?date=${today}`);
    assert('日报获取成功', report.status === 200);
    assert('有报告日期', report.body.data.report_date === today);
    assert('有汇总信息', report.body.data.summary !== undefined);
    assert('有漏扫列表', Array.isArray(report.body.data.missed_scans));

    log('24. 库存状态总览');
    const inventory = await request('GET', '/reports/inventory');
    assert('库存查询成功', inventory.status === 200);
    assert('有批次状态分布', inventory.body.data.batches_by_status.length > 0);
    assert('有器械类型分布', inventory.body.data.instruments_by_type.length > 0);

    log('25. 已发放未使用的器械可以归还');
    const treatment2Res = await request('POST', '/treatments', {
      patient_id: 'P-10087',
      patient_name: '李四',
      doctor: '王医生',
      treatment_type: '检查',
      treatment_date: new Date().toISOString().slice(0, 10),
      clinic_room: '治疗间2',
    });
    const treatment2 = treatment2Res.body.data;

    const batch3Res = await request('POST', '/batches/collect', {
      instrument_ids: [mouthMirror.id, probe.id],
      operator: '护士B', location: '治疗间2',
    });
    const batch3 = batch3Res.body.data;

    await request('POST', '/batches/scan/cleaning', { qr_code: batch3.qr_code, operator: '清洗员', location: '清洗室' });
    await request('POST', '/batches/scan/cleaned', { qr_code: batch3.qr_code, operator: '清洗员', location: '清洗室' });
    await request('POST', '/batches/scan/sterilizing', { qr_code: batch3.qr_code, operator: '灭菌员', location: '灭菌室', sterilizer_id: 'STER-002', pot_cycle: 'POT-20260611-003' });
    await request('POST', '/batches/scan/sterilized', { qr_code: batch3.qr_code, operator: '灭菌员', location: '灭菌室', expire_days: 30, sterilizer_id: 'STER-002', pot_cycle: 'POT-20260611-003' });
    await request('POST', '/batches/scan/stored', { qr_code: batch3.qr_code, operator: '库管员', location: '无菌柜B' });

    await request('POST', `/treatments/${treatment2.id}/pickup`, {
      qr_code: batch3.qr_code, operator: '护士B',
    });

    const returnResult = await request('POST', `/treatments/${treatment2.id}/return`, {
      qr_code: batch3.qr_code,
      operator: '护士B',
      notes: '患者取消，未使用',
    });
    assert('未使用器械归还成功', returnResult.status === 200);
    assert('归还后状态回到 stored', returnResult.body.data.status === 'stored');

    console.log('\n========================================');
    console.log('  测试结果汇总');
    console.log('========================================');
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
    console.error(err.stack);
    process.exit(1);
  }
};

runTests();
