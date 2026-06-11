import { useState, useEffect, useRef } from 'react';
import { Sparkles, Save, Plus, Trash2, ChevronDown } from 'lucide-react';
import { useSolutionStore } from '@/store/useSolutionStore';
import ExportMenu from './ExportMenu';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const solutions = useSolutionStore((s) => s.solutions);
  const activeId = useSolutionStore((s) => s.activeId);
  const setActive = useSolutionStore((s) => s.setActive);
  const createSolution = useSolutionStore((s) => s.createSolution);
  const renameSolution = useSolutionStore((s) => s.renameSolution);
  const deleteSolution = useSolutionStore((s) => s.deleteSolution);
  const saveAll = useSolutionStore((s) => s.saveAll);
  const active = solutions.find((s) => s.id === activeId);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!active) return null;

  return (
    <header className="bg-white/80 backdrop-blur-lg border-b border-primary-100 sticky top-0 z-40">
      <div className="container max-w-[1600px] px-6 py-3.5 flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-glow">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-serif text-lg font-bold text-gray-800 leading-tight">
              直播间赠品试算
            </h1>
            <p className="text-xs text-gray-400">快速验证规则，告别人工计算</p>
          </div>
        </div>

        <div className="ml-6 flex items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border-2 border-primary-100 bg-white hover:border-primary-300 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-gray-400">当前方案</span>
                <span className="font-medium text-gray-800 truncate">{active.name}</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
                  menuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {menuOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-glow border border-primary-100 py-1.5 z-50 animate-fade-in max-h-80 overflow-y-auto">
                {solutions.map((s) => (
                  <div
                    key={s.id}
                    className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
                      s.id === activeId ? 'bg-primary-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    {editing === s.id ? (
                      <input
                        className="input-field flex-1 text-sm"
                        value={s.name}
                        autoFocus
                        onBlur={() => setEditing(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditing(null)}
                        onChange={(e) => renameSolution(s.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <span
                          className="flex-1 text-sm truncate"
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditing(s.id);
                          }}
                          onClick={() => {
                            setActive(s.id);
                            setMenuOpen(false);
                          }}
                        >
                          {s.name}
                        </span>
                        <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          双击重命名
                        </span>
                      </>
                    )}
                    {solutions.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`确定删除方案「${s.name}」？`)) {
                            deleteSolution(s.id);
                          }
                        }}
                        className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <div className="border-t border-gray-100 mt-1.5 pt-1.5">
                  <button
                    onClick={() => {
                      createSolution(`直播方案 ${solutions.length + 1}`);
                      setMenuOpen(false);
                    }}
                    className="w-full px-3 py-2.5 flex items-center gap-2 text-sm text-primary-600 hover:bg-primary-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    新建方案
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => createSolution(`直播方案 ${solutions.length + 1}`)}
            className="btn-secondary flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={saveAll} className="btn-primary flex items-center gap-1.5">
            <Save className="w-4 h-4" />
            保存
          </button>
          <ExportMenu />
        </div>
      </div>
    </header>
  );
}
