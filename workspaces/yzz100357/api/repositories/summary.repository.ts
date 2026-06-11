import { db } from '../db/index.js';
import type { AppealSummary, SaveSummaryRequest } from '../../shared/types.js';
import { v4 as uuidv4 } from 'uuid';

export async function getSummariesByProjectId(projectId: string): Promise<AppealSummary[]> {
  await db.read();
  return db.data!.summaries
    .filter(s => s.projectId === projectId)
    .sort((a, b) => b.version - a.version);
}

export async function getLatestSummary(projectId: string): Promise<AppealSummary | undefined> {
  await db.read();
  const summaries = db.data!.summaries
    .filter(s => s.projectId === projectId)
    .sort((a, b) => b.version - a.version);
  return summaries[0];
}

export async function getSummaryById(id: string): Promise<AppealSummary | undefined> {
  await db.read();
  return db.data!.summaries.find(s => s.id === id);
}

export async function createSummary(
  projectId: string,
  data: SaveSummaryRequest,
  modifiedBy: string = 'system'
): Promise<AppealSummary> {
  await db.read();
  const existingSummaries = db.data!.summaries.filter(s => s.projectId === projectId);
  const nextVersion = existingSummaries.length > 0
    ? Math.max(...existingSummaries.map(s => s.version)) + 1
    : 1;

  const summary: AppealSummary = {
    id: uuidv4(),
    projectId,
    content: data.content,
    version: nextVersion,
    createdAt: new Date().toISOString(),
    modifiedBy,
    changeLog: data.changeLog
  };
  db.data!.summaries.push(summary);
  await db.write();
  return summary;
}

export async function deleteSummariesByProjectId(projectId: string): Promise<boolean> {
  await db.read();
  db.data!.summaries = db.data!.summaries.filter(s => s.projectId !== projectId);
  await db.write();
  return true;
}
