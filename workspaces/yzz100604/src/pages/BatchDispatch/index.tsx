import { useState, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import {
  UploadCloud,
  Download,
  Plus,
  Play,
  Filter,
  Search,
  Trophy,
  Medal,
  Award,
  Truck,
  X,
  Check,
  Trash2,
  Edit3,
  FileSpreadsheet,
  FileJson,
  ChevronDown,
  Snowflake,
  Layers,
  ListChecks,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BatchRow, PrecipType, RiskInput, Vehicle, DispatchStatus } from '@/engine/types';
import { PRECIP_LABELS } from '@/engine/thresholds';
import { calculateRisk } from '@/engine/riskCalculator';
import { useAppStore } from '@/store';
import { RiskTag, StatusBadge } from '@/components/RiskBadge';

const precipOptions: PrecipType[] = ['none', 'drizzle', 'rain', 'sleet', 'snow', 'freezing_rain'];

const rankStyles = [
  { wrap: 'bg-gradient-to-br from-yellow-50 to-amber-100 border-amber-300', icon: Trophy, iconColor: 'text-amber-500', label: '第 1 名', badge: 'bg-amber-500 text-white' },
  { wrap: 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-300', icon: Medal, iconColor: 'text-slate-500', label: '第 2 名', badge: 'bg-slate-500 text-white' },
  { wrap: 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-300', icon: Award, iconColor: 'text-orange-500', label: '第 3 名', badge: 'bg-orange-500 text-white' },
];

const statusOptions: { key: DispatchStatus; label: string }[] = [
  { key: 'all', label: '全部' } as unknown as { key: DispatchStatus; label: string },
  { key: 'pending', label: '待调度' },
  { key: 'dispatched', label: '已派车' },
  { key: 'completed', label: '已完成' },
];

const newRowId = () => `R-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

const createEmptyRow = (bridgeName = ''): BatchRow => ({
  id: newRowId(),
  selected: true,
  bridgeName,
  airTemp: null,
  roadTemp: null,
  humidity: null,
  windSpeed: null,
  precipitation: 'none',
  saltAmount: null,
});

const csvTemplate = `桥名,气温(℃),路表温度(℃),湿度(%),风速(m/s),降水类型,撒盐量(g/㎡)
南京长江大桥,2,1,78,4.5,none,50
南京长江二桥,-1,-3,92,8.2,sleet,80
大胜关大桥,-3,null,95,6.5,freezing_rain,120`;

export default function BatchDispatch() {
  const vehicles = useAppStore((s) => s.vehicles);
  const dispatches = useAppStore((s) => s.dispatches);
  const bridges = useAppStore((s) => s.bridges);
  const addDispatch = useAppStore((s) => s.addDispatch);
  const assignVehicle = useAppStore((s) => s.assignVehicle);
  const updateDispatchStatus = useAppStore((s) => s.updateDispatchStatus);
  const deleteDispatch = useAppStore((s) => s.deleteDispatch);

  const [tab, setTab] = useState<'import' | 'current'>('import');

  const [rows, setRows] = useState<BatchRow[]>(() =>
    bridges.slice(0, 5).map((b) => createEmptyRow(b.name)),
  );
  const [dragOver, setDragOver] = useState(false);
  const [calculated, setCalculated] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchVehicle, setDispatchVehicle] = useState<string>('');
  const [dispatchNote, setDispatchNote] = useState('');

  const [statusFilter, setStatusFilter] = useState<DispatchStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableVehicles: Vehicle[] = useMemo(
    () => vehicles.filter((v) => v.status === 'available'),
    [vehicles],
  );

  const sortedRows = useMemo(() => {
    if (!calculated) return rows;
    return [...rows].sort((a, b) => {
      const la = a.riskResult?.level ?? 'safe';
      const lb = b.riskResult?.level ?? 'safe';
      const levelOrder: Record<string, number> = { danger: 0, warning: 1, caution: 2, safe: 3 };
      if (levelOrder[la] !== levelOrder[lb]) return levelOrder[la] - levelOrder[lb];
      return (b.riskResult?.score ?? 0) - (a.riskResult?.score ?? 0);
    });
  }, [rows, calculated]);

  const topThree = useMemo(
    () => sortedRows.filter((r) => r.riskResult).slice(0, 3),
    [sortedRows],
  );

  const selectedRows = useMemo(
    () => sortedRows.filter((r) => r.selected && r.riskResult),
    [sortedRows],
  );

  const filteredDispatches = useMemo(() => {
    return dispatches.filter((d) => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!d.bridgeName.toLowerCase().includes(q) && !d.id.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [dispatches, statusFilter, searchQuery]);

  const showToast = (type: 'success' | 'info' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 2500);
  };

  const updateRow = (id: string, patch: Partial<BatchRow>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch, riskResult: undefined } : r)));
    setCalculated(false);
  };

  const removeRow = (id: string) => {
    setRows((rs) => rs.filter((r) => r.id !== id));
  };

  const toggleAllSelected = (checked: boolean) => {
    setRows((rs) => rs.map((r) => ({ ...r, selected: checked })));
  };

  const handleBatchCalc = () => {
    const updated = rows.map((row) => {
      const bridge = bridges.find((b) => b.name === row.bridgeName) || { id: `CUST-${row.id}`, name: row.bridgeName };
      if (
        row.airTemp == null ||
        row.humidity == null ||
        row.windSpeed == null ||
        !row.bridgeName.trim()
      ) {
        return { ...row, riskResult: undefined };
      }
      const input: RiskInput = {
        bridgeId: bridge.id,
        bridgeName: bridge.name,
        airTemp: row.airTemp,
        airTempUnit: 'C',
        roadTemp: row.roadTemp ?? null,
        roadTempUnit: 'C',
        roadTempMissing: row.roadTemp == null,
        humidity: row.humidity,
        windSpeed: row.windSpeed,
        windUnit: 'm/s',
        precipitation: row.precipitation,
        saltAmount: row.saltAmount ?? 0,
      };
      try {
        return { ...row, riskResult: calculateRisk(input) };
      } catch {
        return { ...row, riskResult: undefined };
      }
    });
    const validCount = updated.filter((r) => r.riskResult).length;
    setRows(updated);
    setCalculated(true);
    showToast('success', `批量计算完成：${validCount} 个点位有效`);
  };

  const handleFile = (file: File) => {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.json')) {
      showToast('error', '仅支持 CSV 或 JSON 文件');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result ?? '');
      try {
        let parsed: BatchRow[] = [];
        if (name.endsWith('.json')) {
          const data = JSON.parse(text);
          const arr = Array.isArray(data) ? data : [data];
          parsed = arr.map((item: any) => ({
            ...createEmptyRow(String(item.bridgeName || item.桥名 || item.name || '')),
            airTemp: typeof item.airTemp === 'number' ? item.airTemp : typeof item['气温(℃)'] === 'number' ? item['气温(℃)'] : null,
            roadTemp: typeof item.roadTemp === 'number' ? item.roadTemp : typeof item['路表温度(℃)'] === 'number' ? item['路表温度(℃)'] : null,
            humidity: typeof item.humidity === 'number' ? item.humidity : typeof item['湿度(%)'] === 'number' ? item['湿度(%)'] : null,
            windSpeed: typeof item.windSpeed === 'number' ? item.windSpeed : typeof item['风速(m/s)'] === 'number' ? item['风速(m/s)'] : null,
            precipitation: (precipOptions.includes(item.precipitation) ? item.precipitation : item['降水类型']) || 'none',
            saltAmount: typeof item.saltAmount === 'number' ? item.saltAmount : typeof item['撒盐量(g/㎡)'] === 'number' ? item['撒盐量(g/㎡)'] : null,
          }));
        } else {
          const result = Papa.parse(text, { header: true, skipEmptyLines: true });
          parsed = result.data.map((row: any) => {
            const toNum = (v: any) => (v === '' || v == null ? null : Number(v));
            const prec = String(row.precipitation || row['降水类型'] || 'none').trim() as PrecipType;
            return {
              ...createEmptyRow(String(row.bridgeName || row['桥名'] || row.name || '')),
              airTemp: toNum(row.airTemp ?? row['气温(℃)']),
              roadTemp: toNum(row.roadTemp ?? row['路表温度(℃)']),
              humidity: toNum(row.humidity ?? row['湿度(%)']),
              windSpeed: toNum(row.windSpeed ?? row['风速(m/s)']),
              precipitation: precipOptions.includes(prec) ? prec : 'none',
              saltAmount: toNum(row.saltAmount ?? row['撒盐量(g/㎡)']),
            };
          });
        }
        if (parsed.length === 0) {
          showToast('error', '文件中未检测到有效数据');
          return;
        }
        setRows((rs) => [...rs, ...parsed]);
        setCalculated(false);
        showToast('success', `已导入 ${parsed.length} 条点位数据`);
      } catch (err) {
        console.error(err);
        showToast('error', '文件解析失败，请检查格式');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '桥面结冰评估模板.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('info', '模板下载已开始');
  };

  const exportResults = () => {
    if (!calculated) {
      showToast('info', '请先执行批量计算');
      return;
    }
    const exportRows = sortedRows.map((r) => ({
      桥名: r.bridgeName,
      '气温(℃)': r.airTemp,
      '路表温度(℃)': r.roadTemp ?? '(缺失估算)',
      '湿度(%)': r.humidity,
      '风速(m/s)': r.windSpeed,
      降水类型: PRECIP_LABELS[r.precipitation].label,
      '撒盐量(g/㎡)': r.saltAmount ?? 0,
      风险等级: r.riskResult ? (r.riskResult.level === 'safe' ? '安全' : r.riskResult.level === 'caution' ? '低度风险' : r.riskResult.level === 'warning' ? '中度风险' : '高度危险') : '数据不足',
      风险分数: r.riskResult?.score ?? '-',
      '建议复查(分钟)': r.riskResult?.reviewMinutes ?? '-',
    }));
    const csv = Papa.unparse(exportRows);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `批量评估结果_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', '结果已导出');
  };

  const openDispatchModal = () => {
    if (selectedRows.length === 0) {
      showToast('info', '请先勾选要调度的点位');
      return;
    }
    setDispatchVehicle(availableVehicles[0]?.plate ?? '');
    setDispatchNote('');
    setShowDispatchModal(true);
  };

  const confirmDispatch = () => {
    let count = 0;
    selectedRows.forEach((row) => {
      if (!row.riskResult) return;
      const bridge = bridges.find((b) => b.name === row.bridgeName);
      const id = addDispatch({
        bridgeId: bridge?.id ?? `CUST-${row.id}`,
        bridgeName: row.bridgeName,
        riskLevel: row.riskResult.level,
        riskScore: row.riskResult.score,
        priority: 0,
        status: dispatchVehicle ? 'dispatched' : 'pending',
        note: dispatchNote || undefined,
      });
      if (dispatchVehicle) assignVehicle(id, dispatchVehicle);
      count++;
    });
    setShowDispatchModal(false);
    showToast('success', `已生成 ${count} 条派车单`);
    if (dispatchVehicle) {
      setTimeout(() => setTab('current'), 600);
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const isNumeric = (v: number | null) => typeof v === 'number';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-cyan-50/20">
      <div className="max-w-[1480px] mx-auto px-6 py-8">
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">批量调度中心</h1>
              <p className="text-sm text-slate-500 mt-0.5">多点位批量风险计算 · 排序调度 · 派车管理</p>
            </div>
          </div>
        </header>

        <div className="inline-flex items-stretch p-1 rounded-xl bg-white border border-slate-200 shadow-sm mb-6">
          <button
            type="button"
            onClick={() => setTab('import')}
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all',
              tab === 'import'
                ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50',
            )}
          >
            <FileSpreadsheet className="w-4 h-4" />
            批量导入
          </button>
          <button
            type="button"
            onClick={() => setTab('current')}
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all',
              tab === 'current'
                ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50',
            )}
          >
            <ListChecks className="w-4 h-4" />
            当前调度
            {dispatches.length > 0 && (
              <span className={cn(
                'inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold',
                tab === 'current' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600',
              )}>
                {dispatches.length}
              </span>
            )}
          </button>
        </div>

        {tab === 'import' ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={downloadTemplate}
                className="inline-flex items-center gap-3 px-5 py-4 rounded-xl border border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/50 transition-all shadow-sm group"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                  <Download className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-slate-800">下载 CSV 模板</div>
                  <div className="text-xs text-slate-500 mt-0.5">标准格式，含示例数据</div>
                </div>
              </button>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'relative cursor-pointer rounded-xl border-2 border-dashed p-4 transition-all',
                  dragOver
                    ? 'border-sky-400 bg-sky-50 shadow-md'
                    : 'border-slate-300 bg-white hover:border-sky-300 hover:bg-sky-50/30 shadow-sm',
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center transition-transform',
                    dragOver ? 'bg-sky-100 text-sky-600 scale-110' : 'bg-slate-50 text-slate-500 group-hover:bg-sky-50 group-hover:text-sky-600',
                  )}>
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-slate-800">拖拽上传 / 点击选择</div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3 h-3" /> .csv
                      <span className="mx-0.5 text-slate-300">·</span>
                      <FileJson className="w-3 h-3" /> .json
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setRows((rs) => [...rs, createEmptyRow()])}
                className="inline-flex items-center gap-3 px-5 py-4 rounded-xl border border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/50 transition-all shadow-sm group"
              >
                <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 group-hover:scale-110 transition-transform">
                  <Plus className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-slate-800">手动添加行</div>
                  <div className="text-xs text-slate-500 mt-0.5">空白行，逐个输入参数</div>
                </div>
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.06)] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
                    <span className="w-1 h-4 rounded-full bg-sky-500" />
                    数据预览
                    <span className="text-xs font-normal text-slate-400">共 {rows.length} 行</span>
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleBatchCalc}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-sm font-semibold shadow-md shadow-sky-500/20 hover:from-sky-600 hover:to-cyan-600 active:scale-[0.98] transition-all"
                  >
                    <Play className="w-4 h-4" />
                    开始批量计算
                  </button>
                  <button
                    type="button"
                    onClick={exportResults}
                    disabled={!calculated}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    导出结果 CSV
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="sticky left-0 bg-slate-50/70 z-10 px-3 py-3 text-left w-10">
                        <input
                          type="checkbox"
                          checked={rows.length > 0 && rows.every((r) => r.selected)}
                          onChange={(e) => toggleAllSelected(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-400"
                        />
                      </th>
                      <th className="px-3 py-3 text-left font-semibold min-w-[180px]">桥名</th>
                      <th className="px-3 py-3 text-left font-semibold w-24">气温℃</th>
                      <th className="px-3 py-3 text-left font-semibold w-24">路表℃</th>
                      <th className="px-3 py-3 text-left font-semibold w-20">湿度%</th>
                      <th className="px-3 py-3 text-left font-semibold w-20">风速m/s</th>
                      <th className="px-3 py-3 text-left font-semibold w-24">降水类型</th>
                      <th className="px-3 py-3 text-left font-semibold w-24">撒盐g/㎡</th>
                      <th className="px-3 py-3 text-left font-semibold min-w-[140px]">风险评估</th>
                      <th className="sticky right-0 bg-slate-50/70 z-10 px-3 py-3 text-left font-semibold w-20">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedRows.map((row, idx) => {
                      const missing = !row.bridgeName.trim() || !isNumeric(row.airTemp) || !isNumeric(row.humidity) || !isNumeric(row.windSpeed);
                      return (
                        <tr
                          key={row.id}
                          className={cn(
                            'hover:bg-sky-50/30 transition-colors',
                            calculated && idx < 3 && row.riskResult && 'bg-gradient-to-r from-amber-50/40 to-transparent',
                          )}
                        >
                          <td className="sticky left-0 bg-inherit px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={row.selected}
                              onChange={(e) => updateRow(row.id, { selected: e.target.checked })}
                              className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-400"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.bridgeName}
                              onChange={(e) => updateRow(row.id, { bridgeName: e.target.value })}
                              placeholder="输入桥名..."
                              className="w-full px-2.5 py-1.5 rounded-md border border-transparent hover:border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none text-slate-800 font-medium bg-transparent transition-all"
                            />
                          </td>
                          {(['airTemp', 'roadTemp', 'humidity', 'windSpeed', 'saltAmount'] as const).map((k) => (
                            <td key={k} className="px-3 py-2">
                              <input
                                type="number"
                                value={row[k] ?? ''}
                                onChange={(e) => {
                                  const v = e.target.value === '' ? null : Number(e.target.value);
                                  updateRow(row.id, { [k]: v } as any);
                                }}
                                placeholder="-"
                                className={cn(
                                  'w-full px-2.5 py-1.5 rounded-md border text-center font-mono text-slate-700 outline-none bg-transparent transition-all',
                                  k === 'roadTemp'
                                    ? 'border-transparent hover:border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100'
                                    : 'border-transparent hover:border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100',
                                )}
                              />
                            </td>
                          ))}
                          <td className="px-3 py-2">
                            <select
                              value={row.precipitation}
                              onChange={(e) => updateRow(row.id, { precipitation: e.target.value as PrecipType })}
                              className="w-full px-2 py-1.5 rounded-md border border-transparent hover:border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 text-xs text-slate-700 outline-none bg-transparent transition-all cursor-pointer"
                            >
                              {precipOptions.map((p) => (
                                <option key={p} value={p}>
                                  {PRECIP_LABELS[p].label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            {row.riskResult ? (
                              <RiskTag level={row.riskResult.level} score={row.riskResult.score} />
                            ) : calculated && missing ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-xs font-medium">
                                <AlertCircle className="w-3 h-3" />
                                数据缺失
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 text-slate-400 text-xs font-medium border border-dashed border-slate-200">
                                <Snowflake className="w-3 h-3" />
                                待计算
                              </span>
                            )}
                          </td>
                          <td className="sticky right-0 bg-inherit px-3 py-2">
                            <button
                              type="button"
                              onClick={() => removeRow(row.id)}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="删除行"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-6 py-16 text-center text-slate-400 text-sm">
                          <UploadCloud className="w-10 h-10 mx-auto mb-3 opacity-40" />
                          暂无数据，请上传文件或点击「手动添加行」
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {calculated && topThree.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    优先巡查 TOP 榜
                  </h3>
                  <button
                    type="button"
                    onClick={openDispatchModal}
                    disabled={selectedRows.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-semibold shadow-md shadow-orange-500/20 hover:from-orange-600 hover:to-red-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Truck className="w-4 h-4" />
                    生成派车单
                    {selectedRows.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-white/25 text-xs">{selectedRows.length}</span>
                    )}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {topThree.map((row, idx) => {
                    if (!row.riskResult) return null;
                    const style = rankStyles[idx];
                    const Icon = style.icon;
                    return (
                      <div
                        key={row.id}
                        className={cn(
                          'rounded-xl border-2 p-4 relative overflow-hidden transition-transform hover:-translate-y-0.5',
                          style.wrap,
                        )}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center bg-white shadow-sm', style.iconColor)}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-bold', style.badge)}>
                            {style.label}
                          </span>
                        </div>
                        <div className="font-bold text-slate-800 mb-1.5 line-clamp-1">{row.bridgeName}</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <RiskTag level={row.riskResult.level} score={row.riskResult.score} />
                          <span className="text-xs text-slate-600">
                            <span className="font-bold">{row.riskResult.reviewMinutes}</span> 分钟内复查
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {calculated && selectedRows.length > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-bounce-in">
                <div className="inline-flex items-center gap-4 px-5 py-3 rounded-xl bg-slate-900 text-white shadow-2xl border border-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div className="text-sm">
                    已选 <span className="font-bold text-sky-300">{selectedRows.length}</span> 个点位准备调度
                  </div>
                  <button
                    type="button"
                    onClick={openDispatchModal}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-sm font-semibold hover:from-orange-600 hover:to-red-600 transition-all"
                  >
                    <Truck className="w-4 h-4" />
                    生成派车单
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="inline-flex items-stretch rounded-lg border border-slate-200 overflow-hidden">
                  <div className="flex items-center px-3 text-slate-400 bg-slate-50 border-r border-slate-200">
                    <Filter className="w-4 h-4" />
                  </div>
                  <div className="flex">
                    {statusOptions.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setStatusFilter(opt.key as any)}
                        className={cn(
                          'px-3.5 py-2 text-xs font-semibold transition-colors',
                          statusFilter === opt.key
                            ? 'bg-sky-500 text-white'
                            : 'bg-white text-slate-600 hover:bg-sky-50 hover:text-sky-700',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-stretch rounded-lg border border-slate-200 overflow-hidden focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100">
                  <div className="flex items-center px-3 text-slate-400 bg-slate-50 border-r border-slate-200">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索桥名或调度编号..."
                    className="w-64 px-3 py-2 text-sm text-slate-700 outline-none bg-white"
                  />
                </div>
              </div>
              <div className="text-xs text-slate-500">
                共 <span className="font-bold text-slate-700">{filteredDispatches.length}</span> 条记录
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.06)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="px-5 py-3 text-left font-semibold">调度编号</th>
                      <th className="px-5 py-3 text-left font-semibold">桥名</th>
                      <th className="px-5 py-3 text-left font-semibold">风险等级</th>
                      <th className="px-5 py-3 text-left font-semibold">优先级</th>
                      <th className="px-5 py-3 text-left font-semibold">指派车辆</th>
                      <th className="px-5 py-3 text-left font-semibold">状态</th>
                      <th className="px-5 py-3 text-left font-semibold">分派时间</th>
                      <th className="px-5 py-3 text-right font-semibold">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDispatches.map((d) => (
                      <tr key={d.id} className="hover:bg-sky-50/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs text-slate-500">{d.id}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-800">{d.bridgeName}</div>
                          {d.note && <div className="text-xs text-slate-400 mt-0.5">备注：{d.note}</div>}
                        </td>
                        <td className="px-5 py-3.5">
                          <RiskTag level={d.riskLevel} score={d.riskScore} />
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={cn(
                            'inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-lg text-sm font-bold',
                            d.priority >= 8 ? 'bg-red-100 text-red-700' : d.priority >= 5 ? 'bg-orange-100 text-orange-700' : d.priority >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600',
                          )}>
                            {d.priority}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {d.assignedVehicle ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 border border-sky-200 text-xs font-semibold">
                              <Truck className="w-3.5 h-3.5" />
                              {d.assignedVehicle}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">未指派</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={d.status} />
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500 font-mono">
                          {formatTime(d.createdAt)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <div className="relative group">
                              <button
                                type="button"
                                className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                              <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-slate-200 bg-white shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 py-1">
                                {d.status !== 'dispatched' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateDispatchStatus(d.id, 'dispatched');
                                      showToast('success', '状态已更新');
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-sky-50 flex items-center gap-2"
                                  >
                                    <Truck className="w-3.5 h-3.5 text-sky-500" />
                                    标记已派车
                                  </button>
                                )}
                                {d.status !== 'completed' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateDispatchStatus(d.id, 'completed');
                                      showToast('success', '状态已更新');
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-emerald-50 flex items-center gap-2"
                                  >
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    标记已完成
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const v = prompt('指派车辆（车牌号）：', d.assignedVehicle || '');
                                    if (v && v.trim()) {
                                      assignVehicle(d.id, v.trim());
                                      showToast('success', '车辆已更新');
                                    }
                                  }}
                                  className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                                  修改车辆
                                </button>
                                <div className="my-1 border-t border-slate-100" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`确认删除调度单 ${d.id}？`)) {
                                      deleteDispatch(d.id);
                                      showToast('success', '已删除');
                                    }
                                  }}
                                  className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  删除调度单
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredDispatches.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-6 py-16 text-center">
                          <ListChecks className="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-400" />
                          <p className="text-sm text-slate-500 mb-1">暂无调度记录</p>
                          <p className="text-xs text-slate-400">请先在「批量导入」页生成派车单</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {showDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
                  <Truck className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">生成派车单</h3>
                  <p className="text-xs text-slate-500 mt-0.5">已选 {selectedRows.length} 个高风险点位</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDispatchModal(false)}
                className="w-8 h-8 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors inline-flex items-center justify-center"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  选择指派车辆
                </label>
                {availableVehicles.length > 0 ? (
                  <div className="relative">
                    <select
                      value={dispatchVehicle}
                      onChange={(e) => setDispatchVehicle(e.target.value)}
                      className="w-full px-3 py-2.5 pr-10 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 hover:border-slate-300 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">暂不指派（待调度）</option>
                      {availableVehicles.map((v) => (
                        <option key={v.id} value={v.plate}>
                          {v.name} · {v.plate}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                ) : (
                  <div className="px-3 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs">
                    <AlertCircle className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                    当前无可用车辆，创建后状态为「待调度」
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  调度备注
                </label>
                <textarea
                  value={dispatchNote}
                  onChange={(e) => setDispatchNote(e.target.value)}
                  placeholder="例：优先处理、注意桥面阴影区、携带机械除冰设备..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 hover:border-slate-300 transition-all resize-none"
                />
              </div>

              <div className="pt-2 rounded-lg bg-slate-50 border border-slate-100 p-3 max-h-40 overflow-y-auto">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  包含点位 ({selectedRows.length})
                </div>
                <div className="space-y-1.5">
                  {selectedRows.slice(0, 6).map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 font-medium truncate">{r.bridgeName}</span>
                      {r.riskResult && <RiskTag level={r.riskResult.level} score={r.riskResult.score} />}
                    </div>
                  ))}
                  {selectedRows.length > 6 && (
                    <div className="text-xs text-slate-400 pt-1">
                      等共 {selectedRows.length} 个点位...
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDispatchModal(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all"
              >
                <X className="w-4 h-4" />
                取消
              </button>
              <button
                type="button"
                onClick={confirmDispatch}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-sm font-semibold shadow-md shadow-sky-500/20 hover:from-sky-600 hover:to-cyan-600 active:scale-[0.98] transition-all"
              >
                <Check className="w-4 h-4" />
                确认生成
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed top-6 right-6 z-[60] animate-slide-in">
          <div className={cn(
            'inline-flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-sm font-semibold',
            toast.type === 'success' && 'bg-emerald-50 border-emerald-200 text-emerald-800',
            toast.type === 'info' && 'bg-sky-50 border-sky-200 text-sky-800',
            toast.type === 'error' && 'bg-red-50 border-red-200 text-red-800',
          )}>
            {toast.type === 'success' && <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />}
            {toast.type === 'info' && <AlertCircle className="w-4.5 h-4.5 text-sky-600" />}
            {toast.type === 'error' && <AlertCircle className="w-4.5 h-4.5 text-red-600" />}
            {toast.text}
          </div>
        </div>
      )}
    </div>
  );
}
