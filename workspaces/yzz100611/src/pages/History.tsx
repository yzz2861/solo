import { useEffect, useState } from 'react';
import { ArrowLeft, Trash2, History as HistoryIcon, Leaf, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCalculatorStore } from '@/store/useCalculatorStore';
import HistoryRecordCard from '@/components/HistoryRecordCard';
import { formatEc } from '@/utils/unitConverter';
import { ecToMs } from '@/utils/unitConverter';

export default function History() {
  const { history, loadHistory, deleteRecord, clearHistory } = useCalculatorStore();
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleClear = () => {
    if (showConfirm) {
      clearHistory();
      setShowConfirm(false);
    } else {
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 3000);
    }
  };

  const getTrend = () => {
    if (history.length < 2) return null;

    const recent = history.slice(0, 7);
    if (recent.length < 2) return null;

    const firstEc = ecToMs(recent[recent.length - 1].input.currentEc, recent[recent.length - 1].input.currentEcUnit);
    const lastEc = ecToMs(recent[0].result.finalEc, recent[0].result.finalEcUnit);

    const diff = lastEc - firstEc;

    if (Math.abs(diff) < 0.05) {
      return { direction: 'stable', value: diff, label: '稳定' };
    } else if (diff > 0) {
      return { direction: 'up', value: diff, label: '上升' };
    } else {
      return { direction: 'down', value: diff, label: '下降' };
    }
  };

  const trend = getTrend();

  const groupedByDate = history.reduce((acc, record) => {
    const date = record.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(record);
    return acc;
  }, {} as Record<string, typeof history>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-green-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors">
            <ArrowLeft size={20} />
            <span>返回</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-md">
              <Leaf className="text-white" size={20} />
            </div>
            <h1 className="text-lg font-bold text-gray-800">历史记录</h1>
          </div>
          <button
            onClick={handleClear}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showConfirm
                ? 'bg-red-500 text-white'
                : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
            }`}
          >
            <Trash2 size={18} />
            <span className="hidden sm:inline">{showConfirm ? '确认清空' : '清空'}</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {history.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500 mb-1">总记录数</p>
              <p className="text-2xl font-bold text-gray-800">{history.length}</p>
            </div>

            {trend && (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">近期趋势</p>
                <div className="flex items-center gap-2">
                  {trend.direction === 'up' && (
                    <TrendingUp size={20} className="text-green-500" />
                  )}
                  {trend.direction === 'down' && (
                    <TrendingDown size={20} className="text-blue-500" />
                  )}
                  {trend.direction === 'stable' && (
                    <Minus size={20} className="text-gray-400" />
                  )}
                  <span className="text-lg font-bold text-gray-800">{trend.label}</span>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500 mb-1">最新EC</p>
              <p className="text-2xl font-bold text-green-600">
                {history.length > 0
                  ? formatEc(history[0].result.finalEc, history[0].result.finalEcUnit, 2)
                  : '-'}
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500 mb-1">记录天数</p>
              <p className="text-2xl font-bold text-gray-800">
                {Object.keys(groupedByDate).length}
              </p>
            </div>
          </div>
        )}

        {history.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <HistoryIcon size={40} className="text-gray-300" />
            </div>
            <p className="text-gray-500 mb-2">暂无历史记录</p>
            <p className="text-sm text-gray-400 mb-6">计算并保存记录后，可在这里查看历史数据</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              开始计算
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDate).map(([date, records]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-green-200"></div>
                  <span className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                    {date}
                  </span>
                  <div className="h-px flex-1 bg-green-200"></div>
                </div>
                <div className="space-y-3">
                  {records.map((record) => (
                    <HistoryRecordCard
                      key={record.id}
                      record={record}
                      onDelete={deleteRecord}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-12 py-6 text-center text-sm text-gray-400">
        <p>水培营养液EC稀释计算器 · 让种植更简单</p>
      </footer>
    </div>
  );
}
