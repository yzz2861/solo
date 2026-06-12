import { useState, useMemo } from 'react';
import { Save, Trash2, Download, Filter } from 'lucide-react';
import ModalBase from './ModalBase';
import { useLayoutStore } from '@/store/useLayoutStore';
import { cn } from '@/lib/utils';
import type { SchemeScenarioType } from '@/types';

const SCENARIO_OPTIONS: { value: SchemeScenarioType; label: string }[] = [
  { value: 'peak', label: '高峰' },
  { value: 'offPeak', label: '低峰' },
  { value: 'general', label: '通用' },
];

const FILTER_OPTIONS = [
  { value: 'all', label: '全部' },
  ...SCENARIO_OPTIONS,
];

/**
 * 方案管理弹窗
 * - 保存新方案 / 更新当前方案
 * - 按类型筛选方案列表
 * - 加载 / 删除方案
 */
export default function SchemeManagerModal() {
  const schemes = useLayoutStore((s) => s.schemes);
  const activeSchemeId = useLayoutStore((s) => s.activeSchemeId);
  const showSchemeManager = useLayoutStore((s) => s.showSchemeManager);
  const toggleSchemeManager = useLayoutStore((s) => s.toggleSchemeManager);
  const saveScheme = useLayoutStore((s) => s.saveScheme);
  const loadScheme = useLayoutStore((s) => s.loadScheme);
  const deleteScheme = useLayoutStore((s) => s.deleteScheme);

  const [schemeName, setSchemeName] = useState('');
  const [scenarioType, setScenarioType] = useState<SchemeScenarioType>('general');
  const [filterType, setFilterType] = useState<'all' | SchemeScenarioType>('all');

  // 按类型筛选方案
  const filteredSchemes = useMemo(() => {
    if (filterType === 'all') return schemes;
    return schemes.filter((s) => s.scenarioType === filterType);
  }, [schemes, filterType]);

  // 格式化时间
  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 获取类型标签颜色
  const getTypeTagClass = (type: SchemeScenarioType) => {
    switch (type) {
      case 'peak':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'offPeak':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'general':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  // 保存方案
  const handleSave = () => {
    const name = schemeName.trim() || `方案 ${schemes.length + 1}`;
    saveScheme(name, scenarioType);
    setSchemeName('');
  };

  // 删除方案（带确认）
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const scheme = schemes.find((s) => s.id === id);
    if (scheme && window.confirm(`确定删除方案「${scheme.name}」吗？`)) {
      deleteScheme(id);
    }
  };

  return (
    <ModalBase
      open={showSchemeManager}
      onClose={toggleSchemeManager}
      title="方案管理"
      width={900}
    >
      {/* 顶部：保存区域 */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-sm text-slate-400">方案名称</label>
          <input
            type="text"
            value={schemeName}
            onChange={(e) => setSchemeName(e.target.value)}
            placeholder="输入方案名称..."
            className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="w-[140px]">
          <label className="mb-1 block text-sm text-slate-400">场景类型</label>
          <select
            value={scenarioType}
            onChange={(e) => setScenarioType(e.target.value as SchemeScenarioType)}
            className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {SCENARIO_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 active:bg-blue-800"
        >
          <Save className="h-4 w-4" />
          {activeSchemeId ? '更新方案' : '保存方案'}
        </button>
      </div>

      {/* 筛选按钮 */}
      <div className="mb-4 flex items-center gap-2">
        <Filter className="h-4 w-4 text-slate-400" />
        <div className="flex gap-1">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilterType(opt.value as 'all' | SchemeScenarioType)}
              className={cn(
                'rounded-md px-3 py-1 text-sm transition-colors',
                filterType === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm text-slate-400">
          共 {filteredSchemes.length} 个方案
        </span>
      </div>

      {/* 方案列表表格 */}
      <div className="overflow-hidden rounded-lg border border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-300">名称</th>
              <th className="px-4 py-3 text-left font-medium text-slate-300">类型</th>
              <th className="px-4 py-3 text-left font-medium text-slate-300">创建时间</th>
              <th className="px-4 py-3 text-right font-medium text-slate-300">占地 (m²)</th>
              <th className="px-4 py-3 text-right font-medium text-slate-300">风险评分</th>
              <th className="px-4 py-3 text-center font-medium text-slate-300">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {filteredSchemes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  暂无方案，请先保存一个方案
                </td>
              </tr>
            ) : (
              filteredSchemes.map((scheme) => (
                <tr
                  key={scheme.id}
                  className={cn(
                    'transition-colors hover:bg-slate-700/30',
                    scheme.id === activeSchemeId && 'bg-blue-900/20',
                  )}
                >
                  <td className="px-4 py-3 font-medium text-slate-100">
                    {scheme.name}
                    {scheme.id === activeSchemeId && (
                      <span className="ml-2 text-xs text-blue-400">(当前)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                        getTypeTagClass(scheme.scenarioType),
                      )}
                    >
                      {SCENARIO_OPTIONS.find((o) => o.value === scheme.scenarioType)?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatTime(scheme.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    {scheme.metrics.landUsage.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        'font-medium',
                        scheme.metrics.riskScore > 20
                          ? 'text-red-400'
                          : scheme.metrics.riskScore > 10
                            ? 'text-yellow-400'
                            : 'text-green-400',
                      )}
                    >
                      {scheme.metrics.riskScore}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => loadScheme(scheme.id)}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-blue-400 transition-colors hover:bg-blue-500/20"
                      >
                        <Download className="h-3 w-3" />
                        加载
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(scheme.id, e)}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/20"
                      >
                        <Trash2 className="h-3 w-3" />
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </ModalBase>
  );
}
