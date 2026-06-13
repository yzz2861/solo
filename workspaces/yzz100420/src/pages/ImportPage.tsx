import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileJson,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Flame,
  Thermometer,
  Play,
  Clock,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  Palette,
  Download,
  FileUp,
} from 'lucide-react';
import { useFiringStore } from '../store/firingStore';
import { parseKilnCSV, parseKilnJSON, PRESET_PLANS, type PresetPlan } from '../utils/dataParser';
import { buildCompleteRecord, generateId, formatHours, formatTemp } from '../utils/curveCalc';
import type {
  FiringPlan,
  GlazeRecipe,
  StudentWork,
  TemperaturePoint,
  TemperatureUnit,
  WorkBatch,
  PlanSegment,
  SpecialEvent,
  SegmentType,
  ColorDeviation,
} from '../types';
import { generateSampleRecord } from '../utils/sampleData';
import { cn } from '../lib/utils';
import Papa from 'papaparse';

const ImportPage = () => {
  const navigate = useNavigate();
  const { addRecord, records } = useFiringStore();

  const [step, setStep] = useState(1);
  const [parsedPoints, setParsedPoints] = useState<TemperaturePoint[]>([]);
  const [parsedUnit, setParsedUnit] = useState<TemperatureUnit>('C');
  const [parseInfo, setParseInfo] = useState<any>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName] = useState('');

  const [recordName, setRecordName] = useState(
    `${new Date().toLocaleDateString('zh-CN')} 釉烧第${records.length + 1}窑`,
  );
  const [selectedPlanIdx, setSelectedPlanIdx] = useState(0);
  const [customPlan, setCustomPlan] = useState<FiringPlan | null>(null);
  const [planExpanded, setPlanExpanded] = useState(true);
  const usePreset = !customPlan;
  const activePlan = usePreset ? PRESET_PLANS[selectedPlanIdx].plan : customPlan!;

  const [batches, setBatches] = useState<WorkBatch[]>([
    {
      id: generateId(),
      name: '第一批次',
      shelfPosition: 'A-B层',
      works: [],
    },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setIsParsing(true);
    setFileName(file.name);
    setWarnings([]);
    try {
      let result;
      if (file.name.toLowerCase().endsWith('.csv')) {
        result = await parseKilnCSV(file);
      } else if (file.name.toLowerCase().endsWith('.json')) {
        result = await parseKilnJSON(file);
      } else {
        throw new Error('仅支持 CSV 或 JSON 格式的窑炉日志文件');
      }
      setParsedPoints(result.points);
      setParsedUnit(result.unit);
      setParseInfo(result.info);
      setWarnings(result.warnings);
      if (step === 1) setStep(2);
    } catch (err: any) {
      setWarnings([err.message || '文件解析失败，请检查格式']);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const handleUseSample = () => {
    const sample = generateSampleRecord();
    addRecord(sample);
    navigate(`/analysis/${sample.id}`);
  };

  const updateWork = (batchIdx: number, workIdx: number, work: Partial<StudentWork>) => {
    setBatches((prev) =>
      prev.map((b, bi) =>
        bi !== batchIdx
          ? b
          : {
              ...b,
              works: b.works.map((w, wi) => (wi !== workIdx ? w : { ...w, ...work })),
            },
      ),
    );
  };

  const addWork = (batchIdx: number) => {
    setBatches((prev) =>
      prev.map((b, bi) =>
        bi !== batchIdx
          ? b
          : {
              ...b,
              works: [
                ...b.works,
                {
                  id: generateId(),
                  studentName: '',
                  workName: '',
                  glaze: {
                    id: generateId(),
                    name: '',
                    ingredients: [],
                    firingTemp: 1240,
                    notes: '',
                  },
                  expectedColor: '',
                  actualColor: '',
                  colorDeviation: 'good',
                  notes: '',
                  relatedSegmentIds: [],
                  relatedEventIds: [],
                  impactExplanation: '',
                  shelfPosition: b.shelfPosition,
                } as StudentWork,
              ],
            },
      ),
    );
  };

  const removeWork = (batchIdx: number, workIdx: number) => {
    setBatches((prev) =>
      prev.map((b, bi) =>
        bi !== batchIdx ? b : { ...b, works: b.works.filter((_, i) => i !== workIdx) },
      ),
    );
  };

  const handleComplete = () => {
    if (parsedPoints.length < 10) {
      alert('请先导入有效的窑炉日志数据');
      return;
    }
    const record = buildCompleteRecord(recordName, parsedPoints, {
      ...activePlan,
      id: generateId(),
      segments: activePlan.segments.map((s) => ({ ...s, id: s.id || generateId() })),
    }, parsedUnit);
    record.batches = batches;
    addRecord(record);
    navigate(`/analysis/${record.id}`);
  };

  const StepBadge = ({ n, active, done }: { n: number; active: boolean; done: boolean }) => (
    <div
      className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
        done
          ? 'bg-gradient-to-br from-emerald-400 to-green-600 text-white shadow-md'
          : active
            ? 'bg-kiln-gradient text-white shadow-warm scale-110'
            : 'bg-kiln-100 text-kiln-500',
      )}
    >
      {done ? <CheckCircle2 className="w-4 h-4" /> : n}
    </div>
  );

  const glazeOptions = ['天青釉', '天目釉', '钧窑月白', '酱黄釉', '汝窑天蓝', '青瓷釉', '白瓷釉', '透明釉'];
  const deviationOptions: { v: StudentWork['colorDeviation']; label: string; cls: string }[] = [
    { v: 'excellent', label: '✨ 极佳', cls: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
    { v: 'good', label: '✅ 正常', cls: 'bg-blue-100 text-blue-700 border-blue-300' },
    { v: 'slight', label: '⚠️ 微偏', cls: 'bg-amber-100 text-amber-700 border-amber-300' },
    { v: 'significant', label: '🔥 明显偏差', cls: 'bg-orange-100 text-orange-700 border-orange-300' },
    { v: 'failed', label: '❌ 失败', cls: 'bg-red-100 text-red-700 border-red-300' },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-gradient-fire">
            数据导入中心
          </h1>
          <p className="mt-1 text-sm text-kiln-600">
            三步完成窑次创建：导入日志 → 选择曲线 → 录入作品
          </p>
        </div>
        <button className="btn btn-secondary" onClick={handleUseSample}>
          <Sparkles className="w-4 h-4 text-amber-500" />
          使用示例数据体验
        </button>
      </div>

      <div className="card p-5 flex items-center gap-4 md:gap-8 flex-wrap">
        {[
          { n: 1, label: '导入窑炉日志', sub: 'CSV/JSON 温度记录' },
          { n: 2, label: '配置保温计划', sub: '目标曲线参数' },
          { n: 3, label: '录入作品批次', sub: '学生与釉料信息' },
        ].map((s, i, arr) => (
          <div key={s.n} className="flex items-center gap-3 flex-1 min-w-[200px]">
            <StepBadge n={s.n} active={step === s.n} done={step > s.n} />
            <div>
              <p
                className={cn(
                  'text-sm font-bold',
                  step >= s.n ? 'text-kiln-800' : 'text-kiln-400',
                )}
              >
                {s.label}
              </p>
              <p className="text-[11px] text-kiln-500">{s.sub}</p>
            </div>
            {i < arr.length - 1 && (
              <div className="hidden md:block flex-1 h-0.5 bg-gradient-to-r from-kiln-200 via-kiln-300 to-kiln-200 mx-2" />
            )}
          </div>
        ))}
      </div>

      {/* STEP 1: 日志导入 */}
      <div className={cn('card p-6', step < 1 && 'opacity-60')}>
        <h2 className="text-lg font-display font-bold text-kiln-800 mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-fire-500" />
          Step 1 · 导入窑炉温度日志
        </h2>

        <div
          className="relative border-2 border-dashed rounded-2xl p-8 md:p-12 text-center transition-all cursor-pointer group hover:border-fire-400 hover:bg-fire-50/40"
          style={{
            borderColor: parsedPoints.length > 0 ? '#10B981' : undefined,
            background: parsedPoints.length > 0 ? 'rgba(16, 185, 129, 0.04)' : undefined,
          }}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {isParsing ? (
            <div className="animate-pulse">
              <Upload className="w-12 h-12 text-fire-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-fire-700">正在解析文件...</p>
            </div>
          ) : parsedPoints.length > 0 ? (
            <div>
              <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
              <p className="text-base font-bold text-emerald-700 mb-1">解析成功！</p>
              <p className="text-sm text-kiln-600 mb-3">{fileName}</p>
              <div className="inline-grid grid-cols-2 md:grid-cols-4 gap-3 text-left bg-white/60 rounded-xl p-4 border border-emerald-100">
                <div>
                  <p className="text-[10px] text-kiln-500 uppercase font-medium">数据点</p>
                  <p className="text-base font-bold font-mono text-kiln-800">{parseInfo?.validPoints}</p>
                </div>
                <div>
                  <p className="text-[10px] text-kiln-500 uppercase font-medium">总时长</p>
                  <p className="text-base font-bold font-mono text-kiln-800">
                    {formatHours(parseInfo?.timeSpanHours || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-kiln-500 uppercase font-medium">温度范围</p>
                  <p className="text-base font-bold font-mono text-fire-700">
                    {formatTemp(parseInfo?.minTemp ?? 0, parsedUnit, false)} ~{' '}
                    {formatTemp(parseInfo?.maxTemp ?? 0, parsedUnit)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-kiln-500 uppercase font-medium">采样间隔</p>
                  <p className="text-base font-bold font-mono text-kiln-800">
                    {parseInfo?.avgIntervalMinutes?.toFixed(1)} 分钟
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-kiln-400">点击此处可重新选择文件</p>
            </div>
          ) : (
            <div>
              <div className="w-16 h-16 rounded-2xl bg-fire-100 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8 text-fire-500" />
              </div>
              <p className="text-base font-bold text-kiln-800 mb-1">点击或拖拽窑炉日志文件到此处</p>
              <p className="text-xs text-kiln-500 mb-3">支持 CSV / JSON 格式，自动识别时间戳和温度列</p>
              <div className="flex items-center justify-center gap-2 text-[11px]">
                <span className="badge bg-kiln-100 text-kiln-600 border-kiln-200">
                  <FileSpreadsheet className="w-3 h-3" /> .csv
                </span>
                <span className="badge bg-kiln-100 text-kiln-600 border-kiln-200">
                  <FileJson className="w-3 h-3" /> .json
                </span>
              </div>
            </div>
          )}
        </div>

        {warnings.length > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-amber-800">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
                {w}
              </div>
            ))}
          </div>
        )}

        {parsedPoints.length > 0 && (
          <div className="mt-5 flex justify-end">
            <button className="btn btn-primary" onClick={() => setStep(2)}>
              下一步：配置保温计划 <Play className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* STEP 2: 保温计划 */}
      <div className={cn('card p-6', step < 2 && 'opacity-60')}>
        <div
          className="flex items-center justify-between mb-4 cursor-pointer"
          onClick={() => setPlanExpanded(!planExpanded)}
        >
          <h2 className="text-lg font-display font-bold text-kiln-800 flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-amber-500" />
            Step 2 · 配置保温计划（目标曲线）
          </h2>
          {planExpanded ? <ChevronUp className="w-5 h-5 text-kiln-500" /> : <ChevronDown className="w-5 h-5 text-kiln-500" />}
        </div>

        {planExpanded && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">窑次名称</label>
                <input
                  className="input"
                  value={recordName}
                  onChange={(e) => setRecordName(e.target.value)}
                  disabled={step < 2}
                />
              </div>
              <div>
                <label className="label">曲线模板</label>
                <select
                  className="input"
                  value={selectedPlanIdx}
                  onChange={(e) => {
                    setSelectedPlanIdx(Number(e.target.value));
                    setCustomPlan(null);
                  }}
                  disabled={step < 2}
                >
                  {PRESET_PLANS.map((p, i) => (
                    <option key={i} value={i}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-kiln-100 overflow-hidden bg-white/60">
              <div className="px-4 py-3 bg-gradient-to-r from-fire-50 to-amber-50 border-b border-kiln-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-kiln-800 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-fire-500" />
                    {activePlan.name}
                  </p>
                  <p className="text-[11px] text-kiln-500 mt-0.5">{activePlan.description}</p>
                </div>
                <span className="badge bg-fire-100 text-fire-700 border-fire-200">
                  {activePlan.segments.length} 个控温段
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-kiln-50 text-[11px] text-kiln-600 uppercase">
                      <th className="px-4 py-2.5 text-left font-medium">阶段</th>
                      <th className="px-4 py-2.5 text-left font-medium">名称</th>
                      <th className="px-4 py-2.5 text-right font-medium">开始</th>
                      <th className="px-4 py-2.5 text-right font-medium">结束</th>
                      <th className="px-4 py-2.5 text-right font-medium">温度变化</th>
                      <th className="px-4 py-2.5 text-right font-medium">时长</th>
                      <th className="px-4 py-2.5 text-right font-medium">速率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePlan.segments.map((seg, i) => (
                      <tr key={seg.id} className="border-t border-kiln-50 hover:bg-kiln-50/50">
                        <td className="px-4 py-2.5">
                          <span
                            className={cn(
                              'badge',
                              seg.type === 'heating' && 'bg-fire-100 text-fire-700 border-fire-200',
                              seg.type === 'holding' && 'bg-amber-100 text-amber-700 border-amber-200',
                              seg.type === 'cooling' && 'bg-blue-100 text-blue-700 border-blue-200',
                            )}
                          >
                            {seg.type === 'heating' && <Flame className="w-3 h-3" />}
                            {seg.type === 'holding' && <Clock className="w-3 h-3" />}
                            {seg.type === 'cooling' && <Thermometer className="w-3 h-3" />}
                            {seg.type === 'heating' ? '升温' : seg.type === 'holding' ? '保温' : '降温'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-medium text-kiln-800">{seg.name}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-kiln-700">T+{seg.startTime}h</td>
                        <td className="px-4 py-2.5 text-right font-mono text-kiln-700">T+{seg.endTime}h</td>
                        <td className="px-4 py-2.5 text-right font-mono text-fire-700">
                          {seg.startTemp} → {seg.endTemp}℃
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-kiln-600">
                          {(seg.endTime - seg.startTime).toFixed(1)}h
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-kiln-700">
                          {seg.rate ? `${seg.rate > 0 ? '+' : ''}${seg.rate}` : '0'}
                          <span className="text-[10px] text-kiln-400">℃/h</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                className="btn btn-primary"
                onClick={() => setStep(3)}
                disabled={step < 2}
              >
                下一步：录入作品批次 <Play className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* STEP 3: 作品批次 */}
      <div className={cn('card p-6', step < 3 && 'opacity-60')}>
        <h2 className="text-lg font-display font-bold text-kiln-800 mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-clay-600" />
          Step 3 · 录入作品批次信息
        </h2>

        <div className="space-y-5">
          {batches.map((batch, batchIdx) => (
            <div key={batch.id} className="rounded-2xl border border-kiln-100 overflow-hidden bg-gradient-to-br from-white/80 to-clay-50/50">
              <div className="px-5 py-3 border-b border-kiln-100 bg-white/70 flex flex-wrap items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-clay-500 text-white flex items-center justify-center shadow-md">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <input
                      className="bg-transparent border-0 border-b border-transparent focus:border-kiln-300 focus:outline-none text-sm font-bold text-kiln-800 font-display p-0"
                      value={batch.name}
                      onChange={(e) =>
                        setBatches((prev) =>
                          prev.map((b, i) => (i === batchIdx ? { ...b, name: e.target.value } : b)),
                        )
                      }
                      disabled={step < 3}
                    />
                    <div className="flex items-center gap-2 mt-0.5">
                      <label className="text-[10px] text-kiln-500">窑位</label>
                      <input
                        className="bg-white/60 rounded px-1.5 py-0.5 text-[11px] border border-kiln-200 focus:outline-none focus:border-fire-400 w-24"
                        value={batch.shelfPosition}
                        onChange={(e) =>
                          setBatches((prev) =>
                            prev.map((b, i) => (i === batchIdx ? { ...b, shelfPosition: e.target.value } : b)),
                          )
                        }
                        disabled={step < 3}
                      />
                      <span className="text-[10px] text-kiln-400">
                        {batch.works.length} 件作品
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-secondary !py-1.5 !px-3 text-xs"
                  onClick={() => addWork(batchIdx)}
                  disabled={step < 3}
                >
                  <Plus className="w-3.5 h-3.5" /> 添加作品
                </button>
              </div>

              <div className="p-4 space-y-3">
                {batch.works.length === 0 ? (
                  <div className="py-8 text-center text-kiln-400">
                    <Palette className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无作品，点击右上角「添加作品」</p>
                  </div>
                ) : (
                  batch.works.map((work, workIdx) => (
                    <div
                      key={work.id}
                      className="p-4 rounded-xl bg-white/70 border border-kiln-100 relative group hover:shadow-card transition-shadow"
                    >
                      <button
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-kiln-400 hover:text-red-500 transition-all"
                        onClick={() => removeWork(batchIdx, workIdx)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pr-8">
                        <div>
                          <label className="label">学生姓名</label>
                          <input
                            className="input"
                            placeholder="如：林雨欣"
                            value={work.studentName}
                            onChange={(e) =>
                              updateWork(batchIdx, workIdx, { studentName: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className="label">作品名称</label>
                          <input
                            className="input"
                            placeholder="如：荷叶边茶盏"
                            value={work.workName}
                            onChange={(e) =>
                              updateWork(batchIdx, workIdx, { workName: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className="label">釉料配方</label>
                          <select
                            className="input"
                            value={work.glaze.name}
                            onChange={(e) =>
                              updateWork(batchIdx, workIdx, {
                                glaze: { ...work.glaze, name: e.target.value },
                              })
                            }
                          >
                            <option value="">选择釉料...</option>
                            {glazeOptions.map((g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="label">釉色效果</label>
                          <div className="flex flex-wrap gap-1.5">
                            {deviationOptions.map((o) => (
                              <button
                                key={o.v}
                                className={cn(
                                  'px-2 py-1 rounded-lg border text-[11px] font-medium transition-all',
                                  work.colorDeviation === o.v
                                    ? o.cls + ' shadow-sm'
                                    : 'bg-white text-kiln-500 border-kiln-200 hover:border-kiln-300',
                                )}
                                onClick={() =>
                                  updateWork(batchIdx, workIdx, { colorDeviation: o.v })
                                }
                              >
                                {o.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="label">预期釉色</label>
                          <input
                            className="input"
                            placeholder="描述期望达到的釉色效果"
                            value={work.expectedColor}
                            onChange={(e) =>
                              updateWork(batchIdx, workIdx, { expectedColor: e.target.value })
                            }
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="label">实际釉色（开窑后）</label>
                          <input
                            className="input"
                            placeholder="实际出窑后的颜色和效果描述"
                            value={work.actualColor}
                            onChange={(e) =>
                              updateWork(batchIdx, workIdx, { actualColor: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center pt-2">
            <button
              className="btn btn-secondary"
              onClick={() =>
                setBatches((p) => [
                  ...p,
                  {
                    id: generateId(),
                    name: `第${p.length + 1}批次`,
                    shelfPosition: '',
                    works: [],
                  },
                ])
              }
              disabled={step < 3}
            >
              <Layers className="w-4 h-4" /> 新增批次
            </button>

            <div className="flex gap-2">
              <button className="btn btn-secondary" onClick={() => setStep(Math.max(1, step - 1))}>
                返回上一步
              </button>
              <button className="btn btn-primary" onClick={handleComplete} disabled={step < 3}>
                <Flame className="w-4 h-4" />
                完成创建，开始分析
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportPage;
