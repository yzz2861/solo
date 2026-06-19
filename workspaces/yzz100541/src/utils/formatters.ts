import type { TimeSlot, StoreType, WasteReason, WeatherType, PromotionType } from '../types';

export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const formatCurrency = (amount: number): string => {
  return `¥${amount.toFixed(2)}`;
};

export const formatPercent = (value: number, decimals: number = 1): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

export const getTimeSlotLabel = (slot: TimeSlot): string => {
  const labels: Record<TimeSlot, string> = {
    morning: '早餐',
    noon: '午餐',
    afternoon: '下午茶',
    evening: '晚餐',
    night: '夜宵',
  };
  return labels[slot];
};

export const getTimeSlotRange = (slot: TimeSlot): string => {
  const ranges: Record<TimeSlot, string> = {
    morning: '06:00-09:00',
    noon: '11:00-13:30',
    afternoon: '14:00-17:00',
    evening: '17:30-20:30',
    night: '21:00-24:00',
  };
  return ranges[slot];
};

export const getStoreTypeLabel = (type: StoreType): string => {
  const labels: Record<StoreType, string> = {
    community: '社区店',
    office: '写字楼店',
    school: '校园店',
    station: '交通枢纽店',
  };
  return labels[type];
};

export const getStoreTypeColor = (type: StoreType): string => {
  const colors: Record<StoreType, string> = {
    community: 'bg-green-100 text-green-700',
    office: 'bg-blue-100 text-blue-700',
    school: 'bg-purple-100 text-purple-700',
    station: 'bg-orange-100 text-orange-700',
  };
  return colors[type];
};

export const getWasteReasonLabel = (reason: WasteReason): string => {
  const labels: Record<WasteReason, string> = {
    expired: '过期',
    poorQuality: '品相不佳',
    customerReturn: '顾客退回',
    systemReturn: '系统退货',
    unknown: '原因空白',
  };
  return labels[reason];
};

export const getWasteReasonColor = (reason: WasteReason): string => {
  const colors: Record<WasteReason, string> = {
    expired: 'bg-red-100 text-red-700',
    poorQuality: 'bg-yellow-100 text-yellow-700',
    customerReturn: 'bg-orange-100 text-orange-700',
    systemReturn: 'bg-gray-100 text-gray-700',
    unknown: 'bg-slate-100 text-slate-500',
  };
  return colors[reason];
};

export const getWeatherTypeLabel = (type: WeatherType): string => {
  const labels: Record<WeatherType, string> = {
    sunny: '晴天',
    cloudy: '多云',
    rainy: '雨天',
    snowy: '雪天',
    hot: '高温',
    cold: '寒冷',
  };
  return labels[type];
};

export const getWeatherIcon = (type: WeatherType): string => {
  const icons: Record<WeatherType, string> = {
    sunny: '☀️',
    cloudy: '⛅',
    rainy: '🌧️',
    snowy: '❄️',
    hot: '🔥',
    cold: '🥶',
  };
  return icons[type];
};

export const getPromotionTypeLabel = (type: PromotionType): string => {
  if (!type) return '无';
  const labels: Record<string, string> = {
    buyOneGetOne: '买一赠一',
    timeDiscount: '时段折扣',
    groupBuy: '临时团购',
  };
  return labels[type] || '无';
};

export const getPromotionTypeColor = (type: PromotionType): string => {
  if (!type) return '';
  const colors: Record<string, string> = {
    buyOneGetOne: 'bg-green-100 text-green-700',
    timeDiscount: 'bg-yellow-100 text-yellow-700',
    groupBuy: 'bg-purple-100 text-purple-700',
  };
  return colors[type] || '';
};

export const getWasteRateLevel = (rate: number): { label: string; color: string; bgColor: string } => {
  if (rate < 0.05) return { label: '优秀', color: 'text-green-600', bgColor: 'bg-green-500' };
  if (rate < 0.1) return { label: '良好', color: 'text-green-500', bgColor: 'bg-green-400' };
  if (rate < 0.15) return { label: '一般', color: 'text-yellow-500', bgColor: 'bg-yellow-400' };
  if (rate < 0.2) return { label: '偏高', color: 'text-orange-500', bgColor: 'bg-orange-400' };
  return { label: '严重', color: 'text-red-500', bgColor: 'bg-red-500' };
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};
