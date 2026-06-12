import { useState } from 'react';
import {
  X,
  Plus,
  Minus,
  Flower2,
  PlusCircle,
  Save,
  Trash2,
  Edit3,
  Check,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { FlowerCategory } from '@/types';
import clsx from 'clsx';

const categories: FlowerCategory[] = ['主花', '辅花', '叶材', '配饰'];

export const InventoryModal = () => {
  const {
    inventoryModalOpen,
    setInventoryModalOpen,
    flowers,
    updateStock,
    addFlower,
    updateFlower,
  } = useAppStore();

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newFlower, setNewFlower] = useState({
    name: '', unit: '扎', price: 0, stock: 0, safeStock: 5, category: '主花' as FlowerCategory,
  });
  const [editPatch, setEditPatch] = useState<Partial<typeof newFlower>>({});

  if (!inventoryModalOpen) return null;

  const handleAdd = () => {
    if (!newFlower.name.trim()) return;
    addFlower({ ...newFlower, name: newFlower.name.trim() });
    setNewFlower({ name: '', unit: '扎', price: 0, stock: 0, safeStock: 5, category: '主花' });
    setShowAdd(false);
  };

  const grouped: Record<FlowerCategory, typeof flowers> = { 主花: [], 辅花: [], 叶材: [], 配饰: [] };
  flowers.forEach(f => grouped[f.category].push(f));

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-coffee-700/20 backdrop-blur-sm no-print"
        onClick={() => setInventoryModalOpen(false)}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print pointer-events-none">
        <div
          className="card print-area w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col pointer-events-auto animate-fade-in-up"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-cream-200 bg-gradient-to-r from-sage-500/10 to-cream-100">
            <div>
              <h3 className="font-serif font-semibold text-coffee-700 text-lg flex items-center gap-2">
                <Flower2 className="w-5 h-5 text-sage-500" />
                花材库存管理
              </h3>
              <p className="text-[11px] text-coffee-500 mt-0.5">
                共 {flowers.length} 种花材 · 点击 +/- 快速调整
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAdd(s => !s)}
                className="btn btn-primary !py-1.5 !text-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                新增花材
              </button>
              <button
                onClick={() => setInventoryModalOpen(false)}
                className="btn btn-ghost !p-2 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-5">
            {/* 新增表单 */}
            {showAdd && (
              <div className="card-gold p-4 space-y-3 animate-fade-in-up">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div className="md:col-span-2">
                    <label className="label">花材名称*</label>
                    <input
                      className="input"
                      placeholder="如：郁金香"
                      value={newFlower.name}
                      onChange={e => setNewFlower(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">分类</label>
                    <select
                      className="input"
                      value={newFlower.category}
                      onChange={e => setNewFlower(p => ({ ...p, category: e.target.value as FlowerCategory }))}
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">单位</label>
                    <input
                      className="input"
                      placeholder="扎/枝/卷"
                      value={newFlower.unit}
                      onChange={e => setNewFlower(p => ({ ...p, unit: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">单价¥</label>
                    <input
                      type="number" min="0" step="0.5"
                      className="input"
                      value={newFlower.price}
                      onChange={e => setNewFlower(p => ({ ...p, price: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="label">当前库存</label>
                    <input
                      type="number" min="0"
                      className="input"
                      value={newFlower.stock}
                      onChange={e => setNewFlower(p => ({ ...p, stock: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowAdd(false)} className="btn btn-secondary !py-1.5 !text-xs">取消</button>
                  <button onClick={handleAdd} disabled={!newFlower.name.trim()} className="btn btn-success !py-1.5 !text-xs">
                    <Save className="w-3.5 h-3.5" /> 保存新增
                  </button>
                </div>
              </div>
            )}

            {categories.map(cat => (
              <div key={cat}>
                <h4 className="text-xs font-semibold text-coffee-600 mb-2 px-1 flex items-center gap-1.5">
                  <span className="w-1 h-4 rounded-full bg-gradient-to-b from-rose-300 to-gold-400" />
                  {cat} <span className="text-coffee-300 font-normal">({grouped[cat].length})</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {grouped[cat].map(f => {
                    const ratio = f.safeStock > 0 ? f.stock / f.safeStock : 1;
                    const statusColor = ratio <= 1 ? 'bg-danger-500' : ratio <= 2 ? 'bg-amber-500' : 'bg-sage-500';
                    const isEditing = editingId === f.id;
                    return (
                      <div
                        key={f.id}
                        className={clsx(
                          'p-3 rounded-2xl border transition-all',
                          ratio <= 1
                            ? 'border-danger-500/40 bg-danger-500/5'
                            : ratio <= 2
                            ? 'border-amber-500/30 bg-amber-500/5'
                            : 'border-cream-200 bg-white hover:border-rose-200 hover:shadow-soft'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Flower2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              {isEditing ? (
                                <input
                                  className="input !py-1 !text-sm flex-1 min-w-0"
                                  value={editPatch.name ?? f.name}
                                  onChange={e => setEditPatch(p => ({ ...p, name: e.target.value }))}
                                />
                              ) : (
                                <span className="font-semibold text-coffee-700 text-sm truncate">{f.name}</span>
                              )}
                            </div>
                            <div className="text-[10px] text-coffee-400 mt-0.5">
                              ¥{f.price}/{f.unit} · 安全库存 {f.safeStock}{f.unit}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (isEditing) {
                                updateFlower(f.id, editPatch);
                                setEditingId(null);
                                setEditPatch({});
                              } else {
                                setEditingId(f.id);
                                setEditPatch({ name: f.name, price: f.price, unit: f.unit, safeStock: f.safeStock });
                              }
                            }}
                            className="text-coffee-300 hover:text-coffee-600 transition p-1 rounded-md hover:bg-cream-100"
                          >
                            {isEditing ? <Check className="w-3.5 h-3.5 text-sage-600" /> : <Edit3 className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className={clsx(
                                'font-bold',
                                ratio <= 1 ? 'text-danger-600 animate-pulse-warning' : 'text-coffee-700'
                              )}>
                                {f.stock} <span className="font-normal text-coffee-400">{f.unit}</span>
                              </span>
                              <span className="text-coffee-400">/ {f.safeStock}{f.unit}</span>
                            </div>
                            <div className="h-1.5 bg-cream-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${statusColor} transition-all rounded-full`}
                                style={{ width: `${Math.min(100, (f.stock / Math.max(1, f.safeStock * 3)) * 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 bg-white rounded-lg border border-cream-200 p-0.5">
                            <button
                              onClick={() => updateStock(f.id, -1)}
                              className="w-7 h-7 flex items-center justify-center rounded-md text-coffee-500 hover:bg-danger-50 hover:text-danger-600 transition"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => updateStock(f.id, 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-md text-coffee-500 hover:bg-sage-50 hover:text-sage-600 transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
