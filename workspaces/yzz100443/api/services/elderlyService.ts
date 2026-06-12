import { run, get, all } from '../database/db.js';
import type { Elderly, GameProgress, AnswerRecord } from '../../shared/types.js';
import { getAgeGroup } from '../../shared/types.js';

interface ElderlyRow {
  id: number;
  name: string;
  phone_last4: string;
  age?: number;
  community?: string;
  is_focus: number;
  created_at: string;
}

interface ProgressRow {
  id: number;
  elderly_id: number;
  current_case_id?: number;
  current_dialogue_index: number;
  consecutive_correct: number;
  current_difficulty: number;
  last_play_time?: string;
  created_at: string;
}

function mapElderly(row: ElderlyRow): Elderly {
  return {
    id: row.id,
    name: row.name,
    phoneLast4: row.phone_last4,
    age: row.age,
    community: row.community,
    isFocus: row.is_focus === 1,
    createdAt: row.created_at,
  };
}

function mapProgress(row: ProgressRow): GameProgress {
  return {
    id: row.id,
    elderlyId: row.elderly_id,
    currentCaseId: row.current_case_id,
    currentDialogueIndex: row.current_dialogue_index,
    consecutiveCorrect: row.consecutive_correct,
    currentDifficulty: row.current_difficulty,
    lastPlayTime: row.last_play_time,
    createdAt: row.created_at,
  };
}

export async function loginElderly(name: string, phoneLast4: string, age?: number, community?: string): Promise<Elderly> {
  let elderly = await get<ElderlyRow>(
    'SELECT * FROM elderly WHERE name = ? AND phone_last4 = ?',
    [name, phoneLast4]
  );

  if (!elderly) {
    const result = await run(
      'INSERT INTO elderly (name, phone_last4, age, community) VALUES (?, ?, ?, ?)',
      [name, phoneLast4, age || null, community || null]
    );
    elderly = await get<ElderlyRow>('SELECT * FROM elderly WHERE id = ?', [result.lastID]);
    
    if (!elderly) {
      throw new Error('创建用户失败');
    }

    await run(
      'INSERT INTO game_progress (elderly_id, current_dialogue_index, consecutive_correct, current_difficulty) VALUES (?, 0, 0, 1)',
      [result.lastID]
    );
  } else if (age && !elderly.age) {
    await run('UPDATE elderly SET age = ?, community = ? WHERE id = ?', [age, community || null, elderly.id]);
    elderly.age = age;
    elderly.community = community || undefined;
  }

  return mapElderly(elderly);
}

export async function getElderlyById(id: number): Promise<Elderly | undefined> {
  const row = await get<ElderlyRow>('SELECT * FROM elderly WHERE id = ?', [id]);
  return row ? mapElderly(row) : undefined;
}

export async function getElderlyProgress(elderlyId: number): Promise<GameProgress | undefined> {
  const row = await get<ProgressRow>(
    'SELECT * FROM game_progress WHERE elderly_id = ?',
    [elderlyId]
  );
  return row ? mapProgress(row) : undefined;
}

export async function saveElderlyProgress(
  elderlyId: number,
  data: Partial<Omit<GameProgress, 'id' | 'elderlyId' | 'createdAt'>>
): Promise<void> {
  const fields = Object.keys(data)
    .map(key => `${key.replace(/([A-Z])/g, '_$1').toLowerCase()} = ?`)
    .join(', ');
  
  const values = Object.values(data);
  values.push(elderlyId);

  await run(
    `UPDATE game_progress SET ${fields}, last_play_time = CURRENT_TIMESTAMP WHERE elderly_id = ?`,
    values
  );
}

export async function saveAnswerRecord(
  elderlyId: number,
  caseId: number,
  dialogueIndex: number,
  isCorrect: boolean,
  selectedOption: string,
  fraudType: string
): Promise<void> {
  const elderly = await get<ElderlyRow>('SELECT * FROM elderly WHERE id = ?', [elderlyId]);
  const ageGroup = elderly ? getAgeGroup(elderly.age) : undefined;

  await run(
    `INSERT INTO answer_records (elderly_id, case_id, dialogue_index, is_correct, selected_option, age_group, fraud_type)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [elderlyId, caseId, dialogueIndex, isCorrect ? 1 : 0, selectedOption, ageGroup || null, fraudType]
  );
}

export async function getAllElderly(): Promise<Elderly[]> {
  const rows = await all<ElderlyRow>('SELECT * FROM elderly ORDER BY created_at DESC');
  return rows.map(mapElderly);
}

export async function toggleFocusElderly(elderlyId: number): Promise<void> {
  await run(
    'UPDATE elderly SET is_focus = CASE WHEN is_focus = 1 THEN 0 ELSE 1 END WHERE id = ?',
    [elderlyId]
  );
}

export async function getElderlyStats(elderlyId: number): Promise<{
  totalGames: number;
  correctRate: number;
  lastPlayTime?: string;
  weakFraudTypes: string[];
}> {
  const records = await all<{
    is_correct: number;
    fraud_type: string;
    created_at: string;
  }>(
    'SELECT is_correct, fraud_type, created_at FROM answer_records WHERE elderly_id = ? ORDER BY created_at DESC',
    [elderlyId]
  );

  if (records.length === 0) {
    return {
      totalGames: 0,
      correctRate: 0,
      weakFraudTypes: [],
    };
  }

  const totalCorrect = records.filter(r => r.is_correct === 1).length;
  const correctRate = Math.round((totalCorrect / records.length) * 100);

  const fraudStats = new Map<string, { total: number; incorrect: number }>();
  records.forEach(r => {
    const existing = fraudStats.get(r.fraud_type) || { total: 0, incorrect: 0 };
    existing.total++;
    if (r.is_correct === 0) existing.incorrect++;
    fraudStats.set(r.fraud_type, existing);
  });

  const weakFraudTypes: string[] = [];
  fraudStats.forEach((stats, type) => {
    if (stats.total >= 2 && (stats.incorrect / stats.total) > 0.5) {
      weakFraudTypes.push(type);
    }
  });

  return {
    totalGames: records.length,
    correctRate,
    lastPlayTime: records[0]?.created_at,
    weakFraudTypes,
  };
}
