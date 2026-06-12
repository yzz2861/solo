import { useState } from 'react';
import {
  Smartphone,
  Tag,
  Hash,
  User,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  HardDrive,
  Palette,
  Star,
  ShieldCheck,
} from 'lucide-react';
import dayjs from 'dayjs';
import type { RecycleOrder } from '../../types';
import StatusBadge from '../common/StatusBadge';
import PriceTag from '../common/PriceTag';

interface Props {
  order: RecycleOrder;
}

export default function InfoCard({ order }: Props) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const photos = order.photos.length > 0 ? order.photos : [];

  const prevPhoto = () => {
    if (photos.length === 0) return;
    setPhotoIdx((i) => (i - 1 + photos.length) % photos.length);
  };
  const nextPhoto = () => {
    if (photos.length === 0) return;
    setPhotoIdx((i) => (i + 1) % photos.length);
  };

  const ratingColor: Record<string, string> = {
    'A+': 'bg-emerald-500 text-white',
    A: 'bg-emerald-400 text-white',
    B: 'bg-warn-500 text-white',
    C: 'bg-orange-500 text-white',
    D: 'bg-danger-500 text-white',
  };

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center shadow-soft">
            <Smartphone size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">
              {order.brand} {order.model}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={order.status} />
              {order.duplicateSnWarning && (
                <span className="chip bg-amber-100 text-amber-700">
                  <AlertTriangle size={12} /> 序列号重复
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        <div className="md:col-span-2">
          <div className="relative aspect-[2/3] rounded-2xl bg-slate-100 overflow-hidden border-2 border-slate-200">
            {photos.length > 0 ? (
              <>
                <img
                  src={photos[photoIdx]}
                  alt={`${order.model} photo ${photoIdx + 1}`}
                  className="w-full h-full object-cover"
                />
                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={prevPhoto}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={nextPhoto}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                    >
                      <ChevronRight size={18} />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {photos.map((_, i) => (
                        <span
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${
                            i === photoIdx ? 'bg-white w-4' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <Smartphone size={48} strokeWidth={1.5} />
                <p className="text-xs mt-2">暂无照片</p>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-3 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
                <HardDrive size={16} />
              </div>
              <div>
                <div className="text-[11px] text-slate-500">存储容量</div>
                <div className="font-bold text-slate-800 text-sm">{order.storage}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
                <Palette size={16} />
              </div>
              <div>
                <div className="text-[11px] text-slate-500">机身颜色</div>
                <div className="font-bold text-slate-800 text-sm">{order.color}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
                <Star size={16} />
              </div>
              <div>
                <div className="text-[11px] text-slate-500">外观成色</div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`chip text-[11px] font-bold ${ratingColor[order.appearanceRating]}`}
                  >
                    {order.appearanceRating}
                  </span>
                  <span className="font-bold text-slate-800 text-sm">级</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
                <ShieldCheck size={16} />
              </div>
              <div>
                <div className="text-[11px] text-slate-500">隐私清除</div>
                <div className="font-bold text-sm">
                  {order.privacyWiped ? (
                    <span className="text-emerald-600">已确认</span>
                  ) : (
                    <span className="text-danger-600">未确认</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border-2 border-brand-100 bg-brand-50/50 space-y-2.5">
            <div className="flex items-center gap-2">
              <Hash size={14} className="text-brand-700" />
              <span className="text-xs font-medium text-brand-700">序列号 SN</span>
              <span className="font-mono font-bold text-slate-800 text-sm ml-auto tabular-nums">
                {order.serialNumber}
              </span>
            </div>
            {order.imei && (
              <div className="flex items-center gap-2">
                <Tag size={14} className="text-brand-700" />
                <span className="text-xs font-medium text-brand-700">IMEI</span>
                <span className="font-mono font-bold text-slate-800 text-sm ml-auto tabular-nums">
                  {order.imei}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <User size={14} className="text-brand-700" />
              <span className="text-xs font-medium text-brand-700">登记人</span>
              <span className="font-bold text-slate-800 text-sm ml-auto">
                {order.createdBy}
                <span className="ml-1 text-[11px] font-normal text-slate-500">
                  ({order.createdByRole === 'manager' ? '店长' : '员工'})
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-brand-700" />
              <span className="text-xs font-medium text-brand-700">登记时间</span>
              <span className="font-bold text-slate-800 text-sm ml-auto">
                {dayjs(order.createdAt).format('YYYY-MM-DD HH:mm')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl border-2 border-slate-200 bg-white">
              <div className="text-[11px] text-slate-500 mb-1">初始报价</div>
              <PriceTag value={order.initialPrice} size="md" />
            </div>
            <div className="p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/30">
              <div className="text-[11px] text-slate-500 mb-1">最终成交价</div>
              <PriceTag
                value={order.finalPrice ?? order.initialPrice}
                size="md"
                tone={
                  order.finalPrice && order.finalPrice > order.initialPrice
                    ? 'up'
                    : order.finalPrice && order.finalPrice < order.initialPrice
                      ? 'down'
                      : 'default'
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
