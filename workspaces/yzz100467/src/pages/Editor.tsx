import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSignageStore } from '@/store/signageStore';
import EditorScene from '@/components/three/EditorScene';
import SignLibraryPanel from '@/components/SignLibraryPanel';
import PropertyPanel from '@/components/PropertyPanel';
import TopNav from '@/components/TopNav';
import {
  AlertTriangle, AlertCircle, Info, CheckCircle2, MapPin, RefreshCw,
} from 'lucide-react';
import type { Sign, SignType, ComplianceWarning } from '@/types';

export default function Editor() {
  const params = useParams();
  const navigate = useNavigate();
  const schemeId = params.schemeId!;
  const {
    schemes, activeSchemeId, setActiveScheme, addSign, updateSign, deleteSign,
    selectSign, selectedSignId, warnings, focusSign, focusSignId, runCheck, init,
  } = useSignageStore();

  const [viewMode, setViewMode] = useState<'perspective' | 'top' | 'front'>('perspective');
  const [cameraResetKey, setCameraResetKey] = useState(0);

  useEffect(() => {
    if (Object.keys(schemes).length === 0) init();
  }, [schemes, init]);

  useEffect(() => {
    if (schemes[schemeId] && activeSchemeId !== schemeId) setActiveScheme(schemeId);
  }, [schemeId, schemes, activeSchemeId, setActiveScheme]);

  useEffect(() => {
    if (!schemes[schemeId] && Object.keys(schemes).length > 0) navigate('/');
  }, [schemes, schemeId, navigate]);

  const scheme = schemes[schemeId];
  if (!scheme) return (
    <div className="h-screen flex items-center justify-center text-surface-muted">
      <RefreshCw className="w-5 h-5 animate-spin mr-2" />加载方案...
    </div>
  );

  const floor = scheme.floors[scheme.currentFloor];
  const signs: Sign[] = scheme.signs[scheme.currentFloor] || [];
  const selected = signs.find((s) => s.id === selectedSignId) || null;

  const handleAddSign = useCallback((type: SignType) => {
    const cx = floor.size.w / 2 + (Math.random() - 0.5) * 8;
    const cz = 12 + (Math.random() - 0.5) * 4;
    addSign(schemeId, scheme.currentFloor, type, { x: cx, y: 0, z: cz });
  }, [addSign, schemeId, scheme.currentFloor, floor.size.w]);

  const handleUpdatePosition = useCallback((signId: string, pos: { x: number; y: number; z: number }) => {
    updateSign(schemeId, scheme.currentFloor, signId, { position: pos });
    setTimeout(() => runCheck(schemeId, scheme.currentFloor), 50);
  }, [updateSign, schemeId, scheme.currentFloor, runCheck]);

  const handleUpdateSign = useCallback((patch: Partial<Sign>) => {
    if (!selectedSignId) return;
    updateSign(schemeId, scheme.currentFloor, selectedSignId, patch);
    setTimeout(() => runCheck(schemeId, scheme.currentFloor), 50);
  }, [updateSign, schemeId, scheme.currentFloor, selectedSignId, runCheck]);

  const handleDelete = useCallback(() => {
    if (!selectedSignId) return;
    if (!confirm('删除当前标牌？')) return;
    deleteSign(schemeId, scheme.currentFloor, selectedSignId);
  }, [deleteSign, schemeId, scheme.currentFloor, selectedSignId]);

  const handleJumpWarning = useCallback((signId: string) => {
    selectSign(signId);
    focusSign(signId);
    setTimeout(() => focusSign(null), 800);
  }, [selectSign, focusSign]);

  const errorCount = warnings.filter((w) => w.level === 'error').length;
  const warnCount = warnings.filter((w) => w.level === 'warning').length;
  const infoCount = warnings.filter((w) => w.level === 'info').length;
  const totalWithWarn = new Set(warnings.map((w) => w.signId)).size;
  const statusPct = signs.length === 0 ? 100 : Math.round((signs.length - totalWithWarn) / signs.length * 100);

  return (
    <div className="h-screen flex flex-col bg-surface-2 overflow-hidden">
      <TopNav viewMode={viewMode} setViewMode={setViewMode} onResetCamera={() => setCameraResetKey((k) => k + 1)} />

      <div className="flex-1 flex min-h-0">
        <SignLibraryPanel onAddSign={handleAddSign} warnings={warnings} onJumpWarning={handleJumpWarning} />

        <div className="flex-1 flex flex-col min-w-0">
          <div className="canvas-host flex-1 relative" key={cameraResetKey}>
            <EditorScene
              floor={floor}
              signs={signs}
              warnings={warnings}
              selectedSignId={selectedSignId}
              focusSignId={focusSignId}
              onSelectSign={selectSign}
              onUpdateSignPosition={handleUpdatePosition}
              onWarningClick={handleJumpWarning}
              viewMode={viewMode}
            />

            <div className="absolute top-4 left-4 app-card px-3 py-2 flex items-center gap-2 text-xs shadow-card-lg">
              <MapPin className="w-3.5 h-3.5 text-brand-600" />
              <span className="font-semibold text-surface-strong">{floor.name}</span>
              <span className="text-surface-muted">·</span>
              <span className="text-surface-muted">{floor.size.w}m × {floor.size.d}m</span>
              <span className="text-surface-muted">·</span>
              <span className="text-surface-muted">{signs.length} 个标牌</span>
            </div>

            <div className="absolute top-4 right-4 app-card px-2 py-1.5 flex items-center gap-1.5 text-xs shadow-card-lg">
              <span className={`w-2 h-2 rounded-full ${statusPct === 100 ? 'bg-success-500' : statusPct >= 70 ? 'bg-warning-500' : 'bg-danger-500'}`} />
              <span className="font-semibold text-surface-strong">合规率 {statusPct}%</span>
              <div className="w-px h-4 bg-surface-3 mx-1" />
              {errorCount > 0 && <span className="app-chip warn-error text-[10px]"><AlertCircle className="w-3 h-3" />{errorCount}</span>}
              {warnCount > 0 && <span className="app-chip warn-warning text-[10px]"><AlertTriangle className="w-3 h-3" />{warnCount}</span>}
              {infoCount > 0 && <span className="app-chip warn-info text-[10px]"><Info className="w-3 h-3" />{infoCount}</span>}
              {warnings.length === 0 && <span className="app-chip bg-success-500/10 text-success-600 border-success-500/30 text-[10px]"><CheckCircle2 className="w-3 h-3" />全部通过</span>}
            </div>
          </div>

          <div className="h-[60px] shrink-0 bg-white border-t border-surface-3/60 px-4 flex items-center gap-4 overflow-x-auto">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-surface-muted">图例：</span>
              <LegendDot color="#EF4444" label="消防栓" />
              <LegendDot color="#BAE6FD" label="无障碍通道" />
              <LegendDot color="#475569" label="电梯" />
              <LegendDot color="#E5E7EB" label="结构柱" />
            </div>
            <div className="w-px h-8 bg-surface-3" />
            <div className="flex items-center gap-2 text-xs text-surface-muted flex-1 min-w-0">
              <span>💡 在场景中拖拽标牌调整位置，右侧面板可精细调节高度与朝向</span>
            </div>
            <button onClick={() => runCheck(schemeId, scheme.currentFloor)} className="app-btn-secondary !py-1.5 text-xs shrink-0">
              <RefreshCw className="w-3.5 h-3.5" />重新检查
            </button>
          </div>
        </div>

        <PropertyPanel sign={selected} warnings={warnings} onUpdateSign={handleUpdateSign} onDeleteSign={handleDelete} />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-3 h-3 rounded border border-surface-3" style={{ background: color }} />
      <span className="text-surface-text">{label}</span>
    </span>
  );
}
