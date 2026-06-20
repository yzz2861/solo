import db from './db';

function seed() {
  const tx = db.transaction(() => {
    const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get() as any;
    if (userCount.c === 0) {
      const insertUser = db.prepare(
        'INSERT INTO users (username, display_name, role) VALUES (?, ?, ?)'
      );
      insertUser.run('env001', '张环保', 'env_officer');
      insertUser.run('env002', '李环保', 'env_officer');
      insertUser.run('lab001', '王化验', 'lab');
      insertUser.run('lab002', '赵化验', 'lab');
      insertUser.run('master001', '刘站长', 'station_master');
      console.log('已插入用户数据');
    }

    const outletCount = db.prepare('SELECT COUNT(*) as c FROM outlets').get() as any;
    if (outletCount.c === 0) {
      const insertOutlet = db.prepare(
        'INSERT INTO outlets (code, name, description) VALUES (?, ?, ?)'
      );
      insertOutlet.run('WS-001', '总排放口', '污水处理厂总排放口');
      insertOutlet.run('WS-002', '生化池出口', '生化处理单元出水');
      insertOutlet.run('WS-003', '初沉池出口', '初次沉淀池出水');
      insertOutlet.run('WS-004', '二沉池出口', '二次沉淀池出水');
      insertOutlet.run('WS-005', '调节池进口', '调节池进水口');
      console.log('已插入排放口数据');
    }

    const bottleCount = db.prepare('SELECT COUNT(*) as c FROM sample_bottles').get() as any;
    if (bottleCount.c === 0) {
      const insertBottle = db.prepare(
        'INSERT INTO sample_bottles (barcode) VALUES (?)'
      );
      for (let i = 1; i <= 50; i++) {
        const code = 'SW' + String(i).padStart(6, '0');
        insertBottle.run(code);
      }
      console.log('已插入样瓶条码数据');
    }
  });

  try {
    tx();
    console.log('数据初始化完成');
  } catch (e) {
    console.error('初始化失败:', e);
  }
}

seed();
