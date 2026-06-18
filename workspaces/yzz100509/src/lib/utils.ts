import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPhone(phone: string, mask = false): string {
  const cleaned = phone.replace(/\D/g, "")
  if (cleaned.length < 11) {
    return cleaned
  }
  if (mask) {
    return `${cleaned.slice(0, 3)}****${cleaned.slice(7, 11)}`
  }
  return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7, 11)}`
}

export function maskPhone(phone: string): string {
  return formatPhone(phone, true)
}

export function formatCurrency(
  amount: number,
  currency = "CNY",
  locale = "zh-CN"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatMinutesToDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) {
    return `${mins}分钟`
  }
  if (mins === 0) {
    return `${hours}小时`
  }
  return `${hours}小时${mins}分钟`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function percent(
  value: number,
  total: number,
  decimals = 1
): number {
  if (total === 0) return 0
  const percentage = (value / total) * 100
  return Number(percentage.toFixed(decimals))
}
