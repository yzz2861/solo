import React from 'react'

interface CardProps {
  title?: string
  children: React.ReactNode
  className?: string
  bordered?: boolean
}

/**
 * 基础卡片组件 - 工业科技感风格
 *
 * @param title - 卡片标题
 * @param children - 卡片内容
 * @param className - 自定义类名
 * @param bordered - 是否显示工业风边框
 */
export const Card: React.FC<CardProps> = ({
  title,
  children,
  className = '',
  bordered = true,
}) => {
  return (
    <div
      className={`
        relative bg-slate-900/80 backdrop-blur-sm rounded-lg overflow-hidden
        ${bordered ? 'border border-slate-700/50' : ''}
        ${className}
      `}
    >
      {/* 工业风边角装饰 */}
      {bordered && (
        <>
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-500/60 rounded-tl" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-500/60 rounded-tr" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-500/60 rounded-bl" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-500/60 rounded-br" />
        </>
      )}

      {/* 顶部科技感扫描线 */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

      {title && (
        <div className="relative px-4 py-3 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-cyan-500 rounded-full" />
            <h3 className="text-sm font-semibold text-slate-100 tracking-wider uppercase">
              {title}
            </h3>
          </div>
        </div>
      )}

      <div className="relative p-4">{children}</div>
    </div>
  )
}
