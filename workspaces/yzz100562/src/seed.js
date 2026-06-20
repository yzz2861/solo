const { initDb, getDb, insert } = require('./db');

function seed() {
  const db = initDb();

  console.log('正在初始化种子数据...');

  const tech1 = insert(db, 'technicians', { name: '张师傅', phone: '13800001111', station_id: '1' });
  const tech2 = insert(db, 'technicians', { name: '李师傅', phone: '13800002222', station_id: '1' });
  const tech3 = insert(db, 'technicians', { name: '王师傅', phone: '13800003333', station_id: '1' });

  insert(db, 'users', { username: 'zhang', password: '123456', name: '张师傅', role: 'technician', technician_id: tech1.id });
  insert(db, 'users', { username: 'li', password: '123456', name: '李师傅', role: 'technician', technician_id: tech2.id });
  insert(db, 'users', { username: 'wang', password: '123456', name: '王师傅', role: 'technician', technician_id: tech3.id });
  insert(db, 'users', { username: 'admin_ku', password: '123456', name: '赵库管', role: 'warehouse_manager', technician_id: null });
  insert(db, 'users', { username: 'admin_zhan', password: '123456', name: '孙站长', role: 'station_manager', technician_id: null });

  const p1 = insert(db, 'spare_parts', { name: '洗衣机主板V3', category: '主板', sku: 'MB-WASH-V3', stock_qty: 20, unit_price: 350, min_stock: 5, station_id: '1' });
  const p2 = insert(db, 'spare_parts', { name: '空调电机A型', category: '电机', sku: 'MT-AC-A', stock_qty: 15, unit_price: 280, min_stock: 3, station_id: '1' });
  const p3 = insert(db, 'spare_parts', { name: '冰箱温度传感器', category: '传感器', sku: 'SN-FR-TEMP', stock_qty: 30, unit_price: 65, min_stock: 10, station_id: '1' });
  const p4 = insert(db, 'spare_parts', { name: '洗衣机主板V2', category: '主板', sku: 'MB-WASH-V2', stock_qty: 3, unit_price: 300, min_stock: 5, station_id: '1' });
  const p5 = insert(db, 'spare_parts', { name: '油烟机电机B型', category: '电机', sku: 'MT-HOOD-B', stock_qty: 8, unit_price: 220, min_stock: 3, station_id: '1' });

  const wo1 = insert(db, 'work_orders', { order_no: 'WO-20240601-001', customer_name: '客户甲', customer_phone: '13900001111', address: '幸福路10号', technician_id: tech1.id, status: 'in_progress' });
  const wo2 = insert(db, 'work_orders', { order_no: 'WO-20240602-002', customer_name: '客户乙', customer_phone: '13900002222', address: '花园小区3栋', technician_id: tech2.id, status: 'in_progress' });
  const wo3 = insert(db, 'work_orders', { order_no: 'WO-20240603-003', customer_name: '客户丙', customer_phone: '13900003333', address: '阳光大厦8层', technician_id: tech3.id, status: 'completed' });
  const wo4 = insert(db, 'work_orders', { order_no: 'WO-20240605-004', customer_name: '客户丁', customer_phone: '13900004444', address: '滨河路22号', technician_id: tech1.id, status: 'pending' });

  const co1 = insert(db, 'checkout_records', { work_order_id: wo1.id, spare_part_id: p1.id, technician_id: tech1.id, qty: 1, reason: null, status: 'installed', checkout_date: '2024-06-01T09:00:00Z' });
  const co2 = insert(db, 'checkout_records', { work_order_id: wo2.id, spare_part_id: p2.id, technician_id: tech2.id, qty: 1, reason: null, status: 'checked_out', checkout_date: '2024-06-02T10:30:00Z' });
  const co3 = insert(db, 'checkout_records', { work_order_id: wo3.id, spare_part_id: p3.id, technician_id: tech3.id, qty: 2, reason: null, status: 'installed', checkout_date: '2024-06-03T08:15:00Z' });

  insert(db, 'install_records', { checkout_record_id: co1.id, installed_at: '2024-06-01T14:00:00Z', installed_by: tech1.id, notes: '已安装完成' });
  insert(db, 'install_records', { checkout_record_id: co3.id, installed_at: '2024-06-03T16:00:00Z', installed_by: tech3.id, notes: '两个传感器均已更换' });

  insert(db, 'old_part_recoveries', { checkout_record_id: co1.id, spare_part_id: p1.id, work_order_id: wo1.id, technician_id: tech1.id, status: 'pending', photo_paths: [], notes: null, recovered_at: null, recovered_by: null });
  insert(db, 'old_part_recoveries', { checkout_record_id: co3.id, spare_part_id: p3.id, work_order_id: wo3.id, technician_id: tech3.id, status: 'recovered', photo_paths: ['recovery-sample-1.jpg'], notes: '旧件已拍照', recovered_at: '2024-06-04T09:00:00Z', recovered_by: tech3.id });

  insert(db, 'scrap_records', { checkout_record_id: co3.id, spare_part_id: p3.id, scrap_qty: 1, reason: '旧传感器已损坏无法维修', status: 'pending', scrap_at: '2024-06-05T10:00:00Z', scrap_by: tech3.id, approved_by: null, approved_at: null });

  insert(db, 'inventory_flows', { spare_part_id: p1.id, type: 'checkout', qty: -1, reference_id: co1.id, reference_type: 'checkout', operator_id: '1', notes: `工单${wo1.order_no}领用` });
  insert(db, 'inventory_flows', { spare_part_id: p2.id, type: 'checkout', qty: -1, reference_id: co2.id, reference_type: 'checkout', operator_id: '2', notes: `工单${wo2.order_no}领用` });
  insert(db, 'inventory_flows', { spare_part_id: p3.id, type: 'checkout', qty: -2, reference_id: co3.id, reference_type: 'checkout', operator_id: '3', notes: `工单${wo3.order_no}领用` });

  console.log('种子数据初始化完成！');
  console.log('用户账号:');
  console.log('  师傅 - zhang/123456, li/123456, wang/123456');
  console.log('  库管 - admin_ku/123456');
  console.log('  站长 - admin_zhan/123456');
}

seed();
