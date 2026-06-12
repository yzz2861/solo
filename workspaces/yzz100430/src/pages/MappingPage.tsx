import { useState } from 'react';
import { MapPin, Save, Plus, Search, Tag } from 'lucide-react';
import { useWellStore } from '@/store/useWellStore';
import { clsx } from 'clsx';

export default function MappingPage() {
  const { villages, wells, updateWellCommonName, setWells } = useWellStore();
  const [search, setSearch] = useState('');
  const [villageFilter, setVillageFilter] = useState<string>('');
  const [editingId, setEditingId] = useState<string>('');
  const [editValue, setEditValue] = useState('');

  const filtered = wells.filter((w) => {
    const v = villages.find((x) => x.id === w.villageId);
    const vName = v?.name || '';
    const matchVillage = !villageFilter || w.villageId === villageFilter;
    const matchSearch =
      !search ||
      w.officialNo.toLowerCase().includes(search.toLowerCase()) ||
      w.commonName.toLowerCase().includes(search.toLowerCase()) ||
      vName.toLowerCase().includes(search.toLowerCase());
    return matchVillage && matchSearch;
  });

  const saveEdit = (id: string) => {
    if (editValue.trim()) {
      updateWellCommonName(id, editValue.trim());
    }
    setEditingId('');
  };

  const autoGenerate = () => {
    const suffixes = ['老井', '大井', '新井', '头井', '东井', '西井', '南井', '北井', '中井'];
    const villageUsed = new Map<string, number>();
    setWells(
      wells.map((w) => {
        if (w.commonName && w.commonName !== w.officialNo) return w;
        const idx = villageUsed.get(w.villageId) || 0;
        villageUsed.set(w.villageId, idx + 1);
        const v = villages.find((x) => x.id === w.villageId);
        const vShort = v?.name.slice(0, 2) || '村';
        return {
          ...w,
          commonName: `${vShort}${suffixes[idx % suffixes.length]}`,
        };
      }),
    );
  };

  return (
    <div className="space-y-6 fade-in max-w-6xl mx-auto">
      <div>
        <h1 className="font-serif text-3xl font-black text-primary-800 tracking-tight flex items-center gap-3">
          <MapPin className="w-8 h-8 text-primary-500" />
          井名俗称映射
        </h1>
        <p className="text-primary-600 mt-1.5 text-sm">
          为每口水井设置村民熟悉的俗称，报告中将使用俗称代替官方井号，便于村干部转发
        </p>
      </div>

      <div className="card-sm flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索村名/井号/俗称"
              className="input pl-9 w-64"
            />
          </div>
          <select
            value={villageFilter}
            onChange={(e) => setVillageFilter(e.target.value)}
            className="input w-40"
          >
            <option value="">全部村庄</option>
            {villages.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={autoGenerate} className="btn-secondary text-sm">
            <Plus className="w-4 h-4" />
            一键生成俗称
          </button>
          <span className="text-xs text-primary-500">
            共 {wells.length} 口井 · 已配置俗称{' '}
            {wells.filter((w) => w.commonName && w.commonName !== w.officialNo).length}
          </span>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header w-16">#</th>
              <th className="table-header">所属村</th>
              <th className="table-header">官方井号</th>
              <th className="table-header">俗称（用于报告展示）</th>
              <th className="table-header w-20 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="table-cell text-center py-12 text-primary-400">
                  {wells.length === 0
                    ? '暂无水井数据，请先上传化验或采样记录'
                    : '未找到匹配的水井'}
                </td>
              </tr>
            )}
            {filtered.map((w, idx) => {
              const v = villages.find((x) => x.id === w.villageId);
              const isEditing = editingId === w.id;
              const isCustom = w.commonName !== w.officialNo;
              return (
                <tr
                  key={w.id}
                  className={clsx('hover:bg-primary-50/40 transition-colors')}
                >
                  <td className="table-cell text-xs text-primary-400 font-mono">
                    {String(idx + 1).padStart(2, '0')}
                  </td>
                  <td className="table-cell">
                    <span className="badge badge-primary">
                      <MapPin className="w-3 h-3" />
                      {v?.name || '未匹配'}
                    </span>
                  </td>
                  <td className="table-cell font-mono text-primary-600 text-sm">
                    {w.officialNo}
                  </td>
                  <td className="table-cell">
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(w.id);
                          if (e.key === 'Escape') setEditingId('');
                        }}
                        className="input max-w-xs"
                      />
                    ) : (
                      <div
                        className={clsx(
                          'flex items-center gap-2',
                          !isCustom && 'text-primary-400',
                        )}
                      >
                        {isCustom ? (
                          <Tag className="w-4 h-4 text-safe-500" />
                        ) : (
                          <Tag className="w-4 h-4 opacity-40" />
                        )}
                        <span className={clsx(isCustom && 'font-medium text-primary-800')}>
                          {w.commonName}
                        </span>
                        {!isCustom && (
                          <span className="text-[11px] text-primary-400 bg-primary-50 px-1.5 py-0.5 rounded">
                            建议设置俗称
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="table-cell text-right">
                    {isEditing ? (
                      <button
                        onClick={() => saveEdit(w.id)}
                        className="btn-safe !py-1.5 !px-3 text-xs"
                      >
                        <Save className="w-3.5 h-3.5" />
                        保存
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(w.id);
                          setEditValue(
                            w.commonName === w.officialNo ? '' : w.commonName,
                          );
                        }}
                        className="text-primary-500 hover:text-primary-700 text-sm font-medium"
                      >
                        编辑
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
