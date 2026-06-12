import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { useIrrigationStore } from '../store/irrigationStore';
import BackfillForm from '../components/BackfillForm';
import CompareChart from '../components/CompareChart';
import WeeklySummaryCard from '../components/WeeklySummaryCard';

const HistoryPage = () => {
  const { todayDate, loadWeeklySummary, weeklySummary, refreshRecords, records } =
    useIrrigationStore((s) => ({
      todayDate: s.todayDate,
      loadWeeklySummary: s.loadWeeklySummary,
      weeklySummary: s.weeklySummary,
      refreshRecords: s.refreshRecords,
      records: s.records,
    }));

  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - weekOffset * 7);
    loadWeeklySummary(d.toISOString().slice(0, 10));
  }, [todayDate, weekOffset, loadWeeklySummary]);

  const weekStartDate = weeklySummary?.weekStart;
  const prevDisabled = weekOffset >= 52;
  const nextDisabled = weekOffset <= 0;

  return (
    <div className="min-h-screen">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-base p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-soil-400 to-soil-600 text-white flex items-center justify-center">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-greenhouse-500">历史回填与偏差分析</p>
              <h1 className="font-serif text-xl font-bold text-greenhouse-800">
                记录每一次灌溉 · 下周更精准
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => setWeekOffset((v) => Math.min(v + 1, 52))}
              disabled={prevDisabled}
              className="w-9 h-9 rounded-xl bg-greenhouse-50 text-greenhouse-700 flex items-center justify-center disabled:opacity-30 hover:bg-greenhouse-100 transition"
              title="上一周"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="px-3 py-2 rounded-xl bg-greenhouse-50 min-w-[150px] text-center">
              <p className="text-[10px] text-greenhouse-500 font-medium uppercase tracking-wide">
                {weekOffset === 0 ? '本周' : `前 ${weekOffset} 周`}
              </p>
              <p className="text-sm font-semibold text-greenhouse-800 font-mono tabular-nums">
                {weekStartDate ? weekStartDate.slice(5) + ' 起' : '—'}
              </p>
            </div>
            <button
              onClick={() => setWeekOffset((v) => Math.max(v - 1, 0))}
              disabled={nextDisabled}
              className="w-9 h-9 rounded-xl bg-greenhouse-50 text-greenhouse-700 flex items-center justify-center disabled:opacity-30 hover:bg-greenhouse-100 transition"
              title="下一周"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {records.length === 0 && weekOffset === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-base p-6 mb-6 bg-water-50/60 border-water-100"
          >
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-water-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-water-700">
                  使用小提示
                </p>
                <ol className="text-sm text-water-700/90 list-decimal list-inside space-y-1 mt-2 leading-relaxed">
                  <li>每天浇完水后，来这里把实际水量填进去。</li>
                  <li>系统会自动对比建议量，下周就能看到偏差趋势。</li>
                  <li>偏差持续偏多→建议你下次少浇点；持续偏少→多浇点。</li>
                </ol>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-5 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <BackfillForm onSaved={() => {
              refreshRecords();
              loadWeeklySummary(todayDate);
            }} />

            {weeklySummary && <WeeklySummaryCard summary={weeklySummary} />}
          </div>

          <div className="lg:col-span-3 space-y-5">
            {weeklySummary && weeklySummary.dailyRecords.length > 0 ? (
              <CompareChart summary={weeklySummary} />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card-base p-10 text-center"
              >
                <div className="w-20 h-20 mx-auto rounded-3xl bg-greenhouse-50 flex items-center justify-center mb-4">
                  <CalendarDays className="w-10 h-10 text-greenhouse-400" />
                </div>
                <h3 className="font-serif text-xl font-bold text-greenhouse-800 mb-2">
                  这周还没有估算记录
                </h3>
                <p className="text-greenhouse-600 mb-5 text-sm">
                  去数据录入页，先算一下今天的灌溉建议，保存后会自动出现在这里
                </p>
                <a
                  href="/"
                  className="inline-flex btn-primary"
                >
                  去录入数据 →
                </a>
              </motion.div>
            )}

            {weeklySummary && weeklySummary.dailyRecords.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-base p-5 overflow-x-auto"
              >
                <h3 className="font-serif text-lg font-bold text-greenhouse-800 mb-4">
                  每日明细
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-greenhouse-500 border-b border-greenhouse-100">
                      <th className="py-2 pr-4 font-medium">日期</th>
                      <th className="py-2 pr-4 font-medium">建议 (mm)</th>
                      <th className="py-2 pr-4 font-medium">实际 (mm)</th>
                      <th className="py-2 pr-4 font-medium">偏差</th>
                      <th className="py-2 pr-4 font-medium">备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklySummary.dailyRecords.map((row) => {
                      const dPct =
                        row.diff !== null && row.suggested > 0
                          ? (row.diff / row.suggested) * 100
                          : null;
                      return (
                        <tr
                          key={row.date}
                          className="border-b border-greenhouse-50 last:border-b-0 hover:bg-greenhouse-50/40"
                        >
                          <td className="py-3 pr-4 font-mono tabular-nums text-greenhouse-800">
                            {row.date.slice(5)}
                          </td>
                          <td className="py-3 pr-4 font-mono tabular-nums text-water-600">
                            {row.suggested.toFixed(1)}
                          </td>
                          <td className="py-3 pr-4 font-mono tabular-nums text-greenhouse-700">
                            {row.actual !== null ? row.actual.toFixed(1) : '—'}
                          </td>
                          <td className="py-3 pr-4">
                            {dPct === null ? (
                              <span className="text-xs text-greenhouse-400">待填</span>
                            ) : (
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
                                  Math.abs(dPct) <= 5
                                    ? 'bg-greenhouse-50 text-greenhouse-700'
                                    : dPct > 0
                                    ? 'bg-warning-50 text-warning-600'
                                    : 'bg-water-50 text-water-600'
                                }`}
                              >
                                {dPct > 0 ? '+' : ''}
                                {dPct.toFixed(0)}%
                              </span>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-greenhouse-600/80 text-xs max-w-[200px] truncate">
                            {records.find((r) => r.date === row.date)?.note ||
                              '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
