import { useState, useEffect } from 'react';
import {
  CalendarCheck,
  User,
  UserRound,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Phone,
  Package,
  Search,
  Check,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDays, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface RequiredAttachment {
  id: string;
  code: string;
  batch_no: string;
  status: string;
  model: { id: string; name: string; type: string };
  missing_reason: string | null;
}

interface TomorrowPatient {
  patient: {
    id: string;
    name: string;
    phone: string | null;
    treatment_plan: string | null;
  };
  doctor: string;
  clinicRoom: string;
  requiredAttachments: RequiredAttachment[];
  isPrepared: boolean;
  bindingId: string;
}

const missingReasonMap: Record<string, string> = {
  missing_template: '缺模板',
  missing_material: '缺材料',
  missing_batch: '缺批次',
};

const typeLabel: Record<string, string> = {
  template: '模板',
  material: '材料',
  aligner_batch: '牙套批次',
};

const doctorNames: Record<string, string> = {
  '': '未分配',
  '1': '张医生',
  '2': '李医生',
  '3': '王医生',
  '4': '赵医生',
};

const DEFAULT_DOCTORS = ['张医生', '李医生', '王医生'];

export default function Tomorrow() {
  const [activeClinic, setActiveClinic] = useState<string>('all');
  const [clinicRooms, setClinicRooms] = useState<string[]>([]);
  const [patients, setPatients] = useState<TomorrowPatient[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const tomorrow = addDays(new Date(), 1);
  const tomorrowStr = format(tomorrow, 'yyyy-MM-dd EEEE', { locale: zhCN });

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    loadData();
  }, [activeClinic]);

  const loadData = async () => {
    setLoading(true);
    try {
      const url = activeClinic === 'all'
        ? '/api/patients/tomorrow'
        : `/api/patients/tomorrow?clinicRoom=${encodeURIComponent(activeClinic)}`;
      const res = await fetch(url).then(r => r.json());
      if (res.success) {
        const data: TomorrowPatient[] = res.data || [];
        setPatients(data);
        if (activeClinic === 'all') {
          const rooms = Array.from(new Set(data.map(p => p.clinicRoom).filter(Boolean)));
          setClinicRooms(rooms);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const togglePrepared = async (patient: TomorrowPatient) => {
    if (togglingIds.has(patient.bindingId)) return;
    setTogglingIds(prev => new Set(prev).add(patient.bindingId));
    try {
      const newState = !patient.isPrepared;
      const res = await fetch(`/api/patients/bindings/${patient.bindingId}/prepare`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrepared: newState }),
      }).then(r => r.json());
      if (res.success) {
        setPatients(prev => prev.map(p =>
          p.bindingId === patient.bindingId ? { ...p, isPrepared: newState } : p
        ));
        showToast('success', newState ? '已标记为已备料' : '已取消备料状态');
      } else {
        showToast('error', res.error || '操作失败');
      }
    } catch (e) {
      showToast('error', '网络错误');
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(patient.bindingId);
        return next;
      });
    }
  };

  const hasMissing = (atts: RequiredAttachment[]) =>
    atts.some(a => a.missing_reason && a.missing_reason !== '');

  const isAllComplete = (atts: RequiredAttachment[]) =>
    atts.length > 0 && atts.every(a => !a.missing_reason || a.missing_reason === '');

  const filteredPatients = patients.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.patient.name.toLowerCase().includes(q) ||
      (p.patient.phone && p.patient.phone.includes(q)) ||
      p.requiredAttachments.some(a =>
        a.model.name.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q)
      )
    );
  });

  const groupedByDoctor = new Map<string, TomorrowPatient[]>();
  for (const p of filteredPatients) {
    const doc = p.doctor || DEFAULT_DOCTORS[Math.abs(hash(p.patient.id)) % DEFAULT_DOCTORS.length];
    if (!groupedByDoctor.has(doc)) {
      groupedByDoctor.set(doc, []);
    }
    groupedByDoctor.get(doc)!.push(p);
  }

  const totalMissing = patients.filter(p => hasMissing(p.requiredAttachments)).length;
  const totalPrepared = patients.filter(p => p.isPrepared).length;
  const totalPatients = patients.length;

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      {toast && (
        <div className={cn(
          'fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-popover flex items-center gap-2 animate-slide-down',
          toast.type === 'success' ? 'bg-success-500 text-white' : 'bg-danger-500 text-white'
        )}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
                <CalendarCheck className="w-7 h-7 text-medical-600" />
                明日缺件预配
              </h1>
              <p className="text-sm text-neutral-500 mt-1">
                为 {tomorrowStr} 就诊患者提前备料
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-white px-4 py-2 rounded-lg border border-neutral-200 shadow-card flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-500">患者:</span>
                  <span className="font-semibold text-neutral-800">{totalPatients}</span>
                </div>
                <div className="w-px h-4 bg-neutral-200"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-500">已备料:</span>
                  <span className="font-semibold text-success-600">{totalPrepared}</span>
                </div>
                <div className="w-px h-4 bg-neutral-200"></div>
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-warning-500" />
                  <span className="text-neutral-500">缺件:</span>
                  <span className="font-semibold text-warning-600">{totalMissing}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card border border-neutral-200 overflow-hidden mb-6">
          <div className="flex flex-wrap border-b border-neutral-200">
            <button
              onClick={() => setActiveClinic('all')}
              className={cn(
                'px-6 py-4 text-sm font-medium transition-colors relative whitespace-nowrap',
                activeClinic === 'all'
                  ? 'text-medical-600 bg-medical-50'
                  : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
              )}
            >
              全部诊室
              {activeClinic === 'all' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-medical-600"></span>
              )}
            </button>
            {clinicRooms.map(room => (
              <button
                key={room}
                onClick={() => setActiveClinic(room)}
                className={cn(
                  'px-6 py-4 text-sm font-medium transition-colors relative whitespace-nowrap',
                  activeClinic === room
                    ? 'text-medical-600 bg-medical-50'
                    : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
                )}
              >
                {room}
                {activeClinic === room && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-medical-600"></span>
                )}
              </button>
            ))}
          </div>

          <div className="p-4 border-b border-neutral-100">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="搜索患者姓名/电话/附件..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-card border border-neutral-200 py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-medical-200 border-t-medical-600 rounded-full animate-spin mb-3"></div>
            <div className="text-neutral-500">加载中...</div>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="bg-white rounded-xl shadow-card border border-neutral-200 py-20 text-center">
            <CalendarCheck className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <div className="text-lg font-medium text-neutral-600">明日暂无待复诊患者</div>
            <div className="text-sm text-neutral-400 mt-2">
              {activeClinic !== 'all' ? `${activeClinic} 暂无预约` : '请先登记患者复诊信息'}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(groupedByDoctor.entries()).map(([doctor, docPatients]) => (
              <div key={doctor} className="animate-slide-up">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-medical-100 text-medical-700 flex items-center justify-center">
                    <UserRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900">{doctor}</h2>
                    <p className="text-xs text-neutral-500">
                      {docPatients.length} 位患者
                      {docPatients.filter(p => hasMissing(p.requiredAttachments)).length > 0 && (
                        <span className="ml-2 text-warning-600">
                          {docPatients.filter(p => hasMissing(p.requiredAttachments)).length} 位缺件
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {docPatients.map(p => {
                    const isMissing = hasMissing(p.requiredAttachments);
                    const isComplete = isAllComplete(p.requiredAttachments);
                    const isToggling = togglingIds.has(p.bindingId);
                    return (
                      <div
                        key={p.patient.id}
                        className={cn(
                          'bg-white rounded-xl border shadow-card overflow-hidden transition-all duration-200 hover:shadow-card-hover',
                          isMissing
                            ? 'border-warning-200'
                            : p.isPrepared
                              ? 'border-success-200'
                              : 'border-neutral-200'
                        )}
                      >
                        <div className={cn(
                          'px-5 py-3 border-b flex items-center justify-between',
                          isMissing
                            ? 'bg-warning-50 border-warning-100'
                            : p.isPrepared
                              ? 'bg-success-50 border-success-100'
                              : 'bg-neutral-50 border-neutral-100'
                        )}>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'w-9 h-9 rounded-full flex items-center justify-center',
                              isMissing
                                ? 'bg-warning-100 text-warning-700'
                                : p.isPrepared
                                  ? 'bg-success-100 text-success-700'
                                  : 'bg-neutral-100 text-neutral-600'
                            )}>
                              <User className="w-4.5 h-4.5" />
                            </div>
                            <div>
                              <div className="font-semibold text-neutral-900 text-sm">
                                {p.patient.name}
                              </div>
                              {p.patient.phone && (
                                <div className="flex items-center gap-1 text-xs text-neutral-500">
                                  <Phone className="w-3 h-3" />
                                  {p.patient.phone}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {isMissing ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-warning-100 text-warning-700">
                                <AlertTriangle className="w-3 h-3" />
                                缺件
                              </span>
                            ) : p.isPrepared ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-700">
                                <CheckCircle2 className="w-3 h-3" />
                                已备料
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                                <Package className="w-3 h-3" />
                                待备料
                              </span>
                            )}
                          </div>
                        </div>

                        {p.clinicRoom && (
                          <div className="px-5 py-2 bg-neutral-50/50 border-b border-neutral-100">
                            <span className="text-xs font-medium text-neutral-500">诊室：</span>
                            <span className="text-xs font-semibold text-medical-600">{p.clinicRoom}</span>
                          </div>
                        )}

                        <div className="p-4 space-y-2">
                          <div className="text-xs font-medium text-neutral-500 mb-2">所需附件 ({p.requiredAttachments.length})</div>
                          {p.requiredAttachments.map((att, idx) => {
                            const isItemMissing = !!att.missing_reason;
                            return (
                              <div
                                key={idx}
                                className={cn(
                                  'flex items-center justify-between p-2.5 rounded-lg border',
                                  isItemMissing
                                    ? 'bg-danger-50 border-danger-200'
                                    : 'bg-success-50 border-success-200'
                                )}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {isItemMissing ? (
                                    <XCircle className="w-4 h-4 text-danger-500 flex-shrink-0" />
                                  ) : (
                                    <CheckCircle2 className="w-4 h-4 text-success-500 flex-shrink-0" />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className={cn(
                                      'text-sm font-medium truncate',
                                      isItemMissing ? 'text-danger-800' : 'text-success-800'
                                    )}>
                                      {att.model.name}
                                    </div>
                                    <div className="text-xs text-neutral-500">
                                      {typeLabel[att.model.type] || att.model.type}
                                      {att.batch_no && ` · ${att.batch_no}`}
                                    </div>
                                  </div>
                                </div>
                                {isItemMissing && att.missing_reason && (
                                  <span className="ml-2 flex-shrink-0 text-xs font-medium text-danger-600 bg-danger-100 px-2 py-0.5 rounded">
                                    {missingReasonMap[att.missing_reason] || att.missing_reason}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="px-4 pb-4">
                          <button
                            onClick={() => togglePrepared(p)}
                            disabled={isToggling}
                            className={cn(
                              'w-full py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2',
                              p.isPrepared
                                ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                                : isComplete
                                  ? 'bg-success-600 text-white hover:bg-success-700 shadow-card'
                                  : 'bg-medical-600 text-white hover:bg-medical-700 shadow-card'
                            )}
                          >
                            {isToggling ? (
                              <>
                                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                                处理中...
                              </>
                            ) : p.isPrepared ? (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                取消备料
                              </>
                            ) : (
                              <>
                                <Package className="w-4 h-4" />
                                一键备料
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}
