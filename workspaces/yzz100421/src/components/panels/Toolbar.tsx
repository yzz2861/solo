import React, { useState } from 'react'
import {
  MousePointer2,
  Battery,
  ListOrdered,
  User,
  DoorOpen,
  Route,
  Ban,
  Save,
  GitCompare,
  FileDown,
} from 'lucide-react'
import type { ToolMode } from '../../types'
import { useLayoutStore } from '../../store/useLayoutStore'

interface ToolButtonProps {
  mode: ToolMode
  icon: React.ReactNode
  label: string
  activeMode: ToolMode
  onClick: (mode: ToolMode) => void
}

const ToolButton: React.FC<ToolButtonProps> = ({
  mode,
  icon,
  label,
  activeMode,
  onClick,
}) => {
  const isActive = activeMode === mode

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={() => onClick(mode)}
        className={`
          w-12 h-12 rounded-lg flex items-center justify-center
          transition-all duration-200
          ${isActive
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
            : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700/80 hover:text-slate-200 border border-slate-700/50'
          }
        `}
      >
        {icon}
      </button>

      {/* Tooltip */}
      <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-slate-800 text-xs text-slate-100 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50 border border-slate-600/50">
        {label}
        {/* 箭头 */}
        <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-800" />
      </div>
    </div>
  )
}

interface ActionButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  onClick,
  variant = 'secondary',
}) => {
  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        className={`
          w-12 h-12 rounded-lg flex items-center justify-center
          transition-all duration-200
          ${variant === 'primary'
            ? 'bg-cyan-600/80 text-white hover:bg-cyan-500 shadow-lg shadow-cyan-500/20 border border-cyan-500/30'
            : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700/80 hover:text-slate-200 border border-slate-700/50'
          }
        `}
      >
        {icon}
      </button>

      {/* Tooltip */}
      <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-slate-800 text-xs text-slate-100 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50 border border-slate-600/50">
        {label}
        <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-800" />
      </div>
    </div>
  )
}

/**
 * 右侧工具栏 - 工业科技感风格
 * 宽度 64px，垂直排列图标按钮
 */
export const Toolbar: React.FC = () => {
  const {
    toolMode,
    setToolMode,
    toggleSchemeManager,
    toggleComparison,
    toggleExport,
  } = useLayoutStore()

  const tools: { mode: ToolMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'select', icon: <MousePointer2 size={20} />, label: '选择工具' },
    { mode: 'add-charger', icon: <Battery size={20} />, label: '添加充电桩' },
    { mode: 'add-wait', icon: <ListOrdered size={20} />, label: '添加等待区' },
    { mode: 'add-ped', icon: <User size={20} />, label: '添加行人通道' },
    { mode: 'add-door', icon: <DoorOpen size={20} />, label: '添加消防门' },
    { mode: 'add-path', icon: <Route size={20} />, label: '添加AGV路径' },
    { mode: 'add-forbidden', icon: <Ban size={20} />, label: '添加禁区' },
  ]

  return (
    <div className="w-16 h-full flex flex-col items-center py-4 gap-2 bg-slate-950/50 backdrop-blur-sm border-l border-slate-800/50">
      {/* 顶部扫描线 */}
      <div className="absolute top-0 right-0 w-16 h-px bg-gradient-to-l from-transparent via-cyan-500/30 to-transparent" />

      {/* 工具模式按钮组 */}
      <div className="flex flex-col gap-2">
        {tools.map((tool) => (
          <ToolButton
            key={tool.mode}
            mode={tool.mode}
            icon={tool.icon}
            label={tool.label}
            activeMode={toolMode}
            onClick={setToolMode}
          />
        ))}
      </div>

      {/* 分隔线 */}
      <div className="w-10 h-px bg-slate-700/50 my-2" />

      {/* 功能按钮组 */}
      <div className="flex flex-col gap-2 mt-auto">
        <ActionButton
          icon={<Save size={20} />}
          label="保存方案"
          onClick={toggleSchemeManager}
          variant="primary"
        />
        <ActionButton
          icon={<GitCompare size={20} />}
          label="方案对比"
          onClick={toggleComparison}
        />
        <ActionButton
          icon={<FileDown size={20} />}
          label="导出报告"
          onClick={toggleExport}
        />
      </div>
    </div>
  )
}
