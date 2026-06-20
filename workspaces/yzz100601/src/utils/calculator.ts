import { BoxItem, LayerResult, PositionZone, POSITION_ZONES, RiskLevel, ShelfConfig } from '@/types';
import { toKg } from './unitConverter';

const ZONE_WEIGHT_MULTIPLIER: Record<PositionZone, number> = {
  tl: 0.9, tc: 1.0, tr: 0.9,
  ml: 1.0, mc: 1.3, mr: 1.0,
  bl: 0.9, bc: 1.0, br: 0.9,
};

const CENTER_ZONES: PositionZone[] = ['mc'];
const CORNER_ZONES: PositionZone[] = ['tl', 'tr', 'bl', 'br'];

const emptyZoneWeights = (): Record<PositionZone, number> => {
  const obj = {} as Record<PositionZone, number>;
  POSITION_ZONES.forEach((z) => (obj[z] = 0));
  return obj;
};

const determineRiskLevel = (utilization: number): RiskLevel => {
  if (utilization >= 100) return 'danger';
  if (utilization >= 80) return 'warning';
  return 'safe';
};

export const calculateLayer = (
  layerIndex: number,
  boxes: BoxItem[],
  maxWeight_kg: number
): LayerResult => {
  const layerBoxes = boxes.filter((b) => b.layerIndex === layerIndex);
  const zoneWeights = emptyZoneWeights();
  let totalWeight_kg = 0;
  let centerWeight_kg = 0;
  let boxCount = 0;

  let maxBoxId = '';
  let maxBoxName = '';
  let maxBoxWeight_kg = 0;

  layerBoxes.forEach((box) => {
    const single_kg = toKg(box.weight, box.weightUnit);
    const line_kg = single_kg * box.quantity;
    totalWeight_kg += line_kg;
    boxCount += box.quantity;
    zoneWeights[box.positionZone] += line_kg;
    if (CENTER_ZONES.includes(box.positionZone)) {
      centerWeight_kg += line_kg;
    }
    if (line_kg > maxBoxWeight_kg) {
      maxBoxWeight_kg = line_kg;
      maxBoxId = box.id;
      maxBoxName = box.name;
    }
  });

  POSITION_ZONES.forEach((z) => {
    zoneWeights[z] = zoneWeights[z] * ZONE_WEIGHT_MULTIPLIER[z];
  });

  const utilizationPercent = maxWeight_kg > 0 ? (totalWeight_kg / maxWeight_kg) * 100 : 0;
  const riskLevel = determineRiskLevel(utilizationPercent);
  const safetyMargin_kg = maxWeight_kg - totalWeight_kg;
  const centerConcentrationRatio = totalWeight_kg > 0 ? (centerWeight_kg / totalWeight_kg) * 100 : 0;

  const maxContributor =
    maxBoxWeight_kg > 0
      ? {
          boxId: maxBoxId,
          boxName: maxBoxName,
          weight_kg: maxBoxWeight_kg,
          percent: totalWeight_kg > 0 ? (maxBoxWeight_kg / totalWeight_kg) * 100 : 0,
        }
      : null;

  return {
    layerIndex,
    totalWeight_kg,
    utilizationPercent,
    riskLevel,
    safetyMargin_kg,
    maxContributor,
    zoneWeights,
    centerConcentrationRatio,
    boxCount,
  };
};

export const calculateAllLayers = (
  shelf: ShelfConfig,
  boxes: BoxItem[]
): LayerResult[] => {
  const results: LayerResult[] = [];
  for (let i = 0; i < shelf.layerCount; i++) {
    results.push(calculateLayer(i, boxes, shelf.layerMaxWeight_kg));
  }
  return results;
};

export const calculateTotalWeight = (boxes: BoxItem[]): number => {
  return boxes.reduce((sum, b) => sum + toKg(b.weight, b.weightUnit) * b.quantity, 0);
};
