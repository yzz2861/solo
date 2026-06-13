import { useNavigate, useParams } from 'react-router-dom';
import { useSignageStore } from '@/store/signageStore';
import {
  ArrowLeft, Save, Download, HardHat, ShieldCheck, UserCircle2, Building2, ChevronDown, Eye,
  ZoomIn, ZoomOut, Maximize2, RotateCcw, FileText,
} from 'lucide-react';
import { FLOOR_LIST } from '@/types';

interface TopNavProps {
  viewMode: 'perspective' | 'top' | 'front';
  setViewMode: (v: 'perspective' | 'top' | 'front') => void;
  onResetCamera: () => void;
}

export default function TopNav({ viewMode, setViewMode, onResetCamera }: TopNavProps) {
  const navigate = useNavigate();
  const params = useParams();
  const { schemes, activeSchemeId, setCurrentFloor, setCurrentRole } = useSignageStore();
  const scheme = activeSchemeId ? schemes[activeSchemeId] : null;
  const schemeId = params.schemeId || activeSchemeId;

  const totalSigns = scheme ? FLOOR_LIST.reduce((a, f) => a + (scheme.signs[f]?.length || 0), 0) : 0;

  const viewLabels = [
    { k: 'perspective', lbl: '透视', icon: Eye },
    { k: 'top', lbl: '俯视', icon: Maximize2 },
    { k: 'front', lbl: '正视', icon: ZoomIn },
  ] as const;

  if (!scheme || !schemeId) return null;

  return (
    <div className="h-14 shrink-0 flex items-center justify-between px-4 bg-white border-b border-surface-3/60 shadow-sm z-10">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/')} className="app-btn-ghost !px-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="h-8 w-px bg-surface-3" />
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center shadow-sm">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[15px] font-semibold text-surface-strong leading-tight">{scheme.name}</div>
            <div className="text-[11px] text-surface-muted leading-tight flex items-center gap-2">
              <span>ID: {scheme.id.slice(0, 10)}</span>
              <span>·</span>
              <span>{totalSigns} 个标牌</span>
            </div>
          </div>
        </div>
        <div className="h-8 w-px bg-surface-3 mx-1" />
        <div className="flex items-center gap-1 bg-surface-2 rounded-lg p-1">
          {FLOOR_LIST.map((f) => (
            <button
              key={f}
              onClick={() => setCurrentFloor(schemeId, f)}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition ${scheme.currentFloor === f ? 'bg-white text-brand-700 shadow-sm' : 'text-surface-muted hover:text-surface-strong'}`}
            >
              {f}F
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-surface-2 rounded-lg p-1 mr-2">
          {viewLabels.map(({ k, lbl, icon: Icon }) => (
            <button key={k} onClick={() => setViewMode(k)}
              title={lbl}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition ${viewMode === k ? 'bg-white text-brand-700 shadow-sm' : 'text-surface-muted hover:text-surface-strong'}`}>
              <Icon className="w-3.5 h-3.5" />{lbl}
            </button>
          ))}
          <div className="w-px h-5 bg-surface-4 mx-0.5" />
          <button onClick={onResetCamera} title="重置视角" className="px-2 py-1.5 rounded-md text-surface-muted hover:text-brand-700 hover:bg-white transition">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="relative mr-2">
          <select
            value={scheme.currentRole}
            onChange={(e) => setCurrentRole(schemeId, e.target.value as any)}
            className="app-input !pr-8 !py-1.5 text-xs appearance-none cursor-pointer bg-surface-2 hover:bg-white"
          >
            <option value="admin">👤 物业管理员</option>
            <option value="worker">👷 施工人员</option>
            <option value="staff">🛡️ 保洁/安保</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-surface-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <button onClick={() => navigate(`/construction/${schemeId}`)} className="app-btn-secondary">
          <HardHat className="w-4 h-4" />施工回填
        </button>
        <button onClick={() => navigate(`/inspection/${schemeId}`)} className="app-btn-secondary">
          <ShieldCheck className="w-4 h-4" />巡检注意
        </button>
        <button onClick={() => navigate(`/export/${schemeId}`)} className="app-btn-primary">
          <FileText className="w-4 h-4" />导出清单
        </button>
      </div>
    </div>
  );
}
