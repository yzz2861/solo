import 'reflect-metadata';
import { AppDataSource } from '../config/database';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  await AppDataSource.synchronize(true);
});

afterAll(async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
});
