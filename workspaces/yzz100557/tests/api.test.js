const http = require('http');

const BASE = 'http://localhost:3000';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const opts = { method, hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let tokens = {};

async function test() {
  console.log('========== 餐饮来料验收退货API 测试 ==========\n');
  let failed = 0;
  let passed = 0;
  const assert = (name, cond, detail) => {
    if (cond) { passed++; console.log(`✅  ${name}`); }
    else { failed++; console.log(`❌  ${name}  ${detail || ''}`); }
  };

  // 1. 健康检查
  try {
    const r = await request('GET', '/health');
    assert('1. 健康检查通过', r.status === 200 && r.body.status === 'ok');
  } catch (e) {
    assert('1. 服务器连接', false, e.message);
    console.log('请先启动服务器: npm start');
    process.exit(1);
  }

  // 2. 登录测试
  const accounts = [
    ['admin', 'admin123', '管理员'],
    ['inspector1', 'inspect123', '验收员'],
    ['buyer1', 'buyer123', '采购员'],
    ['finance1', 'finance123', '财务'],
    ['chef1', 'chef123', '厨师长'],
    ['sup_veg001', 'supplier123', '供应商']
  ];
  for (const [u, p, n] of accounts) {
    const r = await request('POST', '/api/auth/login', { username: u, password: p });
    if (r.status === 200 && r.body.token) { tokens[u] = r.body.token; assert(`2.${accounts.indexOf([u,p,n])+1} ${n}登录成功`, true); }
    else { assert(`2. ${n}登录`, false, JSON.stringify(r.body)); }
  }
  console.log('');

  // 3. 核心 - 供应商列表
  let r3 = await request('GET', '/api/core/suppliers', null, tokens.admin);
  assert('3. 获取供应商列表', r3.status === 200 && Array.isArray(r3.body) && r3.body.length >= 3);

  // 4. 采购单列表
  let r4 = await request('GET', '/api/core/purchase-orders', null, tokens.buyer1);
  assert('4. 获取采购单列表', r4.status === 200 && Array.isArray(r4.body) && r4.body.length >= 1, `数量:${r4.body?.length}`);
  const samplePO = r4.body?.[0];
  console.log(`    示例采购单: ${samplePO?.po_no} / ${samplePO?.supplier_name} / ${samplePO?.status} / ¥${samplePO?.total_amount}`);

  // 5. 送货批次列表
  let r5 = await request('GET', '/api/core/deliveries', null, tokens.inspector1);
  assert('5. 获取送货批次列表', r5.status === 200 && Array.isArray(r5.body) && r5.body.length >= 2);
  const sampleDelivery = r5.body?.[0];
  console.log(`    示例批次: ${sampleDelivery?.batch_no} / ${sampleDelivery?.supplier_name} / 最终验收:${sampleDelivery?.is_final}`);

  // 6. 批次详情（含扣量+退货）
  let r6 = await request('GET', `/api/core/deliveries/${sampleDelivery?.id}`, null, tokens.inspector1);
  assert('6. 批次详情(含扣量+退货)', r6.status === 200 && r6.body.items, 'items:' + (r6.body?.items?.length || 0));

  // 7. 扣量记录列表
  let r7 = await request('GET', '/api/core/deductions', null, tokens.buyer1);
  assert('7. 扣量记录列表', r7.status === 200 && Array.isArray(r7.body), `扣量记录数:${r7.body?.length}`);
  const pendingDed = r7.body?.find(d => d.status === 'pending_replace' || d.status === 'partial_replaced');
  if (pendingDed) console.log(`    待补送扣量: ${pendingDed.material_name} 扣${pendingDed.deduction_qty}${pendingDed.unit} / 已补${pendingDed.replaced_qty}`);

  // 8. 退货列表
  let r8 = await request('GET', '/api/core/returns', null, tokens.inspector1);
  assert('8. 退货列表', r8.status === 200 && Array.isArray(r8.body), `退货单数:${r8.body?.length}`);

  // 9. 补送列表
  let r9 = await request('GET', '/api/core/replacements', null, tokens.buyer1);
  assert('9. 补送列表', r9.status === 200 && Array.isArray(r9.body), `补送单数:${r9.body?.length}`);
  console.log('');

  // 10. 采购看板
  let r10 = await request('GET', '/api/views/buyer/dashboard', null, tokens.buyer1);
  assert('10. 采购看板', r10.status === 200 && r10.body.summary, `待补扣量:${r10.body?.summary?.pending_deduction_count} 待补送:${r10.body?.summary?.pending_replacement_count}`);

  // 11. 采购追补送（不翻照片）
  let r11 = await request('GET', '/api/views/buyer/deductions-trace?status=pending', null, tokens.buyer1);
  assert('11. 采购追补送(扣量追溯)', r11.status === 200 && Array.isArray(r11.body));
  if (r11.body?.[0]) {
    const d = r11.body[0];
    console.log(`    追溯到: ${d.material_name} ${d.deduction_qty}${d.unit} 原因:${d.reason} 供应商:${d.supplier_name} ${d.supplier_phone} 照片:${d.photo_urls ? '有' : '无'}`);
  }

  // 12. 财务扣款
  let r12 = await request('GET', '/api/views/finance/deductions', null, tokens.finance1);
  assert('12. 财务扣款明细', r12.status === 200 && r12.body.totals, `总扣款:¥${r12.body?.totals?.total_deduction_value?.toFixed?.(2) || 0} 笔数:${r12.body?.totals?.deduction_count}`);

  // 13. 厨师长看板
  let r13 = await request('GET', '/api/views/chef/dashboard', null, tokens.chef1);
  assert('13. 厨师长看板(库存+质量)', r13.status === 200 && r13.body.stock_details,
    `物料数:${r13.body?.stock_details?.length} 质量问题:${r13.body?.today_quality_issues?.length}`);

  // 14. 验收员日汇总
  let r14 = await request('GET', '/api/views/inspector/daily-summary', null, tokens.inspector1);
  assert('14. 验收员按供应商汇总', r14.status === 200 && r14.body.by_supplier,
    `供应商数:${Object.keys(r14.body?.by_supplier || {}).length} 总扣量值:¥${r14.body?.grand_total?.total_deduction_value?.toFixed?.(2)}`);
  if (r14.body?.by_supplier?.[0]) {
    const s = r14.body.by_supplier[0];
    console.log(`    供应商汇总: ${s.supplier_name} 送货${s.delivery_count}次 扣量${s.total_deduction_count}笔¥${s.total_deduction_value.toFixed(2)} 退货${s.return_count}笔 待签收:${s.unsigned_return_count}`);
  }

  // 15. 供应商看板
  let r15 = await request('GET', '/api/views/supplier/dashboard', null, tokens.sup_veg001);
  assert('15. 供应商看板(待签收+扣量)', r15.status === 200 && r15.body.supplier, `待签收退货:${r15.body?.pending_sign_returns?.length} 扣量:${r15.body?.my_deductions?.length}`);

  // 16. 权限测试 - 无token
  let r16 = await request('GET', '/api/core/suppliers');
  assert('16. 无token访问被拒绝', r16.status === 401, r16.body?.error);

  // 17. 权限测试 - 角色越权
  let r17 = await request('POST', '/api/core/purchase-orders', { supplier_id: 1, items: [] }, tokens.finance1);
  assert('17. 财务无法创建采购单', r17.status === 403, r17.body?.error);

  // 18. 创建采购单
  const newPO = {
    supplier_id: 1,
    remarks: '测试采购单',
    items: [
      { material_code: 'TEST-001', material_name: '测试萝卜', category: 'vegetable', unit: 'kg', unit_price: 2.5, expected_qty: 50 },
      { material_code: 'TEST-002', material_name: '测试茄子', category: 'vegetable', unit: 'kg', unit_price: 5, expected_qty: 30 }
    ]
  };
  let r18 = await request('POST', '/api/core/purchase-orders', newPO, tokens.buyer1);
  assert('18. 创建采购单', r18.status === 201, r18.body?.po_no || r18.body?.error);
  const newPOId = r18.body?.id;

  // 19. 验收收货（含扣量）
  if (newPOId) {
    const now = new Date();
    const tStr = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0') + ':' + now.getSeconds().toString().padStart(2,'0');
    const delivery = {
      po_id: newPOId,
      supplier_id: 1,
      delivery_time: tStr,
      items: [
        { material_code: 'TEST-001', material_name: '测试萝卜', delivered_qty: 48, deduction_qty: 2, reason: 'weight_insufficient', description: '少2斤', deduction_reason: '称重不足' },
        { material_code: 'TEST-002', material_name: '测试茄子', delivered_qty: 30, deduction_qty: 0 }
      ]
    };
    let r19 = await request('POST', '/api/core/deliveries', delivery, tokens.inspector1);
    assert('19. 验收收货(自动扣量+重复收货提醒)', r19.status === 201,
      r19.body?.batch_no || (r19.body?.error + (r19.body?.warnings ? ' warnings:'+r19.body.warnings.length : '')));
    const batchNo = r19.body?.batch_no;
    const warnings = r19.body?.warnings || [];
    console.log(`    批次号: ${batchNo}  合并提醒: ${warnings.length}条`);

    // 20. 锁定批次后不可退货
    if (r19.body?.id) {
      const delId = r19.body.id;
      await request('POST', `/api/core/deliveries/${delId}/finalize`, {}, tokens.inspector1);
      const fakeReturn = {
        delivery_id: delId,
        supplier_id: 1,
        return_type: 'quality',
        items: [{ delivery_item_id: 1, material_code: 'TEST', material_name: 't', unit: 'kg', unit_price: 1, return_qty: 1 }]
      };
      let r20 = await request('POST', '/api/core/returns', fakeReturn, tokens.inspector1);
      assert('20. 已验收批次不能退货', r20.status === 400, r20.body?.error);
    }
  }

  // 21. 补送追溯 - 查看扣量详情
  if (pendingDed) {
    let r21 = await request('GET', `/api/core/deductions/${pendingDed.id}`, null, tokens.buyer1);
    assert('21. 扣量详情(带补送追溯链)', r21.status === 200 && r21.body.replacements !== undefined,
      `补送数:${r21.body?.replacements?.length} 退货引用:${r21.body?.return_items?.length}`);
  }

  console.log('\n========== 测试结果 ==========');
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`📊 总计: ${passed + failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

test().catch(e => { console.error('测试异常:', e); process.exit(1); });
