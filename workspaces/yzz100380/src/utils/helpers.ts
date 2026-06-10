export function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateShort(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });
}

export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function isDateWithinDays(date: string, days: number): boolean {
  const targetDate = new Date(date);
  const now = new Date();
  const diffTime = now.getTime() - targetDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= days && diffDays >= 0;
}

export function isUpcoming(date: string, days: number = 30): boolean {
  const targetDate = new Date(date);
  const now = new Date();
  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= days;
}

export function getDaysUntil(date: string): number {
  const targetDate = new Date(date);
  const now = new Date();
  const diffTime = targetDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getDifficultyLabel(difficulty: 'easy' | 'medium' | 'hard'): string {
  const labels = {
    easy: '简单',
    medium: '中等',
    hard: '困难',
  };
  return labels[difficulty];
}

export function getDifficultyColor(difficulty: 'easy' | 'medium' | 'hard'): string {
  const colors = {
    easy: 'text-green-600 bg-green-100',
    medium: 'text-yellow-600 bg-yellow-100',
    hard: 'text-red-600 bg-red-100',
  };
  return colors[difficulty];
}

export function getAttendanceLabel(status: 'present' | 'absent' | 'late' | 'leave'): string {
  const labels = {
    present: '出勤',
    absent: '缺勤',
    late: '迟到',
    leave: '请假',
  };
  return labels[status];
}

export function getAttendanceColor(status: 'present' | 'absent' | 'late' | 'leave'): string {
  const colors = {
    present: 'text-green-600 bg-green-100',
    absent: 'text-red-600 bg-red-100',
    late: 'text-yellow-600 bg-yellow-100',
    leave: 'text-blue-600 bg-blue-100',
  };
  return colors[status];
}

export function parseBars(barsStr: string): number[] {
  const result: number[] = [];
  const parts = barsStr.split(',').map((p) => p.trim());
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map((n) => parseInt(n.trim(), 10));
      for (let i = start; i <= end; i++) {
        result.push(i);
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num)) {
        result.push(num);
      }
    }
  }
  return [...new Set(result)].sort((a, b) => a - b);
}

export function getPracticedBarCount(barsStr: string): number {
  return parseBars(barsStr).length;
}

export function getMasteryColor(mastery: number): string {
  if (mastery >= 90) return 'bg-green-500';
  if (mastery >= 70) return 'bg-yellow-500';
  if (mastery >= 50) return 'bg-orange-500';
  return 'bg-red-500';
}

export function getMasteryTextColor(mastery: number): string {
  if (mastery >= 90) return 'text-green-600';
  if (mastery >= 70) return 'text-yellow-600';
  if (mastery >= 50) return 'text-orange-600';
  return 'text-red-600';
}

export function downloadJSON(data: string, filename: string): void {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function readJSONFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
