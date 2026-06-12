import { run, get, all } from '../database/db.js';
import type { Case, Option, Dialogue } from '../../shared/types.js';
import type { FraudType } from '../../shared/types.js';

interface CaseRow {
  id: number;
  title: string;
  fraud_type: FraudType;
  description: string;
  dialogues: string;
  options: string;
  warning_points: string;
  difficulty: number;
  sort_order: number;
  is_active: number;
  created_by?: number;
  created_at: string;
}

function mapCase(row: CaseRow): Case {
  return {
    id: row.id,
    title: row.title,
    fraudType: row.fraud_type,
    description: row.description,
    dialogues: JSON.parse(row.dialogues) as Dialogue[],
    options: JSON.parse(row.options) as Option[],
    warningPoints: row.warning_points ? (JSON.parse(row.warning_points) as string[]) : [],
    difficulty: row.difficulty as 1 | 2 | 3,
    sortOrder: row.sort_order,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
  };
}

export async function getAllCases(includeInactive = false): Promise<Case[]> {
  const sql = includeInactive
    ? 'SELECT * FROM cases ORDER BY sort_order ASC, id ASC'
    : 'SELECT * FROM cases WHERE is_active = 1 ORDER BY sort_order ASC, id ASC';
  
  const rows = await all<CaseRow>(sql);
  return rows.map(mapCase);
}

export async function getCaseById(id: number): Promise<Case | undefined> {
  const row = await get<CaseRow>('SELECT * FROM cases WHERE id = ?', [id]);
  return row ? mapCase(row) : undefined;
}

export async function getNextCase(currentCaseId?: number, difficulty: number = 1): Promise<Case | undefined> {
  let sql: string;
  let params: any[];

  if (currentCaseId) {
    const currentCase = await get<CaseRow>('SELECT sort_order FROM cases WHERE id = ?', [currentCaseId]);
    if (!currentCase) return undefined;

    sql = `SELECT * FROM cases 
           WHERE is_active = 1 
           AND sort_order > ?
           AND difficulty <= ?
           ORDER BY sort_order ASC 
           LIMIT 1`;
    params = [currentCase.sort_order, difficulty];
  } else {
    sql = `SELECT * FROM cases 
           WHERE is_active = 1 
           AND difficulty <= ?
           ORDER BY sort_order ASC 
           LIMIT 1`;
    params = [difficulty];
  }

  const row = await get<CaseRow>(sql, params);
  
  if (!row && currentCaseId) {
    sql = `SELECT * FROM cases 
           WHERE is_active = 1 
           AND difficulty <= ?
           ORDER BY sort_order ASC 
           LIMIT 1`;
    const nextRow = await get<CaseRow>(sql, [difficulty]);
    return nextRow ? mapCase(nextRow) : undefined;
  }

  return row ? mapCase(row) : undefined;
}

export async function createCase(data: {
  title: string;
  fraudType: FraudType;
  description: string;
  dialogues: Dialogue[];
  options: Option[];
  warningPoints: string[];
  difficulty: 1 | 2 | 3;
  createdBy: number;
}): Promise<Case> {
  const maxSortResult = await get<{ max_sort: number }>(
    'SELECT COALESCE(MAX(sort_order), 0) + 1 as max_sort FROM cases'
  );
  const sortOrder = maxSortResult?.max_sort || 1;

  const result = await run(
    `INSERT INTO cases (title, fraud_type, description, dialogues, options, warning_points, difficulty, sort_order, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.title,
      data.fraudType,
      data.description,
      JSON.stringify(data.dialogues),
      JSON.stringify(data.options),
      JSON.stringify(data.warningPoints),
      data.difficulty,
      sortOrder,
      data.createdBy,
    ]
  );

  const newCase = await getCaseById(result.lastID);
  if (!newCase) throw new Error('创建案例失败');
  return newCase;
}

export async function updateCase(
  id: number,
  data: Partial<{
    title: string;
    fraudType: FraudType;
    description: string;
    dialogues: Dialogue[];
    options: Option[];
    warningPoints: string[];
    difficulty: 1 | 2 | 3;
    isActive: boolean;
  }>
): Promise<Case | undefined> {
  const fields: string[] = [];
  const values: any[] = [];

  if (data.title !== undefined) {
    fields.push('title = ?');
    values.push(data.title);
  }
  if (data.fraudType !== undefined) {
    fields.push('fraud_type = ?');
    values.push(data.fraudType);
  }
  if (data.description !== undefined) {
    fields.push('description = ?');
    values.push(data.description);
  }
  if (data.dialogues !== undefined) {
    fields.push('dialogues = ?');
    values.push(JSON.stringify(data.dialogues));
  }
  if (data.options !== undefined) {
    fields.push('options = ?');
    values.push(JSON.stringify(data.options));
  }
  if (data.warningPoints !== undefined) {
    fields.push('warning_points = ?');
    values.push(JSON.stringify(data.warningPoints));
  }
  if (data.difficulty !== undefined) {
    fields.push('difficulty = ?');
    values.push(data.difficulty);
  }
  if (data.isActive !== undefined) {
    fields.push('is_active = ?');
    values.push(data.isActive ? 1 : 0);
  }

  if (fields.length === 0) {
    return getCaseById(id);
  }

  values.push(id);
  await run(`UPDATE cases SET ${fields.join(', ')} WHERE id = ?`, values);
  return getCaseById(id);
}

export async function deleteCase(id: number): Promise<boolean> {
  const result = await run('DELETE FROM cases WHERE id = ?', [id]);
  return result.changes > 0;
}

export async function reorderCases(caseIds: number[]): Promise<void> {
  for (let i = 0; i < caseIds.length; i++) {
    await run('UPDATE cases SET sort_order = ? WHERE id = ?', [i + 1, caseIds[i]]);
  }
}

export async function getCaseStats(): Promise<{
  total: number;
  byType: Record<FraudType, number>;
  byDifficulty: Record<number, number>;
}> {
  const totalRow = await get<{ count: number }>('SELECT COUNT(*) as count FROM cases WHERE is_active = 1');
  
  const typeRows = await all<{ fraud_type: FraudType; count: number }>(
    'SELECT fraud_type, COUNT(*) as count FROM cases WHERE is_active = 1 GROUP BY fraud_type'
  );
  
  const diffRows = await all<{ difficulty: number; count: number }>(
    'SELECT difficulty, COUNT(*) as count FROM cases WHERE is_active = 1 GROUP BY difficulty'
  );

  const byType: Record<string, number> = {};
  typeRows.forEach(row => {
    byType[row.fraud_type] = row.count;
  });

  const byDifficulty: Record<number, number> = {};
  diffRows.forEach(row => {
    byDifficulty[row.difficulty] = row.count;
  });

  return {
    total: totalRow?.count || 0,
    byType: byType as Record<FraudType, number>,
    byDifficulty,
  };
}
