import { useState } from 'react';
import {
  Warehouse,
  FileText,
  RefreshCcw,
  Scale,
  Package,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import ShelfConfigForm from '@/components/ShelfConfigForm';
import BoxInputForm from '@/components/BoxInputForm';
import LayerVisualization from '@/components/LayerVisualization';
import WarningList from '@/components/WarningList';
import ReportModal from '@/components/ReportModal';
import { useAppStore } from '@/store/useAppStore';
import { CalculationReport } from '@/types';
import { calculateTotalWeight } from '@/utils/calculator';

export default function Workbench() {
  const buildReport = useAppStore((s) => s.buildAndSaveReport);
  const lastReport = useAppStore((s) => s.lastReport);
  const layerResults = useAppStore((s) => s.layerResults);
  const boxes = useAppStore((s) => s.boxes);
  const warnings = useAppStore((s) => s.warnings);
  const shelf = useAppStore((s) => s.shelf);
  const recalculate = useAppStore((s) => s.recalculate);

  const totalBoxes = boxes.reduce((sum, b) => sum + b.quantity, 0);
  const totalWeight_kg = calculateTotalWeight(boxes);
  const summary = {
    totalBoxes,
    totalWeight_kg,
    dangerousLayers: layerResults.filter((l) => l.riskLevel === 'danger').length,
    warningLayers: layerResults.filter((l) => l.riskLevel === 'warning').length,
  };

  const [reportOpen, setReportOpen] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<CalculationReport | null>(null);

  const handleGenerateReport = () => {
    const rpt = buildReport();
    setGeneratedReport(rpt);
    setReportOpen(true);
  };

  const dangerousCnt = warnings.filter((w) => w.type === 'error').length;
  const warningCnt = warnings.filter((w) => w.type === 'warning').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-100">
      <header className="sticky top-0 z-40 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white shadow-lg border-b border-slate-700">
        <div className="max-w-[1600px] mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 border border-blue-400/30">
              <Warehouse className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-none">
                货架层板承重分配计算器
                <span className="ml-2 align-middle text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-blue-200">
                  v1.0
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                实时估算承重分布 · 识别局部压弯风险 · 生成摆货清单与计算依据
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="hidden md:flex items-center gap-5 text-xs">
              <div className="text-center">
                <div className="text-slate-400 text-[10px] uppercase tracking-wider">货物件数</div>
                <div className="text-sm font-bold font-mono text-blue-200 flex items-center justify-center gap-1">
                  <Package className="w-3 h-3" />
                  {summary.totalBoxes}
                </div>
              </div>
              <div className="text-center">
                <div className="text-slate-400 text-[10px] uppercase tracking-wider">总承重</div>
                <div className="text-sm font-bold font-mono text-emerald-300 flex items-center justify-center gap-1">
                  <Scale className="w-3 h-3" />
                  {summary.totalWeight_kg.toFixed(1)}
                  <span className="text-[10px] text-slate-400">kg</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-slate-400 text-[10px] uppercase tracking-wider">超限层</div>
                <div
                  className={`text-sm font-bold font-mono flex items-center justify-center gap-1 ${
                    summary.dangerousLayers > 0 ? 'text-rose-300' : 'text-slate-300'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  {summary.dangerousLayers}
                  {summary.warningLayers > 0 && (
                    <span className="text-[10px] text-amber-300 ml-0.5">(+{summary.warningLayers})</span>
                  )}
                </div>
              </div>
            </div>

            <div className="h-8 w-px bg-white/15" />

            <div className="flex items-center gap-2">
              <button
                onClick={recalculate}
                className="px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 rounded-lg flex items-center gap-1.5 transition"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                重新计算
              </button>
              <button
                onClick={handleGenerateReport}
                className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 rounded-lg shadow-lg shadow-emerald-500/30 flex items-center gap-1.5 transition"
              >
                <FileText className="w-4 h-4" />
                生成报告
                <Sparkles className="w-3 h-3 opacity-80" />
              </button>
            </div>
          </div>
        </div>

        {(dangerousCnt > 0 || warningCnt > 0) && (
          <div className="border-t border-slate-700/60 bg-gradient-to-r from-rose-950/40 via-slate-900 to-amber-950/30 px-6 py-1.5">
            <div className="max-w-[1600px] mx-auto flex items-center gap-4 text-[11px]">
              {dangerousCnt > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold text-rose-300">
                  <AlertTriangle className="w-3 h-3" />
                  {dangerousCnt} 项危险
                </span>
              )}
              {warningCnt > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
                  <AlertTriangle className="w-3 h-3" />
                  {warningCnt} 项警告
                </span>
              )}
              <span className="text-slate-400">
                — 请立即处理超限层和重货集中风险，调整后重新生成报告
              </span>
              <button
                onClick={handleGenerateReport}
                className="ml-auto underline text-blue-300 hover:text-blue-200"
              >
                查看详情 →
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-5">
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-12 lg:col-span-4 space-y-5">
            <ShelfConfigForm />
            <WarningList />
          </div>

          <div className="col-span-12 lg:col-span-4">
            <BoxInputForm />
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-5">
            <LayerVisualization />

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg border border-blue-500/30">
                <div className="text-[10px] uppercase tracking-wider text-blue-200 mb-1">已录入货物</div>
                <div className="text-2xl font-bold font-mono">{boxes.length}</div>
                <div className="text-[11px] text-blue-200 mt-1">
                  共 {summary.totalBoxes} 件 · {shelf.layerCount} 层
                </div>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg border border-emerald-500/30">
                <div className="text-[10px] uppercase tracking-wider text-emerald-200 mb-1">剩余承重</div>
                <div className="text-2xl font-bold font-mono">
                  {(shelf.layerMaxWeight_kg * shelf.layerCount - summary.totalWeight_kg).toFixed(0)}
                  <span className="text-sm font-normal ml-0.5">kg</span>
                </div>
                <div className="text-[11px] text-emerald-200 mt-1">
                  已用 {summary.totalBoxes > 0
                    ? ((summary.totalWeight_kg / (shelf.layerMaxWeight_kg * shelf.layerCount)) * 100).toFixed(1)
                    : '0'}% 总容量
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                风险速览
              </h4>
              <div className="space-y-2">
                {layerResults.map((lr, i) => {
                  const map = {
                    safe: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    warning: 'bg-amber-50 text-amber-700 border-amber-200',
                    danger: 'bg-rose-50 text-rose-700 border-rose-200',
                  };
                  const label = { safe: '安全', warning: '警告', danger: '超限' };
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2 p-2 rounded-md border text-xs ${map[lr.riskLevel]}`}
                    >
                      <span className="font-mono font-bold w-7 text-center">L{i + 1}</span>
                      <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            lr.riskLevel === 'safe'
                              ? 'bg-emerald-500'
                              : lr.riskLevel === 'warning'
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(lr.utilizationPercent, 100)}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold w-20 text-right shrink-0">
                        {lr.utilizationPercent.toFixed(0)}%
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${map[lr.riskLevel]}`}
                      >
                        {label[lr.riskLevel]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-10 pt-5 border-t border-slate-200/60 text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-3">
          <div>
            货架层板承重分配计算器 · 所有数据本地存储（浏览器 LocalStorage）
          </div>
          <div className="flex items-center gap-4">
            <span>单位换算：1斤=0.5kg，1磅=0.4536kg</span>
            <span>风险阈值：≥100%超限 / 80%~100%警告 / {'<'}80%安全</span>
            {lastReport && (
              <span className="font-mono text-blue-500">
                上次报告 v{lastReport.version} · {new Date(lastReport.calculatedAt).toLocaleString('zh-CN')}
              </span>
            )}
          </div>
        </footer>
      </main>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        report={generatedReport}
      />
    </div>
  );
}
