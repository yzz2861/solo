import { AccidentStatus, StatusLabels } from '../../shared/types.js';

export const formatDate = (date: Date | string): string => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatMoney = (amount: number | undefined): string => {
  if (amount === undefined || amount === null) return '-';
  return `¥${amount.toFixed(2)}`;
};

export const getStatusColor = (status: AccidentStatus): string => {
  const colors: Record<AccidentStatus, string> = {
    [AccidentStatus.REGISTERED]: 'bg-slate-100 text-slate-700 border-slate-200',
    [AccidentStatus.ASSESSING]: 'bg-amber-50 text-amber-700 border-amber-200',
    [AccidentStatus.ASSESSED]: 'bg-blue-50 text-blue-700 border-blue-200',
    [AccidentStatus.PENDING_CONFIRM]: 'bg-purple-50 text-purple-700 border-purple-200',
    [AccidentStatus.CONFIRMED]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    [AccidentStatus.PENDING_CLOSE]: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    [AccidentStatus.CLOSED]: 'bg-gray-100 text-gray-600 border-gray-200',
    [AccidentStatus.DISPUTED]: 'bg-rose-50 text-rose-700 border-rose-200'
  };
  return colors[status] || colors[AccidentStatus.REGISTERED];
};

export const getStatusLabel = (status: AccidentStatus): string => {
  return StatusLabels[status] || status;
};

export const canClose = (status: AccidentStatus, assessmentAmount?: number): boolean => {
  if (!assessmentAmount) return false;
  return status >= AccidentStatus.CONFIRMED;
};

export const canConfirm = (status: AccidentStatus, assessmentAmount?: number): boolean => {
  if (!assessmentAmount) return false;
  return status >= AccidentStatus.ASSESSED && status < AccidentStatus.CONFIRMED;
};
