import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  ClipboardList,
  AlertTriangle,
  Clock,
  ChevronRight,
  User,
  MapPin,
  CalendarDays,
  AlertCircle,
  Calendar,
  Hourglass,
} from 'lucide-react';
import { useInventoryStore } from '@/store/inventory';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays } from 'date-fns';
import Empty from '@/components/Empty';

const missingReasonLabel: Record<string, string> = {
  missing_template: '缺模板',
  missing_material: '缺材料',
  missing_batch: '缺批次',
};

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">{label}</div>
          <div className="text-3xl font-bold tracking-tight mt-2">{value}</div>
        </div>
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', bgColor)}>
          <Icon className={cn('w-5 h-5', color)} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const {
    stats,
    missingList,
    nearExpiryList,
    tomorrowPatients,
    loadingMap,
    fetchStats,
    fetchMissing,
    fetchNearExpiry,
    fetchTomorrowPatients,
  } = useInventoryStore();

  useEffect(() => {
    fetchStats();
    fetchMissing();
    fetchNearExpiry(30);
    fetchTomorrowPatients();
  }, [fetchStats, fetchMissing, fetchNearExpiry, fetchTomorrowPatients]);

  const today = useMemo(() => new Date(), []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">库存总览</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {format(today, 'yyyy年MM月dd日 EEEE')}
          </p>
        </div>
        <Link
          to="/register"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <ClipboardList className="w-4 h-4" />
          快速登记
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="总库存"
          value={stats?.totalStock ?? 0}
          color="text-blue-600"
          bgColor="bg-blue-50 dark:bg-blue-600/10"
        />
        <StatCard
          icon={ClipboardList}
          label="已绑定"
          value={stats?.boundCount ?? 0}
          color="text-emerald-600"
          bgColor="bg-emerald-50 dark:bg-emerald-600/10"
        />
        <StatCard
          icon={AlertTriangle}
          label="缺件数"
          value={stats?.missingCount ?? 0}
          color="text-amber-600"
          bgColor="bg-amber-50 dark:bg-amber-600/10"
        />
        <StatCard
          icon={Clock}
          label="近效期"
          value={stats?.nearExpiryCount ?? 0}
          color="text-rose-600"
          bgColor="bg-rose-50 dark:bg-rose-600/10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="font-semibold">缺件告警</h2>
              <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 dark:bg-amber-600/20 text-amber-700 dark:text-amber-400">
                {missingList.length}
              </span>
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {loadingMap.missing ? (
              <div className="p-8 text-center text-slate-400 text-sm">加载中...</div>
            ) : missingList.length === 0 ? (
              <div className="h-60">
                <Empty />
              </div>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {missingList.map((item) => (
                  <li
                    key={item.id}
                    className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg border-2 border-amber-300 dark:border-amber-600/50 bg-amber-50 dark:bg-amber-600/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            to={`/patient/${item.patient_id}`}
                            className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            {(item.patient as any)?.name || '未命名患者'}
                          </Link>
                          {item.missing_reason && (
                            <span className="px-2 py-0.5 text-xs rounded-md bg-amber-100 dark:bg-amber-600/20 text-amber-700 dark:text-amber-400 font-medium">
                              {missingReasonLabel[item.missing_reason] || item.missing_reason}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            复诊: {item.follow_up_date ? format(parseISO(item.follow_up_date), 'MM-dd') : '-'}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {item.clinic_room}
                          </span>
                          <span>批次: {item.aligner_batch}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0 mt-2" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-rose-500" />
              <h2 className="font-semibold">近效期提醒</h2>
              <span className="px-2 py-0.5 text-xs rounded-full bg-rose-100 dark:bg-rose-600/20 text-rose-700 dark:text-rose-400">
                {nearExpiryList.length}
              </span>
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {loadingMap.nearExpiry ? (
              <div className="p-8 text-center text-slate-400 text-sm">加载中...</div>
            ) : nearExpiryList.length === 0 ? (
              <div className="h-60">
                <Empty />
              </div>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {nearExpiryList.map((item) => {
                  const daysLeft = (item as any).days_left ?? (item.expiry_date ? differenceInDays(parseISO(item.expiry_date), today) : 0);
                  const isUrgent = daysLeft <= 7;
                  return (
                    <li
                      key={item.id}
                      className={cn(
                        'p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors',
                        isUrgent && 'bg-gradient-to-r from-rose-50 to-transparent dark:from-rose-600/5',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                            isUrgent
                              ? 'bg-rose-100 dark:bg-rose-600/20'
                              : 'bg-amber-100 dark:bg-amber-600/10',
                          )}
                        >
                          <Hourglass
                            className={cn(
                              'w-4 h-4',
                              isUrgent ? 'text-rose-600' : 'text-amber-600',
                            )}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium truncate">
                              {(item.model as any)?.name || item.code}
                            </div>
                            <span
                              className={cn(
                                'px-2 py-0.5 text-xs rounded-md font-medium flex-shrink-0',
                                daysLeft <= 7
                                  ? 'bg-rose-100 dark:bg-rose-600/20 text-rose-700 dark:text-rose-400'
                                  : daysLeft <= 14
                                  ? 'bg-orange-100 dark:bg-orange-600/20 text-orange-700 dark:text-orange-400'
                                  : 'bg-amber-100 dark:bg-amber-600/20 text-amber-700 dark:text-amber-400',
                              )}
                            >
                              剩 {daysLeft} 天
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 dark:text-slate-400">
                            <span>条码: {item.code}</span>
                            <span>批次: {item.batch_no}</span>
                            <span>效期: {item.expiry_date || '-'}</span>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            <h2 className="font-semibold">待复诊患者</h2>
            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400">
              {tomorrowPatients.length}
            </span>
          </div>
        </div>
        <div>
          {loadingMap.tomorrow ? (
            <div className="p-8 text-center text-slate-400 text-sm">加载中...</div>
          ) : tomorrowPatients.length === 0 ? (
            <div className="h-40">
              <Empty />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
              {tomorrowPatients.map((item) => (
                <Link
                  key={item.id}
                  to={`/patient/${item.patient_id}`}
                  className="group block p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {(item.patient as any)?.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {(item.patient as any)?.name || '未命名患者'}
                        </div>
                        {item.is_prepared ? (
                          <span className="px-2 py-0.5 text-xs rounded-md bg-emerald-100 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 font-medium">
                            已备料
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                            未备料
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {item.clinic_room}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {item.follow_up_date ? format(parseISO(item.follow_up_date), 'MM-dd') : '-'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3 h-3" />
                          批次 {item.aligner_batch}
                        </span>
                      </div>
                      {item.missing_reason && (
                        <div className="mt-2 px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-600/10 text-amber-700 dark:text-amber-400 text-xs inline-block">
                          ⚠️ {missingReasonLabel[item.missing_reason] || item.missing_reason}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
