const express = require('express');
const { db } = require('../db');

const router = express.Router();

function buildSupplementaryReport() {
  const sql = `
    SELECT
      p.package_no,
      p.status,
      p.created_at as package_created,
      p.updated_at as package_updated,
      d.sender_name,
      d.sender_id_no,
      d.receiver_name,
      d.receiver_id_no,
      d.category as decl_category,
      d.item_name,
      d.declared_value,
      d.weight,
      d.origin_country,
      d.import_time as decl_time,
      s.id_proof_url,
      s.id_proof_type,
      s.id_verified,
      s.item_category as supp_category,
      s.item_quantity,
      s.purchase_receipt_url,
      s.additional_info,
      s.import_time as supp_time,
      i.inspect_result,
      i.inspect_time,
      i.inspector,
      i.category_checked,
      i.category_match,
      i.id_checked,
      i.id_match,
      i.notes as inspect_notes,
      r.reviewer as last_reviewer,
      r.review_comment as last_review_comment,
      r.review_status as last_review_status,
      r.review_time as last_review_time
    FROM packages p
    LEFT JOIN declarations d ON d.id = (
      SELECT id FROM declarations WHERE package_no = p.package_no ORDER BY import_time DESC LIMIT 1
    )
    LEFT JOIN supplementary s ON s.id = (
      SELECT id FROM supplementary WHERE package_no = p.package_no ORDER BY import_time DESC LIMIT 1
    )
    LEFT JOIN inspections i ON i.id = (
      SELECT id FROM inspections WHERE package_no = p.package_no ORDER BY import_time DESC LIMIT 1
    )
    LEFT JOIN reviews r ON r.id = (
      SELECT id FROM reviews WHERE package_no = p.package_no ORDER BY created_at DESC LIMIT 1
    )
    ORDER BY p.updated_at DESC
  `;

  const rows = db.prepare(sql).all();

  const result = rows.map(row => {
    const issues = [];

    const hasIdProof = (row.receiver_id_no && row.receiver_id_no !== '') ||
      (row.id_proof_url && row.id_proof_url !== '' && row.id_verified === 1);
    if (!hasIdProof) {
      issues.push('身份证明缺失');
    }

    if (row.decl_category && row.supp_category && row.decl_category !== row.supp_category) {
      issues.push(`品类不一致(申报:${row.decl_category}/补录:${row.supp_category})`);
    }

    if (row.category_match === 0) {
      issues.push('海关查验品类不匹配');
    }

    const inspectionFailed = row.inspect_result === 'fail' ||
      row.inspect_result === '不通过' ||
      row.inspect_result === '未通过';
    const released = row.status === 'released' || row.status === 'review_pass';
    if (inspectionFailed && released) {
      issues.push('查验未通过但已放行');
    }

    const dataMissing = [];
    if (!row.decl_category) dataMissing.push('申报品类');
    if (!row.item_name) dataMissing.push('物品名称');
    if (!row.declared_value) dataMissing.push('申报价值');
    if (!row.receiver_name) dataMissing.push('收件人');
    if (!row.id_proof_url && !row.receiver_id_no) dataMissing.push('身份证明');
    if (!row.id_verified) dataMissing.push('身份核验');

    return {
      package_no: row.package_no,
      status: row.status,
      status_text: statusText(row.status),
      has_issues: issues.length > 0,
      issues,
      data_missing: dataMissing,
      declaration: {
        sender_name: row.sender_name,
        sender_id_no: row.sender_id_no,
        receiver_name: row.receiver_name,
        receiver_id_no: row.receiver_id_no,
        category: row.decl_category,
        item_name: row.item_name,
        declared_value: row.declared_value,
        weight: row.weight,
        origin_country: row.origin_country,
        import_time: row.decl_time
      },
      supplementary: {
        id_proof_url: row.id_proof_url,
        id_proof_type: row.id_proof_type,
        id_verified: row.id_verified === 1,
        item_category: row.supp_category,
        item_quantity: row.item_quantity,
        purchase_receipt_url: row.purchase_receipt_url,
        additional_info: row.additional_info,
        import_time: row.supp_time
      },
      inspection: {
        inspect_result: row.inspect_result,
        inspect_time: row.inspect_time,
        inspector: row.inspector,
        category_checked: row.category_checked,
        category_match: row.category_match === 1,
        id_checked: row.id_checked === 1,
        id_match: row.id_match === 1,
        notes: row.inspect_notes
      },
      latest_review: {
        reviewer: row.last_reviewer,
        comment: row.last_review_comment,
        status: row.last_review_status,
        review_time: row.last_review_time
      }
    };
  });

  return result;
}

function statusText(status) {
  const map = {
    'pending': '待处理',
    'declared': '已申报',
    'supplementary': '已补录',
    'inspected': '已查验',
    'inspection_pass': '查验通过',
    'inspection_fail': '查验未通过',
    'reviewing': '复核中',
    'review_pass': '复核通过',
    'review_fail': '复核不通过',
    'released': '已放行',
    'held': '暂扣',
    'returned': '退运'
  };
  return map[status] || status;
}

router.get('/report', (req, res) => {
  const { format = 'json', only_issues = 'false' } = req.query;
  let report = buildSupplementaryReport();

  if (only_issues === 'true') {
    report = report.filter(r => r.has_issues);
  }

  if (format === 'csv') {
    const headers = [
      '包裹号', '状态', '是否有异常', '异常说明',
      '收件人', '收件人身份证', '申报品类', '补录品类',
      '物品名称', '申报价值', '重量', '原产国',
      '是否有身份证明', '身份是否核验通过',
      '查验结果', '查验人', '查验时间',
      '最新复核人', '最新复核意见', '最新复核状态',
      '资料缺失项', '更新时间'
    ];

    const csvRows = [headers.join(',')];

    report.forEach(r => {
      const d = r.declaration;
      const s = r.supplementary;
      const i = r.inspection;
      const rev = r.latest_review;

      const row = [
        r.package_no,
        r.status_text,
        r.has_issues ? '是' : '否',
        '"' + (r.issues.join('；') || '') + '"',
        d.receiver_name || '',
        d.receiver_id_no || '',
        d.category || '',
        s.item_category || '',
        d.item_name || '',
        d.declared_value || '',
        d.weight || '',
        d.origin_country || '',
        s.id_proof_url ? '是' : '否',
        s.id_verified ? '是' : '否',
        i.inspect_result || '',
        i.inspector || '',
        i.inspect_time || '',
        rev.reviewer || '',
        '"' + (rev.comment || '') + '"',
        rev.status || '',
        '"' + (r.data_missing.join('、') || '') + '"',
        new Date().toISOString()
      ].map(v => String(v).replace(/"/g, '""'));

      csvRows.push(row.join(','));
    });

    const csvContent = '\uFEFF' + csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="customs_supplementary_report_${Date.now()}.csv"`);
    res.send(csvContent);
  } else {
    const summary = {
      total: report.length,
      with_issues: report.filter(r => r.has_issues).length,
      by_status: {},
      export_time: new Date().toISOString()
    };

    report.forEach(r => {
      summary.by_status[r.status] = (summary.by_status[r.status] || 0) + 1;
    });

    res.json({
      summary,
      data: report
    });
  }
});

module.exports = router;
