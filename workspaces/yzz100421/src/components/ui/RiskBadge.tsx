import React from 'react'

interface RiskBadgeProps {
  level: 'low' | 'medium' | 'high' | 'critical'
  children: React.ReactNode
}

/**
 * 风险等级徽章 - 工业科技感风格
 *
 * @param level - 风险等级 (low | medium | high | critical)
 * @param children - 徽章内容
 */
export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, children }) => {
  const levelStyles = {
    low: {
      bg: 'bg-emerald-500/15',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      dot: 'bg-emerald-400',
      glow: 'shadow-emerald-500/20',
    },
    medium: {
      bg: 'bg-yellow-500/15',
      border: 'border-yellow-500/30',
      text: 'text-yellow-400',
      dot: 'bg-yellow-400',
      glow: 'shadow-yellow-500/20',
    },
    high: {
      bg: 'bg-orange-500/15',
      border: 'border-orange-500/30',
      text: 'text-orange-400',
      dot: 'bg-orange-400',
      glow: 'shadow-orange-500/20',
    },
    critical: {
      bg: 'bg-red-500/15',
      border: 'border-red-500/30',
      text: 'text-red-400',
      dot: 'bg-red-400',
      glow: 'shadow-red-500/30',
    },
  }

  const style = levelStyles[level]

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1
        ${style.bg} ${style.border} ${style.text}
        border rounded-md text-xs font-medium
        uppercase tracking-wider
        shadow-md ${style.glow}
      `}
    >
      <span
        className={`
          w-2 h-2 rounded-full ${style.dot}
          animate-pulse
        `}
      />
      {children}
    </span>
  )
}
