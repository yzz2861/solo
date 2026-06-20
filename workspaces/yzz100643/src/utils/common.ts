export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatNumber = (num: number): string => {
  return num.toLocaleString('zh-CN');
};

export const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.8) return 'text-success';
  if (confidence >= 0.6) return 'text-warning';
  return 'text-error';
};

export const getConfidenceBgColor = (confidence: number): string => {
  if (confidence >= 0.8) return 'bg-success/10';
  if (confidence >= 0.6) return 'bg-warning/10';
  return 'bg-error/10';
};

export const getConfidenceLabel = (confidence: number): string => {
  if (confidence >= 0.8) return '高置信';
  if (confidence >= 0.6) return '中置信';
  return '低置信';
};

export const getPriorityColor = (level: 'critical' | 'high' | 'medium' | 'low'): string => {
  switch (level) {
    case 'critical': return 'bg-error text-white';
    case 'high': return 'bg-warning text-white';
    case 'medium': return 'bg-archive-500 text-white';
    case 'low': return 'bg-archive-300 text-archive-800';
  }
};

export const getPriorityLabel = (level: 'critical' | 'high' | 'medium' | 'low'): string => {
  switch (level) {
    case 'critical': return '极优先';
    case 'high': return '高优先';
    case 'medium': return '中优先';
    case 'low': return '低优先';
  }
};

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: '待校对',
    reviewing: '校对中',
    corrected: '已修正',
    approved: '已通过',
    importing: '导入中',
    processing: '处理中',
    ready: '待处理',
    completed: '已完成'
  };
  return labels[status] || status;
};

export const getFieldLabel = (fieldName: string): string => {
  const labels: Record<string, string> = {
    name: '姓名',
    date: '日期',
    documentNumber: '编号',
    pageNumber: '页码',
    materialType: '材料类型',
    photoPath: '照片路径',
    ocrText: 'OCR文本'
  };
  return labels[fieldName] || fieldName;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const downloadFile = (content: string | Blob, filename: string, mimeType: string): void => {
  let blob: Blob;
  if (typeof content === 'string') {
    blob = new Blob([content], { type: mimeType });
  } else {
    blob = content;
  }
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const readFileAsText = (file: File, encoding: string = 'utf-8'): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, encoding);
  });
};

export const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};
