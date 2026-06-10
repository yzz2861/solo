import {
  MousePointer2,
  Package,
  Truck,
  Ban,
  Users,
  Route,
  Ruler,
} from 'lucide-react';
import { useSceneStore } from '@/store/useSceneStore';
import type { ToolMode } from '@/types/scene';
import { cn } from '@/lib/utils';

const tools: { mode: ToolMode; icon: typeof MousePointer2; label: string; color: string }[] = [
  { mode: 'select', icon: MousePointer2, label: '选择', color: 'text-white' },
  { mode: 'shelf', icon: Package, label: '货架', color: 'text-blue-400' },
  { mode: 'forklift', icon: Truck, label: '叉车', color: 'text-amber-400' },
  { mode: 'zone_forbidden', icon: Ban, label: '禁行区', color: 'text-red-400' },
  { mode: 'zone_pedestrian', icon: Users, label: '行人通道', color: 'text-yellow-400' },
  { mode: 'path', icon: Route, label: '画路径', color: 'text-cyan-400' },
];

interface ToolbarProps {
  className?: string;
}

export function Toolbar({ className }: ToolbarProps) {
  const { toolMode, setToolMode, isDrawingPath } = useSceneStore();

  return (
    <div
      className={cn(
        'flex flex-col gap-1 p-2 bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700/50 shadow-2xl',
        className,
      )}
    >
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = toolMode === tool.mode;

        return (
          <button
            key={tool.mode}
            onClick={() => setToolMode(tool.mode)}
            className={cn(
              'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
              'hover:bg-slate-800/80',
              isActive && 'bg-orange-500/20 ring-1 ring-orange-500/50',
            )}
            title={tool.label}
          >
            <Icon
              className={cn(
                'w-5 h-5 transition-colors',
                isActive ? 'text-orange-400' : tool.color,
              )}
            />
            <span
              className={cn(
                'text-sm font-medium whitespace-nowrap transition-opacity',
                'opacity-100 w-auto',
              )}
              style={{ color: isActive ? '#fb923c' : undefined }}
            >
              {tool.label}
            </span>

            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-orange-500 rounded-r" />
            )}
          </button>
        );
      })}

      <div className="my-1 border-t border-slate-700/50" />

      {isDrawingPath && (
        <div className="px-3 py-2 text-xs text-cyan-400 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
          <p className="font-medium">正在绘制路径</p>
          <p className="text-cyan-300/70 mt-0.5">点击添加点，双击/回车完成</p>
        </div>
      )}
    </div>
  );
}
