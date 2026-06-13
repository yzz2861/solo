import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignageStore } from '@/store/signageStore';
import {
  Plus, Trash2, Building2, Calendar, Map, FileText, HardHat, ChevronRight, Sparkles,
} from 'lucide-react';
import { FLOOR_LIST } from '@/types';

export default function Home() {
  const navigate = useNavigate();
  const { schemes, createScheme, deleteScheme } = useSignageStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const list = Object.values(schemes);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const id = createScheme(newName.trim());
    setShowCreate(false);
    setNewName('');
    navigate(`/editor/${id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface via-brand-50/40 to-surface-2">
      <header className="bg-white/80 backdrop-blur border-b border-surface-3/60 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 text-white flex items-center justify-center shadow-card-lg">
              <Map className="w-6 h-6" />
            </div>
            <div>
              <div className="text-lg font-bold text-surface-strong leading-tight">室内导视系统安装预览</div>
              <div className="text-xs text-surface-muted">3D 可视化 · 合规检查 · 施工回填一站式</div>
            </div>
          </div>
          <button onClick={() => setShowCreate(true)} className="app-btn-primary">
            <Plus className="w-4 h-4" />新建方案
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Building2, label: '已建方案', value: list.length, color: 'from-brand-500 to-brand-700' },
            { icon: Map, label: '覆盖楼层', value: list.length * 5, color: 'from-info-500 to-info-700' },
            { icon: FileText, label: '标牌总数', value: list.reduce((a, s) => a + FLOOR_LIST.reduce((b, f) => b + (s.signs[f]?.length || 0), 0), 0), color: 'from-success-500 to-success-700' },
            { icon: HardHat, label: '施工记录', value: list.reduce((a, s) => a + Object.values(s.constructionRecords).filter((r) => r.status !== 'pending').length, 0), color: 'from-accent-400 to-accent-600' },
          ].map((s, i) => (
            <div key={i} className="app-card p-4 flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} text-white flex items-center justify-center shadow-sm`}>
                <s.icon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold text-surface-strong leading-none">{s.value}</div>
                <div className="text-xs text-surface-muted mt-1">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-surface-strong">方案列表</h2>
            <p className="text-xs text-surface-muted mt-0.5">在3D场景中拖放标牌，系统自动检查合规性</p>
          </div>
          {list.length > 0 && <span className="text-xs text-surface-muted">{list.length} 个方案</span>}
        </div>

        {list.length === 0 ? (
          <div className="app-card p-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10" />
            </div>
            <div className="text-lg font-semibold text-surface-strong mb-1">还没有方案</div>
            <div className="text-sm text-surface-muted mb-5">点击右上角创建第一个导视安装方案</div>
            <button onClick={() => setShowCreate(true)} className="app-btn-primary">
              <Plus className="w-4 h-4" />立即创建
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((s) => {
              const signs = FLOOR_LIST.reduce((a, f) => a + (s.signs[f]?.length || 0), 0);
              const installed = Object.values(s.constructionRecords).filter((r) => r.status === 'installed' || r.status === 'verified').length;
              const progress = signs ? Math.round(installed / signs * 100) : 0;
              return (
                <div key={s.id} className="app-card p-0 overflow-hidden group hover:shadow-card-lg transition-all duration-300 cursor-pointer" onClick={() => navigate(`/editor/${s.id}`)}>
                  <div className="h-32 relative bg-gradient-to-br from-brand-600 via-brand-500 to-accent-400 overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-grid-floor" style={{ backgroundSize: '32px 32px' }} />
                    <div className="absolute inset-0 flex items-center justify-center text-white/90">
                      <div className="flex items-center gap-4">
                        {FLOOR_LIST.map((f) => (
                          <div key={f} className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-md bg-white/20 backdrop-blur flex items-center justify-center text-sm font-bold">{f}F</div>
                            <div className="text-[10px] mt-1 opacity-80">{s.signs[f]?.length || 0}牌</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-surface-strong truncate group-hover:text-brand-700 transition">{s.name}</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-surface-muted mt-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(s.updatedAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (confirm('删除该方案？')) deleteScheme(s.id); }}
                        className="app-btn-ghost !px-2 !py-1 text-danger-600 hover:bg-danger-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-surface-muted">施工进度</span>
                        <span className="font-mono font-medium text-brand-700">{installed}/{signs} · {progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-success-500 transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 app-btn-secondary !py-1.5 text-xs justify-center">
                        <Map className="w-3.5 h-3.5" />3D编辑
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/export/${s.id}`); }} className="app-btn-ghost !py-1.5 text-xs">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowCreate(false)}>
          <div className="app-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-surface-strong">新建方案</div>
                <div className="text-xs text-surface-muted">包含 1F-5F 标准楼层结构</div>
              </div>
            </div>
            <label className="app-label">方案名称</label>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="例如：B座办公楼导视方案"
              className="app-input mb-5"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="app-btn-secondary">取消</button>
              <button onClick={handleCreate} className="app-btn-primary">创建方案</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
