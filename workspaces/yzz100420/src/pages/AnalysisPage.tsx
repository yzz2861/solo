import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronRight,
  Clock,
  FileText,
  Palette,
  LineChart,
  ArrowLeft,
} from 'lucide-react';
import { useFiringStore } from '../store/firingStore';
import FiringCurveChart from '../components/FiringCurveChart';
import SegmentPanel from '../components/SegmentPanel';
import SummaryStats from '../components/SummaryStats';
import { formatHours, formatTimestamp, severityColors } from '../utils/curveCalc';
import { cn } from '../lib/utils';

const AnalysisPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { records, setCurrentRecord } = useFiringStore();
  const record = records.find((r) => r.id === id) || records[0];
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  useMemo(() => {
    if (record) setCurrentRecord(record.id);
  }, [record, setCurrentRecord]);

  if (!record) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-lg font-display font-bold mb-2">请先选择或创建窑次记录</h2>
        <button className="btn btn-primary" onClick={() => navigate('/import')}>
          导入数据
        </button>
      </div>
    );
  }

  const topDeviations = record.maxDeviation;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1800px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            className="btn btn-ghost !p-2 !rounded-lg border border-kiln-200 hover:bg-white"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge bg-fire-100 text-fire-700 border-fire-200">
                <LineChart className="w-3 h-3" />
                曲线分析
              </span>
              <select
                className="bg-white rounded-lg border border-kiln-200 px-3 py-1.5 text-sm font-medium text-kiln-700 focus:outline-none focus:ring-2 focus:ring-fire-400/40"
                value={record.id}
                onChange={(e) => navigate(`/analysis/${e.target.value}`)}
              >
                {records.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-gradient-fire">
              {record.name}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            className="btn btn-secondary"
            onClick={() => navigate(`/report/${record.id}`)}
          >
            <FileText className="w-4 h-4" />
            复盘报告
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate(`/works/${record.id}`)}
          >
            <Palette className="w-4 h-4" />
            作品讲评
          </button>
        </div>
      </div>

      <SummaryStats record={record} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <FiringCurveChart
            record={record}
            selectedSegmentId={selectedSegmentId}
            onSegmentClick={(sid) =>
              setSelectedSegmentId(selectedSegmentId === sid ? null : sid)
            }
            onEventClick={(eid) => {
              const ev = record.events.find((x) => x.id === eid);
              setSelectedEvent(ev || null);
            }}
            height={460}
          />

          {topDeviations.length > 0 && (
            <div className="card p-5 bg-gradient-to-br from-red-50/60 via-white/80 to-amber-50/40">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-display font-bold text-kiln-800 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  最大偏离时段 · Top {topDeviations.length}
                </h3>
                <span className="text-xs text-kiln-500">
                  点击可快速定位到曲线上对应位置
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                {topDeviations.map((d, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-3 bg-white border border-kiln-100 shadow-sm hover:shadow-card transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold font-mono text-kiln-400 uppercase tracking-wider">
                        #{i + 1}
                      </span>
                      <span className={`badge text-[10px] ${severityColors[d.severity]}`}>
                        {d.severity === 'high'
                          ? '严重'
                          : d.severity === 'medium'
                            ? '中度'
                            : '轻微'}
                      </span>
                    </div>
                    <p className="text-[11px] text-kiln-500 mb-1 font-mono">
                      T+{formatHours(d.timeHours)}
                    </p>
                    <p
                      className={cn(
                        'text-lg font-bold font-mono',
                        d.difference > 0 ? 'text-red-600' : 'text-blue-600',
                      )}
                    >
                      {d.difference > 0 ? '+' : ''}
                      {d.difference.toFixed(0)}℃
                      <span className="text-[10px] font-normal ml-1 text-kiln-500">
                        ({d.percentage.toFixed(1)}%)
                      </span>
                    </p>
                    <div className="mt-2 pt-2 border-t border-kiln-100 flex justify-between text-[10px] font-mono">
                      <span className="text-fire-600">{d.actualTemp.toFixed(0)}℃</span>
                      <span className="text-kiln-400">vs</span>
                      <span className="text-slate-600">{d.targetTemp.toFixed(0)}℃</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedEvent && (
            <div className="card p-5 bg-gradient-to-br from-amber-50/60 via-white/80 to-indigo-50/40 border-amber-200 animate-fade-in">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl shrink-0">
                  {selectedEvent.type === 'log_gap' && '⚠️'}
                  {selectedEvent.type === 'overnight' && '🌙'}
                  {selectedEvent.type === 'lid_open' && '🚪'}
                  {selectedEvent.type === 'manual_adjust' && '🎛️'}
                  {selectedEvent.type === 'power_loss' && '⚡'}
                  {selectedEvent.type === 'other' && '📍'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold font-display text-kiln-800">
                      {selectedEvent.title}
                    </h3>
                    <button
                      onClick={() => setSelectedEvent(null)}
                      className="text-kiln-400 hover:text-kiln-600 text-xs font-medium"
                    >
                      关闭
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-kiln-500 mb-2 font-mono">
                    <span>
                      <Clock className="w-3.5 h-3.5 inline mr-1" />
                      {formatTimestamp(selectedEvent.timestamp)}
                    </span>
                    <span>
                      相对烧成时间 T+
                      {formatHours(selectedEvent.timeHours)}
                    </span>
                    {selectedEvent.durationMinutes && (
                      <span>持续 {selectedEvent.durationMinutes} 分钟</span>
                    )}
                  </div>
                  <p className="text-sm text-kiln-700 leading-relaxed bg-white/60 rounded-lg p-3 border border-kiln-100">
                    {selectedEvent.description}
                  </p>
                  {selectedEvent.params && (
                    <div className="mt-2 p-2 rounded-lg bg-kiln-50 border border-kiln-100">
                      <p className="text-[11px] font-semibold text-kiln-600 mb-1">参数详情</p>
                      <pre className="text-[11px] font-mono text-kiln-700 overflow-x-auto">
                        {JSON.stringify(selectedEvent.params, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <SegmentPanel
            segments={record.segments}
            selectedSegmentId={selectedSegmentId}
            onSegmentClick={(sid) =>
              setSelectedSegmentId(selectedSegmentId === sid ? null : sid)
            }
          />

          <div className="card p-5">
            <h3 className="text-base font-display font-bold text-kiln-800 mb-4 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-indigo-500" />
              快速跳转
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate(`/report/${record.id}`)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-fire-50 to-orange-50 border border-fire-100 hover:shadow-card hover:border-fire-300 transition-all group"
              >
                <span className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-fire-500 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <FileText className="w-4 h-4" />
                  </span>
                  <span className="text-left">
                    <span className="block text-sm font-bold text-kiln-800">查看复盘报告</span>
                    <span className="block text-[11px] text-kiln-500">学生/老师双视图</span>
                  </span>
                </span>
                <ChevronRight className="w-5 h-5 text-fire-500" />
              </button>

              <button
                onClick={() => navigate(`/works/${record.id}`)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-clay-50 to-amber-50 border border-clay-200 hover:shadow-card hover:border-clay-400 transition-all group"
              >
                <span className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-clay-500 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <Palette className="w-4 h-4" />
                  </span>
                  <span className="text-left">
                    <span className="block text-sm font-bold text-kiln-800">作品关联讲评</span>
                    <span className="block text-[11px] text-kiln-500">
                      {record.batches.reduce((s, b) => s + b.works.length, 0)} 件作品待分析
                    </span>
                  </span>
                </span>
                <ChevronRight className="w-5 h-5 text-clay-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisPage;
