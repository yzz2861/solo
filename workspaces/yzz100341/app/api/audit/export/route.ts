import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole, AuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatDateTime, STATUS_LABEL, todayStr } from '@/lib/utils';

const ACTION_LABEL: Record<string, string> = {
  CREATE_CHANGE: '创建变更',
  CONFIRM_CHANGE: '确认变更',
  REJECT_CHANGE: '驳回变更',
  CANCEL_CHANGE: '撤回变更',
  MERGE_CHANGE: '合并变更',
};

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireRole(user, ['ADMIN']);

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const route = searchParams.get('route');
    const status = searchParams.get('status');

    const whereAudit: Record<string, unknown> = {};
    const whereChange: Record<string, unknown> = {};

    if (from || to) {
      const createdAtFilter: Record<string, string> = {};
      if (from) createdAtFilter.gte = new Date(from).toISOString();
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        createdAtFilter.lte = toDate.toISOString();
      }
      whereAudit.createdAt = createdAtFilter;
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: whereAudit,
      orderBy: { createdAt: 'desc' },
      include: {
        change: {
          include: {
            student: { select: { name: true } },
            originalRoute: { select: { name: true } },
            originalStop: { select: { name: true } },
            newRoute: { select: { name: true } },
            newStop: { select: { name: true } },
          },
        },
      },
    });

    let filteredLogs = auditLogs;

    if (route) {
      filteredLogs = filteredLogs.filter((log) => {
        if (!log.change) return false;
        return (
          log.change.originalRouteId === route ||
          log.change.newRouteId === route
        );
      });
    }

    if (status) {
      filteredLogs = filteredLogs.filter((log) => {
        if (!log.change) return false;
        return log.change.status === status;
      });
    }

    if (status && auditLogs.length > 0 && filteredLogs.length === 0) {
      const changeRecords = await prisma.changeRequest.findMany({
        where: {
          ...whereChange,
          ...(status ? { status } : {}),
          ...(route
            ? {
                OR: [{ originalRouteId: route }, { newRouteId: route }],
              }
            : {}),
          ...(from || to
            ? {
                date: {
                  ...(from ? { gte: from } : {}),
                  ...(to ? { lte: to } : {}),
                },
              }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { name: true } },
          originalRoute: { select: { name: true } },
          originalStop: { select: { name: true } },
          newRoute: { select: { name: true } },
          newStop: { select: { name: true } },
        },
      });

      const headers = [
        '时间',
        '操作',
        '学生姓名',
        '原线路',
        '原站点',
        '新线路',
        '新站点',
        '发起人',
        '确认人',
        '状态',
        '详情',
      ];

      const rows = changeRecords.map((c) => [
        formatDateTime(c.createdAt),
        '变更记录',
        c.student?.name || '',
        c.originalRoute?.name || '',
        c.originalStop?.name || '',
        c.newRoute?.name || '',
        c.newStop?.name || '',
        c.initiatorName || '',
        c.confirmedByName || '',
        STATUS_LABEL[c.status] || c.status,
        c.reason || '',
      ]);

      const csv = [headers, ...rows]
        .map((row) => row.map(escapeCsv).join(','))
        .join('\n');

      const filename = `audit-export-${todayStr()}.csv`;
      return new NextResponse('\ufeff' + csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    const headers = [
      '时间',
      '操作',
      '学生姓名',
      '原线路',
      '原站点',
      '新线路',
      '新站点',
      '发起人',
      '确认人',
      '状态',
      '详情',
    ];

    const rows = filteredLogs.map((log) => {
      const change = log.change;
      const detailObj = (() => {
        try {
          return JSON.parse(log.detail);
        } catch {
          return {};
        }
      })();

      return [
        formatDateTime(log.createdAt),
        ACTION_LABEL[log.action] || log.action,
        change?.student?.name || '',
        change?.originalRoute?.name || '',
        change?.originalStop?.name || '',
        change?.newRoute?.name || '',
        change?.newStop?.name || '',
        change?.initiatorName || log.operatorName,
        change?.confirmedByName || '',
        change ? STATUS_LABEL[change.status] || change.status : '',
        typeof detailObj === 'string' ? detailObj : JSON.stringify(detailObj),
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\n');

    const filename = `audit-export-${todayStr()}.csv`;

    return new NextResponse('\ufeff' + csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error('Export error:', e);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
