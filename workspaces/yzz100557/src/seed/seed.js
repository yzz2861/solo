const { getDb, initDatabase } = require('../db/init');
const { generateNo, todayStr } = require('../utils/business');

function seed() {
  initDatabase();
  const db = getDb();
  db.pragma('foreign_keys = OFF');

  const tables = ['finance_deductions', 'replace_deliveries', 'stock_snapshots', 'return_items', 'returns', 'deductions', 'replacements', 'delivery_items', 'deliveries', 'purchase_order_items', 'purchase_orders', 'users', 'suppliers'];
  tables.forEach(t => db.exec(`DELETE FROM ${t}`));
  tables.forEach(t => {
    const seq = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'`).get();
    if (seq) db.exec(`DELETE FROM sqlite_sequence WHERE name='${t}'`);
  });

  const suppliers = [
    { code: 'SUP-VEG-001', name: '绿源蔬菜批发', contact_person: '张师傅', phone: '13800138001', address: '市农产品批发市场A区12号', category: 'vegetable' },
    { code: 'SUP-MEAT-001', name: '鑫源肉类加工厂', contact_person: '李经理', phone: '13800138002', address: '工业园东区肉类加工基地', category: 'meat' },
    { code: 'SUP-SEA-002', name: '渔港直供水产', contact_person: '王老板', phone: '13800138003', address: '海港码头B区3号', category: 'meat' },
    { code: 'SUP-SEASON-001', name: '百味调料商行', contact_person: '陈姐', phone: '13800138004', address: '调料批发城二楼205', category: 'seasoning' },
    { code: 'SUP-VEG-002', name: '田园农场直供', contact_person: '刘大哥', phone: '13800138005', address: '郊区幸福农场', category: 'vegetable' }
  ];
  const supStmt = db.prepare(`INSERT INTO suppliers (code, name, contact_person, phone, address, category, status)
    VALUES (?, ?, ?, ?, ?, ?, 'active')`);
  const supIds = {};
  suppliers.forEach(s => {
    const info = supStmt.run(s.code, s.name, s.contact_person, s.phone, s.address, s.category);
    supIds[s.code] = info.lastInsertRowid;
  });

  const users = [
    { username: 'admin', password: 'admin123', name: '系统管理员', role: 'admin' },
    { username: 'inspector1', password: 'inspect123', name: '王验收', role: 'inspector' },
    { username: 'inspector2', password: 'inspect123', name: '李检验', role: 'inspector' },
    { username: 'buyer1', password: 'buyer123', name: '赵采购', role: 'buyer' },
    { username: 'buyer2', password: 'buyer123', name: '孙采购', role: 'buyer' },
    { username: 'finance1', password: 'finance123', name: '周会计', role: 'finance' },
    { username: 'chef1', password: 'chef123', name: '钱厨师长', role: 'chef' },
    { username: 'chef2', password: 'chef123', name: '吴主厨', role: 'chef' },
    { username: 'sup_veg001', password: 'supplier123', name: '绿源蔬菜', role: 'supplier', supplier_id: supIds['SUP-VEG-001'] },
    { username: 'sup_meat001', password: 'supplier123', name: '鑫源肉类', role: 'supplier', supplier_id: supIds['SUP-MEAT-001'] },
    { username: 'sup_season001', password: 'supplier123', name: '百味调料', role: 'supplier', supplier_id: supIds['SUP-SEASON-001'] }
  ];
  const userStmt = db.prepare(`INSERT INTO users (username, password, name, role, supplier_id) VALUES (?, ?, ?, ?, ?)`);
  const userIds = {};
  users.forEach(u => {
    const info = userStmt.run(u.username, u.password, u.name, u.role, u.supplier_id || null);
    userIds[u.username] = info.lastInsertRowid;
  });

  const today = todayStr();
  const yesterday = new Date(Date.now() - 86400000);
  const yesterdayStr = yesterday.getFullYear() + '-' + (yesterday.getMonth() + 1).toString().padStart(2, '0') + '-' + yesterday.getDate().toString().padStart(2, '0');
  const day2 = new Date(Date.now() - 2 * 86400000);
  const day2Str = day2.getFullYear() + '-' + (day2.getMonth() + 1).toString().padStart(2, '0') + '-' + day2.getDate().toString().padStart(2, '0');

  function createPO(poData, itemsData) {
    const po_no = poData.po_no || generateNo('PO');
    const info = db.prepare(`INSERT INTO purchase_orders
      (po_no, supplier_id, order_date, expected_delivery_date, status, buyer_id, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      po_no, poData.supplier_id, poData.order_date || today,
      poData.expected_delivery_date || today, poData.status || 'pending',
      poData.buyer_id || userIds['buyer1'], poData.remarks || ''
    );
    const poId = info.lastInsertRowid;
    const poItemStmt = db.prepare(`INSERT INTO purchase_order_items
      (po_id, material_code, material_name, category, unit, unit_price, expected_qty, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`);
    let total = 0;
    itemsData.forEach(it => {
      poItemStmt.run(poId, it.material_code, it.material_name, it.category,
        it.unit, it.unit_price, it.expected_qty);
      total += it.unit_price * it.expected_qty;
    });
    db.prepare('UPDATE purchase_orders SET total_amount = ? WHERE id = ?').run(total, poId);
    return { poId, po_no };
  }

  const veg1 = createPO(
    { supplier_id: supIds['SUP-VEG-001'], order_date: today, expected_delivery_date: today, buyer_id: userIds['buyer1'], remarks: '今日蔬菜配送' },
    [
      { material_code: 'VEG-C001', material_name: '大白菜', category: 'vegetable', unit: 'kg', unit_price: 3.5, expected_qty: 100 },
      { material_code: 'VEG-C002', material_name: '西红柿', category: 'vegetable', unit: 'kg', unit_price: 6.8, expected_qty: 50 },
      { material_code: 'VEG-C003', material_name: '黄瓜', category: 'vegetable', unit: 'kg', unit_price: 4.2, expected_qty: 60 },
      { material_code: 'VEG-C004', material_name: '土豆', category: 'vegetable', unit: 'kg', unit_price: 2.8, expected_qty: 80 },
      { material_code: 'VEG-L001', material_name: '生菜', category: 'vegetable', unit: 'kg', unit_price: 5.5, expected_qty: 30 }
    ]
  );

  const meat1 = createPO(
    { supplier_id: supIds['SUP-MEAT-001'], order_date: today, expected_delivery_date: today, buyer_id: userIds['buyer1'] },
    [
      { material_code: 'MEAT-P001', material_name: '猪五花肉', category: 'meat', unit: 'kg', unit_price: 38, expected_qty: 40 },
      { material_code: 'MEAT-P002', material_name: '猪里脊', category: 'meat', unit: 'kg', unit_price: 45, expected_qty: 25 },
      { material_code: 'MEAT-B001', material_name: '牛腩', category: 'meat', unit: 'kg', unit_price: 68, expected_qty: 30 },
      { material_code: 'MEAT-C001', material_name: '鸡腿肉', category: 'meat', unit: 'kg', unit_price: 22, expected_qty: 50 }
    ]
  );

  const season1 = createPO(
    { supplier_id: supIds['SUP-SEASON-001'], order_date: yesterdayStr, expected_delivery_date: today, buyer_id: userIds['buyer2'], remarks: '月度调料补货' },
    [
      { material_code: 'SEA-S001', material_name: '生抽酱油', category: 'seasoning', unit: '瓶', unit_price: 15, expected_qty: 20 },
      { material_code: 'SEA-S002', material_name: '老抽酱油', category: 'seasoning', unit: '瓶', unit_price: 18, expected_qty: 15 },
      { material_code: 'SEA-S003', material_name: '食用盐', category: 'seasoning', unit: '袋', unit_price: 3, expected_qty: 50 },
      { material_code: 'SEA-O001', material_name: '菜籽油', category: 'seasoning', unit: '桶', unit_price: 85, expected_qty: 10 },
      { material_code: 'SEA-V001', material_name: '香醋', category: 'seasoning', unit: '瓶', unit_price: 12, expected_qty: 25 }
    ]
  );

  const veg2 = createPO(
    { supplier_id: supIds['SUP-VEG-001'], order_date: yesterdayStr, expected_delivery_date: yesterdayStr, buyer_id: userIds['buyer1'] },
    [
      { material_code: 'VEG-C001', material_name: '大白菜', category: 'vegetable', unit: 'kg', unit_price: 3.5, expected_qty: 80 },
      { material_code: 'VEG-L002', material_name: '油麦菜', category: 'vegetable', unit: 'kg', unit_price: 6.0, expected_qty: 40 },
      { material_code: 'VEG-T001', material_name: '大葱', category: 'vegetable', unit: 'kg', unit_price: 8.5, expected_qty: 20 }
    ]
  );

  const sea1 = createPO(
    { supplier_id: supIds['SUP-SEA-002'], order_date: yesterdayStr, expected_delivery_date: today, buyer_id: userIds['buyer2'] },
    [
      { material_code: 'SEA-F001', material_name: '草鱼', category: 'meat', unit: 'kg', unit_price: 18, expected_qty: 60 },
      { material_code: 'SEA-F002', material_name: '鲈鱼', category: 'meat', unit: 'kg', unit_price: 42, expected_qty: 25 },
      { material_code: 'SEA-S010', material_name: '基围虾', category: 'meat', unit: 'kg', unit_price: 58, expected_qty: 20 }
    ]
  );

  const poItemsCache = {};
  db.prepare('SELECT * FROM purchase_order_items').all().forEach(pi => {
    const key = pi.po_id + ':' + pi.material_code;
    poItemsCache[key] = pi;
  });

  function createDelivery(delData, itemsData) {
    const batch_no = delData.batch_no || generateNo('BATCH');
    const info = db.prepare(`INSERT INTO deliveries
      (batch_no, po_id, supplier_id, delivery_date, delivery_time, inspector_id, vehicle_no, driver_name, temperature, remarks, is_final)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      batch_no, delData.po_id, delData.supplier_id, delData.delivery_date || today,
      delData.delivery_time || '06:30:00',
      delData.inspector_id || userIds['inspector1'],
      delData.vehicle_no || '京A' + Math.floor(Math.random() * 90000 + 10000),
      delData.driver_name || '配送司机',
      delData.temperature || null,
      delData.remarks || '',
      delData.is_final !== undefined ? delData.is_final : 1
    );
    const deliveryId = info.lastInsertRowid;
    const diStmt = db.prepare(`INSERT INTO delivery_items
      (delivery_id, po_item_id, material_code, material_name, category, unit, unit_price,
       delivered_qty, actual_accepted_qty, deduction_qty, deduction_reason, deduction_photo_urls,
       has_quality_issue, quality_detail, accepted, accepted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`);
    const dedStmt = db.prepare(`INSERT INTO deductions
      (deduction_no, delivery_item_id, delivery_id, supplier_id, po_item_id, material_code, material_name, category, unit, unit_price,
       expected_qty, delivered_qty, deduction_qty, deduction_value, reason, description, photo_urls, remaining_replace_qty, inspector_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const finStmt = db.prepare(`INSERT INTO finance_deductions
      (period, supplier_id, deduction_id, material_name, deduction_qty, deduction_value, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const stockStmt = db.prepare(`INSERT INTO stock_snapshots
      (snapshot_date, material_code, material_name, category, unit, available_qty, quality_issue_qty, supplier_id, po_no, batch_no)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const poNo = db.prepare('SELECT po_no FROM purchase_orders WHERE id = ?').get(delData.po_id).po_no;

    itemsData.forEach(it => {
      const key = delData.po_id + ':' + it.material_code;
      const poi = poItemsCache[key];
      if (!poi) return;
      const dedQty = Number(it.deduction_qty) || 0;
      const actualQty = Number(it.delivered_qty) - dedQty;
      const hasQuality = it.has_quality_issue === 1 || (it.reason && ['rotten','damaged','expired','contaminated'].includes(it.reason));
      const diInfo = diStmt.run(deliveryId, poi.id, it.material_code, it.material_name, poi.category,
        poi.unit, poi.unit_price, Number(it.delivered_qty), actualQty, dedQty,
        it.deduction_reason || it.description || '',
        it.deduction_photo_urls ? JSON.stringify(it.deduction_photo_urls) : null,
        hasQuality ? 1 : 0, it.quality_detail || '',
        it.accepted === false ? 0 : 1);
      const diId = diInfo.lastInsertRowid;

      if (dedQty > 0 && it.reason) {
        const dedNo = generateNo('DED');
        const dedValue = dedQty * poi.unit_price;
        const status = dedValue <= 0 ? 'pending_replace' : (it.status || 'pending_replace');
        const dInfo = dedStmt.run(dedNo, diId, deliveryId, delData.supplier_id, poi.id,
          it.material_code, it.material_name, poi.category, poi.unit, poi.unit_price,
          poi.expected_qty, Number(it.delivered_qty), dedQty, dedValue,
          it.reason, it.description || '',
          it.deduction_photo_urls ? JSON.stringify(it.deduction_photo_urls) : null,
          dedQty, delData.inspector_id || userIds['inspector1'], status);
        const dedId = dInfo.lastInsertRowid;
        const period = (delData.delivery_date || today).substring(0, 7);
        finStmt.run(period, delData.supplier_id, dedId, it.material_name, dedQty, dedValue, it.reason);
        if (it.createReplacement) {
          db.prepare(`INSERT INTO replacements
            (replace_no, original_deduction_id, supplier_id, po_id, po_item_id,
             material_code, material_name, unit, unit_price,
             original_deduction_qty, replace_qty, remaining_replace_qty, status, buyer_id, follow_up_date, remarks)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`).run(
            generateNo('REP'), dedId, delData.supplier_id, delData.po_id, poi.id,
            it.material_code, it.material_name, poi.unit, poi.unit_price,
            dedQty, dedQty, dedQty, userIds['buyer1'], today, it.replacementRemark || ''
          );
        }
      }
      if (actualQty > 0) {
        stockStmt.run(delData.delivery_date || today, it.material_code, it.material_name,
          poi.category, poi.unit, actualQty, hasQuality ? dedQty : 0, delData.supplier_id, poNo, batch_no);
      }
    });
    return { deliveryId, batch_no };
  }

  createDelivery(
    { po_id: veg1.poId, supplier_id: supIds['SUP-VEG-001'], delivery_date: today, delivery_time: '06:15:00', inspector_id: userIds['inspector1'], temperature: 4.5, remarks: '正常配送', is_final: 1 },
    [
      { material_code: 'VEG-C001', material_name: '大白菜', delivered_qty: 100, deduction_qty: 5, reason: 'rotten', description: '外层菜叶腐烂约5kg', deduction_reason: '外层腐烂', has_quality_issue: 1, deduction_photo_urls: ['https://example.com/rotten_cabbage1.jpg','https://example.com/rotten_cabbage2.jpg'], createReplacement: false },
      { material_code: 'VEG-C002', material_name: '西红柿', delivered_qty: 48, deduction_qty: 0 },
      { material_code: 'VEG-C003', material_name: '黄瓜', delivered_qty: 60, deduction_qty: 3, reason: 'damaged', description: '挤压破损', has_quality_issue: 1, createReplacement: false },
      { material_code: 'VEG-C004', material_name: '土豆', delivered_qty: 80, deduction_qty: 0 },
      { material_code: 'VEG-L001', material_name: '生菜', delivered_qty: 30, deduction_qty: 8, reason: 'rotten', description: '部分叶子发黄腐烂，严重', deduction_reason: '腐烂变质', has_quality_issue: 1, deduction_photo_urls: ['https://example.com/lettuce_bad.jpg'], createReplacement: true, replacementRemark: '明天必须补送8kg生菜，否则扣钱' }
    ]
  );

  createDelivery(
    { po_id: meat1.poId, supplier_id: supIds['SUP-MEAT-001'], delivery_date: today, delivery_time: '05:50:00', inspector_id: userIds['inspector1'], temperature: -2, remarks: '冷链正常', is_final: 1 },
    [
      { material_code: 'MEAT-P001', material_name: '猪五花肉', delivered_qty: 38, deduction_qty: 2, reason: 'weight_insufficient', description: '实际称重38kg，少2kg', deduction_reason: '重量不足' },
      { material_code: 'MEAT-P002', material_name: '猪里脊', delivered_qty: 25, deduction_qty: 0 },
      { material_code: 'MEAT-B001', material_name: '牛腩', delivered_qty: 30, deduction_qty: 0 },
      { material_code: 'MEAT-C001', material_name: '鸡腿肉', delivered_qty: 52, deduction_qty: 0 }
    ]
  );

  createDelivery(
    { po_id: season1.poId, supplier_id: supIds['SUP-SEASON-001'], delivery_date: today, delivery_time: '07:20:00', inspector_id: userIds['inspector2'], is_final: 1 },
    [
      { material_code: 'SEA-S001', material_name: '生抽酱油', delivered_qty: 20, deduction_qty: 0 },
      { material_code: 'SEA-S002', material_name: '老抽酱油', delivered_qty: 15, deduction_qty: 0 },
      { material_code: 'SEA-S003', material_name: '食用盐', delivered_qty: 50, deduction_qty: 0 },
      { material_code: 'SEA-O001', material_name: '菜籽油', delivered_qty: 9, deduction_qty: 1, reason: 'damaged', description: '一桶外包装破损渗漏', has_quality_issue: 1, createReplacement: true },
      { material_code: 'SEA-V001', material_name: '香醋', delivered_qty: 25, deduction_qty: 0 }
    ]
  );

  const veg2Del = createDelivery(
    { po_id: veg2.poId, supplier_id: supIds['SUP-VEG-001'], delivery_date: yesterdayStr, delivery_time: '06:20:00', inspector_id: userIds['inspector2'], is_final: 1 },
    [
      { material_code: 'VEG-C001', material_name: '大白菜', delivered_qty: 80, deduction_qty: 0 },
      { material_code: 'VEG-L002', material_name: '油麦菜', delivered_qty: 42, deduction_qty: 0 },
      { material_code: 'VEG-T001', material_name: '大葱', delivered_qty: 20, deduction_qty: 0 }
    ]
  );

  const seaDel = createDelivery(
    { po_id: sea1.poId, supplier_id: supIds['SUP-SEA-002'], delivery_date: today, delivery_time: '06:45:00', inspector_id: userIds['inspector2'], temperature: 2, remarks: '鲜活配送', is_final: 0 },
    [
      { material_code: 'SEA-F001', material_name: '草鱼', delivered_qty: 55, deduction_qty: 3, reason: 'other', description: '3条鱼死亡需扣', has_quality_issue: 1, createReplacement: false },
      { material_code: 'SEA-F002', material_name: '鲈鱼', delivered_qty: 25, deduction_qty: 0 },
      { material_code: 'SEA-S010', material_name: '基围虾', delivered_qty: 18, deduction_qty: 0, deduction_reason: '实际只送了18kg，少2kg' }
    ]
  );

  const vegDeliveries = db.prepare(`SELECT d.id, d.batch_no FROM deliveries d
    JOIN suppliers s ON d.supplier_id = s.id
    WHERE s.code = 'SUP-VEG-001' AND d.delivery_date = ? ORDER BY d.created_at DESC LIMIT 1`).get(today);

  if (vegDeliveries) {
    const dItems = db.prepare(`SELECT di.id, di.material_code, di.material_name, di.unit, di.unit_price, di.deduction_qty, di.actual_accepted_qty
      FROM delivery_items di WHERE di.delivery_id = ? AND di.deduction_qty > 0`).all(vegDeliveries.id);
    if (dItems.length) {
      const lettuceItem = dItems.find(d => d.material_code === 'VEG-L001');
      const cabbageItem = dItems.find(d => d.material_code === 'VEG-C001');
      const cucumberItem = dItems.find(d => d.material_code === 'VEG-C003');
      const retItems = [];
      if (lettuceItem && lettuceItem.deduction_qty > 0) {
        const dedId = db.prepare('SELECT id FROM deductions WHERE delivery_item_id = ?').get(lettuceItem.id);
        retItems.push({
          delivery_item_id: lettuceItem.id, deduction_id: dedId?.id || null,
          material_code: lettuceItem.material_code, material_name: lettuceItem.material_name,
          unit: lettuceItem.unit, unit_price: lettuceItem.unit_price,
          return_qty: Math.min(5, lettuceItem.deduction_qty),
          reason: '生菜严重腐烂，现场退回腐烂部分'
        });
      }
      if (cabbageItem && cabbageItem.deduction_qty > 0) {
        const dedId = db.prepare('SELECT id FROM deductions WHERE delivery_item_id = ?').get(cabbageItem.id);
        retItems.push({
          delivery_item_id: cabbageItem.id, deduction_id: dedId?.id || null,
          material_code: cabbageItem.material_code, material_name: cabbageItem.material_name,
          unit: cabbageItem.unit, unit_price: cabbageItem.unit_price,
          return_qty: Math.min(3, cabbageItem.deduction_qty),
          reason: '腐烂菜叶退回供应商'
        });
      }
      if (cucumberItem && cucumberItem.deduction_qty > 0) {
        const dedId = db.prepare('SELECT id FROM deductions WHERE delivery_item_id = ?').get(cucumberItem.id);
        retItems.push({
          delivery_item_id: cucumberItem.id, deduction_id: dedId?.id || null,
          material_code: cucumberItem.material_code, material_name: cucumberItem.material_name,
          unit: cucumberItem.unit, unit_price: cucumberItem.unit_price,
          return_qty: cucumberItem.deduction_qty,
          reason: '破损黄瓜退回'
        });
      }

      if (retItems.length) {
        const totalQty = retItems.reduce((s, i) => s + i.return_qty, 0);
        const totalVal = retItems.reduce((s, i) => s + i.return_qty * i.unit_price, 0);
        const return_no = generateNo('RET');
        const supVegId = supIds['SUP-VEG-001'];
        const info = db.prepare(`INSERT INTO returns
          (return_no, delivery_id, supplier_id, return_date, return_type, total_qty, total_value, photo_urls, reason, handler_id, status, supplier_signed)
          VALUES (?, ?, ?, ?, 'quality', ?, ?, ?, '今日蔬菜腐烂破损退货', ?, 'pending', 0)`).run(
          return_no, vegDeliveries.id, supVegId, today, totalQty, totalVal,
          JSON.stringify(['https://example.com/return_pic1.jpg', 'https://example.com/return_pic2.jpg']),
          userIds['inspector1']
        );
        const returnId = info.lastInsertRowid;
        const riStmt = db.prepare(`INSERT INTO return_items
          (return_id, delivery_item_id, deduction_id, material_code, material_name, unit, unit_price, return_qty, return_value, reason)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        retItems.forEach(it => {
          riStmt.run(returnId, it.delivery_item_id, it.deduction_id,
            it.material_code, it.material_name, it.unit, it.unit_price,
            it.return_qty, it.return_qty * it.unit_price, it.reason);
        });
      }
    }
  }

  const poIds = [veg1.poId, meat1.poId, season1.poId, veg2.poId, sea1.poId];
  poIds.forEach(poId => {
    const items = db.prepare('SELECT id FROM purchase_order_items WHERE po_id = ?').all(poId);
    items.forEach(it => {
      const stats = db.prepare(`SELECT
        COALESCE(SUM(di.actual_accepted_qty),0) as acc,
        COALESCE(SUM(di.deduction_qty),0) as ded
        FROM delivery_items di WHERE di.po_item_id = ? AND di.accepted = 1`).get(it.id);
      const ret = db.prepare(`SELECT COALESCE(SUM(ri.return_qty),0) as ret
        FROM return_items ri JOIN delivery_items di ON ri.delivery_item_id = di.id
        WHERE di.po_item_id = ?`).get(it.id);
      const rpl = db.prepare(`SELECT COALESCE(SUM(rpl.replace_qty),0) as rpl
        FROM deductions ded
        JOIN replacements rpl ON rpl.original_deduction_id = ded.id
        WHERE ded.po_item_id = ? AND rpl.status IN ('delivered','closed')`).get(it.id);
      const accepted = stats.acc || 0;
      const returned = ret.ret || 0;
      const replaced = rpl.rpl || 0;
      const deduction = stats.ded || 0;
      const final = accepted - returned + replaced;
      const exp = db.prepare('SELECT expected_qty FROM purchase_order_items WHERE id = ?').get(it.id).expected_qty;
      let status = 'pending';
      const hr = returned > 0 || deduction > 0;
      if (final >= exp) status = hr ? 'has_returns' : 'accepted';
      else if (final > 0) status = hr ? 'has_returns' : 'partial_accepted';
      db.prepare(`UPDATE purchase_order_items SET
        accepted_qty = ?, returned_qty = ?, replaced_qty = ?, deduction_qty = ?, final_qty = ?, status = ?, updated_at = datetime('now')
        WHERE id = ?`).run(accepted, returned, replaced, deduction, final, status, it.id);
    });
    const st = db.prepare('SELECT status FROM purchase_order_items WHERE po_id = ?').all(poId);
    const allAcc = st.every(s => s.status === 'accepted' || s.status === 'has_returns' || s.status === 'closed');
    const anyPart = st.some(s => s.status === 'partial_accepted' || s.status === 'has_returns');
    let newStatus = 'pending';
    if (allAcc) newStatus = 'accepted';
    else if (anyPart) newStatus = 'partial_accepted';
    db.prepare(`UPDATE purchase_orders SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(newStatus, poId);
    const total = db.prepare(`SELECT COALESCE(SUM(final_qty * unit_price),0) as t FROM purchase_order_items WHERE po_id = ?`).get(poId).t;
    db.prepare('UPDATE purchase_orders SET total_amount = ? WHERE id = ?').run(total, poId);
  });

  db.pragma('foreign_keys = ON');
  db.close();
  console.log('✓ 种子数据插入完成');
  console.log('');
  console.log('=== 可用测试账号 ===');
  console.log('管理员:   admin / admin123');
  console.log('验收员:   inspector1 / inspect123, inspector2 / inspect123');
  console.log('采购员:   buyer1 / buyer123, buyer2 / buyer123');
  console.log('财务:     finance1 / finance123');
  console.log('厨师长:   chef1 / chef123, chef2 / chef123');
  console.log('供应商:   sup_veg001 / supplier123 (绿源蔬菜)');
  console.log('          sup_meat001 / supplier123 (鑫源肉类)');
  console.log('          sup_season001 / supplier123 (百味调料)');
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
