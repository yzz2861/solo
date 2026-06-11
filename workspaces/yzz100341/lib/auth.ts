import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { NextRequest } from 'next/server';
import {
  JWT_SECRET,
  COOKIE_NAME,
  TOKEN_TTL,
  signToken,
  verifyToken,
  type SessionUser,
} from './auth-jwt';

export {
  JWT_SECRET,
  COOKIE_NAME,
  TOKEN_TTL,
  signToken,
  verifyToken,
  type SessionUser,
} from './auth-jwt';

export async function hashPassword(pwd: string): Promise<string> {
  return bcrypt.hash(pwd, 10);
}

export async function verifyPassword(pwd: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pwd, hash);
}

export function setAuthCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearAuthCookie() {
  cookies().delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded) return null;
  const u = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as SessionUser['role'],
    classId: u.classId,
    routeId: u.routeId,
  };
}

export async function getCurrentUserFromReq(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded) return null;
  const u = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as SessionUser['role'],
    classId: u.classId,
    routeId: u.routeId,
  };
}

export function requireRole(user: SessionUser | null, roles: SessionUser['role'][]): SessionUser {
  if (!user) throw new AuthError('未登录', 401);
  if (!roles.includes(user.role)) throw new AuthError('无权限访问', 403);
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(msg: string, status: number) {
    super(msg);
    this.status = status;
  }
}

export async function canUserModifyStudent(user: SessionUser, studentId: string): Promise<boolean> {
  if (user.role === 'ADMIN') return true;
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { parentLinks: true },
  });
  if (!student) return false;
  if (user.role === 'TEACHER') return user.classId === student.classId;
  if (user.role === 'PARENT') return student.parentLinks.some((pl) => pl.parentId === user.id);
  return false;
}
