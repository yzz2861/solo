import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole, AuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireRole(user, ['PARENT', 'TEACHER', 'DRIVER', 'CONDUCTOR', 'ADMIN']);

    let where: Record<string, unknown> = {};

    if (user!.role === 'PARENT') {
      const links = await prisma.parentStudent.findMany({
        where: { parentId: user!.id },
        select: { studentId: true },
      });
      where = { id: { in: links.map((l) => l.studentId) } };
    } else if (user!.role === 'TEACHER') {
      if (user!.classId) {
        where = { classId: user!.classId };
      } else {
        return NextResponse.json([]);
      }
    } else if (user!.role === 'ADMIN') {
      where = {};
    } else {
      return NextResponse.json([]);
    }

    const students = await prisma.student.findMany({
      where,
      orderBy: { studentNo: 'asc' },
      include: {
        class: { select: { id: true, name: true } },
        defaultRoute: { select: { id: true, name: true } },
        defaultStop: { select: { id: true, name: true } },
        parentLinks: {
          include: {
            parent: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return NextResponse.json(students);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
