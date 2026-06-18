const db = require('./db');

(async () => {
  await db.initDb();
  
  db.prepare('UPDATE textbooks SET seller_id = 1 WHERE id IN (1, 2, 7)').run();
  db.prepare('UPDATE textbooks SET seller_id = 2 WHERE id IN (3, 4)').run();
  db.prepare('UPDATE textbooks SET seller_id = 3 WHERE id IN (5, 6)').run();
  
  console.log('卖家ID修复完成！');
  
  const textbooks = db.prepare(`
    SELECT t.id, t.title, s.name as seller_name
    FROM textbooks t
    LEFT JOIN sellers s ON s.id = t.seller_id
    ORDER BY t.id
  `).all();
  
  console.log('教材列表：');
  textbooks.forEach(t => {
    console.log(`  ${t.id}. ${t.title} - 卖家: ${t.seller_name}`);
  });
})();
