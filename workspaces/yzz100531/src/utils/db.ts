import { openDB, type IDBPDatabase } from 'idb'
import type { PracticeRecord, PracticeMark } from '@/types'

const DB_NAME = 'vocal-practice-db'
const DB_VERSION = 1

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('practice-records')) {
        db.createObjectStore('practice-records', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('audio-blobs')) {
        db.createObjectStore('audio-blobs', { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains('practice-marks')) {
        const store = db.createObjectStore('practice-marks', { keyPath: 'id' })
        store.createIndex('recordId', 'recordId')
      }
    },
  })
}

export async function savePracticeRecord(record: PracticeRecord): Promise<void> {
  const db = await getDB()
  await db.put('practice-records', record)
}

export async function getPracticeRecord(id: string): Promise<PracticeRecord | undefined> {
  const db = await getDB()
  return db.get('practice-records', id)
}

export async function getAllPracticeRecords(): Promise<PracticeRecord[]> {
  const db = await getDB()
  const records = await db.getAll('practice-records')
  return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function deletePracticeRecord(id: string): Promise<void> {
  const db = await getDB()
  const record = await db.get('practice-records', id)
  if (record) {
    await db.delete('audio-blobs', record.audioBlobKey)
    const marks = await db.getAllFromIndex('practice-marks', 'recordId', id)
    for (const mark of marks) {
      await db.delete('practice-marks', mark.id)
    }
  }
  await db.delete('practice-records', id)
}

export async function saveAudioBlob(key: string, blob: Blob): Promise<void> {
  const db = await getDB()
  await db.put('audio-blobs', { key, blob })
}

export async function getAudioBlob(key: string): Promise<Blob | undefined> {
  const db = await getDB()
  const entry = await db.get('audio-blobs', key)
  return entry?.blob
}

export async function savePracticeMark(mark: PracticeMark & { recordId: string }): Promise<void> {
  const db = await getDB()
  await db.put('practice-marks', mark)
}

export async function getPracticeMarks(recordId: string): Promise<PracticeMark[]> {
  const db = await getDB()
  return db.getAllFromIndex('practice-marks', 'recordId', recordId)
}

export async function deletePracticeMark(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('practice-marks', id)
}
