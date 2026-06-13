import { useState } from 'react';
import {
  LayoutDashboard, DoorOpen, SignpostBig, ArrowUpFromLine, MoveRight,
  Search, ChevronDown, ChevronRight, AlertTriangle, AlertCircle, Info, Plus,
} from 'lucide-react';
import type { SignType, ComplianceWarning } from '@/types';
import { SIGN_TEMPLATES } from '@/types';

interface SignLibraryPanelProps {
  onAddSign: (type: SignType) => void;
  warnings: ComplianceWarning[];
  onJumpWarning: (signId: string) => void;
}

const ICON_MAP: Record<string, any> = {
  DoorOpen, SignpostBig, ArrowUpFromLine, Info, MoveRight,
};

export default function SignLibraryPanel({ onAddSign, warnings, onJumpWarning }: SignLibraryPanelProps) {
  const [search, setSearch] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ library: true, warnings: true });
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const toggle = (k: string) => setOpenGroups((s) => ({ ...s, [k]: !s[k] }));

  const groups: { title: string; types: SignType[] }[] = [
    { title: '房间标识', types: ['room_door'] },
    { title: '导视标识', types: ['floor_standing', 'directional', 'elevator_hall'] },
    { title: '无障碍', types: ['accessible'] },
  ];

  const errorCount = warnings.filter((w) => w.level === 'error').length;
  const warnCount = warnings.filter((w) => w.level === 'warning').length;
  const infoCount = warnings.filter((w) => w.level === 'info').length;

  return (
    <div className="w-[272px] shrink-0 flex flex-col h-full bg-white border-r border-surface-3/60 overflow-hidden">
      <div className="p-3 border-b border-surface-3/60">
        <div className="relative">
          <Search className="w-4 h-4 text-surface-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索标牌类型..."
            className="app-input pl-8"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div>
          <button onClick={() => toggle('library')} className="panel-title w-full text-left mb-2">
            <LayoutDashboard className="w-4 h-4 text-brand-600" />
            标牌库
            {openGroups.library ? <ChevronDown className="w-4 h-4 ml-auto text-surface-muted" /> : <ChevronRight className="w-4 h-4 ml-auto text-surface-muted" />}
          </button>
          {openGroups.library && (
            <div className="space-y-2">
              <div className="flex gap-1 flex-wrap text-xs mb-2">
                {(['all', '房间标识', '导视标识', '无障碍'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategoryFilter(c)}
                    className={`px-2 py-1 rounded-md border transition ${categoryFilter === c ? 'bg-brand-50 border-brand-300 text-brand-700' : 'bg-surface border-surface-3 text-surface-text hover:border-brand-300'}`}
                  >
                    {c === 'all' ? '全部' : c}
                  </button>
                ))}
              </div>
              {groups.map((g) => {
                if (categoryFilter !== 'all' && categoryFilter !== g.title) return null;
                return (
                  <div key={g.title} className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-surface-muted uppercase tracking-wider px-1">{g.title}</div>
                    {g.types
                      .filter((t) => SIGN_TEMPLATES[t].label.includes(search) || search === '')
                      .map((t) => {
                        const tpl = SIGN_TEMPLATES[t];
                        const Icon = ICON_MAP[tpl.icon] || DoorOpen;
                        return (
                          <button
                            key={t}
                            draggable
                            onDragEnd={() => onAddSign(t)}
                            onClick={() => onAddSign(t)}
                            className="w-full group text-left p-2.5 rounded-lg border border-surface-3 hover:border-brand-400 hover:bg-brand-50/40 transition-all flex items-center gap-2.5"
                          >
                            <div
                              className="w-9 h-9 rounded-md shrink-0 flex items-center justify-center text-white shadow-sm"
                              style={{ background: tpl.color }}
                            >
                              <Icon className="w-5 h-5" style={{ color: tpl.textColor }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-surface-strong truncate">{tpl.label}</div>
                              <div className="text-[11px] text-surface-muted truncate">{tpl.defaultWidth}×{tpl.defaultHeight}m</div>
                            </div>
                            <Plus className="w-4 h-4 text-surface-muted group-hover:text-brand-600 shrink-0" />
                          </button>
                        );
                      })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="app-divider !my-1" />

        <div>
          <button onClick={() => toggle('warnings')} className="panel-title w-full text-left mb-2">
            <AlertTriangle className="w-4 h-4 text-accent-400" />
            合规警告
            <div className="ml-auto flex gap-1 items-center">
              {errorCount > 0 && <span className="app-chip warn-error">{errorCount}严</span>}
              {warnCount > 0 && <span className="app-chip warn-warning">{warnCount}警</span>}
              {infoCount > 0 && <span className="app-chip warn-info">{infoCount}</span>}
              {openGroups.warnings ? <ChevronDown className="w-4 h-4 text-surface-muted" /> : <ChevronRight className="w-4 h-4 text-surface-muted" />}
            </div>
          </button>
          {openGroups.warnings && (
            <div className="space-y-1.5">
              {warnings.length === 0 ? (
                <div className="text-xs text-surface-muted p-3 rounded-lg bg-success-500/10 border border-success-500/20 text-center">
                  ✓ 当前无合规问题
                </div>
              ) : (
                warnings.slice(0, 30).map((w) => {
                  const WIcon = w.level === 'error' ? AlertCircle : w.level === 'warning' ? AlertTriangle : Info;
                  const cls = w.level === 'error' ? 'warn-error' : w.level === 'warning' ? 'warn-warning' : 'warn-info';
                  return (
                    <button
                      key={w.id}
                      onClick={() => onJumpWarning(w.signId)}
                      className={`w-full text-left p-2 rounded-lg border ${cls} hover:brightness-95 transition`}
                    >
                      <div className="flex items-start gap-1.5">
                        <WIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-medium leading-snug line-clamp-2">{w.message}</div>
                          <div className="text-[10px] opacity-70 mt-0.5 truncate">建议：{w.suggestion}</div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
              {warnings.length > 30 && (
                <div className="text-center text-xs text-surface-muted py-1">
                  另有 {warnings.length - 30} 条警告...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
