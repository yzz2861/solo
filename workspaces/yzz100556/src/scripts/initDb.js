require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/database');

function seedDefaultData() {
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  
  if (existingUsers === 0) {
    console.log('初始化默认用户...');
    
    const users = [
      { username: 'admin', password: 'admin123', role: 'admin', realName: '系统管理员' },
      { username: 'qiantai', password: 'qiantai123', role: 'receptionist', realName: '前台小王' },
      { username: 'baoan', password: 'baoan123', role: 'security', realName: '保安李师傅' }
    ];

    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, role, real_name) VALUES (?, ?, ?, ?)
    `);

    for (const u of users) {
      const hash = bcrypt.hashSync(u.password, 10);
      insertUser.run(u.username, hash, u.role, u.realName);
      console.log(`  创建用户: ${u.username} / ${u.password} (${u.realName})`);
    }
  }

  const existingOwners = db.prepare('SELECT COUNT(*) as count FROM owners').get().count;
  
  if (existingOwners === 0) {
    console.log('初始化示例业主与房间数据...');
    
    const owners = [
      { name: '张伟', phone: '13800138001', idCard: '110101199001011234' },
      { name: '李娜', phone: '13800138002', idCard: '110101199002022345' },
      { name: '王芳', phone: '13800138003', idCard: '110101199003033456' }
    ];

    const insertOwner = db.prepare('INSERT INTO owners (name, phone, id_card) VALUES (?, ?, ?)');
    const insertRoom = db.prepare('INSERT INTO rooms (room_number, building, unit, owner_id) VALUES (?, ?, ?, ?)');

    const roomsData = [
      { roomNumber: '101', building: '1', unit: '1', ownerIdx: 0 },
      { roomNumber: '102', building: '1', unit: '1', ownerIdx: 1 },
      { roomNumber: '201', building: '2', unit: '2', ownerIdx: 2 },
      { roomNumber: '301', building: '3', unit: '1', ownerIdx: 0 }
    ];

    const ownerIds = [];
    for (const o of owners) {
      const result = insertOwner.run(o.name, o.phone, o.idCard);
      ownerIds.push(result.lastInsertRowid);
    }

    for (const r of roomsData) {
      insertRoom.run(r.roomNumber, r.building, r.unit, ownerIds[r.ownerIdx]);
    }

    const insertCard = db.prepare(`
      INSERT INTO access_cards (card_number, owner_id, room_id, status, issued_at)
      VALUES (?, ?, ?, 'active', DATETIME('now', '-30 days'))
    `);

    const cardData = [
      { cardNumber: 'C001001', roomNumber: '101', building: '1' },
      { cardNumber: 'C001002', roomNumber: '102', building: '1' },
      { cardNumber: 'C002001', roomNumber: '201', building: '2' },
      { cardNumber: 'C003001', roomNumber: '301', building: '3' },
      { cardNumber: 'C001001B', roomNumber: '101', building: '1' }
    ];

    for (const c of cardData) {
      const room = db.prepare('SELECT * FROM rooms WHERE room_number = ? AND building = ?').get(c.roomNumber, c.building);
      if (room) {
        insertCard.run(c.cardNumber, room.owner_id, room.id);
      }
    }

    console.log('  示例数据初始化完成');
  }

  console.log('\n=== 数据初始化完成 ===');
  console.log('\n默认登录账户:');
  console.log('  管理员:   admin     / admin123');
  console.log('  前台:     qiantai   / qiantai123');
  console.log('  保安:     baoan     / baoan123');
}

seedDefaultData();
