const http = require('http');

const BASE = 'http://localhost:3000/api';
let token = '';
let techToken = '';
let stationToken = '';
let warehouseToken = '';

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json', ...headers }
    };

    const req = http.request(opts, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

async function run() {
  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) { passed++; console.log(`  ✅ ${name}`); }
    else { failed++; console.log(`  ❌ ${name}`); }
  }

  console.log('=== 维修备件领用归还服务 API 测试 ===\n');

  console.log('1. 登录测试');
  const login1 = await request('POST', '/auth/login', { username: 'zhang', password: '123456' });
  assert(login1.status === 200 && login1.body.token, '师傅登录');
  techToken = login1.body.token;

  const login2 = await request('POST', '/auth/login', { username: 'admin_ku', password: '123456' });
  assert(login2.status === 200 && login2.body.token, '库管登录');
  warehouseToken = login2.body.token;

  const login3 = await request('POST', '/auth/login', { username: 'admin_zhan', password: '123456' });
  assert(login3.status === 200 && login3.body.token, '站长登录');
  stationToken = login3.body.token;

  const loginFail = await request('POST', '/auth/login', { username: 'zhang', password: 'wrong' });
  assert(loginFail.status === 401, '错误密码登录失败');

  console.log('\n2. 备件领用测试');
  const checkouts = await request('GET', '/checkouts', null, auth(techToken));
  assert(checkouts.status === 200 && Array.isArray(checkouts.body), '获取领用列表');

  const woList = await request('GET', '/work-orders', null, auth(techToken));
  assert(woList.status === 200, '获取工单列表');
  const myWo = woList.body.find(w => w.status === 'pending');

  if (myWo) {
    const parts = await request('GET', '/parts', null, auth(techToken));
    const part = parts.body[0];

    const checkout1 = await request('POST', '/checkouts', {
      work_order_id: myWo.id, spare_part_id: part.id, qty: 1
    }, auth(techToken));
    assert(checkout1.status === 201, '正常领用');

    const checkout2 = await request('POST', '/checkouts', {
      work_order_id: myWo.id, spare_part_id: part.id, qty: 1
    }, auth(techToken));
    assert(checkout2.status === 400 && checkout2.body.error?.includes('重复领用原因'), '重复领用需填写原因');

    const checkout3 = await request('POST', '/checkouts', {
      work_order_id: myWo.id, spare_part_id: part.id, qty: 1, reason: '第一次领用备件损坏，需重新领用'
    }, auth(techToken));
    assert(checkout3.status === 201, '填写原因后重复领用成功');
  }

  console.log('\n3. 安装确认测试');
  const coList = await request('GET', '/checkouts?status=checked_out', null, auth(techToken));
  if (coList.body.length > 0) {
    const co = coList.body[0];
    const install = await request('POST', `/recovery/${co.id}/install`, { notes: '安装完成' }, auth(techToken));
    assert(install.status === 201 && install.body.message?.includes('旧件'), '安装确认并提醒旧件回收');
  }

  console.log('\n4. 旧件回收测试');
  const pendingOld = await request('GET', '/recovery/pending', null, auth(techToken));
  assert(pendingOld.status === 200, '获取待回收旧件列表');

  console.log('\n5. 退回测试');
  const installedCo = await request('GET', '/checkouts?status=installed', null, auth(techToken));
  if (installedCo.body.length > 0) {
    const ret = await request('POST', `/returns/${installedCo.body[0].id}/return`, {
      returned_qty: 1, condition: 'good', reason: '备件完好退回'
    }, auth(techToken));
    assert(ret.status === 201, '备件完好退回');
  }

  console.log('\n6. 报废测试 - 未完成工单不能报废');
  const inProgressCo = await request('GET', '/checkouts?status=installed', null, auth(techToken));
  if (inProgressCo.body.length > 0) {
    const scrapFail = await request('POST', `/scraps/${inProgressCo.body[0].id}/scrap`, {
      scrap_qty: 1, reason: '测试'
    }, auth(stationToken));
    assert(scrapFail.status === 400 || scrapFail.status === 403, '未完成工单不允许报废');
  }

  console.log('\n7. 师傅端测试');
  const unreturned = await request('GET', '/technician/unreturned', null, auth(techToken));
  assert(unreturned.status === 200, '师傅查看未归还备件');

  const reminders = await request('GET', '/technician/old-part-reminders', null, auth(techToken));
  assert(reminders.status === 200, '师傅查看旧件回收提醒');

  const dashboard = await request('GET', '/technician/dashboard', null, auth(techToken));
  assert(dashboard.status === 200, '师傅仪表盘');

  console.log('\n8. 库管端测试');
  const flows = await request('GET', '/warehouse/flows', null, auth(warehouseToken));
  assert(flows.status === 200, '查看库存流水');

  const stock = await request('GET', '/warehouse/stock-summary', null, auth(warehouseToken));
  assert(stock.status === 200, '查看库存汇总');

  console.log('\n9. 站长端测试');
  const unretStation = await request('GET', '/station/unreturned', null, auth(stationToken));
  assert(unretStation.status === 200, '站长查看未归还');

  const oldMissing = await request('GET', '/station/old-part-missing', null, auth(stationToken));
  assert(oldMissing.status === 200, '站长查看旧件缺失');

  const scrapPending = await request('GET', '/station/scrap-pending', null, auth(stationToken));
  assert(scrapPending.status === 200, '站长查看报废审批');

  const risk = await request('GET', '/station/inventory-risk', null, auth(stationToken));
  assert(risk.status === 200 && risk.body.technician_risks, '站长查看跨师傅库存风险');

  console.log('\n10. 权限控制测试');
  const techAccessWarehouse = await request('GET', '/warehouse/flows', null, auth(techToken));
  assert(techAccessWarehouse.status === 403, '师傅无权访问库管接口');

  const techAccessStation = await request('GET', '/station/inventory-risk', null, auth(techToken));
  assert(techAccessStation.status === 403, '师傅无权访问站长接口');

  console.log('\n11. 工单状态管理测试');
  const allWo = await request('GET', '/work-orders', null, auth(techToken));
  const pendingWo = allWo.body.find(w => w.status === 'pending');
  if (pendingWo) {
    const closeFail = await request('PUT', `/work-orders/${pendingWo.id}/status`, { status: 'closed' }, auth(techToken));
    assert(closeFail.status === 400, '未完成工单不能直接关闭');

    const complete = await request('PUT', `/work-orders/${pendingWo.id}/status`, { status: 'in_progress' }, auth(techToken));
    assert(complete.status === 200, '工单状态更新');
  }

  console.log('\n' + '='.repeat(50));
  console.log(`测试结果: ${passed} 通过, ${failed} 失败, 共 ${passed + failed} 项`);
  console.log('='.repeat(50));

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => {
  console.error('测试执行失败:', e);
  process.exit(1);
});
