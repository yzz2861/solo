import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Undo2,
  CheckCircle2,
  AlertTriangle,
  Droplets,
  XCircle,
  Wrench,
  User,
  Phone,
  CalendarDays,
} from 'lucide-react';
import { useRentalStore } from '@/store/rentalStore';
import {
  categoryEmoji,
  conditionLabel,
  currency,
  formatDateTime,
} from '@/components/ui/helpers';
import type { ReturnCondition } from '../../shared/types.js';

interface SelectedItem {
  id: number;
  condition: ReturnCondition;
  missing: string[];
  damage: string;
  damageAmount: string;
}

export default function ReturnPage() {
  const { activeRentals, loadActiveRentals, returnItem, showToast } = useRentalStore();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void loadActiveRentals();
  }, [loadActiveRentals]);

  const filtered = useMemo(() => {
    if (!query.trim()) return activeRentals;
    const q = query.trim().toLowerCase();
    return activeRentals.filter(
      (r) =>
        r.renterName.toLowerCase().includes(q) ||
        r.renterPhone.includes(q) ||
        String(r.id).includes(q) ||
        r.items.some(
          (it) =>
            it.equipment?.name.toLowerCase().includes(q) ||
            String(it.equipmentId).includes(q)
        )
    );
  }, [activeRentals, query]);

  function selectItem(itemId: number, equipmentId: number, accessories: string[]) {
    if (selected?.id === itemId) {
      setSelected(null);
      return;
    }
    setSelected({
      id: itemId,
      condition: 'needs_cleaning',
      missing: [],
      damage: '',
      damageAmount: '',
    });
    void equipmentId;
    void accessories;
  }

  function toggleMissing(a: string) {
    if (!selected) return;
    setSelected({
      ...selected,
      missing: selected.missing.includes(a)
        ? selected.missing.filter((x) => x !== a)
        : [...selected.missing, a],
    });
  }

  async function handleReturn() {
    if (!selected) return;
    if (
      selected.condition === 'damaged' &&
      (!selected.damage.trim() || !selected.damageAmount || Number(selected.damageAmount) <= 0)
    ) {
      return showToast('error', '有损坏时请填写损坏描述和扣款金额');
    }
    if (selected.missing.length > 0 && !selected.damage.trim()) {
      return showToast('error', '配件缺失时请填写备注说明');
    }

    setSubmitting(true);
    try {
      const result = await returnItem(selected.id, {
        returnCondition: selected.condition,
        missingAccessories: selected.missing,
        damageNotes: selected.damage.trim() || undefined,
        damageAmount: selected.damageAmount ? Number(selected.damageAmount) : undefined,
      });
      if (result.alreadyReturned) {
        showToast('error', '该装备已归还，请勿重复操作');
      } else if (result.claim) {
        showToast(
          'success',
          `归还登记完成\n已生成赔损单 ¥${result.claim.amount}，等待店长审批`
        );
      } else {
        showToast('success', '归还登记完成，已加入待清洁队列');
      }
      setSelected(null);
      void loadActiveRentals();
    } catch (e) {
      showToast('error', (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <div className="xl:col-span-3 space-y-4">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-cream-200 shadow-soft p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-bark-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索租客姓名、电话、租单号或装备名称..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-cream-200 bg-white focus:outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100 text-sm"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white/70 rounded-2xl border border-cream-200 p-12 text-center text-bark-400">
            <Undo2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">
              {query.trim() ? '没有匹配的租单' : '暂无进行中租单'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((rental) => (
              <div
                key={rental.id}
                className="bg-white/70 backdrop-blur-sm rounded-2xl border border-cream-200 shadow-soft overflow-hidden"
              >
                <div className="p-5 border-b border-cream-200 bg-gradient-to-r from-cream-50 to-transparent">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-lg text-bark-800">
                          {rental.renterName}
                        </span>
                        <span className="text-xs text-bark-400">#{rental.id}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-bark-500">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {rental.renterPhone}
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {rental.startDate} ~ {rental.endDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          押金 {currency(rental.deposit)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <ul className="divide-y divide-cream-100">
                  {rental.items.map((it) => {
                    const eq = it.equipment;
                    const isSelected = selected?.id === it.id;
                    return (
                      <li key={it.id}>
                        <button
                          onClick={() =>
                            selectItem(
                              it.id,
                              it.equipmentId,
                              eq?.accessories || []
                            )
                          }
                          disabled={it.returned}
                          className={`w-full text-left p-4 flex items-center gap-4 transition ${
                            it.returned
                              ? 'bg-forest-50/50 cursor-default opacity-70'
                              : isSelected
                              ? 'bg-ember-50/50'
                              : 'hover:bg-cream-50'
                          }`}
                        >
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                              it.returned ? 'bg-forest-100' : 'bg-cream-100'
                            }`}
                          >
                            {eq ? categoryEmoji[eq.category] : '📦'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-bark-800 text-sm">
                                {eq?.name || '装备 #' + it.equipmentId}
                              </span>
                              {it.returned ? (
                                <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-forest-100 text-forest-700">
                                  <CheckCircle2 className="w-3 h-3" />
                                  已归还 · {formatDateTime(it.returnedAt)}
                                </span>
                              ) : (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-ember-100 text-ember-700">
                                  待归还
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-bark-400 mt-0.5">
                              配件：{it.accessoriesChecked.join('、') || '无'}
                            </div>
                          </div>
                          {!it.returned && (
                            <div className="shrink-0 text-ember-600 text-sm font-medium flex items-center gap-1">
                              <Undo2 className="w-4 h-4" />
                              {isSelected ? '编辑中' : '点此归还'}
                            </div>
                          )}
                        </button>

                        {isSelected && eq && selected?.id === it.id && (
                          <div className="px-4 pb-5 animate-fade-in-up">
                            <div className="p-4 rounded-xl bg-white border border-cream-200 space-y-4">
                              <div>
                                <div className="text-xs font-semibold text-bark-600 mb-2">
                                  归还状态
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  {(['clean', 'needs_cleaning', 'damaged'] as ReturnCondition[]).map(
                                    (cond) => (
                                      <button
                                        key={cond}
                                        onClick={() =>
                                          setSelected({ ...selected, condition: cond })
                                        }
                                        className={`p-3 rounded-xl text-xs font-medium border-2 transition ${
                                          selected.condition === cond
                                            ? cond === 'damaged'
                                              ? 'border-rose-400 bg-rose-50 text-rose-700'
                                              : cond === 'needs_cleaning'
                                              ? 'border-amber-400 bg-amber-50 text-amber-700'
                                              : 'border-forest-400 bg-forest-50 text-forest-700'
                                            : 'border-cream-200 bg-white text-bark-600 hover:border-cream-300'
                                        }`}
                                      >
                                        <div className="flex justify-center mb-1">
                                          {cond === 'damaged' ? (
                                            <Wrench className="w-4 h-4" />
                                          ) : cond === 'needs_cleaning' ? (
                                            <Droplets className="w-4 h-4" />
                                          ) : (
                                            <CheckCircle2 className="w-4 h-4" />
                                          )}
                                        </div>
                                        {conditionLabel[cond]}
                                      </button>
                                    )
                                  )}
                                </div>
                              </div>

                              <div>
                                <div className="text-xs font-semibold text-bark-600 mb-2">
                                  缺失配件（点击勾选）
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {it.accessoriesChecked.length === 0 && (
                                    <span className="text-xs text-bark-400">无配件</span>
                                  )}
                                  {it.accessoriesChecked.map((a) => {
                                    const on = selected.missing.includes(a);
                                    return (
                                      <button
                                        key={a}
                                        onClick={() => toggleMissing(a)}
                                        className={`text-xs px-2.5 py-1 rounded-full border transition ${
                                          on
                                            ? 'bg-rose-100 text-rose-700 border-rose-300 line-through'
                                            : 'bg-white text-bark-600 border-cream-300 hover:border-rose-300'
                                        }`}
                                      >
                                        {on && <XCircle className="inline w-3 h-3 mr-1 -mt-0.5" />}
                                        {a}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {(selected.condition === 'damaged' ||
                                selected.missing.length > 0) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-semibold text-bark-600 mb-1.5">
                                      损坏/缺失备注 <span className="text-rose-500">*</span>
                                    </label>
                                    <textarea
                                      value={selected.damage}
                                      onChange={(e) =>
                                        setSelected({ ...selected, damage: e.target.value })
                                      }
                                      placeholder="描述问题，例如：睡袋受潮发霉、炉头调节旋钮断裂..."
                                      rows={3}
                                      className="w-full px-3 py-2 rounded-xl border border-cream-200 text-sm focus:outline-none focus:border-ember-400 focus:ring-2 focus:ring-ember-100"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-bark-600 mb-1.5">
                                      赔损扣款金额 (¥)
                                    </label>
                                    <input
                                      type="number"
                                      value={selected.damageAmount}
                                      onChange={(e) =>
                                        setSelected({ ...selected, damageAmount: e.target.value })
                                      }
                                      placeholder="0"
                                      className="w-full px-3 py-2.5 rounded-xl border border-cream-200 text-sm focus:outline-none focus:border-ember-400 focus:ring-2 focus:ring-ember-100"
                                    />
                                    <p className="text-[11px] text-bark-400 mt-1.5">
                                      <AlertTriangle className="inline w-3 h-3 mr-1 -mt-0.5" />
                                      填写金额后将自动提交店长审批
                                    </p>
                                  </div>
                                </div>
                              )}

                              <button
                                onClick={handleReturn}
                                disabled={submitting}
                                className="w-full py-3 rounded-xl bg-ember-500 hover:bg-ember-600 text-white font-semibold shadow-lg shadow-ember-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 flex items-center justify-center gap-2"
                              >
                                <Undo2 className="w-4 h-4" />
                                {submitting ? '提交中...' : '确认归还'}
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="xl:col-span-2">
        <div className="sticky top-6 bg-gradient-to-br from-bark-700 to-bark-800 text-white rounded-2xl shadow-card p-6">
          <h3 className="font-display text-lg mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-ember-300" />
            归还登记要点
          </h3>
          <ul className="space-y-3 text-sm text-bark-100">
            <li className="flex gap-3">
              <span className="text-ember-300 shrink-0">①</span>
              逐件检查装备，同一装备重复归还会自动拦截提示
            </li>
            <li className="flex gap-3">
              <span className="text-ember-300 shrink-0">②</span>
              发现装备潮湿（睡袋/帐篷等）务必标记"需清洁"
            </li>
            <li className="flex gap-3">
              <span className="text-ember-300 shrink-0">③</span>
              配件缺失或装备损坏请填写备注和扣款金额
            </li>
            <li className="flex gap-3">
              <span className="text-ember-300 shrink-0">④</span>
              有扣款的赔损单需店长审批后才从押金中扣除
            </li>
            <li className="flex gap-3">
              <span className="text-ember-300 shrink-0">⑤</span>
              未清洁装备自动进入工作台待清洁队列，不能再租
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
