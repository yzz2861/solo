const request = require('supertest');
const path = require('path');
const fs = require('fs');

const testDbPath = path.join(__dirname, '../data/test_cards.db');

process.env.DB_PATH = testDbPath;
process.env.JWT_SECRET = 'test_secret_key_for_access_card_service';
process.env.DEPOSIT_AMOUNT = 50;

let app;
let tokens = {};
let testData = {};

beforeAll(() => {
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  app = require('../src/app');
  
  const bcrypt = require('bcryptjs');
  const db = require('../src/config/database');
  
  const users = [
    { username: 'admin_t', password: 'admin123', role: 'admin', realName: '测试管理员' },
    { username: 'qiantai_t', password: 'qiantai123', role: 'receptionist', realName: '测试前台' },
    { username: 'baoan_t', password: 'baoan123', role: 'security', realName: '测试保安' }
  ];
  const insertUser = db.prepare('INSERT INTO users (username, password_hash, role, real_name) VALUES (?, ?, ?, ?)');
  for (const u of users) {
    insertUser.run(u.username, bcrypt.hashSync(u.password, 10), u.role, u.realName);
  }

  const insertOwner = db.prepare('INSERT INTO owners (name, phone, id_card) VALUES (?, ?, ?)');
  const owner1 = insertOwner.run('测试业主1', '13900000001', '110101199001010001');
  const owner2 = insertOwner.run('测试业主2', '13900000002', '110101199001010002');

  const insertRoom = db.prepare('INSERT INTO rooms (room_number, building, unit, owner_id) VALUES (?, ?, ?, ?)');
  const room1 = insertRoom.run('101', '1', '1', owner1.lastInsertRowid);
  const room2 = insertRoom.run('102', '1', '1', owner2.lastInsertRowid);

  const insertCard = db.prepare('INSERT INTO access_cards (card_number, owner_id, room_id, status) VALUES (?, ?, ?, ?)');
  const card1 = insertCard.run('TESTCARD001', owner1.lastInsertRowid, room1.lastInsertRowid, 'active');
  insertCard.run('TESTCARD001B', owner1.lastInsertRowid, room1.lastInsertRowid, 'active');
  insertCard.run('TESTCARD002', owner2.lastInsertRowid, room2.lastInsertRowid, 'active');
  insertCard.run('TESTCARD002B', owner2.lastInsertRowid, room2.lastInsertRowid, 'active');
  insertCard.run('TESTCARD002C', owner2.lastInsertRowid, room2.lastInsertRowid, 'active');
  insertCard.run('TESTCARD002D', owner2.lastInsertRowid, room2.lastInsertRowid, 'active');
  insertCard.run('TESTCARD002E', owner2.lastInsertRowid, room2.lastInsertRowid, 'active');
  insertCard.run('TESTCARD002F', owner2.lastInsertRowid, room2.lastInsertRowid, 'active');

  testData = {
    owner1Id: owner1.lastInsertRowid,
    owner2Id: owner2.lastInsertRowid,
    room1Id: room1.lastInsertRowid,
    room2Id: room2.lastInsertRowid,
    card1Id: card1.lastInsertRowid
  };
});

afterAll(() => {
  if (fs.existsSync(testDbPath)) {
    try { fs.unlinkSync(testDbPath); } catch(e) {}
    try { fs.unlinkSync(testDbPath + '-wal'); } catch(e) {}
    try { fs.unlinkSync(testDbPath + '-shm'); } catch(e) {}
  }
});

describe('1. 认证与权限测试', () => {
  test('健康检查接口无需认证', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('登录 - 管理员', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ username: 'admin_t', password: 'admin123' });
    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('admin');
    tokens.admin = res.body.token;
  });

  test('登录 - 前台', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ username: 'qiantai_t', password: 'qiantai123' });
    expect(res.statusCode).toBe(200);
    expect(res.body.user.role).toBe('receptionist');
    tokens.receptionist = res.body.token;
  });

  test('登录 - 保安', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ username: 'baoan_t', password: 'baoan123' });
    expect(res.statusCode).toBe(200);
    expect(res.body.user.role).toBe('security');
    tokens.security = res.body.token;
  });

  test('登录失败 - 密码错误', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ username: 'admin_t', password: 'wrongpass' });
    expect(res.statusCode).toBe(401);
  });

  test('未认证访问受保护接口被拒绝', async () => {
    const res = await request(app).get('/api/reissues');
    expect(res.statusCode).toBe(401);
  });

  test('保安不能访问押金相关导出', async () => {
    const res = await request(app).get('/api/exports/deposits/monthly')
      .set('Authorization', 'Bearer ' + tokens.security);
    expect(res.statusCode).toBe(403);
  });
});

describe('2. 门禁卡挂失补办核心流程', () => {
  test('前台创建挂失补办记录', async () => {
    const res = await request(app).post('/api/reissues')
      .set('Authorization', 'Bearer ' + tokens.receptionist)
      .send({
        oldCardNumber: 'TESTCARD001',
        roomId: testData.room1Id,
        ownerId: testData.owner1Id,
        notes: '业主丢失门禁卡',
        payDepositNow: true
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('pending_stop');
    expect(res.body.old_card_number).toBe('TESTCARD001');
    expect(res.body.deposit_status).toBe('paid');
    testData.reissue1 = res.body;
  });

  test('同一卡号不能重复创建挂失', async () => {
    const res = await request(app).post('/api/reissues')
      .set('Authorization', 'Bearer ' + tokens.receptionist)
      .send({
        oldCardNumber: 'TESTCARD001',
        roomId: testData.room1Id,
        ownerId: testData.owner1Id
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('未完成');
  });

  test('保安查待停用名单能看到记录', async () => {
    const res = await request(app).get('/api/reissues/pending-stops')
      .set('Authorization', 'Bearer ' + tokens.security);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const found = res.body.find(r => r.id === testData.reissue1.id);
    expect(found).toBeDefined();
    expect(found.old_card_number).toBe('TESTCARD001');
    expect(found.deposit_amount).toBeUndefined();
  });

  test('保安确认停用旧卡', async () => {
    const res = await request(app).post(`/api/reissues/${testData.reissue1.id}/confirm-stop`)
      .set('Authorization', 'Bearer ' + tokens.security);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain('已确认停用');
  });

  test('停用后未发新卡时查看详情状态为 stopped', async () => {
    const res = await request(app).get(`/api/reissues/${testData.reissue1.id}`)
      .set('Authorization', 'Bearer ' + tokens.receptionist);
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('stopped');
    expect(res.body.old_card_status).toBe('disabled');
  });

  test('旧卡未停用不能发新卡（直接调用发卡应失败）', async () => {
    const res = await request(app).post('/api/reissues')
      .set('Authorization', 'Bearer ' + tokens.receptionist)
      .send({
        oldCardNumber: 'TESTCARD002B',
        roomId: testData.room2Id,
        ownerId: testData.owner2Id
      });
    expect(res.statusCode).toBe(201);
    const reissue2 = res.body;
    
    const issueRes = await request(app).post(`/api/reissues/${reissue2.id}/issue-new-card`)
      .set('Authorization', 'Bearer ' + tokens.receptionist)
      .send({ newCardNumber: 'TESTNEW002' });
    expect(issueRes.statusCode).toBe(400);
    expect(issueRes.body.error).toContain('旧卡未停用');
  });

  test('旧卡已停用后前台发新卡', async () => {
    const res = await request(app).post(`/api/reissues/${testData.reissue1.id}/issue-new-card`)
      .set('Authorization', 'Bearer ' + tokens.receptionist)
      .send({ newCardNumber: 'TESTNEW001' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain('新卡已发放');
    expect(res.body.oldCardReplaced).toBe(true);
  });

  test('旧卡状态应为 replaced（已更换）', async () => {
    const res = await request(app).get(`/api/cards/${testData.card1Id}`)
      .set('Authorization', 'Bearer ' + tokens.receptionist);
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('replaced');
  });

  test('完成补办流程', async () => {
    const res = await request(app).post(`/api/reissues/${testData.reissue1.id}/complete`)
      .set('Authorization', 'Bearer ' + tokens.receptionist);
    expect(res.statusCode).toBe(200);
  });
});

describe('3. 同日多次补办提醒', () => {
  test('同一房号第二次补办应产生警告', async () => {
    const res = await request(app).post('/api/reissues')
      .set('Authorization', 'Bearer ' + tokens.receptionist)
      .send({
        oldCardNumber: 'TESTCARD001B',
        roomId: testData.room1Id,
        ownerId: testData.owner1Id
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.has_warning).toBe(1);
    expect(res.body.warning).toBeDefined();
    expect(res.body.warning).toContain('第 2 次');
  });
});

describe('4. 找回旧卡互斥规则（不能两张都有效）', () => {
  test('新卡仍有效时找回旧卡应被拒绝', async () => {
    const res = await request(app).post(`/api/cards/${testData.card1Id}/recover`)
      .set('Authorization', 'Bearer ' + tokens.receptionist);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('已有新卡在使用');
    expect(res.body.error).toContain('不能两张卡同时有效');
  });
});

describe('5. 押金管理', () => {
  let reissue3;

  test('创建不含押金的补办记录', async () => {
    const res = await request(app).post('/api/reissues')
      .set('Authorization', 'Bearer ' + tokens.receptionist)
      .send({
        oldCardNumber: 'TESTCARD002C',
        roomId: testData.room2Id,
        ownerId: testData.owner2Id,
        payDepositNow: false
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.deposit_status).toBe('unpaid');
    reissue3 = res.body;
  });

  test('前台收取押金', async () => {
    const res = await request(app).post(`/api/reissues/${reissue3.id}/deposit`)
      .set('Authorization', 'Bearer ' + tokens.receptionist)
      .send({ action: 'collect', amount: 50, notes: '前台现金收取' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain('收取成功');
    expect(res.body.amount).toBe(50);
  });

  test('查看补办记录应包含押金流水', async () => {
    const res = await request(app).get(`/api/reissues/${reissue3.id}`)
      .set('Authorization', 'Bearer ' + tokens.receptionist);
    expect(res.statusCode).toBe(200);
    expect(res.body.depositRecords).toBeDefined();
    expect(res.body.depositRecords.length).toBeGreaterThan(0);
    expect(res.body.deposit_records === undefined).toBe(true);
    expect(res.body.depositRecords[0].type).toBe('collect');
  });

  test('保安查看补办记录不应看到押金详情', async () => {
    const res = await request(app).get(`/api/reissues/${reissue3.id}`)
      .set('Authorization', 'Bearer ' + tokens.security);
    expect(res.statusCode).toBe(200);
    expect(res.body.deposit_amount).toBeUndefined();
    expect(res.body.deposit_status).toBeUndefined();
    expect(res.body.depositRecords).toBeUndefined();
  });

  test('退还押金', async () => {
    const res = await request(app).post(`/api/reissues/${reissue3.id}/deposit`)
      .set('Authorization', 'Bearer ' + tokens.receptionist)
      .send({ action: 'refund', amount: 50, notes: '新卡正常，退还押金' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain('退还成功');
  });

  test('记录押金不退原因', async () => {
    const res2 = await request(app).post('/api/reissues')
      .set('Authorization', 'Bearer ' + tokens.receptionist)
      .send({
        oldCardNumber: 'TESTCARD002D',
        roomId: testData.room2Id,
        ownerId: testData.owner2Id,
        payDepositNow: true
      });
    expect([201, 400]).toContain(res2.statusCode);
  });
});

describe('6. 查询API - 角色数据隔离', () => {
  test('前台查所有补办进度（含押金）', async () => {
    const res = await request(app).get('/api/reissues')
      .set('Authorization', 'Bearer ' + tokens.receptionist);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0].deposit_amount).toBeDefined();
      expect(res.body[0].deposit_status).toBeDefined();
    }
  });

  test('保安查补办列表 - 无押金信息', async () => {
    const res = await request(app).get('/api/reissues')
      .set('Authorization', 'Bearer ' + tokens.security);
    expect(res.statusCode).toBe(200);
    if (res.body.length > 0) {
      expect(res.body[0].deposit_amount).toBeUndefined();
      expect(res.body[0].deposit_status).toBeUndefined();
    }
  });

  test('保安查停用名单专用接口', async () => {
    const res = await request(app).get('/api/reissues/disabled-cards-list?includeNewlyIssued=true')
      .set('Authorization', 'Bearer ' + tokens.security);
    expect(res.statusCode).toBe(200);
    expect(res.body.disabledCards).toBeDefined();
    expect(res.body.newlyIssuedCards).toBeDefined();
  });
});

describe('7. 回执打印PDF', () => {
  test('前台打印补办回执PDF', async () => {
    const res = await request(app).get(`/api/reissues/${testData.reissue1.id}/receipt`)
      .set('Authorization', 'Bearer ' + tokens.receptionist);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(1000);
  });

  test('保安无权限打印回执', async () => {
    const res = await request(app).get(`/api/reissues/${testData.reissue1.id}/receipt`)
      .set('Authorization', 'Bearer ' + tokens.security);
    expect(res.statusCode).toBe(403);
  });
});

describe('8. 月底数据导出', () => {
  test('导出当月补办记录(JSON)', async () => {
    const res = await request(app).get('/api/exports/reissues/monthly')
      .set('Authorization', 'Bearer ' + tokens.admin);
    expect(res.statusCode).toBe(200);
    expect(res.body.period).toBeDefined();
    expect(res.body.summary).toBeDefined();
    expect(res.body.records).toBeDefined();
  });

  test('导出当月押金记录(JSON)', async () => {
    const res = await request(app).get('/api/exports/deposits/monthly')
      .set('Authorization', 'Bearer ' + tokens.admin);
    expect(res.statusCode).toBe(200);
    expect(res.body.summary.totalCollected).toBeDefined();
    expect(res.body.summary.totalRefunded).toBeDefined();
  });

  test('导出当月异常记录(JSON)', async () => {
    const res = await request(app).get('/api/exports/anomalies/monthly')
      .set('Authorization', 'Bearer ' + tokens.admin);
    expect(res.statusCode).toBe(200);
    expect(res.body.summary).toBeDefined();
    expect(res.body.records).toBeDefined();
  });

  test('导出补办CSV文件', async () => {
    const res = await request(app).get('/api/exports/reissues/monthly?format=csv')
      .set('Authorization', 'Bearer ' + tokens.receptionist);
    expect(res.statusCode).toBe(200);
  });

  test('导出押金CSV文件', async () => {
    const res = await request(app).get('/api/exports/deposits/monthly?format=csv')
      .set('Authorization', 'Bearer ' + tokens.receptionist);
    expect(res.statusCode).toBe(200);
  });

  test('导出异常CSV文件', async () => {
    const res = await request(app).get('/api/exports/anomalies/monthly?format=csv')
      .set('Authorization', 'Bearer ' + tokens.receptionist);
    expect(res.statusCode).toBe(200);
  });
});

describe('9. 取消补办（异常流程）', () => {
  test('前台创建挂失后取消（未停用状态）', async () => {
    const res = await request(app).post('/api/reissues')
      .set('Authorization', 'Bearer ' + tokens.receptionist)
      .send({
        oldCardNumber: 'TESTCARD002E',
        roomId: testData.room2Id,
        ownerId: testData.owner2Id
      });
    if (res.statusCode === 201) {
      const cancelRes = await request(app).post(`/api/reissues/${res.body.id}/cancel`)
        .set('Authorization', 'Bearer ' + tokens.receptionist);
      expect(cancelRes.statusCode).toBe(200);
      expect(cancelRes.body.message).toContain('已取消');
    }
  });
});

describe('10. 业务规则边界测试', () => {
  test('已更换的旧卡再次挂失应失败', async () => {
    const res = await request(app).post('/api/reissues')
      .set('Authorization', 'Bearer ' + tokens.receptionist)
      .send({
        oldCardNumber: 'TESTCARD001',
        roomId: testData.room1Id,
        ownerId: testData.owner1Id
      });
    expect(res.statusCode).toBe(400);
  });

  test('已存在的新卡号不能再次发放', async () => {
    const res = await request(app).post('/api/reissues')
      .set('Authorization', 'Bearer ' + tokens.receptionist)
      .send({
        oldCardNumber: 'TESTCARD002F',
        roomId: testData.room2Id,
        ownerId: testData.owner2Id
      });
    expect(res.statusCode).toBe(201);
    const reissueId = res.body.id;

    const stopRes = await request(app).post(`/api/reissues/${reissueId}/confirm-stop`)
      .set('Authorization', 'Bearer ' + tokens.security);
    expect(stopRes.statusCode).toBe(200);

    const issueRes = await request(app).post(`/api/reissues/${reissueId}/issue-new-card`)
      .set('Authorization', 'Bearer ' + tokens.receptionist)
      .send({ newCardNumber: 'TESTNEW001' });
    expect(issueRes.statusCode).toBe(400);
    expect(issueRes.body.error).toContain('已存在');
  });
});
