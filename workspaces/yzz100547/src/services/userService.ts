import { getDb } from '../database';
import { User, PublicUser, UserRole } from '../models/types';
import { hashPassword, comparePassword } from '../utils/password';
import { maskPhone, validatePhone } from '../utils/phone';
import { AppError } from '../utils/errors';

export async function createUser(name: string, phone: string, password: string, role: UserRole): Promise<User> {
  if (!validatePhone(phone)) {
    throw new AppError('手机号格式不正确', 400);
  }

  const db = await getDb();

  const existing = await db.get('SELECT id FROM users WHERE phone = ?', phone);
  if (existing) {
    throw new AppError('该手机号已注册', 400);
  }

  const hashedPassword = await hashPassword(password);

  const result = await db.run(
    'INSERT INTO users (name, phone, password, role) VALUES (?, ?, ?, ?)',
    name,
    phone,
    hashedPassword,
    role
  );

  const user = await db.get('SELECT * FROM users WHERE id = ?', result.lastID);
  return user as User;
}

export async function loginUser(phone: string, password: string): Promise<User> {
  const db = await getDb();

  const user = await db.get('SELECT * FROM users WHERE phone = ?', phone);
  if (!user) {
    throw new AppError('手机号或密码错误', 401);
  }

  const isValid = await comparePassword(password, user.password);
  if (!isValid) {
    throw new AppError('手机号或密码错误', 401);
  }

  return user as User;
}

export async function getUserById(id: number): Promise<User | null> {
  const db = await getDb();
  const user = await db.get('SELECT * FROM users WHERE id = ?', id);
  return user ? (user as User) : null;
}

export async function getPublicUserById(id: number): Promise<PublicUser | null> {
  const user = await getUserById(id);
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    phone: maskPhone(user.phone),
    role: user.role,
    points_balance: user.points_balance,
  };
}

export async function updateUserPoints(userId: number, pointsDelta: number): Promise<number> {
  const db = await getDb();

  const user = await getUserById(userId);
  if (!user) {
    throw new AppError('用户不存在', 404);
  }

  const newBalance = user.points_balance + pointsDelta;
  if (newBalance < 0) {
    throw new AppError('积分不足', 400);
  }

  await db.run(
    'UPDATE users SET points_balance = ? WHERE id = ?',
    newBalance,
    userId
  );

  return newBalance;
}

export async function getUserPoints(userId: number): Promise<number> {
  const db = await getDb();
  const result = await db.get('SELECT points_balance FROM users WHERE id = ?', userId);
  if (!result) {
    throw new AppError('用户不存在', 404);
  }
  return result.points_balance;
}

export async function listUsers(page: number = 1, pageSize: number = 20): Promise<{ users: PublicUser[]; total: number }> {
  const db = await getDb();
  const offset = (page - 1) * pageSize;

  const users = await db.all(
    'SELECT id, name, phone, role, points_balance, created_at FROM users LIMIT ? OFFSET ?',
    pageSize,
    offset
  );

  const totalResult = await db.get('SELECT COUNT(*) as count FROM users');
  const total = totalResult?.count || 0;

  const publicUsers: PublicUser[] = users.map((user: User) => ({
    id: user.id,
    name: user.name,
    phone: maskPhone(user.phone),
    role: user.role,
    points_balance: user.points_balance,
  }));

  return { users: publicUsers, total };
}
