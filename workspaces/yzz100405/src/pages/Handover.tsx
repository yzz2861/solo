import { useMemo } from 'react';
import { Printer, Download, FileText, AlertTriangle, Clock } from 'lucide-react';
import { useBoardingStore } from '@/store/useBoardingStore';
import { TASK_TYPE_LABELS, TASK_STATUS_LABELS } from '@/types';
import type { CareTask } from '@/types';

function formatDateTime(iso: string) {
  if (!iso) return '--';
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function exportCSV(tasks: CareTask[], filename: string) {
  const headers = ['笼位', '宠物名', '任务类型', '任务标题', '描述', '计划时间', '状态', '异常原因'];
  const rows = tasks.map((t) => [
    t.cageNumber,
    t.petName,
    TASK_TYPE_LABELS[t.taskType],
    t.title,
    t.description,
    formatDateTime(t.scheduledTime),
    TASK_STATUS_LABELS[t.status],
    t.abnormalReason || '',
  ]);
  const bom = '\uFEFF';
  const csv = bom + [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Handover() {
  const store = useBoardingStore();

  const todayTasks = useMemo(() => store.getTodayTasks(), [store.tasks]);
  const pending = useMemo(() => todayTasks.filter((t) => t.status === 'pending'), [todayTasks]);
  const abnormal = useMemo(() => store.getAbnormalAndDelayed(), [store.tasks]);
  const completed = useMemo(() => todayTasks.filter((t) => t.status === 'completed'), [todayTasks]);
  const activeBoardings = store.getActiveBoardings();

  const handlePrint = () => {
    window.print();
  };

  const handleExportAbnormal = () => {
    if (abnormal.length === 0) {
      alert('暂无异常或延迟事项');
      return;
    }
    const date = new Date().toISOString().slice(0, 10);
    exportCSV(abnormal, `异常延迟事项_${date}.csv`);
  };

  const handleExportAll = () => {
    if (todayTasks.length === 0) {
      alert('暂无今日任务');
      return;
    }
    const date = new Date().toISOString().slice(0, 10);
    exportCSV(todayTasks, `今日照护任务_${date}.csv`);
  };

  const shiftTime = new Date().getHours() < 18 ? '白班' : '晚班';
  const handoverDate = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <div>
      <div className="no-print flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl font-bold text-warm-800">交接与导出</h2>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
            <Printer className="w-4 h-4" />
            打印交接单
          </button>
          <button onClick={handleExportAbnormal} className="btn-outline flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            导出异常
          </button>
          <button onClick={handleExportAll} className="btn-outline flex items-center gap-2">
            <Download className="w-4 h-4" />
            导出全部
          </button>
        </div>
      </div>

      {/* Print-friendly handover sheet */}
      <div className="max-w-3xl mx-auto print:max-w-none">
        <div className="card mb-6">
          <div className="text-center mb-6">
            <h3 className="font-serif text-xl font-bold text-warm-800">
              🐾 宠物寄养照护交接单
            </h3>
            <p className="text-sm text-warm-500 mt-1">
              {handoverDate} · {shiftTime}交接
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 p-4 bg-warm-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-warm-700">{activeBoardings.length}</div>
              <div className="text-xs text-warm-400">在住宠物</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-500">{pending.length}</div>
              <div className="text-xs text-warm-400">待做任务</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-danger-500">{abnormal.length}</div>
              <div className="text-xs text-warm-400">异常/延迟</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-mint-400">{completed.length}</div>
              <div className="text-xs text-warm-400">已完成</div>
            </div>
          </div>
        </div>

        {/* Active Boardings Summary */}
        {activeBoardings.length > 0 && (
          <div className="card mb-6">
            <h4 className="font-semibold text-warm-700 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              在住宠物一览
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-warm-200 text-warm-500">
                    <th className="text-left py-2 pr-3">笼位</th>
                    <th className="text-left py-2 pr-3">宠物名</th>
                    <th className="text-left py-2 pr-3">品种</th>
                    <th className="text-left py-2 pr-3">主人</th>
                    <th className="text-left py-2 pr-3">接回日期</th>
                    <th className="text-left py-2">过敏/备注</th>
                  </tr>
                </thead>
                <tbody>
                  {activeBoardings.map((b) => (
                    <tr key={b.id} className="border-b border-warm-100">
                      <td className="py-2 pr-3 font-medium">{b.cageNumber}</td>
                      <td className="py-2 pr-3 font-medium">{b.petName}</td>
                      <td className="py-2 pr-3 text-warm-500">{b.breed || '-'}</td>
                      <td className="py-2 pr-3 text-warm-500">{b.ownerName}</td>
                      <td className="py-2 pr-3 text-warm-500">{b.expectedPickupDate}</td>
                      <td className="py-2 text-warm-500">
                        {b.allergicFood && (
                          <span className="text-danger-500 mr-1">⚠ {b.allergicFood}</span>
                        )}
                        {b.specialNotes && <span>{b.specialNotes}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pending Tasks */}
        {pending.length > 0 && (
          <div className="card mb-6">
            <h4 className="font-semibold text-warm-700 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              待做任务（{pending.length}项）
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-warm-200 text-warm-500">
                    <th className="text-left py-2 pr-3">时间</th>
                    <th className="text-left py-2 pr-3">笼位</th>
                    <th className="text-left py-2 pr-3">宠物</th>
                    <th className="text-left py-2 pr-3">类型</th>
                    <th className="text-left py-2">内容</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((t) => (
                    <tr key={t.id} className="border-b border-warm-100">
                      <td className="py-2 pr-3 text-warm-500">
                        {t.scheduledTime?.slice(11, 16) || '--:--'}
                      </td>
                      <td className="py-2 pr-3 font-medium">{t.cageNumber}</td>
                      <td className="py-2 pr-3 font-medium">{t.petName}</td>
                      <td className="py-2 pr-3">{TASK_TYPE_LABELS[t.taskType]}</td>
                      <td className="py-2 text-warm-600">{t.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Abnormal Tasks */}
        {abnormal.length > 0 && (
          <div className="card mb-6 border-danger-200">
            <h4 className="font-semibold text-danger-600 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              异常/延迟事项（{abnormal.length}项）
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-danger-200 text-danger-400">
                    <th className="text-left py-2 pr-3">笼位</th>
                    <th className="text-left py-2 pr-3">宠物</th>
                    <th className="text-left py-2 pr-3">类型</th>
                    <th className="text-left py-2 pr-3">内容</th>
                    <th className="text-left py-2">原因</th>
                  </tr>
                </thead>
                <tbody>
                  {abnormal.map((t) => (
                    <tr key={t.id} className="border-b border-danger-100">
                      <td className="py-2 pr-3 font-medium">{t.cageNumber}</td>
                      <td className="py-2 pr-3 font-medium">{t.petName}</td>
                      <td className="py-2 pr-3">{TASK_TYPE_LABELS[t.taskType]}</td>
                      <td className="py-2 pr-3 text-warm-600">{t.description}</td>
                      <td className="py-2 text-danger-500">{t.abnormalReason || '已超时未执行'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sign-off section */}
        <div className="card print-break">
          <h4 className="font-semibold text-warm-700 mb-4">交接签字</h4>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className="label-text">交班人</label>
              <div className="border-b-2 border-warm-200 h-10 mt-1" />
            </div>
            <div>
              <label className="label-text">接班人</label>
              <div className="border-b-2 border-warm-200 h-10 mt-1" />
            </div>
          </div>
          <div className="mt-6">
            <label className="label-text">交接备注</label>
            <div className="border border-warm-200 rounded-lg h-20 mt-1 p-2 text-warm-300 text-sm">
              此处手写备注...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
