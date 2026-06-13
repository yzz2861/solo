import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { generateToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { username },
      include: { tenant: true },
    });

    if (!user) {
      return next(new AppError('用户名或密码错误', 401));
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return next(new AppError('用户名或密码错误', 401));
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
      tenantId: user.tenantId,
      name: user.name,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          tenantName: user.tenant?.name,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
};

export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new AppError('未授权访问', 401));
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { tenant: true },
    });

    if (!user) {
      return next(new AppError('用户不存在', 404));
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenant?.name,
      },
    });
  } catch (error) {
    next(error);
  }
};
