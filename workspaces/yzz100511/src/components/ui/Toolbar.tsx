import { useState } from 'react';
import { Box, Car, PanelLeft, Trash2, RotateCcw, PlusCircle } from 'lucide-react';
import { useObjectStore } from '../../store/useObjectStore';
import { cn } from '../../lib/utils';
import type { ObjectType } from '../../types';
import { getObjectName } from '../../utils/mockData';

interface ToolbarProps {
  onAddObject?: (type: ObjectType) => void;
}

export const Toolbar = ({ onAddObject }: ToolbarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<ObjectType | null>(null);
  const { addObject, clearAll, objects } = useObjectStore();

  const tools: Array<{
    type: ObjectType;
    icon: React.ElementType;
    color: string;
    hoverColor: string;
    description: string;
    shortcut?: string;
  }> = [
    {
      type: 'booth',
      icon: Box,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      description: '添加展台',
      shortcut: '双击',
    },
    {
      type: 'car',
      icon: Car,
      color: 'bg-indigo-500',
      hoverColor: 'hover:bg-indigo-600',
      description: '添加车辆',
      shortcut: 'Shift+双击',
    },
    {
      type: 'barrier',
      icon: PanelLeft,
      color: 'bg-slate-500',
      hoverColor: 'hover:bg-slate-600',
      description: '添加围挡',
      shortcut: 'Alt+双击',
    },
  ];

  const handleAdd = (type: ObjectType) => {
    const positions: Record<ObjectType, [number, number, number]> = {
      booth: [0, 0, 0],
      car: [-8, 0, -5],
      barrier: [0, 0, 8],
      power: [0, 0, 0],
      fire_exit: [0, 0, 0],
      entrance: [0, 0, 0],
    };
    
    const count = objects.filter((o) => o.type === type).length;
    const offset = count * 2;
    const basePos = positions[type];
    const pos: [number, number, number] = [
      basePos[0] + offset,
      basePos[1],
      basePos[2] + offset * 0.5,
    ];
    
    if (onAddObject) {
      onAddObject(type);
    } else {
      addObject(type, pos);
    }
  };

  if (isCollapsed) {
    return (
      <div className="absolute left-4 top-4 z-10">
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-12 h-12 bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-600 flex items-center justify-center text-white hover:bg-slate-700 transition-colors shadow-xl"
        >
          <PanelLeft className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute left-4 top-4 z-10 w-72">
      <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div>
            <h3 className="text-sm font-semibold text-white">工具栏</h3>
            <p className="text-xs text-slate-400">点击添加物体到场景</p>
          </div>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 space-y-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isHovered = hoveredItem === tool.type;
            return (
              <button
                key={tool.type}
                onClick={() => handleAdd(tool.type)}
                onMouseEnter={() => setHoveredItem(tool.type)}
                onMouseLeave={() => setHoveredItem(null)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200',
                  'border border-transparent',
                  isHovered
                    ? 'bg-slate-700 border-slate-600 shadow-lg'
                    : 'bg-slate-750 hover:bg-slate-700'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
                    tool.color,
                    isHovered && tool.hoverColor,
                    'shadow-lg'
                  )}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-white">{tool.description}</p>
                  <p className="text-xs text-slate-400">{getObjectName(tool.type)}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs px-2 py-1 rounded bg-slate-600 text-slate-300 font-mono">
                    {tool.shortcut}
                  </span>
                </div>
                {isHovered && (
                  <PlusCircle className="w-4 h-4 text-emerald-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        <div className="px-3 py-2 border-t border-slate-700 bg-slate-850">
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (confirm('确定要清空所有物体吗？此操作不可撤销。')) {
                  clearAll();
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              清空
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              重置
            </button>
          </div>
        </div>

        <div className="px-3 py-3 border-t border-slate-700">
          <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl p-3 border border-blue-500/20">
            <p className="text-xs text-slate-300 leading-relaxed">
              <span className="font-semibold text-blue-400">💡 提示：</span>
              <br />
              双击场景添加展台，<br />
              Shift+双击添加车辆，<br />
              Alt+双击添加围挡。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
