const express = require('express');
const router = express.Router();
const db = require('../db');
const dayjs = require('dayjs');

router.put('/:ticketNo', (req, res) => {
  try {
    const { ticketNo } = req.params;
    const { review_opinion, responsible_party, reviewer, sla_violation, violation_type } = req.body;

    const ticket = db.getCollection('tickets').find(t => t.ticket_no === ticketNo);
    if (!ticket) {
      return res.status(404).json({ error: '工单不存在' });
    }

    const reviews = db.getCollection('reviews');
    const existingIdx = reviews.findIndex(r => r.ticket_no === ticketNo);
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');

    let review;
    if (existingIdx !== -1) {
      reviews[existingIdx] = {
        ...reviews[existingIdx],
        review_opinion: review_opinion || '',
        responsible_party: responsible_party || '',
        reviewer: reviewer || '',
        sla_violation: sla_violation ? 1 : 0,
        violation_type: violation_type || '',
        reviewed_at: now,
        updated_at: now,
      };
      review = reviews[existingIdx];
    } else {
      review = {
        id: Date.now(),
        ticket_no: ticketNo,
        review_opinion: review_opinion || '',
        responsible_party: responsible_party || '',
        reviewer: reviewer || '',
        sla_violation: sla_violation ? 1 : 0,
        violation_type: violation_type || '',
        reviewed_at: now,
        updated_at: now,
      };
      reviews.push(review);
    }

    db.setCollection('reviews', reviews);
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:ticketNo', (req, res) => {
  try {
    const review = db.getCollection('reviews').find(r => r.ticket_no === req.params.ticketNo);
    if (!review) {
      return res.json(null);
    }
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
