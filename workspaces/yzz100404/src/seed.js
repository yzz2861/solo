const { loadDB, getDB } = require('./db');
const dayjs = require('dayjs');

const seed = async () => {
  await loadDB();
  const db = getDB();

  db.prepare('DELETE FROM order_timeline').run();
  db.prepare('DELETE FROM fault_orders').run();
  db.prepare('DELETE FROM charging_piles').run();
  db.prepare('DELETE FROM repairers').run();
  db.prepare('DELETE FROM operators').run();

  const piles = [
    { pile_no: 'A001', location: '1号楼东侧', pile_type: '直流快充', batch_no: 'BATCH-2023-001' },
    { pile_no: 'A002', location: '1号楼东侧', pile_type: '直流快充', batch_no: 'BATCH-2023-001' },
    { pile_no: 'A003', location: '2号楼北侧', pile_type: '直流快充', batch_no: 'BATCH-2023-001' },
    { pile_no: 'B001', location: '3号楼西侧', pile_type: '交流慢充', batch_no: 'BATCH-2023-002' },
    { pile_no: 'B002', location: '3号楼西侧', pile_type: '交流慢充', batch_no: 'BATCH-2023-002' },
    { pile_no: 'B003', location: '4号楼南侧', pile_type: '交流慢充', batch_no: 'BATCH-2023-002' },
    { pile_no: 'C001', location: '地下车库B1-01', pile_type: '直流快充', batch_no: 'BATCH-2024-001' },
    { pile_no: 'C002', location: '地下车库B1-02', pile_type: '直流快充', batch_no: 'BATCH-2024-001' },
  ];

  const insertPile = db.prepare('INSERT INTO charging_piles (pile_no, location, pile_type, batch_no, status, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  const pileIds = {};
  piles.forEach(p => {
    const result = insertPile.run(p.pile_no, p.location, p.pile_type, p.batch_no, 'available', dayjs().subtract(30, 'day').format());
    pileIds[p.pile_no] = result.lastInsertRowid;
  });

  const repairers = [
    { name: '张师傅', phone: '13800138001' },
    { name: '李师傅', phone: '13800138002' },
    { name: '王师傅', phone: '13800138003' },
  ];

  const insertRepairer = db.prepare('INSERT INTO repairers (name, phone, created_at) VALUES (?, ?, ?)');
  const repairerIds = [];
  repairers.forEach(r => {
    const result = insertRepairer.run(r.name, r.phone, dayjs().subtract(60, 'day').format());
    repairerIds.push(result.lastInsertRowid);
  });

  const operators = [
    { name: '客服小王', role: 'customer_service', phone: '13900139001' },
    { name: '物业刘经理', role: 'property_manager', phone: '13900139002' },
    { name: '维修赵班长', role: 'repair_supervisor', phone: '13900139003' },
  ];

  const insertOperator = db.prepare('INSERT INTO operators (name, role, phone, created_at) VALUES (?, ?, ?, ?)');
  const operatorIds = [];
  operators.forEach(o => {
    const result = insertOperator.run(o.name, o.role, o.phone, dayjs().subtract(60, 'day').format());
    operatorIds.push(result.lastInsertRowid);
  });

  const addTimeline = (orderId, action, operatorName, detail, createdAt) => {
    db.prepare(`
      INSERT INTO order_timeline (order_id, action, operator, detail, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(orderId, action, operatorName, detail || null, createdAt);
  };

  const orders = [
    {
      pile_no: 'A001', description: '屏幕无显示，无法启动', reporter: '业主张三', reporter_phone: '13500135001',
      status: 'completed', repairer_idx: 0, reviewer_idx: 1,
      repair_result: '更换主板后恢复正常', review_comment: '复核通过，设备运行正常',
      created_at: dayjs().subtract(20, 'day').hour(9).minute(30),
      repair_at: dayjs().subtract(20, 'day').hour(14).minute(0),
      review_at: dayjs().subtract(19, 'day').hour(10).minute(0),
    },
    {
      pile_no: 'A002', description: '充电枪锁扣损坏', reporter: '业主李四', reporter_phone: '13500135002',
      status: 'completed', repairer_idx: 1, reviewer_idx: 1,
      repair_result: '更换充电枪锁扣组件', review_comment: '复核通过',
      created_at: dayjs().subtract(15, 'day').hour(10).minute(15),
      repair_at: dayjs().subtract(15, 'day').hour(15).minute(30),
      review_at: dayjs().subtract(14, 'day').hour(9).minute(0),
    },
    {
      pile_no: 'B001', description: '充电中途自动断电', reporter: '业主王五', reporter_phone: '13500135003',
      status: 'completed', repairer_idx: 0, reviewer_idx: 1,
      repair_result: '散热风扇故障导致过热保护，更换风扇', review_comment: '复核通过',
      created_at: dayjs().subtract(10, 'day').hour(8).minute(45),
      repair_at: dayjs().subtract(9, 'day').hour(11).minute(0),
      review_at: dayjs().subtract(9, 'day').hour(16).minute(0),
    },
    {
      pile_no: 'B002', description: '刷卡无反应', reporter: '业主赵六', reporter_phone: '13500135004',
      status: 'completed', repairer_idx: 2, reviewer_idx: 1,
      repair_result: '读卡器模块松动，重新插拔固定', review_comment: '复核通过',
      created_at: dayjs().subtract(8, 'day').hour(11).minute(20),
      repair_at: dayjs().subtract(8, 'day').hour(16).minute(45),
      review_at: dayjs().subtract(7, 'day').hour(10).minute(30),
    },
    {
      pile_no: 'A001', description: '屏幕无显示，无法启动', reporter: '业主钱七', reporter_phone: '13500135005',
      status: 'completed', repairer_idx: 0, reviewer_idx: 1,
      repair_result: '电源模块故障，更换电源板', review_comment: '复核通过，该批次设备故障率偏高，建议排查',
      created_at: dayjs().subtract(5, 'day').hour(7).minute(50),
      repair_at: dayjs().subtract(4, 'day').hour(9).minute(30),
      review_at: dayjs().subtract(4, 'day').hour(14).minute(15),
    },
    {
      pile_no: 'C001', description: '充电枪无法拔出', reporter: '业主孙八', reporter_phone: '13500135006',
      status: 'reviewing', repairer_idx: 2, reviewer_idx: null,
      repair_result: '电磁锁故障，已临时解锁，待更换配件', review_comment: null,
      created_at: dayjs().subtract(2, 'day').hour(13).minute(10),
      repair_at: dayjs().subtract(1, 'day').hour(10).minute(0),
      review_at: null,
    },
    {
      pile_no: 'B003', description: '充电功率不足，充电很慢', reporter: '业主周九', reporter_phone: '13500135007',
      status: 'repairing', repairer_idx: 1, reviewer_idx: null,
      repair_result: null, review_comment: null,
      created_at: dayjs().subtract(1, 'day').hour(15).minute(40),
      repair_at: null,
      review_at: null,
    },
    {
      pile_no: 'C002', description: '启动后立即报错E003', reporter: '业主吴十', reporter_phone: '13500135008',
      status: 'assigned', repairer_idx: 0, reviewer_idx: null,
      repair_result: null, review_comment: null,
      created_at: dayjs().subtract(6, 'hour').hour(9).minute(25),
      repair_at: null,
      review_at: null,
    },
    {
      pile_no: 'A003', description: '急停按钮无法复位', reporter: '业主郑十一', reporter_phone: '13500135009',
      status: 'pending', repairer_idx: null, reviewer_idx: null,
      repair_result: null, review_comment: null,
      created_at: dayjs().subtract(2, 'hour'),
      repair_at: null,
      review_at: null,
    },
  ];

  const insertOrder = db.prepare(`
    INSERT INTO fault_orders (order_no, pile_id, description, reporter, reporter_phone, status, repairer_id, repair_result, repair_at, reviewer_id, review_comment, review_at, deadline, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updatePileStatus = db.prepare('UPDATE charging_piles SET status = ? WHERE id = ?');

  let orderCounter = 1;
  orders.forEach(o => {
    const pileId = pileIds[o.pile_no];
    const orderNo = `${o.created_at.format('YYYYMMDD')}${String(orderCounter).padStart(4, '0')}`;
    orderCounter++;

    const deadline = o.created_at.add(24, 'hour').format();
    const repairerId = o.repairer_idx !== null ? repairerIds[o.repairer_idx] : null;
    const reviewerId = o.reviewer_idx !== null ? operatorIds[o.reviewer_idx] : null;

    const result = insertOrder.run(
      orderNo, pileId, o.description, o.reporter, o.reporter_phone || null,
      o.status, repairerId, o.repair_result, o.repair_at ? o.repair_at.format() : null,
      reviewerId, o.review_comment, o.review_at ? o.review_at.format() : null,
      deadline, o.created_at.format()
    );
    const orderId = result.lastInsertRowid;

    addTimeline(orderId, 'report', o.reporter, `故障上报：${o.description}`, o.created_at.format());

    if (o.status === 'assigned' || o.status === 'repairing' || o.status === 'reviewing' || o.status === 'completed') {
      const assignTime = o.created_at.add(30, 'minute');
      addTimeline(orderId, 'assign', '客服小王', `派单给维修工：${repairers[o.repairer_idx].name}`, assignTime.format());
    }

    if (o.status === 'repairing' || o.status === 'reviewing' || o.status === 'completed') {
      const startRepairTime = o.created_at.add(2, 'hour');
      addTimeline(orderId, 'start_repair', repairers[o.repairer_idx].name, '开始处理', startRepairTime.format());
    }

    if ((o.status === 'reviewing' || o.status === 'completed') && o.repair_at) {
      addTimeline(orderId, 'submit_review', repairers[o.repairer_idx].name, `处理完成，提交复核：${o.repair_result}`, o.repair_at.format());
    }

    if (o.status === 'completed' && o.review_at) {
      addTimeline(orderId, 'review_pass', operators[o.reviewer_idx].name, `复核通过${o.review_comment ? '：' + o.review_comment : ''}`, o.review_at.format());
    }

    if (o.status === 'pending') {
      updatePileStatus.run('out_of_service', pileId);
    } else if (o.status === 'assigned' || o.status === 'repairing' || o.status === 'reviewing') {
      updatePileStatus.run('under_repair', pileId);
    }
  });

  console.log('示例数据初始化完成！');
  console.log(`已创建 ${piles.length} 个充电桩`);
  console.log(`已创建 ${repairers.length} 名维修工`);
  console.log(`已创建 ${operators.length} 名操作员`);
  console.log(`已创建 ${orders.length} 条故障工单（含时间线记录）`);
};

seed();
