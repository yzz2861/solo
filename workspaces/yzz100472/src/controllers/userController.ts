import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';
import { UserRole } from '@prisma/client';

const createUserSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(6, '密码长度不能少于6位'),
  name: z.string().min(1, '姓名不能为空'),
  role: z.nativeEnum(UserRole),
  phone: z.string().optional(),
  email: z.string().email('邮箱格式不正确').optional(),
  tenantId: z.string().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1, '姓名不能为空').optional(),
  role: z.nativeEnum(UserRole).optional(),
  phone: z.string().optional(),
  email: z.string().email('邮箱格式不正确').optional(),
  tenantId: z.string().optional(),
  password: z.string().min(6, '密码长度不能少于6位').optional(),
});

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = createUserSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { username: data.username },
    });

    if (existingUser) {
      return next(new AppError('用户名已存在', 400));
    }

    if (data.role === UserRole.TENANT_ADMIN && !data.tenantId) {
      return next(new AppError('租户管理员必须关联租户', 400));
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
      include: { tenant: { select: { name: true } } },
    });

    const { password, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
};

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      page = '1',
      pageSize = '10',
      role,
      keyword,
      tenantId,
    } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const where: any = {};

    if (role) {
      where.role = role as UserRole;
    }

    if (tenantId) {
      where.tenantId = tenantId as string;
    }

    if (keyword) {
      where.OR = [
        { username: { contains: keyword as string } },
        { name: { contains: keyword as string } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          phone: true,
          email: true,
          tenantId: true,
          tenant: { select: { name: true } },
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        list: users,
        total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: { tenant: { select: { name: true } } },
    });

    if (!user) {
      return next(new AppError('用户不存在', 404));
    }

    const { password, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const data = updateUserSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return next(new AppError('用户不存在', 404));
    }

    if (data.role === UserRole.TENANT_ADMIN && !data.tenantId && !user.tenantId) {
      return next(new AppError('租户管理员必须关联租户', 400));
    }

    const updateData: any = { ...data };

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { tenant: { select: { name: true } } },
    });

    const { password, ...userWithoutPassword } = updatedUser;

    res.json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return next(new AppError('用户不存在', 404));
    }

    if (req.user?.id === id) {
      return next(new AppError('不能删除自己的账号', 400));
    }

    await prisma.user.delete({ where: { id } });

    res.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    next(error);
  }
};
