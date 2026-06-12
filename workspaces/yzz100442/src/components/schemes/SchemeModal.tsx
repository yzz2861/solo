import { useState } from 'react';
import {
  X,
  Plus,
  Download,
  Upload,
  Trash2,
  Edit2,
  Check,
  Search,
  Tag,
  FileJson,
  FolderPlus,
} from 'lucide-react';
import { useStudioStore } from '@/store/useStudioStore';
import type { StudioScheme } from '@/types/scheme';

interface SchemeModalProps {
  onClose: () => void;
}

type ViewMode = 'list' | 'save';

export function SchemeModal({ onClose }: SchemeModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [saveName, setSaveName] = useState('');
  const [saveProductType, setSaveProductType] = useState('通用');
  const [saveDescription, setSaveDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const schemes = useStudioStore((state) => state.schemes);
  const currentScheme = useStudioStore((state) => state.currentScheme);
  const loadScheme = useStudioStore((state) => state.loadScheme);
  const deleteScheme = useStudioStore((state) => state.deleteScheme);
  const saveScheme = useStudioStore((state) => state.saveScheme);
  const exportScheme = useStudioStore((state) => state.exportScheme);
  const importScheme = useStudioStore((state) => state.importScheme);
  const createNewScheme = useStudioStore((state) => state.createNewScheme);
  const updateSchemeMeta = useStudioStore((state) => state.updateSchemeMeta);

  const productTypes = Array.from(new Set(schemes.map((s) => s.productType)));

  const filteredSchemes = schemes.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || s.productType === filterType;
    return matchesSearch && matchesType;
  });

  const handleSave = () => {
    if (!saveName.trim()) return;
    saveScheme(saveName, saveProductType, saveDescription);
    setViewMode('list');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        importScheme(content);
      };
      reader.readAsText(file);
    }
  };

  const handleStartEdit = (scheme: StudioScheme) => {
    setEditingId(scheme.id);
    setEditName(scheme.name);
  };

  const handleSaveEdit = (id: string) => {
    if (editName.trim()) {
      updateSchemeMeta(id, { name: editName });
    }
    setEditingId(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`确定要删除方案 "${name}" 吗？此操作不可撤销。`)) {
      deleteScheme(id);
    }
  };

  const handleCreateNew = () => {
    createNewScheme();
    onClose();
  };

  const handleLoad = (id: string) => {
    loadScheme(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="w-[800px] max-w-[90vw] max-h-[80vh] bg-slate-900 rounded-xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <div>
            <h2 className="text-lg font-bold text-white font-mono">方案管理</h2>
            <p className="text-xs text-slate-500 mt-0.5">管理直播棚布局方案</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {viewMode === 'list' ? (
          <>
            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-700/50 bg-slate-800/30">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索方案..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-500"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="all">全部分类</option>
                {productTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleCreateNew}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  新建
                </button>
                <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-200 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  导入
                  <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                </label>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {filteredSchemes.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                    <FileJson className="w-8 h-8 text-slate-600" />
                  </div>
                  <p className="text-slate-400">暂无方案</p>
                  <p className="text-sm text-slate-500 mt-1">点击新建按钮创建第一个方案</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredSchemes.map((scheme) => (
                    <div
                      key={scheme.id}
                      className={`p-4 rounded-xl border transition-all cursor-pointer hover:shadow-lg ${
                        currentScheme?.id === scheme.id
                          ? 'bg-blue-500/10 border-blue-500/50 shadow-blue-500/10'
                          : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                      }`}
                      onClick={() => handleLoad(scheme.id)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          {editingId === scheme.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveEdit(scheme.id);
                                }}
                                className="p-1 hover:bg-green-500/20 rounded text-green-400"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <h3 className="font-semibold text-white truncate">{scheme.name}</h3>
                          )}
                        </div>
                        <span className="ml-2 px-2 py-0.5 bg-slate-700 rounded text-[10px] text-slate-300 flex items-center gap-1 flex-shrink-0">
                          <Tag className="w-3 h-3" />
                          {scheme.productType}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px]">
                        {scheme.description || '暂无描述'}
                      </p>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
                        <span className="text-[10px] text-slate-500">
                          {scheme.devices.length} 个设备
                        </span>

                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(scheme);
                            }}
                            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                            title="重命名"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              exportScheme(scheme.id);
                            }}
                            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                            title="导出"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(scheme.id, scheme.name);
                            }}
                            className="p-1.5 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {currentScheme?.id === scheme.id && (
                        <div className="absolute top-3 right-3">
                          <span className="text-[10px] text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">
                            当前使用
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">方案名称</label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="输入方案名称"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">商品类型</label>
              <select
                value={saveProductType}
                onChange={(e) => setSaveProductType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {productTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
                <option value="自定义">自定义...</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">方案描述</label>
              <textarea
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                placeholder="简要描述此方案的适用场景和特点..."
                rows={3}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setViewMode('list')}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={!saveName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-sm text-white transition-colors"
              >
                保存方案
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
