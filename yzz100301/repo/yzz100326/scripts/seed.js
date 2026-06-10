const { db, upsertPackage, updatePackageStatus } = require('../src/db');

console.log('正在填充测试数据...\n');

const declarations = [
  {
    package_no: 'PKG001',
    batch_id: 'BATCH-2026-001',
    sender_name: '张伟',
    sender_id_no: '310101199001011234',
    receiver_name: '李娜',
    receiver_id_no: '440101199202022345',
    category: '服饰',
    item_name: '冬季羽绒服',
    declared_value: 899.00,
    weight: 1.5,
    origin_country: '日本'
  },
  {
    package_no: 'PKG002',
    batch_id: 'BATCH-2026-001',
    sender_name: '王芳',
    sender_id_no: '310101198505053456',
    receiver_name: '刘强',
    receiver_id_no: '',
    category: '电子产品',
    item_name: '无线耳机',
    declared_value: 599.00,
    weight: 0.3,
    origin_country: '美国'
  },
  {
    package_no: 'PKG003',
    batch_id: 'BATCH-2026-001',
    sender_name: '陈静',
    sender_id_no: '310101199103034567',
    receiver_name: '赵磊',
    receiver_id_no: '320101198808085678',
    category: '保健品',
    item_name: '维生素片',
    declared_value: 299.00,
    weight: 0.5,
    origin_country: '澳大利亚'
  },
  {
    package_no: 'PKG004',
    batch_id: 'BATCH-2026-002',
    sender_name: '孙丽',
    sender_id_no: '310101199306066789',
    receiver_name: '周杰',
    receiver_id_no: '510101199009097890',
    category: '美妆',
    item_name: '护肤套装',
    declared_value: 1299.00,
    weight: 0.8,
    origin_country: '韩国'
  },
  {
    package_no: 'PKG005',
    batch_id: 'BATCH-2026-002',
    sender_name: '吴敏',
    sender_id_no: '310101198707077890',
    receiver_name: '郑浩',
    receiver_id_no: '',
    category: '母婴',
    item_name: '婴儿奶粉',
    declared_value: 459.00,
    weight: 2.0,
    origin_country: '德国'
  }
];

const supplementary = [
  {
    package_no: 'PKG001',
    batch_id: 'SUPP-2026-001',
    id_proof_url: '/id/proof/PKG001.jpg',
    id_proof_type: '身份证',
    id_verified: true,
    item_category: '服饰',
    item_quantity: 2,
    purchase_receipt_url: '/receipt/PKG001.pdf',
    additional_info: '品牌：Uniqlo'
  },
  {
    package_no: 'PKG002',
    batch_id: 'SUPP-2026-001',
    id_proof_url: '',
    id_proof_type: '',
    id_verified: false,
    item_category: '电子产品',
    item_quantity: 1,
    purchase_receipt_url: '/receipt/PKG002.pdf',
    additional_info: ''
  },
  {
    package_no: 'PKG003',
    batch_id: 'SUPP-2026-001',
    id_proof_url: '/id/proof/PKG003.jpg',
    id_proof_type: '护照',
    id_verified: true,
    item_category: '食品',
    item_quantity: 3,
    purchase_receipt_url: '/receipt/PKG003.pdf',
    additional_info: '品类申报与补录不一致（保健品 vs 食品）'
  },
  {
    package_no: 'PKG004',
    batch_id: 'SUPP-2026-002',
    id_proof_url: '/id/proof/PKG004.jpg',
    id_proof_type: '身份证',
    id_verified: true,
    item_category: '美妆',
    item_quantity: 1,
    purchase_receipt_url: '/receipt/PKG004.pdf',
    additional_info: ''
  }
];

const inspections = [
  {
    package_no: 'PKG001',
    batch_id: 'INSP-2026-001',
    inspect_result: 'pass',
    inspect_time: '2026-06-08 10:30:00',
    inspector: '海关-王警官',
    category_checked: '服饰',
    category_match: true,
    id_checked: true,
    id_match: true,
    value_checked: 899.00,
    value_match: true,
    notes: '正常放行'
  },
  {
    package_no: 'PKG002',
    batch_id: 'INSP-2026-001',
    inspect_result: 'fail',
    inspect_time: '2026-06-08 11:15:00',
    inspector: '海关-李警官',
    category_checked: '电子产品',
    category_match: true,
    id_checked: false,
    id_match: false,
    value_checked: 599.00,
    value_match: true,
    notes: '缺少收件人身份证明，暂扣待补'
  },
  {
    package_no: 'PKG004',
    batch_id: 'INSP-2026-001',
    inspect_result: 'fail',
    inspect_time: '2026-06-08 14:20:00',
    inspector: '海关-张警官',
    category_checked: '美妆',
    category_match: true,
    id_checked: true,
    id_match: true,
    value_checked: 1299.00,
    value_match: true,
    notes: '申报价值超限，需进一步核实'
  }
];

const reviews = [
  {
    package_no: 'PKG004',
    reviewer: '复核员-陈姐',
    review_comment: '查验未通过但已人工复核放行，需重点关注',
    review_status: 'released'
  }
];

const tx = db.transaction(() => {
  const declStmt = db.prepare(`
    INSERT OR IGNORE INTO declarations
    (package_no, batch_id, sender_name, sender_id_no, receiver_name, receiver_id_no,
     category, item_name, declared_value, weight, origin_country, raw_csv)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  declarations.forEach(d => {
    declStmt.run(
      d.package_no, d.batch_id, d.sender_name, d.sender_id_no,
      d.receiver_name, d.receiver_id_no, d.category, d.item_name,
      d.declared_value, d.weight, d.origin_country, JSON.stringify(d)
    );
    upsertPackage(d.package_no, 'declared');
  });

  const suppStmt = db.prepare(`
    INSERT OR IGNORE INTO supplementary
    (package_no, batch_id, id_proof_url, id_proof_type, id_verified,
     item_category, item_quantity, purchase_receipt_url, additional_info)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  supplementary.forEach(s => {
    suppStmt.run(
      s.package_no, s.batch_id, s.id_proof_url, s.id_proof_type,
      s.id_verified ? 1 : 0, s.item_category, s.item_quantity,
      s.purchase_receipt_url, s.additional_info
    );
    const pkg = db.prepare('SELECT status FROM packages WHERE package_no = ?').get(s.package_no);
    if (pkg && (pkg.status === 'pending' || pkg.status === 'declared')) {
      updatePackageStatus(s.package_no, 'supplementary');
    }
  });

  const inspStmt = db.prepare(`
    INSERT OR IGNORE INTO inspections
    (package_no, batch_id, inspect_result, inspect_time, inspector,
     category_checked, category_match, id_checked, id_match,
     value_checked, value_match, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  inspections.forEach(i => {
    inspStmt.run(
      i.package_no, i.batch_id, i.inspect_result, i.inspect_time, i.inspector,
      i.category_checked, i.category_match ? 1 : 0, i.id_checked ? 1 : 0,
      i.id_match ? 1 : 0, i.value_checked, i.value_match ? 1 : 0, i.notes
    );
    let status = 'inspected';
    if (i.inspect_result === 'pass') status = 'inspection_pass';
    else if (i.inspect_result === 'fail') status = 'inspection_fail';
    updatePackageStatus(i.package_no, status);
  });

  const reviewStmt = db.prepare(`
    INSERT INTO reviews (package_no, reviewer, review_comment, review_status)
    VALUES (?, ?, ?, ?)
  `);

  reviews.forEach(r => {
    reviewStmt.run(r.package_no, r.reviewer, r.review_comment, r.review_status);
    if (r.review_status) {
      updatePackageStatus(r.package_no, r.review_status);
    }
  });
});

try {
  tx();
  console.log('✅ 测试数据填充完成！');
  console.log(`   - 申报记录: ${declarations.length} 条`);
  console.log(`   - 补录记录: ${supplementary.length} 条`);
  console.log(`   - 查验记录: ${inspections.length} 条`);
  console.log(`   - 复核记录: ${reviews.length} 条`);
  console.log(`   - 包裹总数: ${db.prepare('SELECT COUNT(*) as c FROM packages').get().c} 个`);
  console.log('\n📋 异常数据说明:');
  console.log('   - PKG002: 缺少收件人身份证明（可在 missing-id 接口查到）');
  console.log('   - PKG005: 缺少收件人身份证明（只有申报无补录）');
  console.log('   - PKG003: 申报品类(保健品)与补录品类(食品)不一致');
  console.log('   - PKG004: 查验未通过但已人工放行（failed-but-released）');
} catch (err) {
  console.error('❌ 填充失败:', err.message);
  process.exit(1);
}
