import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import {
  AccessDirection,
  AccessLogType,
  AccessStatus,
  UserRole,
  VisitStatus,
} from '@prisma/client';
import dayjs from 'dayjs';

export const getOverdueVisitors = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const now = new Date();

    const where: any = {
      status: { in: [VisitStatus.APPROVED, VisitStatus.PENDING] },
      endTime: { lt: now },
      actualExitAt: null,
    };

    if (req.user?.role === UserRole.TENANT_ADMIN) {
      where.tenantId = req.user.tenantId;
    }

    const overdueVisits = await prisma.visitRecord.findMany({
      where,
      include: {
        visitor: true,
        tenant: { select: { name: true } },
        meetingRoom: { select: { name: true } },
        accessPermission: true,
        accessLogs: {
          where: { direction: AccessDirection.IN },
          orderBy: { accessTime: 'desc' },
          take: 1,
        },
      },
      orderBy: { endTime: 'asc' },
    });

    const result = overdueVisits.map((visit) => {
      const lastEntry = visit.accessLogs[0];
      const overdueMinutes = dayjs(now).diff(dayjs(visit.endTime), 'minute');

      return {
        visitId: visit.id,
        visitorName: visit.visitorName,
        visitorPhone: visit.visitorPhone,
        idCardNumber: visit.idCardNumber,
        tenantId: visit.tenantId,
        tenantName: visit.tenant?.name,
        purpose: visit.purpose,
        scheduledEndTime: visit.endTime,
        actualEntryTime: lastEntry?.accessTime || visit.actualEntryAt,
        overdueMinutes,
        overdueHours: Math.round((overdueMinutes / 60) * 10) / 10,
        meetingRoom: visit.meetingRoom?.name,
        accessCardNumber: visit.accessPermission?.cardNumber,
      };
    });

    res.json({
      success: true,
      data: {
        list: result,
        total: result.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAbnormalAccessLogs = async (
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
      tenantId,
    } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const where: any = {
      logType: AccessLogType.ABNORMAL,
    };

    if (startDate && endDate) {
      where.accessTime = {
        gte: dayjs(startDate as string).startOf('day').toDate(),
        lte: dayjs(endDate as string).endOf('day').toDate(),
      };
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

    const [logs, total] = await Promise.all([
      prisma.accessLog.findMany({
        where,
        skip,
        take,
        include: {
          visitRecord: {
            include: {
              visitor: true,
              tenant: { select: { name: true } },
            },
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

export const getWeeklyReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { weekStart, weekEnd } = req.query;

    let start: Date;
    let end: Date;

    if (weekStart && weekEnd) {
      start = dayjs(weekStart as string).startOf('day').toDate();
      end = dayjs(weekEnd as string).endOf('day').toDate();
    } else {
      start = dayjs().startOf('week').toDate();
      end = dayjs().endOf('week').toDate();
    }

    const [totalVisits, approvedVisits, rejectedVisits, cancelledVisits, totalVisitors, abnormalLogs, overdueCount] =
      await Promise.all([
        prisma.visitRecord.count({
          where: { startTime: { gte: start, lte: end } },
        }),
        prisma.visitRecord.count({
          where: {
            startTime: { gte: start, lte: end },
            status: VisitStatus.APPROVED,
          },
        }),
        prisma.visitRecord.count({
          where: {
            startTime: { gte: start, lte: end },
            status: VisitStatus.REJECTED,
          },
        }),
        prisma.visitRecord.count({
          where: {
            startTime: { gte: start, lte: end },
            status: VisitStatus.CANCELLED,
          },
        }),
        prisma.visitor.count({
          where: {
            visits: { some: { startTime: { gte: start, lte: end } } },
          },
        }),
        prisma.accessLog.count({
          where: {
            accessTime: { gte: start, lte: end },
            logType: AccessLogType.ABNORMAL,
          },
        }),
        prisma.visitRecord.count({
          where: {
            startTime: { gte: start, lte: end },
            endTime: { lt: new Date() },
            actualExitAt: null,
            status: { in: [VisitStatus.APPROVED, VisitStatus.PENDING] },
          },
        }),
      ]);

    const abnormalLogsWithDetails = await prisma.accessLog.findMany({
      where: {
        accessTime: { gte: start, lte: end },
        logType: AccessLogType.ABNORMAL,
      },
      include: {
        visitRecord: {
          include: {
            visitor: true,
            tenant: { select: { name: true } },
          },
        },
      },
      orderBy: { accessTime: 'desc' },
    });

    const abnormalAnalysis = analyzeAbnormalLogs(abnormalLogsWithDetails);

    const dailyStats = await getDailyStats(start, end);

    const tenantStats = await getTenantStats(start, end);

    res.json({
      success: true,
      data: {
        period: {
          start,
          end,
        },
        summary: {
          totalVisits,
          approvedVisits,
          rejectedVisits,
          cancelledVisits,
          totalVisitors,
          abnormalLogs,
          overdueCount,
          approvalRate: totalVisits > 0
            ? Math.round((approvedVisits / totalVisits) * 100) + '%'
            : '0%',
        },
        dailyStats,
        tenantStats: tenantStats.slice(0, 10),
        abnormalAnalysis,
      },
    });
  } catch (error) {
    next(error);
  }
};

function analyzeAbnormalLogs(logs: any[]) {
  const reasonMap = new Map<string, { count: number; examples: any[] }>();

  for (const log of logs) {
    const reason = log.abnormalReason || '未知原因';
    if (!reasonMap.has(reason)) {
      reasonMap.set(reason, { count: 0, examples: [] });
    }
    const data = reasonMap.get(reason)!;
    data.count++;
    if (data.examples.length < 3) {
      data.examples.push({
        id: log.id,
        accessTime: log.accessTime,
        doorName: log.doorName,
        visitorName: log.visitorName,
        direction: log.direction,
      });
    }
  }

  return {
    totalTypes: reasonMap.size,
    byReason: Array.from(reasonMap.entries()).map(([reason, data]) => ({
      reason,
      count: data.count,
      examples: data.examples,
    })),
  };
}

async function getDailyStats(start: Date, end: Date) {
  const stats: any[] = [];
  let current = dayjs(start);
  const endDay = dayjs(end);

  while (current.isBefore(endDay) || current.isSame(endDay, 'day')) {
    const dayStart = current.startOf('day').toDate();
    const dayEnd = current.endOf('day').toDate();

    const [visitCount, abnormalCount, entryCount] = await Promise.all([
      prisma.visitRecord.count({
        where: { startTime: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.accessLog.count({
        where: {
          accessTime: { gte: dayStart, lte: dayEnd },
          logType: AccessLogType.ABNORMAL,
        },
      }),
      prisma.accessLog.count({
        where: {
          accessTime: { gte: dayStart, lte: dayEnd },
          direction: AccessDirection.IN,
          logType: AccessLogType.NORMAL,
        },
      }),
    ]);

    stats.push({
      date: current.format('YYYY-MM-DD'),
      visitCount,
      entryCount,
      abnormalCount,
    });

    current = current.add(1, 'day');
  }

  return stats;
}

async function getTenantStats(start: Date, end: Date) {
  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  const stats = [];

  for (const tenant of tenants) {
    const [visitCount, visitorCount, abnormalCount] = await Promise.all([
      prisma.visitRecord.count({
        where: {
          tenantId: tenant.id,
          startTime: { gte: start, lte: end },
        },
      }),
      prisma.visitor.count({
        where: {
          tenantId: tenant.id,
          visits: { some: { startTime: { gte: start, lte: end } } },
        },
      }),
      prisma.accessLog.count({
        where: {
          accessTime: { gte: start, lte: end },
          logType: AccessLogType.ABNORMAL,
          visitRecord: { tenantId: tenant.id },
        },
      }),
    ]);

    stats.push({
      tenantId: tenant.id,
      tenantName: tenant.name,
      visitCount,
      visitorCount,
      abnormalCount,
    });
  }

  return stats.sort((a, b) => b.visitCount - a.visitCount);
}

export const getDashboardStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const today = dayjs().startOf('day');
    const tomorrow = dayjs().add(1, 'day').startOf('day');

    const [todayVisits, todayApproved, todayPending, activePermissions, abnormalToday, overdueNow] =
      await Promise.all([
        prisma.visitRecord.count({
          where: { startTime: { gte: today.toDate(), lt: tomorrow.toDate() } },
        }),
        prisma.visitRecord.count({
          where: {
            startTime: { gte: today.toDate(), lt: tomorrow.toDate() },
            status: VisitStatus.APPROVED,
          },
        }),
        prisma.visitRecord.count({
          where: {
            startTime: { gte: today.toDate(), lt: tomorrow.toDate() },
            status: VisitStatus.PENDING,
          },
        }),
        prisma.accessPermission.count({
          where: { status: AccessStatus.ACTIVE },
        }),
        prisma.accessLog.count({
          where: {
            accessTime: { gte: today.toDate(), lt: tomorrow.toDate() },
            logType: AccessLogType.ABNORMAL,
          },
        }),
        prisma.visitRecord.count({
          where: {
            endTime: { lt: new Date() },
            actualExitAt: null,
            status: { in: [VisitStatus.APPROVED, VisitStatus.PENDING] },
          },
        }),
      ]);

    res.json({
      success: true,
      data: {
        today: {
          totalVisits: todayVisits,
          approved: todayApproved,
          pending: todayPending,
        },
        active: {
          permissions: activePermissions,
        },
        alerts: {
          abnormalToday,
          overdueNow,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
