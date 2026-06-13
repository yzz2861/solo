export interface ConversionResult {
  value: number;
  unit: 'mm' | 'cm';
  convertedMm: number;
  wasAutoDetected: boolean;
  note?: string;
}

export function convertToMm(value: number, unit: 'mm' | 'cm'): number {
  return unit === 'cm' ? Number((value * 10).toFixed(2)) : Number(value.toFixed(2));
}

export function autoDetectUnit(input: string): { value: number; unit: 'mm' | 'cm'; note?: string } {
  const trimmed = input.trim().toLowerCase();
  
  if (trimmed.includes('mm')) {
    const num = parseFloat(trimmed.replace(/mm/gi, '').trim());
    return { value: isNaN(num) ? 0 : num, unit: 'mm' };
  }
  
  if (trimmed.includes('cm')) {
    const num = parseFloat(trimmed.replace(/cm/gi, '').trim());
    return { 
      value: isNaN(num) ? 0 : num, 
      unit: 'cm',
      note: '已自动识别为厘米单位'
    };
  }
  
  const num = parseFloat(trimmed);
  if (isNaN(num)) {
    return { value: 0, unit: 'mm' };
  }
  
  if (num >= 10) {
    return { 
      value: num, 
      unit: 'cm',
      note: '数值较大，自动识别为厘米单位'
    };
  }
  
  return { value: num, unit: 'mm' };
}

export function parseWidthInput(input: string): ConversionResult {
  const { value, unit, note } = autoDetectUnit(input);
  const convertedMm = convertToMm(value, unit);
  
  return {
    value,
    unit,
    convertedMm,
    wasAutoDetected: !input.toLowerCase().includes('mm') && !input.toLowerCase().includes('cm'),
    note,
  };
}

export function formatWidthDisplay(mm: number): string {
  if (mm >= 10) {
    return `${(mm / 10).toFixed(1)} cm (${mm.toFixed(1)} mm)`;
  }
  return `${mm.toFixed(1)} mm`;
}
