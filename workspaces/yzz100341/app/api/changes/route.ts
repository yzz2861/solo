import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole, AuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createChange, ChangeServiceError } from '@/lib/services/change-service';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireRole(user, ['PARENT', 'TEACHER', 'DRIVER', 'CONDUCTOR', 'ADMIN']);

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const status = searchParams.get('status');
    const studentId = searchParams.get('studentId');

    const where: Record<string, unknown> = {};

    if (date) where.date = date;
    if (status) where.status = status;
    if (studentId) where.studentId = studentId;

    if (user!.role === 'PARENT') {
      const parentLinks = await prisma.parentStudent.findMany({
        where: { parentId: user!.id },
        select: { studentId: true },
      });
      where.studentId = {
        in: parentLinks.map((pl) => pl.studentId),
      };
    } else if (user!.role === 'TEACHER' && user!.classId) {
      const students = await prisma.student.findMany({
        where: { classId: user!.classId },
        select: { id: true },
      });
      where.studentId = {
        in: students.map((s) => s.id),
      };
    } else if (user!.role === 'DRIVER' || user!.role === 'CONDUCTOR') {
      if (user!.routeId) {
        where.OR = [
          { originalRouteId: user!.routeId },
          { newRouteId: user!.routeId },
        ];
      }
    }

    const changes = await prisma.changeRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            studentNo: true,
            classId: true,
          },
        },
        originalRoute: { select: { id: true, name: true } },
        originalStop: { select: { id: true, name: true } },
        newRoute: { select: { id: true, name: true } },
        newStop: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(changes);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireRole(user, ['PARENT', 'TEACHER', 'ADMIN']);

    const body = await req.json();
    const { studentId, date, newRouteId, newStopId, reason } = body;

    if (!studentId || !date || !newRouteId || !newStopId) {
      return NextResponse.json(
        { error: '缺少必要参数: studentId, date, newRouteId, newStopId' },
        { status: 400 },
      );
    }

    const change = await createChange(user!, {
      studentId,
      date,
      newRouteId,
      newStopId,
      reason,
    });

    return NextResponse.json(change, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof ChangeServiceError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
