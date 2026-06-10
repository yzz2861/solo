import { ChefHat, FileText, Monitor } from 'lucide-react';
import { useRecipeStore } from '@/store';
import type { ResultView } from '@/types';
import { KitchenView } from './KitchenView';
import { ManagerView } from './ManagerView';
import { WorkstationView } from './WorkstationView';

interface TabConfig {
  key: ResultView;
  label: string;
  icon: typeof ChefHat;
  description: string;
  activeClass: string;
}

const tabs: TabConfig[] = [
  {
    key: 'kitchen',
    label: '后厨版',
    icon: ChefHat,
    description: '简洁称量单',
    activeClass: 'bg-bakery-green text-white shadow-lg',
  },
  {
    key: 'manager',
    label: '店长版',
    icon: FileText,
    description: '完整计算过程',
    activeClass: 'bg-bakery-brown text-white shadow-lg',
  },
  {
    key: 'workstation',
    label: '操作台',
    icon: Monitor,
    description: '大字全屏展示',
    activeClass: 'bg-bakery-water text-white shadow-lg',
  },
];

export function ResultTabs() {
  const activeView = useRecipeStore((s) => s.activeView);
  const setActiveView = useRecipeStore((s) => s.setActiveView);
  const isFullscreen = useRecipeStore((s) => s.isFullscreenWorkstation);

  if (isFullscreen && activeView === 'workstation') {
    return <WorkstationView />;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="no-print flex gap-2 mb-4">
        {tabs.map((tab) => {
          const isActive = activeView === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all ${
                isActive
                  ? tab.activeClass
                  : 'bg-white text-bakery-brown/60 hover:bg-bakery-cream/50 border border-bakery-brown/10'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <div className="text-left">
                <div className={`font-bold ${isActive ? '' : 'text-sm'}`}>
                  {tab.label}
                </div>
                <div className={`text-xs ${isActive ? 'text-white/80' : ''}`}>
                  {tab.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0 animate-fade-in">
        {activeView === 'kitchen' && <KitchenView />}
        {activeView === 'manager' && <ManagerView />}
        {activeView === 'workstation' && <WorkstationView />}
      </div>
    </div>
  );
}
