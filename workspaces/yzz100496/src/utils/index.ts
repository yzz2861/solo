import dayjs from 'dayjs';
import { CANCELLATION_TIERS, type Registration, type FamilyMember, type Trip } from '@/types';

export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function formatDate(date: string | Date | undefined, format: string = 'YYYY-MM-DD'): string {
  if (!date) return '-';
  return dayjs(date).format(format);
}

export function formatDateTime(date: string | Date | undefined): string {
  if (!date) return '-';
  return dayjs(date).format('YYYY-MM-DD HH:mm');
}

export function formatCurrency(amount: number | undefined): string {
  if (amount === undefined || amount === null) return '-';
  return `¥${amount.toFixed(2)}`;
}

export function calculateAge(birthDate: string): number {
  const today = dayjs();
  const birth = dayjs(birthDate);
  return today.diff(birth, 'year');
}

export function calculateAgeOnDate(birthDate: string, targetDate: string): number {
  const target = dayjs(targetDate);
  const birth = dayjs(birthDate);
  return target.diff(birth, 'year');
}

export function daysUntil(date: string): number {
  const target = dayjs(date);
  const today = dayjs().startOf('day');
  return target.diff(today, 'day');
}

export function getCancellationFee(departureDate: string, cancelDate: string = dayjs().format('YYYY-MM-DD')): {
  feePercentage: number;
  tier: typeof CANCELLATION_TIERS[0] | null;
  daysBeforeDeparture: number;
} {
  const departure = dayjs(departureDate).startOf('day');
  const cancel = dayjs(cancelDate).startOf('day');
  const daysBefore = departure.diff(cancel, 'day');

  for (const tier of CANCELLATION_TIERS) {
    if (daysBefore >= tier.daysBeforeDeparture) {
      return {
        feePercentage: tier.feePercentage,
        tier,
        daysBeforeDeparture: daysBefore,
      };
    }
  }

  return {
    feePercentage: 100,
    tier: CANCELLATION_TIERS[CANCELLATION_TIERS.length - 1],
    daysBeforeDeparture: daysBefore,
  };
}

export function calculateRefund(totalAmount: number, departureDate: string, cancelDate?: string): {
  refundAmount: number;
  deductionAmount: number;
  feePercentage: number;
  daysBeforeDeparture: number;
  reason: string;
} {
  const cancel = cancelDate || dayjs().format('YYYY-MM-DD');
  const { feePercentage, daysBeforeDeparture, tier } = getCancellationFee(departureDate, cancel);
  
  const deductionAmount = Math.round(totalAmount * feePercentage / 100);
  const refundAmount = totalAmount - deductionAmount;

  return {
    refundAmount,
    deductionAmount,
    feePercentage,
    daysBeforeDeparture,
    reason: tier ? tier.label : '临近出发',
  };
}

export function isIdExpired(expiryDate: string | undefined, departureDate?: string, returnDate?: string): {
  expired: boolean;
  expiringSoon: boolean;
  daysUntilExpiry: number;
  message: string;
} {
  if (!expiryDate) {
    return { expired: false, expiringSoon: false, daysUntilExpiry: -1, message: '未填写证件有效期' };
  }

  const expiry = dayjs(expiryDate).endOf('day');
  const today = dayjs().startOf('day');
  const daysUntilExpiry = expiry.diff(today, 'day');

  const expired = daysUntilExpiry < 0;
  const expiringSoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 180;

  let message = '';
  if (expired) {
    message = `证件已过期 ${Math.abs(daysUntilExpiry)} 天`;
  } else if (expiringSoon) {
    message = `证件将在 ${daysUntilExpiry} 天后过期`;
  }

  if (departureDate && returnDate && !expired) {
    const tripEnd = dayjs(returnDate).endOf('day');
    if (expiry.isBefore(tripEnd)) {
      return {
        expired: true,
        expiringSoon: true,
        daysUntilExpiry,
        message: '证件在行程结束前过期',
      };
    }
  }

  return { expired, expiringSoon, daysUntilExpiry, message };
}

export function validateChildAge(member: FamilyMember, trip: Trip): {
  valid: boolean;
  age: number;
  message: string;
} {
  if (member.relation !== 'child') {
    return { valid: true, age: calculateAge(member.birthDate), message: '' };
  }

  const age = calculateAgeOnDate(member.birthDate, trip.startDate);
  const valid = age >= trip.minChildAge && age <= trip.maxChildAge;
  const message = valid 
    ? '' 
    : `孩子年龄 ${age} 岁，不符合项目要求（${trip.minChildAge}-${trip.maxChildAge}岁）`;

  return { valid, age, message };
}

export function calculateTotalAmount(
  basePrice: number,
  memberCount: number,
  insurancePremiumPerPerson: number = 0,
  roomPrice: number = 0,
  roomCount: number = 1,
  hasExtraBed: boolean = false,
  extraBedPrice: number = 80
): number {
  const baseTotal = basePrice * memberCount;
  const insuranceTotal = insurancePremiumPerPerson * memberCount;
  const roomTotal = roomPrice * roomCount;
  const extraBedTotal = hasExtraBed ? extraBedPrice * roomCount : 0;
  
  return baseTotal + insuranceTotal + roomTotal + extraBedTotal;
}

export function calculateDeposit(totalAmount: number, depositRatio: number = 0.3): number {
  return Math.round(totalAmount * depositRatio);
}

export function getFinalPaymentDueDate(departureDate: string, daysBefore: number = 7): string {
  return dayjs(departureDate).subtract(daysBefore, 'day').format('YYYY-MM-DD');
}

export function getPaidAmount(payments: { amount: number }[]): number {
  return payments.reduce((sum, p) => sum + p.amount, 0);
}

export function getRemainingAmount(totalAmount: number, paidAmount: number): number {
  return totalAmount - paidAmount;
}

export function maskIdNumber(idNumber: string, type: string = 'id_card'): string {
  if (!idNumber) return '';
  
  if (type === 'id_card' && idNumber.length === 18) {
    return idNumber.slice(0, 6) + '********' + idNumber.slice(14);
  }
  
  if (idNumber.length <= 4) return idNumber;
  return idNumber.slice(0, 2) + '*'.repeat(idNumber.length - 4) + idNumber.slice(-2);
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(7);
}

export function validateIdCard(idNumber: string): { valid: boolean; message: string } {
  if (!idNumber) {
    return { valid: false, message: '请输入证件号码' };
  }

  const idCardRegex = /^\d{17}[\dXx]$/;
  if (!idCardRegex.test(idNumber)) {
    return { valid: false, message: '身份证号格式不正确' };
  }

  return { valid: true, message: '' };
}

export function validatePhone(phone: string): { valid: boolean; message: string } {
  if (!phone) {
    return { valid: false, message: '请输入手机号码' };
  }

  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!phoneRegex.test(phone)) {
    return { valid: false, message: '手机号码格式不正确' };
  }

  return { valid: true, message: '' };
}

export function validateEmail(email: string): { valid: boolean; message: string } {
  if (!email) {
    return { valid: true, message: '' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, message: '邮箱格式不正确' };
  }

  return { valid: true, message: '' };
}

export function getStatusBadgeClass(status: Registration['status']): string {
  const statusMap: Record<string, string> = {
    pending: 'badge-warning',
    confirmed: 'badge-primary',
    deposit_paid: 'badge-primary',
    fully_paid: 'badge-success',
    departed: 'badge-gray',
    cancelled: 'badge-danger',
    refunded: 'badge-gray',
  };
  return statusMap[status] || 'badge-gray';
}

export function getReminderLevelClass(level: 'info' | 'warning' | 'error'): string {
  const levelMap = {
    info: 'border-l-blue-500 bg-blue-50',
    warning: 'border-l-amber-500 bg-amber-50',
    error: 'border-l-red-500 bg-red-50',
  };
  return levelMap[level] || levelMap.info;
}
