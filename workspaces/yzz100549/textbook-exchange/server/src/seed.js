const db = require('./db');
const dayjs = require('dayjs');

(async () => {
  await db.initDb();
  
  const now = dayjs().format();
  
  const s1 = db.prepare('INSERT INTO sellers (name, phone, student_id, created_at) VALUES (?, ?, ?, ?)')
    .run('张三', '13800138001', '2021001', now);
  const s2 = db.prepare('INSERT INTO sellers (name, phone, student_id, created_at) VALUES (?, ?, ?, ?)')
    .run('李四', '13800138002', '2021002', now);
  const s3 = db.prepare('INSERT INTO sellers (name, phone, student_id, created_at) VALUES (?, ?, ?, ?)')
    .run('王五', '13800138003', '2021003', now);
  
  const books = [
    { title: '高等数学（第七版）上册', course_id: 1, edition: '第七版', condition: 'good', price: 25, seller_id: s1.lastInsertRowid, version_note: '', trade_in_value: 10 },
    { title: '高等数学（第七版）下册', course_id: 1, edition: '第七版', condition: 'like_new', price: 28, seller_id: s1.lastInsertRowid, version_note: '', trade_in_value: 12 },
    { title: '大学英语精读3', course_id: 2, edition: '第三版', condition: 'good', price: 15, seller_id: s2.lastInsertRowid, version_note: '与最新版内容基本一致', trade_in_value: 5 },
    { title: '线性代数', course_id: 3, edition: '第六版', condition: 'fair', price: 12, seller_id: s2.lastInsertRowid, version_note: '', trade_in_value: 5 },
    { title: '计算机基础教程', course_id: 4, edition: '2023版', condition: 'like_new', price: 35, seller_id: s3.lastInsertRowid, version_note: '', trade_in_value: 15 },
    { title: '物理学（第五版）', course_id: 5, edition: '第五版', condition: 'good', price: 20, seller_id: s3.lastInsertRowid, version_note: '笔记较多但不影响阅读', trade_in_value: 8 },
    { title: '有机化学', course_id: 6, edition: '第九版', condition: 'good', price: 30, seller_id: s1.lastInsertRowid, version_note: '', trade_in_value: 12 },
  ];
  
  books.forEach(book => {
    db.prepare(`
      INSERT INTO textbooks (title, course_id, edition, condition, price, seller_id, status, version_note, trade_in_value, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'on_shelf', ?, ?, ?, ?)
    `).run(book.title, book.course_id, book.edition, book.condition, book.price, book.seller_id, book.version_note, book.trade_in_value, now, now);
  });
  
  console.log('测试数据添加成功！');
  console.log('卖家ID:', s1.lastInsertRowid, s2.lastInsertRowid, s3.lastInsertRowid);
  console.log('教材数量:', books.length);
})();
