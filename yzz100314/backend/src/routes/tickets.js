const express = require('express');
const router = express.Router();
const db = require('../db');
const { checkSlaViolation, formatDateTime, getSlaConfig } = require('../utils/date');

function buildTicketDetail(ticket) {
  const escalations = db.getCollection('escalations')
    .filter(e => e.ticket_no === ticket.ticket_no)
    .sort((a, b) => (a.escalation_time_ts || 0) - (b.escalation_time_ts || 0));

  const replies = db.getCollection('replies')
    .filter(r => r.ticket_no === ticket.ticket_no)
    .sort((a, b) => (a.reply_time_ts || 0) - (b.reply_time_ts || 0));

  const review = db.getCollection('reviews')
    .find(r => r.ticket_no === ticket.ticket_no) || null;

  const firstReplyTs = replies.length > 0 ? replies[0].reply_time_ts : null;
  const slaViolations = checkSlaViolation(ticket, firstReplyTs);

  const anomalies = [];

  if (slaViolations.length > 0) {
    anomalies.push({
      type: 'sla_violation',
      label: 'SLA超时',
      details: slaViolations,
    });
  }

  if (escalations.length > 1) {
    anomalies.push({
      type: 'duplicate_escalation',
      label: `重复升级(${escalations.length}次)`,
      count: escalations.length,
    });
  }

  const createdTs = ticket.created_at_ts;
  for (const r of replies) {
    if (createdTs && r.reply_time_ts && r.reply_time_ts < createdTs) {
      anomalies.push({
        type: 'reply_before_create',
        label: '回复时间早于创建时间',
        reply_time: r.reply_time,
        create_time: ticket.created_at,
      });
      break;
    }
  }

  for (const e of escalations) {
    if (createdTs && e.escalation_time_ts && e.escalation_time_ts < createdTs) {
      anomalies.push({
        type: 'escalation_before_create',
        label: '升级时间早于创建时间',
      });
      break;
    }
  }

  const timeLine = [];

  if (ticket.created_at) {
    timeLine.push({
      type: 'created',
      label: '工单创建',
      time: ticket.created_at,
      ts: ticket.created_at_ts,
      source: ticket.source,
    });
  }

  for (const e of escalations) {
    timeLine.push({
      type: 'escalation',
      label: `升级: ${e.escalation_from || '?'} → ${e.escalation_to || '?'}`,
      time: e.escalation_time,
      ts: e.escalation_time_ts,
      source: e.source,
      detail: e.escalation_reason,
    });
  }

  for (const r of replies) {
    timeLine.push({
      type: 'reply',
      label: `回复 (${r.replier || '未知'})`,
      time: r.reply_time,
      ts: r.reply_time_ts,
      source: r.source,
      detail: r.reply_content,
    });
  }

  timeLine.sort((a, b) => (a.ts || 0) - (b.ts || 0));

  const slaConfig = getSlaConfig(ticket.priority);

  return {
    ...ticket,
    escalations,
    replies,
    review,
    anomalies,
    has_anomaly: anomalies.length > 0,
    timeline: timeLine,
    first_reply_at: firstReplyTs ? formatDateTime(firstReplyTs) : '',
    sla_config: slaConfig,
    sla_violated: slaViolations.length > 0,
    escalation_count: escalations.length,
    reply_count: replies.length,
  };
}

function checkTicketHasReplyBeforeCreate(ticketNo) {
  const ticket = db.getCollection('tickets').find(t => t.ticket_no === ticketNo);
  if (!ticket || !ticket.created_at_ts) return false;
  const replies = db.getCollection('replies').filter(r => r.ticket_no === ticketNo);
  return replies.some(r => r.reply_time_ts && r.reply_time_ts < ticket.created_at_ts);
}

router.get('/', (req, res) => {
  try {
    const { 
      page = 1, 
      page_size = 20, 
      keyword = '', 
      anomaly_type = '',
      priority = '',
      has_review = '',
      sort_by = 'created_at',
      sort_order = 'desc',
    } = req.query;

    const pageNum = parseInt(page);
    const pageSize = parseInt(page_size);
    const offset = (pageNum - 1) * pageSize;

    let tickets = db.getCollection('tickets');

    if (keyword) {
      const kw = keyword.toLowerCase();
      tickets = tickets.filter(t => 
        t.ticket_no.toLowerCase().includes(kw) ||
        (t.title && t.title.toLowerCase().includes(kw))
      );
    }

    if (priority) {
      tickets = tickets.filter(t => t.priority === priority);
    }

    let detailedTickets = tickets.map(t => {
      const detail = buildTicketDetail(t);
      return {
        id: t.id,
        ticket_no: t.ticket_no,
        title: t.title,
        type: t.type,
        priority: t.priority,
        created_at: t.created_at,
        current_status: t.current_status,
        source: t.source,
        has_anomaly: detail.has_anomaly,
        anomaly_types: detail.anomalies.map(a => a.type),
        sla_violated: detail.sla_violated,
        escalation_count: detail.escalation_count,
        reply_count: detail.reply_count,
        has_review: !!detail.review,
        review: detail.review ? {
          review_opinion: detail.review.review_opinion,
          responsible_party: detail.review.responsible_party,
          sla_violation: detail.review.sla_violation,
        } : null,
        created_at_ts: t.created_at_ts,
      };
    });

    if (anomaly_type) {
      detailedTickets = detailedTickets.filter(t => {
        if (anomaly_type === 'all') return t.has_anomaly;
        if (anomaly_type === 'sla_violation') return t.sla_violated;
        if (anomaly_type === 'duplicate_escalation') return t.escalation_count > 1;
        if (anomaly_type === 'reply_before_create') {
          return checkTicketHasReplyBeforeCreate(t.ticket_no);
        }
        return t.anomaly_types.includes(anomaly_type);
      });
    }

    if (has_review === 'yes') {
      detailedTickets = detailedTickets.filter(t => t.has_review);
    } else if (has_review === 'no') {
      detailedTickets = detailedTickets.filter(t => !t.has_review);
    }

    const sortField = sort_by === 'ticket_no' ? 'ticket_no' : 
                       sort_by === 'priority' ? 'priority' : 'created_at_ts';
    const sortOrder = sort_order === 'asc' ? 1 : -1;

    detailedTickets.sort((a, b) => {
      const av = a[sortField] || '';
      const bv = b[sortField] || '';
      if (av < bv) return -1 * sortOrder;
      if (av > bv) return 1 * sortOrder;
      return 0;
    });

    const total = detailedTickets.length;
    const pagedResult = detailedTickets.slice(offset, offset + pageSize);

    res.json({
      total,
      page: pageNum,
      page_size: pageSize,
      list: pagedResult,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/anomalies/summary', (req, res) => {
  try {
    const tickets = db.getCollection('tickets');
    
    let slaViolationCount = 0;
    let duplicateEscalationCount = 0;
    let timeAbnormalCount = 0;
    let totalAnomalyTickets = 0;

    for (const t of tickets) {
      const detail = buildTicketDetail(t);
      if (detail.has_anomaly) totalAnomalyTickets++;
      if (detail.sla_violated) slaViolationCount++;
      if (detail.escalation_count > 1) duplicateEscalationCount++;
      if (detail.anomalies.some(a => a.type === 'reply_before_create' || a.type === 'escalation_before_create')) {
        timeAbnormalCount++;
      }
    }

    res.json({
      total_tickets: tickets.length,
      total_anomaly_tickets: totalAnomalyTickets,
      sla_violations: slaViolationCount,
      duplicate_escalations: duplicateEscalationCount,
      time_abnormal: timeAbnormalCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:ticketNo', (req, res) => {
  try {
    const ticket = db.getCollection('tickets').find(t => t.ticket_no === req.params.ticketNo);
    if (!ticket) {
      return res.status(404).json({ error: '工单不存在' });
    }
    const detail = buildTicketDetail(ticket);
    res.json(detail);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, buildTicketDetail };
