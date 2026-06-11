import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { run, query, queryOne } from '../db.js';
import { extractFromText, detectDuplicateVisit } from '../services/extraction.js';
import { maskIdCard, maskPhone } from '../../shared/utils/privacy.js';
import type { MedicalRecord, Patient, ExtractedField, RevisionHistory } from '@shared/types';

const router = Router();

function mapPatient(row: any): Patient {
  return {
    id: row.id,
    name: row.name,
    idCardMasked: maskIdCard(row.id_card_raw),
    phoneMasked: maskPhone(row.phone_raw),
    gender: row.gender,
    age: row.age,
  };
}

function mapExtraction(row: any): ExtractedField {
  return {
    id: row.id,
    fieldType: row.field_type,
    value: row.value,
    confidence: row.confidence,
    evidence: JSON.parse(row.evidence_json),
    warnings: JSON.parse(row.warnings_json || '[]'),
    originalRaw: row.original_raw,
  };
}

function mapRecord(row: any, extractions?: ExtractedField[], patient?: Patient): MedicalRecord {
  return {
    id: row.id,
    patientId: row.patient_id,
    patient,
    visitDate: row.visit_date,
    sourceType: row.source_type,
    sourceContent: row.source_content,
    status: row.status,
    extractions: extractions || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const { patient, visitDate, sourceType, sourceContent } = req.body;
    if (!patient || !visitDate || !sourceType || !sourceContent) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    let patientId: string;
    const existing = queryOne<any>(
      'SELECT * FROM patients WHERE id_card_raw = ? OR phone_raw = ?',
      [patient.idCard, patient.phone],
    );

    if (existing) {
      patientId = existing.id;
    } else {
      patientId = nanoid();
      run(
        'INSERT INTO patients (id, name, id_card_raw, phone_raw, gender, age) VALUES (?, ?, ?, ?, ?, ?)',
        [patientId, patient.name, patient.idCard, patient.phone, patient.gender, patient.age],
      );
    }

    const patientRecords = query<any>(
      'SELECT id, visit_date FROM medical_records WHERE patient_id = ?',
      [patientId],
    );
    const duplicateId = detectDuplicateVisit(patientRecords, visitDate);

    const recordId = nanoid();
    run(
      'INSERT INTO medical_records (id, patient_id, visit_date, source_type, source_content, status) VALUES (?, ?, ?, ?, ?, ?)',
      [recordId, patientId, visitDate, sourceType, sourceContent, 'uploaded'],
    );

    const patientRow = queryOne<any>('SELECT * FROM patients WHERE id = ?', [patientId])!;
    res.json({
      id: recordId,
      duplicateOf: duplicateId,
      patient: mapPatient(patientRow),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '创建病历失败' });
  }
});

router.post('/:id/extract', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const record = queryOne<any>('SELECT * FROM medical_records WHERE id = ?', [id]);
    if (!record) return res.status(404).json({ error: '病历不存在' });

    const fields = extractFromText(record.source_content, id);

    run('DELETE FROM extraction_fields WHERE record_id = ?', [id]);
    for (const f of fields) {
      run(
        'INSERT INTO extraction_fields (id, record_id, field_type, value, confidence, evidence_json, warnings_json, original_raw) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          f.id,
          id,
          f.fieldType,
          f.value,
          f.confidence,
          JSON.stringify(f.evidence),
          JSON.stringify(f.warnings),
          f.originalRaw || null,
        ],
      );
    }

    run("UPDATE medical_records SET status = 'extracted', updated_at = datetime('now') WHERE id = ?", [id]);

    const patientRow = queryOne<any>('SELECT * FROM patients WHERE id = ?', [record.patient_id])!;
    const updatedRecord = queryOne<any>('SELECT * FROM medical_records WHERE id = ?', [id])!;

    res.json(mapRecord(updatedRecord, fields, mapPatient(patientRow)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '抽取失败' });
  }
});

router.post('/:id/confirm', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { corrections, operator } = req.body;

    const record = queryOne<any>('SELECT * FROM medical_records WHERE id = ?', [id]);
    if (!record) return res.status(404).json({ error: '病历不存在' });

    for (const corr of corrections) {
      const existing = queryOne<any>('SELECT * FROM extraction_fields WHERE id = ? AND record_id = ?', [
        corr.extractionId,
        id,
      ]);
      if (!existing) continue;

      if (existing.value !== corr.newValue) {
        run(
          'INSERT INTO revision_history (id, record_id, field_type, old_value, new_value, operator, reason) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [nanoid(), id, existing.field_type, existing.value, corr.newValue, operator || '录入护士', corr.reason || ''],
        );
        run('UPDATE extraction_fields SET value = ? WHERE id = ?', [corr.newValue, corr.extractionId]);
      }
    }

    run("UPDATE medical_records SET status = 'confirmed', updated_at = datetime('now') WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '确认失败' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const row = queryOne<any>('SELECT * FROM medical_records WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: '病历不存在' });

    const patientRow = queryOne<any>('SELECT * FROM patients WHERE id = ?', [row.patient_id]);
    const exts = query<any>('SELECT * FROM extraction_fields WHERE record_id = ?', [id]);

    res.json(mapRecord(row, exts.map(mapExtraction), patientRow ? mapPatient(patientRow) : undefined));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '查询失败' });
  }
});

router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rows = query<any>(
      'SELECT * FROM revision_history WHERE record_id = ? ORDER BY operated_at DESC',
      [id],
    );
    const history: RevisionHistory[] = rows.map((r) => ({
      id: r.id,
      recordId: r.record_id,
      fieldType: r.field_type,
      oldValue: r.old_value,
      newValue: r.new_value,
      operator: r.operator,
      operatedAt: r.operated_at,
      reason: r.reason,
    }));
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '查询失败' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, from, to, search } = req.query as any;
    let sql = `
      SELECT mr.*, p.name as patient_name, p.gender, p.age
      FROM medical_records mr
      LEFT JOIN patients p ON mr.patient_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (status) {
      sql += ' AND mr.status = ?';
      params.push(status);
    }
    if (from) {
      sql += ' AND mr.visit_date >= ?';
      params.push(from);
    }
    if (to) {
      sql += ' AND mr.visit_date <= ?';
      params.push(to);
    }
    if (search) {
      sql += ' AND p.name LIKE ?';
      params.push(`%${search}%`);
    }
    sql += ' ORDER BY mr.visit_date DESC, mr.created_at DESC';

    const rows = query<any>(sql, params);
    const records = rows.map((r) => {
      const exts = query<any>('SELECT * FROM extraction_fields WHERE record_id = ?', [r.id]);
      return mapRecord(
        r,
        exts.map(mapExtraction),
        { id: r.patient_id, name: r.patient_name, idCardMasked: '', phoneMasked: '', gender: r.gender, age: r.age },
      );
    });
    res.json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '查询失败' });
  }
});

router.get('/patients/:patientId/records', async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const rows = query<any>(
      'SELECT * FROM medical_records WHERE patient_id = ? ORDER BY visit_date DESC',
      [patientId],
    );
    res.json(rows.map((r) => mapRecord(r)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '查询失败' });
  }
});

export default router;
