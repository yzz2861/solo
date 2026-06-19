import { Request, Response } from 'express';
import { createUser, loginUser, getPublicUserById, getUserById, listUsers, getUserPoints } from '../services/userService';
import { generateToken } from '../utils/jwt';
import { asyncHandler } from '../utils/errors';
import { maskPhone } from '../utils/phone';
import { ApiResponse, PublicUser, User } from '../models/types';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, phone, password, role } = req.body;

  if (!name || !phone || !password || !role) {
    res.status(400).json({ success: false, error: '缺少必填字段' } as ApiResponse);
    return;
  }

  const user = await createUser(name, phone, password, role);
  const token = generateToken({ userId: user.id, role: user.role, name: user.name });

  res.status(201).json({
    success: true,
    message: '注册成功',
    data: {
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: maskPhone(user.phone),
        role: user.role,
        points_balance: user.points_balance,
      },
    },
  } as ApiResponse);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    res.status(400).json({ success: false, error: '手机号和密码不能为空' } as ApiResponse);
    return;
  }

  const user = await loginUser(phone, password);
  const token = generateToken({ userId: user.id, role: user.role, name: user.name });

  res.json({
    success: true,
    message: '登录成功',
    data: {
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: maskPhone(user.phone),
        role: user.role,
        points_balance: user.points_balance,
      },
    },
  } as ApiResponse);
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, error: '未认证' } as ApiResponse);
    return;
  }

  const user = await getUserById(req.user.userId);
  if (!user) {
    res.status(404).json({ success: false, error: '用户不存在' } as ApiResponse);
    return;
  }

  const publicUser: PublicUser = {
    id: user.id,
    name: user.name,
    phone: maskPhone(user.phone),
    role: user.role,
    points_balance: user.points_balance,
  };

  res.json({
    success: true,
    data: { user: publicUser },
  } as ApiResponse);
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id, 10);
  const user = await getPublicUserById(userId);

  if (!user) {
    res.status(404).json({ success: false, error: '用户不存在' } as ApiResponse);
    return;
  }

  res.json({
    success: true,
    data: { user },
  } as ApiResponse);
});

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const pageSize = parseInt(req.query.pageSize as string, 10) || 20;

  const { users, total } = await listUsers(page, pageSize);

  res.json({
    success: true,
    data: {
      users,
      total,
      page,
      pageSize,
    },
  } as ApiResponse);
});

export const getPointsBalance = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || parseInt(req.params.userId, 10);

  if (!userId) {
    res.status(400).json({ success: false, error: '缺少用户ID' } as ApiResponse);
    return;
  }

  const balance = await getUserPoints(userId);

  res.json({
    success: true,
    data: { balance },
  } as ApiResponse);
});
