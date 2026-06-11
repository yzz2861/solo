import { useComplaintStore } from '@/store/useComplaintStore';
import { AlertTriangle, User, MapPin, Calendar } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function RepeatHotspots() {
  const hotspots = useComplaintStore(s => s.getRepeatHotspots());

  if (hotspots.length === 0) {
    return (
      <div className="card p-8 text-center text-warm-400">
        <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>暂无重复投诉数据</p>
      </div>
    );
  }

  const displayItems = hotspots.slice(0, 8);

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-warm-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold text-warm-800">重复投诉热点</h3>
            <p className="text-xs text-warm-500 mt-0.5">同一业主同类问题投诉2次及以上</p>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3 max-h-[520px] overflow-y-auto scrollbar-thin">
        {displayItems.map((item, idx) => {
          const spanDays = differenceInDays(item.lastTime, item.firstTime);
          return (
            <div
              key={`${item.ownerId}_${item.problemType}`}
              className="group p-4 rounded-xl border border-warm-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all duration-200"
              style={{ animationDelay: `${idx * 60}ms`, opacity: 0, animation: 'fade-in-up 0.5s ease-out forwards' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-warm-200 to-warm-300 flex items-center justify-center text-warm-700 font-semibold text-sm">
                        {item.ownerName.charAt(0)}
                      </div>
                      <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-accent-500 text-white text-xs font-bold flex items-center justify-center shadow">
                        {item.count}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-warm-400" />
                        <span className="font-medium text-warm-800 truncate">{item.ownerName}</span>
                        {item.roomNumber && (
                          <span className="text-xs text-warm-400 truncate">{item.roomNumber}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-warm-400" />
                        <span className="text-xs text-warm-500">涉及 {new Set(item.complaintIds).size} 条工单</span>
                      </div>
                    </div>
                  </div>
                </div>
                <span className={`
                  px-2.5 py-1 rounded-full text-xs font-medium shrink-0
                  ${item.problemType === '电梯问题' ? 'bg-primary-100 text-primary-700' :
                    item.problemType === '噪音扰民' ? 'bg-accent-100 text-accent-700' :
                    item.problemType === '给排水问题' ? 'bg-blue-100 text-blue-700' :
                    'bg-warm-100 text-warm-700'}
                `}>
                  {item.problemType}
                </span>
              </div>

              <div className="mt-3 pl-13">
                <div className="flex items-center gap-2 text-xs text-warm-500 mb-2">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {format(item.firstTime, 'M月d日', { locale: zhCN })} 
                    {' → '}
                    {format(item.lastTime, 'M月d日', { locale: zhCN })}
                    {spanDays > 0 && <span className="text-accent-500 ml-1">（持续{spanDays}天）</span>}
                  </span>
                </div>
                <div className="h-1.5 bg-warm-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-400 to-accent-500"
                    style={{ width: `${Math.min(100, (item.count / 5) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-warm-400 mt-2 group-hover:text-warm-600 transition-colors">
                  投诉频次：{item.count}次，建议重点关注并安排上门沟通
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
