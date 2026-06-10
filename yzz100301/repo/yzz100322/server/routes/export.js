const express = require('express');
const { prepare } = require('../db');
const XLSX = require('xlsx');
const dayjs = require('dayjs');

const router = express.Router();

router.get('/excel', (req, res) => {
  try {
    const { 
      keyword, 
      startDate, 
      endDate,
      hasReservation,
      hasRecognition,
      hasManualRelease,
      plateMismatch,
      overtime,
      auditStatus,
      releaseType,
      gate
    } = req.query;

    let whereClauses = [];
    let params = [];

    if (keyword) {
      whereClauses.push('(plate_number LIKE ? OR reservation_no LIKE ? OR visitor_name LIKE ? OR operator LIKE ?)');
      const likeKeyword = `%${keyword}%`;
      params.push(likeKeyword, likeKeyword, likeKeyword, likeKeyword);
    }

    if (startDate) {
      whereClauses.push('visit_date >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereClauses.push('visit_date <= ?');
      params.push(endDate);
    }

    if (hasReservation === '1') {
      whereClauses.push('has_reservation = 1');
    } else if (hasReservation === '0') {
      whereClauses.push('has_reservation = 0');
    }

    if (hasRecognition === '1') {
      whereClauses.push('has_recognition = 1');
    } else if (hasRecognition === '0') {
      whereClauses.push('has_recognition = 0');
    }

    if (hasManualRelease === '1') {
      whereClauses.push('has_manual_release = 1');
    } else if (hasManualRelease === '0') {
      whereClauses.push('has_manual_release = 0');
    }

    if (plateMismatch === '1') {
      whereClauses.push('plate_matched = 0');
    }

    if (overtime === '1') {
      whereClauses.push('is_overtime = 1');
    }

    if (auditStatus) {
      whereClauses.push('audit_status = ?');
      params.push(auditStatus);
    }

    if (releaseType) {
      whereClauses.push('release_type = ?');
      params.push(releaseType);
    }

    if (gate) {
      whereClauses.push('gate = ?');
      params.push(gate);
    }

    let whereSql = '';
    if (whereClauses.length > 0) {
      whereSql = ' WHERE ' + whereClauses.join(' AND ');
    }

    const sql = `SELECT * FROM visit_records${whereSql} ORDER BY COALESCE(release_time, recognize_time, visit_date) DESC`;
    const records = prepare(sql).all(...params);

    const exportData = records.map(r => ({
      '序号': r.id,
      '车牌号': r.plate_number || '-',
      '预约号': r.reservation_no || '-',
      '访客姓名': r.visitor_name || '-',
      '来访日期': r.visit_date || '-',
      '预计入场': r.expected_start || '-',
      '预计离场': r.expected_end || '-',
      '识别时间': r.recognize_time || '-',
      '放行时间': r.release_time || '-',
      '放行方式': r.release_type === 'manual' ? '人工放行' : r.release_type === 'auto' ? '自动放行' : '-',
      '门岗': r.gate || '-',
      '操作员': r.operator || '-',
      '被访部门': r.host_department || '-',
      '被访人': r.host_name || '-',
      '来访事由': r.visit_purpose || '-',
      '有预约': r.has_reservation ? '是' : '否',
      '有识别': r.has_recognition ? '是' : '否',
      '有人工放行': r.has_manual_release ? '是' : '否',
      '车牌一致': r.plate_matched ? '是' : '否',
      '超时停留': r.is_overtime ? '是' : '否',
      '复核状态': getAuditStatusLabel(r.audit_status),
      '复核意见': r.audit_opinion || '',
      '复核时间': r.audit_time || '-',
      '复核人': r.auditor || '-'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    ws['!cols'] = [
      { wch: 6 }, { wch: 12 }, { wch: 18 }, { wch: 10 }, { wch: 12 },
      { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 15 },
      { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 15 }, { wch: 20 }, { wch: 10 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, '访客放行审计记录');

    const summaryData = [
      { '统计项': '总记录数', '数量': records.length },
      { '统计项': '有预约记录', '数量': records.filter(r => r.has_reservation).length },
      { '统计项': '无预约记录', '数量': records.filter(r => !r.has_reservation).length },
      { '统计项': '车牌识别不一致', '数量': records.filter(r => !r.plate_matched).length },
      { '统计项': '超时停留', '数量': records.filter(r => r.is_overtime).length },
      { '统计项': '人工放行', '数量': records.filter(r => r.has_manual_release).length },
      { '统计项': '待复核', '数量': records.filter(r => r.audit_status === 'pending').length },
      { '统计项': '已复核', '数量': records.filter(r => r.audit_status !== 'pending').length }
    ];

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 20 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, '统计汇总');

    const fileName = `访客放行审计报告_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`;
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(buffer);
  } catch (err) {
    console.error('导出Excel出错:', err);
    res.status(500).json({ error: err.message });
  }
});

function getAuditStatusLabel(status) {
  const map = {
    'pending': '待复核',
    'normal': '正常放行',
    'warning': '需关注',
    'abnormal': '异常放行',
    'reviewed': '已复核'
  };
  return map[status] || status || '待复核';
}

module.exports = router;
