import 'reflect-metadata';
import { DataSource, Repository, EntityTarget } from 'typeorm';
import * as entities from '../entities';
import path from 'path';

const isTest = process.env.NODE_ENV === 'test';
const dbPath = isTest
  ? ':memory:'
  : path.join(process.cwd(), 'data', 'fresh_preorder.db');

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: dbPath,
  synchronize: true,
  logging: process.env.NODE_ENV === 'development',
  entities: Object.values(entities),
  migrations: [],
  subscribers: [],
  extra: {
    enableWAL: true,
    journalMode: 'WAL',
    foreignKeys: true,
  },
});

export async function initializeDatabase(): Promise<DataSource> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    console.log(`Database initialized: ${dbPath}`);
  }
  return AppDataSource;
}

export function getRepository<T extends object>(entity: EntityTarget<T>): Repository<T> {
  if (!AppDataSource.isInitialized) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return AppDataSource.getRepository<T>(entity);
}
