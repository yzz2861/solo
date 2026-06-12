import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { comparePassword, generateToken } from '../utils/auth';
import { createOperationLog } from '../services/logService';

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        code: 400,
        message: '用户名和密码不能为空',
      });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { username } });

    if (!user) {
      return res.status(401).json({
        code: 401,
        message: '用户名或密码错误',
      });
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        code: 401,
        message: '用户名或密码错误',
      });
    }

    const token = generateToken(user);

    await createOperationLog({
      operator: {
        userId: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
      },
      action: 'USER_LOGIN',
      detail: `用户 ${user.name} 登录系统`,
      ip: req.ip,
    });

    const { password: _pw, ...userInfo } = user;

    return res.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: userInfo,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
    });
  }
}

export async function getCurrentUser(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ code: 401, message: '未登录' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: req.user.userId } });

    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    const { password: _pw, ...userInfo } = user;

    return res.json({
      code: 200,
      data: userInfo,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
}

export async function getUserList(req: Request, res: Response) {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const { role } = req.query;

    const where: any = {};
    if (role) {
      where.role = role;
    }

    const users = await userRepo.find({ where });
    const result = users.map((u) => {
      const { password: _pw, ...rest } = u;
      return rest;
    });

    return res.json({
      code: 200,
      data: result,
    });
  } catch (error) {
    console.error('Get user list error:', error);
    return res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
}
