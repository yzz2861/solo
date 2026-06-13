const { initDb, prepare, closeDb, saveDb } = require('../db/database');

function datetimeNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

(async () => {
  await initDb();

  console.log('正在填充演示数据...\n');

  const caseData = [
    {
      case_number: '(2026)京0101民初1001号',
      case_name: '张某诉李某房屋买卖合同纠纷案',
      case_type: '民事',
      presiding_judge: '王法官',
      sensitive_remark: '涉及当事人隐私，庭审过程中禁止录音录像'
    },
    {
      case_number: '(2026)京0101刑初2003号',
      case_name: '被告人王某盗窃案',
      case_type: '刑事',
      presiding_judge: '李法官',
      sensitive_remark: '未成年被告人，不公开审理'
    },
    {
      case_number: '(2026)京0101行初55号',
      case_name: '某科技公司诉市监局行政处罚案',
      case_type: '行政',
      presiding_judge: '赵法官',
      sensitive_remark: null
    },
    {
      case_number: '(2026)京0101民初888号',
      case_name: '某银行诉刘某金融借款合同纠纷案',
      case_type: '民事',
      presiding_judge: '陈法官',
      sensitive_remark: null
    }
  ];

  const caseIds = [];
  for (const c of caseData) {
    const stmt = prepare(`
      INSERT INTO cases (case_number, case_name, case_type, presiding_judge, sensitive_remark)
      VALUES (?, ?, ?, ?, ?)
    `);
    const r = stmt.run(c.case_number, c.case_name, c.case_type, c.presiding_judge, c.sensitive_remark);
    caseIds.push(r.lastInsertRowid);
    console.log(`  + 案件: ${c.case_number} - ${c.case_name}`);
  }

  const today = new Date();
  const fmtDate = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  };

  const hearingData = [
    { case_idx: 0, cr: 1, date: new Date(today), start: '09:00', end: '11:00', 1: 20, 2: 5, 3: 10 },
    { case_idx: 1, cr: 2, date: new Date(today), start: '09:30', end: '10:30', 1: 0, 2: 0, 3: 8 },
    { case_idx: 2, cr: 1, date: new Date(today), start: '14:00', end: '16:00', 1: 15, 2: 8, 3: 5 },
    { case_idx: 3, cr: 3, date: new Date(today), start: '10:00', end: '12:00', 1: 12, 2: 3, 3: 6 }
  ];

  const hearingIds = [];
  for (let i = 0; i < hearingData.length; i++) {
    const h = hearingData[i];
    const stmt = prepare(`
      INSERT INTO hearings (case_id, courtroom_id, hearing_date, start_time, end_time, status)
      VALUES (?, ?, ?, ?, ?, 'scheduled')
    `);
    const r = stmt.run(caseIds[h.case_idx], h.cr, fmtDate(h.date), h.start, h.end);
    const hid = r.lastInsertRowid;
    hearingIds.push(hid);

    for (let t = 1; t <= 3; t++) {
      prepare(`
        INSERT INTO hearing_seats (hearing_id, seat_type_id, total_seats)
        VALUES (?, ?, ?)
      `).run(hid, t, h[t] || 0);
    }
    console.log(`  + 场次 #${hid}: ${caseData[h.case_idx].case_number} @ 法庭${h.cr} ${fmtDate(h.date)} ${h.start}`);
  }

  const applicantData = [
    ['110101199001010011', '赵建国', '13800138001', null, '群众'],
    ['110101199102020022', '钱小美', '13900139002', '人民日报', '媒体'],
    ['110101199203030033', '孙国强', '13700137003', null, '群众'],
    ['110101199304040044', '李秀英', '13600136004', '新华社', '媒体'],
    ['110101199405050055', '周明远', '13500135005', null, '群众'],
    ['110101199506060066', '吴婷婷', '13400134006', null, '群众'],
    ['110101198807070077', '郑文博', '13300133007', '法院研究室', '内部'],
    ['110101198708080088', '王海燕', '13200132008', '法制日报', '媒体'],
    ['110101198609090099', '冯志明', '13100131009', null, '群众'],
    ['110101198510100100', '陈丽娟', '13000130010', '法院办公室', '内部'],
    ['110101198411110111', '褚卫东', '15800158011', null, '群众'],
    ['110101198312120122', '卫春花', '15900159012', null, '群众']
  ];

  const applicantIds = [];
  for (const a of applicantData) {
    const stmt = prepare(`
      INSERT INTO applicants (id_card, name, phone, organization, applicant_type)
      VALUES (?, ?, ?, ?, ?)
    `);
    const r = stmt.run(...a);
    applicantIds.push(r.lastInsertRowid);
  }
  console.log(`\n  + ${applicantIds.length} 位申请人`);

  const reservations = [
    { h_idx: 0, a_idx: 0, seat: 1, src: '群众预约', status: 'approved', v: 'arrived' },
    { h_idx: 0, a_idx: 1, seat: 2, src: '媒体申请', status: 'approved', v: 'arrived' },
    { h_idx: 0, a_idx: 2, seat: 1, src: '群众预约', status: 'approved', v: 'unverified' },
    { h_idx: 0, a_idx: 6, seat: 3, src: '内部安排', status: 'approved', v: 'unverified' },
    { h_idx: 0, a_idx: 4, seat: 1, src: '群众预约', status: 'pending', v: 'unverified' },
    { h_idx: 0, a_idx: 5, seat: 1, src: '群众预约', status: 'pending', v: 'unverified' },
    { h_idx: 0, a_idx: 7, seat: 2, src: '媒体申请', status: 'pending', v: 'unverified' },

    { h_idx: 2, a_idx: 8, seat: 1, src: '群众预约', status: 'approved', v: 'unverified' },
    { h_idx: 2, a_idx: 3, seat: 2, src: '媒体申请', status: 'approved', v: 'unverified' },
    { h_idx: 2, a_idx: 9, seat: 3, src: '内部安排', status: 'approved', v: 'unverified' },
    { h_idx: 2, a_idx: 10, seat: 1, src: '群众预约', status: 'rejected', v: 'unverified', reason: '曾有扰乱法庭秩序记录' },
    { h_idx: 2, a_idx: 11, seat: 1, src: '群众预约', status: 'pending', v: 'unverified' },

    { h_idx: 3, a_idx: 0, seat: 1, src: '群众预约', status: 'approved', v: 'unverified' },
    { h_idx: 3, a_idx: 1, seat: 2, src: '媒体申请', status: 'approved', v: 'unverified' },
    { h_idx: 3, a_idx: 6, seat: 3, src: '内部安排', status: 'approved', v: 'unverified' }
  ];

  const seatUpdateStmt = prepare(`
    UPDATE hearing_seats SET reserved_seats = reserved_seats + 1
    WHERE hearing_id = ? AND seat_type_id = ?
  `);

  let approvedCount = 0;
  for (const rv of reservations) {
    const hid = hearingIds[rv.h_idx];
    const aid = applicantIds[rv.a_idx];

    const stmt = prepare(`
      INSERT INTO reservations (
        hearing_id, applicant_id, seat_type_id, apply_source,
        review_status, review_reason, reviewer, reviewed_at,
        verification_status, verified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const reviewedAt = ['approved', 'rejected', 'merged'].includes(rv.status)
      ? datetimeNow() : null;
    const verifiedAt = rv.v === 'arrived' ? datetimeNow() : null;

    stmt.run(
      hid, aid, rv.seat, rv.src,
      rv.status, rv.reason || null,
      rv.status !== 'pending' ? '审核员' : null,
      reviewedAt,
      rv.v,
      verifiedAt
    );

    if (rv.status === 'approved') {
      seatUpdateStmt.run(hid, rv.seat);
      approvedCount++;
    }
  }

  console.log(`  + ${reservations.length} 条预约（${approvedCount} 条已通过）`);
  saveDb();
  closeDb();
  console.log('\n演示数据填充完成！');
})();
