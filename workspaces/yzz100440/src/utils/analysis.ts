import type { 
  TimeSlot, 
  MedicationStatus, 
  Prescription, 
  PillboxRecord, 
  NurseRecord, 
  MedicationAnalysis,
  Medication
} from '../../shared/types';

export const TIME_SLOT_CONFIG: Record<TimeSlot, { name: string; start: number; end: number; crossNight?: boolean }> = {
  breakfast: { name: '早餐', start: 6, end: 9 },
  lunch: { name: '午餐', start: 11, end: 13.5 },
  dinner: { name: '晚餐', start: 17, end: 19.5 },
  bedtime: { name: '睡前', start: 21, end: 26, crossNight: true },
};

export const STATUS_CONFIG: Record<MedicationStatus, { label: string; color: string; bgColor: string }> = {
  taken: { label: '正常', color: '#00B42A', bgColor: 'bg-green-50' },
  missed: { label: '漏服', color: '#F53F3F', bgColor: 'bg-red-50' },
  late: { label: '迟服', color: '#FF7D00', bgColor: 'bg-orange-50' },
  duplicate: { label: '重复服', color: '#F53F3F', bgColor: 'bg-red-50' },
  supplemented: { label: '人工补录', color: '#722ED1', bgColor: 'bg-purple-50' },
  discontinued: { label: '已停药', color: '#86909C', bgColor: 'bg-gray-50' },
  offline: { label: '设备离线', color: '#FF7D00', bgColor: 'bg-orange-50' },
  conflict: { label: '记录冲突', color: '#F53F3F', bgColor: 'bg-red-50' },
};

export function getTimeSlot(time: string): TimeSlot | null {
  const [hours, minutes] = time.split(':').map(Number);
  const totalHours = hours + minutes / 60;
  
  for (const [slot, config] of Object.entries(TIME_SLOT_CONFIG)) {
    if (config.crossNight) {
      if (totalHours >= config.start || totalHours < (config.end - 24)) {
        return slot as TimeSlot;
      }
    } else {
      if (totalHours >= config.start && totalHours < config.end) {
        return slot as TimeSlot;
      }
    }
  }
  return null;
}

export function isInTimeSlot(time: string, slot: TimeSlot): boolean {
  const [hours, minutes] = time.split(':').map(Number);
  const totalHours = hours + minutes / 60;
  const config = TIME_SLOT_CONFIG[slot];
  
  if (config.crossNight) {
    return totalHours >= config.start || totalHours < (config.end - 24);
  }
  return totalHours >= config.start && totalHours < config.end;
}

export function calculateAdherenceRate(records: MedicationAnalysis[]): number {
  const validRecords = records.filter(r => 
    r.status !== 'discontinued' && r.status !== 'offline'
  );
  if (validRecords.length === 0) return 100;
  const normal = validRecords.filter(r => 
    r.status === 'taken' || r.status === 'supplemented'
  );
  return Math.round((normal.length / validRecords.length) * 100);
}

export function getRiskLevel(missedCount: number, lateCount: number, totalDoses: number): 'high' | 'medium' | 'low' {
  if (totalDoses === 0) return 'low';
  const abnormalRate = (missedCount + lateCount) / totalDoses;
  if (abnormalRate > 0.15 || missedCount > 3) return 'high';
  if (abnormalRate > 0.05 || missedCount > 0) return 'medium';
  return 'low';
}

export function isDeviceOffline(records: PillboxRecord[], date: string, slot: TimeSlot): boolean {
  const slotConfig = TIME_SLOT_CONFIG[slot];
  const dayRecords = records.filter(r => r.timestamp.startsWith(date));
  
  if (dayRecords.length === 0) {
    return true;
  }
  
  const fourHoursAgo = new Date(`${date} ${slotConfig.start}:00`);
  fourHoursAgo.setHours(fourHoursAgo.getHours() - 4);
  
  const recentRecords = dayRecords.filter(r => new Date(r.timestamp) > fourHoursAgo);
  return recentRecords.length === 0;
}

interface AnalyzeMedicationParams {
  elderlyId: string;
  medicationId: string;
  medicationName: string;
  date: string;
  timeSlot: TimeSlot;
  plannedTime: string;
  prescription: Prescription;
  pillboxRecords: PillboxRecord[];
  nurseRecords: NurseRecord[];
}

export function analyzeMedicationDose(params: AnalyzeMedicationParams): MedicationAnalysis {
  const {
    elderlyId,
    medicationId,
    medicationName,
    date,
    timeSlot,
    plannedTime,
    prescription,
    pillboxRecords,
    nurseRecords,
  } = params;

  const id = `${elderlyId}-${medicationId}-${date}-${timeSlot}`;

  if (prescription.status === 'discontinued') {
    return {
      id,
      elderlyId,
      medicationId,
      date,
      timeSlot,
      status: 'discontinued',
      plannedTime,
      explanation: `医嘱变更：停止服用（${prescription.changeReason || '医生调整用药'}）`,
      isInternalNote: false,
      prescription,
      medicationName,
    };
  }

  const slotPillboxRecords = pillboxRecords.filter(r => {
    const recordDate = r.timestamp.split(' ')[0];
    const recordTime = r.timestamp.split(' ')[1]?.substring(0, 5) || '';
    return recordDate === date && isInTimeSlot(recordTime, timeSlot) && r.isSuccess;
  });

  const slotNurseRecords = nurseRecords.filter(r => {
    const recordDate = r.timestamp.split(' ')[0];
    const recordTime = r.timestamp.split(' ')[1]?.substring(0, 5) || '';
    return recordDate === date && isInTimeSlot(recordTime, timeSlot);
  });

  const hasPillbox = slotPillboxRecords.length > 0;
  const hasNurse = slotNurseRecords.length > 0;

  if (!hasPillbox && !hasNurse) {
    const offline = isDeviceOffline(pillboxRecords, date, timeSlot);
    if (offline) {
      return {
        id,
        elderlyId,
        medicationId,
        date,
        timeSlot,
        status: 'offline',
        plannedTime,
        explanation: '设备离线，数据可能缺失，请联系管理员检查设备',
        isInternalNote: true,
        medicationName,
      };
    }
    return {
      id,
      elderlyId,
      medicationId,
      date,
      timeSlot,
      status: 'missed',
      plannedTime,
      explanation: '时段内无药盒打卡记录，也无护理员补服记录',
      isInternalNote: false,
      medicationName,
    };
  }

  if (hasPillbox && slotPillboxRecords.length > 1) {
    const earliestRecord = slotPillboxRecords.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )[0];
    return {
      id,
      elderlyId,
      medicationId,
      date,
      timeSlot,
      status: 'duplicate',
      plannedTime,
      actualTime: earliestRecord.timestamp.split(' ')[1]?.substring(0, 5),
      explanation: `重复打卡${slotPillboxRecords.length}次，疑似设备故障，请核实`,
      pillboxRecord: earliestRecord,
      isInternalNote: true,
      medicationName,
    };
  }

  if (hasPillbox && hasNurse) {
    const pillboxRecord = slotPillboxRecords[0];
    const nurseRecord = slotNurseRecords[0];
    
    const pillboxTaken = pillboxRecord.isSuccess;
    const nurseIndicatesMissed = nurseRecord.type === 'missed';
    
    if (pillboxTaken && nurseIndicatesMissed) {
      return {
        id,
        elderlyId,
        medicationId,
        date,
        timeSlot,
        status: 'conflict',
        plannedTime,
        actualTime: pillboxRecord.timestamp.split(' ')[1]?.substring(0, 5),
        explanation: '记录冲突：药盒显示已服，护理备注漏服，请人工核实',
        pillboxRecord,
        nurseRecord,
        isInternalNote: true,
        medicationName,
      };
    }
  }

  if (!hasPillbox && hasNurse) {
    const nurseRecord = slotNurseRecords[0];
    if (nurseRecord.type === 'supplement') {
      return {
        id,
        elderlyId,
        medicationId,
        date,
        timeSlot,
        status: 'supplemented',
        plannedTime,
        actualTime: nurseRecord.timestamp.split(' ')[1]?.substring(0, 5),
        explanation: `护理员${nurseRecord.nurseName}于${nurseRecord.timestamp.split(' ')[1]?.substring(0, 5)}人工补服`,
        nurseRecord,
        isInternalNote: true,
        medicationName,
      };
    }
    if (nurseRecord.type === 'missed') {
      return {
        id,
        elderlyId,
        medicationId,
        date,
        timeSlot,
        status: 'missed',
        plannedTime,
        explanation: `护理员${nurseRecord.nurseName}确认漏服：${nurseRecord.note}`,
        nurseRecord,
        isInternalNote: true,
        medicationName,
      };
    }
  }

  if (hasPillbox) {
    const pillboxRecord = slotPillboxRecords[0];
    const actualTime = pillboxRecord.timestamp.split(' ')[1]?.substring(0, 5) || '';
    const [plannedH, plannedM] = plannedTime.split(':').map(Number);
    const [actualH, actualM] = actualTime.split(':').map(Number);
    const delayMinutes = (actualH * 60 + actualM) - (plannedH * 60 + plannedM);
    
    const slotConfig = TIME_SLOT_CONFIG[timeSlot];
    const slotEndMinutes = slotConfig.end * 60;
    const plannedMinutes = plannedH * 60 + plannedM;
    
    if (delayMinutes > 30 || (actualH * 60 + actualM) > slotEndMinutes) {
      const actualDelay = Math.max(delayMinutes, (actualH * 60 + actualM) - plannedMinutes);
      return {
        id,
        elderlyId,
        medicationId,
        date,
        timeSlot,
        status: 'late',
        plannedTime,
        actualTime,
        delayMinutes: actualDelay,
        explanation: `延迟${actualDelay}分钟服用（计划${plannedTime}，实际${actualTime}）`,
        pillboxRecord,
        isInternalNote: false,
        medicationName,
      };
    }

    return {
      id,
      elderlyId,
      medicationId,
      date,
      timeSlot,
      status: 'taken',
      plannedTime,
      actualTime,
      explanation: `正常服药（${actualTime}）`,
      pillboxRecord,
      isInternalNote: false,
      medicationName,
    };
  }

  return {
    id,
    elderlyId,
    medicationId,
    date,
    timeSlot,
    status: 'missed',
    plannedTime,
    explanation: '无有效服药记录',
    isInternalNote: false,
    medicationName,
  };
}

export function sanitizeForFamily(record: MedicationAnalysis): MedicationAnalysis {
  const sanitized = { ...record };
  
  if (sanitized.nurseRecord) {
    sanitized.nurseRecord = {
      ...sanitized.nurseRecord,
      nurseName: '护理员',
      note: sanitized.nurseRecord.publicNote || '已记录',
    };
  }
  
  if (sanitized.isInternalNote) {
    if (sanitized.status === 'supplemented') {
      sanitized.explanation = '护理员协助服药';
    } else if (sanitized.status === 'conflict') {
      sanitized.explanation = '记录待核实';
      sanitized.status = 'missed';
    } else if (sanitized.status === 'offline') {
      sanitized.explanation = '设备维护中';
      sanitized.status = 'missed';
    } else if (sanitized.status === 'duplicate') {
      sanitized.explanation = '服药记录异常';
    }
  }
  
  if (sanitized.medicationName) {
    sanitized.medicationName = sanitized.medicationName.replace(/./g, (char, i) => 
      i === 0 ? char : '*'
    );
  }
  
  return sanitized;
}

export function getShiftForTimeSlot(slot: TimeSlot): 'morning' | 'afternoon' | 'night' {
  switch (slot) {
    case 'breakfast':
    case 'lunch':
      return 'morning';
    case 'dinner':
      return 'afternoon';
    case 'bedtime':
      return 'night';
  }
}
