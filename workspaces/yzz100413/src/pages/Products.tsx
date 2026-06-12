import { useState } from 'react';
import {
  Plus, Edit3, Trash2, ToggleLeft, ToggleRight, Search, Package as PkgIcon
} from 'lucide-react';
import { useBilliardStore } from '@/store';
import { formatMoney } from '@/lib/utils';
import { showToast } from '@/components/Toast';
import Modal, { ConfirmDialog } from '@/components/Modal';
import { uid } from '@/lib/utils';
import type { Product } from '@/types';

type Form = Omit<Product, 'id'>;
const emptyForm: Form = { name: '', category: '饮料', price: 0, stock: 0, active: true };

export default function Products() {
  const products = useBilliardStore(s => s.products);
  const upsert = useBilliardStore(s => s.upsertProduct);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form & { id?: string }>(emptyForm);
  const [search, setSearch] = useState('');
  const [toDelete, setToDelete] = useState<Product | null>(null);

  const list = products.filter(p =>
    !search || p.name.includes(search) || p.category.includes(search)
  );

  const edit = (p: Product) => { setForm({ ...p }); setOpen(true); };
  const addNew = () => { setForm({ ...emptyForm }); setOpen(true); };

  const save = () => {
    if (!form.name.trim()) { showToast('请输入商品名称', 'error'); return; }
    if (form.price < 0) { showToast('价格不能为负', 'error'); return; }
    const id = (form as any).id || uid('p');
    upsert({ id, ...form });
    showToast(`已保存「${form.name}」`, 'success');
    setOpen(false);
  };

  const toggleActive = (p: Product) => {
    upsert({ ...p, active: !p.active });
    showToast(`${p.name} 已${p.active ? '下架' : '上架'}`, 'info');
  };

  const statsByCat = (() => {
    const m: Record<string, number> = {};
    products.forEach(p => { m[p.category] = (m[p.category] || 0) + p.stock; });
    return m;
  })();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-serif text-2xl font-bold text-felt-700">商品管理</h1>
          <p className="text-xs text-felt-500 mt-0.5">饮料、小吃等，前台加购时会联动库存</p>
        </div>
        <button className="btn-primary" onClick={addNew}>
          <Plus size={16} /> 新增商品
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {Object.entries(statsByCat).map(([c, s]) => (
          <div key={c} className="card p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gold-500/15 text-gold-600 flex items-center justify-center text-xl">
              {c === '饮料' ? '🥤' : c === '小吃' ? '🍟' : '📦'}
            </div>
            <div>
              <div className="text-xs text-felt-500">{c} · 库存总数</div>
              <div className="font-serif text-2xl font-bold text-felt-700">{s}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 bg-cream-50/60 border-b border-cream-200 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-felt-400" />
            <input className="input pl-9 !py-2" placeholder="搜索商品..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="ml-auto text-xs text-felt-500">共 {list.length} 个商品</div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cream-50 text-xs uppercase tracking-wide text-felt-500 border-b border-cream-200">
              <th className="text-left py-3 px-5 font-semibold">商品</th>
              <th className="text-left py-3 px-4 font-semibold">分类</th>
              <th className="text-right py-3 px-4 font-semibold">售价</th>
              <th className="text-center py-3 px-4 font-semibold">库存</th>
              <th className="text-center py-3 px-4 font-semibold">状态</th>
              <th className="text-right py-3 px-5 font-semibold w-28">操作</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={6} className="py-16 text-center text-felt-400">暂无商品</td></tr>
            ) : list.map(p => (
              <tr key={p.id} className="border-b border-cream-100 hover:bg-cream-50/40">
                <td className="py-3 px-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-cream-100 flex items-center justify-center text-xl">
                      {p.category === '饮料' ? '🥤' : p.category === '小吃' ? '🍟' : '📦'}
                    </div>
                    <div className="font-semibold text-felt-700">{p.name}</div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="chip border-felt-100 bg-felt-500/5 text-felt-600 text-xs">{p.category}</span>
                </td>
                <td className="py-3 px-4 text-right font-serif font-bold text-felt-700">{formatMoney(p.price)}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`font-mono font-bold ${p.stock === 0 ? 'text-danger-500' : p.stock < 10 ? 'text-warn-500' : 'text-felt-700'}`}>
                    {p.stock}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <button onClick={() => toggleActive(p)} className="inline-flex">
                    {p.active ? <ToggleRight size={22} className="text-felt-500" /> : <ToggleLeft size={22} className="text-felt-300" />}
                  </button>
                  <span className="ml-2 text-xs font-semibold">{p.active ? '在售' : '停售'}</span>
                </td>
                <td className="py-3 px-5 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button onClick={() => edit(p)} className="p-1.5 rounded hover:bg-felt-500/10 text-felt-500" title="编辑">
                      <Edit3 size={15} />
                    </button>
                    <button onClick={() => setToDelete(p)} className="p-1.5 rounded hover:bg-danger-500/10 text-danger-500" title="删除">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? '编辑商品' : '新增商品'}
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)}>取消</button>
            <button className="btn-primary" onClick={save}>保存</button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">商品名称</label>
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="如：可口可乐 330ml" />
          </div>
          <div>
            <label className="label">分类</label>
            <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value as any })}>
              <option value="饮料">饮料</option>
              <option value="小吃">小吃</option>
              <option value="其他">其他</option>
            </select>
          </div>
          <div>
            <label className="label">售价（元）</label>
            <input type="number" min={0} step={0.01} className="input" value={form.price || ''}
              onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="label">库存</label>
            <input type="number" min={0} className="input" value={form.stock || ''}
              onChange={e => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="flex items-end pb-2">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })}
                className="w-4 h-4 text-felt-500 rounded border-felt-300 focus:ring-felt-500" />
              <span className="text-sm text-felt-700 font-medium">上架中</span>
            </label>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        danger
        onConfirm={() => {
          if (toDelete) { upsert({ ...toDelete, active: false, stock: 0 }); showToast('已删除（下架并置零库存）', 'success'); }
          setToDelete(null);
        }}
        title="删除商品？"
        message={<>确定删除「{toDelete?.name}」？<br /><span className="text-xs text-felt-500">系统会将其下架并将库存置零，历史订单数据不受影响。</span></>}
      />
    </div>
  );
}
