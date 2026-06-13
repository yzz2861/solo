import cron from 'node-cron';
import prisma from '../config/prisma';
import { AccessStatus, VisitStatus } from '@prisma/client';
import dayjs from 'dayjs';
import { config } from '../config';

export const autoRevokeExpiredPermissions = async () => {
  const now = new Date();

  const expiredPermissions = await prisma.accessPermission.findMany({
    where: {
      status: AccessStatus.ACTIVE,
      endTime: { lt: now },
    },
  });

  if (expiredPermissions.length === 0) {
    return { revoked: 0 };
  }

  let revokedCount = 0;

  for (const permission of expiredPermissions) {
    await prisma.accessPermission.update({
      where: { id: permission.id },
      data: {
        status: AccessStatus.EXPIRED,
        revokedAt: now,
        revokedReason: '访问时段已结束，自动撤权',
      },
    });
    revokedCount++;
  }

  console.log(`[Cron] 自动撤权任务执行完成，共撤销 ${revokedCount} 条过期权限`);
  return { revoked: revokedCount };
};

export const autoCompleteVisits = async () => {
  const now = new Date();

  const completedVisits = await prisma.visitRecord.findMany({
    where: {
      status: VisitStatus.APPROVED,
      endTime: { lt: now },
      actualExitAt: { not: null },
    },
  });

  let completedCount = 0;

  for (const visit of completedVisits) {
    await prisma.visitRecord.update({
      where: { id: visit.id },
      data: {
        status: VisitStatus.COMPLETED,
      },
    });
    completedCount++;
  }

  console.log(`[Cron] 自动完成到访任务执行完成，共完成 ${completedCount} 条到访记录`);
  return { completed: completedCount };
};

export const startCronJobs = () => {
  cron.schedule(config.cronAutoRevoke, async () => {
    try {
      await autoRevokeExpiredPermissions();
      await autoCompleteVisits();
    } catch (error) {
      console.error('[Cron] 定时任务执行出错:', error);
    }
  });

  console.log(`[Cron] 定时任务已启动，撤权任务调度: ${config.cronAutoRevoke}`);
};
