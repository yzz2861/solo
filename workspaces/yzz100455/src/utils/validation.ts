import { toSqm } from './unitConverter';
import type { RoomParams, WarningItem } from '@/types';

export function validateParams(params: RoomParams): WarningItem[] {
  const warnings: WarningItem[] = [];
  const areaSqm = toSqm(params.area, params.areaUnit);

  if (params.area <= 0) {
    warnings.push({
      id: 'area-zero',
      type: 'error',
      message: '请输入有效的房间面积',
      field: 'area',
    });
  }

  if (areaSqm < 5) {
    warnings.push({
      id: 'area-too-small',
      type: 'info',
      message: '面积较小，建议确认单位是否正确',
      field: 'area',
    });
  }

  if (areaSqm > 500) {
    warnings.push({
      id: 'area-too-large',
      type: 'info',
      message: '面积较大，建议咨询专业工程师详细测算',
      field: 'area',
    });
  }

  if (params.floorHeight === null || params.floorHeight <= 0) {
    warnings.push({
      id: 'floor-height-missing',
      type: 'warning',
      message: '层高缺失，已按默认值 2.8 米估算，可能影响准确性',
      field: 'floorHeight',
    });
  } else if (params.floorHeight > 4) {
    warnings.push({
      id: 'floor-height-high',
      type: 'info',
      message: '层高较高，建议确认是否有特殊吊顶或夹层',
      field: 'floorHeight',
    });
  } else if (params.floorHeight < 2.2) {
    warnings.push({
      id: 'floor-height-low',
      type: 'info',
      message: '层高偏低，建议确认是否为复式或夹层空间',
      field: 'floorHeight',
    });
  }

  if (params.peopleCount > 0 && areaSqm / params.peopleCount < 3) {
    warnings.push({
      id: 'people-density-high',
      type: 'error',
      message: `人数密度过高（人均仅 ${(areaSqm / params.peopleCount).toFixed(1)}㎡），请确认人数是否正确`,
      field: 'peopleCount',
    });
  }

  if (params.peopleCount > 0 && params.computerCount === 0) {
    warnings.push({
      id: 'computer-missing',
      type: 'info',
      message: '有人员但未填写电脑数量，设备发热可能被低估',
      field: 'computerCount',
    });
  }

  if (params.computerCount > params.peopleCount * 3) {
    warnings.push({
      id: 'computer-too-many',
      type: 'info',
      message: '电脑数量偏多，如为机房请选择"机房"使用类型',
      field: 'computerCount',
    });
  }

  if (params.windowWallRatio < 0.1) {
    warnings.push({
      id: 'window-ratio-low',
      type: 'info',
      message: '窗墙比较低，确认是否为内区或无窗房间',
      field: 'windowWallRatio',
    });
  }

  if (params.windowWallRatio > 0.7) {
    warnings.push({
      id: 'window-ratio-high',
      type: 'info',
      message: '窗墙比较高，太阳辐射得热会明显增加',
      field: 'windowWallRatio',
    });
  }

  if (params.usageHours < 4) {
    warnings.push({
      id: 'usage-hours-low',
      type: 'info',
      message: '使用时长短，建议按间歇使用场景考虑',
      field: 'usageHours',
    });
  }

  if (params.usageHours > 16) {
    warnings.push({
      id: 'usage-hours-high',
      type: 'info',
      message: '使用时长超过 16 小时，需考虑空调连续运行能力',
      field: 'usageHours',
    });
  }

  return warnings;
}
