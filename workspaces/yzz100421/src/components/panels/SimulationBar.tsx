import React, { useState } from 'react'
import {
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  Clock,
  Truck,
  BatteryCharging,
  Users,
  X,
} from 'lucide-react'
import { SegmentedTabs } from '../ui/SegmentedTabs'
import { useLayoutStore } from '../../store/useLayoutStore'
import type { SimScenario } from '../../types'

/**
 * 底部模拟控制条 - 工业科技感风格
 * 高度 64px，包含场景切换、播放控制、速度调节、状态统计
 */
export const SimulationBar: React.FC = () => {
  const {
    sim,
    startSim,
    pauseSim,
    setSimSpeed,
    setSimScenario,
    setSimState,
  } = useLayoutStore()

  const [showWarnings, setShowWarnings] = useState(false)

  // AGV 状态统计
  const workingCount = sim.agvList.filter((a) => a.state === 'working').length
  const queuingCount = sim.agvList.filter((a) => a.state === 'queuing').length
  const chargingCount = sim.agvList.filter((a) => a.state === 'charging').length

  const warningCount = sim.overflowWarnings.length

  // 格式化模拟时间 (秒 -> 分:秒)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleReset = () => {
    setSimState({
      running: false,
      time: 0,
      agvList: [],
      overflowWarnings: [],
    })
    setShowWarnings(false)
  }

  const speedOptions = [1, 2, 5, 10]

  return (
    <div className="relative h-16 bg-slate-950/80 backdrop-blur-sm border-t border-slate-800/50 flex items-center justify-between px-6">
      {/* 顶部扫描线 */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

      {/* 左侧：场景切换 */}
      <div className="flex items-center gap-4">
        <span className="text-xs text-slate-500 uppercase tracking-wider">场景</span>
        <SegmentedTabs
          tabs={[
            { value: 'peak', label: '高峰' },
            { value: 'offPeak', label: '平峰' },
          ]}
          value={sim.scenario}
          onChange={(v) => setSimScenario(v as SimScenario)}
        />
      </div>

      {/* 中间：播放控制和速度调节 */}
      <div className="flex items-center gap-4">
        {/* 播放/暂停按钮 */}
        <button
          type="button"
          onClick={sim.running ? pauseSim : startSim}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center
            transition-all duration-200 shadow-lg
            ${sim.running
              ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-amber-500/30'
              : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30'
            }
          `}
        >
          {sim.running ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
        </button>

        {/* 速度调节 */}
        <div className="flex items-center gap-1 bg-slate-800/60 rounded-lg p-1 border border-slate-700/50">
          <span className="text-xs text-slate-500 px-2">速度</span>
          {speedOptions.map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => setSimSpeed(speed)}
              className={`
                w-10 h-8 rounded text-xs font-medium
                transition-all duration-200
                ${sim.speed === speed
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }
              `}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* 重置按钮 */}
        <button
          type="button"
          onClick={handleReset}
          className="
            w-10 h-10 rounded-lg flex items-center justify-center
            bg-slate-800/80 text-slate-400 hover:bg-slate-700/80 hover:text-slate-200
            border border-slate-700/50 transition-all duration-200
          "
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* 右侧：时间和状态统计 */}
      <div className="flex items-center gap-6">
        {/* 模拟时间 */}
        <div className="flex items-center gap-2 text-slate-300">
          <Clock size={16} className="text-cyan-500" />
          <span className="text-sm font-mono">{formatTime(sim.time)}</span>
        </div>

        {/* 分隔符 */}
        <div className="w-px h-8 bg-slate-700/50" />

        {/* AGV 状态统计 */}
        <div className="flex items-center gap-4">
          {/* 作业中 */}
          <div className="flex items-center gap-1.5">
            <Truck size={14} className="text-emerald-400" />
            <span className="text-xs text-slate-400">作业</span>
            <span className="text-sm font-mono font-semibold text-emerald-400">
              {workingCount}
            </span>
          </div>

          {/* 排队中 */}
          <div className="flex items-center gap-1.5">
            <Users size={14} className="text-yellow-400" />
            <span className="text-xs text-slate-400">排队</span>
            <span className="text-sm font-mono font-semibold text-yellow-400">
              {queuingCount}
            </span>
          </div>

          {/* 充电中 */}
          <div className="flex items-center gap-1.5">
            <BatteryCharging size={14} className="text-cyan-400" />
            <span className="text-xs text-slate-400">充电</span>
            <span className="text-sm font-mono font-semibold text-cyan-400">
              {chargingCount}
            </span>
          </div>
        </div>

        {/* 分隔符 */}
        <div className="w-px h-8 bg-slate-700/50" />

        {/* 溢出警告 */}
        <button
          type="button"
          onClick={() => setShowWarnings(!showWarnings)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg
            transition-all duration-200
            ${warningCount > 0
              ? 'bg-red-500/15 border border-red-500/30 hover:bg-red-500/25'
              : 'bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50'
            }
          `}
        >
          <AlertTriangle
            size={14}
            className={warningCount > 0 ? 'text-red-400' : 'text-slate-500'}
          />
          <span
            className={`
              text-sm font-mono font-semibold
              ${warningCount > 0 ? 'text-red-400' : 'text-slate-500'}
            `}
          >
            {warningCount}
          </span>
          <span className="text-xs text-slate-400">警告</span>
        </button>
      </div>

      {/* 警告列表弹窗 */}
      {showWarnings && warningCount > 0 && (
        <div className="absolute bottom-full right-6 mb-2 w-80 bg-slate-900/95 backdrop-blur-sm rounded-lg border border-slate-700/50 shadow-xl shadow-black/50 overflow-hidden">
          {/* 弹窗标题 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" />
              <span className="text-sm font-medium text-slate-100">溢出警告列表</span>
            </div>
            <button
              type="button"
              onClick={() => setShowWarnings(false)}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* 警告列表 */}
          <div className="max-h-64 overflow-y-auto">
            {sim.overflowWarnings.map((warning) => (
              <div
                key={warning.id}
                className="px-4 py-3 border-b border-slate-800/50 last:border-b-0 hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    size={14}
                    className={
                      warning.severity === 'danger'
                        ? 'text-red-400 mt-0.5'
                        : 'text-yellow-400 mt-0.5'
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-200 truncate">
                        {warning.entityName}
                      </span>
                      <span
                        className={`
                          text-xs px-1.5 py-0.5 rounded
                          ${warning.severity === 'danger'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                          }
                        `}
                      >
                        {warning.severity === 'danger' ? '严重' : '警告'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      {warning.message}
                    </p>
                    <span className="text-xs text-slate-500 font-mono mt-1 block">
                      T={formatTime(warning.simulationTime ?? sim.time)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
