import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { todayStr } from '@/utils/dateUtils';
import {
  aggregateCost,
  aggregateAnomalies,
  exportCostCsv,
  exportAnomalyCsv,
  downloadCsv,
  type CostRow,
  type AnomalyRow,
} from '@/utils/csvExporter';

export const ExportPage = () => {
  const { orders, flowers, selectedDate } = useAppStore();
  const [date, setDate] = useState(selectedDate || todayStr());

  const costRows: CostRow[] = aggregateCost(orders, flowers, date);
  const anomalyRows: AnomalyRow[] = aggregateAnomalies(orders, date);
  const totalCost = costRows.reduce((s, r) => s + r.小计, 0);
  const totalOrders = orders.filter(o => o.date === date).length;

  const handleExportCost = () => {
    const csv = exportCostCsv(costRows, date);
    downloadCsv(csv, `婚车成本明细_${date}.csv`);
  };

  const handleExportAnomaly = () => {
    const csv = exportAnomalyCsv(anomalyRows, date);
    downloadCsv(csv, `婚车异常记录_${date}.csv`);
  };

  const handleExportAll = () => {
    handleExportCost();
    setTimeout(handleExportAnomaly, 300);
  };

  return (
    <div className="min-h-screen bg-cream-100">
      <div className="sticky top-0 z-30 px-5 h-14 bg-white/90 backdrop-blur border-b border-cream-200 flex items-center justify-between no-print">
        <Link to="/" className="btn btn-ghost">
          <ArrowLeft className="w-4 h-4" />
          返回工作台
        </Link>
        <div className="text-sm font-serif font-semibold text-coffee-700">数据导出中心</div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-cream-200 shadow-soft">
            <Calendar className="w-4 h-4 text-gold-500" />
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="bg-transparent text-sm text-coffee-700 font-medium outline-none cursor-pointer"
            />
          </div>
          <button onClick={handleExportAll} className="btn btn-primary">
            <Download className="w-4 h-4" />
            一键导出全部
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-5 py-8 space-y-8">
        {/* 汇总卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '当日订单', value: totalOrders, color: 'text-coffee-700' },
            { label: '成本总计', value: `¥${totalCost}`, color: 'text-gold-600' },
            { label: '花材种类', value: costRows.length, color: 'text-sage-600' },
            { label: '异常记录', value: anomalyRows.length, color: anomalyRows.length > 0 ? 'text-danger-600' : 'text-sage-600' },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <div className={`text-3xl font-bold font-serif ${s.color}`}>{s.value}</div>
              <div className="text-xs text-coffee-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* 成本明细 */}
        <section className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-cream-200 bg-gradient-to-r from-gold-400/10 to-cream-50 flex items-center justify-between">
            <h3 className="font-serif font-semibold text-coffee-700 text-lg flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-gold-500" />
              当日成本明细
            </h3>
            <button onClick={handleExportCost} className="btn btn-secondary !py-1.5 !text-xs">
              <Download className="w-3.5 h-3.5" /> 导出CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream-100 text-coffee-600 text-xs">
                  <th className="px-4 py-3 text-left">分类</th>
                  <th className="px-4 py-3 text-left">花材</th>
                  <th className="px-4 py-3 text-right">用量</th>
                  <th className="px-4 py-3 text-left">单位</th>
                  <th className="px-4 py-3 text-right">单价(¥)</th>
                  <th className="px-4 py-3 text-right">小计(¥)</th>
                  <th className="px-4 py-3 w-32 text-left">用量占比</th>
                </tr>
              </thead>
              <tbody>
                {costRows.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-16 text-coffee-400">当日无数据</td></tr>
                ) : costRows.map((r, i) => {
                  const maxQty = Math.max(...costRows.map(x => x.用量), 1);
                  return (
                    <tr key={i} className="border-t border-cream-200 hover:bg-cream-50/50">
                      <td className="px-4 py-2.5">
                        <span className="tag tag-pending">{r.分类}</span>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-coffee-700">{r.花材}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-coffee-700">{r.用量}</td>
                      <td className="px-4 py-2.5 text-coffee-500">{r.单位}</td>
                      <td className="px-4 py-2.5 text-right text-coffee-500">{r.单价.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-gold-600">{r.小计.toFixed(2)}</td>
                      <td className="px-4 py-2.5">
                        <div className="h-2 bg-cream-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-rose-300 to-gold-500 rounded-full"
                            style={{ width: `${(r.用量 / maxQty) * 100}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {costRows.length > 0 && (
                  <tr className="border-t-2 border-gold-400/50 bg-gold-400/5">
                    <td colSpan={5} className="px-4 py-3 text-right font-bold text-coffee-700">合 计</td>
                    <td className="px-4 py-3 text-right text-xl font-bold text-gold-600 font-serif">
                      ¥{totalCost.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 异常记录 */}
        <section className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-cream-200 bg-gradient-to-r from-danger-500/8 to-amber-500/8 flex items-center justify-between">
            <h3 className="font-serif font-semibold text-coffee-700 text-lg flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${anomalyRows.length > 0 ? 'text-amber-500' : 'text-sage-500'}`} />
              当日异常记录
              <span className={anomalyRows.length > 0 ? 'tag tag-danger' : 'tag tag-done'}>
                {anomalyRows.length} 条
              </span>
            </h3>
            <button
              onClick={handleExportAnomaly}
              className="btn btn-secondary !py-1.5 !text-xs"
              disabled={anomalyRows.length === 0}
            >
              <Download className="w-3.5 h-3.5" /> 导出CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream-100 text-coffee-600 text-xs">
                  <th className="px-4 py-3 text-left w-10">#</th>
                  <th className="px-4 py-3 text-left">新人</th>
                  <th className="px-4 py-3 text-left">车牌</th>
                  <th className="px-4 py-3 text-left">到店时间</th>
                  <th className="px-4 py-3 text-left">异常类型</th>
                  <th className="px-4 py-3 text-left">详细备注</th>
                </tr>
              </thead>
              <tbody>
                {anomalyRows.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-16 text-sage-600">
                    ✨ 当日无异常记录，一切顺利！
                  </td></tr>
                ) : anomalyRows.map((r, i) => (
                  <tr key={i} className="border-t border-cream-200 hover:bg-cream-50/50">
                    <td className="px-4 py-2.5 text-coffee-400 font-serif">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-coffee-700">{r.新人}</td>
                    <td className="px-4 py-2.5 font-mono font-bold text-coffee-800">{r.车牌}</td>
                    <td className="px-4 py-2.5 text-coffee-600">{r.到店时间}</td>
                    <td className="px-4 py-2.5">
                      <span className={r.异常类型.includes('司机') ? 'tag tag-danger' : 'tag tag-warning'}>
                        {r.异常类型}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-coffee-600">{r.备注}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};
