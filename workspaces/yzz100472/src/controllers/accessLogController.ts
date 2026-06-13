import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';
import {
  AccessDirection,
  AccessLogType,
  AccessStatus,
  UserRole,
  VisitStatus,
} from '@prisma/client';
import dayjs from 'dayjs';

const createAccessLogSchema = z.object({
  cardNumber: z.string().min(1, '卡号不能为空'),
  doorName: z.string().min(1, '门名称不能为空'),
  direction: z.nativeEnum(AccessDirection),
  accessTime: z.string().optional(),
  accessPermissionId: z.string().optional(),
});

export const createAccessLog = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = createAccessLogSchema.parse(req.body);
    const accessTime = data.accessTime
      ? dayjs(data.accessTime).toDate()
      : new Date();

    let accessPermission: any = null;
    let visitRecord: any = null;
    let logType: AccessLogType = AccessLogType.NORMAL;
    let abnormalReason: string | undefined;

    if (data.accessPermissionId) {
      accessPermission = await prisma.accessPermission.findUnique({
        where: { id: data.accessPermissionId },
        include: { visitRecord: true },
      });
    } else {
      accessPermission = await prisma.accessPermission.findFirst({
        where: {
          cardNumber: data.cardNumber,
          status: AccessStatus.ACTIVE,
        },
        include: { visitRecord: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (accessPermission) {
      visitRecord = accessPermission.visitRecord;

      if (accessPermission.status !== AccessStatus.ACTIVE) {
        logType = AccessLogType.ABNORMAL;
        abnormalReason = '门禁权限已失效';
      }

      if (
        accessTime < accessPermission.startTime ||
        accessTime > accessPermission.endTime
      ) {
        logType = AccessLogType.ABNORMAL;
        abnormalReason = '不在有效通行时段内';
      }
    } else {
      logType = AccessLogType.ABNORMAL;
      abnormalReason = '未找到对应门禁权限';
    }

    const accessLog = await prisma.accessLog.create({
      data: {
        accessPermissionId: accessPermission?.id,
        visitRecordId: visitRecord?.id,
        doorName: data.doorName,
        cardNumber: data.cardNumber,
        direction: data.direction,
        accessTime,
        logType,
        abnormalReason,
        visitorName: accessPermission?.visitorName,
        tenantName: visitRecord?.tenantId
          ? (
              await prisma.tenant.findUnique({
                where: { id: visitRecord.tenantId },
                select: { name: true },
              })
            )?.name
          : undefined,
      },
    });

    if (
      visitRecord &&
      logType === AccessLogType.NORMAL &&
      data.direction === AccessDirection.IN &&
      !visitRecord.actualEntryAt
    ) {
      await prisma.visitRecord.update({
        where: { id: visitRecord.id },
        data: { actualEntryAt: accessTime },
      });
    }

    if (
      visitRecord &&
      logType === AccessLogType.NORMAL &&
      data.direction === AccessDirection.OUT
    ) {
      await prisma.visitRecord.update({
        where: { id: visitRecord.id },
        data: { actualExitAt: accessTime },
      });
    }

    res.status(201).json({
      success: true,
      data: accessLog,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
};

export const getAccessLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      page = '1',
      pageSize = '20',
      startDate,
      endDate,
      direction,
      logType,
      tenantId,
      visitorName,
      doorName,
      cardNumber,
    } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const where: any = {};

    if (startDate && endDate) {
      where.accessTime = {
        gte: dayjs(startDate as string).startOf('day').toDate(),
        lte: dayjs(endDate as string).endOf('day').toDate(),
      };
    }

    if (direction) {
      where.direction = direction as AccessDirection;
    }

    if (logType) {
      where.logType = logType as AccessLogType;
    }

    if (tenantId) {
      const permissions = await prisma.accessPermission.findMany({
        where: { tenantId: tenantId as string },
        select: { id: true },
      });
      where.accessPermissionId = {
        in: permissions.map((p) => p.id),
      };
    }

    if (req.user?.role === UserRole.TENANT_ADMIN && req.user.tenantId) {
      const permissions = await prisma.accessPermission.findMany({
        where: { tenantId: req.user.tenantId },
        select: { id: true },
      });
      where.accessPermissionId = {
        in: permissions.map((p) => p.id),
      };
    }

    if (visitorName) {
      where.visitorName = { contains: visitorName as string };
    }

    if (doorName) {
      where.doorName = { contains: doorName as string };
    }

    if (cardNumber) {
      where.cardNumber = { contains: cardNumber as string };
    }

    const [logs, total] = await Promise.all([
      prisma.accessLog.findMany({
        where,
        skip,
        take,
        include: {
          accessPermission: {
            include: {
              visitRecord: {
                include: { tenant: { select: { name: true } } },
              },
            },
          },
          visitRecord: {
            include: { visitor: true, tenant: { select: { name: true } } },
          },
        },
        orderBy: { accessTime: 'desc' },
      }),
      prisma.accessLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        list: logs,
        total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const alignExitTime = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { visitId } = req.params;

    const visit = await prisma.visitRecord.findUnique({
      where: { id: visitId },
      include: {
        accessLogs: {
          where: { direction: AccessDirection.OUT },
          orderBy: { accessTime: 'desc' },
          take: 1,
        },
      },
    });

    if (!visit) {
      return next(new AppError('到访记录不存在', 404));
    }

    if (visit.accessLogs.length === 0) {
      return next(new AppError('未找到离场门禁记录', 400));
    }

    const exitLog = visit.accessLogs[0];

    const updatedVisit = await prisma.visitRecord.update({
      where: { id: visitId },
      data: {
        actualExitAt: exitLog.accessTime,
        status: VisitStatus.COMPLETED,
      },
    });

    res.json({
      success: true,
      data: {
        visit: updatedVisit,
        exitLog,
        message: '离场时间已与门禁记录对齐',
      },
    });
  } catch (error) {
    next(error);
  }
};
