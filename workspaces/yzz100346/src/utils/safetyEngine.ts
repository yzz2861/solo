import type { BaseDevice, HoistPoint, LoadBearingDevice, Position } from '../types/devices';
import { isLoadBearingDevice, isHoistPoint, isAudienceArea, isLightRig, isSpeaker } from '../types/devices';
import type { Risk, SafetySettings, LoadDistribution } from '../types/safety';
import { normalizeWeightToKg, isValidWeightValue } from './unitConversion';
import { calculateLoadShare, calculateVariance, minDistanceBetweenDevices, distance3D } from './geometry';
import { SAFETY_THRESHOLDS, getOverloadSuggestion, getDistanceSuggestion, getUnbalancedSuggestion } from '../constants/safetyThresholds';

interface HoistPointLoad {
  hoistPoint: HoistPoint;
  load: number;
  connectedDevices: string[];
}

const generateRiskId = (): string => crypto.randomUUID();

const findNearestHoistPoints = (
  devicePosition: Position,
  hoistPoints: HoistPoint[],
  maxDistance: number = 10
): HoistPoint[] => {
  return hoistPoints
    .map(hp => ({ hp, distance: distance3D(devicePosition, hp.position) }))
    .filter(({ distance }) => distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 4)
    .map(({ hp }) => hp);
};

const calculateHoistPointLoads = (
  devices: BaseDevice[],
  settings: SafetySettings
): HoistPointLoad[] => {
  const hoistPoints = devices.filter(isHoistPoint);
  const loadBearingDevices = devices.filter(d => isLightRig(d) || isSpeaker(d)) as LoadBearingDevice[];
  
  const loadMap = new Map<string, HoistPointLoad>();
  
  hoistPoints.forEach(hp => {
    loadMap.set(hp.id, {
      hoistPoint: hp,
      load: 0,
      connectedDevices: [],
    });
  });
  
  loadBearingDevices.forEach(device => {
    if (!isValidWeightValue(device.weight, device.weightUnit)) {
      return;
    }
    
    const weightInKg = normalizeWeightToKg(device.weight, device.weightUnit);
    const nearestHoists = findNearestHoistPoints(device.position, hoistPoints);
    
    if (nearestHoists.length > 0) {
      const loadShares = calculateLoadShare(
        device.position,
        nearestHoists.map(h => h.position),
        weightInKg
      );
      
      nearestHoists.forEach((hp, index) => {
        const hpLoad = loadMap.get(hp.id);
        if (hpLoad) {
          hpLoad.load += loadShares[index];
          hpLoad.connectedDevices.push(device.id);
        }
      });
    }
  });
  
  return Array.from(loadMap.values());
};

export const checkOverload = (
  devices: BaseDevice[],
  settings: SafetySettings
): Risk[] => {
  const risks: Risk[] = [];
  const hoistLoads = calculateHoistPointLoads(devices, settings);
  
  hoistLoads.forEach(({ hoistPoint, load }) => {
    const maxLoad = hoistPoint.maxLoad || settings.maxHoistLoad;
    const ratio = load / maxLoad;
    
    if (ratio >= SAFETY_THRESHOLDS.OVERLOAD_CRITICAL_RATIO) {
      risks.push({
        id: generateRiskId(),
        type: 'overload',
        level: 'critical',
        deviceId: hoistPoint.id,
        deviceType: hoistPoint.type,
        description: `吊点 ${hoistPoint.name} 超载，当前承重 ${load.toFixed(1)}kg，最大承重 ${maxLoad}kg`,
        suggestion: getOverloadSuggestion(load, maxLoad),
        value: load,
        threshold: maxLoad,
      });
    } else if (ratio >= SAFETY_THRESHOLDS.OVERLOAD_WARNING_RATIO) {
      risks.push({
        id: generateRiskId(),
        type: 'overload',
        level: 'warning',
        deviceId: hoistPoint.id,
        deviceType: hoistPoint.type,
        description: `吊点 ${hoistPoint.name} 接近超载，当前承重 ${load.toFixed(1)}kg，最大承重 ${maxLoad}kg`,
        suggestion: `已使用 ${(ratio * 100).toFixed(0)}% 的承重能力，建议检查负载`,
        value: load,
        threshold: maxLoad,
      });
    }
  });
  
  return risks;
};

export const checkAudienceDistance = (
  devices: BaseDevice[],
  settings: SafetySettings
): Risk[] => {
  const risks: Risk[] = [];
  const audienceAreas = devices.filter(isAudienceArea);
  const equipmentDevices = devices.filter(d => isLightRig(d) || isSpeaker(d));
  
  if (audienceAreas.length === 0) {
    return risks;
  }
  
  equipmentDevices.forEach(device => {
    let minDistance = Infinity;
    
    audienceAreas.forEach(audience => {
      const distance = minDistanceBetweenDevices(device, audience);
      minDistance = Math.min(minDistance, distance);
    });
    
    if (minDistance < settings.minAudienceDistance * SAFETY_THRESHOLDS.DISTANCE_CRITICAL_RATIO) {
      risks.push({
        id: generateRiskId(),
        type: 'tooClose',
        level: 'critical',
        deviceId: device.id,
        deviceType: device.type,
        description: `${device.name} 距离观众区过近，仅 ${minDistance.toFixed(1)}m，最小安全距离 ${settings.minAudienceDistance}m`,
        suggestion: getDistanceSuggestion(minDistance, settings.minAudienceDistance),
        value: minDistance,
        threshold: settings.minAudienceDistance,
      });
    } else if (minDistance < settings.minAudienceDistance * SAFETY_THRESHOLDS.DISTANCE_WARNING_RATIO) {
      risks.push({
        id: generateRiskId(),
        type: 'tooClose',
        level: 'warning',
        deviceId: device.id,
        deviceType: device.type,
        description: `${device.name} 距离观众区较近，当前距离 ${minDistance.toFixed(1)}m，建议保持 ${settings.minAudienceDistance}m 以上`,
        suggestion: `考虑增加设备与观众区的距离`,
        value: minDistance,
        threshold: settings.minAudienceDistance,
      });
    }
  });
  
  return risks;
};

export const checkLoadBalance = (
  devices: BaseDevice[],
  settings: SafetySettings
): Risk[] => {
  const risks: Risk[] = [];
  const hoistLoads = calculateHoistPointLoads(devices, settings);
  
  if (hoistLoads.length < 2) {
    return risks;
  }
  
  const loads = hoistLoads.map(h => h.load);
  const variance = calculateVariance(loads);
  const mean = loads.reduce((sum, l) => sum + l, 0) / loads.length;
  const normalizedVariance = mean > 0 ? variance / (mean * mean) : 0;
  
  if (normalizedVariance > settings.maxLoadVariance) {
    risks.push({
      id: generateRiskId(),
      type: 'unbalanced',
      level: 'warning',
      deviceId: 'global',
      deviceType: 'hoistPoint',
      description: `吊点负载分布不均，归一化方差 ${normalizedVariance.toFixed(2)}，最大允许 ${settings.maxLoadVariance}`,
      suggestion: getUnbalancedSuggestion(normalizedVariance, settings.maxLoadVariance),
      value: normalizedVariance,
      threshold: settings.maxLoadVariance,
    });
  }
  
  return risks;
};

export const checkWeightMissing = (devices: BaseDevice[]): Risk[] => {
  const risks: Risk[] = [];
  const loadBearingDevices = devices.filter(d => isLightRig(d) || isSpeaker(d)) as LoadBearingDevice[];
  
  loadBearingDevices.forEach(device => {
    if (!isValidWeightValue(device.weight, device.weightUnit)) {
      risks.push({
        id: generateRiskId(),
        type: 'weightMissing',
        level: 'info',
        deviceId: device.id,
        deviceType: device.type,
        description: `${device.name} 未填写重量参数`,
        suggestion: '请填写设备重量以进行准确的安全检测',
        value: undefined,
        threshold: undefined,
      });
    }
  });
  
  return risks;
};

export const runSafetyCheck = (
  devices: BaseDevice[],
  settings: SafetySettings
): Risk[] => {
  const overloadRisks = checkOverload(devices, settings);
  const distanceRisks = checkAudienceDistance(devices, settings);
  const balanceRisks = checkLoadBalance(devices, settings);
  const weightRisks = checkWeightMissing(devices);
  
  return [...overloadRisks, ...distanceRisks, ...balanceRisks, ...weightRisks];
};

export const getLoadDistributions = (
  devices: BaseDevice[],
  settings: SafetySettings
): LoadDistribution[] => {
  const hoistLoads = calculateHoistPointLoads(devices, settings);
  const totalLoad = hoistLoads.reduce((sum, h) => sum + h.load, 0);
  
  return hoistLoads.map(h => ({
    hoistPointId: h.hoistPoint.id,
    totalLoad: h.load,
    percentage: totalLoad > 0 ? (h.load / totalLoad) * 100 : 0,
  }));
};

export const filterRisksByDeviceType = (
  risks: Risk[],
  deviceType: string | 'all'
): Risk[] => {
  if (deviceType === 'all') {
    return risks;
  }
  return risks.filter(r => r.deviceType === deviceType);
};
