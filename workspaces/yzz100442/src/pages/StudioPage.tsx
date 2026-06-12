import { useState, useEffect } from 'react';
import { TopToolbar } from '@/components/layout/TopToolbar';
import { LeftSidebar } from '@/components/layout/LeftSidebar';
import { RightPanel } from '@/components/layout/RightPanel';
import { BottomBar } from '@/components/layout/BottomBar';
import { StudioCanvas } from '@/three/StudioCanvas';
import { useStudioStore } from '@/store/useStudioStore';

type ViewMode = 'perspective' | 'top' | 'front' | 'side';

export function StudioPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('perspective');
  const init = useStudioStore((state) => state.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden">
      <TopToolbar viewMode={viewMode} onViewChange={setViewMode} />

      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar />

        <div className="flex-1 relative">
          <StudioCanvas viewMode={viewMode} />

          <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-2 bg-slate-900/80 backdrop-blur-sm rounded-lg border border-slate-700/50 text-xs text-slate-400">
            <span className="text-slate-500">操作：</span>
            <span>左键选中</span>
            <span className="text-slate-600">·</span>
            <span>拖拽移动</span>
            <span className="text-slate-600">·</span>
            <span>滚轮缩放</span>
            <span className="text-slate-600">·</span>
            <span>右键旋转</span>
          </div>
        </div>

        <RightPanel />
      </div>

      <BottomBar />
    </div>
  );
}
