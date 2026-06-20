require('dotenv').config();
const request = require('supertest');
const app = require('./src/app');

(async () => {
  console.log('=== 小区门禁卡补办服务 API 功能验证 ===\n');

  console.log('1️⃣  健康检查');
  const h = await request(app).get('/health');
  console.log('   状态:', h.status, h.body.status, h.body.service);

  console.log('\n2️⃣  登录测试 - 前台');
  const l1 = await request(app).post('/api/auth/login').send({username:'qiantai', password:'qiantai123'});
  console.log('   状态:', l1.status, l1.body.user ? `${l1.body.user.realName}(${l1.body.user.role})` : l1.body.error);
  const qiantaiToken = l1.body.token;

  console.log('\n3️⃣  登录测试 - 保安');
  const l2 = await request(app).post('/api/auth/login').send({username:'baoan', password:'baoan123'});
  console.log('   状态:', l2.status, l2.body.user ? `${l2.body.user.realName}(${l2.body.user.role})` : l2.body.error);
  const baoanToken = l2.body.token;

  console.log('\n4️⃣  查询房间列表');
  const r1 = await request(app).get('/api/rooms').set('Authorization','Bearer '+qiantaiToken);
  console.log('   状态:', r1.status, '返回房间数:', r1.body.length);
  if (r1.body.length > 0) console.log('   示例:', r1.body[0].building + '栋' + r1.body[0].room_number, r1.body[0].owner_name);

  console.log('\n5️⃣  查询门禁卡列表');
  const r2 = await request(app).get('/api/cards').set('Authorization','Bearer '+qiantaiToken).query({status:'active'});
  console.log('   状态:', r2.status, '有效卡数量:', r2.body.length);
  const sampleCard = r2.body[0];
  if (sampleCard) console.log('   示例卡:', sampleCard.card_number, sampleCard.room_number, sampleCard.owner_name);

  console.log('\n6️⃣  保安查询待停用名单');
  const r3 = await request(app).get('/api/reissues/pending-stops').set('Authorization','Bearer '+baoanToken);
  console.log('   状态:', r3.status, '待停用记录数:', r3.body.length);

  console.log('\n7️⃣  前台查询补办进度 - 含押金信息');
  const r4 = await request(app).get('/api/reissues').set('Authorization','Bearer '+qiantaiToken);
  console.log('   状态:', r4.status, '补办记录数:', r4.body.length);
  if (r4.body.length > 0) {
    console.log('   记录示例包含押金字段:', 'deposit_amount' in r4.body[0] ? '✅是' : '❌否');
  }

  console.log('\n8️⃣  保安查询补办列表 - 验证无押金信息');
  const r5 = await request(app).get('/api/reissues').set('Authorization','Bearer '+baoanToken);
  console.log('   状态:', r5.status, '记录数:', r5.body.length);
  if (r5.body.length > 0) {
    console.log('   不包含押金字段:', 'deposit_amount' in r5.body[0] ? '❌仍包含' : '✅已屏蔽');
  }

  console.log('\n9️⃣  管理员导出月底补办记录(JSON)');
  const la = await request(app).post('/api/auth/login').send({username:'admin', password:'admin123'});
  const adminToken = la.body.token;
  const r6 = await request(app).get('/api/exports/reissues/monthly').set('Authorization','Bearer '+adminToken);
  console.log('   状态:', r6.status);
  if (r6.status === 200) {
    console.log('   期间:', r6.body.period, '总计:', r6.body.summary.total, '已完成:', r6.body.summary.completed);
  }

  console.log('\n🔟  保安无权限访问导出接口');
  const r7 = await request(app).get('/api/exports/reissues/monthly').set('Authorization','Bearer '+baoanToken);
  console.log('   状态:', r7.status, r7.body.error ? '✅权限拦截成功' : '❌');

  console.log('\n=== 全部核心功能验证完成 ===');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
