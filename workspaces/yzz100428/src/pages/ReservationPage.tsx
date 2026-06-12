import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  MapPin,
  Tractor,
  Car,
  Clock,
  Fuel,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Search,
  ClipboardList,
} from 'lucide-react';
import { useAppStore, todayStr } from '../store/useAppStore';
import { WorkType, MachineType } from '../types';

const WORK_TYPES: WorkType[] = ['犁地', '耙地', '插秧', '收割', '其他'];

interface FormState {
  farmerName: string;
  farmerPhone: string;
  farmerVillage: string;
  plotName: string;
  plotAcres: string;
  plotLocation: string;
  machineId: string;
  driverId: string;
  workDate: string;
  startTime: string;
  durationHours: string;
  workType: WorkType | '';
  estimatedFuel: string;
}

const initialForm: FormState = {
  farmerName: '',
  farmerPhone: '',
  farmerVillage: '',
  plotName: '',
  plotAcres: '',
  plotLocation: '',
  machineId: '',
  driverId: '',
  workDate: todayStr(),
  startTime: '07:30',
  durationHours: '3',
  workType: '',
  estimatedFuel: '',
};

export default function ReservationPage() {
  const navigate = useNavigate();
  const {
    machines,
    drivers,
    reservations,
    addReservation,
    isMachineUnderMaintenance,
    getMaintenanceAt,
    checkDriverConflict,
    checkMachineConflict,
  } = useAppStore();

  const [form, setForm] = useState<FormState>(initialForm);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [successFlash, setSuccessFlash] = useState(false);

  const uniqueVillages = useMemo(() => {
    const s = new Set<string>();
    reservations.forEach((r) => r.farmerVillage && s.add(r.farmerVillage));
    return Array.from(s);
  }, [reservations]);

  const farmerSuggestions = useMemo(() => {
    const map = new Map<string, { phone: string; village: string; plots: { name: string; acres: number; location: string }[] }>();
    reservations.forEach((r) => {
      if (!r.farmerName) return;
      if (!map.has(r.farmerName)) {
        map.set(r.farmerName, { phone: r.farmerPhone, village: r.farmerVillage, plots: [] });
      }
      const rec = map.get(r.farmerName)!;
      if (!rec.plots.find((p) => p.name === r.plotName)) {
        rec.plots.push({ name: r.plotName, acres: r.plotAcres, location: r.plotLocation });
      }
    });
    return map;
  }, [reservations]);

  const plotSuggestions = useMemo(() => {
    if (!form.farmerName) return [];
    return farmerSuggestions.get(form.farmerName)?.plots || [];
  }, [form.farmerName, farmerSuggestions]);

  const selectedMachine = machines.find((m) => m.id === form.machineId);
  const machineInMaintenance = form.machineId && form.workDate
    ? isMachineUnderMaintenance(form.machineId, form.workDate)
    : false;
  const maintenanceInfo = form.machineId && form.workDate
    ? getMaintenanceAt(form.machineId, form.workDate)
    : null;

  const availableDrivers = useMemo(() => {
    if (!form.machineId) return drivers.filter((d) => d.active);
    return drivers.filter(
      (d) => d.active && (d.machineIds.includes(form.machineId) || d.machineIds.length === 0)
    );
  }, [drivers, form.machineId]);

  useEffect(() => {
    const w: string[] = [];
    if (machineInMaintenance && maintenanceInfo) {
      w.push(`⚠️ 该机器 ${maintenanceInfo.machineName} 在${form.workDate}处于维修期（${maintenanceInfo.startDate} 至 ${maintenanceInfo.endDate}），原因：${maintenanceInfo.reason}`);
    }
    if (form.driverId && form.workDate && form.startTime && form.durationHours) {
      const dc = checkDriverConflict(
        form.driverId, form.workDate, form.startTime, parseFloat(form.durationHours) || 0
      );
      if (dc) {
        w.push(`⚠️ 司机(${dc.driverName})时间与「${dc.farmerName} - ${dc.plotName}（${dc.startTime}）」冲突`);
      }
    }
    if (form.machineId && form.workDate && form.startTime && form.durationHours && !machineInMaintenance) {
      const mc = checkMachineConflict(
        form.machineId, form.workDate, form.startTime, parseFloat(form.durationHours) || 0
      );
      if (mc) {
        w.push(`⚠️ 机器(${mc.machineName})时间与「${mc.farmerName} - ${mc.plotName}（${mc.startTime}）」冲突`);
      }
    }
    setWarnings(w);
  }, [form, machineInMaintenance, maintenanceInfo, checkDriverConflict, checkMachineConflict]);

  useEffect(() => {
    if (form.plotAcres && form.workType && !form.estimatedFuel) {
      const acres = parseFloat(form.plotAcres);
      if (!isNaN(acres)) {
        const fuelRate: Record<string, number> = { '犁地': 15, '耙地': 10, '插秧': 8, '收割': 12, '其他': 10 };
        const rate = fuelRate[form.workType] || 10;
        setForm((f) => ({ ...f, estimatedFuel: String(Math.round(acres * rate)) }));
      }
    }
  }, [form.plotAcres, form.workType]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
  };

  const selectFarmer = (name: string) => {
    const info = farmerSuggestions.get(name);
    setForm((f) => ({
      ...f,
      farmerName: name,
      farmerPhone: info?.phone || f.farmerPhone,
      farmerVillage: info?.village || f.farmerVillage,
    }));
  };

  const selectPlot = (plot: { name: string; acres: number; location: string }) => {
    setForm((f) => ({
      ...f,
      plotName: plot.name,
      plotAcres: String(plot.acres),
      plotLocation: plot.location,
    }));
  };

  const validateForm = (): string[] => {
    const errs: string[] = [];
    if (!form.farmerName.trim()) errs.push('请填写农户姓名');
    if (!form.farmerPhone.trim()) errs.push('请填写农户联系电话');
    if (!form.plotName.trim()) errs.push('请填写地块名称');
    if (!form.workType) errs.push('请选择作业类型');
    if (!form.machineId) errs.push('请选择农机');
    if (!form.driverId) errs.push('请选择司机');
    if (!form.workDate) errs.push('请选择作业日期');
    if (!form.startTime) errs.push('请填写开始时间');
    const hours = parseFloat(form.durationHours);
    if (isNaN(hours) || hours <= 0) errs.push('预计时长必须大于0');
    if (machineInMaintenance) errs.push('所选机器在该日期处于维修中，不可预约');
    return errs;
  };

  const doSubmit = (force = false) => {
    const errs = validateForm();
    if (errs.length > 0) {
      alert('请完善表单：\n' + errs.map((e) => '• ' + e).join('\n'));
      return;
    }

    const machine = machines.find((m) => m.id === form.machineId)!;
    const driver = drivers.find((d) => d.id === form.driverId)!;

    const dups = useAppStore.getState().checkDuplicatePlot(form.plotName.trim(), form.workDate);
    if (dups.length > 0 && !force) {
      setPendingSubmit(true);
      setShowDuplicateConfirm(true);
      return;
    }

    submitReservation(machine, driver);
  };

  const submitReservation = (machine: typeof machines[0], driver: typeof drivers[0]) => {
    const result = addReservation({
      farmerId: 'f_' + form.farmerName + '_' + Date.now(),
      farmerName: form.farmerName.trim(),
      farmerPhone: form.farmerPhone.trim(),
      farmerVillage: form.farmerVillage.trim(),
      plotId: 'p_' + form.plotName.trim(),
      plotName: form.plotName.trim(),
      plotAcres: parseFloat(form.plotAcres) || 0,
      plotLocation: form.plotLocation.trim(),
      machineId: machine.id,
      machineName: machine.name,
      machineType: machine.type as MachineType,
      driverId: driver.id,
      driverName: driver.name,
      driverPhone: driver.phone,
      workDate: form.workDate,
      startTime: form.startTime,
      durationHours: parseFloat(form.durationHours),
      workType: form.workType as WorkType,
      estimatedFuel: parseFloat(form.estimatedFuel) || 0,
      status: '待作业',
    });

    if (!result.success) {
      alert('提交失败：\n' + result.warnings.join('\n'));
      return;
    }

    setSuccessFlash(true);
    setTimeout(() => setSuccessFlash(false), 2500);
    setForm(initialForm);
    setShowDuplicateConfirm(false);
    setPendingSubmit(false);

    if (result.warnings.length > 0) {
      alert('✅ 预约已登记\n\n注意：\n' + result.warnings.map((w) => '• ' + w).join('\n'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-farm-700 flex items-center gap-2">
            <ClipboardList size={24} />
            预约登记
          </h2>
          <p className="text-sm text-earth-500 mt-1">接到农户电话后，快速录入地块、作业、机器、司机信息</p>
        </div>
        <button onClick={() => navigate('/schedule')} className="btn btn-secondary">
          <CalendarDays size={16} />
          查看排班看板
        </button>
      </div>

      {successFlash && (
        <div className="bg-farm-50 border border-farm-200 rounded-xl px-5 py-3 flex items-center gap-3 fade-in">
          <CheckCircle2 size={22} className="text-farm-600" />
          <div className="text-sm">
            <span className="font-bold text-farm-700">预约登记成功！</span>
            <span className="text-earth-500 ml-2">数据已自动保存，刷新页面不丢失</span>
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="bg-wheat-100/50 border border-wheat-300 rounded-xl px-5 py-3 space-y-1 fade-in">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-wheat-600">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="card">
          <div className="card-header flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-farm-100 flex items-center justify-center text-farm-600">
              <User size={18} />
            </div>
            <div>
              <h3 className="font-bold text-earth-600">农户信息</h3>
              <p className="text-xs text-earth-400">系统会自动记忆老农户与地块</p>
            </div>
          </div>
          <div className="card-body space-y-4">
            <div className="relative">
              <label className="input-label input-required">农户姓名</label>
              <input
                className="input"
                list="farmer-list"
                placeholder="输入姓名，老农户可下拉选择"
                value={form.farmerName}
                onChange={(e) => update('farmerName', e.target.value)}
              />
              <datalist id="farmer-list">
                {Array.from(farmerSuggestions.keys()).map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              {form.farmerName && farmerSuggestions.has(form.farmerName) && (
                <button
                  type="button"
                  onClick={() => selectFarmer(form.farmerName)}
                  className="mt-2 text-xs text-farm-600 hover:text-farm-700 underline underline-offset-2 flex items-center gap-1"
                >
                  <Search size={12} /> 一键载入「{form.farmerName}」的电话/村组/历史地块
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label input-required">联系电话</label>
                <input
                  className="input"
                  placeholder="如 139xxxxxxxx"
                  value={form.farmerPhone}
                  onChange={(e) => update('farmerPhone', e.target.value)}
                />
              </div>
              <div>
                <label className="input-label">所在村组</label>
                <input
                  className="input"
                  list="village-list"
                  placeholder="如 东河村一组"
                  value={form.farmerVillage}
                  onChange={(e) => update('farmerVillage', e.target.value)}
                />
                <datalist id="village-list">
                  {uniqueVillages.map((v) => <option key={v} value={v} />)}
                </datalist>
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-wheat-100 flex items-center justify-center text-wheat-600">
              <MapPin size={18} />
            </div>
            <div>
              <h3 className="font-bold text-earth-600">地块信息</h3>
              <p className="text-xs text-earth-400">同一地块同日重复申请将弹出提醒</p>
            </div>
          </div>
          <div className="card-body space-y-4">
            <div className="relative">
              <label className="input-label input-required">地块名称/编号</label>
              <input
                className="input"
                list="plot-list"
                placeholder="如 东河湾3号地"
                value={form.plotName}
                onChange={(e) => update('plotName', e.target.value)}
              />
              <datalist id="plot-list">
                {plotSuggestions.map((p) => (
                  <option key={p.name} value={p.name} />
                ))}
              </datalist>
              {plotSuggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {plotSuggestions.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => selectPlot(p)}
                      className="text-xs px-2.5 py-1 rounded-full bg-farm-50 text-farm-700 border border-farm-200 hover:bg-farm-100 transition-colors"
                    >
                      {p.name} · {p.acres}亩
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">亩数（亩）</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="input"
                  placeholder="如 8.5"
                  value={form.plotAcres}
                  onChange={(e) => update('plotAcres', e.target.value)}
                />
              </div>
              <div>
                <label className="input-label">位置描述</label>
                <input
                  className="input"
                  placeholder="如 村东500米"
                  value={form.plotLocation}
                  onChange={(e) => update('plotLocation', e.target.value)}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
              <Tractor size={18} />
            </div>
            <div>
              <h3 className="font-bold text-earth-600">农机与作业</h3>
              <p className="text-xs text-earth-400">维修中的机器会被自动禁用</p>
            </div>
          </div>
          <div className="card-body space-y-4">
            <div>
              <label className="input-label input-required">作业类型</label>
              <div className="grid grid-cols-5 gap-2">
                {WORK_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => update('workType', t)}
                    className={`py-2 rounded-lg text-sm border transition-all ${
                      form.workType === t
                        ? 'bg-farm-600 text-white border-farm-600 shadow-farm'
                        : 'bg-white text-earth-500 border-earth-300 hover:bg-farm-50 hover:border-farm-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="input-label input-required">
                选择农机
                <ChevronDown size={12} className="inline ml-1" />
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {machines.map((m) => {
                  const inMaint = form.workDate && isMachineUnderMaintenance(m.id, form.workDate);
                  const disabled = inMaint || m.status === '维修中';
                  const selected = form.machineId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        update('machineId', m.id);
                        if (!drivers.find((d) => d.id === form.driverId)?.machineIds.includes(m.id)) {
                          const preferred = drivers.find((d) => d.active && d.machineIds.includes(m.id));
                          if (preferred) update('driverId', preferred.id);
                        }
                      }}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                        selected
                          ? 'bg-farm-600 text-white border-farm-600 shadow-farm'
                          : disabled
                          ? 'bg-stripes-red border-red-200 text-red-500'
                          : 'bg-white text-earth-500 border-earth-300 hover:border-farm-400 hover:bg-farm-50'
                      }`}
                    >
                      <div className="font-bold">{m.name}</div>
                      <div className={`mt-0.5 ${selected ? 'text-farm-100' : 'text-earth-400'}`}>
                        {m.type} · {m.plateNumber}
                      </div>
                      {disabled && (
                        <div className="mt-1 text-red-500 font-medium">
                          🔧 {inMaint ? '维修期' : '维修中'}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Car size={18} />
            </div>
            <div>
              <h3 className="font-bold text-earth-600">司机与时间</h3>
              <p className="text-xs text-earth-400">
                {selectedMachine ? `优先推荐可驾驶「${selectedMachine.name}」的司机` : '选择农机后将推荐对应司机'}
              </p>
            </div>
          </div>
          <div className="card-body space-y-4">
            <div>
              <label className="input-label input-required">司机</label>
              <div className="grid grid-cols-2 gap-2">
                {drivers.filter((d) => d.active).map((d) => {
                  const canDrive = !form.machineId || d.machineIds.includes(form.machineId);
                  const selected = form.driverId === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => update('driverId', d.id)}
                      className={`p-2.5 rounded-lg border text-left text-sm transition-all ${
                        selected
                          ? 'bg-farm-600 text-white border-farm-600 shadow-farm'
                          : canDrive
                          ? 'bg-white text-earth-500 border-earth-300 hover:border-farm-400 hover:bg-farm-50'
                          : 'bg-earth-100/50 text-earth-400 border-earth-200'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>{d.name}</span>
                        {canDrive && !selected && <span className="text-[10px] tag tag-success">推荐</span>}
                      </div>
                      <div className={`text-xs mt-0.5 ${selected ? 'text-farm-100' : 'text-earth-400'}`}>
                        📱 {d.phone}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label input-required">作业日期</label>
                <input
                  type="date"
                  className="input"
                  value={form.workDate}
                  onChange={(e) => update('workDate', e.target.value)}
                />
              </div>
              <div>
                <label className="input-label input-required">开始时间</label>
                <input
                  type="time"
                  className="input"
                  value={form.startTime}
                  onChange={(e) => update('startTime', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label input-required">
                  <Clock size={12} className="inline mr-1" />预计时长（小时）
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  className="input"
                  value={form.durationHours}
                  onChange={(e) => update('durationHours', e.target.value)}
                />
              </div>
              <div>
                <label className="input-label">
                  <Fuel size={12} className="inline mr-1" />预计油费（元）
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  className="input"
                  placeholder="根据亩数自动估算"
                  value={form.estimatedFuel}
                  onChange={(e) => update('estimatedFuel', e.target.value)}
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="card bg-gradient-to-r from-farm-600 to-farm-700 text-white border-farm-700 shadow-farm">
        <div className="p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <div className="text-sm text-wheat-200/90">确认信息无误后提交，数据将自动进入排班看板</div>
            <div className="font-serif text-lg mt-1">
              {form.farmerName || '农户'} · {form.plotName || '地块'}
              {form.workType && ` · ${form.workType}`}
              {selectedMachine && ` · 🚜${selectedMachine.name}`}
              {form.driverId && ` · 👨‍🌾${drivers.find((d) => d.id === form.driverId)?.name}`}
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={() => setForm(initialForm)}
              className="btn flex-1 md:flex-none bg-white/10 text-white border-white/20 hover:bg-white/20"
            >
              清空表单
            </button>
            <button
              onClick={() => doSubmit(false)}
              className="btn btn-wheat flex-1 md:flex-none"
            >
              <CheckCircle2 size={16} />
              提交预约登记
            </button>
          </div>
        </div>
      </div>

      {showDuplicateConfirm && (
        <div className="modal-backdrop fade-in" onClick={() => { setShowDuplicateConfirm(false); setPendingSubmit(false); }}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="card-header bg-gradient-to-r from-wheat-100 to-wheat-50">
              <h3 className="font-bold text-wheat-600 flex items-center gap-2">
                <AlertTriangle size={18} />
                地块重复提醒
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-sm text-earth-500">
                该地块在 <span className="font-bold text-farm-700">{form.workDate}</span> 已有预约记录：
              </div>
              <div className="space-y-2">
                {useAppStore.getState().checkDuplicatePlot(form.plotName, form.workDate).map((r) => (
                  <div key={r.id} className="p-3 rounded-lg bg-wheat-100/50 border border-wheat-200 text-sm">
                    <div className="font-bold text-earth-600">{r.farmerName} · {r.plotName}</div>
                    <div className="text-earth-500 text-xs mt-1">
                      {r.startTime} · {r.workType} · 🚜{r.machineName} · 👨‍🌾{r.driverName} · {r.durationHours}小时
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-earth-400">
                是否确认继续新增？（可能造成机器/司机时间冲突）
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowDuplicateConfirm(false); setPendingSubmit(false); }}
                  className="btn btn-secondary flex-1"
                >
                  返回修改
                </button>
                <button
                  onClick={() => {
                    if (!pendingSubmit) return;
                    const machine = machines.find((m) => m.id === form.machineId)!;
                    const driver = drivers.find((d) => d.id === form.driverId)!;
                    submitReservation(machine, driver);
                  }}
                  className="btn btn-wheat flex-1"
                >
                  确认继续提交
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


