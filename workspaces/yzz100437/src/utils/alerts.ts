import { Alert, AlertType, LeaveRecord, Member, VoicePart } from '../types';
import { getVoicePartName } from './voiceParts';
import { getNextPerformanceDate, isWithinDays } from './date';

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const checkDuplicateLeaves = (
  memberId: string,
  memberName: string,
  records: LeaveRecord[]
): Alert | null => {
  const count = records.filter(
    r => r.memberId === memberId && isWithinDays(r.rehearsalDate, 30)
  ).length;
  
  if (count > 3) {
    return {
      id: generateId(),
      type: 'duplicate',
      message: `${memberName} 30天内已请假${count}次，请关注其出勤情况`,
      memberId,
      createdAt: new Date().toISOString(),
      read: false,
    };
  }
  return null;
};

export const checkConsecutiveAbsence = (
  memberId: string,
  memberName: string,
  records: LeaveRecord[],
  newRehearsalDate?: string
): Alert | null => {
  const nextPerformance = getNextPerformanceDate();
  const memberRecords = records
    .filter(r => r.memberId === memberId)
    .sort((a, b) => new Date(b.rehearsalDate).getTime() - new Date(a.rehearsalDate).getTime());
  
  let consecutive = 0;
  for (const record of memberRecords) {
    if (new Date(record.rehearsalDate) < nextPerformance) {
      consecutive++;
    } else {
      break;
    }
  }
  
  if (newRehearsalDate && new Date(newRehearsalDate) < nextPerformance) {
    consecutive++;
  }
  
  if (consecutive >= 2) {
    return {
      id: generateId(),
      type: 'consecutive',
      message: `${memberName} 演出前已连续缺席${consecutive}次，需要及时补练`,
      memberId,
      createdAt: new Date().toISOString(),
      read: false,
    };
  }
  return null;
};

export const checkVoicePartShortage = (
  voicePart: VoicePart,
  date: string,
  members: Member[],
  records: LeaveRecord[],
  newLeaveMemberId?: string
): Alert | null => {
  const totalInPart = members.filter(
    m => m.voicePart === voicePart && m.status === 'active'
  ).length;
  
  const existingLeaves = records.filter(
    r => r.rehearsalDate === date && 
         members.find(m => m.id === r.memberId)?.voicePart === voicePart
  ).length;
  
  const additionalLeave = newLeaveMemberId && 
    members.find(m => m.id === newLeaveMemberId)?.voicePart === voicePart ? 1 : 0;
  
  const totalLeaves = existingLeaves + additionalLeave;
  const attendanceRate = (totalInPart - totalLeaves) / totalInPart;
  
  if (totalInPart > 0 && attendanceRate < 0.6) {
    return {
      id: generateId(),
      type: 'shortage',
      message: `${getVoicePartName(voicePart)} 出席率仅${Math.round(attendanceRate * 100)}%，需要重点关注`,
      voicePart,
      rehearsalDate: date,
      createdAt: new Date().toISOString(),
      read: false,
    };
  }
  return null;
};

export const checkOnlinePractice = (
  notes: string,
  memberId: string,
  memberName: string
): Alert | null => {
  const keywords = ['线上', '远程', '不能到场', '线上练习', '在家', '网络'];
  if (keywords.some(k => notes.includes(k))) {
    return {
      id: generateId(),
      type: 'online',
      message: `${memberName} 备注需要线上练习，请提供线上支持`,
      memberId,
      createdAt: new Date().toISOString(),
      read: false,
    };
  }
  return null;
};

export const generateAlertsForNewLeave = (
  leave: Omit<LeaveRecord, 'id' | 'createdAt'>,
  members: Member[],
  records: LeaveRecord[]
): Alert[] => {
  const alerts: Alert[] = [];
  const member = members.find(m => m.id === leave.memberId);
  if (!member) return alerts;
  
  const duplicateAlert = checkDuplicateLeaves(member.id, member.name, records);
  if (duplicateAlert) alerts.push(duplicateAlert);
  
  const consecutiveAlert = checkConsecutiveAbsence(member.id, member.name, records, leave.rehearsalDate);
  if (consecutiveAlert) alerts.push(consecutiveAlert);
  
  const shortageAlert = checkVoicePartShortage(member.voicePart, leave.rehearsalDate, members, records, leave.memberId);
  if (shortageAlert) alerts.push(shortageAlert);
  
  const onlineAlert = checkOnlinePractice(leave.notes, member.id, member.name);
  if (onlineAlert) alerts.push(onlineAlert);
  
  return alerts;
};

export const generateAllAlerts = (
  members: Member[],
  records: LeaveRecord[]
): Alert[] => {
  const alerts: Alert[] = [];
  const activeMembers = members.filter(m => m.status === 'active');
  
  for (const member of activeMembers) {
    const duplicateAlert = checkDuplicateLeaves(member.id, member.name, records);
    if (duplicateAlert) alerts.push(duplicateAlert);
    
    const consecutiveAlert = checkConsecutiveAbsence(member.id, member.name, records);
    if (consecutiveAlert) alerts.push(consecutiveAlert);
  }
  
  const dateGroups = new Map<string, LeaveRecord[]>();
  for (const record of records) {
    const existing = dateGroups.get(record.rehearsalDate) || [];
    dateGroups.set(record.rehearsalDate, [...existing, record]);
  }
  
  const voiceParts: VoicePart[] = ['soprano', 'alto', 'tenor', 'bass'];
  for (const [date, dayRecords] of dateGroups) {
    for (const part of voiceParts) {
      const shortageAlert = checkVoicePartShortage(part, date, members, records);
      if (shortageAlert) alerts.push(shortageAlert);
    }
  }
  
  for (const record of records) {
    const member = members.find(m => m.id === record.memberId);
    if (member) {
      const onlineAlert = checkOnlinePractice(record.notes, member.id, member.name);
      if (onlineAlert) alerts.push(onlineAlert);
    }
  }
  
  return alerts;
};

export const getAlertIcon = (type: AlertType): string => {
  const icons: Record<AlertType, string> = {
    duplicate: 'repeat',
    consecutive: 'alert-triangle',
    shortage: 'users',
    online: 'wifi',
  };
  return icons[type];
};

export const getAlertColorClass = (type: AlertType): string => {
  const classes: Record<AlertType, string> = {
    duplicate: 'alert-duplicate',
    consecutive: 'alert-consecutive',
    shortage: 'alert-shortage',
    online: 'alert-online',
  };
  return classes[type];
};

export const getAlertTypeName = (type: AlertType): string => {
  const names: Record<AlertType, string> = {
    duplicate: '重复请假',
    consecutive: '连续缺席',
    shortage: '声部不足',
    online: '线上练习',
  };
  return names[type];
};
