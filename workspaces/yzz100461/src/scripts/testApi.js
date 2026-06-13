const http = require('http');

const BASE = 'http://localhost:3001/api/v1';

function fmtDateLocal(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: { raw: data } });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let createdCaseId = null;
let createdHearingId = null;
let createdReservationId = null;
let targetReservationId = null;

async function runTests() {
  const results = [];
  function test(name, fn) { results.push({ name, fn }); }

  console.log('='.repeat(60));
  console.log('  法院旁听预约核验 API  -  自动化测试');
  console.log('='.repeat(60) + '\n');

  test('01. 健康检查', async () => {
    const r = await request('GET', '/health');
    return r.status === 200 && r.body.code === 0;
  });

  test('02. 获取庭室列表', async () => {
    const r = await request('GET', '/courtrooms');
    return r.status === 200 && r.body.code === 0 && Array.isArray(r.body.data);
  });

  test('03. 获取席位类型', async () => {
    const r = await request('GET', '/seat-types');
    return r.status === 200 && r.body.data.length === 3;
  });

  test('04. 创建案件', async () => {
    const r = await request('POST', '/cases', {
      case_number: '(2026)京0101民初' + Date.now() % 10000 + '号',
      case_name: '测试合同纠纷案',
      case_type: '民事',
      presiding_judge: '测试法官',
      sensitive_remark: '测试敏感备注'
    });
    if (r.body.data) createdCaseId = r.body.data.id;
    return r.status === 200 && r.body.code === 0;
  });

  test('05. 查询案件列表', async () => {
    const r = await request('GET', '/cases?case_type=民事');
    return r.status === 200 && Array.isArray(r.body.data);
  });

  test('06. 创建场次', async () => {
    if (!createdCaseId) return false;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const dateStr = fmtDateLocal(tomorrow);
    const r = await request('POST', '/hearings', {
      case_id: createdCaseId,
      courtroom_id: 1,
      hearing_date: dateStr,
      start_time: '09:00',
      end_time: '11:00',
      seats: [
        { seat_type_id: 1, total_seats: 10 },
        { seat_type_id: 2, total_seats: 5 },
        { seat_type_id: 3, total_seats: 3 }
      ]
    });
    if (r.body.data) createdHearingId = r.body.data.id;
    return r.status === 200 && r.body.code === 0;
  });

  test('07. 预约申请 - 群众', async () => {
    if (!createdHearingId) return false;
    const r = await request('POST', '/reservations', {
      hearing_id: createdHearingId,
      id_card: '110101199909091234',
      name: '测试群众A',
      phone: '13900000001',
      applicant_type: '群众',
      seat_type_code: 'PUBLIC',
      apply_source: '群众预约'
    });
    if (r.body.data) createdReservationId = r.body.data.id;
    return r.status === 200 && r.body.code === 0;
  });

  test('08. 预约申请 - 媒体', async () => {
    if (!createdHearingId) return false;
    const r = await request('POST', '/reservations', {
      hearing_id: createdHearingId,
      id_card: '110101199909095678',
      name: '测试记者B',
      phone: '13900000002',
      organization: '测试日报',
      applicant_type: '媒体',
      seat_type_code: 'MEDIA',
      apply_source: '媒体申请'
    });
    if (r.body.data) targetReservationId = r.body.data.id;
    return r.status === 200 && r.body.code === 0;
  });

  test('09. 同一证件重复预约（应合并或报错）', async () => {
    if (!createdHearingId) return false;
    const r = await request('POST', '/reservations', {
      hearing_id: createdHearingId,
      id_card: '110101199909091234',
      name: '测试群众A',
      seat_type_code: 'PUBLIC',
      apply_source: '群众预约'
    });
    return r.status === 400 || (r.status === 200 && r.body.code === 400);
  });

  test('10. 审核通过 - 群众预约', async () => {
    if (!createdReservationId) return false;
    const r = await request('POST', `/reservations/${createdReservationId}/review`, {
      action: 'approve',
      reviewer: '测试书记员',
      reason: '符合旁听条件'
    });
    return r.status === 200 && r.body.code === 0 && r.body.data.review_status === 'approved';
  });

  test('11. 审核通过后席位计数正确', async () => {
    if (!createdHearingId) return false;
    const r = await request('GET', `/hearings/${createdHearingId}`);
    const pubSeat = r.body.data.seats.find(s => s.code === 'PUBLIC');
    return pubSeat.reserved_seats === 1 && pubSeat.total_seats === 10;
  });

  test('12. 合并预约（同证件多场次外的场景）', async () => {
    if (!createdHearingId) return false;
    const extra = await request('POST', '/reservations', {
      hearing_id: createdHearingId,
      id_card: '110101199909095678',
      name: '测试记者B',
      seat_type_code: 'MEDIA',
      apply_source: '媒体申请'
    });
    if (extra.status === 200 && extra.body.code === 0) {
      const r = await request('POST', `/reservations/${extra.body.data.id}/review`, {
        action: 'merge',
        merge_to_id: targetReservationId,
        reviewer: '测试书记员'
      });
      return r.status === 200 && r.body.code === 0;
    }
    return extra.status === 400;
  });

  test('13. 席位满员后无法继续通过', async () => {
    if (!createdHearingId) return false;
    const seat = { seat_type_id: 3, total_seats: 1 };
    await request('PUT', `/hearings/${createdHearingId}`, { seats: [seat] });

    const r1 = await request('POST', '/reservations', {
      hearing_id: createdHearingId,
      id_card: '110101197001011111',
      name: '内部人员一',
      seat_type_code: 'INTERNAL',
      apply_source: '内部安排'
    });
    await request('POST', `/reservations/${r1.body.data.id}/review`, { action: 'approve', reviewer: 'T' });

    const r2 = await request('POST', '/reservations', {
      hearing_id: createdHearingId,
      id_card: '110101197001012222',
      name: '内部人员二',
      seat_type_code: 'INTERNAL',
      apply_source: '内部安排'
    });
    const rev = await request('POST', `/reservations/${r2.body.data.id}/review`, {
      action: 'approve',
      reviewer: 'T'
    });
    return rev.status === 400 || rev.body.code === 400;
  });

  test('14. 批量审核场次', async () => {
    if (!createdHearingId) return false;
    await request('POST', '/reservations', {
      hearing_id: createdHearingId,
      id_card: '110101199001013333',
      name: '待审核甲',
      seat_type_code: 'PUBLIC',
      apply_source: '群众预约'
    });
    await request('POST', '/reservations', {
      hearing_id: createdHearingId,
      id_card: '110101199001014444',
      name: '待审核乙',
      seat_type_code: 'PUBLIC',
      apply_source: '群众预约'
    });

    const r = await request('POST', '/reservations/batch-review', {
      hearing_id: createdHearingId,
      reviewer: '测试批量审核'
    });
    return r.status === 200 && r.body.code === 0 && r.body.data.processed > 0;
  });

  test('15. 安检获取名单', async () => {
    if (!createdHearingId) return false;
    const r = await request('GET', `/security/list?hearing_id=${createdHearingId}`);
    return r.status === 200 && r.body.code === 0 && r.body.data.total >= 1;
  });

  test('16. 安检名单脱敏（默认）', async () => {
    if (!createdHearingId) return false;
    const r = await request('GET', `/security/list?hearing_id=${createdHearingId}`);
    const firstPerson = r.body.data.flat_list[0];
    if (!firstPerson) return false;
    const hasMask = firstPerson.id_card.includes('*') || firstPerson.name.includes('*');
    return hasMask;
  });

  test('17. 安检核验入场', async () => {
    const r = await request('POST', '/security/verify', {
      reservation_id: createdReservationId,
      action: 'arrive'
    });
    return r.status === 200 && r.body.code === 0 && r.body.data.verification_status === 'arrived';
  });

  test('18. 庭室短名单打印（文本格式）', async () => {
    const cr = await request('GET', '/courtrooms');
    const crId = cr.body.data[0]?.id || 1;
    const today = fmtDateLocal(new Date());
    const r = await request('GET', `/security/short-list/${crId}/${today}?format=text`);
    return r.status === 200 && typeof r.body.raw === 'string';
  });

  test('19. 闭庭批量处理（已通过→待通知）', async () => {
    if (!createdHearingId) return false;
    const r = await request('POST', `/hearings/${createdHearingId}/close`, {
      reason: '合议庭临时评议，本次庭审闭庭改期',
      operator: '测试管理员'
    });
    const ok = r.status === 200 && r.body.code === 0;
    if (ok) {
      const check = await request('GET', `/reservations/${createdReservationId}`);
      return check.body.data.review_status === 'pending_notice';
    }
    return false;
  });

  test('20. 改期后席位已释放', async () => {
    if (!createdHearingId) return false;
    const r = await request('GET', `/hearings/${createdHearingId}`);
    const pubSeat = r.body.data.seats.find(s => s.code === 'PUBLIC');
    return pubSeat.reserved_seats === 0;
  });

  test('21. 重新确认通知（改期后再通过）', async () => {
    if (!createdHearingId) return false;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    const dateStr = fmtDateLocal(tomorrow);
    await request('POST', `/hearings/${createdHearingId}/reschedule`, {
      new_hearing_date: dateStr,
      new_start_time: '10:00',
      reason: '改期至新时间',
      operator: '测试管理员'
    });
    const r = await request('POST', '/hearings/confirm-notice', {
      hearing_id: createdHearingId,
      action: 'reapprove'
    });
    return r.status === 200 && r.body.code === 0;
  });

  test('22. 爽约标记', async () => {
    const r = await request('POST', '/security/verify', {
      reservation_id: createdReservationId,
      action: 'no_show'
    });
    return r.status === 200 && r.body.code === 0 && r.body.data.verification_status === 'no_show';
  });

  test('23. 书记员查询记录（含筛选）', async () => {
    const r = await request('GET', '/records/query?verification_status=arrived,no_show&page_size=10');
    return r.status === 200 && r.body.code === 0;
  });

  test('24. 导出驳回记录（JSON）', async () => {
    const r = await request('GET', '/records/export?type=rejected&format=json');
    return r.status === 200 && r.body.code === 0;
  });

  test('25. 统计报表', async () => {
    const r = await request('GET', '/records/stats?group_by=seat_type');
    return r.status === 200 && r.body.code === 0 && Array.isArray(r.body.data.groups);
  });

  test('26. 安检核验统计', async () => {
    const today = fmtDateLocal(new Date());
    const r = await request('GET', `/security/stats?date=${today}`);
    return r.status === 200 && r.body.code === 0 && Array.isArray(r.body.data);
  });

  const sep = () => console.log('-' * 60);

  let passed = 0;
  let failed = 0;

  for (const t of results) {
    sep();
    process.stdout.write(`  ${t.name} ... `);
    try {
      const ok = await t.fn();
      if (ok) {
        console.log('\x1b[32m通过\x1b[0m');
        passed++;
      } else {
        console.log('\x1b[31m失败\x1b[0m');
        failed++;
      }
    } catch (e) {
      console.log('\x1b[31m异常:', e.message, '\x1b[0m');
      failed++;
    }
  }

  sep();
  console.log('\n' + '='.repeat(60));
  console.log(`  测试完成: \x1b[32m通过 ${passed}\x1b[0m / \x1b[31m失败 ${failed}\x1b[0m / 共 ${results.length}`);
  console.log('='.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('测试执行失败:', err.message);
  console.log('\n提示: 请先运行 `npm start` 启动服务，再运行 `npm test`');
  process.exit(1);
});
