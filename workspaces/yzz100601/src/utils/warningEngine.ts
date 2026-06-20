import { BoxItem, LayerResult, ShelfConfig, WarningItem, WeightUnit } from '@/types';
import { toKg } from './unitConverter';

export const generateWarnings = (
  shelf: ShelfConfig,
  boxes: BoxItem[],
  layerResults: LayerResult[]
): WarningItem[] => {
  const warnings: WarningItem[] = [];

  layerResults.forEach((lr) => {
    const layerBoxes = boxes.filter((b) => b.layerIndex === lr.layerIndex);
    const layerNum = `第${lr.layerIndex + 1}层`;

    if (lr.boxCount === 0) {
      warnings.push({
        type: 'info',
        code: 'EMPTY_BOX',
        message: `${layerNum}箱子数量为零`,
        detail: '该层暂无摆放任何货物',
        layerIndex: lr.layerIndex,
      });
    }

    if (lr.utilizationPercent >= 100) {
      warnings.push({
        type: 'error',
        code: 'OVER_LAYER_LIMIT',
        message: `${layerNum}总重已超限`,
        detail: `当前 ${lr.totalWeight_kg.toFixed(2)} kg / 限重 ${shelf.layerMaxWeight_kg} kg (${lr.utilizationPercent.toFixed(1)}%)，安全余量 ${lr.safetyMargin_kg.toFixed(2)} kg`,
        layerIndex: lr.layerIndex,
      });
    }

    if (lr.centerConcentrationRatio > 60 && lr.totalWeight_kg > 0) {
      warnings.push({
        type: 'warning',
        code: 'CENTER_HEAVY',
        message: `${layerNum}重货集中在中间`,
        detail: `中心区域承重占比 ${lr.centerConcentrationRatio.toFixed(1)}%，建议向四角分散以避免层板弯曲`,
        layerIndex: lr.layerIndex,
      });
    }

    const unitsInLayer = layerBoxes.map((b) => b.weightUnit);
    const uniqueUnits = Array.from(new Set(unitsInLayer));
    if (uniqueUnits.length > 1) {
      warnings.push({
        type: 'info',
        code: 'MIXED_UNITS',
        message: `${layerNum}混用多种重量单位`,
        detail: `当前使用: ${uniqueUnits.map((u) => (u === 'kg' ? '公斤' : u === 'jin' ? '斤' : '磅')).join(' / ')}，已自动换算为公斤计算`,
        layerIndex: lr.layerIndex,
      });
    }
  });

  boxes.forEach((box) => {
    const single_kg = toKg(box.weight, box.weightUnit);
    if (single_kg > shelf.singleItemLimit_kg) {
      warnings.push({
        type: 'warning',
        code: 'OVER_SINGLE_LIMIT',
        message: `「${box.name}」单件重量超过建议上限`,
        detail: `单件 ${single_kg.toFixed(2)} kg / 建议上限 ${shelf.singleItemLimit_kg} kg，请注意人工搬运风险`,
        layerIndex: box.layerIndex,
        boxId: box.id,
      });
    }

    const volume = box.length_cm * box.width_cm * box.height_cm;
    const density = volume > 0 ? (single_kg * 1000) / volume : 0;
    if (volume > 60000 && density < 0.02 && single_kg > 0) {
      warnings.push({
        type: 'warning',
        code: 'WEIGHT_MISMATCH',
        message: `「${box.name}」尺寸大但重量异常偏轻`,
        detail: `体积 ${volume.toFixed(0)} cm³，密度 ${density.toFixed(3)} g/cm³，请确认重量是否正确`,
        layerIndex: box.layerIndex,
        boxId: box.id,
      });
    }
    if (volume > 0 && density > 2 && single_kg > 0) {
      warnings.push({
        type: 'warning',
        code: 'WEIGHT_MISMATCH',
        message: `「${box.name}」重量异常偏重`,
        detail: `密度 ${density.toFixed(3)} g/cm³，请确认是否为金属或重型货物`,
        layerIndex: box.layerIndex,
        boxId: box.id,
      });
    }
  });

  const unitUsed = Array.from(new Set(boxes.map((b) => b.weightUnit)));
  if (unitUsed.length > 1) {
    warnings.unshift({
      type: 'info',
      code: 'MIXED_UNITS_GLOBAL',
      message: '全局检测到多种重量单位混用',
      detail: `录入时使用了: ${unitUsed.map((u: WeightUnit) => (u === 'kg' ? '公斤' : u === 'jin' ? '斤' : '磅')).join(' / ')}，内部统一按公斤计算`,
    });
  }

  return warnings.sort((a, b) => {
    const rank = { error: 0, warning: 1, info: 2 };
    return rank[a.type] - rank[b.type];
  });
};
