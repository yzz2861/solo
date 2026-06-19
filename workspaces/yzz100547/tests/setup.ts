import { Application } from 'express';
import supertest from 'supertest';
import { createApp } from '../src/app';
import { initDatabase, resetDatabase, closeDb, getDb } from '../src/database';
import { createUser } from '../src/services/userService';
import { generateToken } from '../src/utils/jwt';

export interface TestUser {
  id: number;
  token: string;
  name: string;
  phone: string;
  role: string;
}

export interface TestContext {
  app: Application;
  request: ReturnType<typeof supertest>;
  residents: TestUser[];
  socialWorker: TestUser;
  director: TestUser;
}

export async function setupTest(): Promise<TestContext> {
  await initDatabase();
  await resetDatabase();

  const app = createApp();
  const request = supertest(app);

  const [resident1, resident2, socialWorker, director] = await Promise.all([
    createUser('张居民', '13800138001', '123456', 'resident'),
    createUser('李居民', '13800138002', '123456', 'resident'),
    createUser('王社工', '13900139001', '123456', 'social_worker'),
    createUser('赵主任', '13900139002', '123456', 'director'),
  ]);

  const db = await getDb();
  await Promise.all([
    db.run('UPDATE users SET points_balance = ? WHERE id = ?', 5000, resident1.id),
    db.run('UPDATE users SET points_balance = ? WHERE id = ?', 5000, resident2.id),
  ]);

  const createTestUser = (user: any): TestUser => ({
    id: user.id,
    token: generateToken({ userId: user.id, role: user.role, name: user.name }),
    name: user.name,
    phone: user.phone,
    role: user.role,
  });

  return {
    app,
    request,
    residents: [createTestUser(resident1), createTestUser(resident2)],
    socialWorker: createTestUser(socialWorker),
    director: createTestUser(director),
  };
}

export async function teardownTest(): Promise<void> {
  await closeDb();
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
