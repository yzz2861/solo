import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function maskPhone(phone: string): string {
  if (!phone) return phone;
  return phone.replace(/1[3-9]\d{9}/g, (match) => {
    return match.slice(0, 3) + '****' + match.slice(7);
  });
}

export function maskIdCard(idCard: string): string {
  if (!idCard || idCard.length < 15) return idCard;
  if (idCard.length === 15) {
    return idCard.slice(0, 6) + '********' + idCard.slice(12);
  }
  return idCard.slice(0, 6) + '********' + idCard.slice(14);
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
