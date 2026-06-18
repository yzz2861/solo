import { useRef, useEffect } from 'react';
import { Scene } from '../components/three/Scene';
import { Toolbar } from '../components/ui/Toolbar';
import { PropertyPanel } from '../components/ui/PropertyPanel';
import { RiskList } from '../components/ui/RiskList';
import { useRiskDetection } from '../hooks/useRiskDetection';
import { useObjectStore } from '../store/useObjectStore';
import { useMallStore } from '../store/useMallStore';
import { Info } from 'lucide-react';

export default function Index() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { objects } = useObjectStore();
  const { config } = useMallStore();

  useRiskDetection();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { selectedId, removeObject } = useObjectStore.getState();
        if (selectedId) {
          const obj = useObjectStore.getState().objects.find((o) => o.id === selectedId);
          if (obj && confirm(`确定要删除"${obj.name}"吗？`)) {
            removeObject(selectedId);
          }
        }
      }
      if (e.key === 'Escape') {
        useObjectStore.getState().selectObject(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCanvasReady = (canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
  };

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden">
      <div className="absolute inset-0">
        <Scene onCanvasReady={handleCanvasReady} />
      </div>

      <Toolbar />
      <PropertyPanel />
      <RiskList />

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl px-5 py-2.5 border border-slate-700 shadow-xl flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-400">中庭尺寸</span>
            <span className="text-sm text-white font-mono">
              {config.atriumDimensions.width}m × {config.atriumDimensions.depth}m
            </span>
          </div>
          <div className="w-px h-6 bg-slate-700" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">承重限值</span>
            <span className="text-sm text-white font-mono">
              {config.floorLoadCapacity} kN/m²
            </span>
          </div>
          <div className="w-px h-6 bg-slate-700" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">展具数量</span>
            <span className="text-sm text-white font-mono">{objects.length}</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-24 right-4 z-10">
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 border border-slate-700 shadow-xl max-w-xs">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white">操作指南</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-400">
            <p><span className="text-slate-300 font-mono">左键拖拽</span> 旋转视角</p>
            <p><span className="text-slate-300 font-mono">滚轮</span> 缩放</p>
            <p><span className="text-slate-300 font-mono">右键拖拽</span> 平移</p>
            <p><span className="text-slate-300 font-mono">单击</span> 选中物体</p>
            <p><span className="text-slate-300 font-mono">拖拽物体</span> 移动位置</p>
            <p><span className="text-slate-300 font-mono">Delete</span> 删除选中物体</p>
            <p><span className="text-slate-300 font-mono">Esc</span> 取消选中</p>
          </div>
        </div>
      </div>
    </div>
  );
}
