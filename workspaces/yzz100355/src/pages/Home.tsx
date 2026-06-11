import { useState } from 'react';
import { Scene3D } from '@/components/Scene3D/Scene3D';
import { TimelineControl } from '@/components/Timeline/TimelineControl';
import { ShiftSelector } from '@/components/Panels/ShiftSelector';
import { DetectionPanel } from '@/components/Panels/DetectionPanel';
import { AnnotationPanel } from '@/components/Panels/AnnotationPanel';
import { LayerControl } from '@/components/Panels/LayerControl';
import { DataManagementPanel } from '@/components/Panels/DataManagementPanel';
import { useSceneStore } from '@/store/useSceneStore';
import { Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

type TabType = 'detection' | 'annotation';

export default function Home() {
  const { isLoading, error, actions: { reloadData } } = useSceneStore();
  const [activeTab, setActiveTab] = useState<TabType>('detection');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showDataPanel, setShowDataPanel] = useState(false);

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-primary mx-auto mb-4" />
          <p className="text-white/70">正在加载巡逻数据...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="text-danger mx-auto mb-4" />
          <p className="text-white/70 mb-2">数据加载失败</p>
          <p className="text-white/50 text-sm">{error}</p>
          <button
            onClick={reloadData}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        <div className={cn(
          "w-72 flex-shrink-0 bg-background-dark/50 border-r border-white/10 flex flex-col transition-all duration-300",
          !showSidebar && "w-0 overflow-hidden"
        )}>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <ShiftSelector />
            <LayerControl />
            
            <button
              onClick={() => setShowDataPanel(!showDataPanel)}
              className="w-full text-left p-3 bg-background border border-white/10 rounded-lg hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">数据管理</span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  showDataPanel ? "bg-primary/20 text-primary" : "bg-white/10 text-white/50"
                )}>
                  {showDataPanel ? '展开' : '收起'}
                </span>
              </div>
            </button>
            
            {showDataPanel && <DataManagementPanel />}
          </div>
        </div>

        <div className="flex-1 relative">
          <Scene3D />
          
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="absolute top-4 left-4 z-10 px-2 py-1 bg-background-dark/80 backdrop-blur-sm border border-white/10 rounded text-white/70 hover:text-white hover:bg-background-dark text-xs transition-colors"
          >
            {showSidebar ? '◀ 收起' : '▶ 展开'}
          </button>
        </div>

        <div className="w-80 flex-shrink-0 bg-background-dark/50 border-l border-white/10 flex flex-col">
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveTab('detection')}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium transition-colors",
                activeTab === 'detection'
                  ? "text-primary border-b-2 border-primary"
                  : "text-white/50 hover:text-white/80"
              )}
            >
              异常检测
            </button>
            <button
              onClick={() => setActiveTab('annotation')}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium transition-colors",
                activeTab === 'annotation'
                  ? "text-primary border-b-2 border-primary"
                  : "text-white/50 hover:text-white/80"
              )}
            >
              手动标注
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'detection' ? <DetectionPanel /> : <AnnotationPanel />}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-white/10 bg-background-dark/80 backdrop-blur-sm">
        <TimelineControl />
      </div>
    </div>
  );
}
