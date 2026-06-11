import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { run, query, queryOne } from '../db.js';
import { maskAll, maskIdCard, maskPhone } from '../../shared/utils/privacy.js';
import { FIELD_LABELS } from '../../shared/types/index.js';

const router = Router();

router.get('/export', async (req: Request, res: Response) => {
  try {
    const { format = 'json', from, to } = req.query as any;
    let sql = `
      SELECT mr.*, p.name as patient_name, p.id_card_raw, p.phone_raw, p.gender, p.age
      FROM medical_records mr
      LEFT JOIN patients p ON mr.patient_id = p.id
      WHERE mr.status IN ('confirmed','archived')
    `;
    const params: any[] = [];
    if (from) { sql += ' AND mr.visit_date >= ?'; params.push(from); }
    if (to) { sql += ' AND mr.visit_date <= ?'; params.push(to); }
    sql += ' ORDER BY mr.visit_date DESC';

    const rows = query<any>(sql, params);

    const summary = rows.map((r) => {
      const exts = query<any>('SELECT * FROM extraction_fields WHERE record_id = ?', [r.id]);
      const revisions = query<any>(
        'SELECT rh.*, qr.result as qa_result, qr.comment as qa_comment FROM revision_history rh LEFT JOIN qa_reviews qr ON qr.revision_id = rh.id WHERE rh.record_id = ? ORDER BY rh.operated_at DESC',
        [r.id],
      );

      const fields: any = {};
      for (const e of exts) {
        fields[e.field_type] = {
          value: maskAll(e.value),
          confidence: e.confidence,
          warnings: JSON.parse(e.warnings_json || '[]'),
        };
      }

      const revisionsMasked = revisions.map((rv) => ({
        fieldType: rv.field_type,
        fieldLabel: FIELD_LABELS[rv.field_type as keyof typeof FIELD_LABELS] || rv.field_type,
        oldValue: maskAll(rv.old_value),
        newValue: maskAll(rv.new_value),
        operator: rv.operator,
        operatedAt: rv.operated_at,
        reason: rv.reason,
        qaResult: rv.qa_result,
        qaComment: rv.qa_comment,
      }));

      return {
        recordId: r.id,
        patientName: r.patient_name,
        patientGender: r.gender,
        patientAge: r.age,
        idCard: maskIdCard(r.id_card_raw),
        phone: maskPhone(r.phone_raw),
        visitDate: r.visit_date,
        sourceType: r.source_type,
        status: r.status,
        fields,
        revisions: revisionsMasked,
      };
    });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="qa-summary.json"');
      res.json(summary);
    } else {
      res.json(summary);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '导出失败' });
  }
});

router.get('/revisions', async (_req: Request, res: Response) => {
  try {
    const rows = query<any>(`
      SELECT rh.*, p.name as patient_name, mr.visit_date,
             qr.result as qa_result, qr.comment as qa_comment, qr.reviewer as qa_reviewer
      FROM revision_history rh
      LEFT JOIN medical_records mr ON mr.id = rh.record_id
      LEFT JOIN patients p ON p.id = mr.patient_id
      LEFT JOIN qa_reviews qr ON qr.revision_id = rh.id
      ORDER BY rh.operated_at DESC
      LIMIT 100
    `);
    const revisions = rows.map((r) => ({
      id: r.id,
      recordId: r.record_id,
      patientName: r.patient_name,
      visitDate: r.visit_date,
      fieldType: r.field_type,
      fieldLabel: FIELD_LABELS[r.field_type as keyof typeof FIELD_LABELS] || r.field_type,
      oldValue: r.old_value,
      newValue: r.new_value,
      operator: r.operator,
      operatedAt: r.operated_at,
      reason: r.reason,
      qaResult: r.qa_result,
      qaComment: r.qa_comment,
      qaReviewer: r.qa_reviewer,
    }));
    res.json(revisions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '查询失败' });
  }
});

router.post('/reviews', async (req: Request, res: Response) => {
  try {
    const { revisionId, recordId, reviewer, result, comment } = req.body;
    const existing = queryOne<any>('SELECT * FROM qa_reviews WHERE revision_id = ?', [revisionId]);
    if (existing) {
      run('UPDATE qa_reviews SET reviewer = ?, result = ?, comment = ?, reviewed_at = datetime(\'now\') WHERE id = ?',
        [reviewer, result, comment || '', existing.id]);
      return res.json({ id: existing.id, updated: true });
    }
    const id = nanoid();
    run(
      'INSERT INTO qa_reviews (id, revision_id, reviewer, result, comment) VALUES (?, ?, ?, ?, ?)',
      [id, revisionId, reviewer, result, comment || ''],
    );
    res.json({ id, recordId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '提交失败' });
  }
});

export default router;
