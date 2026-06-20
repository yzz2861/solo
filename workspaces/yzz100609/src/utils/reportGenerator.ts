export interface ReportData {
  input: import('./heatLoadCalc').HeatLoadInput;
  result: import('./heatLoadCalc').HeatLoadResult;
  simulation?: import('./heatLoadCalc').SimulationResult;
  timestamp: number;
}

export function generateManagerReport(data: ReportData): string {
  const { input, result, simulation, timestamp } = data;
  const date = new Date(timestamp).toLocaleDateString('zh-CN');
  const riskText = { safe: '安全', caution: '需注意', danger: '危险' };
  const riskEmoji = { safe: '✅', caution: '⚠️', danger: '🚨' };

  let report = `
═══════════════════════════════════════════════
     冷库开门热负荷估算报告（库管版）
═══════════════════════════════════════════════
报告日期：${date}

一、冷库基本信息
───────────────────────────────────────────────
  库容：${input.volume} 立方米
  目标温度：${input.targetTemp}°C
  外界温度：${input.ambientTemp}°C
  外界湿度：${input.ambientHumidity}%
  进货温度：${input.goodsTemp}°C

二、开门情况
───────────────────────────────────────────────
  门洞尺寸：${input.doorWidth}m × ${input.doorHeight}m
  每天开门次数：${input.openCount} 次
  平均开门时长：${formatDuration(input.avgOpenDuration)}
  每日开门累计：${formatDuration(result.totalOpenTime)}
  门洞面积：${result.doorArea.toFixed(2)} 平方米

三、热负荷评估
───────────────────────────────────────────────
  开门造成的额外热负荷：${result.totalHeat.toFixed(2)} kW
  每日额外耗电量：${result.dailyEnergy.toFixed(1)} kWh

  其中：
    • 显热负荷（温差导致）：${result.sensibleHeat.toFixed(2)} kW
    • 潜热负荷（水汽导致）：${result.latentHeat.toFixed(2)} kW
    • 进货热负荷：${result.goodsHeat.toFixed(2)} kW

四、温升风险评估 ${riskEmoji[result.riskLevel]}
───────────────────────────────────────────────
  风险等级：${riskText[result.riskLevel]}
  预估库内温升：${result.tempRise.toFixed(1)}°C

  ${result.riskLevel === 'danger'
    ? '【严重警告】当前开门习惯将导致库温明显上升！货物品质和食品安全面临风险。必须立即减少开门次数和时长！'
    : result.riskLevel === 'caution'
    ? '【提醒】当前开门习惯会导致库温波动，建议优化开门操作。'
    : '当前开门习惯对库温影响在可控范围内。'
  }

五、通俗解释——为什么开门影响这么大？
───────────────────────────────────────────────
  内外温差达到 ${result.deltaT.toFixed(0)}°C，
  每次开门，热空气就像开闸放水一样涌入冷库。
  ${input.ambientHumidity > 70
    ? `而且外界湿度高达 ${input.ambientHumidity}%，大量水汽进入后在蒸发器上结霜，进一步降低制冷效果。\n`
    : ''}
  ${input.avgOpenDuration > 180
    ? `开门时间超过3分钟，冷气流失量急剧增加——第1分钟冷气流失约30%，3分钟后已流失超过60%！\n`
    : ''}
  累计每天开门 ${formatDuration(result.totalOpenTime)}，
  相当于冷库"敞着门"的时间占了全天的 ${(result.totalOpenTime / 86400 * 100).toFixed(1)}%。
`;

  if (simulation) {
    report += `
六、减少开门的收益 ${simulation.heatReductionPercent > 0 ? '💰' : ''}
───────────────────────────────────────────────
  如果将开门次数从 ${input.openCount} 次减少到 ${simulation.reducedCount} 次，
  平均开门时长从 ${formatDuration(input.avgOpenDuration)} 缩短到 ${formatDuration(simulation.reducedDuration)}：

  • 热负荷减少：${simulation.heatReduction.toFixed(2)} kW（降低 ${simulation.heatReductionPercent.toFixed(1)}%）
  • 库温上升减少：${simulation.tempRiseReduction.toFixed(1)}°C
  • 每日节电：${simulation.dailyEnergySaving.toFixed(1)} kWh
  • 年度节电：${simulation.annualEnergySaving.toFixed(0)} kWh
  • 年度节省电费：约 ${simulation.annualCostSaving.toFixed(0)} 元
  • 压缩机负荷率：从 ${simulation.originalLoadRate.toFixed(0)}% 降至 ${simulation.simulatedLoadRate.toFixed(0)}%
`;
  }

  report += `
七、操作建议
───────────────────────────────────────────────
  1. 出入库做到"快进快出"，尽量控制在3分钟以内
  2. 减少不必要的开门次数，合并装卸作业
  3. 安装门帘或风幕机，减少冷气外泄
  4. 高温高湿天气尤其要注意缩短开门时间
  5. 进货温度尽量预冷，减少进货热负荷

═══════════════════════════════════════════════
  本报告由冷库开门热负荷估算工具生成
  供库管人员参考，用于班组培训和日常管理
═══════════════════════════════════════════════
`;
  return report;
}

export function generateTechnicalReport(data: ReportData): string {
  const { input, result, simulation, timestamp } = data;
  const date = new Date(timestamp).toLocaleDateString('zh-CN');

  let report = `
═══════════════════════════════════════════════
     冷库开门热负荷估算报告（设备版）
═══════════════════════════════════════════════
报告日期：${date}

一、输入参数
───────────────────────────────────────────────
  库容 V = ${input.volume} m³
  目标温度 T_target = ${input.targetTemp}°C
  外界温度 T_ambient = ${input.ambientTemp}°C
  外界湿度 RH = ${input.ambientHumidity}%
  门洞宽度 W = ${input.doorWidth} m
  门洞高度 H = ${input.doorHeight} m
  开门次数 N = ${input.openCount} 次/天
  平均开门时长 t_avg = ${input.avgOpenDuration} s (${formatDuration(input.avgOpenDuration)})
  进货温度 T_goods = ${input.goodsTemp}°C
  进货量 m_goods = ${input.goodsWeight} kg/天

二、计算假设与中间参数
───────────────────────────────────────────────
  空气密度 ρ = ${result.airDensity.toFixed(4)} kg/m³
  空气比热容 c_p = 1.006 kJ/(kg·K)
  门洞面积 A_door = ${result.doorArea.toFixed(2)} m²
  日累计开门时间 t_total = ${result.totalOpenTime} s (${formatDuration(result.totalOpenTime)})
  内外温差 ΔT = ${result.deltaT.toFixed(1)}°C
  渗透修正系数 f = ${result.infiltrationFactor.toFixed(4)}

  外界空气焓值 h_out = ${result.hOut.toFixed(2)} kJ/kg
  库内空气焓值 h_in = ${result.hIn.toFixed(2)} kJ/kg
  外界含湿量 w_out = ${result.wOut.toFixed(5)} kg/kg
  库内含湿量 w_in = ${result.wIn.toFixed(5)} kg/kg

  冷凝温度 T_cond = ${result.condensingTemp.toFixed(1)}°C
  蒸发温度 T_evap = ${result.evaporatingTemp.toFixed(1)}°C

三、热负荷计算结果
───────────────────────────────────────────────
  Q_sensible = ρ × V_exchange × c_p × ΔT / t_day
             = ${result.sensibleHeat.toFixed(4)} kW

  Q_latent = ρ × V_exchange × (h_out - h_in) / t_day
           = ${result.latentHeat.toFixed(4)} kW

  Q_goods = m_goods × c_goods × (T_goods - T_target) / t_day
          = ${result.goodsHeat.toFixed(4)} kW

  Q_total = Q_sensible + Q_latent + Q_goods
          = ${result.totalHeat.toFixed(4)} kW

  日累计热量 = Q_total × 24h = ${result.dailyEnergy.toFixed(2)} kWh

四、压缩机评估
───────────────────────────────────────────────
  低压侧估算压力 = ${result.compressorPressure.toFixed(3)} MPa
  高压侧估算压力 = ${result.compressorPressureHigh.toFixed(3)} MPa
  压缩机负荷率 = ${result.loadRate.toFixed(1)}%
  ${result.loadRate > 100 ? '⚠ 负荷率超过100%，压缩机可能无法维持目标温度！' : ''}

五、温升风险
───────────────────────────────────────────────
  预估库内温升 = ${result.tempRise.toFixed(2)}°C
  风险等级 = ${result.riskLevel === 'safe' ? '安全 (<2°C)' : result.riskLevel === 'caution' ? '需注意 (2~5°C)' : '危险 (>5°C)'}

六、计算说明
───────────────────────────────────────────────
  1. 焓值计算基于 ASHRAE 简化模型：
     h = 1.006×T + (2501 + 1.86×T)×W
     W = 0.622×P_v/(P_atm - P_v)
  2. 饱和蒸汽压采用 Magnus 公式：
     P_sat = 0.61078×exp(17.27×T/(T+237.3))
  3. 渗透修正系数 f = min(1, A_door/(2.5×√V))
  4. 货物比热容取默认值 2.0 kJ/(kg·K)（混合货物均值）
  5. 压缩机压力基于 R22 制冷剂简化模型估算
  6. COP 估算值取 3.0，电价按 0.85 元/kWh 计算
`;

  if (simulation) {
    report += `
七、改善模拟
───────────────────────────────────────────────
  模拟方案：开门次数 ${input.openCount}→${simulation.reducedCount}，
  平均时长 ${formatDuration(input.avgOpenDuration)}→${formatDuration(simulation.reducedDuration)}

  改善后总热负荷：${simulation.simulatedTotalHeat.toFixed(4)} kW（减少 ${simulation.heatReductionPercent.toFixed(1)}%）
  改善后温升：${simulation.simulatedTempRise.toFixed(2)}°C（减少 ${simulation.tempRiseReduction.toFixed(2)}°C）
  日节电量：${simulation.dailyEnergySaving.toFixed(2)} kWh
  年节电量：${simulation.annualEnergySaving.toFixed(0)} kWh
  年节省电费：${simulation.annualCostSaving.toFixed(0)} 元
  负荷率：${simulation.originalLoadRate.toFixed(1)}%→${simulation.simulatedLoadRate.toFixed(1)}%
`;
  }

  report += `
═══════════════════════════════════════════════
  本报告由冷库开门热负荷估算工具生成
  保留完整计算假设，供设备运维人员参考
═══════════════════════════════════════════════
`;
  return report;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  if (minutes === 0) return `${seconds}秒`;
  if (seconds === 0) return `${minutes}分`;
  return `${minutes}分${seconds}秒`;
}
