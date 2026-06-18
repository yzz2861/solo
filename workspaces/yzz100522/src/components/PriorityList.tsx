import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import type { Casualty, StudentAnswer, TriageLevel } from '../types';
import { getLevelColorClass, getLevelShortLabel } from '../utils/scoring';
import { cn } from '../lib/utils';

interface SortableItemProps {
  casualty: Casualty;
  answer: StudentAnswer;
  index: number;
}

function SortableItem({ casualty, answer, index }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: casualty.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-3 bg-white rounded-lg border shadow-sm mb-2 transition-all',
        isDragging && 'shadow-xl scale-105 z-50 opacity-90',
        getLevelBorderColor(answer.selectedLevel as TriageLevel)
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600"
      >
        <GripVertical size={20} />
      </div>
      
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold text-sm">
        {index + 1}
      </div>
      
      <div className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold',
        casualty.gender === 'male' ? 'bg-blue-400' : 'bg-pink-400'
      )}>
        {casualty.name.charAt(0)}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 truncate">{casualty.name}</p>
        <p className="text-xs text-gray-500">
          {casualty.age}岁 · {casualty.gender === 'male' ? '男' : '女'}
        </p>
      </div>
      
      <span className={cn(
        'px-3 py-1 rounded-full text-xs font-semibold',
        getLevelColorClass(answer.selectedLevel as TriageLevel)
      )}>
        {getLevelShortLabel(answer.selectedLevel as TriageLevel)}
      </span>
    </div>
  );
}

interface PriorityListProps {
  casualties: Casualty[];
  answers: StudentAnswer[];
  onReorder: (orderedIds: string[]) => void;
}

export default function PriorityList({ casualties, answers, onReorder }: PriorityListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const sortedCasualties = [...casualties].sort((a, b) => {
    const answerA = answers.find(ans => ans.casualtyId === a.id);
    const answerB = answers.find(ans => ans.casualtyId === b.id);
    return (answerA?.priority || 999) - (answerB?.priority || 999);
  });
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = sortedCasualties.findIndex(c => c.id === active.id);
      const newIndex = sortedCasualties.findIndex(c => c.id === over.id);
      const newSorted = arrayMove(sortedCasualties, oldIndex, newIndex);
      onReorder(newSorted.map(c => c.id));
    }
  };
  
  const moveUp = (index: number) => {
    if (index > 0) {
      const newSorted = arrayMove(sortedCasualties, index, index - 1);
      onReorder(newSorted.map(c => c.id));
    }
  };
  
  const moveDown = (index: number) => {
    if (index < sortedCasualties.length - 1) {
      const newSorted = arrayMove(sortedCasualties, index, index + 1);
      onReorder(newSorted.map(c => c.id));
    }
  };
  
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
        <span className="text-lg">📋</span>
        处理优先级排序
        <span className="text-sm font-normal text-gray-500">（拖拽调整顺序，越靠前越先处理）</span>
      </h3>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedCasualties.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1 max-h-96 overflow-y-auto pr-2">
            {sortedCasualties.map((casualty, index) => {
              const answer = answers.find(a => a.casualtyId === casualty.id);
              if (!answer) return null;
              return (
                <div key={casualty.id} className="relative">
                  <SortableItem
                    casualty={casualty}
                    answer={answer}
                    index={index}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="p-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-30"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === sortedCasualties.length - 1}
                      className="p-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-30"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
      
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          红色 第1优先
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-amber-500"></span>
          黄色 第2优先
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
          绿色 第3优先
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-gray-800"></span>
          黑色 最后
        </span>
      </div>
    </div>
  );
}

function getLevelBorderColor(level: TriageLevel): string {
  const colors: Record<TriageLevel, string> = {
    red: 'border-l-4 border-red-500',
    yellow: 'border-l-4 border-amber-500',
    green: 'border-l-4 border-emerald-500',
    black: 'border-l-4 border-gray-800',
  };
  return colors[level];
}
