const express = require('express');
const router = express.Router();
const db = require('../db');
const { buildTicketDetail } = require('./tickets');
const { formatDateTime } = require('../utils/date');
const XLSX = require('xlsx');

router.get('/summary', (req, res) => {
  try {
    const tickets = db.getCollection('tickets');
    const details = tickets.map(t => buildTicketDetail(t));

    const total = tickets.length;
    const withAnomalies = details.filter(d => d.has_anomaly).length;
    const slaViolated = details.filter(d => d.sla_violated).length;
    const duplicateEscalations = details.filter(d => d.escalation_count > 1).length;
    const timeAbnormal = details.filter(d => 
      d.anomalies.some(a => a.type === 'reply_before_create' || a.type === 'escalation_before_create')
    ).length;
    const reviewed = details.filter(d => d.review).length;

    const priorityStats = {};
    for (const d of details) {
      const p = d.priority || 'unknown';
      if (!priorityStats[p]) {
        priorityStats[p] = { total: 0, sla_violated: 0 };
      }
      priorityStats[p].total++;
      if (d.sla_violated) priorityStats[p].sla_violated++;
    }

    const sourceStats = {};
    for (const d of details) {
      const s = d.source || 'unknown';
      if (!sourceStats[s]) sourceStats[s] = 0;
      sourceStats[s]++;
    }

    const responsibleStats = {};
    for (const d of details) {
      if (d.review && d.review.responsible_party) {
        const rp = d.review.responsible_party;
        if (!responsibleStats[rp]) responsibleStats[rp] = 0;
        responsibleStats[rp]++;
      }
    }

    res.json({
      total_tickets: total,
      with_anomalies: withAnomalies,
      sla_violations: slaViolated,
      duplicate_escalations: duplicateEscalations,
      time_abnormal: timeAbnormal,
      reviewed_count: reviewed,
      review_rate: total > 0 ? (reviewed / total * 100).toFixed(1) + '%' : '0%',
      priority_stats: priorityStats,
      source_stats: sourceStats,
      responsible_stats: responsibleStats,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/export', (req, res) => {
  try {
    const { anomaly_only = 'false' } = req.query;
    
    const tickets = db.getCollection('tickets')
      .sort((a, b) => (b.created_at_ts || 0) - (a.created_at_ts || 0));
    
    let details = tickets.map(t => buildTicketDetail(t));

    if (anomaly_only === 'true') {
      details = details.filter(d => d.has_anomaly);
    }

    const rows = details.map(d => ({
      '工单号': d.ticket_no,
      '标题': d.title || '',
      '类型': d.type || '',
      '优先级': d.priority || '',
      '创建时间': d.created_at || '',
      '创建人': d.creator || '',
      '工单来源': d.source || '',
      '当前状态': d.current_status || '',
      '首次回复时间': d.first_reply_at || '未回复',
      '升级次数': d.escalation_count,
      '回复次数': d.reply_count,
      '是否SLA超时': d.sla_violated ? '是' : '否',
      '是否有异常': d.has_anomaly ? '是' : '否',
      '异常类型': d.anomalies.map(a => a.label).join('; '),
      '复核状态': d.review ? '已复核' : '未复核',
      '复核意见': d.review?.review_opinion || '',
      '责任归属': d.review?.responsible_party || '',
      '复核人': d.review?.reviewer || '',
      '复核时间': d.review?.reviewed_at || '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    
    if (rows.length > 0) {
      ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.max(10, k.length * 2) }));
    }
    
    XLSX.utils.book_append_sheet(wb, ws, 'SLA审计报告');

    const summaryRow = [{
      '工单号': `生成时间: ${formatDateTime(Date.now())}`,
      '标题': `总工单: ${details.length}`,
      '类型': `SLA超时: ${details.filter(d => d.sla_violated).length}`,
      '优先级': `重复升级: ${details.filter(d => d.escalation_count > 1).length}`,
    }];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRow);
    XLSX.utils.book_append_sheet(wb, wsSummary, '汇总');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const fileName = `SLA审计报告_${formatDateTime(Date.now(), 'YYYYMMDD_HHmmss')}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/details/:ticketNo/export', (req, res) => {
  try {
    const ticket = db.getCollection('tickets').find(t => t.ticket_no === req.params.ticketNo);
    if (!ticket) {
      return res.status(404).json({ error: '工单不存在' });
    }

    const detail = buildTicketDetail(ticket);

    const wb = XLSX.utils.book_new();
    
    const infoRows = [
      { '项目': '工单号', '值': detail.ticket_no },
      { '项目': '标题', '值': detail.title || '' },
      { '项目': '类型', '值': detail.type || '' },
      { '项目': '优先级', '值': detail.priority || '' },
      { '项目': '创建时间', '值': detail.created_at || '' },
      { '项目': 'SLA首次响应时限(小时)', '值': (detail.sla_config.first_response / 3600000).toFixed(1) },
      { '项目': '是否SLA超时', '值': detail.sla_violated ? '是' : '否' },
      { '项目': '异常情况', '值': detail.anomalies.map(a => a.label).join('; ') || '无' },
      { '项目': '复核状态', '值': detail.review ? '已复核' : '未复核' },
      { '项目': '复核意见', '值': detail.review?.review_opinion || '' },
      { '项目': '责任归属', '值': detail.review?.responsible_party || '' },
    ];
    const wsInfo = XLSX.utils.json_to_sheet(infoRows);
    wsInfo['!cols'] = [{ wch: 20 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsInfo, '工单信息');
    
    const timelineRows = detail.timeline.map((item, idx) => ({
      '序号': idx + 1,
      '时间': item.time || '',
      '类型': item.label,
      '详情': item.detail || '',
      '来源': item.source || '',
    }));
    const wsTimeline = XLSX.utils.json_to_sheet(timelineRows);
    wsTimeline['!cols'] = [{ wch: 6 }, { wch: 20 }, { wch: 25 }, { wch: 50 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsTimeline, '时间线');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const fileName = `工单详情_${detail.ticket_no}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
