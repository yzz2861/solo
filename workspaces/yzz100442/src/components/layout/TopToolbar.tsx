import { useState } from 'react';
import {
  Save,
  Upload,
  FolderOpen,
  Undo2,
  Redo2,
  Eye,
  Grid3X3,
  Layers,
  Camera,
  Box,
  LayoutDashboard,
  ChevronDown,
  Plus,
} from 'lucide-react';
import { useStudioStore } from '@/store/useStudioStore';
import { SchemeModal } from '../schemes/SchemeModal';

interface TopToolbarProps {
  viewMode: 'perspective' | 'top' | 'front' | 'side';
  onViewChange: (mode: 'perspective' | 'top' | 'front' | 'side') => void;
}

export function TopToolbar({ viewMode, onViewChange }: TopToolbarProps) {
  const [showSchemeModal, setShowSchemeModal] = useState(false);
  const [showViewDropdown, setShowViewDropdown] = useState(false);

  const { currentScheme, schemes, loadScheme, undo, redo, showGrid, showFrustum, showLightRange, setShowGrid, setShowFrustum, setShowLightRange } =
    useStudioStore();

  const viewLabels = {
    perspective: '透视图',
    top: '顶视图',
    front: '正视图',
    side: '侧视图',
  };

  const viewIcons = {
    perspective: LayoutDashboard,
    top: Grid3X3,
    front: Box,
    side: Box,
  };

  const ViewIcon = viewIcons[viewMode];

  return (
    <div className="h-14 bg-slate-900/90 border-b border-slate-700/50 flex items-center px-4 gap-2 backdrop-blur-sm">
      <div className="flex items-center gap-2 mr-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
          <Camera className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white font-mono">LIVE STUDIO PLANNER</h1>
          <p className="text-[10px] text-slate-400">直播棚机位推演</p>
        </div>
      </div>

      <div className="h-8 w-px bg-slate-700 mx-2" />

      <div className="relative">
        <button
          onClick={() => setShowSchemeModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-sm text-slate-200 transition-colors"
        >
          <FolderOpen className="w-4 h-4" />
          <span className="max-w-[180px] truncate">{currentScheme?.name || '无方案'}</span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="h-8 w-px bg-slate-700 mx-2" />

      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          className="p-2 hover:bg-slate-800 rounded-md text-slate-300 hover:text-white transition-colors"
          title="撤销"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={redo}
          className="p-2 hover:bg-slate-800 rounded-md text-slate-300 hover:text-white transition-colors"
          title="重做"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      <div className="h-8 w-px bg-slate-700 mx-2" />

      <div className="flex items-center gap-1 bg-slate-800/50 rounded-md p-0.5">
        {(['perspective', 'top', 'front', 'side'] as const).map((mode) => {
          const Icon = viewIcons[mode];
          return (
            <button
              key={mode}
              onClick={() => onViewChange(mode)}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
              title={viewLabels[mode]}
            >
              {viewLabels[mode]}
            </button>
          );
        })}
      </div>

      <div className="h-8 w-px bg-slate-700 mx-2" />

      <div className="flex items-center gap-1">
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`p-2 rounded-md transition-colors ${
            showGrid ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="显示网格"
        >
          <Grid3X3 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowFrustum(!showFrustum)}
          className={`p-2 rounded-md transition-colors ${
            showFrustum ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="显示视锥"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowLightRange(!showLightRange)}
          className={`p-2 rounded-md transition-colors ${
            showLightRange ? 'bg-amber-600/20 text-amber-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="显示照明范围"
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowSchemeModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-sm text-slate-200 transition-colors"
        >
          <Save className="w-4 h-4" />
          保存方案
        </button>
        <button
          onClick={() => setShowSchemeModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-md text-sm text-white transition-colors"
        >
          <Plus className="w-4 h-4" />
          新建方案
        </button>
      </div>

      {showSchemeModal && <SchemeModal onClose={() => setShowSchemeModal(false)} />}
    </div>
  );
}
