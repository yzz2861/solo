import React from 'react'

interface TabItem {
  value: string
  label: string
}

interface SegmentedTabsProps {
  tabs: TabItem[]
  value: string
  onChange: (value: string) => void
}

/**
 * 分段标签 - 工业科技感按钮组样式
 *
 * @param tabs - 标签项数组 [{value, label}]
 * @param value - 当前选中值
 * @param onChange - 选中变化回调
 */
export const SegmentedTabs: React.FC<SegmentedTabsProps> = ({
  tabs,
  value,
  onChange,
}) => {
  return (
    <div className="relative inline-flex bg-slate-800/80 backdrop-blur-sm rounded-lg p-0.5 border border-slate-700/50">
      {/* 工业风顶部扫描线 */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent rounded-t-lg" />

      {/* 选中背景指示器 */}
      <div
        className="absolute top-0.5 bottom-0.5 bg-blue-600 rounded-md transition-all duration-300 ease-out shadow-lg shadow-blue-500/25"
        style={{
          left: `calc(${tabs.findIndex((t) => t.value === value) * (100 / tabs.length)}% + 2px)`,
          width: `calc(${100 / tabs.length}% - 4px)`,
        }}
      />

      {/* 标签按钮 */}
      {tabs.map((tab) => {
        const isActive = tab.value === value
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`
              relative z-10 px-4 py-2 text-xs font-medium
              rounded-md transition-all duration-200
              uppercase tracking-wider
              ${isActive
                ? 'text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
              }
            `}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
