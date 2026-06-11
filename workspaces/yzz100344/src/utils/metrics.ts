import { groupBy, mean } from 'lodash-es';
import type { Complaint, KPISummary, RepeatComplaintGroup, Staff } from '@/types';
import { OVERDUE_THRESHOLD_HOURS } from './standardize';

export function calculateKPIs(complaints: Complaint[]): KPISummary {
  const validResponse = complaints.filter(c => c.responseHours !== null);
  const validClose = complaints.filter(c => c.closeHours !== null);
  
  const repeatOwners = new Set<string>();
  const ownerTypeGroups = groupBy(complaints, c => `${c.ownerId}_${c.problemType}`);
  let repeatCount = 0;
  for (const group of Object.values(ownerTypeGroups)) {
    if (group.length >= 2) {
      repeatCount += group.length;
      group.forEach(c => repeatOwners.add(c.ownerId));
    }
  }

  const closedComplaints = complaints.filter(c => c.status === '已关闭' || c.status === '已超期');
  const overdueCount = closedComplaints.filter(c => c.isOverdue).length;

  return {
    totalComplaints: complaints.length,
    avgResponseHours: validResponse.length > 0 
      ? Math.round(mean(validResponse.map(c => c.responseHours!)) * 10) / 10 
      : 0,
    avgCloseHours: validClose.length > 0 
      ? Math.round(mean(validClose.map(c => c.closeHours!)) * 10) / 10 
      : 0,
    repeatComplaintRate: complaints.length > 0 
      ? Math.round((repeatCount / complaints.length) * 1000) / 10 
      : 0,
    overdueRate: closedComplaints.length > 0 
      ? Math.round((overdueCount / closedComplaints.length) * 1000) / 10 
      : 0,
  };
}

export function findLongestRunning(complaints: Complaint[], limit = 10): Complaint[] {
  const withDuration = complaints.map(c => ({
    c,
    duration: c.closeHours ?? (c.receiveTime ? (Date.now() - c.receiveTime.getTime()) / 3600000 : 0),
  }));
  return withDuration
    .sort((a, b) => b.duration - a.duration)
    .slice(0, limit)
    .map(x => x.c);
}

export function findRepeatHotspots(complaints: Complaint[]): RepeatComplaintGroup[] {
  const groups: Record<string, Complaint[]> = {};
  
  for (const c of complaints) {
    const key = `${c.ownerId}_${c.problemType}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  }

  const result: RepeatComplaintGroup[] = [];
  for (const [, items] of Object.entries(groups)) {
    if (items.length >= 2) {
      const sorted = items.sort((a, b) => 
        (a.receiveTime?.getTime() || 0) - (b.receiveTime?.getTime() || 0)
      );
      result.push({
        ownerId: items[0].ownerId,
        ownerName: items[0].ownerName,
        roomNumber: items[0].roomNumber,
        problemType: items[0].problemType,
        count: items.length,
        firstTime: sorted[0].receiveTime || new Date(),
        lastTime: sorted[sorted.length - 1].receiveTime || new Date(),
        complaintIds: items.map(i => i.id),
      });
    }
  }

  return result.sort((a, b) => b.count - a.count);
}

export function calculateStaffPerformance(complaints: Complaint[]): Staff[] {
  const staffGroups = groupBy(complaints, c => c.staffId);
  const result: Staff[] = [];

  for (const [staffId, items] of Object.entries(staffGroups)) {
    const validResponse = items.filter(c => c.responseHours !== null);
    const validClose = items.filter(c => c.closeHours !== null);
    const closedItems = items.filter(c => c.status === '已关闭' || c.status === '已超期');
    const overdueCount = closedItems.filter(c => c.isOverdue).length;

    const avgResponse = validResponse.length > 0 ? mean(validResponse.map(c => c.responseHours!)) : 0;
    const avgClose = validClose.length > 0 ? mean(validClose.map(c => c.closeHours!)) : 0;
    const overdueRate = closedItems.length > 0 ? (overdueCount / closedItems.length) * 100 : 0;

    const performanceScore = Math.max(0, Math.min(100, 
      100 - (overdueRate * 0.5 + avgResponse / 2 * 0.3 + avgClose / OVERDUE_THRESHOLD_HOURS * 0.2) * 100
    ));

    result.push({
      id: staffId,
      name: items[0].staffName,
      totalCount: items.length,
      avgResponseHours: Math.round(avgResponse * 10) / 10,
      avgCloseHours: Math.round(avgClose * 10) / 10,
      overdueRate: Math.round(overdueRate * 10) / 10,
      performanceScore: Math.round(performanceScore),
    });
  }

  return result.sort((a, b) => b.performanceScore - a.performanceScore);
}

export function getProblemTypeDistribution(complaints: Complaint[]): Array<{ name: string; value: number }> {
  const grouped = groupBy(complaints, c => c.problemType);
  return Object.entries(grouped)
    .map(([name, items]) => ({ name, value: items.length }))
    .sort((a, b) => b.value - a.value);
}

export function getSourceDistribution(complaints: Complaint[]): Array<{ name: string; value: number }> {
  const grouped = groupBy(complaints, c => c.source);
  return Object.entries(grouped)
    .map(([name, items]) => ({ name, value: items.length }))
    .sort((a, b) => b.value - a.value);
}

export function getTypeSourceMatrix(complaints: Complaint[]): Array<{ type: string; source: string; count: number }> {
  const grouped = groupBy(complaints, c => `${c.problemType}_${c.source}`);
  return Object.entries(grouped).map(([key, items]) => {
    const [type, source] = key.split('_');
    return { type, source, count: items.length };
  });
}
