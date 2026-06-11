import { prisma } from '../prisma';
import type { SessionUser } from '../auth';
import { canUserModifyStudent } from '../auth';
import { writeAuditLog } from './audit-service';

export type ChangeStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'MERGED';

export interface CreateChangeParams {
  studentId: string;
  date: string;
  newRouteId: string;
  newStopId: string;
  reason?: string;
}

export class ChangeServiceError extends Error {
  status: number;
  constructor(msg: string, status: number = 400) {
    super(msg);
    this.status = status;
  }
}

export async function validateInitiatorAuthorization(
  user: SessionUser,
  studentId: string,
): Promise<boolean> {
  return canUserModifyStudent(user, studentId);
}

export async function checkAlreadyBoarded(
  studentId: string,
  date: string,
): Promise<boolean> {
  const record = await prisma.boardingRecord.findUnique({
    where: { studentId_date: { studentId, date } },
  });
  return !!record && !!record.boardedAt;
}

export async function findDuplicatePending(
  studentId: string,
  date: string,
) {
  return prisma.changeRequest.findMany({
    where: {
      studentId,
      date,
      status: 'PENDING',
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function checkSeatCapacity(
  newRouteId: string,
  date: string,
): Promise<{ capacity: number; used: number; remaining: number }> {
  const route = await prisma.busRoute.findUnique({
    where: { id: newRouteId },
  });
  if (!route) {
    throw new ChangeServiceError('线路不存在', 404);
  }

  const defaultCount = await prisma.student.count({
    where: { defaultRouteId: newRouteId },
  });

  const confirmedOut = await prisma.changeRequest.count({
    where: {
      date,
      originalRouteId: newRouteId,
      status: 'CONFIRMED',
    },
  });

  const confirmedIn = await prisma.changeRequest.count({
    where: {
      date,
      newRouteId,
      status: 'CONFIRMED',
    },
  });

  const used = defaultCount - confirmedOut + confirmedIn;

  return {
    capacity: route.capacity,
    used,
    remaining: route.capacity - used,
  };
}

export async function createChange(
  initiator: SessionUser,
  params: CreateChangeParams,
) {
  const { studentId, date, newRouteId, newStopId, reason } = params;

  const authorized = await validateInitiatorAuthorization(initiator, studentId);
  if (!authorized) {
    throw new ChangeServiceError('无权修改该学生信息', 403);
  }

  const boarded = await checkAlreadyBoarded(studentId, date);
  if (boarded) {
    throw new ChangeServiceError('该学生当日已上车，无法变更');
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });
  if (!student) {
    throw new ChangeServiceError('学生不存在', 404);
  }

  if (student.defaultRouteId === newRouteId && student.defaultStopId === newStopId) {
    throw new ChangeServiceError('新上车站点与默认站点相同，无需变更');
  }

  const newStop = await prisma.busStop.findFirst({
    where: { id: newStopId, routeId: newRouteId },
  });
  if (!newStop) {
    throw new ChangeServiceError('目标站点不属于目标线路', 400);
  }

  const capacityInfo = await checkSeatCapacity(newRouteId, date);
  if (capacityInfo.remaining <= 0) {
    throw new ChangeServiceError(`目标线路 ${date} 座位已满（容量 ${capacityInfo.capacity}）`);
  }

  return prisma.$transaction(async (tx) => {
    const pendingChanges = await tx.changeRequest.findMany({
      where: {
        studentId,
        date,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'asc' },
    });

    const newChange = await tx.changeRequest.create({
      data: {
        studentId,
        date,
        originalRouteId: student.defaultRouteId,
        originalStopId: student.defaultStopId,
        newRouteId,
        newStopId,
        reason,
        initiatorId: initiator.id,
        initiatorName: initiator.name,
        initiatorRole: initiator.role,
        status: 'PENDING',
      },
    });

    if (pendingChanges.length > 0) {
      await tx.changeRequest.updateMany({
        where: {
          id: { in: pendingChanges.map((c) => c.id) },
        },
        data: {
          status: 'MERGED',
          mergedToId: newChange.id,
        },
      });
    }

    await writeAuditLog(
      'CREATE_CHANGE',
      newChange.id,
      initiator,
      {
        studentId,
        date,
        originalRouteId: student.defaultRouteId,
        originalStopId: student.defaultStopId,
        newRouteId,
        newStopId,
        reason,
        mergedCount: pendingChanges.length,
      },
      tx,
    );

    return newChange;
  });
}

export async function confirmChange(
  driver: SessionUser,
  changeId: string,
  status: 'CONFIRMED' | 'REJECTED',
  remark?: string,
) {
  if (driver.role !== 'DRIVER' && driver.role !== 'CONDUCTOR' && driver.role !== 'ADMIN') {
    throw new ChangeServiceError('仅司机、跟车老师或管理员可确认变更', 403);
  }

  const change = await prisma.changeRequest.findUnique({
    where: { id: changeId },
  });
  if (!change) {
    throw new ChangeServiceError('变更申请不存在', 404);
  }

  if (change.status !== 'PENDING') {
    throw new ChangeServiceError(`当前状态为 ${change.status}，无法确认/驳回`);
  }

  if (status === 'CONFIRMED') {
    const capacityInfo = await checkSeatCapacity(change.newRouteId, change.date);
    if (capacityInfo.remaining <= 0) {
      throw new ChangeServiceError(`目标线路 ${change.date} 座位已满（容量 ${capacityInfo.capacity}）`);
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.changeRequest.update({
      where: { id: changeId },
      data: {
        status,
        confirmedById: driver.id,
        confirmedByName: driver.name,
        confirmedAt: new Date(),
        rejectComment: status === 'REJECTED' ? remark ?? null : null,
      },
    });

    await writeAuditLog(
      status === 'CONFIRMED' ? 'CONFIRM_CHANGE' : 'REJECT_CHANGE',
      changeId,
      driver,
      {
        studentId: change.studentId,
        date: change.date,
        newRouteId: change.newRouteId,
        newStopId: change.newStopId,
        remark: remark ?? null,
      },
      tx,
    );

    return updated;
  });
}
