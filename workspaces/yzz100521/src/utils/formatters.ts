export function formatNumber(num: number, decimals: number = 2): string {
  return num.toFixed(decimals);
}

export function formatTemperature(celsius: number): string {
  return `${celsius.toFixed(1)}°C`;
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatWeight(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} kg`;
  }
  return `${grams.toFixed(1)} g`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  
  return formatDate(dateString);
}

export function getAverageScore(scores: { score: number; count: number }[]): number {
  if (scores.length === 0) return 0;
  const total = scores.reduce((sum, s) => sum + s.score * s.count, 0);
  const count = scores.reduce((sum, s) => sum + s.count, 0);
  return total / count;
}

export function getScoreEmoji(score: number): string {
  if (score >= 4.5) return '😍';
  if (score >= 3.5) return '😊';
  if (score >= 2.5) return '😐';
  if (score >= 1.5) return '😕';
  return '😫';
}

export function getRiskLevelColor(level: 'warning' | 'danger'): string {
  return level === 'danger' ? '#FF6B6B' : '#FFA94D';
}

export function getSolidsRatioStatus(ratio: number): { status: 'ideal' | 'acceptable' | 'poor'; color: string; message: string } {
  if (ratio >= 35 && ratio <= 45) {
    return { status: 'ideal', color: '#98D8C8', message: '固形物比例理想' };
  }
  if (ratio >= 30 && ratio <= 50) {
    return { status: 'acceptable', color: '#FFD93D', message: '固形物比例可接受' };
  }
  return { status: 'poor', color: '#FF6B6B', message: '固形物比例异常' };
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
