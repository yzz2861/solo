import type { ExhibitionObject, MallConfig, RiskItem } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { calculateLoadPerM2, formatLoad, formatWeight, formatArea } from './unitConversion';
import { checkOverlap, calculateOverlapArea, calculateEdgeToEdgeDistance, lineIntersectsZone } from './geometry';

export const checkOverload = (obj: ExhibitionObject, mall: MallConfig): RiskItem | null => {
  const loadPerM2 = calculateLoadPerM2(obj.weight, obj.weightUnit, obj.area, obj.areaUnit);
  
  if (loadPerM2 > mall.floorLoadCapacity) {
    return {
      id: uuidv4(),
      objectId: obj.id,
      type: 'overload',
      severity: 'danger',
      message: `承重超载：${formatLoad(loadPerM2)} > 限值 ${formatLoad(mall.floorLoadCapacity)}`,
      basis: `物体重量${formatWeight(obj.weight, obj.weightUnit)}，面积${formatArea(obj.area, obj.areaUnit)}，` +
             `计算得单位面积承重${formatLoad(loadPerM2)}，超过楼板承重限值${formatLoad(mall.floorLoadCapacity)}`,
      resolved: false,
    };
  }
  return null;
};

export const checkFireExitBlocked = (obj: ExhibitionObject, mall: MallConfig): RiskItem | null => {
  for (const exit of mall.fireExits) {
    if (checkOverlap(obj, exit)) {
      const overlapArea = calculateOverlapArea(obj, exit);
      return {
        id: uuidv4(),
        objectId: obj.id,
        type: 'fire_exit_blocked',
        severity: 'danger',
        message: `堵塞消防通道"${exit.name}"，重叠面积 ${overlapArea.toFixed(2)} m²`,
        basis: `消防通道最小宽度要求${mall.minFireExitWidth}m，物体位置与"${exit.name}"通道区域重叠，` +
               `重叠面积${overlapArea.toFixed(2)}m²，违反《建筑设计防火规范》`,
        resolved: false,
        suggestedPosition: [
          obj.position[0] < 0 ? obj.position[0] - 3 : obj.position[0] + 3,
          obj.position[1],
          obj.position[2],
        ],
      };
    }
  }
  return null;
};

export const checkPassageWidth = (objects: ExhibitionObject[], mall: MallConfig): RiskItem[] => {
  const risks: RiskItem[] = [];
  const relevantObjects = objects.filter(o => ['booth', 'car', 'barrier'].includes(o.type));
  
  for (let i = 0; i < relevantObjects.length; i++) {
    for (let j = i + 1; j < relevantObjects.length; j++) {
      const distance = calculateEdgeToEdgeDistance(relevantObjects[i], relevantObjects[j]);
      if (distance < mall.minPassageWidth && distance > 0) {
        risks.push({
          id: uuidv4(),
          objectId: relevantObjects[i].id,
          type: 'passage_too_narrow',
          severity: 'warning',
          message: `通道宽度不足：${distance.toFixed(2)}m < 要求 ${mall.minPassageWidth}m`,
          basis: `"${relevantObjects[i].name}"与"${relevantObjects[j].name}"边缘距离${distance.toFixed(2)}m，` +
                 `小于最小通行宽度${mall.minPassageWidth}m要求，影响客流疏散`,
          resolved: false,
        });
      }
    }
  }
  return risks;
};

export const checkPowerCrossFlow = (obj: ExhibitionObject, mall: MallConfig): RiskItem | null => {
  if (!obj.hasPower || !obj.powerSourceId) return null;
  
  const powerPoint = mall.powerPoints.find(p => p.id === obj.powerSourceId);
  if (!powerPoint) return null;
  
  const line: [[number, number, number], [number, number, number]] = [
    powerPoint.position,
    obj.position,
  ];
  
  for (const entrance of mall.entrances) {
    if (lineIntersectsZone(line, entrance)) {
      return {
        id: uuidv4(),
        objectId: obj.id,
        type: 'power_crosses_flow',
        severity: 'warning',
        message: `电源线横跨客流入口"${entrance.name}"，存在安全隐患`,
        basis: `电源线从${powerPoint.name}到"${obj.name}"的路径经过"${entrance.name}"客流主要入口区域，` +
               `易造成绊倒风险，建议更换电源点或调整走线`,
        resolved: false,
      };
    }
  }
  return null;
};

export const checkUnitInput = (obj: ExhibitionObject): RiskItem | null => {
  if (obj.weight <= 0) {
    return {
      id: uuidv4(),
      objectId: obj.id,
      type: 'unit_error',
      severity: 'danger',
      message: '重量必须大于0',
      basis: '重量参数无效，请检查输入值',
      resolved: false,
    };
  }
  if (obj.area <= 0) {
    return {
      id: uuidv4(),
      objectId: obj.id,
      type: 'unit_error',
      severity: 'danger',
      message: '面积必须大于0',
      basis: '面积参数无效，请检查输入值',
      resolved: false,
    };
  }
  
  if (obj.type === 'car') {
    const areaM2 = obj.areaUnit === 'ft2' ? obj.area * 0.0929 : obj.area;
    if (areaM2 < 4) {
      return {
        id: uuidv4(),
        objectId: obj.id,
        type: 'area_error',
        severity: 'warning',
        message: '面积值异常，请确认单位是否正确',
        basis: `汽车占地面积通常约4-6m²，当前输入${formatArea(obj.area, obj.areaUnit)}（约${areaM2.toFixed(2)}m²）可能有误，` +
               `请确认是否混淆了平方米与平方英尺`,
        resolved: false,
      };
    }
    if (areaM2 > 20) {
      return {
        id: uuidv4(),
        objectId: obj.id,
        type: 'area_error',
        severity: 'warning',
        message: '面积值过大，请确认单位是否正确',
        basis: `普通汽车占地面积通常约4-6m²，当前输入${formatArea(obj.area, obj.areaUnit)}（约${areaM2.toFixed(2)}m²）偏大，` +
               `请确认是否混淆了平方米与平方英尺`,
        resolved: false,
      };
    }
  }
  
  if (obj.type === 'booth') {
    const areaM2 = obj.areaUnit === 'ft2' ? obj.area * 0.0929 : obj.area;
    if (areaM2 < 2) {
      return {
        id: uuidv4(),
        objectId: obj.id,
        type: 'area_error',
        severity: 'warning',
        message: '展台面积过小，请确认单位是否正确',
        basis: `展台面积通常大于2m²，当前输入${formatArea(obj.area, obj.areaUnit)}可能有误`,
        resolved: false,
      };
    }
  }
  
  if (obj.weightUnit === 'ton' && obj.weight > 100) {
    return {
      id: uuidv4(),
      objectId: obj.id,
      type: 'unit_error',
      severity: 'warning',
      message: '重量值异常，请确认单位是否正确',
      basis: `当前重量${obj.weight}吨，已超过普通重型卡车重量，请确认是否混淆了千克与吨`,
      resolved: false,
    };
  }
  
  if (obj.weightUnit === 'kg' && obj.type === 'car' && obj.weight < 500) {
    return {
      id: uuidv4(),
      objectId: obj.id,
      type: 'unit_error',
      severity: 'warning',
      message: '汽车重量过轻，请确认单位是否正确',
      basis: `汽车重量通常大于1000kg（1吨），当前输入${obj.weight}kg可能有误，` +
             `请确认是否应该使用吨作为单位`,
      resolved: false,
    };
  }
  
  return null;
};

export const detectAllRisks = (objects: ExhibitionObject[], mall: MallConfig): RiskItem[] => {
  const allRisks: RiskItem[] = [];
  
  for (const obj of objects) {
    const unitRisk = checkUnitInput(obj);
    if (unitRisk) allRisks.push(unitRisk);
    
    const overloadRisk = checkOverload(obj, mall);
    if (overloadRisk) allRisks.push(overloadRisk);
    
    const fireExitRisk = checkFireExitBlocked(obj, mall);
    if (fireExitRisk) allRisks.push(fireExitRisk);
    
    const powerCrossRisk = checkPowerCrossFlow(obj, mall);
    if (powerCrossRisk) allRisks.push(powerCrossRisk);
  }
  
  const passageRisks = checkPassageWidth(objects, mall);
  allRisks.push(...passageRisks);
  
  return allRisks;
};

export const generateLoadBasis = (objects: ExhibitionObject[], mall: MallConfig): string => {
  const lines: string[] = [];
  lines.push('## 承重计算依据');
  lines.push('');
  lines.push(`楼板承重限值：${mall.floorLoadCapacity} kN/m²`);
  lines.push('');
  lines.push('| 物体名称 | 重量 | 面积 | 单位承重(kN/m²) | 状态 |');
  lines.push('|---------|------|------|----------------|------|');
  
  for (const obj of objects) {
    const load = calculateLoadPerM2(obj.weight, obj.weightUnit, obj.area, obj.areaUnit);
    const status = load <= mall.floorLoadCapacity ? '✅ 合规' : '❌ 超标';
    lines.push(`| ${obj.name} | ${formatWeight(obj.weight, obj.weightUnit)} | ${formatArea(obj.area, obj.areaUnit)} | ${load.toFixed(2)} | ${status} |`);
  }
  
  const totalWeight = objects.reduce((sum, obj) => {
    const weightKg = obj.weightUnit === 'ton' ? obj.weight * 1000 : obj.weight;
    return sum + weightKg;
  }, 0);
  
  const totalArea = objects.reduce((sum, obj) => {
    const areaM2 = obj.areaUnit === 'ft2' ? obj.area * 0.0929 : obj.area;
    return sum + areaM2;
  }, 0);
  
  lines.push('');
  lines.push(`总重量：${(totalWeight / 1000).toFixed(2)} 吨`);
  lines.push(`总占地面积：${totalArea.toFixed(2)} m²`);
  lines.push(`平均单位承重：${((totalWeight * 9.8 / 1000) / totalArea).toFixed(2)} kN/m²`);
  
  return lines.join('\n');
};

export const generatePassageBasis = (risks: RiskItem[], objects: ExhibitionObject[], mall: MallConfig): string => {
  const lines: string[] = [];
  lines.push('## 通道宽度检测依据');
  lines.push('');
  lines.push(`最小通行宽度要求：${mall.minPassageWidth} m`);
  lines.push(`消防通道最小宽度要求：${mall.minFireExitWidth} m`);
  lines.push('');

  const passageRisks = risks.filter(r => r.type === 'passage_too_narrow' || r.type === 'fire_exit_blocked');
  if (passageRisks.length > 0) {
    lines.push('### 检测到的通道风险');
    lines.push('');
    passageRisks.forEach(risk => {
      const obj = objects.find(o => o.id === risk.objectId);
      lines.push(`- **${risk.severity === 'danger' ? '🔴' : '🟡'} ${risk.message}**`);
      lines.push(`  涉及物体: ${obj?.name || '未知'}`);
      lines.push(`  依据: ${risk.basis}`);
      lines.push('');
    });
  }
  
  const relevantObjects = objects.filter(o => ['booth', 'car', 'barrier'].includes(o.type));
  if (relevantObjects.length >= 2) {
    lines.push('| 物体A | 物体B | 边缘间距(m) | 状态 |');
    lines.push('|-------|-------|------------|------|');
    
    for (let i = 0; i < relevantObjects.length; i++) {
      for (let j = i + 1; j < relevantObjects.length; j++) {
        const distance = calculateEdgeToEdgeDistance(relevantObjects[i], relevantObjects[j]);
        if (distance > 0) {
          const status = distance >= mall.minPassageWidth ? '✅ 合规' : '⚠️ 不足';
          lines.push(`| ${relevantObjects[i].name} | ${relevantObjects[j].name} | ${distance.toFixed(2)} | ${status} |`);
        }
      }
    }
  }
  
  lines.push('');
  lines.push('### 消防通道检测');
  for (const exit of mall.fireExits) {
    let blocked = false;
    for (const obj of objects) {
      if (checkOverlap(obj, exit)) {
        blocked = true;
        const overlap = calculateOverlapArea(obj, exit);
        lines.push(`❌ 消防通道"${exit.name}"被"${obj.name}"堵塞，重叠${overlap.toFixed(2)}m²`);
      }
    }
    if (!blocked) {
      lines.push(`✅ 消防通道"${exit.name}"畅通`);
    }
  }
  
  return lines.join('\n');
};

export const generateRectificationOpinion = (risks: RiskItem[], objects: ExhibitionObject[], mall: MallConfig): string => {
  const opinions: string[] = [];
  opinions.push('# 布展整改意见');
  opinions.push('');
  opinions.push(`根据《建筑设计防火规范》及商场管理规定，结合承重计算和通道检测结果，提出以下整改意见：`);
  opinions.push('');
  
  const dangerRisks = risks.filter(r => r.severity === 'danger');
  const warningRisks = risks.filter(r => r.severity === 'warning');
  
  if (dangerRisks.length > 0) {
    opinions.push('## 🔴 必须立即整改');
    opinions.push('');
    dangerRisks.forEach((risk, idx) => {
      const obj = objects.find(o => o.id === risk.objectId);
      opinions.push(`${idx + 1}. **${risk.message}**`);
      opinions.push(`   - 涉及物体：${obj?.name || '未知'}`);
      opinions.push(`   - 依据：${risk.basis}`);
      if (risk.suggestedPosition) {
        opinions.push(`   - 建议位置调整至：(${risk.suggestedPosition[0].toFixed(1)}, ${risk.suggestedPosition[2].toFixed(1)})`);
      }
      opinions.push('');
    });
  }
  
  if (warningRisks.length > 0) {
    opinions.push('## 🟡 建议优化');
    opinions.push('');
    warningRisks.forEach((risk, idx) => {
      const obj = objects.find(o => o.id === risk.objectId);
      opinions.push(`${idx + 1}. ${risk.message}`);
      opinions.push(`   - 涉及物体：${obj?.name || '未知'}`);
      opinions.push(`   - 依据：${risk.basis}`);
      opinions.push('');
    });
  }
  
  if (risks.length === 0) {
    opinions.push('✅ **布展方案符合所有安全规范，可予以通过**');
  } else {
    opinions.push('---');
    opinions.push('');
    opinions.push(`请于 **3个工作日** 内完成整改并重新提交审批。`);
    opinions.push('');
    opinions.push('---');
    opinions.push('');
    opinions.push(generateLoadBasis(objects, mall));
    opinions.push('');
    opinions.push(generatePassageBasis(risks, objects, mall));
  }
  
  return opinions.join('\n');
};
