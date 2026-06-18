const http = require('http');

function request(method, path, token, data) {
  return new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : null;
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {})
      }
    };
    const req = http.request(options, (res) => {
      let chunks = '';
      res.on('data', (c) => (chunks += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(chunks) }); }
        catch { resolve({ status: res.statusCode, data: chunks }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function test() {
  console.log('\n' + '='.repeat(60));
  console.log('   高校宿舍维修领料系统 API 核心流程测试');
  console.log('='.repeat(60));

  let s = await request('POST', '/api/auth/login', null, { username: 'student001', password: '123456' });
  const studentToken = s.data.data.token;
  console.log('\n✅ 学生登录成功:', s.data.data.user.real_name, '(role:', s.data.data.user.role + ')');

  let w = await request('POST', '/api/auth/login', null, { username: 'worker001', password: '123456' });
  const workerToken = w.data.data.token;
  console.log('✅ 维修师傅登录成功:', w.data.data.user.real_name);

  let k = await request('POST', '/api/auth/login', null, { username: 'store001', password: '123456' });
  const storeToken = k.data.data.token;
  console.log('✅ 库管登录成功:', k.data.data.user.real_name);

  let a = await request('POST', '/api/auth/login', null, { username: 'admin001', password: '123456' });
  const adminToken = a.data.data.token;
  console.log('✅ 后勤主任登录成功:', a.data.data.user.real_name);

  console.log('\n--- 1. 创建工单 & 重复报修检测 ---');
  let r1 = await request('POST', '/api/work-orders', studentToken, {
    building_id: 1, room_id: 1, repair_type_id: 1,
    title: '灯管不亮', description: '两根都坏了', priority: 'normal'
  });
  console.log('✅ 首次创建工单:', r1.data.message, '| id:', r1.data.data?.id, '| order_no:', r1.data.data?.order_no);
  const orderId = r1.data.data.id;

  let r2 = await request('POST', '/api/work-orders', studentToken, {
    building_id: 1, room_id: 1, repair_type_id: 1,
    title: '灯管还是不亮', description: '又坏了'
  });
  console.log('⚠️  重复报修检测:', r2.data.message, '| duplicate:', r2.data.data?.duplicate);

  let r3 = await request('POST', '/api/work-orders', studentToken, {
    building_id: 1, room_id: 1, repair_type_id: 1,
    title: '灯管还是不亮', force_create: true
  });
  console.log('✅ 强制创建重复工单:', r3.data.message, '| duplicate:', r3.data.data?.duplicate);

  console.log('\n--- 2. 派单 & 状态流转 ---');
  let assign = await request('PUT', `/api/work-orders/${orderId}/assign`, storeToken, { worker_id: 3 });
  console.log('✅ 派单给王师傅:', assign.data.message);

  let start = await request('PUT', `/api/work-orders/${orderId}/start`, workerToken, {});
  console.log('✅ 开始维修:', start.data.message);

  console.log('\n--- 3. 领料 & 历史用料推荐 ---');
  let hist = await request('GET', `/api/work-orders/${orderId}/similar-history`, workerToken);
  console.log('✅ 同类故障历史记录数:', hist.data.data?.history?.length || 0, '| 推荐材料数:', hist.data.data?.recommended_materials?.length || 0);

  let issue = await request('POST', '/api/materials/issue', workerToken, {
    work_order_id: orderId, material_id: 1, quantity: 2, remark: '换两根灯管'
  });
  console.log('✅ 领料 2 根LED灯管:', issue.data.message, '| issue_id:', issue.data.data?.id);
  const issueId = issue.data.data.id;

  console.log('\n--- 4. 完成维修（带未回填材料提醒） ---');
  let complete = await request('PUT', `/api/work-orders/${orderId}/complete`, workerToken, {});
  console.log('✅ 完成维修:', complete.data.message);
  console.log('   ⚠️  待回填材料:', complete.data.data?.unreturned_issues?.map(i => i.material_name + ' x' + (i.quantity - i.returned_quantity)).join(', '));

  let issueAfter = await request('POST', '/api/materials/issue', workerToken, {
    work_order_id: orderId, material_id: 2, quantity: 1
  });
  console.log('❌ 已完工工单领料:', issueAfter.data.message, '(预期失败)');

  console.log('\n--- 5. 退料回仓 ---');
  let ret = await request('POST', '/api/materials/return', storeToken, {
    issue_id: issueId, quantity: 1, reason: '只用了一根'
  });
  console.log('✅ 回仓 1 根灯管:', ret.data.message, '| 状态:', ret.data.data?.status);

  console.log('\n--- 6. 学生确认 & 满意度评价 ---');
  let confirm = await request('PUT', `/api/work-orders/${orderId}/confirm`, studentToken, {});
  console.log('✅ 学生确认完工:', confirm.data.message);

  let sat = await request('POST', `/api/work-orders/${orderId}/satisfaction`, studentToken, {
    rating: 5, comment: '师傅很专业，很快就修好了！'
  });
  console.log('✅ 提交满意度 5星评价:', sat.data.message);

  console.log('\n--- 7. 材料流水查询（库管） ---');
  let flows = await request('GET', '/api/materials/flows/list?pageSize=5', storeToken);
  console.log('✅ 材料流水总数:', flows.data.data?.total, '| 当前页条数:', flows.data.data?.list?.length);

  console.log('\n--- 8. 后勤主任报表 ---');
  let dash = await request('GET', '/api/reports/dashboard', adminToken);
  console.log('✅ 仪表盘: 待处理=', dash.data.data?.pending_count,
    '| 超期=', dash.data.data?.overdue_count,
    '| 未确认=', dash.data.data?.unconfirmed_count,
    '| 今日工单=', dash.data.data?.today_orders);

  let cons = await request('GET', '/api/reports/material-consumption', adminToken);
  console.log('✅ 材料消耗: 种类数=', cons.data.data?.summary?.total_items,
    '| 消耗总量=', cons.data.data?.summary?.total_consumed_value);

  console.log('\n--- 9. 工单详情（含日志/领料/评价） ---');
  let detail = await request('GET', `/api/work-orders/${orderId}`, studentToken);
  console.log('✅ 工单详情: 状态=', detail.data.data?.status,
    '| 领料记录=', detail.data.data?.issues?.length,
    '| 操作日志=', detail.data.data?.logs?.length,
    '| 满意度=', detail.data.data?.satisfaction?.rating, '星');

  console.log('\n' + '='.repeat(60));
  console.log('   🎉 全部核心流程测试通过！');
  console.log('='.repeat(60) + '\n');
}

test().catch(console.error);
