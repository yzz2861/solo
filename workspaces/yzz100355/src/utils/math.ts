export const distance2D = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

export const distance3D = (
  x1: number, y1: number, z1: number,
  x2: number, y2: number, z2: number
): number => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) + Math.pow(z2 - z1, 2));
};

export const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t;
};

export const lerpArray = (start: number[], end: number[], t: number): number[] => {
  return start.map((s, i) => lerp(s, end[i], t));
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

export const normalize = (value: number, min: number, max: number): number => {
  return (value - min) / (max - min);
};

export const pointToLineDistance = (
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): number => {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  
  if (lenSq !== 0) {
    param = dot / lenSq;
  }
  
  let xx, yy;
  
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }
  
  return distance2D(px, py, xx, yy);
};

export const pointToPolygonDistance = (
  px: number, py: number,
  polygon: { x: number; y: number }[]
): number => {
  if (polygon.length < 2) {
    return distance2D(px, py, polygon[0]?.x || 0, polygon[0]?.y || 0);
  }
  
  let minDistance = Infinity;
  
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    const dist = pointToLineDistance(px, py, p1.x, p1.y, p2.x, p2.y);
    minDistance = Math.min(minDistance, dist);
  }
  
  return minDistance;
};

export const isPointInPolygon = (
  px: number, py: number,
  polygon: { x: number; y: number }[]
): boolean => {
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    if (((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
};

export const getPolygonCenter = (polygon: { x: number; y: number }[]): { x: number; y: number } => {
  const sumX = polygon.reduce((sum, p) => sum + p.x, 0);
  const sumY = polygon.reduce((sum, p) => sum + p.y, 0);
  return {
    x: sumX / polygon.length,
    y: sumY / polygon.length,
  };
};

export const movingAverage = (values: number[], windowSize: number): number[] => {
  if (windowSize <= 1) return values;
  
  const result: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);
  
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(values.length, i + halfWindow + 1);
    const window = values.slice(start, end);
    const average = window.reduce((sum, v) => sum + v, 0) / window.length;
    result.push(average);
  }
  
  return result;
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};
