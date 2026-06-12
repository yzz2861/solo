import { Request, Response } from 'express';
import { loginAdmin, getAdminById } from '../services/adminService.js';

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '请输入用户名和密码' });
    }

    const result = await loginAdmin(username.trim(), password);
    res.json(result);
  } catch (err) {
    console.error('Admin login error:', err);
    if (err instanceof Error && err.message === '用户名或密码错误') {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    res.status(500).json({ error: '登录失败' });
  }
}

export async function getProfile(req: Request, res: Response) {
  try {
    const admin = req.admin!;
    const adminData = await getAdminById(admin.id);

    if (!adminData) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json(adminData);
  } catch (err) {
    console.error('Get admin profile error:', err);
    res.status(500).json({ error: '获取用户信息失败' });
  }
}
