import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';
import { AccessStatus, UserRole, VisitStatus } from '@prisma/client';
import dayjs from 'dayjs';

const grantAccessSchema = z.object({
  visitRecordId: z.string().min(1, '到访记录ID不能为空'),
  cardNumber: z.string().optional(),
  accessDoors: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

const revokeAccessSchema = z.object({
  reason: z.string().min(1, '撤权原因不能为空'),
});

export const grantAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = grantAccessSchema.parse(req.body);

    const visit = await prisma.visitRecord.findUnique({
      where: { id: data.visitRecordId },
    });

    if (!visit) {
      return next(new AppError('到访记录不存在', 404));
    }

    if (visit.status !== VisitStatus.APPROVED) {
      return next(new AppError('只有审核通过的到访才能发放门禁权限', 400));
    }

    const existingPermission = await prisma.accessPermission.findUnique({
      where: { visitRecordId: data.visitRecordId },
    });

    if (existingPermission && existingPermission.status === AccessStatus.ACTIVE) {
      return next(new AppError('该访客已有生效的门禁权限', 400));
    }

    const startTime = data.startTime
      ? dayjs(data.startTime).toDate()
      : visit.startTime;
    const endTime = data.endTime
      ? dayjs(data.endTime).toDate()
      : visit.endTime;

    let accessPermission;

    if (existingPermission) {
      accessPermission = await prisma.accessPermission.update({
        where: { id: existingPermission.id },
        data: {
          status: AccessStatus.ACTIVE,
          cardNumber: data.cardNumber,
          accessDoors: data.accessDoors,
          startTime,
          endTime,
          revokedAt: null,
          revokedReason: null,
        },
      });
    } else {
      accessPermission = await prisma.accessPermission.create({
        data: {
          visitRecordId: data.visitRecordId,
          tenantId: visit.tenantId,
          visitorName: visit.visitorName,
          cardNumber: data.cardNumber,
          accessDoors: data.accessDoors,
          startTime,
          endTime,
          status: AccessStatus.ACTIVE,
        },
      });
    }

    res.status(201).json({
      success: true,
      data: accessPermission,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
};

export const revokeAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { reason } = revokeAccessSchema.parse(req.body);

    const permission = await prisma.accessPermission.findUnique({
      where: { id },
    });

    if (!permission) {
      return next(new AppError('门禁权限不存在', 404));
    }

    if (permission.status !== AccessStatus.ACTIVE) {
      return next(new AppError('该权限已失效，无需撤权', 400));
    }

    const updatedPermission = await prisma.accessPermission.update({
      where: { id },
      data: {
        status: AccessStatus.REVOKED,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });

    res.json({
      success: true,
      data: updatedPermission,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
};

export const getAccessPermissions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      page = '1',
      pageSize = '10',
      status,
      tenantId,
      visitorName,
    } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const where: any = {};

    if (status) {
      where.status = status as AccessStatus;
    }

    if (tenantId) {
      where.tenantId = tenantId as string;
    }

    if (req.user?.role === UserRole.TENANT_ADMIN) {
      where.tenantId = req.user.tenantId;
    }

    if (visitorName) {
      where.visitorName = { contains: visitorName as string };
    }

    const [permissions, total] = await Promise.all([
      prisma.accessPermission.findMany({
        where,
        skip,
        take,
        include: {
          visitRecord: {
            include: {
              tenant: { select: { name: true } },
              meetingRoom: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.accessPermission.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        list: permissions,
        total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAccessPermissionById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const permission = await prisma.accessPermission.findUnique({
      where: { id },
      include: {
        visitRecord: {
          include: {
            visitor: true,
            tenant: { select: { name: true } },
          },
        },
        accessLogs: {
          orderBy: { accessTime: 'asc' },
        },
      },
    });

    if (!permission) {
      return next(new AppError('门禁权限不存在', 404));
    }

    if (
      req.user?.role === UserRole.TENANT_ADMIN &&
      req.user.tenantId !== permission.tenantId
    ) {
      return next(new AppError('权限不足', 403));
    }

    res.json({
      success: true,
      data: permission,
    });
  } catch (error) {
    next(error);
  }
};
