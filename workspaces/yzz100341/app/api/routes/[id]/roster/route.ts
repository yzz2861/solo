import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole, AuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    requireRole(user, ['DRIVER', 'CONDUCTOR', 'ADMIN', 'TEACHER', 'PARENT']);

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    if (!date) {
      return NextResponse.json(
        { error: '缺少 date 参数，格式: YYYY-MM-DD' },
        { status: 400 },
      );
    }

    const route = await prisma.busRoute.findUnique({
      where: { id: params.id },
    });
    if (!route) {
      return NextResponse.json({ error: '线路不存在' }, { status: 404 });
    }

    const defaultStudents = await prisma.student.findMany({
      where: { defaultRouteId: params.id },
      include: {
        class: { select: { id: true, name: true } },
        defaultRoute: true,
        defaultStop: true,
      },
    });

    const allChanges = await prisma.changeRequest.findMany({
      where: {
        date,
        OR: [
          { originalRouteId: params.id },
          { newRouteId: params.id },
        ],
      },
      include: {
        originalRoute: true,
        originalStop: true,
        newRoute: true,
        newStop: true,
      },
    });

    const confirmedOutIds = new Set(
      allChanges
        .filter((c) => c.originalRouteId === params.id && c.status === 'CONFIRMED')
        .map((c) => c.studentId),
    );

    const confirmedInChanges = allChanges.filter(
      (c) => c.newRouteId === params.id && c.status === 'CONFIRMED',
    );
    const confirmedInIds = new Set(confirmedInChanges.map((c) => c.studentId));

    const pendingChanges = allChanges.filter((c) => c.status === 'PENDING');
    const pendingOutMap = new Map(
      pendingChanges
        .filter((c) => c.originalRouteId === params.id)
        .map((c) => [c.studentId, c]),
    );
    const pendingInMap = new Map(
      pendingChanges
        .filter((c) => c.newRouteId === params.id)
        .map((c) => [c.studentId, c]),
    );

    const confirmedInMap = new Map(
      confirmedInChanges.map((c) => [c.studentId, c]),
    );
    const confirmedOutMap = new Map(
      allChanges
        .filter((c) => c.originalRouteId === params.id && c.status === 'CONFIRMED')
        .map((c) => [c.studentId, c]),
    );

    const roster = [];

    for (const student of defaultStudents) {
      if (confirmedOutIds.has(student.id)) {
        continue;
      }

      let actualRouteId = student.defaultRouteId;
      let actualStopId = student.defaultStopId;
      let changeStatus: string = 'NONE';
      let changeDetail = null;

      if (confirmedInIds.has(student.id)) {
        const change = confirmedInMap.get(student.id)!;
        actualRouteId = change.newRouteId;
        actualStopId = change.newStopId;
        changeStatus = 'CONFIRMED_IN';
        changeDetail = change;
      } else if (pendingInMap.has(student.id)) {
        changeStatus = 'PENDING_IN';
        changeDetail = pendingInMap.get(student.id);
      } else if (pendingOutMap.has(student.id)) {
        changeStatus = 'PENDING_OUT';
        changeDetail = pendingOutMap.get(student.id);
      }

      const boardingRecord = await prisma.boardingRecord.findUnique({
        where: { studentId_date: { studentId: student.id, date } },
      });

      roster.push({
        id: student.id,
        name: student.name,
        studentNo: student.studentNo,
        class: student.class,
        defaultRouteId: student.defaultRouteId,
        defaultStopId: student.defaultStopId,
        defaultRoute: student.defaultRoute,
        defaultStop: student.defaultStop,
        actualRouteId,
        actualStopId,
        actualStop: changeDetail && (changeStatus === 'CONFIRMED_IN' || changeStatus === 'PENDING_IN')
          ? changeDetail.newStop
          : student.defaultStop,
        changeStatus,
        changeDetail,
        boardedAt: boardingRecord?.boardedAt ?? null,
      });
    }

    const transferredInStudentIds = confirmedInIds;
    const transferredInStudents = await prisma.student.findMany({
      where: {
        id: { in: Array.from(transferredInStudentIds) },
        defaultRouteId: { not: params.id },
      },
      include: {
        class: { select: { id: true, name: true } },
        defaultRoute: true,
        defaultStop: true,
      },
    });

    for (const student of transferredInStudents) {
      const change = confirmedInMap.get(student.id)!;
      const boardingRecord = await prisma.boardingRecord.findUnique({
        where: { studentId_date: { studentId: student.id, date } },
      });

      roster.push({
        id: student.id,
        name: student.name,
        studentNo: student.studentNo,
        class: student.class,
        defaultRouteId: student.defaultRouteId,
        defaultStopId: student.defaultStopId,
        defaultRoute: student.defaultRoute,
        defaultStop: student.defaultStop,
        actualRouteId: change.newRouteId,
        actualStopId: change.newStopId,
        actualStop: change.newStop,
        changeStatus: 'CONFIRMED_IN',
        changeDetail: change,
        boardedAt: boardingRecord?.boardedAt ?? null,
      });
    }

    roster.sort((a, b) => a.studentNo.localeCompare(b.studentNo));

    return NextResponse.json({
      route,
      date,
      totalCount: roster.length,
      roster,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
