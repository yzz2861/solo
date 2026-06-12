import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tent, User, Phone, CreditCard, Calendar, Package, CheckCircle2, ArrowRight } from 'lucide-react';
import { useRentalStore } from '@/store/rentalStore';
import { categoryEmoji, categoryLabel, currency, statusLabel } from '@/components/ui/helpers';
import type { Equipment } from '../../shared/types.js';

export default function RentPage() {
  const navigate = useNavigate();
  const { equipment, loadEquipment, createRental, showToast } = useRentalStore();

  const [renterName, setRenterName] = useState('');
  const [renterPhone, setRenterPhone] = useState('');
  const [renterIdCard, setRenterIdCard] = useState('');
  const [deposit, setDeposit] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [accessoriesMap, setAccessoriesMap] = useState<Record<number, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void loadEquipment({ status: 'available' });
  }, [loadEquipment]);

  const availableEquip = useMemo(
    () => equipment.filter((e) => e.status === 'available'),
    [equipment]
  );

  const totalDeposit = useMemo(() => {
    return selectedIds.reduce(
      (sum, id) => sum + (equipment.find((e) => e.id === id)?.deposit || 0),
      0
    );
  }, [selectedIds, equipment]);

  function toggleEquip(id: number) {
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      if (exists) {
        const next = prev.filter((x) => x !== id);
        setAccessoriesMap((m) => {
          const copy = { ...m };
          delete copy[id];
          return copy;
        });
        return next;
      }
      const eq = equipment.find((e) => e.id === id);
      if (eq) setAccessoriesMap((m) => ({ ...m, [id]: [...eq.accessories] }));
      return [...prev, id];
    });
  }

  function toggleAccessory(equipId: number, acc: string) {
    setAccessoriesMap((m) => {
      const cur = m[equipId] || [];
      return {
        ...m,
        [equipId]: cur.includes(acc) ? cur.filter((a) => a !== acc) : [...cur, acc],
      };
    });
  }

  async function handleSubmit() {
    if (!renterName.trim()) return showToast('error', '请填写租客姓名');
    if (!/^1\d{10}$/.test(renterPhone.trim())) return showToast('error', '请填写正确的手机号');
    if (!selectedIds.length) return showToast('error', '请至少选择一件装备');
    if (!deposit || Number(deposit) <= 0) return showToast('error', '请填写押金金额');
    if (startDate > endDate) return showToast('error', '租期结束日期不能早于开始日期');

    setSubmitting(true);
    try {
      await createRental({
        renterName: renterName.trim(),
        renterPhone: renterPhone.trim(),
        renterIdCard: renterIdCard.trim() || undefined,
        deposit: Number(deposit),
        startDate,
        endDate,
        notes: notes.trim() || undefined,
        items: selectedIds.map((id) => ({
          equipmentId: id,
          accessoriesChecked: accessoriesMap[id] || [],
        })),
      });
      showToast('success', '租单已创建，装备状态已更新');
      setTimeout(() => navigate('/'), 600);
    } catch (e) {
      showToast('error', (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        <section className="bg-white/70 backdrop-blur-sm rounded-2xl border border-cream-200 shadow-soft p-6">
          <h3 className="font-display text-lg text-bark-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-forest-700" />
            租客信息
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field icon={User} label="姓名 *" value={renterName} onChange={setRenterName} placeholder="请输入姓名" />
            <Field icon={Phone} label="手机号 *" value={renterPhone} onChange={setRenterPhone} placeholder="11 位手机号" />
            <Field icon={CreditCard} label="身份证号" value={renterIdCard} onChange={setRenterIdCard} placeholder="可选" />
            <Field icon={CreditCard} label="押金金额 (¥) *" type="number" value={deposit} onChange={setDeposit} placeholder={`建议 ${currency(totalDeposit)}`} />
            <Field icon={Calendar} label="租用开始 *" type="date" value={startDate} onChange={setStartDate} />
            <Field icon={Calendar} label="租用结束 *" type="date" value={endDate} onChange={setEndDate} />
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-bark-500 mb-1.5">备注</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="可选，例如露营地点、注意事项等"
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl border border-cream-200 bg-white focus:outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100 transition text-sm"
              />
            </div>
          </div>
        </section>

        <section className="bg-white/70 backdrop-blur-sm rounded-2xl border border-cream-200 shadow-soft p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg text-bark-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-forest-700" />
              选择装备（可多选）
            </h3>
            <span className="text-sm text-bark-500">
              已选 <span className="font-semibold text-forest-700">{selectedIds.length}</span> 件
            </span>
          </div>

          {availableEquip.length === 0 ? (
            <div className="text-center py-12 text-bark-400 text-sm">暂无可租装备</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableEquip.map((eq) => (
                <EquipmentCard
                  key={eq.id}
                  eq={eq}
                  selected={selectedIds.includes(eq.id)}
                  checkedAcc={accessoriesMap[eq.id] || []}
                  onToggle={() => toggleEquip(eq.id)}
                  onToggleAcc={(a) => toggleAccessory(eq.id, a)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="space-y-6">
        <section className="sticky top-6 bg-gradient-to-br from-forest-800 to-forest-900 text-white rounded-2xl shadow-card p-6">
          <h3 className="font-display text-lg mb-4">订单汇总</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between opacity-90">
              <span>租客</span>
              <span className="font-medium">{renterName || '—'}</span>
            </div>
            <div className="flex justify-between opacity-90">
              <span>租期</span>
              <span className="font-medium">{startDate} ~ {endDate}</span>
            </div>
            <div className="flex justify-between opacity-90">
              <span>装备数量</span>
              <span className="font-medium">{selectedIds.length} 件</span>
            </div>
            <div className="h-px bg-white/15 my-2" />
            <div className="flex justify-between items-baseline">
              <span>押金应收</span>
              <span className="font-display text-3xl text-ember-300">
                {currency(Number(deposit) || totalDeposit)}
              </span>
            </div>
            {Number(deposit) !== totalDeposit && totalDeposit > 0 && (
              <div className="text-xs text-forest-200">
                装备累计押金 {currency(totalDeposit)}
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full mt-6 py-3 rounded-xl bg-ember-500 hover:bg-ember-600 text-white font-semibold shadow-lg shadow-ember-900/30 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Tent className="w-4 h-4" />
            {submitting ? '提交中...' : '确认租出'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>
      </div>
    </div>
  );
}

interface FieldProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}

function Field({ icon: Icon, label, value, onChange, placeholder, type = 'text' }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-bark-500 mb-1.5">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bark-400" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-cream-200 bg-white focus:outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100 transition text-sm"
        />
      </div>
    </div>
  );
}

interface EquipCardProps {
  eq: Equipment;
  selected: boolean;
  checkedAcc: string[];
  onToggle: () => void;
  onToggleAcc: (a: string) => void;
}

function EquipmentCard({ eq, selected, checkedAcc, onToggle, onToggleAcc }: EquipCardProps) {
  return (
    <div
      onClick={onToggle}
      className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
        selected
          ? 'border-forest-500 bg-forest-50/50 shadow-soft'
          : 'border-cream-200 bg-white hover:border-forest-200 hover:shadow-soft'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 ${
              selected ? 'bg-forest-100' : 'bg-cream-100'
            }`}
          >
            {categoryEmoji[eq.category]}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-bark-800 text-sm truncate">{eq.name}</div>
            <div className="text-[11px] text-bark-400 mt-0.5">
              {categoryLabel[eq.category]} · {eq.model}
            </div>
            <div className="text-xs text-bark-500 mt-1 flex items-center gap-3">
              <span className="font-medium text-forest-700">{currency(eq.deposit)} 押</span>
              <span>{currency(eq.dailyRate)}/天</span>
              <span className="px-1.5 py-0.5 rounded bg-cream-100 text-[10px]">
                {statusLabel[eq.status]}
              </span>
            </div>
          </div>
        </div>
        <div
          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition ${
            selected ? 'bg-forest-600 text-white' : 'border border-cream-300'
          }`}
        >
          {selected && <CheckCircle2 className="w-4 h-4" />}
        </div>
      </div>

      {selected && (
        <div className="mt-3 pt-3 border-t border-cream-200 animate-fade-in-up">
          <div className="text-[11px] font-semibold text-bark-500 mb-2">配件清单（勾选实发）</div>
          <div className="flex flex-wrap gap-1.5">
            {eq.accessories.map((a) => {
              const on = checkedAcc.includes(a);
              return (
                <button
                  key={a}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleAcc(a);
                  }}
                  className={`text-xs px-2 py-1 rounded-full border transition ${
                    on
                      ? 'bg-forest-700 text-white border-forest-700'
                      : 'bg-white text-bark-600 border-cream-300 hover:border-forest-300'
                  }`}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
