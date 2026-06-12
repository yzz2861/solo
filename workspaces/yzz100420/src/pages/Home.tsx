import { useNavigate } from 'react-router-dom';
import { Flame, Plus, LineChart, FileText, Palette, ChevronRight, Thermometer, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useFiringStore } from '../store/firingStore';
import SummaryStats from '../components/SummaryStats';
import { formatTemp } from '../utils/curveCalc';
import { cn } from '../lib/utils';

const Home = () => {
  const navigate = useNavigate();
  const { records, currentRecordId, setCurrentRecord, viewMode } = useFiringStore();
  const currentRecord = records.find((r) => r.id === currentRecordId) || records[0];

  const gradeColors: Record<string, string> = {
    A: 'from-emerald-400 to-green-600',
    B: 'from-blue-400 to-indigo-500',
    C: 'from-amber-400 to-orange-500',
    D: 'from-red-500 to-rose-700',
  };

  const avgGrade = records.length > 0
    ? records.reduce((s, r) => {
        const scores = { A: 4, B: 3, C: 2, D: 1 };
        return s + (scores[r.overallGrade] || 2);
      }, 0) / records.length
    : 0;
  const avgGradeLetter = avgGrade >= 3.5 ? 'A' : avgGrade >= 2.5 ? 'B' : avgGrade >= 1.5 ? 'C' : 'D';

  const totalWorks = records.reduce((s, r) => s + r.batches.reduce((bs, b) => bs + b.works.length, 0), 0);
  const issues = records.reduce((s, r) => s + r.summary.deviationPeriods + r.summary.logGaps, 0);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-kiln-500 font-medium">
            {viewMode === 'teacher' ? '👨‍🏫 老师视图' : '🎓 学生视图'} · 欢迎回来
          </p>
          <h1 className="mt-1 text-2xl md:text-3xl font-display font-bold text-gradient-fire">
            窑火工作室 · 烧成总览
          </h1>
          <p className="mt-1 text-sm text-kiln-600">
            共 {records.length} 次窑记录 · {totalWorks} 件作品 ·{' '}
            {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            className="btn btn-primary"
            onClick={() => navigate('/import')}
          >
            <Plus className="w-4 h-4" />
            新建窑次
          </button>
          {currentRecord && (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => navigate(`/analysis/${currentRecord.id}`)}
              >
                <LineChart className="w-4 h-4" />
                查看曲线
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => navigate(`/report/${currentRecord.id}`)}
              >
                <FileText className="w-4 h-4" />
                复盘报告
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-5 bg-gradient-to-br from-fire-50 to-kiln-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-kiln-600 uppercase tracking-wider">总窑次</span>
            <div className="w-9 h-9 rounded-xl bg-fire-500 text-white flex items-center justify-center shadow-md">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold font-display text-kiln-900">{records.length}</p>
          <p className="text-[11px] text-kiln-500 mt-1">累计烧成次数</p>
        </div>
        <div className="card p-5 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-kiln-600 uppercase tracking-wider">平均评级</span>
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradeColors[avgGradeLetter]} text-white flex items-center justify-center shadow-md`}>
              <span className="font-bold font-display">{avgGradeLetter}</span>
            </div>
          </div>
          <p className="text-3xl font-bold font-display text-kiln-900">{avgGradeLetter}</p>
          <p className="text-[11px] text-kiln-500 mt-1">所有窑次平均值</p>
        </div>
        <div className="card p-5 bg-gradient-to-br from-emerald-50 to-teal-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-kiln-600 uppercase tracking-wider">学生作品</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
              <Palette className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold font-display text-kiln-900">{totalWorks}</p>
          <p className="text-[11px] text-kiln-500 mt-1">关联作品总数</p>
        </div>
        <div className="card p-5 bg-gradient-to-br from-amber-50 to-orange-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-kiln-600 uppercase tracking-wider">待关注问题</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold font-display text-kiln-900">{issues}</p>
          <p className="text-[11px] text-kiln-500 mt-1">高偏差 + 断点</p>
        </div>
      </div>

      {currentRecord && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-display font-bold text-kiln-800 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-kiln-gradient" />
              当前窑次详情
            </h2>
            <button
              className="text-xs text-fire-600 font-semibold hover:text-fire-700 flex items-center gap-1"
              onClick={() => navigate(`/analysis/${currentRecord.id}`)}
            >
              查看完整分析 <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <SummaryStats record={currentRecord} />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-display font-bold text-kiln-800 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-kiln-gradient" />
            历史窑次记录
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {records.map((record) => (
            <div
              key={record.id}
              className={cn(
                'card-hoverable card p-5 cursor-pointer transition-all group relative overflow-hidden',
                record.id === currentRecordId && 'ring-2 ring-fire-400/50 glow-orange',
              )}
              onClick={() => {
                setCurrentRecord(record.id);
                navigate(`/analysis/${record.id}`);
              }}
            >
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${gradeColors[record.overallGrade]}`} />
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-display font-bold text-kiln-800 leading-snug group-hover:text-fire-700 transition-colors">
                    {record.name}
                  </h3>
                  <p className="text-[11px] text-kiln-500 mt-1">
                    {new Date(record.startAt).toLocaleDateString('zh-CN')} ·{' '}
                    {record.segments.length} 段 ·{' '}
                    {record.batches.reduce((s, b) => s + b.works.length, 0)} 件作品
                  </p>
                </div>
                <div className={`grade-ring w-11 h-11 text-lg ${`bg-gradient-to-br ${gradeColors[record.overallGrade]}`} text-white shadow-lg`}>
                  {record.overallGrade}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-fire-50/60 rounded-lg p-2 text-center">
                  <Thermometer className="w-3.5 h-3.5 text-fire-500 mx-auto mb-0.5" />
                  <p className="text-sm font-bold font-mono text-fire-700">
                    {record.summary.peakTemp.toFixed(0)}℃
                  </p>
                  <p className="text-[9px] text-kiln-500">峰值</p>
                </div>
                <div className="bg-blue-50/60 rounded-lg p-2 text-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mx-auto mb-0.5" />
                  <p className="text-sm font-bold font-mono text-blue-700">
                    ±{record.summary.avgDeviation.toFixed(0)}℃
                  </p>
                  <p className="text-[9px] text-kiln-500">平均偏差</p>
                </div>
                <div className="bg-amber-50/60 rounded-lg p-2 text-center">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mx-auto mb-0.5" />
                  <p className="text-sm font-bold font-mono text-amber-700">
                    {record.summary.deviationPeriods}
                  </p>
                  <p className="text-[9px] text-kiln-500">问题点</p>
                </div>
              </div>

              <div className="w-full h-10 rounded-lg temp-bar opacity-70 relative overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-black/20"
                  style={{
                    width: `${(record.summary.peakTemp / 1400) * 100}%`,
                    clipPath: 'polygon(0 0, 100% 0, 96% 50%, 100% 100%, 0 100%)',
                  }}
                />
              </div>
              <p className="mt-2 text-[10px] text-kiln-500 font-mono">
                温度进度 · 峰值 {formatTemp(record.summary.peakTemp, 'C')} / 1400℃
              </p>
            </div>
          ))}

          {records.length === 0 && (
            <div className="card p-12 text-center">
              <Flame className="w-16 h-16 text-kiln-300 mx-auto mb-4" />
              <h3 className="text-lg font-display font-bold text-kiln-700 mb-2">
                还没有窑次记录
              </h3>
              <p className="text-sm text-kiln-500 mb-5">
                导入窑炉日志和保温计划，开始您的第一次科学烧成分析
              </p>
              <button className="btn btn-primary" onClick={() => navigate('/import')}>
                <Plus className="w-4 h-4" />
                开始导入
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
