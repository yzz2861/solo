import { useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  ClipboardList,
  Calculator,
  Download,
  X,
  ChevronRight,
  AlertTriangle,
  ShieldAlert,
  Shield,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import {
  downloadPickingList,
  downloadPickingCsv,
  downloadCalculationBasis,
} from '@/utils/reportExporter';
import { CalculationReport, POSITION_LABELS, RISK_LEVEL_CONFIG, WEIGHT_UNIT_LABELS } from '@/types';
import { toKg } from '@/utils/unitConverter';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function ReportModal({
  open,
  onClose,
  report,
}: {
  open: boolean;
  onClose: () => void;
  report: CalculationReport | null;
}) {
  const buildAndSaveReport = useAppStore((s) => s.buildAndSaveReport);
  const lastReport = useAppStore((s) => s.lastReport);
  const [tab, setTab] = useState<'picking' | 'basis'>('picking');
  const [activeLayer, setActiveLayer] = useState(0);

  if (!open) return null;
  const currentReport = report || lastReport;

  const ensureReport = (): CalculationReport => {
    if (currentReport) return currentReport;
    return buildAndSaveReport();
  };

  const rpt = ensureReport();
  const { shelfConfig, layerResults, boxes, globalWarnings, calculatedAt, version, totalWeight_kg } = rpt;
  const lr = layerResults[activeLayer];
  const layerBoxes = boxes.filter((b) => b.layerIndex === activeLayer);
  const cfg = RISK_LEVEL_CONFIG[lr.riskLevel];

  const pieData = layerBoxes.map((b, i) => ({
    name: b.name,
    value: Number((toKg(b.weight, b.weightUnit) * b.quantity).toFixed(2)),
    color: PIE_COLORS[i % PIE_COLORS.length],
    id: b.id,
  }));

  const handleDownloadPicking = (asCsv: boolean) => {
    const finalReport = currentReport || buildAndSaveReport();
    if (asCsv) downloadPickingCsv(finalReport);
    else downloadPickingList(finalReport);
  };
  const handleDownloadBasis = () => {
    const finalReport = currentReport || buildAndSaveReport();
    downloadCalculationBasis(finalReport);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-800 via-blue-900 to-slate-800 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-300" />
              <h2 className="text-lg font-bold tracking-wide">报告生成中心</h2>
              <span className="px-2 py-0.5 rounded-full bg-white/15 text-[11px] font-mono border border-white/20">
                v{version}
              </span>
              {version > 1 && (
                <span className="text-[11px] text-emerald-300 flex items-center gap-0.5">
                  <ChevronRight className="w-3 h-3" /> 已覆盖 v{version - 1} 旧建议
                </span>
              )}
            </div>
            <div className="text-xs text-slate-300 mt-1">
              {shelfConfig.name} · 生成于 {formatDateTime(calculatedAt)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition text-slate-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setTab('picking')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold flex items-center gap-1.5 transition ${
                tab === 'picking' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              摆货清单
            </button>
            <button
              onClick={() => setTab('basis')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold flex items-center gap-1.5 transition ${
                tab === 'basis' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calculator className="w-4 h-4" />
              计算依据
            </button>
          </div>

          <div className="flex items-center gap-2">
            {tab === 'picking' ? (
              <>
                <button
                  onClick={() => handleDownloadPicking(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-md flex items-center gap-1.5 shadow-sm transition"
                >
                  <Download className="w-3.5 h-3.5" /> 下载 HTML 清单
                </button>
                <button
                  onClick={() => handleDownloadPicking(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-green-600 to-lime-600 hover:from-green-700 hover:to-lime-700 rounded-md flex items-center gap-1.5 shadow-sm transition"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> 导出 CSV
                </button>
              </>
            ) : (
              <button
                onClick={handleDownloadBasis}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-md flex items-center gap-1.5 shadow-sm transition"
              >
                <Download className="w-3.5 h-3.5" /> 下载主管报告 (HTML)
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'picking' ? (
            <div>
              <div className="grid grid-cols-5 gap-3 mb-5">
                <div className="col-span-5 p-4 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 text-white">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400">货架概览</div>
                  <div className="mt-2 grid grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-slate-400">名称</div>
                      <div className="text-base font-bold">{shelfConfig.name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">规格</div>
                      <div className="text-base font-bold font-mono">
                        {shelfConfig.layerCount} 层 · {shelfConfig.layerWidth_cm}×{shelfConfig.layerDepth_cm}cm
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">层板限重</div>
                      <div className="text-base font-bold font-mono">{shelfConfig.layerMaxWeight_kg} kg/层</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">总承载</div>
                      <div className="text-base font-bold font-mono text-emerald-300">
                        {totalWeight_kg.toFixed(2)} / {(shelfConfig.layerMaxWeight_kg * shelfConfig.layerCount).toFixed(0)} kg
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {globalWarnings.length > 0 && (
                <div className="mb-5 space-y-1.5">
                  {globalWarnings.slice(0, 5).map((w, i) => {
                    const map = {
                      error: 'bg-rose-50 border-rose-200 text-rose-800',
                      warning: 'bg-amber-50 border-amber-200 text-amber-800',
                      info: 'bg-sky-50 border-sky-200 text-sky-800',
                    };
                    const Ico = w.type === 'error' || w.type === 'warning' ? AlertTriangle : AlertTriangle;
                    return (
                      <div key={i} className={`flex items-center gap-2 p-2 rounded-md border text-xs ${map[w.type]}`}>
                        <Ico className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-semibold">{w.message}</span>
                        {w.detail && <span className="opacity-70">· {w.detail}</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-4">
                {layerResults.map((lr_, idx) => {
                  const cfg_ = RISK_LEVEL_CONFIG[lr_.riskLevel];
                  const lbs = boxes.filter((b) => b.layerIndex === idx);
                  return (
                    <div key={idx} className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className={`px-4 py-2.5 flex items-center justify-between ${cfg_.bg} border-b`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-lg ${cfg_.text}`}>
                            {idx + 1}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-800">第 {idx + 1} 层</div>
                            <div className="text-[11px] text-slate-500">{lbs.length} 种货物 · {lr_.boxCount} 件</div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${cfg_.text} bg-white`}>
                            {cfg_.label} · {lr_.utilizationPercent.toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-500 uppercase">总重 / 限重</div>
                          <div className="font-mono font-bold text-sm">
                            {lr_.totalWeight_kg.toFixed(2)} / {shelfConfig.layerMaxWeight_kg.toFixed(2)}
                            <span className="text-xs text-slate-400 ml-1">kg</span>
                          </div>
                          <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                            余量 {lr_.safetyMargin_kg.toFixed(2)} kg
                          </div>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600 w-10">#</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">货物名称</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600 w-24">单重</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600 w-32">尺寸(cm)</th>
                              <th className="px-3 py-2 text-center font-semibold text-slate-600 w-16">数量</th>
                              <th className="px-3 py-2 text-center font-semibold text-slate-600 w-20">位置</th>
                              <th className="px-3 py-2 text-right font-semibold text-slate-600 w-24">小计(kg)</th>
                              <th className="px-3 py-2 w-28" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {lbs.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="px-3 py-6 text-center text-slate-400">
                                  本层无需摆货
                                </td>
                              </tr>
                            ) : (
                              lbs.map((b, i) => {
                                const lineKg = toKg(b.weight, b.weightUnit) * b.quantity;
                                const pct = lr_.totalWeight_kg > 0 ? (lineKg / lr_.totalWeight_kg) * 100 : 0;
                                const isMax = lr_.maxContributor?.boxId === b.id;
                                return (
                                  <tr key={b.id} className={isMax ? 'bg-amber-50/50' : ''}>
                                    <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                                    <td className="px-3 py-2 font-semibold text-slate-800">
                                      {isMax && <span className="text-amber-600 mr-1">⭐</span>}
                                      {b.name}
                                    </td>
                                    <td className="px-3 py-2 font-mono">
                                      {b.weight} {WEIGHT_UNIT_LABELS[b.weightUnit].replace(/\(.+\)/, '')}
                                    </td>
                                    <td className="px-3 py-2 font-mono text-slate-600">
                                      {b.length_cm}×{b.width_cm}×{b.height_cm}
                                    </td>
                                    <td className="px-3 py-2 text-center font-bold">{b.quantity}</td>
                                    <td className="px-3 py-2 text-center">
                                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                                        {POSITION_LABELS[b.positionZone]}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono font-bold text-slate-800">
                                      {lineKg.toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full ${pct > 40 ? 'bg-orange-500' : 'bg-blue-500'}`}
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-stretch gap-3 mb-5">
                {layerResults.map((lr_, idx) => {
                  const cfg_ = RISK_LEVEL_CONFIG[lr_.riskLevel];
                  const active = activeLayer === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveLayer(idx)}
                      className={`flex-1 p-3 rounded-xl border-2 text-left transition ${
                        active
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${cfg_.text}`}>第 {idx + 1} 层</span>
                        {lr_.riskLevel === 'safe' ? (
                          <Shield className={`w-3.5 h-3.5 ${cfg_.text}`} />
                        ) : (
                          <ShieldAlert className={`w-3.5 h-3.5 ${cfg_.text}`} />
                        )}
                      </div>
                      <div className="mt-1 text-lg font-bold font-mono text-slate-800">
                        {lr_.utilizationPercent.toFixed(0)}
                        <span className="text-xs text-slate-400">%</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {lr_.totalWeight_kg.toFixed(1)} / {shelfConfig.layerMaxWeight_kg} kg
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="col-span-2 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-slate-800">📐 第 {activeLayer + 1} 层重量贡献分布</h4>
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${cfg.text} ${cfg.bg}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-4">
                    <div className="col-span-2 h-[220px]">
                      {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={85}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {pieData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} stroke="#fff" strokeWidth={2} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(v: number) => [`${v.toFixed(2)} kg`, '重量']}
                              contentStyle={{ fontSize: 12, borderRadius: 8 }}
                            />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                          无数据
                        </div>
                      )}
                    </div>
                    <div className="col-span-3 space-y-1.5 max-h-[220px] overflow-y-auto pr-2">
                      {pieData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-400 text-xs border-2 border-dashed rounded-xl border-slate-200">
                          空层
                        </div>
                      ) : (
                        pieData
                          .sort((a, b) => b.value - a.value)
                          .map((p, i) => {
                            const pct = lr.totalWeight_kg > 0 ? (p.value / lr.totalWeight_kg) * 100 : 0;
                            const box = layerBoxes.find((b) => b.id === p.id)!;
                            return (
                              <div
                                key={p.id}
                                className={`flex items-center gap-2 p-2 rounded-md text-xs ${
                                  lr.maxContributor?.boxId === p.id
                                    ? 'bg-amber-50 border border-amber-200'
                                    : 'bg-slate-50 border border-transparent'
                                }`}
                              >
                                <span
                                  className="w-3 h-3 rounded shrink-0"
                                  style={{ backgroundColor: p.color }}
                                />
                                <span className="text-[10px] text-slate-400 font-mono w-5">{i + 1}</span>
                                <span className="flex-1 font-semibold text-slate-700 truncate">{p.name}</span>
                                <span className="text-[10px] text-slate-500 shrink-0">
                                  {POSITION_LABELS[box.positionZone]}
                                </span>
                                <span className="text-[10px] text-slate-400 shrink-0 font-mono">×{box.quantity}</span>
                                <span className="font-mono font-bold text-slate-800 w-16 text-right shrink-0">
                                  {p.value.toFixed(2)}kg
                                </span>
                                <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden shrink-0">
                                  <div
                                    className="h-full transition-all"
                                    style={{ width: `${pct}%`, backgroundColor: p.color }}
                                  />
                                </div>
                                <span className="font-mono font-bold w-12 text-right text-[11px] text-slate-600 shrink-0">
                                  {pct.toFixed(1)}%
                                </span>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200">
                  <h4 className="text-sm font-bold text-slate-800 mb-3">📊 计算数据明细</h4>
                  <dl className="space-y-2 text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                      <dt className="text-slate-500">总重量</dt>
                      <dd className="font-mono font-bold text-slate-800">{lr.totalWeight_kg.toFixed(3)} kg</dd>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                      <dt className="text-slate-500">层板限重</dt>
                      <dd className="font-mono font-bold text-slate-800">{shelfConfig.layerMaxWeight_kg.toFixed(3)} kg</dd>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                      <dt className="text-slate-500">利用率</dt>
                      <dd className={`font-mono font-bold ${cfg.text}`}>{lr.utilizationPercent.toFixed(2)}%</dd>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                      <dt className="text-slate-500">安全余量</dt>
                      <dd className={`font-mono font-bold ${lr.safetyMargin_kg >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {lr.safetyMargin_kg.toFixed(3)} kg
                      </dd>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                      <dt className="text-slate-500">中心集中度</dt>
                      <dd className={`font-mono font-bold ${lr.centerConcentrationRatio > 60 ? 'text-amber-700' : 'text-slate-800'}`}>
                        {lr.centerConcentrationRatio.toFixed(2)}%
                      </dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-slate-500">货物件数</dt>
                      <dd className="font-mono font-bold text-slate-800">{lr.boxCount}</dd>
                    </div>
                  </dl>

                  {lr.maxContributor && (
                    <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                      <div className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider">最大贡献者</div>
                      <div className="text-sm font-bold text-amber-900 mt-0.5 truncate">
                        {lr.maxContributor.boxName}
                      </div>
                      <div className="text-[11px] font-mono text-amber-800 mt-0.5">
                        {lr.maxContributor.weight_kg.toFixed(2)} kg · {lr.maxContributor.percent.toFixed(1)}%
                      </div>
                    </div>
                  )}

                  <div className="mt-3 p-2.5 rounded-lg bg-white border border-slate-200 text-[10px] leading-relaxed text-slate-600">
                    <div className="font-semibold text-slate-700 mb-1">📐 计算公式</div>
                    <div>利用率 = 总重 ÷ 限重 × 100%</div>
                    <div>安全余量 = 限重 − 总重</div>
                    <div>中心集中度 = 中心区重量 ÷ 总重 × 100%</div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200">
                <h4 className="text-sm font-bold text-slate-800 mb-3">⚠️ 所有风险与提醒</h4>
                <div className="grid grid-cols-2 gap-2">
                  {globalWarnings.length === 0 ? (
                    <div className="col-span-2 p-4 text-center text-slate-400 text-xs bg-emerald-50/50 rounded-lg border border-dashed border-emerald-200">
                      ✅ 暂无任何风险项
                    </div>
                  ) : (
                    globalWarnings.map((w, i) => {
                      const map = {
                        error: 'bg-rose-50 border-rose-200',
                        warning: 'bg-amber-50 border-amber-200',
                        info: 'bg-sky-50 border-sky-200',
                      };
                      const textMap = {
                        error: 'text-rose-800',
                        warning: 'text-amber-800',
                        info: 'text-sky-800',
                      };
                      const labelMap = { error: '危险', warning: '警告', info: '提示' };
                      return (
                        <div key={i} className={`p-2.5 rounded-md border text-xs ${map[w.type]}`}>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`font-bold text-[10px] ${textMap[w.type]}`}>【{labelMap[w.type]}】</span>
                            <span className={`font-semibold ${textMap[w.type]}`}>{w.message}</span>
                            {w.layerIndex !== undefined && (
                              <span className="ml-auto text-[10px] font-mono bg-white/70 px-1.5 rounded">
                                第{w.layerIndex + 1}层
                              </span>
                            )}
                          </div>
                          {w.detail && <div className={`text-[11px] opacity-80 ${textMap[w.type]} mt-0.5`}>{w.detail}</div>}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
          <div>
            ※ 本报告（v{version}）覆盖此前版本的所有摆货建议。仓管如调整摆放，请重新生成报告。
          </div>
          <div className="font-mono">报告ID: {rpt.id}</div>
        </div>
      </div>
    </div>
  );
}
