import { useState, useMemo } from 'react';
import { useStore, type SaltRecord } from '@/store';
import {
  Plus, List, Search, Download, X, Eye, Car, MapPin, User, Clock,
  Thermometer, CloudSun, FileText, Package, Ruler, TrendingUp,
  ChevronLeft, ChevronRight, AlertCircle, CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Papa from 'papaparse';

interface RegisterForm {
  plateNumber: string;
  bridgeId: string;
  executor: string;
  departureTime: string;
  arrivalTime: string;
  saltAmount: string;
  bridgeArea: string;
  temperature: string;
  weatherNote: string;
  remark: string;
}

const defaultForm = (): RegisterForm => ({
  plateNumber: '',
  bridgeId: '',
  executor: '',
  departureTime: new Date().toISOString().slice(0, 16),
  arrivalTime: '',
  saltAmount: '',
  bridgeArea: '',
  temperature: '',
  weatherNote: '',
  remark: '',
});

const PAGE_SIZE = 20;

export default function SaltArchive() {
  const bridges = useStore((s) => s.bridges);
  const saltRecords = useStore((s) => s.saltRecords);
  const addSaltRecord = useStore((s) => s.addSaltRecord);

  const [activeTab, setActiveTab] = useState<'register' | 'history'>('register');
  const [form, setForm] = useState<RegisterForm>(defaultForm());
  const [detail, setDetail] = useState<SaltRecord | null>(null);

  const [filters, setFilters] = useState({
    dateStart: '',
    dateEnd: '',
    bridgeId: '',
    plateNumber: '',
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [page, setPage] = useState(1);

  const selectedBridge = bridges.find((b) => b.id === form.bridgeId);
  const autoArea = selectedBridge?.area;
  const gramsPerSqm = useMemo(() => {
    const salt = parseFloat(form.saltAmount);
    const area = parseFloat(form.bridgeArea) || autoArea || 0;
    if (!salt || !area) return 0;
    return Math.round((salt * 1000 / area) * 10) / 10;
  }, [form.saltAmount, form.bridgeArea, autoArea]);

  const update = (key: keyof RegisterForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === 'bridgeId' && value) {
      const b = bridges.find((x) => x.id === value);
      if (b && !form.bridgeArea) setForm((f) => ({ ...f, bridgeArea: String(b.area) }));
    }
  };

  const resetForm = () => {
    const fresh = defaultForm();
    if (selectedBridge) fresh.bridgeArea = String(selectedBridge.area);
    setForm(fresh);
  };

  const canSubmit = form.plateNumber && form.bridgeId && form.executor
    && form.departureTime && form.arrivalTime
    && parseFloat(form.saltAmount) > 0 && parseFloat(form.bridgeArea) > 0;

  const handleSubmit = () => {
    if (!canSubmit || !selectedBridge) return;
    const salt = parseFloat(form.saltAmount);
    const area = parseFloat(form.bridgeArea);
    addSaltRecord({
      plateNumber: form.plateNumber.trim().toUpperCase(),
      bridgeId: selectedBridge.id,
      bridgeName: selectedBridge.name,
      executor: form.executor.trim(),
      departureTime: form.departureTime,
      arrivalTime: form.arrivalTime,
      saltAmount: salt,
      bridgeArea: area,
      gramsPerSqm: Math.round((salt * 1000 / area) * 10) / 10,
      temperature: parseFloat(form.temperature) || 0,
      weatherNote: form.weatherNote.trim(),
      remark: form.remark.trim(),
    });
    setForm(defaultForm());
    setActiveTab('history');
  };

  const filtered = useMemo(() => {
    return saltRecords.filter((r) => {
      if (appliedFilters.bridgeId && r.bridgeId !== appliedFilters.bridgeId) return false;
      if (appliedFilters.plateNumber && !r.plateNumber.toLowerCase().includes(appliedFilters.plateNumber.toLowerCase())) return false;
      const created = new Date(r.createdAt);
      if (appliedFilters.dateStart) {
        const start = new Date(appliedFilters.dateStart + 'T00:00:00');
        if (created < start) return false;
      }
      if (appliedFilters.dateEnd) {
        const end = new Date(appliedFilters.dateEnd + 'T23:59:59');
        if (created > end) return false;
      }
      return true;
    });
  }, [saltRecords, appliedFilters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportCSV = () => {
    const rows = filtered.map((r, i) => ({
      序号: i + 1,
      车牌号: r.plateNumber,
      路段: r.bridgeName,
      出发时间: r.departureTime.replace('T', ' '),
      到达时间: r.arrivalTime.replace('T', ' '),
      撒盐量_kg: r.saltAmount,
      桥面面积_平米: r.bridgeArea,
      折合克每平米: r.gramsPerSqm,
      现场气温_度: r.temperature,
      执行人: r.executor,
      天气备注: r.weatherNote,
      备注: r.remark,
      登记时间: new Date(r.createdAt).toLocaleString('zh-CN'),
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `撒盐作业档案_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmtTime = (s: string) => s ? s.replace('T', ' ') : '—';

  const FormGroup = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-5 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex items-center gap-2">
        <Icon className="w-4 h-4 text-ice-accent" />
        <h4 className="text-sm font-bold text-slate-700">{title}</h4>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );

  const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-ice-accent focus:ring-2 focus:ring-ice-accent/20 outline-none transition-all text-sm';
  const labelCls = 'block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="ice-card rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-2 py-2">
          <div className="flex gap-1 p-1">
            {[
              { id: 'register', label: '登记新车次', icon: Plus },
              { id: 'history', label: '历史档案', icon: List },
            ].map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all',
                    active
                      ? 'bg-gradient-to-r from-ice-primary to-ice-accent text-white shadow-md shadow-sky-500/20'
                      : 'text-slate-600 hover:bg-slate-100'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                  {t.id === 'history' && (
                    <span className={cn('text-xs px-2 py-0.5 rounded-full', active ? 'bg-white/20' : 'bg-slate-200 text-slate-600')}>
                      {saltRecords.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'register' ? (
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <FormGroup title="基本信息" icon={FileText}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}><Car className="w-3.5 h-3.5 inline mr-1" />车牌号</label>
                    <input value={form.plateNumber} onChange={(e) => update('plateNumber', e.target.value)} placeholder="例：苏A·12345" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}><MapPin className="w-3.5 h-3.5 inline mr-1" />路段（桥梁）</label>
                    <select value={form.bridgeId} onChange={(e) => update('bridgeId', e.target.value)} className={inputCls}>
                      <option value="">请选择桥梁...</option>
                      {bridges.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}（{b.location}）</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}><User className="w-3.5 h-3.5 inline mr-1" />执行人</label>
                    <input value={form.executor} onChange={(e) => update('executor', e.target.value)} placeholder="现场作业负责人" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}><Clock className="w-3.5 h-3.5 inline mr-1" />出发时间</label>
                      <input type="datetime-local" value={form.departureTime} onChange={(e) => update('departureTime', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>到达时间</label>
                      <input type="datetime-local" value={form.arrivalTime} onChange={(e) => update('arrivalTime', e.target.value)} className={inputCls} />
                    </div>
                  </div>
                </div>
              </FormGroup>

              <FormGroup title="作业数据" icon={Package}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}><Package className="w-3.5 h-3.5 inline mr-1" />撒盐总量（kg）</label>
                    <input type="number" min="0" step="0.5" value={form.saltAmount} onChange={(e) => update('saltAmount', e.target.value)} placeholder="实际撒盐重量" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}><Ruler className="w-3.5 h-3.5 inline mr-1" />桥面面积（㎡）<span className="text-slate-400 normal-case ml-1">可估算</span></label>
                    <input type="number" min="0" value={form.bridgeArea} placeholder={autoArea ? String(autoArea) : '选择桥梁后自动填入'} onChange={(e) => update('bridgeArea', e.target.value)} className={inputCls} />
                  </div>
                  <div className="md:col-span-2">
                    <div className="p-4 rounded-xl bg-gradient-to-r from-sky-50 to-cyan-50 border border-sky-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-ice-accent" />
                          <span className="text-xs font-bold uppercase tracking-wider text-sky-700">折合单位撒盐量</span>
                        </div>
                        <span className="text-2xl font-black text-ice-primary font-mono">
                          {gramsPerSqm} <span className="text-sm font-semibold text-slate-500">g/㎡</span>
                        </span>
                      </div>
                      <p className="text-xs text-sky-700/80 mt-2">
                        计算公式：撒盐量(g) ÷ 桥面面积(㎡) = {form.saltAmount || '?' } × 1000 ÷ {form.bridgeArea || autoArea || '?'} = {gramsPerSqm} g/㎡
                      </p>
                    </div>
                  </div>
                </div>
              </FormGroup>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <FormGroup title="环境数据" icon={Thermometer}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}><Thermometer className="w-3.5 h-3.5 inline mr-1" />现场气温（℃）</label>
                    <input type="number" step="0.1" value={form.temperature} onChange={(e) => update('temperature', e.target.value)} placeholder="作业现场实测气温" className={inputCls} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls}><CloudSun className="w-3.5 h-3.5 inline mr-1" />天气备注</label>
                    <textarea rows={3} value={form.weatherNote} onChange={(e) => update('weatherNote', e.target.value)} placeholder="例：小雪转晴，阵风4-5级，路面有少量积雪..." className={cn(inputCls, 'resize-none')} />
                  </div>
                </div>
              </FormGroup>

              <FormGroup title="备注信息" icon={AlertCircle}>
                <label className={labelCls}>其他说明</label>
                <textarea rows={8} value={form.remark} onChange={(e) => update('remark', e.target.value)} placeholder="作业异常情况、设备状态、补充说明等..." className={cn(inputCls, 'resize-none')} />
              </FormGroup>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={resetForm} className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                清空重置
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={cn(
                  'px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center gap-2',
                  canSubmit
                    ? 'bg-gradient-to-r from-ice-primary to-ice-accent text-white hover:shadow-xl hover:shadow-sky-500/25 active:scale-[0.99]'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                )}
              >
                <CheckCircle2 className="w-4 h-4" />
                提交登记
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                <div>
                  <label className={labelCls}>起始日期</label>
                  <input type="date" value={filters.dateStart} onChange={(e) => setFilters((f) => ({ ...f, dateStart: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>结束日期</label>
                  <input type="date" value={filters.dateEnd} onChange={(e) => setFilters((f) => ({ ...f, dateEnd: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>路段（桥梁）</label>
                  <select value={filters.bridgeId} onChange={(e) => setFilters((f) => ({ ...f, bridgeId: e.target.value }))} className={inputCls}>
                    <option value="">全部路段</option>
                    {bridges.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>车牌号</label>
                  <input value={filters.plateNumber} onChange={(e) => setFilters((f) => ({ ...f, plateNumber: e.target.value }))} placeholder="模糊搜索" className={inputCls} />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setAppliedFilters(filters); setPage(1); }}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-ice-primary to-ice-accent text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5"
                  >
                    <Search className="w-4 h-4" /> 搜索
                  </button>
                  <button
                    onClick={exportCSV}
                    className="flex-1 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 text-sm font-bold hover:bg-emerald-100 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-4 h-4" /> 导出CSV
                  </button>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 flex items-center justify-between px-1">
              <span>共找到 <span className="font-bold text-slate-700">{filtered.length}</span> 条记录，当前第 {page} / {totalPages} 页</span>
              <span>每页 {PAGE_SIZE} 条</span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-14">序号</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">车牌号</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">路段</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">出发→到达</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">撒盐kg</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">g/㎡</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">气温</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">执行人</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">登记时间</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-24">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.length ? paged.map((r, i) => (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-sky-50/30 transition-colors">
                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 font-mono text-xs font-semibold text-slate-700">
                            <Car className="w-3 h-3 text-slate-500" />
                            {r.plateNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">{r.bridgeName}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs font-mono leading-tight">
                          <div>发 {fmtTime(r.departureTime)}</div>
                          <div>到 {fmtTime(r.arrivalTime)}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">{r.saltAmount}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={cn(
                            'inline-block px-2 py-0.5 rounded-md font-mono text-xs font-bold',
                            r.gramsPerSqm >= 50 ? 'bg-emerald-50 text-emerald-700' :
                            r.gramsPerSqm >= 30 ? 'bg-amber-50 text-amber-700' :
                            'bg-red-50 text-red-700'
                          )}>{r.gramsPerSqm}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">{r.temperature}℃</td>
                        <td className="px-4 py-3 text-slate-700">{r.executor}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">{new Date(r.createdAt).toLocaleString('zh-CN')}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setDetail(r)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-ice-primary bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> 详情
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={10} className="px-4 py-16 text-center text-slate-400">
                          <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                          <p>暂无符合条件的档案记录</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    显示 {(page - 1) * PAGE_SIZE + 1} – {Math.min(page * PAGE_SIZE, filtered.length)} 条，共 {filtered.length} 条
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-colors', page === 1 ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-white border border-transparent hover:border-slate-200 text-slate-600')}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const num = i + 1;
                      const show = totalPages <= 7 || num === 1 || num === totalPages || Math.abs(num - page) <= 1;
                      if (!show && totalPages > 7 && (num === 2 || num === totalPages - 1)) {
                        return <span key={num} className="px-2 text-slate-400 text-sm">...</span>;
                      }
                      if (!show) return null;
                      return (
                        <button
                          key={num}
                          onClick={() => setPage(num)}
                          className={cn(
                            'min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-all',
                            page === num
                              ? 'bg-ice-primary text-white shadow-md'
                              : 'text-slate-600 hover:bg-white border border-transparent hover:border-slate-200'
                          )}
                        >
                          {num}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-colors', page === totalPages ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-white border border-transparent hover:border-slate-200 text-slate-600')}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDetail(null)} />
          <div className="relative w-full max-w-lg h-full bg-white shadow-2xl animate-in slide-in-from-right flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-ice-primary to-ice-accent text-white">
              <div>
                <h3 className="font-bold">撒盐作业档案详情</h3>
                <p className="text-xs text-sky-100/80 mt-0.5">记录号：{detail.id}</p>
              </div>
              <button onClick={() => setDetail(null)} className="w-8 h-8 rounded-lg hover:bg-white/15 flex items-center justify-center transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 space-y-5">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 to-cyan-50 border border-sky-200">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-xs text-sky-700/70 uppercase tracking-wider font-semibold">撒盐总量</p>
                    <p className="text-2xl font-black text-ice-primary mt-1">{detail.saltAmount}<span className="text-sm font-medium ml-1">kg</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-sky-700/70 uppercase tracking-wider font-semibold">单位撒盐量</p>
                    <p className="text-2xl font-black text-ice-primary mt-1">{detail.gramsPerSqm}<span className="text-sm font-medium ml-1">g/㎡</span></p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 border-b border-slate-100 pb-2">基本信息</h4>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <dt className="text-slate-500">车牌号</dt>
                  <dd className="font-mono font-semibold text-slate-800 text-right">{detail.plateNumber}</dd>
                  <dt className="text-slate-500">路段</dt>
                  <dd className="font-medium text-slate-800 text-right">{detail.bridgeName}</dd>
                  <dt className="text-slate-500">执行人</dt>
                  <dd className="text-slate-800 text-right">{detail.executor}</dd>
                  <dt className="text-slate-500">出发时间</dt>
                  <dd className="font-mono text-slate-800 text-right">{fmtTime(detail.departureTime)}</dd>
                  <dt className="text-slate-500">到达时间</dt>
                  <dd className="font-mono text-slate-800 text-right">{fmtTime(detail.arrivalTime)}</dd>
                </dl>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 border-b border-slate-100 pb-2">作业数据</h4>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <dt className="text-slate-500">桥面面积</dt>
                  <dd className="font-mono font-semibold text-slate-800 text-right">{detail.bridgeArea.toLocaleString()} ㎡</dd>
                  <dt className="text-slate-500">现场气温</dt>
                  <dd className="font-mono font-semibold text-slate-800 text-right">{detail.temperature} ℃</dd>
                </dl>
              </div>

              {detail.weatherNote && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 border-b border-slate-100 pb-2">天气备注</h4>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3 border border-slate-100 leading-relaxed">{detail.weatherNote}</p>
                </div>
              )}

              {detail.remark && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 border-b border-slate-100 pb-2">备注说明</h4>
                  <p className="text-sm text-slate-700 bg-amber-50 rounded-xl p-3 border border-amber-100 leading-relaxed">{detail.remark}</p>
                </div>
              )}

              <div className="pt-2 text-xs text-slate-400 text-center">
                系统登记时间：{new Date(detail.createdAt).toLocaleString('zh-CN')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
