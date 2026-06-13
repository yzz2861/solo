const ALPHA = 1e-5;

export interface TempCorrectionResult {
  originalWidth: number;
  temperature: number;
  referenceTemperature: number;
  tempDiff: number;
  correctedWidth: number;
  isSignificant: boolean;
  note: string;
}

export function calculateTempDiff(
  currentTemp: number,
  previousTemp: number
): number {
  return Math.abs(currentTemp - previousTemp);
}

export function isTempDiffSignificant(
  tempDiff: number,
  threshold: number
): boolean {
  return tempDiff > threshold;
}

export function correctWidthForTemperature(
  widthMm: number,
  currentTemp: number,
  referenceTemp: number
): number {
  const deltaT = currentTemp - referenceTemp;
  const correctedWidth = widthMm * (1 + ALPHA * deltaT);
  return Number(correctedWidth.toFixed(3));
}

export function generateTempCorrectionNote(
  tempDiff: number,
  isSignificant: boolean
): string {
  if (!isSignificant) {
    return `温度差异 ${tempDiff.toFixed(1)}℃，在正常范围内`;
  }
  return `温度差异 ${tempDiff.toFixed(1)}℃，差异较大，数据对比需谨慎，已做温度修正`;
}

export function processTemperatureCorrection(
  widthMm: number,
  currentTemp: number,
  referenceTemp: number,
  threshold: number
): TempCorrectionResult {
  const tempDiff = calculateTempDiff(currentTemp, referenceTemp);
  const isSignificant = isTempDiffSignificant(tempDiff, threshold);
  const correctedWidth = correctWidthForTemperature(
    widthMm,
    currentTemp,
    referenceTemp
  );
  const note = generateTempCorrectionNote(tempDiff, isSignificant);

  return {
    originalWidth: widthMm,
    temperature: currentTemp,
    referenceTemperature: referenceTemp,
    tempDiff,
    correctedWidth,
    isSignificant,
    note,
  };
}
