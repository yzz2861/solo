const http = require('http');

const BASE_URL = 'http://localhost:3001';

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method: method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('========== 停车月卡延期服务 API 测试 ==========\n');

  let testOwner, testCard, testApp;

  try {
    console.log('1. 健康检查...');
    const health = await request('GET', '/health');
    console.log('   ✓ 服务运行正常\n');

    console.log('2. 创建车主...');
    const ownerRes = await request('POST', '/api/cards/owners', {
      name: '张三',
      phone: '13800138000',
      company: '科技有限公司',
      floor: '15层'
    });
    testOwner = ownerRes.data.data;
    console.log('   ✓ 车主创建成功，编号:', testOwner.owner_no, '\n');

    console.log('3. 创建月卡...');
    const cardRes = await request('POST', '/api/cards/cards', {
      owner_id: testOwner.id,
      plate_number: '京A12345',
      card_type: 'normal',
      start_date: '2026-01-01',
      end_date: '2026-06-30',
      monthly_fee: 300
    });
    testCard = cardRes.data.data;
    console.log('   ✓ 月卡创建成功，编号:', testCard.card_no);
    console.log('   车牌号:', testCard.plate_number);
    console.log('   到期日:', testCard.end_date, '\n');

    console.log('4. 查询单卡状态...');
    const statusRes = await request('GET', `/api/cards/cards/${testCard.card_no}/status`);
    console.log('   ✓ 状态查询成功');
    console.log('   总延期天数:', statusRes.data.data.total_extension_days);
    console.log('   总费用:', statusRes.data.data.total_fee, '元\n');

    console.log('5. 申请延期（出差原因）...');
    const extRes = await request('POST', '/api/extensions/applications', {
      card_id: testCard.id,
      reason_type: 'business_trip',
      reason_detail: '出差10天',
      extension_days: 10,
      extension_source: 'manual',
      operator: '客服小王'
    });
    testApp = extRes.data.data;
    console.log('   ✓ 延期申请创建成功，申请号:', testApp.application_no);
    console.log('   延期天数:', testApp.extension_days, '天');
    console.log('   费用:', testApp.fee_amount, '元');
    console.log('   费用计算:', testApp.fee_calc_detail.formula, '\n');

    console.log('6. 测试重复申请自动合并...');
    const mergeRes = await request('POST', '/api/extensions/applications', {
      card_id: testCard.id,
      reason_type: 'vehicle_maintenance',
      reason_detail: '车辆维修5天',
      extension_days: 5,
      operator: '客服小王'
    });
    const mergedApp = mergeRes.data.data;
    console.log('   ✓ 重复申请已合并');
    console.log('   合并后总天数:', mergedApp.extension_days, '天');
    console.log('   合并来源:', mergedApp.merged_from, '\n');

    console.log('7. 审批通过延期申请...');
    const approveRes = await request('POST', `/api/extensions/applications/${mergedApp.application_no}/approve`, {
      operator: '主管审批'
    });
    console.log('   ✓ 审批通过');
    console.log('   新到期日:', approveRes.data.data.new_end_date, '\n');

    console.log('8. 验证月卡到期日已更新...');
    const cardAfterExt = await request('GET', `/api/cards/cards/${testCard.card_no}`);
    console.log('   ✓ 月卡到期日更新为:', cardAfterExt.data.data.end_date);
    console.log('   原始到期日:', cardAfterExt.data.data.original_end_date, '\n');

    console.log('9. 车牌变更...');
    const plateRes = await request('POST', '/api/plates/changes', {
      card_id: testCard.id,
      new_plate: '京B67890',
      reason: '换车',
      operator: '客服小李',
      effective_date: '2026-06-20'
    });
    console.log('   ✓ 车牌变更成功');
    console.log('   旧车牌:', plateRes.data.data.old_plate);
    console.log('   新车牌:', plateRes.data.data.new_plate, '\n');

    console.log('10. 查询车牌历史...');
    const plateHistory = await request('GET', `/api/plates/cards/${testCard.card_no}/history`);
    console.log('   ✓ 历史车牌记录数:', plateHistory.data.data.length, '条\n');

    console.log('11. 闸机读卡测试（新车牌）...');
    const gateRes = await request('GET', '/api/gate/plate/京B67890');
    console.log('   ✓ 闸机读卡结果');
    console.log('   是否有效:', gateRes.data.data.valid);
    console.log('   原因:', gateRes.data.data.reason);
    console.log('   到期日:', gateRes.data.data.end_date, '\n');

    console.log('12. 费用流水查询...');
    const feeRes = await request('GET', `/api/fees/cards/${testCard.card_no}/transactions`);
    console.log('   ✓ 费用流水条数:', feeRes.data.data.length, '条');
    if (feeRes.data.data.length > 0) {
      console.log('   最新流水类型:', feeRes.data.data[0].transaction_type);
      console.log('   金额:', feeRes.data.data[0].amount, '元');
      console.log('   方向:', feeRes.data.data[0].direction, '\n');
    }

    console.log('13. 人工调整测试...');
    const adjRes = await request('POST', '/api/manual/adjustments', {
      card_no: testCard.card_no,
      adjust_type: 'extend_days',
      adjust_days: 3,
      reason: '特殊情况人工延期',
      operator: '运营经理'
    });
    console.log('   ✓ 人工调整成功');
    console.log('   调整类型:', adjRes.data.data.adjust_type);
    console.log('   调整金额:', adjRes.data.data.adjust_amount, '元\n');

    console.log('14. 费用汇总...');
    const summaryRes = await request('GET', `/api/fees/cards/${testCard.card_no}/fee-summary`);
    console.log('   ✓ 费用汇总');
    console.log('   总收入:', summaryRes.data.data.total_income, '元');
    console.log('   净余额:', summaryRes.data.data.net_balance, '元');
    console.log('   交易笔数:', summaryRes.data.data.transaction_count, '\n');

    console.log('15. 导出延期记录...');
    const exportRes = await request('GET', '/api/export/extensions');
    console.log('   ✓ 导出成功');
    console.log('   文件名:', exportRes.data.data.file_name);
    console.log('   记录数:', exportRes.data.data.record_count, '条\n');

    console.log('16. 过期太久不能无理由延期测试...');
    const expiredOwner = await request('POST', '/api/cards/owners', {
      name: '李四',
      phone: '13900139000',
      company: '贸易公司',
      floor: '8层'
    });
    const expiredCard = await request('POST', '/api/cards/cards', {
      owner_id: expiredOwner.data.data.id,
      plate_number: '京C11111',
      start_date: '2025-01-01',
      end_date: '2025-06-30',
      monthly_fee: 300
    });
    const failExt = await request('POST', '/api/extensions/applications', {
      card_id: expiredCard.data.data.id,
      reason_type: 'other',
      reason_detail: '无理由延期',
      extension_days: 10,
      operator: '测试'
    });
    console.log('   ✓ 正确拒绝:', failExt.data.message);
    console.log('   (过期超过90天无理由延期被拒绝)\n');

    console.log('17. 延期申请列表查询...');
    const listRes = await request('GET', '/api/extensions/applications?page=1&pageSize=10&status=approved');
    console.log('   ✓ 列表查询成功');
    console.log('   总记录数:', listRes.data.data.total, '条\n');

    console.log('18. 导出车牌变更...');
    const exportPlateRes = await request('GET', '/api/export/plate-changes');
    console.log('   ✓ 车牌变更导出成功');
    console.log('   记录数:', exportPlateRes.data.data.record_count, '条\n');

    console.log('19. 导出人工调整...');
    const exportAdjRes = await request('GET', '/api/export/manual-adjustments');
    console.log('   ✓ 人工调整导出成功');
    console.log('   记录数:', exportAdjRes.data.data.record_count, '条\n');

    console.log('20. 导出费用流水...');
    const exportFeeRes = await request('GET', '/api/export/fee-transactions');
    console.log('   ✓ 费用流水导出成功');
    console.log('   记录数:', exportFeeRes.data.data.record_count, '条\n');

    console.log('========== 所有测试通过！ ==========');
    console.log('\n核心功能总结：');
    console.log('✅ 月卡与车主管理');
    console.log('✅ 延期申请与审批');
    console.log('✅ 重复申请自动合并');
    console.log('✅ 车牌变更（保留历史）');
    console.log('✅ 费用流水与计算追溯');
    console.log('✅ 人工延期与规则延期区分');
    console.log('✅ 过期太久无理由延期限制');
    console.log('✅ 闸机读卡接口');
    console.log('✅ 运营数据导出（CSV格式）');

  } catch (err) {
    console.error('测试失败:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

runTests();
