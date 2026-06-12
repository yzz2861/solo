import { get } from '../database/db.js';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth.js';
import type { Admin, AdminRole } from '../../shared/types.js';

interface AdminRow {
  id: number;
  username: string;
  password_hash: string;
  role: AdminRole;
  name: string;
  community?: string;
  created_at: string;
}

function mapAdmin(row: AdminRow): Admin {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    community: row.community,
    createdAt: row.created_at,
  };
}

export async function loginAdmin(username: string, password: string): Promise<{
  token: string;
  admin: Admin;
}> {
  const admin = await get<AdminRow>(
    'SELECT * FROM admin WHERE username = ?',
    [username]
  );

  if (!admin) {
    throw new Error('用户名或密码错误');
  }

  const isValid = await bcrypt.compare(password, admin.password_hash);
  if (!isValid) {
    throw new Error('用户名或密码错误');
  }

  const adminData = mapAdmin(admin);
  const token = generateToken({
    id: admin.id,
    username: admin.username,
    role: admin.role,
    name: admin.name,
  });

  return {
    token,
    admin: adminData,
  };
}

export async function getAdminById(id: number): Promise<Admin | undefined> {
  const row = await get<AdminRow>('SELECT * FROM admin WHERE id = ?', [id]);
  return row ? mapAdmin(row) : undefined;
}
