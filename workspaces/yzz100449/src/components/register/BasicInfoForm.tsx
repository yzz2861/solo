import { useState, useMemo, useEffect } from 'react';
import type { RecycleOrder } from '../../types';
import { BRANDS, STORAGES, COLORS, RATINGS } from '../../types';
import { checkDuplicateSN, debounce } from '../../utils/snChecker';
import { AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

interface Props {
  order: RecycleOrder;
  onChange: (patch: Partial<RecycleOrder>) => void;
}

export default function BasicInfoForm({ order, onChange }: Props) {
  const [snTouched, setSnTouched] = useState(false);
  const [dup, setDup] = useState<ReturnType<typeof checkDuplicateSN>>(null);
  const nav = useNavigate();

  const checkSN = useMemo(
    () =>
      debounce((val: string) => {
        setDup(checkDuplicateSN(val, order.id));
      }, 400),
    [order.id]
  );

  useEffect(() => {
    if (order.serialNumber) checkSN(order.serialNumber);
  }, [order.serialNumber, checkSN]);

  return (
    <div className="card p-6 space-y-5">
      <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs flex items-center justify-center font-black">1</span>
        基础信息录入
      </h3>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="label">品牌</label>
          <select className="input" value={order.brand} onChange={(e) => onChange({ brand: e.target.value })}>
            <option value="">请选择品牌</option>
            {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="lg:col-span-2">
          <label className="label">具体型号</label>
          <input className="input" placeholder="如：iPhone 15 Pro / Mate 60 Pro"
            value={order.model} onChange={(e) => onChange({ model: e.target.value })} />
        </div>
        <div>
          <label className="label">存储容量</label>
          <select className="input" value={order.storage} onChange={(e) => onChange({ storage: e.target.value })}>
            {STORAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">颜色</label>
          <select className="input" value={order.color} onChange={(e) => onChange({ color: e.target.value })}>
            {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">成色评级</label>
          <div className="flex gap-2">
            {RATINGS.map((r) => (
              <button key={r} type="button"
                onClick={() => onChange({ appearanceRating: r })}
                className={`flex-1 h-11 rounded-xl font-bold text-sm transition-all border-2 ${
                  order.appearanceRating === r
                    ? 'bg-brand-600 text-white border-brand-600 shadow-soft'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-brand-400'
                }`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          <label className="label flex items-center gap-1.5">
            序列号 <span className="text-danger-500 font-black">*</span>
            <span className="text-[11px] font-normal text-slate-400 ml-1">（系统自动查重）</span>
          </label>
          <input className={`input font-mono tracking-wider ${
            snTouched && dup ? 'input-error' : ''
          }`} placeholder="输入设备序列号 / Serial Number"
            value={order.serialNumber}
            onBlur={() => setSnTouched(true)}
            onChange={(e) => onChange({ serialNumber: e.target.value.toUpperCase() })} />
          {snTouched && dup && (
            <div className="mt-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-start gap-2">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold">⚠️ 该序列号已存在历史回收记录！</div>
                <div className="text-xs mt-1 text-rose-600">
                  {dayjs(dup.createdAt).format('YYYY-MM-DD HH:mm')} · {dup.brand} {dup.model} · 成交价 ¥{dup.finalPrice ?? dup.initialPrice}
                </div>
                <button type="button" onClick={() => nav(`/detail/${dup.id}`)}
                  className="mt-2 text-xs font-bold text-rose-700 underline underline-offset-2 inline-flex items-center gap-1">
                  查看历史详情 <ExternalLink size={12} />
                </button>
              </div>
              <button onClick={() => { onChange({ duplicateSnWarning: true }); setDup(null); }}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-rose-100 text-rose-700 text-xs font-bold hover:bg-rose-200">
                标注重复并继续
              </button>
            </div>
          )}
          {order.duplicateSnWarning && (
            <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700 flex items-center gap-2">
              <CheckCircle2 size={18} />
              <span>已标注重复序列号警告，后续流程将持续提示</span>
            </div>
          )}
        </div>
        <div>
          <label className="label">IMEI（选填）</label>
          <input className="input font-mono" placeholder="15位数字"
            value={order.imei ?? ''}
            maxLength={15}
            onChange={(e) => onChange({ imei: e.target.value.replace(/\D/g, '') })} />
        </div>
      </div>
    </div>
  );
}
