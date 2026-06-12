import { useState, useEffect, useRef } from 'react';
import {
  ScanLine,
  User,
  Package,
  CalendarDays,
  MapPin,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Search,
  ChevronDown,
  X,
  Check,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInventoryStore } from '@/store/inventory';
import type { Patient } from '../../shared/types';
import { format, addDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';

type Step = 'scan' | 'selectPatient' | 'fillForm' | 'result';

const missingReasons = [
  { value: 'missing_template', label: '缺模板' },
  { value: 'missing_material', label: '缺材料' },
  { value: 'missing_batch', label: '缺牙套批次' },
];

const clinicRooms = ['A诊室', 'B诊室', 'C诊室', 'D诊室'];

export default function Register() {
  const [step, setStep] = useState<Step>('scan');
  const [scanInput, setScanInput] = useState('');
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{
    patient: Patient;
    attachmentCode: string;
  } | null>(null);
  const [form, setForm] = useState({
    alignerBatch: '',
    followUpDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    clinicRoom: 'A诊室',
    missingReason: '' as string,
  });
  const [bindResult, setBindResult] = useState<{ success: boolean; message?: string } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const {
    scanResult,
    patients,
    scanAttachment,
    bindAttachment,
    createPatient,
    fetchPatients,
    clearScanResult,
    loadingMap,
  } = useInventoryStore();

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    if (step === 'scan' && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [step]);

  const handleScan = async () => {
    if (!scanInput.trim()) return;
    const result = await scanAttachment(scanInput.trim());
    if (!result) return;

    if (result.isDuplicate && result.boundPatient) {
      setDuplicateInfo({
        patient: result.boundPatient,
        attachmentCode: result.attachment.code,
      });
      setShowDuplicateModal(true);
      setScanInput('');
      return;
    }

    if (result.attachment) {
      setStep('selectPatient');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleScan();
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setStep('fillForm');
  };

  const handleCreateNewPatient = async () => {
    const name = prompt('请输入患者姓名：');
    if (!name) return;
    const phone = prompt('请输入联系电话（选填）：') || '';
    const plan = prompt('请输入诊疗方案（选填）：') || '';
    const p = await createPatient({ name, phone, treatment_plan: plan });
    if (p) {
      setSelectedPatient(p);
      setShowNewPatient(false);
      setStep('fillForm');
    }
  };

  const handleBind = async () => {
    if (!scanResult || !selectedPatient) return;

    const result = await bindAttachment({
      attachmentId: scanResult.attachment.id,
      patientId: selectedPatient.id,
      alignerBatch: form.alignerBatch || scanResult.attachment.batch_no,
      followUpDate: form.followUpDate,
      clinicRoom: form.clinicRoom,
      missingReason: form.missingReason || null,
    });

    setBindResult(result);
    setStep('result');
  };

  const resetFlow = () => {
    setStep('scan');
    setScanInput('');
    setSelectedPatient(null);
    clearScanResult();
    setBindResult(null);
    setForm({
      alignerBatch: '',
      followUpDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
      clinicRoom: 'A诊室',
      missingReason: '',
    });
  };

  const filteredPatients = patients.filter(
    (p) =>
      !patientSearch ||
      p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.phone?.includes(patientSearch)
  );

  const missingReasonLabel = (val: string) => {
    const m = missingReasons.find((x) => x.value === val);
    return m?.label || val;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6">
      {showDuplicateModal && duplicateInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-slide-up overflow-hidden">
            <div className="bg-danger-50 px-6 py-5 border-b border-danger-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-danger-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-danger-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-danger-900">重复扫码提示</h3>
                  <p className="text-sm text-danger-700 mt-0.5">该附件已被绑定，系统阻止重复扣减</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-danger-50/50 rounded-xl p-4 border border-danger-100">
                <div className="text-xs text-danger-600 mb-2">附件条码</div>
                <code className="text-lg font-mono font-bold text-danger-800">
                  {duplicateInfo.attachmentCode}
                </code>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="text-xs text-slate-500 mb-2">已绑定患者</div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-medical-100 flex items-center justify-center text-medical-700 font-bold">
                    {duplicateInfo.patient.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{duplicateInfo.patient.name}</div>
                    {duplicateInfo.patient.phone && (
                      <div className="text-sm text-slate-500">{duplicateInfo.patient.phone}</div>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                同一附件码重复扫码时，系统不会重复扣减库存。如需更换患者，请先在库存管理中解绑。
              </p>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="px-6 py-2.5 bg-medical-600 text-white rounded-lg hover:bg-medical-700 transition-colors font-medium"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ScanLine className="w-7 h-7 text-medical-600" />
            附件登记
          </h1>
          <p className="text-sm text-slate-500 mt-1">扫码绑定患者、牙套批次与复诊信息</p>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2">
            {['scan', 'selectPatient', 'fillForm', 'result'].map((s, i) => {
              const labels: Record<string, string> = {
                scan: '扫码',
                selectPatient: '选患者',
                fillForm: '填信息',
                result: '完成',
              };
              const isActive = step === s;
              const isPast =
                (step === 'selectPatient' && i <= 1) ||
                (step === 'fillForm' && i <= 2) ||
                (step === 'result');
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                        isActive
                          ? 'bg-medical-600 text-white shadow-lg shadow-medical-600/30'
                          : isPast
                            ? 'bg-success-500 text-white'
                            : 'bg-slate-200 text-slate-500'
                      )}
                    >
                      {isPast && step !== s ? <Check className="w-4 h-4" /> : i + 1}
                    </div>
                    <span
                      className={cn(
                        'text-sm hidden sm:inline',
                        isActive ? 'font-semibold text-medical-700' : 'text-slate-500'
                      )}
                    >
                      {labels[s]}
                    </span>
                  </div>
                  {i < 3 && (
                    <div
                      className={cn(
                        'flex-1 h-0.5 mx-2 rounded-full',
                        isPast ? 'bg-success-400' : 'bg-slate-200'
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {step === 'scan' && (
          <div className="bg-white rounded-2xl shadow-card border border-slate-200 overflow-hidden">
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-medical-50 to-medical-100 border border-medical-200 flex items-center justify-center mx-auto mb-4">
                  <ScanLine className="w-12 h-12 text-medical-600 animate-pulse" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">扫描附件条码</h2>
                <p className="text-sm text-slate-500 mt-2">使用扫码枪扫描附件包装条码，或手动输入</p>
              </div>

              <div className="relative max-w-md mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  ref={scanInputRef}
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="扫描或输入附件条码..."
                  className="w-full pl-12 pr-24 py-4 border-2 border-slate-200 rounded-2xl text-lg focus:outline-none focus:ring-4 focus:ring-medical-500/20 focus:border-medical-500 transition-all"
                  autoComplete="off"
                />
                <button
                  onClick={handleScan}
                  disabled={!scanInput.trim() || loadingMap.scan}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 bg-medical-600 text-white rounded-xl hover:bg-medical-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loadingMap.scan ? '识别中...' : '识别'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {scanResult && (
                <div className="max-w-md mx-auto mt-6 p-4 rounded-xl bg-success-50 border border-success-200">
                  <div className="flex items-center gap-2 text-success-700 mb-3">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">附件识别成功</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-success-600">条码：</span>
                      <code className="font-mono font-medium text-success-800">
                        {scanResult.attachment.code}
                      </code>
                    </div>
                    <div>
                      <span className="text-success-600">型号：</span>
                      <span className="font-medium text-success-800">
                        {scanResult.attachment.model?.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-success-600">类型：</span>
                      <span className="font-medium text-success-800">
                        {scanResult.attachment.model?.type === 'template'
                          ? '模板'
                          : scanResult.attachment.model?.type === 'material'
                            ? '材料'
                            : '牙套'}
                      </span>
                    </div>
                    <div>
                      <span className="text-success-600">批次：</span>
                      <span className="font-medium text-success-800">
                        {scanResult.attachment.batch_no}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="max-w-md mx-auto mt-8">
                <div className="text-sm font-medium text-slate-700 mb-3">快速选择示例条码</div>
                <div className="flex flex-wrap gap-2">
                  {['ATT00001', 'ATT00002', 'ATT00003', 'ATT00007', 'ATT00008'].map((code) => (
                    <button
                      key={code}
                      onClick={() => setScanInput(code)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-mono text-slate-700 transition-colors"
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'selectPatient' && (
          <div className="bg-white rounded-2xl shadow-card border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">选择患者</h2>
                <p className="text-sm text-slate-500 mt-0.5">选择附件绑定的患者，或创建新患者</p>
              </div>
              <button
                onClick={handleCreateNewPatient}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-medical-600 text-white rounded-lg hover:bg-medical-700 transition-colors text-sm font-medium"
              >
                <UserPlus className="w-4 h-4" />
                新患者
              </button>
            </div>

            <div className="p-4 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="搜索患者姓名或电话..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
                />
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {filteredPatients.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <div>未找到匹配的患者</div>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filteredPatients.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => handleSelectPatient(p)}
                        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-medical-400 to-medical-600 flex items-center justify-center text-white font-bold shrink-0">
                          {p.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900">{p.name}</div>
                          <div className="text-sm text-slate-500 flex items-center gap-3 mt-0.5">
                            {p.phone && <span>{p.phone}</span>}
                            {p.treatment_plan && (
                              <span className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600">
                                {p.treatment_plan}
                              </span>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-300" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between">
              <button
                onClick={() => {
                  setStep('scan');
                  clearScanResult();
                }}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-white transition-colors text-sm font-medium"
              >
                返回扫码
              </button>
            </div>
          </div>
        )}

        {step === 'fillForm' && scanResult && selectedPatient && (
          <div className="bg-white rounded-2xl shadow-card border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">填写绑定信息</h2>
            </div>

            <div className="p-5 space-y-5">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">患者</div>
                    <div className="font-semibold text-slate-900">{selectedPatient.name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">附件型号</div>
                    <div className="font-semibold text-slate-900">
                      {scanResult.attachment.model?.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">附件条码</div>
                    <code className="font-mono text-sm font-medium text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {scanResult.attachment.code}
                    </code>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">附件批次</div>
                    <div className="font-medium text-slate-700">{scanResult.attachment.batch_no}</div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  牙套批次 <span className="text-danger-500">*</span>
                </label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.alignerBatch}
                    onChange={(e) => setForm({ ...form, alignerBatch: e.target.value })}
                    placeholder="如 YT20250101，默认使用附件批次"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  复诊日期 <span className="text-danger-500">*</span>
                </label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={form.followUpDate}
                    onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  诊室 <span className="text-danger-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={form.clinicRoom}
                    onChange={(e) => setForm({ ...form, clinicRoom: e.target.value })}
                    className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 bg-white appearance-none"
                  >
                    {clinicRooms.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">缺件原因</label>
                <div className="space-y-2">
                  {missingReasons.map((r) => (
                    <label
                      key={r.value}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                        form.missingReason === r.value
                          ? 'border-warning-500 bg-warning-50'
                          : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <input
                        type="radio"
                        name="missingReason"
                        value={r.value}
                        checked={form.missingReason === r.value}
                        onChange={() =>
                          setForm({
                            ...form,
                            missingReason: form.missingReason === r.value ? '' : r.value,
                          })
                        }
                        className="hidden"
                      />
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                          form.missingReason === r.value
                            ? 'border-warning-500 bg-warning-500'
                            : 'border-slate-300'
                        )}
                      >
                        {form.missingReason === r.value && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-sm font-medium',
                          form.missingReason === r.value ? 'text-warning-700' : 'text-slate-700'
                        )}
                      >
                        {r.label}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  未勾选表示附件齐备，已勾选将标记为缺件状态
                </p>
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-between">
              <button
                onClick={() => setStep('selectPatient')}
                className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-white transition-colors text-sm font-medium"
              >
                返回
              </button>
              <button
                onClick={handleBind}
                disabled={!form.followUpDate || loadingMap.bind}
                className="px-6 py-2.5 bg-medical-600 text-white rounded-lg hover:bg-medical-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {loadingMap.bind ? '绑定中...' : '确认绑定'}
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 'result' && bindResult && (
          <div className="bg-white rounded-2xl shadow-card border border-slate-200 overflow-hidden">
            <div
              className={cn(
                'p-8 text-center',
                bindResult.success ? 'bg-success-50' : 'bg-danger-50'
              )}
            >
              <div
                className={cn(
                  'w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4',
                  bindResult.success ? 'bg-success-100' : 'bg-danger-100'
                )}
              >
                {bindResult.success ? (
                  <CheckCircle2 className="w-10 h-10 text-success-600" />
                ) : (
                  <XCircle className="w-10 h-10 text-danger-600" />
                )}
              </div>
              <h2
                className={cn(
                  'text-xl font-semibold',
                  bindResult.success ? 'text-success-900' : 'text-danger-900'
                )}
              >
                {bindResult.success ? '绑定成功' : '绑定失败'}
              </h2>
              <p
                className={cn(
                  'text-sm mt-2',
                  bindResult.success ? 'text-success-700' : 'text-danger-700'
                )}
              >
                {bindResult.message ||
                  (bindResult.success
                    ? '附件已成功绑定到患者，库存已扣减'
                    : '请检查输入信息后重试')}
              </p>
            </div>

            {bindResult.success && (
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">患者</span>
                  <span className="font-medium text-slate-900">{selectedPatient?.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">附件</span>
                  <span className="font-mono text-slate-700">{scanResult?.attachment.code}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">牙套批次</span>
                  <span className="font-medium text-slate-900">
                    {form.alignerBatch || scanResult?.attachment.batch_no}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">复诊日期</span>
                  <span className="font-medium text-slate-900">
                    {format(new Date(form.followUpDate), 'yyyy年MM月dd日', { locale: zhCN })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">诊室</span>
                  <span className="font-medium text-slate-900">{form.clinicRoom}</span>
                </div>
                {form.missingReason && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">缺件状态</span>
                    <span className="px-2 py-1 bg-warning-100 text-warning-700 rounded-full text-xs font-medium">
                      {missingReasonLabel(form.missingReason)}
                    </span>
                  </div>
                )}
                {!form.missingReason && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">附件状态</span>
                    <span className="px-2 py-1 bg-success-100 text-success-700 rounded-full text-xs font-medium">
                      齐备
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              {bindResult.success && selectedPatient && (
                <button
                  onClick={() => {
                    window.location.href = `/patient/${selectedPatient.id}`;
                  }}
                  className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-white transition-colors text-sm font-medium"
                >
                  查看患者详情
                </button>
              )}
              <button
                onClick={resetFlow}
                className="px-6 py-2.5 bg-medical-600 text-white rounded-lg hover:bg-medical-700 transition-colors font-medium flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                继续登记
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
