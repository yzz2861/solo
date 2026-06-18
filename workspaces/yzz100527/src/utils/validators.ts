import type { Student, AlertItem } from '@/types';

const HEALTH_RISK_KEYWORDS = [
  '不能剧烈运动',
  '心脏病',
  '哮喘',
  '癫痫',
  '过敏史',
  '高血压',
  '糖尿病',
  '心脏',
  '严重过敏',
  '不宜运动',
  '避免剧烈',
  '禁忌',
];

export function isIdExpired(expiryDate: string): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return expiry.getTime() < now.getTime();
}

export function isIdExpiringSoon(expiryDate: string, days: number = 30): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= days;
}

export function hasHealthRisk(healthNote: string, allergyNote: string): boolean {
  const text = `${healthNote} ${allergyNote}`.toLowerCase();
  return HEALTH_RISK_KEYWORDS.some((keyword) =>
    text.includes(keyword.toLowerCase())
  );
}

export function isMaterialComplete(student: Student): boolean {
  return (
    !!student.idNumber &&
    !!student.idExpiryDate &&
    student.guardianSigned &&
    student.insuranceProvided
  );
}

export function hasPendingItems(student: Student, allStudents: Student[]): boolean {
  if (isIdExpired(student.idExpiryDate)) return true;
  if (isIdExpiringSoon(student.idExpiryDate)) return true;
  if (hasHealthRisk(student.healthNote, student.allergyNote)) return true;
  if (hasDuplicate(student, allStudents)) return true;
  return false;
}

export function hasDuplicate(student: Student, allStudents: Student[]): boolean {
  if (!student.idNumber) return false;
  return allStudents.some(
    (s) =>
      s.id !== student.id &&
      s.name === student.name &&
      s.className === student.className &&
      s.idNumber === student.idNumber
  );
}

export function computeStudentStatus(
  student: Student,
  allStudents: Student[]
): 'incomplete' | 'pending' | 'completed' {
  if (!isMaterialComplete(student)) {
    return 'incomplete';
  }
  if (hasPendingItems(student, allStudents)) {
    return 'pending';
  }
  return 'completed';
}

export function generateAlerts(student: Student, allStudents: Student[]): AlertItem[] {
  const alerts: AlertItem[] = [];

  if (!student.guardianSigned) {
    alerts.push({
      type: 'no-signature',
      studentId: student.id,
      message: '监护人签名缺失',
    });
  }

  if (student.idExpiryDate && isIdExpired(student.idExpiryDate)) {
    alerts.push({
      type: 'expired',
      studentId: student.id,
      message: '证件已过期',
    });
  } else if (student.idExpiryDate && isIdExpiringSoon(student.idExpiryDate)) {
    alerts.push({
      type: 'expired',
      studentId: student.id,
      message: '证件即将过期（30天内）',
    });
  }

  if (hasHealthRisk(student.healthNote, student.allergyNote)) {
    alerts.push({
      type: 'health-risk',
      studentId: student.id,
      message: '健康备注有风险提示，需重点关注',
    });
  }

  if (hasDuplicate(student, allStudents)) {
    alerts.push({
      type: 'duplicate',
      studentId: student.id,
      message: '同一学生重复报名',
    });
  }

  return alerts;
}

export function getMissingMaterials(student: Student): string[] {
  const missing: string[] = [];
  if (!student.idNumber) missing.push('证件号码');
  if (!student.idExpiryDate) missing.push('证件有效期');
  if (!student.guardianSigned) missing.push('监护人授权');
  if (!student.insuranceProvided) missing.push('保险信息');
  return missing;
}
