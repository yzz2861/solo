import type {
  FeedingSession,
  Species,
  Feed,
  FeedStock,
  FastingPeriod,
  WaterQualityNote,
  ConflictAlert,
} from '@/types';
import { uid, dateInRange, timesOverlap, toMinutes } from '@/utils';

const BACKEND_CARE_START = '12:00';
const BACKEND_CARE_END = '14:00';

export interface ConflictContext {
  species: Species[];
  feeds: Feed[];
  feedStocks: FeedStock[];
  fastingPeriods: FastingPeriod[];
  waterQualityNotes: WaterQualityNote[];
  allSessions: FeedingSession[];
}

export function detectConflicts(
  session: FeedingSession,
  ctx: ConflictContext,
  excludeId?: string,
): ConflictAlert[] {
  const alerts: ConflictAlert[] = [];

  const sameDaySessions = ctx.allSessions.filter(
    (s) => s.date === session.date && s.id !== excludeId && s.status !== 'cancelled',
  );

  for (const fp of ctx.fastingPeriods) {
    if (
      fp.speciesId === session.speciesId &&
      dateInRange(session.date, fp.startDate, fp.endDate)
    ) {
      alerts.push({
        id: uid(),
        sessionId: session.id || null,
        type: 'fasting',
        severity: 'error',
        message: `该物种正在禁食期（${fp.startDate} 至 ${fp.endDate}）：${fp.reason || '未说明原因'}`,
      });
    }
  }

  const stock = ctx.feedStocks.find((s) => s.feedId === session.feedId);
  const feed = ctx.feeds.find((f) => f.id === session.feedId);
  const unit = feed?.unit || 'g';
  if (stock && stock.currentStock < session.feedAmountGrams) {
    alerts.push({
      id: uid(),
      sessionId: session.id || null,
      type: 'low_stock',
      severity: 'warning',
      message: `饲料库存不足：当前 ${stock.currentStock}${unit}，本场需 ${session.feedAmountGrams}${unit}`,
    });
  }

  for (const other of sameDaySessions) {
    if (
      other.keeperId === session.keeperId &&
      timesOverlap(session.startTime, session.endTime, other.startTime, other.endTime) &&
      other.exhibitId !== session.exhibitId
    ) {
      alerts.push({
        id: uid(),
        sessionId: session.id || null,
        type: 'keeper_conflict',
        severity: 'error',
        message: `饲养员跨展区冲突：同时段在 ${other.exhibitId} 另有安排`,
      });
    }
  }

  if (session.guideId) {
    for (const other of sameDaySessions) {
      if (
        other.guideId === session.guideId &&
        timesOverlap(session.startTime, session.endTime, other.startTime, other.endTime)
      ) {
        alerts.push({
          id: uid(),
          sessionId: session.id || null,
          type: 'guide_conflict',
          severity: 'warning',
          message: `讲解员时段冲突：同时段另有讲解安排`,
        });
      }
    }
  }

  for (const wqn of ctx.waterQualityNotes) {
    if (
      wqn.exhibitId === session.exhibitId &&
      wqn.date === session.date &&
      timesOverlap(session.startTime, session.endTime, wqn.startTime, wqn.endTime)
    ) {
      alerts.push({
        id: uid(),
        sessionId: session.id || null,
        type: 'time_overlap',
        severity: 'error',
        message: `与展区水质处理时段重叠（${wqn.startTime}–${wqn.endTime}）：${wqn.notes || '后台处理中'}`,
      });
    }
  }

  if (
    session.isVisitorVisible &&
    timesOverlap(session.startTime, session.endTime, BACKEND_CARE_START, BACKEND_CARE_END)
  ) {
    alerts.push({
      id: uid(),
      sessionId: session.id || null,
      type: 'visitor_overlap',
      severity: 'warning',
      message: `游客可见场次与后台护理时段（${BACKEND_CARE_START}–${BACKEND_CARE_END}）重叠，可能挤占护理时间`,
    });
  }

  return alerts;
}

export function scanAllConflicts(ctx: ConflictContext): ConflictAlert[] {
  const list: ConflictAlert[] = [];
  for (const s of ctx.allSessions.filter((x) => x.status !== 'cancelled')) {
    list.push(...detectConflicts(s, ctx, s.id));
  }
  return list;
}
