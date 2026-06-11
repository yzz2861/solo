import { db } from '../db/index.js';
import type { Evidence, UpdateEvidenceRequest } from '../../shared/types.js';
import { v4 as uuidv4 } from 'uuid';

export async function getEvidenceByProjectId(projectId: string): Promise<Evidence[]> {
  await db.read();
  return db.data!.evidence.filter(e => e.projectId === projectId);
}

export async function getEvidenceById(id: string): Promise<Evidence | undefined> {
  await db.read();
  return db.data!.evidence.find(e => e.id === id);
}

export async function createEvidence(data: Omit<Evidence, 'id'>): Promise<Evidence> {
  await db.read();
  const evidence: Evidence = {
    ...data,
    id: uuidv4()
  };
  db.data!.evidence.push(evidence);
  await db.write();
  return evidence;
}

export async function createEvidencesBatch(data: Array<Omit<Evidence, 'id'>>): Promise<Evidence[]> {
  await db.read();
  const evidences: Evidence[] = data.map(d => ({
    ...d,
    id: uuidv4()
  }));
  db.data!.evidence.push(...evidences);
  await db.write();
  return evidences;
}

export async function updateEvidence(id: string, data: UpdateEvidenceRequest): Promise<Evidence | undefined> {
  await db.read();
  const evidence = db.data!.evidence.find(e => e.id === id);
  if (evidence) {
    if (data.confirmed !== undefined) evidence.confirmed = data.confirmed;
    if (data.notes !== undefined) evidence.notes = data.notes;
    await db.write();
  }
  return evidence;
}

export async function batchConfirmEvidence(ids: string[]): Promise<boolean> {
  await db.read();
  for (const id of ids) {
    const evidence = db.data!.evidence.find(e => e.id === id);
    if (evidence) {
      evidence.confirmed = true;
    }
  }
  await db.write();
  return true;
}

export async function deleteEvidence(id: string): Promise<boolean> {
  await db.read();
  const index = db.data!.evidence.findIndex(e => e.id === id);
  if (index !== -1) {
    db.data!.evidence.splice(index, 1);
    await db.write();
    return true;
  }
  return false;
}

export async function deleteEvidenceByProjectId(projectId: string): Promise<boolean> {
  await db.read();
  db.data!.evidence = db.data!.evidence.filter(e => e.projectId !== projectId);
  await db.write();
  return true;
}
