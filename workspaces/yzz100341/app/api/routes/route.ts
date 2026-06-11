import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole, AuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireRole(user, ['PARENT', 'TEACHER', 'DRIVER', 'CONDUCTOR', 'ADMIN']);

    const routes = await prisma.busRoute.findMany({
      orderBy: { name: 'asc' },
      include: {
        stops: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    return NextResponse.json(routes);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
