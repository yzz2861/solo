require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db } = require('../db');

const seedData = () => {
  const salt = bcrypt.genSaltSync(10);
  const hash = (pwd) => bcrypt.hashSync(pwd, salt);

  db.serialize(() => {
    const stmtUser = db.prepare(
      'INSERT OR IGNORE INTO users (username, password, real_name, role, phone, student_no) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const users = [
      ['student001', hash('123456'), '张三', 'student', '13800138001', '2024001'],
      ['student002', hash('123456'), '李四', 'student', '13800138002', '2024002'],
      ['worker001', hash('123456'), '王师傅', 'worker', '13900139001', null],
      ['worker002', hash('123456'), '李师傅', 'worker', '13900139002', null],
      ['store001', hash('123456'), '库管赵', 'storekeeper', '13700137001', null],
      ['admin001', hash('123456'), '后勤主任钱', 'admin', '13600136001', null]
    ];
    users.forEach((u) => stmtUser.run(u));
    stmtUser.finalize();
    console.log('用户数据已插入');

    const stmtBuilding = db.prepare('INSERT OR IGNORE INTO buildings (name, campus) VALUES (?, ?)');
    [['1号楼', '东校区'], ['2号楼', '东校区'], ['3号楼', '西校区']].forEach((b) => stmtBuilding.run(b));
    stmtBuilding.finalize();
    console.log('楼栋数据已插入');

    const stmtRoom = db.prepare('INSERT OR IGNORE INTO rooms (building_id, room_no, floor, capacity) VALUES (?, ?, ?, ?)');
    for (let b = 1; b <= 3; b++) {
      for (let f = 1; f <= 6; f++) {
        for (let r = 1; r <= 10; r++) {
          stmtRoom.run(b, `${f}${String(r).padStart(2, '0')}`, f, 4);
        }
      }
    }
    stmtRoom.finalize();
    console.log('房间数据已插入');

    const stmtType = db.prepare('INSERT OR IGNORE INTO repair_types (name, description, category) VALUES (?, ?, ?)');
    [
      ['灯管损坏', '宿舍灯管不亮或闪烁', '水电'],
      ['水龙头漏水', '水龙头关不紧或漏水', '水电'],
      ['马桶堵塞', '马桶下水不畅', '卫浴'],
      ['门锁损坏', '门锁打不开或关不上', '五金'],
      ['开关故障', '墙壁开关失灵', '水电'],
      ['软管漏水', '连接软管破损漏水', '水电']
    ].forEach((t) => stmtType.run(t));
    stmtType.finalize();
    console.log('维修类型数据已插入');

    const stmtMat = db.prepare(
      'INSERT OR IGNORE INTO materials (name, model, unit, stock, safety_stock, category) VALUES (?, ?, ?, ?, ?, ?)'
    );
    [
      ['LED灯管', 'T8-18W', '根', 200, 30, '水电'],
      ['单冷水龙头', 'DN15-陶瓷芯', '个', 80, 10, '水电'],
      ['冷热混水龙头', 'DN15-双联', '个', 40, 5, '水电'],
      ['墙壁开关', '86型-单开', '个', 150, 20, '水电'],
      ['墙壁开关', '86型-双开', '个', 100, 15, '水电'],
      ['进水软管', '60cm-不锈钢', '根', 120, 20, '水电'],
      ['进水软管', '80cm-不锈钢', '根', 80, 15, '水电'],
      ['生料带', '12mmx15m', '卷', 300, 50, '耗材'],
      ['门锁芯', '通用型', '个', 60, 10, '五金'],
      ['马桶吸', '普通型', '个', 30, 5, '工具']
    ].forEach((m) => stmtMat.run(m));
    stmtMat.finalize();
    console.log('材料数据已插入');

    console.log('\n示例数据初始化完成！');
    console.log('测试账号: student001/123456, worker001/123456, store001/123456, admin001/123456');
    db.close();
  });
};

seedData();
