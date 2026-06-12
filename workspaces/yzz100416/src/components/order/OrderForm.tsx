import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Minus,
  UserCircle,
  Car,
  CreditCard,
  Flower2,
  Users,
  Clock,
  FileText,
  Sparkles,
  RotateCcw,
  Trash2,
  Save,
  X,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { OrderFlower } from '@/types';
import {
  validatePlateNumber,
  checkPlateDuplicate,
  checkFloristTimeConflict,
} from '@/utils/validators';
import clsx from 'clsx';

const emptyDraft = (date: string) => ({
  coupleName: '',
  carModel: '',
  plateNumber: '',
  flowers: [] as OrderFlower[],
  floristId: null as string | null,
  arrivalTime: '',
  handoverNote: '',
  date,
});

type FieldErrors = Partial<Record<keyof ReturnType<typeof emptyDraft> | 'submit', string>>;

export const OrderForm = () => {
  const {
    flowers,
    florists,
    orders,
    selectedDate,
    formDraft,
    saveDraft,
    clearDraft,
    addOrder,
    refreshAlerts,
  } = useAppStore();

  const draft = formDraft && Object.keys(formDraft).length > 0
    ? { ...emptyDraft(selectedDate), ...formDraft }
    : emptyDraft(selectedDate);

  const [form, setForm] = useState(draft);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [warnings, setWarnings] = useState<{ field?: string; msg: string }[]>([]);
  const [savedFlash, setSavedFlash] = useState(false);

  // 同步日期变化
  useEffect(() => {
    setForm(p => ({ ...p, date: selectedDate }));
  }, [selectedDate]);

  // 自动保存草稿
  useEffect(() => {
    saveDraft(form);
  }, [form, saveDraft]);

  // 实时校验
  useEffect(() => {
    const e: FieldErrors = {};
    const w: { field?: string; msg: string }[] = [];

    if (!form.coupleName.trim()) e.coupleName = '请输入新人姓名';
    if (!form.carModel.trim()) e.carModel = '请输入车型';

    const plateErr = validatePlateNumber(form.plateNumber.trim());
    if (!form.plateNumber.trim()) {
      e.plateNumber = '请输入车牌号';
    } else if (plateErr) {
      e.plateNumber = plateErr;
    } else if (checkPlateDuplicate(undefined, form.date, form.plateNumber.trim(), orders)) {
      e.plateNumber = '当日车牌已存在';
    }

    if (form.flowers.length === 0) {
      e.submit = '请至少选择一种花材';
    }
    if (!form.floristId) w.push({ field: 'floristId', msg: '未分配扎花师' });
    if (!form.arrivalTime) e.arrivalTime = '请选择到店时间';

    if (form.floristId && form.arrivalTime) {
      const conflicts = checkFloristTimeConflict(
        undefined,
        form.date,
        form.floristId,
        form.arrivalTime,
        orders
      );
      if (conflicts.length > 0) {
        w.push({
          msg: `扎花师时间冲突：与「${conflicts[0].coupleName}」(${conflicts[0].arrivalTime}) 间隔不足60分钟`,
        });
      }
    }

    setErrors(e);
    setWarnings(w);
  }, [form, orders]);

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(p => ({ ...p, [key]: value }));
  };

  const addFlower = (flowerId: string) => {
    if (form.flowers.find(x => x.flowerId === flowerId)) return;
    updateField('flowers', [...form.flowers, { flowerId, quantity: 1 }]);
  };

  const removeFlower = (flowerId: string) => {
    updateField('flowers', form.flowers.filter(x => x.flowerId !== flowerId));
  };

  const setFlowerQty = (flowerId: string, qty: number) => {
    updateField('flowers', form.flowers.map(x =>
      x.flowerId === flowerId ? { ...x, quantity: Math.max(1, qty) } : x
    ));
  };

  const selectedFlowerIds = useMemo(() => form.flowers.map(x => x.flowerId), [form.flowers]);

  const groupedFlowers = useMemo(() => {
    const m: Record<string, typeof flowers> = {};
    flowers.forEach(f => {
      (m[f.category] ||= []).push(f);
    });
    return m;
  }, [flowers]);

  const costTotal = useMemo(() => {
    return form.flowers.reduce((s, of) => {
      const f = flowers.find(x => x.id === of.flowerId);
      return s + (f ? f.price * of.quantity : 0);
    }, 0);
  }, [form.flowers, flowers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(errors).length > 0) return;

    addOrder({
      date: form.date,
      coupleName: form.coupleName.trim(),
      carModel: form.carModel.trim(),
      plateNumber: form.plateNumber.trim().toUpperCase().replace(/\./g, '·'),
      flowers: form.flowers,
      floristId: form.floristId,
      arrivalTime: form.arrivalTime,
      handoverNote: form.handoverNote.trim(),
    });

    clearDraft();
    setForm(emptyDraft(selectedDate));
    setSavedFlash(true);
    refreshAlerts();
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const handleReset = () => {
    if (Object.keys(form).some(k => (form as any)[k] !== (emptyDraft(selectedDate) as any)[k])) {
      if (!confirm('清空当前录入内容？')) return;
    }
    clearDraft();
    setForm(emptyDraft(selectedDate));
  };

  const inputClass = (k: keyof FieldErrors) =>
    clsx('input', errors[k] && 'input-error');

  return (
    <div className="card flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-cream-200 bg-gradient-to-r from-gold-400/10 to-rose-100/50 flex items-center justify-between">
        <div>
          <h3 className="font-serif font-semibold text-coffee-700 text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold-500" />
            录入新订单
          </h3>
          <p className="text-[11px] text-coffee-500 mt-0.5">自动保存草稿 · 刷新不丢失</p>
        </div>
        {savedFlash && (
          <span className="tag tag-done animate-pulse-warning">
            <Save className="w-3 h-3" /> 已保存
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-4 space-y-4">
          {/* 新人 */}
          <div>
            <label className="label">
              <UserCircle className="w-3 h-3 inline -mt-0.5 mr-1 text-rose-400" />
              新人姓名 *
            </label>
            <input
              className={inputClass('coupleName')}
              placeholder="如：陈先生 & 李小姐"
              value={form.coupleName}
              onChange={e => updateField('coupleName', e.target.value)}
            />
            {errors.coupleName && (
              <p className="text-[11px] text-danger-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.coupleName}
              </p>
            )}
          </div>

          {/* 车型 & 车牌 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">
                <Car className="w-3 h-3 inline -mt-0.5 mr-1 text-gold-500" />
                车型 *
              </label>
              <input
                className={inputClass('carModel')}
                placeholder="如：奔驰 S400"
                value={form.carModel}
                onChange={e => updateField('carModel', e.target.value)}
              />
              {errors.carModel && <p className="text-[11px] text-danger-600 mt-1">{errors.carModel}</p>}
            </div>
            <div>
              <label className="label">
                <CreditCard className="w-3 h-3 inline -mt-0.5 mr-1 text-coffee-400" />
                车牌号 *
              </label>
              <input
                className={inputClass('plateNumber')}
                placeholder="粤B·A8888"
                value={form.plateNumber}
                onChange={e => updateField('plateNumber', e.target.value)}
              />
              {errors.plateNumber && (
                <p className="text-[11px] text-danger-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.plateNumber}
                </p>
              )}
            </div>
          </div>

          {/* 扎花师 & 到店时间 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">
                <Users className="w-3 h-3 inline -mt-0.5 mr-1 text-sage-500" />
                扎花师
              </label>
              <select
                className={clsx('input', warnings.find(w => w.field === 'floristId') && 'border-amber-500')}
                value={form.floristId || ''}
                onChange={e => updateField('floristId', e.target.value || null)}
              >
                <option value="">未分配</option>
                {florists.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">
                <Clock className="w-3 h-3 inline -mt-0.5 mr-1 text-coffee-500" />
                到店时间 *
              </label>
              <input
                type="time"
                className={inputClass('arrivalTime')}
                value={form.arrivalTime}
                onChange={e => updateField('arrivalTime', e.target.value)}
              />
              {errors.arrivalTime && <p className="text-[11px] text-danger-600 mt-1">{errors.arrivalTime}</p>}
            </div>
          </div>

          {/* 花材选择 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label !mb-0">
                <Flower2 className="w-3 h-3 inline -mt-0.5 mr-1 text-rose-400" />
                花材清单
              </label>
              <span className="text-[11px] text-gold-600 font-semibold">小计 ¥{costTotal}</span>
            </div>

            {selectedFlowerIds.length > 0 && (
              <div className="mb-3 border border-rose-200/50 rounded-xl p-3 bg-rose-50/40 space-y-2">
                {form.flowers.map(of => {
                  const f = flowers.find(x => x.id === of.flowerId);
                  if (!f) return null;
                  const shortage = of.quantity > f.stock;
                  return (
                    <div key={of.flowerId} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-coffee-700 flex items-center gap-1.5">
                          <span>{f.name}</span>
                          <span className="tag tag-pending !py-0">{f.category}</span>
                          {shortage && <span className="tag tag-danger !py-0 animate-pulse-warning">库存不足</span>}
                        </div>
                        <div className="text-[10px] text-coffee-400">
                          ¥{f.price}/{f.unit} · 库存{f.stock}{f.unit}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-white rounded-lg border border-cream-200 p-0.5">
                        <button
                          type="button"
                          onClick={() => setFlowerQty(of.flowerId, of.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center rounded-md text-coffee-500 hover:bg-cream-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold text-coffee-700">
                          {of.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setFlowerQty(of.flowerId, of.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center rounded-md text-coffee-500 hover:bg-cream-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-xs font-semibold text-gold-600 w-12 text-right">
                        ¥{f.price * of.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFlower(of.flowerId)}
                        className="text-coffee-200 hover:text-danger-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-2">
              {Object.entries(groupedFlowers).map(([cat, list]) => (
                <div key={cat}>
                  <div className="text-[11px] text-coffee-500 font-medium mb-1.5 px-0.5 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-rose-300" />
                    {cat}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {list.map(f => {
                      const selected = selectedFlowerIds.includes(f.id);
                      const low = f.stock < f.safeStock;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => !selected && addFlower(f.id)}
                          disabled={selected}
                          className={clsx(
                            'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border',
                            selected
                              ? 'bg-rose-200/50 border-rose-300 text-coffee-500 cursor-default'
                              : 'bg-white border-cream-200 text-coffee-600 hover:border-rose-300 hover:bg-rose-50 hover:-translate-y-0.5',
                            low && !selected && 'border-amber-400/50 bg-amber-50'
                          )}
                        >
                          <Flower2 className={clsx('w-3 h-3', selected ? 'text-rose-400' : low ? 'text-amber-500' : 'text-rose-300')} />
                          <span>{f.name}</span>
                          <span className={clsx('opacity-70', low && 'text-amber-600 font-semibold')}>
                            {f.stock}{f.unit}
                          </span>
                          {selected && <X className="w-3 h-3 text-coffee-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 交接备注 */}
          <div>
            <label className="label">
              <FileText className="w-3 h-3 inline -mt-0.5 mr-1 text-coffee-400" />
              交接备注
            </label>
            <textarea
              className="input min-h-[72px] resize-y"
              placeholder="车头花型、副车数量、丝带颜色等注意事项..."
              value={form.handoverNote}
              onChange={e => updateField('handoverNote', e.target.value)}
            />
          </div>

          {/* 警告汇总 */}
          {warnings.length > 0 && (
            <div className="space-y-1.5">
              {warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-500/8 border border-amber-500/30 rounded-lg px-2.5 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px text-amber-500" />
                  <span>{w.msg}</span>
                </div>
              ))}
            </div>
          )}
          {errors.submit && (
            <div className="flex items-start gap-1.5 text-[11px] text-danger-600 bg-danger-500/8 border border-danger-500/30 rounded-lg px-2.5 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
              <span>{errors.submit}</span>
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="sticky bottom-0 p-4 border-t border-cream-200 bg-gradient-to-t from-white via-white to-white/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleReset} className="btn btn-secondary flex-1">
              <RotateCcw className="w-4 h-4" />
              清空
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={Object.keys(errors).length > 0}
            >
              <Save className="w-4 h-4" />
              保存订单
            </button>
          </div>
          <div className="text-center text-[11px] text-coffee-400 mt-2">
            预估成本 <span className="font-semibold text-gold-600">¥{costTotal}</span>
          </div>
        </div>
      </form>
    </div>
  );
};
