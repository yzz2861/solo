import { useComplaintStore } from '@/store/useComplaintStore';
import { Clock, AlertCircle, MapPin, User } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import clsx from 'clsx';

function formatDuration(hours: number | null): string {
  if (hours === null) return '-';
  if (hours < 24) return `${hours}小时`;
  const days = Math.floor(hours / 24);
  const h = hours % 24;
  return h > 0 ? `${days}天${h}小时` : `${days}天`;
}

export default function LongestRunningTable() {
  const complaints = useComplaintStore(s => s.getLongestRunning(10));

  if (complaints.length === 0) {
    return (
      <div className="card p-8 text-center text-warm-400">
        <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>暂无工单数据</p>
      </div>
    );
  }

  const maxHours = Math.max(...complaints.map(c => c.closeHours ?? 0), 1);

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-warm-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent-100 flex items-center justify-center">
            <Clock className="w-4 h-4 text-accent-600" />
          </div>
          <div>
            <h3 className="font-semibold text-warm-800">拖得最久的案例 TOP 10</h3>
            <p className="text-xs text-warm-500 mt-0.5">按关闭时长倒序排列，红色标记已超期工单</p>
          </div>
        </div>
        <span className="text-xs text-warm-400">共 {complaints.length} 条</span>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="px-4 py-3 text-left font-semibold">工单号</th>
              <th className="px-4 py-3 text-left font-semibold">小区/楼栋</th>
              <th className="px-4 py-3 text-left font-semibold">业主</th>
              <th className="px-4 py-3 text-left font-semibold">问题类型</th>
              <th className="px-4 py-3 text-left font-semibold">来源</th>
              <th className="px-4 py-3 text-left font-semibold">受理时间</th>
              <th className="px-4 py-3 text-left font-semibold w-48">耗时进度</th>
              <th className="px-4 py-3 text-left font-semibold">状态</th>
            </tr>
          </thead>
          <tbody>
            {complaints.map((c, _idx) => (
              <tr
                key={c.id}
                className={clsx(
                  'table-row group',
                  c.isOverdue && 'bg-gradient-to-r from-accent-50/50 to-transparent'
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-primary-700 font-medium">{c.orderNo}</span>
                    {c.dataQualityFlags.length > 0 && (
                      <span className="text-warm-400 group-hover:text-accent-500 transition-colors">
                        <AlertCircle className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-warm-700">
                    <MapPin className="w-3 h-3 text-warm-400" />
                    <span className="text-xs">{c.community} / {c.building}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3 text-warm-400" />
                    <span className="text-xs text-warm-700">
                      {c.ownerName}
                      {c.roomNumber && <span className="text-warm-400 ml-1">({c.roomNumber})</span>}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={clsx(
                    'tag',
                    c.problemType === '电梯问题' ? 'bg-primary-100 text-primary-700' :
                    c.problemType === '噪音扰民' ? 'bg-accent-100 text-accent-700' :
                    c.problemType === '给排水问题' ? 'bg-blue-100 text-blue-700' :
                    'bg-warm-100 text-warm-700'
                  )}>
                    {c.problemType}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-warm-600">{c.source}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-warm-600 font-mono">
                    {c.receiveTime ? format(c.receiveTime, 'MM-dd HH:mm', { locale: zhCN }) : '-'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-warm-100 rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          'h-full rounded-full transition-all duration-700',
                          c.isOverdue 
                            ? 'bg-gradient-to-r from-accent-400 to-accent-600' 
                            : 'bg-gradient-to-r from-primary-400 to-primary-600'
                        )}
                        style={{ width: `${Math.min(100, ((c.closeHours ?? 0) / maxHours) * 100)}%` }}
                      />
                    </div>
                    <span className={clsx(
                      'text-xs font-semibold whitespace-nowrap',
                      c.isOverdue ? 'text-accent-600' : 'text-warm-700'
                    )}>
                      {formatDuration(c.closeHours)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={clsx(
                    'tag',
                    c.status === '已超期' ? 'bg-accent-100 text-accent-700' :
                    c.status === '已关闭' ? 'bg-green-100 text-green-700' :
                    'bg-yellow-100 text-yellow-700'
                  )}>
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
