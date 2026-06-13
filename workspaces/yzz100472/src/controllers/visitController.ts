import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';
import {
  IDCardType,
  UserRole,
  VisitStatus,
  AccessStatus,
} from '@prisma/client';
import dayjs from 'dayjs';

const createVisitSchema = z.object({
  visitorName: z.string().min(1, '访客姓名不能为空'),
  visitorPhone: z.string().optional(),
  idCardType: z.nativeEnum(IDCardType).default(IDCardType.ID_CARD),
  idCardNumber: z.string().min(1, '证件号码不能为空'),
  tenantId: z.string().min(1, '租户ID不能为空'),
  purpose: z.string().optional(),
  startTime: z.string().min(1, '到访开始时间不能为空'),
  endTime: z.string().min(1, '到访结束时间不能为空'),
  meetingRoomId: z.string().optional(),
  meetingName: z.string().optional(),
});

const approveVisitSchema = z.object({
  cardNumber: z.string().optional(),
  accessDoors: z.string().optional(),
});

const rejectVisitSchema = z.object({
  reason: z.string().min(1, '拒绝原因不能为空'),
});

export const createVisit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = createVisitSchema.parse(req.body);

    if (
      req.user?.role === UserRole.TENANT_ADMIN &&
      req.user.tenantId !== data.tenantId
    ) {
      return next(new AppError('权限不足', 403));
    }

    const startTime = dayjs(data.startTime).toDate();
    const endTime = dayjs(data.endTime).toDate();

    if (startTime >= endTime) {
      return next(new AppError('结束时间必须晚于开始时间', 400));
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: data.tenantId },
    });

    if (!tenant) {
      return next(new AppError('租户不存在', 404));
    }

    if (data.meetingRoomId) {
      const meetingRoom = await prisma.meetingRoom.findUnique({
        where: { id: data.meetingRoomId },
      });
      if (!meetingRoom) {
        return next(new AppError('会议室不存在', 404));
      }

      const conflictVisit = await prisma.visitRecord.findFirst({
        where: {
          meetingRoomId: data.meetingRoomId,
          status: { in: [VisitStatus.PENDING, VisitStatus.APPROVED] },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });

      if (conflictVisit) {
        return next(new AppError('该时段会议室已被预约', 400));
      }
    }

    let visitor = await prisma.visitor.findUnique({
      where: {
        tenantId_idCardNumber: {
          tenantId: data.tenantId,
          idCardNumber: data.idCardNumber,
        },
      },
    });

    if (!visitor) {
      visitor = await prisma.visitor.create({
        data: {
          name: data.visitorName,
          idCardType: data.idCardType,
          idCardNumber: data.idCardNumber,
          phone: data.visitorPhone,
          tenantId: data.tenantId,
        },
      });
    }

    const visit = await prisma.visitRecord.create({
      data: {
        visitorId: visitor.id,
        tenantId: data.tenantId,
        visitorName: data.visitorName,
        visitorPhone: data.visitorPhone,
        idCardType: data.idCardType,
        idCardNumber: data.idCardNumber,
        purpose: data.purpose,
        startTime,
        endTime,
        status: VisitStatus.PENDING,
        meetingRoomId: data.meetingRoomId,
        meetingName: data.meetingName,
        createdBy: req.user?.id,
      },
      include: {
        visitor: true,
        tenant: { select: { name: true } },
        meetingRoom: { select: { name: true, floor: true } },
      },
    });

    res.status(201).json({
      success: true,
      data: visit,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
};

export const approveVisit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { cardNumber, accessDoors } = approveVisitSchema.parse(req.body);

    const visit = await prisma.visitRecord.findUnique({
      where: { id },
    });

    if (!visit) {
      return next(new AppError('到访记录不存在', 404));
    }

    if (visit.status !== VisitStatus.PENDING) {
      return next(new AppError('只有待审核的记录才能审核通过', 400));
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedVisit = await tx.visitRecord.update({
        where: { id },
        data: {
          status: VisitStatus.APPROVED,
          approvedBy: req.user?.id,
          approvedAt: new Date(),
        },
        include: {
          visitor: true,
          tenant: { select: { name: true } },
          meetingRoom: { select: { name: true, floor: true } },
        },
      });

      const accessPermission = await tx.accessPermission.create({
        data: {
          visitRecordId: id,
          tenantId: visit.tenantId,
          visitorName: visit.visitorName,
          cardNumber,
          accessDoors,
          startTime: visit.startTime,
          endTime: visit.endTime,
          status: AccessStatus.ACTIVE,
        },
      });

      return { visit: updatedVisit, accessPermission };
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
};

export const rejectVisit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { reason } = rejectVisitSchema.parse(req.body);

    const visit = await prisma.visitRecord.findUnique({
      where: { id },
    });

    if (!visit) {
      return next(new AppError('到访记录不存在', 404));
    }

    if (visit.status !== VisitStatus.PENDING) {
      return next(new AppError('只有待审核的记录才能拒绝', 400));
    }

    const updatedVisit = await prisma.visitRecord.update({
      where: { id },
      data: {
        status: VisitStatus.REJECTED,
        rejectedReason: reason,
        approvedBy: req.user?.id,
        approvedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: updatedVisit,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
};

export const cancelVisit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const visit = await prisma.visitRecord.findUnique({
      where: { id },
      include: { accessPermission: true },
    });

    if (!visit) {
      return next(new AppError('到访记录不存在', 404));
    }

    if (
      visit.status !== VisitStatus.PENDING &&
      visit.status !== VisitStatus.APPROVED
    ) {
      return next(new AppError('该状态下不能取消预约', 400));
    }

    if (
      req.user?.role === UserRole.TENANT_ADMIN &&
      req.user.tenantId !== visit.tenantId
    ) {
      return next(new AppError('权限不足', 403));
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedVisit = await tx.visitRecord.update({
        where: { id },
        data: {
          status: VisitStatus.CANCELLED,
        },
      });

      if (visit.accessPermission && visit.accessPermission.status === AccessStatus.ACTIVE) {
        await tx.accessPermission.update({
          where: { id: visit.accessPermission.id },
          data: {
            status: AccessStatus.REVOKED,
            revokedAt: new Date(),
            revokedReason: '会议取消，通行权限撤回',
          },
        });
      }

      return updatedVisit;
    });

    res.json({
      success: true,
      data: result,
      message: '预约已取消，门禁权限已撤回',
    });
  } catch (error) {
    next(error);
  }
};

export const getVisits = async (
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
      startDate,
      endDate,
      keyword,
      visitorId,
    } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const where: any = {};

    if (status) {
      where.status = status as VisitStatus;
    }

    if (tenantId) {
      where.tenantId = tenantId as string;
    }

    if (req.user?.role === UserRole.TENANT_ADMIN) {
      where.tenantId = req.user.tenantId;
    }

    if (startDate && endDate) {
      where.startTime = {
        gte: dayjs(startDate as string).startOf('day').toDate(),
        lte: dayjs(endDate as string).endOf('day').toDate(),
      };
    }

    if (keyword) {
      where.OR = [
        { visitorName: { contains: keyword as string } },
        { idCardNumber: { contains: keyword as string } },
        { visitorPhone: { contains: keyword as string } },
      ];
    }

    if (visitorId) {
      where.visitorId = visitorId as string;
    }

    const [visits, total] = await Promise.all([
      prisma.visitRecord.findMany({
        where,
        skip,
        take,
        include: {
          visitor: true,
          tenant: { select: { name: true } },
          meetingRoom: { select: { name: true, floor: true } },
          accessPermission: true,
        },
        orderBy: { startTime: 'desc' },
      }),
      prisma.visitRecord.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        list: visits,
        total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTodayVisits = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const today = dayjs().startOf('day');
    const tomorrow = dayjs().add(1, 'day').startOf('day');

    const where: any = {
      startTime: {
        gte: today.toDate(),
        lt: tomorrow.toDate(),
      },
    };

    if (req.user?.role === UserRole.TENANT_ADMIN) {
      where.tenantId = req.user.tenantId;
    }

    const visits = await prisma.visitRecord.findMany({
      where,
      include: {
        visitor: true,
        tenant: { select: { name: true } },
        meetingRoom: { select: { name: true, floor: true } },
        accessPermission: true,
      },
      orderBy: { startTime: 'asc' },
    });

    const mergedVisits = mergeDailyVisits(visits);

    res.json({
      success: true,
      data: mergedVisits,
    });
  } catch (error) {
    next(error);
  }
};

function mergeDailyVisits(visits: any[]) {
  const visitorMap = new Map<string, any>();

  for (const visit of visits) {
    const key = `${visit.tenantId}_${visit.idCardNumber}`;

    if (!visitorMap.has(key)) {
      visitorMap.set(key, {
        visitorName: visit.visitorName,
        idCardNumber: visit.idCardNumber,
        idCardType: visit.idCardType,
        visitorPhone: visit.visitorPhone,
        tenantId: visit.tenantId,
        tenantName: visit.tenant?.name,
        visits: [],
        firstVisitTime: visit.startTime,
        lastVisitTime: visit.endTime,
        status: visit.status,
        hasApproved: visit.status === VisitStatus.APPROVED,
        hasPending: visit.status === VisitStatus.PENDING,
      });
    }

    const merged = visitorMap.get(key);
    merged.visits.push({
      id: visit.id,
      purpose: visit.purpose,
      startTime: visit.startTime,
      endTime: visit.endTime,
      status: visit.status,
      meetingRoomName: visit.meetingRoom?.name,
      meetingName: visit.meetingName,
      accessPermission: visit.accessPermission,
      actualEntryAt: visit.actualEntryAt,
      actualExitAt: visit.actualExitAt,
    });

    if (dayjs(visit.startTime).isBefore(dayjs(merged.firstVisitTime))) {
      merged.firstVisitTime = visit.startTime;
    }
    if (dayjs(visit.endTime).isAfter(dayjs(merged.lastVisitTime))) {
      merged.lastVisitTime = visit.endTime;
    }
    if (visit.status === VisitStatus.APPROVED) {
      merged.hasApproved = true;
    }
    if (visit.status === VisitStatus.PENDING) {
      merged.hasPending = true;
    }

    if (merged.hasApproved) {
      merged.status = VisitStatus.APPROVED;
    } else if (merged.hasPending) {
      merged.status = VisitStatus.PENDING;
    } else {
      merged.status = visit.status;
    }
  }

  return Array.from(visitorMap.values()).sort(
    (a: any, b: any) =>
      new Date(a.firstVisitTime).getTime() - new Date(b.firstVisitTime).getTime()
  );
}

export const getVisitById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const visit = await prisma.visitRecord.findUnique({
      where: { id },
      include: {
        visitor: true,
        tenant: { select: { name: true } },
        meetingRoom: { select: { name: true, floor: true } },
        accessPermission: true,
        accessLogs: {
          orderBy: { accessTime: 'asc' },
        },
      },
    });

    if (!visit) {
      return next(new AppError('到访记录不存在', 404));
    }

    if (
      req.user?.role === UserRole.TENANT_ADMIN &&
      req.user.tenantId !== visit.tenantId
    ) {
      return next(new AppError('权限不足', 403));
    }

    res.json({
      success: true,
      data: visit,
    });
  } catch (error) {
    next(error);
  }
};
