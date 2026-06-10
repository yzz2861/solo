import { useState } from 'react';
import {
  Save,
  Trash2,
  Play,
  Pencil,
  Check,
  X,
  Plus,
  Calendar,
  Boxes,
  Route,
} from 'lucide-react';
import { Modal } from './Modal';
import { useSceneStore } from '@/store/useSceneStore';
import { cn } from '@/lib/utils';

interface SchemeManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SchemeManager({ isOpen, onClose }: SchemeManagerProps) {
  const { schemes, currentSchemeId, saveScheme, loadScheme, deleteScheme, renameScheme } =
    useSceneStore();
  const [newSchemeName, setNewSchemeName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleSave = () => {
    if (!newSchemeName.trim()) return;
    saveScheme(newSchemeName.trim());
    setNewSchemeName('');
  };

  const handleLoad = (id: string) => {
    loadScheme(id);
    onClose();
  };

  const handleStartRename = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const handleConfirmRename = () => {
    if (editingId && editingName.trim()) {
      renameScheme(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="方案管理" size="lg">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newSchemeName}
            onChange={(e) => setNewSchemeName(e.target.value)}
            placeholder="输入方案名称..."
            className="flex-1 px-3 py-2 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <button
            onClick={handleSave}
            disabled={!newSchemeName.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            保存
          </button>
        </div>

        <div className="border-t border-slate-700/50 pt-4">
          <h3 className="text-sm font-medium text-slate-300 mb-3">已保存方案</h3>

          {schemes.length === 0 ? (
            <div className="text-center py-8">
              <Boxes className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm text-slate-500">暂无保存的方案</p>
              <p className="text-xs text-slate-600 mt-1">输入名称后点击保存</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
              {schemes.map((scheme) => {
                const isActive = scheme.id === currentSchemeId;
                const isEditing = editingId === scheme.id;
                const objCount = scheme.objects.length;
                const pathCount = scheme.paths.length;

                return (
                  <div
                    key={scheme.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-xl border transition-all',
                      isActive
                        ? 'bg-orange-500/10 border-orange-500/30'
                        : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600',
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1 px-2 py-1 text-sm bg-slate-700 border border-slate-500 rounded text-slate-200 focus:outline-none focus:border-orange-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleConfirmRename();
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                          <button
                            onClick={handleConfirmRename}
                            className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 text-slate-400 hover:bg-slate-700 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <h4
                              className={cn(
                                'text-sm font-medium truncate',
                                isActive ? 'text-orange-400' : 'text-slate-200',
                              )}
                            >
                              {scheme.name}
                            </h4>
                            {isActive && (
                              <span className="px-1.5 py-0.5 text-xs bg-orange-500/20 text-orange-400 rounded">
                                当前
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(scheme.createdAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Boxes className="w-3 h-3" />
                              {objCount} 物体
                            </span>
                            <span className="flex items-center gap-1">
                              <Route className="w-3 h-3" />
                              {pathCount} 路径
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-1 ml-3">
                        <button
                          onClick={() => handleLoad(scheme.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                          title="加载方案"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleStartRename(scheme.id, scheme.name)}
                          className="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          title="重命名"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteScheme(scheme.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
