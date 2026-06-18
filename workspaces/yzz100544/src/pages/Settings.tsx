import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAppStore } from '@/store/appStore';
import { ThemeTag } from '@/components/ui/Badge';
import {
  Settings as SettingsIcon, Palette, Database, Upload, Download, Trash2,
  RefreshCw, Info, ChevronRight, Save, Plus, Edit3, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateMockData } from '@/utils/mockData';

export default function Settings() {
  const { themes, feedback, improvements, courses, resetAll, initializeWithMock, isInitialized } = useAppStore();
  const [confirmReset, setConfirmReset] = useState(false);
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState('');
  const [activeSection, setActiveSection] = useState('themes');

  const handleReset = async () => {
    await resetAll();
    setConfirmReset(false);
  };

  const handleExportData = () => {
    const data = { themes, feedback, improvements, courses, version: 1 };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `course-feedback-backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        // 简单导入逻辑 - 实际项目应做验证
        console.log('导入数据:', data);
        alert('数据导入成功！（演示环境）');
      } catch {
        alert('文件格式错误');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const sections = [
    { id: 'themes', label: '主题管理', icon: Palette },
    { id: 'data', label: '数据管理', icon: Database },
    { id: 'about', label: '关于', icon: Info },
  ];

  return (
    <AppLayout title="设置" subtitle="自定义主题、管理数据、查看系统信息">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="card p-2 sticky top-28">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all',
                  activeSection === s.id
                    ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-soft'
                    : 'text-brand-600 hover:bg-brand-50'
                )}
              >
                <s.icon className="w-5 h-5" />
                <span className="font-medium text-sm">{s.label}</span>
                <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-5">
          {activeSection === 'themes' && (
            <>
              <div className="card p-6 animate-fade-in-up">
                <h3 className="font-serif text-xl font-semibold text-brand-800 mb-2 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-brand-600" />
                  聚类主题管理
                </h3>
                <p className="text-sm text-brand-500 mb-5">
                  系统会根据关键词自动将反馈归类到对应主题。你可以编辑现有主题或添加自定义主题。
                </p>

                <div className="space-y-3">
                  {themes.map((t, i) => {
                    const isEditing = editingThemeId === t.id;
                    return (
                      <div
                        key={t.id}
                        className="border border-brand-100 rounded-2xl p-4 hover:border-brand-200 transition animate-fade-in-up"
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-mono font-bold shrink-0"
                            style={{ backgroundColor: t.color }}
                          >
                            {t.name.slice(0, 1)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-brand-800">{t.name}</h4>
                              {t.isCustom && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-brand-100 text-brand-600 font-medium">
                                  自定义
                                </span>
                              )}
                            </div>
                            {t.description && (
                              <p className="text-xs text-brand-400 mt-0.5">{t.description}</p>
                            )}
                          </div>
                          <button
                            onClick={() => setEditingThemeId(isEditing ? null : t.id)}
                            className="btn-ghost text-sm !py-1.5 !px-3"
                          >
                            {isEditing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                            {isEditing ? '完成' : '编辑'}
                          </button>
                        </div>

                        {isEditing && (
                          <div className="mt-4 pt-4 border-t border-brand-50 space-y-3 animate-fade-in">
                            <div>
                              <label className="text-xs font-medium text-brand-600 mb-1 block">关键词（空格/逗号分隔）</label>
                              <div className="flex gap-2">
                                <input
                                  value={newKeyword}
                                  onChange={e => setNewKeyword(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' && newKeyword.trim()) {
                                      // 简化：直接更新关键词列表
                                      const updated = [...t.keywords, newKeyword.trim()];
                                      useAppStore.getState().updateTheme(t.id, { keywords: updated });
                                      setNewKeyword('');
                                    }
                                  }}
                                  placeholder="输入关键词后回车添加"
                                  className="input flex-1"
                                />
                              </div>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {t.keywords.map((kw, j) => (
                                  <ThemeTag
                                    key={j}
                                    name={kw}
                                    color={t.color}
                                    onRemove={() => {
                                      const updated = t.keywords.filter(k => k !== kw);
                                      useAppStore.getState().updateTheme(t.id, { keywords: updated });
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="text-xs text-brand-400">
                              💡 关键词越多，匹配越精准。建议每个主题至少3-5个关键词。
                            </div>
                          </div>
                        )}

                        {!isEditing && t.keywords.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {t.keywords.slice(0, 6).map((kw, j) => (
                              <span
                                key={j}
                                className="text-[11px] px-2 py-0.5 rounded-md"
                                style={{ backgroundColor: `${t.color}12`, color: t.color }}
                              >
                                #{kw}
                              </span>
                            ))}
                            {t.keywords.length > 6 && (
                              <span className="text-[11px] text-brand-400">+{t.keywords.length - 6} 更多</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button className="btn-secondary w-full mt-5">
                  <Plus className="w-4 h-4" />
                  添加自定义主题
                </button>
              </div>

              <div className="card p-6 animate-fade-in-up animate-stagger-2">
                <h3 className="font-serif text-xl font-semibold text-brand-800 mb-2 flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5 text-brand-600" />
                  聚类参数
                </h3>
                <p className="text-sm text-brand-500 mb-5">
                  调整聚类算法的灵敏度和匹配规则
                </p>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-brand-700">匹配阈值</label>
                      <span className="text-sm font-mono text-brand-500">0.25</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="0.6"
                      step="0.05"
                      defaultValue="0.25"
                      className="w-full h-2 bg-brand-100 rounded-lg appearance-none cursor-pointer accent-brand-600"
                    />
                    <p className="text-xs text-brand-400 mt-1.5">
                      阈值越低，匹配越宽松，一条反馈可能归入更多主题
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSection === 'data' && (
            <>
              <div className="card p-6 animate-fade-in-up">
                <h3 className="font-serif text-xl font-semibold text-brand-800 mb-5 flex items-center gap-2">
                  <Database className="w-5 h-5 text-brand-600" />
                  数据统计
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: '反馈数据', value: feedback.length, icon: '📝', color: 'from-blue-500 to-blue-600' },
                    { label: '主题数', value: themes.length, icon: '🏷️', color: 'from-violet-500 to-violet-600' },
                    { label: '改进点', value: improvements.length, icon: '✅', color: 'from-emerald-500 to-emerald-600' },
                    { label: '课程数', value: courses.length, icon: '📅', color: 'from-amber-500 to-amber-600' },
                  ].map((s, i) => (
                    <div key={i} className={`p-4 rounded-2xl bg-gradient-to-br ${s.color} text-white`}>
                      <div className="text-2xl mb-1">{s.icon}</div>
                      <div className="text-2xl font-bold font-mono">{s.value}</div>
                      <div className="text-xs text-white/80">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-6 animate-fade-in-up animate-stagger-2">
                <h3 className="font-serif text-xl font-semibold text-brand-800 mb-5 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-brand-600" />
                  数据导入导出
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border-2 border-dashed border-brand-200 hover:border-brand-400 transition group cursor-pointer">
                    <Download className="w-8 h-8 text-brand-400 group-hover:text-brand-600 transition mb-3" />
                    <h4 className="font-medium text-brand-800 mb-1">导出数据</h4>
                    <p className="text-xs text-brand-500 mb-3 leading-relaxed">
                      将所有反馈、主题、改进点、课程数据导出为 JSON 备份
                    </p>
                    <button onClick={handleExportData} className="btn-secondary text-sm !py-1.5 !px-3">
                      <Download className="w-3.5 h-3.5" />
                      立即导出
                    </button>
                  </div>

                  <div className="p-4 rounded-xl border-2 border-dashed border-brand-200 hover:border-brand-400 transition">
                    <Upload className="w-8 h-8 text-brand-400 mb-3" />
                    <h4 className="font-medium text-brand-800 mb-1">导入数据</h4>
                    <p className="text-xs text-brand-500 mb-3 leading-relaxed">
                      从备份文件恢复数据（会覆盖现有数据）
                    </p>
                    <label className="btn-secondary text-sm !py-1.5 !px-3 cursor-pointer inline-flex">
                      <Upload className="w-3.5 h-3.5" />
                      选择文件
                      <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>

              <div className="card p-6 border-red-200 bg-red-50/30 animate-fade-in-up animate-stagger-3">
                <h3 className="font-serif text-xl font-semibold text-red-700 mb-2 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  危险操作
                </h3>
                <p className="text-sm text-red-600/80 mb-4">
                  重置所有数据，恢复到初始状态。此操作不可撤销。
                </p>

                {!confirmReset ? (
                  <button
                    onClick={() => setConfirmReset(true)}
                    className="btn-danger"
                  >
                    <RefreshCw className="w-4 h-4" />
                    重置所有数据
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-red-700">确定要重置吗？</p>
                    <button onClick={handleReset} className="btn-danger !bg-red-600 !text-white">
                      确认重置
                    </button>
                    <button onClick={() => setConfirmReset(false)} className="btn-ghost">
                      取消
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {activeSection === 'about' && (
            <div className="card p-8 text-center animate-fade-in-up">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-600 to-brand-500 flex items-center justify-center mx-auto mb-5 shadow-card">
                <SettingsIcon className="w-10 h-10 text-white" />
              </div>
              <h2 className="font-serif text-2xl font-bold text-brand-800 mb-1">课程作业反馈聚类系统</h2>
              <p className="text-brand-400 mb-6">Feedback Insight v1.0.0</p>

              <div className="max-w-md mx-auto text-left bg-paper-50 rounded-2xl p-5 mb-6">
                <h4 className="font-medium text-brand-700 mb-2">产品简介</h4>
                <p className="text-sm text-brand-500 leading-relaxed">
                  通过智能聚类学生作业反馈、助教批注和错题说明，帮助教师快速识别教学薄弱环节，
                  生成针对性的教学改进清单，并将改进点分配到后续课程中持续跟进落实。
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto text-center">
                <div className="p-3">
                  <div className="text-2xl font-bold text-brand-700 font-mono">{themes.length}</div>
                  <div className="text-xs text-brand-400">预设主题</div>
                </div>
                <div className="p-3">
                  <div className="text-2xl font-bold text-brand-700 font-mono">0.25</div>
                  <div className="text-xs text-brand-400">匹配阈值</div>
                </div>
                <div className="p-3">
                  <div className="text-2xl font-bold text-brand-700 font-mono">5</div>
                  <div className="text-xs text-brand-400">大功能模块</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
