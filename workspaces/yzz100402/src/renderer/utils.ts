import type { Api } from '../main/preload';

export async function callApi<T>(
  fn: (api: Api) => Promise<{ success: true; data: T } | { success: false; error: string }>
): Promise<T> {
  const result = await fn(window.api as any);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

export function formatDuration(minutes: number): string {
  if (!minutes || minutes < 1) return '刚刚';
  if (minutes < 60) return `${Math.round(minutes)} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h} 小时 ${m} 分`;
}

export function getWaitMinutes(checkInTime: string): number {
  const start = new Date(checkInTime.replace(' ', 'T')).getTime();
  return Math.round((Date.now() - start) / 60000);
}

export const statusText: Record<string, string> = {
  waiting: '候诊中',
  calling: '叫号中',
  called: '已就诊',
  passed: '已过号',
  recovered: '已恢复',
  cancelled: '已取消',
};

export const actionText: Record<string, string> = {
  checkin: '签到',
  call: '叫号',
  pass: '过号',
  recover: '恢复',
  cancel: '取消',
  recall: '重新叫号',
  change_doctor: '改医生',
};
