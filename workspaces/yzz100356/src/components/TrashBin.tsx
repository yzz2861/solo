import React from 'react'
import type { TrashCategory } from '@/types'
import { CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_EMOJIS } from '@/types'

interface TrashBinProps {
  category: TrashCategory
  isHighlighted?: boolean
  isCorrect?: boolean | null
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  onDragLeave?: (e: React.DragEvent) => void
}

const TrashBin: React.FC<TrashBinProps> = ({
  category,
  isHighlighted = false,
  isCorrect = null,
  onDragOver,
  onDrop,
  onDragLeave,
}) => {
  const color = CATEGORY_COLORS[category]
  const label = CATEGORY_LABELS[category]
  const emoji = CATEGORY_EMOJIS[category]

  const getBorderStyle = () => {
    if (isCorrect === true) return 'border-green-500 shadow-green-300'
    if (isCorrect === false) return 'border-red-500 shadow-red-300'
    if (isHighlighted) return 'border-yellow-400 shadow-yellow-300 scale-105'
    return 'border-white/50'
  }

  return (
    <div
      className={`
        relative flex flex-col items-center cursor-pointer
        transition-all duration-300 ease-out
        ${isHighlighted ? 'scale-105' : 'scale-100 hover:scale-102'}
      `}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={onDragLeave}
      data-category={category}
    >
      <div
        className={`
          w-24 h-28 sm:w-28 sm:h-32 md:w-32 md:h-36
          rounded-b-2xl rounded-t-lg
          border-4 ${getBorderStyle()}
          flex flex-col items-center justify-center
          shadow-lg
          transition-all duration-300
          ${isHighlighted ? 'shadow-xl' : ''}
        `}
        style={{ backgroundColor: color }}
      >
        <div className={`text-4xl sm:text-5xl mb-1 transition-transform duration-300 ${isHighlighted ? 'scale-110' : ''}`}>
          {emoji}
        </div>
        <div className="text-white font-bold text-xs sm:text-sm md:text-base drop-shadow-md">
          {label}
        </div>
        
        <div
          className={`
            absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2
            w-20 sm:w-24 md:w-28 h-3 sm:h-4
            rounded-t-lg
            transition-all duration-300
            ${isHighlighted ? 'scale-x-110 -translate-y-3' : ''}
          `}
          style={{ backgroundColor: color, filter: 'brightness(0.9)' }}
        />
      </div>
    </div>
  )
}

export default TrashBin
