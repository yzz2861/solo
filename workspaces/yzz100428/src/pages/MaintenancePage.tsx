import { useState } from 'react';
import Modal from '../components/Modal';
import {
  Wrench,
  Plus,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { useAppStore, todayStr } from '../store/useAppStore';
import { exportMaintenanceReport } from '../utils/exportCSV';
import { format, parseISO, isBefore, isAfter, isToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function MaintenancePage() {
  const { machines, maintenances, addMaintenance, resolveMaintenance } = useAppStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    machineId: '',
    startDate: todayStr(),
    endDate: todayStr(),
    reason: '',
  });

  const handleSubmit = () => {
    if (!form.machineId) return alert('请选择机器');
    if (!form.startDate || !form.endDate) return alert('请选择起止日期');
    if (isAfter(parseISO(form.startDate), parseISO(form.endDate))) {
      return alert('开始日期不能晚于结束日期');
    }
    const machine = machines.find((m) => m.id === form.machineId)!;
    addMaintenance({
      machineId: machine.id,
      machineName: machine.name,
      startDate: form.startDate,
      endDate: form.endDate,
      reason: form.reason || '未填写',
      status: '维修中',
    });
    setModalOpen(false);
    setForm({ machineId: '', startDate: todayStr(), endDate: todayStr(), reason: '' });
  };

  const activeCount = maintenances.filter((m) => m.status === '维修中').length;
  const todayMaintCount = maintenances.filter((m) => {
    const today = new Date();
    return (
      m.status === '维修中' &&
      (isToday(parseISO(m.startDate)) ||
        isToday(parseISO(m.endDate)) ||
        (isBefore(parseISO(m.startDate), today) && isAfter(parseISO(m.endDate), today)))
    );
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-farm-700 flex items-center gap-2">
            <Wrench size={24} />
            维修管理
          </h2>
          <p className="text-sm text-earth-500 mt-1">
            登记机器维修时段，维修中的机器会自动阻塞预约，避免冲突
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportMaintenanceReport(maintenances)}
            className="btn btn-secondary"
            disabled={maintenances.length === 0}
          >
            <FileSpreadsheet size={16} />
            导出维修记录
          </button>
          <button onClick={() => setModalOpen(true)} className="btn btn-primary">
            <Plus size={16} />
            登记维修
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <div>
              <div className="text-xs text-earth-400">正在维修中</div>
              <div className="text-2xl font-bold font-serif text-red-600 mt-0.5">{activeCount} 台</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-wheat-100 text-wheat-600 flex items-center justify-center">
              <Clock size={24} />
            </div>
            <div>
              <div className="text-xs text-earth-400">今日影响</div>
              <div className="text-2xl font-bold font-serif text-wheat-600 mt-0.5">{todayMaintCount} 台</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-farm-100 text-farm-600 flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <div className="text-xs text-earth-400">可用农机</div>
              <div className="text-2xl font-bold font-serif text-farm-600 mt-0.5">
                {machines.length - activeCount} 台
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-bold text-earth-600">农机列表（含状态）</h3>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {machines.map((m) => {
            const activeMaint = maintenances.find(
              (mm) => mm.machineId === m.id && mm.status === '维修中'
            );
            return (
              <div
                key={m.id}
                className={`p-4 rounded-xl border transition-colors ${
                  activeMaint
                    ? 'bg-stripes-red border-red-300'
                    : 'bg-white border-earth-200 hover:border-farm-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🚜</span>
                      <div>
                        <div className="font-bold text-earth-600">{m.name}</div>
                        <div className="text-xs text-earth-400">{m.type} · {m.plateNumber}</div>
                      </div>
                    </div>
                  </div>
                  {activeMaint ? (
                    <span className="tag tag-danger">🔧 维修中</span>
                  ) : (
                    <span className="tag tag-success">✅ 正常</span>
                  )}
                </div>
                {activeMaint && (
                  <div className="mt-3 text-xs bg-red-50/70 rounded-lg p-2.5 border border-red-200 space-y-1">
                    <div className="flex items-center gap-1 text-red-600">
                      <Calendar size={11} />
                      {activeMaint.startDate} → {activeMaint.endDate}
                    </div>
                    <div className="text-red-500">原因：{activeMaint.reason}</div>
                    <button
                      onClick={() => {
                        if (window.confirm(`确认「${m.name}」已维修完成，解除阻塞？`)) {
                          resolveMaintenance(activeMaint.id);
                        }
                      }}
                      className="mt-1.5 w-full py-1.5 rounded-md bg-farm-600 text-white hover:bg-farm-700 text-xs font-medium"
                    >
                      <CheckCircle2 size={12} className="inline mr-1" />
                      标记维修完成并解除阻塞
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-bold text-earth-600">历史维修记录</h3>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-earth-50/50 text-xs text-earth-500">
                <th className="px-4 py-2.5 text-left font-medium">登记时间</th>
                <th className="px-4 py-2.5 text-left font-medium">农机</th>
                <th className="px-4 py-2.5 text-left font-medium">开始</th>
                <th className="px-4 py-2.5 text-left font-medium">预计结束</th>
                <th className="px-4 py-2.5 text-left font-medium">原因</th>
                <th className="px-4 py-2.5 text-center font-medium">状态</th>
                <th className="px-4 py-2.5 text-center font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {[...maintenances]
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((m) => (
                  <tr key={m.id} className="border-t border-earth-100 hover:bg-earth-50/30">
                    <td className="px-4 py-3 text-xs text-earth-500">
                      {format(parseISO(m.createdAt), 'MM-dd HH:mm')}
                    </td>
                    <td className="px-4 py-3 font-medium text-earth-600">{m.machineName}</td>
                    <td className="px-4 py-3 text-earth-500">{m.startDate}</td>
                    <td className="px-4 py-3 text-earth-500">{m.endDate}</td>
                    <td className="px-4 py-3 text-earth-600">{m.reason}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`tag ${m.status === '维修中' ? 'tag-danger' : 'tag-gray'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {m.status === '维修中' ? (
                        <button
                          onClick={() => {
                            if (window.confirm('确认解除维修，机器恢复可用？')) {
                              resolveMaintenance(m.id);
                            }
                          }}
                          className="btn btn-primary btn-sm"
                        >
                          <CheckCircle2 size={12} />完成
                        </button>
                      ) : (
                        <span className="text-earth-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              {maintenances.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-earth-400 text-xs">
                    暂无维修记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="登记农机维修"
        subtitle="维修期间该机器不可预约，排班看板会自动标红提醒"
      >
        <div className="space-y-4">
          <div>
            <label className="input-label input-required">选择维修机器</label>
            <div className="grid grid-cols-2 gap-2">
              {machines.map((m) => {
                const hasActive = maintenances.some(
                  (mm) => mm.machineId === m.id && mm.status === '维修中'
                );
                const selected = form.machineId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={hasActive}
                    onClick={() => setForm({ ...form, machineId: m.id })}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-all disabled:opacity-60 ${
                      selected
                        ? 'bg-farm-600 text-white border-farm-600 shadow-farm'
                        : hasActive
                        ? 'bg-stripes-red border-red-200 text-red-500'
                        : 'bg-white text-earth-500 border-earth-300 hover:border-farm-400 hover:bg-farm-50'
                    }`}
                  >
                    <div className="font-bold">{m.name}</div>
                    <div className={`mt-0.5 ${selected ? 'text-farm-100' : 'text-earth-400'}`}>
                      {m.type}
                    </div>
                    {hasActive && <div className="mt-0.5 text-red-500">已在维修中</div>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label input-required">维修开始日期</label>
              <input
                type="date"
                className="input"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="input-label input-required">预计结束日期</label>
              <input
                type="date"
                className="input"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="input-label">故障原因 / 维修内容</label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {['发动机故障', '液压系统', '轮胎更换', '定期保养', '电路问题', '其他故障'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm({ ...form, reason: r })}
                  className={`text-xs py-1.5 rounded-lg border transition-colors ${
                    form.reason === r
                      ? 'bg-farm-600 text-white border-farm-600'
                      : 'bg-white text-earth-500 border-earth-300 hover:bg-farm-50'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              className="input min-h-[70px]"
              placeholder="详细说明维修内容..."
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-2 border-t border-earth-200">
            <button onClick={() => setModalOpen(false)} className="btn btn-secondary flex-1">
              <XCircle size={16} />取消
            </button>
            <button onClick={handleSubmit} className="btn btn-primary flex-1">
              <CheckCircle2 size={16} />确认登记
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
