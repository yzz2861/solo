const http = require('http')

const BASE_URL = 'localhost'
const PORT = 3000

let cache: any = {}

function request(method: string, path: string, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined
    const options: any = {
      hostname: BASE_URL,
      port: PORT,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
    }
    if (data) options.headers['Content-Length'] = Buffer.byteLength(data)
    const req = http.request(options, (res: any) => {
      let raw = ''
      res.on('data', (c: any) => (raw += c))
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: raw ? JSON.parse(raw) : null })
        } catch {
          resolve({ status: res.statusCode, data: raw })
        }
      })
    })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

const log = (t: string) => console.log(`\n${'─'.repeat(60)}\n${t}\n${'─'.repeat(60)}`)
const pass = (s: any) => s.status >= 200 && s.status < 300 && (s.data?.code === 0 || !s.data?.code)
const print = (label: string, s: any) => console.log(`  ${pass(s) ? '✅' : '❌'} ${label}  [${s.status}] ${s.data?.message || (typeof s.data === 'object' ? '' : s.data)}`)

async function initData() {
  log('📚 第一步：获取基础数据（测试各路由的 GET）')
  let r

  r = await request('GET', '/api/base/grades')
  print('获取年级列表', r)
  cache.grade1 = r.data.data.find((g: any) => g.name === '一年级')
  cache.grade2 = r.data.data.find((g: any) => g.name === '二年级')
  cache.grade3 = r.data.data.find((g: any) => g.name === '三年级')

  r = await request('GET', `/api/base/classes?gradeId=${cache.grade1.id}`)
  print('获取一年级班级列表', r)
  cache.class1_1 = r.data.data.find((c: any) => c.name === '(1)班')
  cache.class1_2 = r.data.data.find((c: any) => c.name === '(2)班')

  r = await request('GET', `/api/base/classes?gradeId=${cache.grade2.id}`)
  cache.class2_1 = r.data.data.find((c: any) => c.name === '(1)班')
  r = await request('GET', `/api/base/classes?gradeId=${cache.grade3.id}`)
  cache.class3_1 = r.data.data.find((c: any) => c.name === '(1)班')

  r = await request('GET', '/api/base/courses')
  print('获取课程列表', r)

  r = await request('GET', '/api/base/suppliers')
  print('获取供应商列表', r)

  r = await request('GET', '/api/base/textbooks')
  print('获取教材版本列表', r)
  cache.tb_chn = r.data.data.find((t: any) => t.course.name === '语文' && t.edition.includes('2024'))
  cache.tb_math = r.data.data.find((t: any) => t.course.name === '数学')
  cache.tb_eng = r.data.data.find((t: any) => t.course.name === '英语')
}

async function testAdmin() {
  log('🏫 第二步：教务端核心功能测试')
  let r

  r = await request('GET', '/api/admin/orders?term=' + encodeURIComponent('2025秋季'))
  print('查询订单列表（2025秋季）', r)
  cache.orders = r.data.data

  const order_class1_1_chn = cache.orders.find(
    (o: any) => o.classId === cache.class1_1.id && o.textbook.course.name === '语文'
  )
  const order_class1_1_math = cache.orders.find(
    (o: any) => o.classId === cache.class1_1.id && o.textbook.course.name === '数学'
  )
  const order_class2_1_chn = cache.orders.find(
    (o: any) => o.classId === cache.class2_1.id && o.textbook.course.name === '语文'
  )
  cache.order1 = order_class1_1_chn
  cache.order2 = order_class1_1_math
  cache.order3 = order_class2_1_chn

  r = await request('GET', `/api/admin/classes/${cache.class1_1.id}/progress?term=` + encodeURIComponent('2025秋季'))
  print('查询一(1)班教材征订进度', r)

  r = await request('GET', '/api/admin/progress/summary?term=' + encodeURIComponent('2025秋季'))
  print('教务汇总：各年级进度统计', r)

  r = await request('POST', '/api/admin/orders/supplement', {
    orderId: order_class1_1_chn.id, qty: 1, operator: '教务-王主任', reason: '合并补订-漏掉1人',
  })
  print('重复补订合并：一(1)班语文再补1本', r)

  r = await request('GET', `/api/admin/orders/${order_class1_1_chn.id}/trace`)
  print('版本变更追溯链（订单变更历史）', r)
}

async function testWarehouse() {
  log('📦 第三步：库房端功能测试')
  let r

  r = await request('GET', '/api/warehouse/pending-deliveries')
  print('查看仍有缺书的班级教材清单', r)

  r = await request('GET', '/api/warehouse/to-ship')
  print('库房待发书清单（已到货未签收）', r)

  r = await request('GET', '/api/warehouse/shortage-print?date=2025-08-30')
  print('8月30日 按班级打印缺书清单', r)
  const shortage = r.data.data
  for (const [cls, items] of Object.entries(shortage.shortages || {})) {
    console.log(`\n    📋 ${cls} 缺书:`)
    for (const it of items as any) {
      console.log(`       ${it.course} ${it.edition} | 订${it.ordered} 到${it.arrived} 缺${it.shortage}${it.isTransfer ? ` 【含转学生${it.transferCount}人】` : ''}`)
    }
  }

  r = await request('GET', '/api/warehouse/supplier-diff')
  print('供应商到货差异查询', r)
  for (const d of r.data.data) {
    console.log(`    ${d.supplier} / ${d.course} ${d.edition} | 订${d.ordered} 到${d.delivered} 差${d.diff}`)
  }
}

async function testTeacher() {
  log('👩‍🏫 第四步：班主任签收 + 转学生标记')
  let r

  r = await request('GET', `/api/teacher/classes/${cache.class1_1.id}/transfers-with-orders`)
  print('一(1)班 转学生 + 关联补订记录', r)
  for (const t of r.data.data) {
    console.log(`    转学生: ${t.name}`)
    for (const o of t.orders) {
      console.log(`      → ${o.course} ${o.edition} 补了${o.qty}册`)
    }
  }

  const TERM = '2025秋季'
  r = await request('GET', `/api/admin/orders?term=${encodeURIComponent(TERM)}&classId=${cache.class2_1.id}`)
  const ordersToSign = r.data.data.filter((o: any) => o.deliveredQty > 0)
  const signItems = ordersToSign.map((o: any) => ({
    orderId: o.id, textbookId: o.textbookId,
    actualQty: Math.min(o.deliveredQty - o.receivedQty, o.finalQty - o.receivedQty),
    isTransfer: o.supplementQty > 0,
  }))
  console.log('\n    准备签收的项目:')
  signItems.forEach((i: any) => console.log(`      ${JSON.stringify(i)}`))

  r = await request('POST', '/api/teacher/receipts', {
    classId: cache.class2_1.id,
    receiptDate: '2025-08-30',
    items: signItems,
    operator: '库房-老孙',
    remark: '开学第一天发书',
  })
  if (!pass(r)) {
    console.log(`    ❌ 签收失败: ${r.data?.message}`)
  } else {
    print('创建二(1)班签收单（关联转学生标记）', r)
    const receiptId = r.data.data.id
    r = await request('POST', `/api/teacher/receipts/${receiptId}/sign`, {
      signedBy: '王老师', signedAt: '2025-08-30T15:00:00',
    })
    print('王老师电子签名确认签收', r)
  }

  r = await request('POST', '/api/teacher/receipts', {
    classId: cache.class1_1.id,
    receiptDate: '2025-08-30',
    items: [{ orderId: cache.order1.id, textbookId: cache.tb_chn.id, actualQty: 9999 }],
    operator: '测试',
  })
  console.log(`\n    🛡️  安全校验-误算未到书为已发: ${!pass(r) ? '✅ 被拦截 ✓' : '❌ 泄漏!'}`)
  if (!pass(r)) console.log(`       拦截原因: ${r.data?.message}`)
}

async function testPrincipal() {
  log('🎓 第五步：校长端汇总与导出')
  let r

  r = await request('GET', '/api/principal/dashboard/summary?term=' + encodeURIComponent('2025秋季'))
  print('校长总览仪表盘', r)
  console.log(JSON.stringify(r.data.data, null, 4).split('\n').map(l => '    ' + l).join('\n'))

  r = await request('GET', '/api/principal/dashboard/by-course?term=' + encodeURIComponent('2025秋季'))
  print('按课程维度汇总征订、补订、退订、缺书', r)
  for (const c of r.data.data) {
    console.log(`    ${c.course.padEnd(4)} | 订${String(c.finalQty).padEnd(4)} 补${String(c.supplementQty).padEnd(3)} 退${String(c.returnQty).padEnd(3)} 缺${String(c.shortageQty).padEnd(3)}`)
  }

  r = await request('GET', '/api/principal/export/shortage.xlsx?term=' + encodeURIComponent('2025秋季'))
  console.log(`\n    📊 缺书清单 Excel: ${r.status === 200 ? '✅ 导出成功' : '❌ 失败'} 长度=${Buffer.isBuffer(r.data) ? r.data.length : typeof r.data}`)

  r = await request('GET', '/api/principal/export/returns.xlsx?term=' + encodeURIComponent('2025秋季'))
  console.log(`    📊 退订明细 Excel: ${r.status === 200 ? '✅ 导出成功' : '❌ 失败'}`)

  r = await request('GET', '/api/principal/export/supplier-diff.xlsx?term=' + encodeURIComponent('2025秋季'))
  console.log(`    📊 供应商差异 Excel: ${r.status === 200 ? '✅ 导出成功' : '❌ 失败'}`)

  r = await request('GET', '/api/principal/export/transfers.xlsx?term=' + encodeURIComponent('2025秋季'))
  console.log(`    📊 转学生名单 Excel: ${r.status === 200 ? '✅ 导出成功' : '❌ 失败'}`)
}

async function main() {
  console.log(`\n🚀 教材征订补订服务 - 完整端到端测试\n   目标服务: http://${BASE_URL}:${PORT}\n`)
  try {
    const health = await request('GET', '/health')
    if (!pass(health)) {
      console.log('❌ 服务未启动，请先运行: npm run dev')
      process.exit(1)
    }
    console.log('✅ 服务健康检查通过')
    await initData()
    await testAdmin()
    await testWarehouse()
    await testTeacher()
    await testPrincipal()
    log('🎯 全部测试用例执行完成')
  } catch (e: any) {
    console.error('\n❌ 测试异常:', e.message)
    process.exit(1)
  }
}

main()
