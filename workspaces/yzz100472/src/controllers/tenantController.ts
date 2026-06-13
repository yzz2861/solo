import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';
import { UserRole } from '@prisma/client';

const createTenantSchema = z.object({
  name: z.string().min(1, '租户名称不能为空'),
  contact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('邮箱格式不正确').optional(),
  address: z.string().optional(),
});

const updateTenantSchema = z.object({
  name: z.string().min(1, '租户名称不能为空').optional(),
  contact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('邮箱格式不正确').optional(),
  address: z.string().optional(),
});

export const createTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = createTenantSchema.parse(req.body);

    const tenant = await prisma.tenant.create({
      data,
    });

    res.status(201).json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
};

export const getTenants = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = '1', pageSize = '10', keyword = '' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const where = keyword
      ? {
          OR: [
            { name: { contains: keyword as string } },
            { contact: { contains: keyword as string } },
          ],
        }
      : {};

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.tenant.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        list: tenants,
        total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTenantById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (req.user?.role === UserRole.TENANT_ADMIN && req.user.tenantId !== id) {
      return next(new AppError('权限不足', 403));
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      return next(new AppError('租户不存在', 404));
    }

    res.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const data = updateTenantSchema.parse(req.body);

    const tenant = await prisma.tenant.findUnique({ where: { id } });

    if (!tenant) {
      return next(new AppError('租户不存在', 404));
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data,
    });

    res.json({
      success: true,
      data: updatedTenant,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
};

export const deleteTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const tenant = await prisma.tenant.findUnique({ where: { id } });

    if (!tenant) {
      return next(new AppError('租户不存在', 404));
    }

    await prisma.tenant.delete({ where: { id } });

    res.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    next(error);
  }
};
