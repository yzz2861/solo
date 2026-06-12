import { useState, useMemo } from 'react';
import { PackageOpen, CheckSquare, Square, ShieldCheck, ShieldAlert, Upload, Search, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useRecycleStore } from '../../store/useRecycleStore';
import { useAuthStore } from '../../store/useAuthStore';
import StatusBadge from '../common/StatusBadge';
import PriceTag from '../common/PriceTag';
import ConfirmDialog from '../common/ConfirmDialog';

export default function ShelfReviewList() {
  const orders = useRecycleStore((s) => s.orders);
  const batchOnShelf = useRecycleStore((s) => s.batchOnShelf);
  const { currentUser } = useAuthStore();
  const nav = useNavigate();

  const [keyword, setKeyword] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const pendingList = useMemo(() => {
    const list = orders.filter(o => o.status === 'in_stock');
    if (!keyword.trim()) return list;
    const k = keyword.toLowerCase();
    return list.filter(o =>
      o.serialNumber.toLowerCase().includes(k) ||
      o.brand.toLowerCase().includes(k) ||
      o.model.toLowerCase().includes(k)
    );
  }, [orders, keyword]);

  const availableIds = useMemo(
    () => pendingList.filter(o => o.privacyWiped).map(o => o.id),
    [pendingList]
  );

  const allSelected = availableIds.length > 0 && availableIds.every(id => selected.includes(id));

  const toggleOne = (id: string, canSelect: boolean) => {
    if (!canSelect) return;
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (allSelected) setSelected([]);
    else setSelected([...availableIds]);
  };

  const doBatch = () => {
    if (!currentUser || selected.length === 0) return;
    batchOnShelf(selected, currentUser.name, currentUser.role);
    setSelected([]);
    setConfirmOpen(false);
  };

  const hasWarn = (o: any) => !o.privacyWiped;

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <PackageOpen size={18} />
            </span>
            上架审核列表
            <span className="text-xs font-normal text-slate-400 ml-1">
              （仅已确认隐私清除的设备可批量上架）
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            在库待上架 {pendingList.length} 台，已勾选 <span className="font-bold text-brand-600">{selected.length}</span> 台
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9 w-64"
              placeholder="搜索序列号 / 机型"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
            />
          </div>
          <button
            disabled={selected.length === 0}
            onClick={() => setConfirmOpen(true)}
            className="btn-primary"
          >
            <Upload size={16} />
            批量上架（{selected.length}）
          </button>
        </div>
      </div>

      {pendingList.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400">
          <PackageOpen size={48} className="mb-3 opacity-40" />
          <div className="text-sm">暂无待上架商品</div>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden border border-slate-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs">
                <th className="w-10 px-4 py-3 text-left">
                  <button
                    onClick={toggleAll}
                    className={`p-1 rounded transition-colors ${allSelected ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {allSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium">商品信息</th>
                <th className="px-4 py-3 text-left font-medium">序列号</th>
                <th className="px-4 py-3 text-left font-medium">成色</th>
                <th className="px-4 py-3 text-right font-medium">成交价</th>
                <th className="px-4 py-3 text-center font-medium">隐私清除</th>
                <th className="px-4 py-3 text-left font-medium">入库时间</th>
                <th className="px-4 py-3 text-center font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {pendingList.map(o => {
                const canSelect = o.privacyWiped;
                const isSelected = selected.includes(o.id);
                return (
                  <tr
                    key={o.id}
                    className={`border-t border-slate-50 hover:bg-slate-50/60 transition-colors ${
                      !canSelect ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleOne(o.id, canSelect)}
                        disabled={!canSelect}
                        className={`p-1 rounded transition-colors ${
                          !canSelect
                            ? 'text-slate-300 cursor-not-allowed'
                            : isSelected
                            ? 'text-brand-600'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={o.photos[0]}
                          alt=""
                          className="w-12 h-12 rounded-xl object-cover border border-slate-100 bg-slate-50"
                        />
                        <div>
                          <div className="font-semibold text-slate-800">
                            {o.brand} {o.model}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {o.storage} · {o.color}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 tabular-nums">
                      {o.serialNumber}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        o.appearanceRating === 'A+' ? 'bg-emerald-100 text-emerald-700' :
                        o.appearanceRating === 'A' ? 'bg-brand-100 text-brand-700' :
                        o.appearanceRating === 'B' ? 'bg-blue-100 text-blue-700' :
                        o.appearanceRating === 'C' ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {o.appearanceRating}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PriceTag value={o.finalPrice ?? o.initialPrice} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {o.privacyWiped ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                          <ShieldCheck size={12} />
                          已确认
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-medium">
                          <ShieldAlert size={12} />
                          未确认
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 font-mono tabular-nums">
                      {dayjs(o.createdAt).format('MM-DD HH:mm')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => nav(`/detail/${o.id}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-brand-600 hover:bg-brand-50 transition-colors"
                      >
                        <Eye size={13} />
                        详情
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="确认批量上架"
        onClose={() => setConfirmOpen(false)}
        onConfirm={doBatch}
        confirmText={`上架 ${selected.length} 台`}
        confirmTone="primary"
      >
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-brand-50 border-2 border-brand-100">
            <div className="text-sm text-slate-700">
              即将将 <span className="font-black text-brand-700 text-lg">{selected.length}</span> 台设备标记为 <span className="font-bold text-emerald-700">已上架</span>，可售状态。
            </div>
          </div>
          <div className="text-xs text-slate-500">
            操作人：{currentUser?.name}（{currentUser?.role === 'manager' ? '店长' : '店员'}）
          </div>
        </div>
      </ConfirmDialog>
    </div>
  );
}
