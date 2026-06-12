import React from 'react'
import { Card } from '../ui/Card'
import { InputWithValidation } from '../ui/InputWithValidation'
import { useLayoutStore } from '../../store/useLayoutStore'

/**
 * 左侧参数面板 - 工业科技感风格
 * 宽度 320px，包含 AGV 参数和通道参数两组
 */
export const ParamsPanel: React.FC = () => {
  const {
    agvParams,
    corridorParams,
    validationErrors,
    setAgvParams,
    setCorridorParams,
  } = useLayoutStore()

  return (
    <div className="w-[320px] h-full flex flex-col gap-4 p-4 overflow-y-auto bg-slate-950/50 backdrop-blur-sm">
      {/* AGV 参数组 */}
      <Card title="AGV 参数">
        <div className="space-y-1">
          <InputWithValidation
            label="车体长度"
            value={agvParams.lengthMeters}
            onChange={(v) => setAgvParams({ lengthMeters: v })}
            error={validationErrors.lengthMeters}
            unit="米"
            min={0.5}
            max={5}
            step={0.1}
          />
          <InputWithValidation
            label="车体宽度"
            value={agvParams.widthMeters}
            onChange={(v) => setAgvParams({ widthMeters: v })}
            error={validationErrors.widthMeters}
            unit="米"
            min={0.3}
            max={3}
            step={0.1}
          />
          <InputWithValidation
            label="转弯半径"
            value={agvParams.turningRadius}
            onChange={(v) => setAgvParams({ turningRadius: v })}
            error={validationErrors.turningRadius}
            unit="米"
            min={0}
            step={0.1}
          />
          <InputWithValidation
            label="充电时长"
            value={agvParams.chargeMinutes}
            onChange={(v) => setAgvParams({ chargeMinutes: v })}
            error={validationErrors.chargeMinutes}
            unit="分钟"
            min={5}
            max={180}
            step={1}
          />
          <InputWithValidation
            label="低电量阈值"
            value={agvParams.lowBatteryThreshold}
            onChange={(v) => setAgvParams({ lowBatteryThreshold: v })}
            error={validationErrors.lowBatteryThreshold}
            unit="%"
            min={0}
            max={99}
            step={1}
          />
          <InputWithValidation
            label="高峰车辆数"
            value={agvParams.peakCount}
            onChange={(v) => setAgvParams({ peakCount: v })}
            error={validationErrors.peakCount}
            unit="辆"
            min={0}
            step={1}
          />
          <InputWithValidation
            label="平峰车辆数"
            value={agvParams.offPeakCount}
            onChange={(v) => setAgvParams({ offPeakCount: v })}
            error={validationErrors.offPeakCount}
            unit="辆"
            min={0}
            step={1}
          />
        </div>
      </Card>

      {/* 通道参数组 */}
      <Card title="通道参数">
        <div className="space-y-1">
          <InputWithValidation
            label="主通道宽度"
            value={corridorParams.mainCorridorWidth}
            onChange={(v) => setCorridorParams({ mainCorridorWidth: v })}
            error={validationErrors.mainCorridorWidth}
            unit="米"
            min={1.5}
            step={0.1}
          />
          <InputWithValidation
            label="叉车通道宽度"
            value={corridorParams.forkliftWidth}
            onChange={(v) => setCorridorParams({ forkliftWidth: v })}
            error={validationErrors.forkliftWidth}
            unit="米"
            min={1.2}
            step={0.1}
          />
          <InputWithValidation
            label="消防净空距离"
            value={corridorParams.fireClearance}
            onChange={(v) => setCorridorParams({ fireClearance: v })}
            error={validationErrors.fireClearance}
            unit="米"
            min={1.4}
            step={0.1}
          />
        </div>
      </Card>
    </div>
  )
}
