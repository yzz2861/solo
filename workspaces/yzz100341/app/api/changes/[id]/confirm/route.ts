import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole, AuthError } from '@/lib/auth';
import { confirmChange, ChangeServiceError } from '@/lib/services/change-service';

type ConfirmStatus = 'CONFIRMED' | 'REJECTED';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    requireRole(user, ['DRIVER', 'CONDUCTOR', 'ADMIN']);

    const body = await req.json();
    const { status, remark } = body;

    if (status !== 'CONFIRMED' && status !== 'REJECTED') {
      return NextResponse.json(
        { error: 'status 必须为 CONFIRMED 或 REJECTED' },
        { status: 400 },
      );
    }

    const updated = await confirmChange(
      user!,
      params.id,
      status as ConfirmStatus,
      remark,
    );

    return NextResponse.json(updated);
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
