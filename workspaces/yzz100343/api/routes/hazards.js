import { getDb } from '../database.js';
import { generateId, todayISO, isOverdueDeadline, updateOverdueStatus } from '../utils.js';

export async function getHazards(req, res) {
  const { status, team, onlyOverdue } = req.query;
  const db = await getDb();
  
  await updateOverdueStatus();
  
  let sql = `
    SELECT h.*,
           COALESCE(r.description, '') as lastRectDesc,
           COALESCE(r.photoUrl, '') as lastRectPhoto,
           COALESCE(r.submittedAt, '') as lastRectTime,
           COALESCE(r.submittedBy, '') as lastRectBy,
           COALESCE(v.passed, '') as lastReviewPassed,
           COALESCE(v.comment, '') as lastReviewComment,
           COALESCE(v.reviewedAt, '') as lastReviewTime,
           COALESCE(v.reviewedBy, '') as lastReviewBy
    FROM hazards h
    LEFT JOIN (
      SELECT r.* FROM rectifications r 
      WHERE (r.hazardId, r.submittedAt) IN (
        SELECT hazardId, MAX(submittedAt) FROM rectifications GROUP BY hazardId
      )
    ) r ON h.id = r.hazardId
    LEFT JOIN (
      SELECT v.* FROM reviews v 
      WHERE (v.hazardId, v.reviewedAt) IN (
        SELECT hazardId, MAX(reviewedAt) FROM reviews GROUP BY hazardId
      )
    ) v ON h.id = v.hazardId
  `;
  
  const params = [];
  const conditions = [];
  
  if (status && status !== 'ALL') {
    conditions.push('h.status = ?');
    params.push(status);
  }
  
  if (team && team !== 'ALL') {
    conditions.push('h.team = ?');
    params.push(team);
  }
  
  if (onlyOverdue === 'true') {
    conditions.push('h.isOverdue = 1');
    conditions.push('h.status != "CLOSED"');
  }
  
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  
  sql += ' ORDER BY h.createdAt DESC';
  
  const rows = await db.all(sql, params);
  
  const hazards = await Promise.all(rows.map(async (row) => {
    const rectifications = await db.all(
      'SELECT * FROM rectifications WHERE hazardId = ? ORDER BY submittedAt ASC',
      row.id
    );
    const reviews = await db.all(
      'SELECT * FROM reviews WHERE hazardId = ? ORDER BY reviewedAt ASC',
      row.id
    );
    
    return {
      id: row.id,
      boxNumber: row.boxNumber,
      location: row.location,
      description: row.description,
      photoUrl: row.photoUrl || undefined,
      team: row.team,
      deadline: row.deadline,
      status: row.status,
      rejectCount: row.rejectCount,
      isOverdue: row.isOverdue === 1,
      createdAt: row.createdAt,
      createdBy: row.createdBy,
      rectifications: rectifications.map(r => ({
        id: r.id,
        hazardId: r.hazardId,
        description: r.description,
        photoUrl: r.photoUrl || undefined,
        submittedAt: r.submittedAt,
        submittedBy: r.submittedBy,
      })),
      reviews: reviews.map(v => ({
        id: v.id,
        hazardId: v.hazardId,
        passed: v.passed === 1,
        comment: v.comment,
        reviewedAt: v.reviewedAt,
        reviewedBy: v.reviewedBy,
      })),
    };
  }));
  
  res.json(hazards);
}

export async function getHazardById(req, res) {
  const { id } = req.params;
  const db = await getDb();
  
  const row = await db.get('SELECT * FROM hazards WHERE id = ?', id);
  
  if (!row) {
    return res.status(404).json({ error: '隐患记录不存在' });
  }
  
  const rectifications = await db.all(
    'SELECT * FROM rectifications WHERE hazardId = ? ORDER BY submittedAt ASC',
    id
  );
  const reviews = await db.all(
    'SELECT * FROM reviews WHERE hazardId = ? ORDER BY reviewedAt ASC',
    id
  );
  
  res.json({
    id: row.id,
    boxNumber: row.boxNumber,
    location: row.location,
    description: row.description,
    photoUrl: row.photoUrl || undefined,
    team: row.team,
    deadline: row.deadline,
    status: row.status,
    rejectCount: row.rejectCount,
    isOverdue: row.isOverdue === 1,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    rectifications: rectifications.map(r => ({
      id: r.id,
      hazardId: r.hazardId,
      description: r.description,
      photoUrl: r.photoUrl || undefined,
      submittedAt: r.submittedAt,
      submittedBy: r.submittedBy,
    })),
    reviews: reviews.map(v => ({
      id: v.id,
      hazardId: v.hazardId,
      passed: v.passed === 1,
      comment: v.comment,
      reviewedAt: v.reviewedAt,
      reviewedBy: v.reviewedBy,
    })),
  });
}

export async function createHazard(req, res) {
  const { boxNumber, location, description, photoUrl, team, deadline, createdBy } = req.body;
  
  if (!boxNumber || !location || !description || !team || !deadline) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  
  const db = await getDb();
  const id = generateId();
  const isOverdue = isOverdueDeadline(deadline) ? 1 : 0;
  
  await db.run(
    'INSERT INTO hazards (id, boxNumber, location, description, photoUrl, team, deadline, status, rejectCount, isOverdue, createdAt, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    id,
    boxNumber,
    location,
    description,
    photoUrl || null,
    team,
    deadline,
    'PENDING_RECTIFICATION',
    0,
    isOverdue,
    todayISO(),
    createdBy
  );
  
  const hazard = await getHazardById({ params: { id } }, { json: (data) => res.status(201).json(data) });
}

export async function submitRectification(req, res) {
  const { hazardId } = req.params;
  const { description, photoUrl, submittedBy } = req.body;
  
  if (!description) {
    return res.status(400).json({ error: '整改说明不能为空' });
  }
  
  const db = await getDb();
  
  const hazard = await db.get('SELECT status FROM hazards WHERE id = ?', hazardId);
  if (!hazard) {
    return res.status(404).json({ error: '隐患记录不存在' });
  }
  
  if (hazard.status === 'CLOSED') {
    return res.status(400).json({ error: '已关闭的隐患不能修改' });
  }
  
  const id = generateId();
  
  await db.run(
    'INSERT INTO rectifications (id, hazardId, description, photoUrl, submittedAt, submittedBy) VALUES (?, ?, ?, ?, ?, ?)',
    id,
    hazardId,
    description,
    photoUrl || null,
    todayISO(),
    submittedBy
  );
  
  await db.run('UPDATE hazards SET status = "PENDING_REVIEW" WHERE id = ?', hazardId);
  
  await updateOverdueStatus();
  
  const updated = await getHazardById({ params: { id: hazardId } }, { json: (data) => res.json(data) });
}

export async function submitReview(req, res) {
  const { hazardId } = req.params;
  const { passed, comment, reviewedBy } = req.body;
  
  if (!passed && !comment) {
    return res.status(400).json({ error: '打回时必须填写复查意见' });
  }
  
  const db = await getDb();
  
  const hazard = await db.get('SELECT status, rejectCount FROM hazards WHERE id = ?', hazardId);
  if (!hazard) {
    return res.status(404).json({ error: '隐患记录不存在' });
  }
  
  if (hazard.status === 'CLOSED') {
    return res.status(400).json({ error: '已关闭的隐患不能修改' });
  }
  
  const id = generateId();
  
  await db.run(
    'INSERT INTO reviews (id, hazardId, passed, comment, reviewedAt, reviewedBy) VALUES (?, ?, ?, ?, ?, ?)',
    id,
    hazardId,
    passed ? 1 : 0,
    comment || '',
    todayISO(),
    reviewedBy
  );
  
  if (passed) {
    await db.run('UPDATE hazards SET status = "CLOSED", isOverdue = 0 WHERE id = ?', hazardId);
  } else {
    const newRejectCount = hazard.rejectCount + 1;
    await db.run('UPDATE hazards SET status = "REJECTED", rejectCount = ? WHERE id = ?', newRejectCount, hazardId);
  }
  
  await updateOverdueStatus();
  
  const updated = await getHazardById({ params: { id: hazardId } }, { json: (data) => res.json(data) });
}

export async function deleteHazard(req, res) {
  const { id } = req.params;
  const db = await getDb();
  
  const hazard = await db.get('SELECT * FROM hazards WHERE id = ?', id);
  if (!hazard) {
    return res.status(404).json({ error: '隐患记录不存在' });
  }
  
  await db.run('DELETE FROM hazards WHERE id = ?', id);
  
  res.json({ success: true, message: '删除成功' });
}

export async function getTeamStats(req, res) {
  const db = await getDb();
  
  await updateOverdueStatus();
  
  const stats = await db.all(`
    SELECT 
      team,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed,
      SUM(CASE WHEN status = 'PENDING_RECTIFICATION' OR status = 'REJECTED' THEN 1 ELSE 0 END) as rectifying,
      SUM(CASE WHEN status = 'PENDING_REVIEW' THEN 1 ELSE 0 END) as pendingReview,
      SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN isOverdue = 1 AND status != 'CLOSED' THEN 1 ELSE 0 END) as overdue,
      SUM(rejectCount) as rejectCount
    FROM hazards
    GROUP BY team
    ORDER BY team
  `);
  
  res.json(stats.map(s => ({
    team: s.team,
    total: s.total,
    closed: s.closed,
    rectifying: s.rectifying,
    pendingReview: s.pendingReview,
    rejected: s.rejected,
    overdue: s.overdue,
    rejectCount: s.rejectCount,
    closeRate: s.total > 0 ? Math.round((s.closed / s.total) * 100) : 0,
    openRate: s.total > 0 ? Math.round(((s.total - s.closed) / s.total) * 100) : 0,
  })));
}

export async function getOverviewStats(req, res) {
  const db = await getDb();
  
  await updateOverdueStatus();
  
  const stats = await db.get(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status != 'CLOSED' THEN 1 ELSE 0 END) as notClosed,
      SUM(CASE WHEN isOverdue = 1 AND status != 'CLOSED' THEN 1 ELSE 0 END) as overdue,
      SUM(rejectCount) as totalRejected,
      SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed
    FROM hazards
  `);
  
  res.json({
    total: stats.total || 0,
    notClosed: stats.notClosed || 0,
    overdue: stats.overdue || 0,
    totalRejected: stats.totalRejected || 0,
    closed: stats.closed || 0,
    rate: stats.total > 0 ? Math.round((stats.closed / stats.total) * 100) : 0,
  });
}
