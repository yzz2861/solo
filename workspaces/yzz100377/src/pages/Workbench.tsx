import { useEffect, useState } from 'react';
import { Scene } from '@/three/Scene';
import { Toolbar } from '@/components/Toolbar';
import { PropertyPanel } from '@/components/PropertyPanel';
import { StatusBar } from '@/components/StatusBar';
import { TopNav } from '@/components/TopNav';
import { SchemeManager } from '@/components/SchemeManager';
import { ExportReport } from '@/components/ExportReport';
import { BriefingMode } from '@/components/BriefingMode';
import { useSceneStore } from '@/store/useSceneStore';
import { cn } from '@/lib/utils';

export function Workbench() {
  const [showSchemes, setShowSchemes] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const { isBriefingMode, enterBriefingMode, exitBriefingMode, loadFromLocalStorage, initializeScene } = useSceneStore();

  useEffect(() => {
    loadFromLocalStorage();
    initializeScene();
  }, [loadFromLocalStorage, initializeScene]);

  const handleToggleBriefing = () => {
    if (isBriefingMode) {
      exitBriefingMode();
    } else {
      enterBriefingMode();
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden">
      <TopNav
        onOpenSchemes={() => setShowSchemes(true)}
        onOpenExport={() => setShowExport(true)}
        onToggleBriefing={handleToggleBriefing}
      />

      <div className="flex-1 relative flex overflow-hidden">
        <div className="absolute left-4 top-4 z-10">
          <Toolbar />
        </div>

        <div className="absolute right-4 top-4 z-10">
          <PropertyPanel />
        </div>

        <div className="flex-1 relative">
          <Scene className="w-full h-full" />

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <StatusBar />
          </div>

          <div className="absolute bottom-4 right-4 z-10 text-xs text-slate-500 bg-slate-900/60 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-700/50">
            <p>左键拖拽: 旋转视角</p>
            <p>右键拖拽: 平移</p>
            <p>滚轮: 缩放</p>
            <p>Del: 删除选中</p>
            <p>Esc: 取消/退出</p>
          </div>
        </div>
      </div>

      <SchemeManager isOpen={showSchemes} onClose={() => setShowSchemes(false)} />
      <ExportReport isOpen={showExport} onClose={() => setShowExport(false)} />
      <BriefingMode isOpen={isBriefingMode} onClose={exitBriefingMode} />
    </div>
  );
}
