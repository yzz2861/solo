import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Phone,
  FileText,
  Calendar,
  MapPin,
  Package,
  CalendarDays,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Stethoscope,
  History,
  ChevronRight,
} from 'lucide-react';
import { useInventoryStore } from '@/store/inventory';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import Empty from '@/components/Empty';

const missingReasonLabel: Record<string, string> = {
  missing_template: '缺模板',
  missing_material: '缺材料',
  missing_batch: '缺批次',
};

const attachmentTypeLabel: Record<string, string> = {
  template: '模板',
  material: '材料',
  aligner_batch: '牙套批次',
};

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const {
    patientDetail,
    loadingMap,
    fetchPatientDetail,
    clearPatientDetail,
  } = useInventoryStore();

  useEffect(() => {
    if (id) {
      fetchPatientDetail(id);
    }
    return () => clearPatientDetail();
  }, [id, fetchPatientDetail, clearPatientDetail]);

  const patient = patientDetail?.patient;
  const bindings = patientDetail?.bindings ?? [];
  const followUps = patientDetail?.followUps ?? [];

  const today = new Date();

  function getFollowUpStatus(dateStr: string) {
    const date = parseISO(dateStr);
    const diff = differenceInCalendarDays(date, today);
    if (diff < 0) return { label: '已过期', color: 'text-rose-600 bg-rose-50 dark:bg-rose-600/10 dark:text-rose-400', icon: AlertTriangle };
    if (diff <= 3) return { label: '即将复诊', color: 'text-amber-600 bg-amber-50 dark:bg-amber-600/10 dark:text-amber-400', icon: Clock };
    if (diff <= 7) return { label: '本周复诊', color: 'text-blue-600 bg-blue-50 dark:bg-blue-600/10 dark:text-blue-400', icon: CalendarDays };
    return { label: '已安排', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-600/10 dark:text-emerald-400', icon: Calendar };
  }

  const nextFollowUp = bindings
    .filter((b) => differenceInCalendarDays(parseISO(b.follow_up_date), today) >= 0)
    .sort((a, b) => a.follow_up_date.localeCompare(b.follow_up_date))[0];

  if (loadingMap.patientDetail && !patientDetail) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-xl w-1/4" />
          <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
          <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          返回总览
        </Link>
        <div className="h-96">
          <Empty />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 p-6 relative">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0 border-4 border-white/30 shadow-xl">
              <span className="text-3xl font-bold text-white">
                {patient.name.charAt(0)}
              </span>
            </div>
            <div className="flex-1 text-white">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">{patient.name}</h1>
                {patient.treatment_plan && (
                  <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-medium">
                    {patient.treatment_plan}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-5 mt-3 text-sm text-white/80">
                {patient.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    {patient.phone}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  建档于 {patient.created_at ? format(parseISO(patient.created_at), 'yyyy-MM-dd') : '-'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  共绑定 {bindings.length} 份附件
                </span>
              </div>
            </div>
            {nextFollowUp && (
              <div className="hidden sm:block bg-white/20 backdrop-blur rounded-xl p-4 border border-white/20">
                <div className="text-xs text-white/80 mb-1">下次复诊</div>
                <div className="text-lg font-bold text-white">
                  {format(parseISO(nextFollowUp.follow_up_date), 'MM月dd日')}
                </div>
                <div className="text-xs text-white/80 mt-1">
                  {nextFollowUp.clinic_room} · 批次 {nextFollowUp.aligner_batch}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">绑定附件总数</div>
            <div className="flex items-end gap-2">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{bindings.length}</div>
              <div className="text-xs text-slate-400 mb-1">份</div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">已完成复诊</div>
            <div className="flex items-end gap-2">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{followUps.length}</div>
              <div className="text-xs text-slate-400 mb-1">次</div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">缺件记录</div>
            <div className="flex items-end gap-2">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {bindings.filter((b) => b.missing_reason).length}
              </div>
              <div className="text-xs text-slate-400 mb-1">次</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-500" />
              <h2 className="font-semibold">绑定附件时间线</h2>
              <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400">
                {bindings.length}
              </span>
            </div>
          </div>
          <div className="p-5">
            {bindings.length === 0 ? (
              <div className="h-60">
                <Empty />
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-200 via-indigo-200 to-transparent dark:from-blue-600/50 dark:via-indigo-600/50" />
                <ul className="space-y-5">
                  {[...bindings]
                    .sort((a, b) => b.bound_at.localeCompare(a.bound_at))
                    .map((binding, idx) => {
                      const status = getFollowUpStatus(binding.follow_up_date);
                      const StatusIcon = status.icon;
                      const isLast = idx === bindings.length - 1;
                      return (
                        <li key={binding.id} className="relative pl-11">
                          <div
                            className={cn(
                              'absolute left-0 w-9 h-9 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-sm',
                              idx === 0
                                ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                : 'bg-slate-200 dark:bg-slate-700',
                            )}
                          >
                            <Package
                              className={cn(
                                'w-4 h-4',
                                idx === 0 ? 'text-white' : 'text-slate-500 dark:text-slate-400',
                              )}
                            />
                          </div>
                          <div
                            className={cn(
                              'rounded-xl border p-4 transition-all hover:shadow-md',
                              idx === 0
                                ? 'border-blue-200 dark:border-blue-600/30 bg-blue-50/50 dark:bg-blue-600/5'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30',
                            )}
                          >
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">
                                    {(binding.attachment as any)?.model?.name || '附件'}
                                  </span>
                                  {binding.missing_reason ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-amber-100 dark:bg-amber-600/20 text-amber-700 dark:text-amber-400 font-medium">
                                      <AlertTriangle className="w-3 h-3" />
                                      {missingReasonLabel[binding.missing_reason] || binding.missing_reason}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-emerald-100 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 font-medium">
                                      <CheckCircle2 className="w-3 h-3" />
                                      齐备
                                    </span>
                                  )}
                                  <span
                                    className={cn(
                                      'inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md font-medium',
                                      status.color,
                                    )}
                                  >
                                    <StatusIcon className="w-3 h-3" />
                                    {status.label}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                  条码 <span className="font-mono">{(binding.attachment as any)?.code || '-'}</span>
                                </div>
                              </div>
                              {binding.is_prepared ? (
                                <span className="px-2.5 py-1 text-xs rounded-md bg-emerald-100 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  已备料
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                                  未备料
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                              <div>
                                <div className="text-xs text-slate-400 mb-0.5">诊室</div>
                                <div className="text-sm font-medium inline-flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  {binding.clinic_room}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-slate-400 mb-0.5">牙套批次</div>
                                <div className="text-sm font-mono font-medium">
                                  {binding.aligner_batch}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-slate-400 mb-0.5">复诊日期</div>
                                <div className="text-sm font-medium inline-flex items-center gap-1">
                                  <CalendarDays className="w-3 h-3 text-slate-400" />
                                  {format(parseISO(binding.follow_up_date), 'yyyy-MM-dd')}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-slate-400 mb-0.5">绑定时间</div>
                                <div className="text-sm text-slate-600 dark:text-slate-300">
                                  {binding.bound_at ? format(parseISO(binding.bound_at), 'MM-dd HH:mm') : '-'}
                                </div>
                              </div>
                            </div>
                          </div>
                          {!isLast && <div className="h-0" />}
                        </li>
                      );
                    })}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-emerald-500" />
                <h2 className="font-semibold">复诊记录</h2>
                <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400">
                  {followUps.length}
                </span>
              </div>
            </div>
            <div>
              {followUps.length === 0 ? (
                <div className="h-48">
                  <Empty />
                </div>
              ) : (
                <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                  {[...followUps]
                    .sort((a, b) => b.visit_date.localeCompare(a.visit_date))
                    .map((record) => (
                      <li key={record.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <Link to="#" className="block">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-600/20 flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <div>
                                <div className="text-sm font-medium">
                                  复诊 · {format(parseISO(record.visit_date), 'yyyy年MM月dd日')}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  使用附件{' '}
                                  <span className="font-mono">
                                    {(record as any).attachment?.code || '-'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 mt-2 flex-shrink-0" />
                          </div>
                          {record.notes && (
                            <div className="mt-3 ml-11.5 pl-11.5 relative">
                              <div className="absolute left-11 top-0 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-700" />
                              <div className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
                                <FileText className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5 text-slate-400" />
                                {record.notes}
                              </div>
                            </div>
                          )}
                        </Link>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="w-5 h-5" />
              <span className="font-semibold">快速操作</span>
            </div>
            <div className="space-y-2">
              <Link
                to="/register"
                className="block w-full px-4 py-2.5 rounded-xl bg-white/20 backdrop-blur hover:bg-white/30 transition-colors text-sm font-medium text-center"
              >
                + 登记新附件
              </Link>
              <button className="w-full px-4 py-2.5 rounded-xl bg-white text-blue-600 hover:bg-blue-50 transition-colors text-sm font-medium">
                编辑患者信息
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
