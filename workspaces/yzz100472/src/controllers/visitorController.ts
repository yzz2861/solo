import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';
import { IDCardType, UserRole, VisitStatus } from '@prisma/client';
import dayjs from 'dayjs';

const createVisitorSchema = z.object({
  name: z.string().min(1, '访客姓名不能为空'),
  idCardType: z.nativeEnum(IDCardType).default(IDCardType.ID_CARD),
  idCardNumber: z.string().min(1, '证件号码不能为空'),
  phone: z.string().optional(),
  company: z.string().optional(),
  tenantId: z.string().min(1, '租户ID不能为空'),
});

export const createVisitor = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = createVisitorSchema.parse(req.body);

    if (
      req.user?.role === UserRole.TENANT_ADMIN &&
      req.user.tenantId !== data.tenantId
    ) {
      return next(new AppError('权限不足', 403));
    }

    const existingVisitor = await prisma.visitor.findUnique({
      where: {
        tenantId_idCardNumber: {
          tenantId: data.tenantId,
          idCardNumber: data.idCardNumber,
        },
      },
    });

    if (existingVisitor) {
      res.json({
        success: true,
        data: existingVisitor,
      });
      return;
    }

    const visitor = await prisma.visitor.create({
      data,
    });

    res.status(201).json({
      success: true,
      data: visitor,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
};

export const getVisitors = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      page = '1',
      pageSize = '10',
      keyword = '',
      tenantId,
    } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const where: any = {};

    if (keyword) {
      where.OR = [
        { name: { contains: keyword as string } },
        { idCardNumber: { contains: keyword as string } },
      ];
    }

    if (tenantId) {
      where.tenantId = tenantId as string;
    }

    if (req.user?.role === UserRole.TENANT_ADMIN) {
      where.tenantId = req.user.tenantId;
    }

    const [visitors, total] = await Promise.all([
      prisma.visitor.findMany({
        where,
        skip,
        take,
        include: { tenant: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.visitor.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        list: visitors,
        total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getVisitorById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const visitor = await prisma.visitor.findUnique({
      where: { id },
      include: {
        tenant: { select: { name: true } },
        visits: {
          orderBy: { startTime: 'desc' },
          take: 10,
        },
      },
    });

    if (!visitor) {
      return next(new AppError('访客不存在', 404));
    }

    if (
      req.user?.role === UserRole.TENANT_ADMIN &&
      req.user.tenantId !== visitor.tenantId
    ) {
      return next(new AppError('权限不足', 403));
    }

    res.json({
      success: true,
      data: visitor,
    });
  } catch (error) {
    next(error);
  }
};
