import { run, get, all } from '../database/db.js';
import type { FollowUpRecord } from '../../shared/types.js';

interface FollowUpRow {
  id: number;
  elderly_id: number;
  social_worker_id: number;
  social_worker_name: string;
  notes: string;
  created_at: string;
}

function mapFollowUp(row: FollowUpRow): FollowUpRecord {
  return {
    id: row.id,
    elderlyId: row.elderly_id,
    socialWorkerId: row.social_worker_id,
    socialWorkerName: row.social_worker_name,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function addFollowUpRecord(
  elderlyId: number,
  socialWorkerId: number,
  socialWorkerName: string,
  notes: string
): Promise<FollowUpRecord> {
  const result = await run(
    `INSERT INTO follow_up_records (elderly_id, social_worker_id, notes)
     VALUES (?, ?, ?)`,
    [elderlyId, socialWorkerId, notes]
  );

  const record = await get<FollowUpRow>(
    `SELECT fur.*, a.name as social_worker_name 
     FROM follow_up_records fur
     JOIN admin a ON fur.social_worker_id = a.id
     WHERE fur.id = ?`,
    [result.lastID]
  );

  if (!record) throw new Error('创建跟进记录失败');
  return mapFollowUp(record);
}

export async function getElderlyFollowUpRecords(elderlyId: number): Promise<FollowUpRecord[]> {
  const rows = await all<FollowUpRow>(
    `SELECT fur.*, a.name as social_worker_name 
     FROM follow_up_records fur
     JOIN admin a ON fur.social_worker_id = a.id
     WHERE fur.elderly_id = ?
     ORDER BY fur.created_at DESC`,
    [elderlyId]
  );
  return rows.map(mapFollowUp);
}

export async function getAllFollowUpRecords(limit: number = 100): Promise<FollowUpRecord[]> {
  const rows = await all<FollowUpRow>(
    `SELECT fur.*, a.name as social_worker_name 
     FROM follow_up_records fur
     JOIN admin a ON fur.social_worker_id = a.id
     ORDER BY fur.created_at DESC
     LIMIT ?`,
    [limit]
  );
  return rows.map(mapFollowUp);
}
