import React, { useState, useRef } from 'react'
import type { TrashItem } from '@/types'

interface DraggableItemProps {
  item: TrashItem
  onDragStart?: (item: TrashItem) => void
  onDragEnd?: () => void
  disabled?: boolean
}

const DraggableItem: React.FC<DraggableItemProps> = ({
  item,
  onDragStart,
  onDragEnd,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const itemRef = useRef<HTMLDivElement>(null)

  const handleDragStart = (e: React.DragEvent) => {
    if (disabled) {
      e.preventDefault()
      return
    }
    setIsDragging(true)
    e.dataTransfer.setData('text/plain', item.id)
    e.dataTransfer.effectAllowed = 'move'
    onDragStart?.(item)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    onDragEnd?.()
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return
    e.preventDefault()
    setIsDragging(true)
    onDragStart?.(item)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    onDragEnd?.()
  }

  return (
    <div
      ref={itemRef}
      draggable={!disabled}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`
        flex flex-col items-center justify-center
        w-20 h-20 sm:w-24 sm:h-24
        bg-white rounded-2xl shadow-lg
        cursor-grab active:cursor-grabbing
        transition-all duration-200
        select-none
        ${isDragging ? 'opacity-50 scale-110 shadow-2xl' : 'hover:scale-105 hover:shadow-xl'}
        ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
        ${item.isEasyToMistake ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}
      `}
    >
      <div className="text-3xl sm:text-4xl mb-1">{item.emoji}</div>
      <div className="text-xs sm:text-sm font-semibold text-gray-700 text-center px-1">
        {item.name}
      </div>
      {item.isEasyToMistake && (
        <div className="absolute -top-2 -right-2 text-xs bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full font-bold">
          易错
        </div>
      )}
    </div>
  )
}

export default DraggableItem
