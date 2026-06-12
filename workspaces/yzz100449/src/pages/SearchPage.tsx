import { useState, useMemo, useEffect } from 'react';
import { Search, AlertTriangle, CheckCircle2, XCircle, Eye, Sparkles, Hash, Smartphone, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useRecycleStore } from '../store/useRecycleStore';
import { STATUS_LABEL } from '../types';
import PriceTag from '../components/common/PriceTag';
import StatusBadge from '../components/common/StatusBadge';
import { debounce, checkDuplicateSN } from '../utils/snChecker';
import type { RecycleOrder } from '../types';

interface SearchHit {
  type: 'exact' | 'fuzzy';
  order: RecycleOrder;
}

export default function SearchPage() {
  const { orders } = useRecycleStore();
  const nav = useNavigate();
  const [sn, setSn] = useState('');
  const [exactDup, setExactDup] = useState<RecycleOrder | null>(null);
  const [searched, setSearched] = useState(false);

  const fuzzyResults = useMemo((): SearchHit[] => {
    const k = sn.trim().toLowerCase();
    if (!k) return [];
    const exact = orders.find(o => o.serialNumber.toLowerCase() === k);
    const out: SearchHit[] = [];
    const seen = new Set<string>();
    if (exact) { out.push({ type: 'exact', order: exact }); seen.add(exact.id); }
    for (const o of orders) {
      if (seen.has(o.id)) continue;
      if (o.serialNumber.toLowerCase().includes(k) || (o.imei ?? '').toLowerCase().includes(k)) {
        out.push({ type: 'fuzzy', order: o });
        seen.add(o.id);
      }
    }
    return out;
  }, [orders, sn]);

  const checkNow = useMemo(
    () => debounce((val: string) => {
      setExactDup(checkDuplicateSN(val));
      setSearched(true);
    }, 400),
    []
  );

  useEffect(() => { if (sn.trim().length >= 4) checkNow(sn.trim()); }, [sn, checkNow]);

  const clearAll = () => {
    setSn('');
    setExactDup(null);
    setSearched(false);
  };

  const banner = (() => {
    if (!searched || !sn.trim()) return null;
    if (exactDup) {
      return {
        tone: 'warn' as const,
        icon: <AlertTriangle size={24} />,
        title: '⚠️ 序列号存在历史回收记录！',
        desc: '该序列号已录入系统，请核对是否为同一设备再决定是否回收。',
      };
    }
    if (fuzzyResults.length > 0) {
      return {
        tone: 'info' as const,
        icon: <Sparkles size={24} />,
        title: `找到 ${fuzzyResults.length} 条模糊匹配结果`,
        desc: '未找到完全相同的序列号，但检测到相似片段匹配，建议人工核对。',
      };
    }
    return {
      tone: 'ok' as const,
      icon: <CheckCircle2 size={24} />,
      title: '✓ 序列号未查询到历史记录',
      desc: sn.trim().length < 4 ? '输入至少 4 位字符后才会开始自动查重' : '该序列号可正常录入系统，无历史冲突。',
    };
  })();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-soft">
            <Hash size={26} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800">序列号 / IMEI 查重</h2>
            <p className="text-sm text-slate-500 mt-0.5">输入设备序列号或 IMEI，即时查询历史回收记录</p>
          </div>
        </div>

        <div className="relative">
          <Search size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-14 pr-32 text-lg font-mono tracking-wider !py-3.5"
            placeholder="输入序列号（SN）或 15 位 IMEI，输入即查"
            value={sn}
            onChange={e => setSn(e.target.value.toUpperCase())}
            autoFocus
          />
          {sn && (
            <button onClick={clearAll} className="absolute right-4 top-1/2 -translate-y-1/2 btn-ghost !py-1 !h-auto !px-3 text-xs">
              <XCircle size={16} />
              清空
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-3 text-xs">
          <span className="text-slate-400">常用示例：</span>
          {['F2LXW0XXXXQN', 'G2MD30XXXXP8', 'C39KXXXXQT33'].map(s => (
            <button
              key={s}
              onClick={() => setSn(s)}
              className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-mono hover:bg-brand-100 hover:text-brand-700 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {banner && (
        <div className={`card p-6 border-2 ${
          banner.tone === 'warn' ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50' :
          banner.tone === 'ok' ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50' :
          'border-blue-300 bg-gradient-to-br from-blue-50 to-slate-50'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl shrink-0 ${
              banner.tone === 'warn' ? 'bg-amber-100 text-warn-600' :
              banner.tone === 'ok' ? 'bg-emerald-100 text-emerald-600' :
              'bg-blue-100 text-blue-600'
            }`}>
              {banner.icon}
            </div>
            <div className="flex-1">
              <div className={`font-black text-lg ${
                banner.tone === 'warn' ? 'text-warn-700' :
                banner.tone === 'ok' ? 'text-emerald-700' : 'text-blue-700'
              }`}>
                {banner.title}
              </div>
              <div className="text-sm text-slate-600 mt-1">{banner.desc}</div>
            </div>
          </div>
        </div>
      )}

      {exactDup && (
        <div className="card p-6 border-2 border-warn-300 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-warn-100 text-warn-700 flex items-center justify-center">
                <AlertTriangle size={18} />
              </span>
              完全匹配记录（详情）
            </h3>
            <button onClick={() => nav(`/detail/${exactDup.id}`)} className="btn-primary !py-2 !h-auto !px-4 text-sm">
              <Eye size={14} />
              查看完整详情
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="md:col-span-1">
              <div className="aspect-[2/3] rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-50">
                <img src={exactDup.photos[0]} className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="md:col-span-3 space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xl font-black text-slate-800">{exactDup.brand} {exactDup.model}</span>
                  <StatusBadge status={exactDup.status} size="sm" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <Info label="存储容量" value={exactDup.storage} />
                  <Info label="颜色" value={exactDup.color} />
                  <Info label="成色评级" value={exactDup.appearanceRating} />
                  <Info label="操作人" value={exactDup.createdBy} />
                  <Info
                    label="创建时间"
                    value={<span className="font-mono tabular-nums">{dayjs(exactDup.createdAt).format('YYYY-MM-DD HH:mm')}</span>}
                  />
                  <Info label="当前状态" value={STATUS_LABEL[exactDup.status]} />
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-50 to-slate-50 border border-brand-100">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">初估价</div>
                    <div className="font-mono text-xl font-black text-slate-700 tabular-nums line-through opacity-70">
                      ¥{exactDup.initialPrice.toLocaleString()}
                    </div>
                  </div>
                  {exactDup.finalPrice !== null && exactDup.finalPrice !== exactDup.initialPrice && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">成交价</div>
                      <PriceTag value={exactDup.finalPrice} size="lg" />
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-slate-500 mb-1">累计议价</div>
                    <div className="font-mono text-xl font-black text-warn-600 tabular-nums">
                      {exactDup.priceHistory.length} 次
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {exactDup.duplicateSnWarning && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-warn-700 text-xs font-bold">
                    序列号曾多次被录入
                  </span>
                )}
                {exactDup.checkResult.account.idLoggedOut !== 'pass' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-danger-600 text-xs font-bold">
                    ⚠️ 账号锁未退出
                  </span>
                )}
                {!exactDup.privacyWiped && ['pending_in', 'in_stock'].includes(exactDup.status) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-danger-600 text-xs font-bold">
                    隐私数据未清除
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {fuzzyResults.length > 0 && !exactDup && (
        <div className="card p-6">
          <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Sparkles size={18} />
            </span>
            模糊匹配结果（{fuzzyResults.length} 条）
          </h3>
          <div className="divide-y divide-slate-50">
            {fuzzyResults.map(({ type, order: o }) => (
              <button
                key={o.id + type}
                onClick={() => nav(`/detail/${o.id}`)}
                className="w-full p-4 -mx-4 flex items-center gap-4 hover:bg-slate-50 rounded-xl transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-50 border border-slate-100">
                  <img src={o.photos[0]} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-800">{o.brand} {o.model}</span>
                    <StatusBadge status={o.status} size="sm" />
                    {type === 'exact' && (
                      <span className="chip bg-rose-100 text-rose-700">完全匹配</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-mono tabular-nums">
                    <span className="inline-flex items-center gap-1"><Hash size={12} />{o.serialNumber}</span>
                    <span className="inline-flex items-center gap-1"><Clock size={12} />{dayjs(o.createdAt).format('MM-DD HH:mm')}</span>
                    <span className="inline-flex items-center gap-1"><Smartphone size={12} />{o.storage}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <PriceTag value={o.finalPrice ?? o.initialPrice} />
                  {o.priceHistory.length > 0 && (
                    <div className="text-[11px] text-warn-600 mt-0.5">
                      议价 {o.priceHistory.length} 次
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!sn.trim() && (
        <div className="card p-10 text-center text-slate-400">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Search size={28} />
          </div>
          <div className="text-sm">输入序列号或 IMEI 开始查询</div>
          <div className="text-xs mt-1.5">支持完整精确匹配 & 子串模糊匹配</div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] text-slate-400 mb-0.5">{label}</div>
      <div className="text-sm font-semibold text-slate-700">{value}</div>
    </div>
  );
}
