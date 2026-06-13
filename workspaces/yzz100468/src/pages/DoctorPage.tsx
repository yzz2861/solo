import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Stethoscope,
  TrendingUp,
  Calendar,
  Target,
  MessageSquare,
  Award,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronUp,
  Download,
} from 'lucide-react';
import { useRecordStore } from '@/store/useRecordStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { REGION_ORDER, REGION_NAMES, ToothRegion } from '@/types';
import { formatDuration, getRecentDays, getDayLabel } from '@/utils/dateUtils';
import { generateDoctorTalkingPoints } from '@/utils/feedback';

type TimeRange = '7days' | '30days' | 'all';

const DoctorPage: React.FC = () => {
  const records = useRecordStore((state) => state.records);
  const getAverageScore = useRecordStore((state) => state.getAverageScore);
  const getTotalDuration = useRecordStore((state) => state.getTotalDuration);
  const getWeakRegions = useRecordStore((state) => state.getWeakRegions);
  const getCommonIssues = useRecordStore((state) => state.getCommonIssues);
  const getRecentRecords = useRecordStore((state) => state.getRecentRecords);
  const { childName } = useSettingsStore();

  const [timeRange, setTimeRange] = useState<TimeRange>('30days');
  const [showGuidance, setShowGuidance] = useState(true);

  const rangeRecords = useMemo(() => {
    switch (timeRange) {
      case '7days':
        return getRecentRecords(7);
      case '30days':
        return getRecentRecords(30);
      case 'all':
      default:
        return records;
    }
  }, [timeRange, records, getRecentRecords]);

  const avgScore = getAverageScore(rangeRecords);
  const totalDuration = getTotalDuration(rangeRecords);
  const totalPractices = rangeRecords.length;
  const weakRegions = getWeakRegions(rangeRecords);
  const commonIssues = getCommonIssues(rangeRecords);
  const talkingPoints = generateDoctorTalkingPoints(
    avgScore,
    totalPractices,
    weakRegions,
    commonIssues
  );

  const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 30;
  const weekDays = getRecentDays(days);
  
  const dailyData = useMemo(() => {
    return weekDays.map((date) => {
      const dayRecords = records.filter((r) => r.date === date);
      return {
        date,
        count: dayRecords.length,
        avgScore: getAverageScore(dayRecords),
        duration: getTotalDuration(dayRecords),
      };
    });
  }, [weekDays, records, getAverageScore, getTotalDuration]);

  const maxDuration = Math.max(...dailyData.map((d) => d.duration), 1);
  const maxScore = 100;

  const regionStats = useMemo(() => {
    const stats: Record<ToothRegion, { total: number; count: number; completed: number }> = {
      outer: { total: 0, count: 0, completed: 0 },
      inner: { total: 0, count: 0, completed: 0 },
      occlusal: { total: 0, count: 0, completed: 0 },
      lingual: { total: 0, count: 0, completed: 0 },
    };

    rangeRecords.forEach((record) => {
      REGION_ORDER.forEach((region) => {
        stats[region].total += record.regions[region].cleanliness;
        stats[region].count += 1;
        if (record.regions[region].completed) {
          stats[region].completed += 1;
        }
      });
    });

    return REGION_ORDER.map((region) => ({
      region,
      avg: stats[region].count > 0 ? stats[region].total / stats[region].count : 0,
      completionRate: stats[region].count > 0 ? (stats[region].completed / stats[region].count) * 100 : 0,
    }));
  }, [rangeRecords]);

  const regionColors: Record<ToothRegion, string> = {
    outer: '#4ECDC4',
    inner: '#38bdf8',
    occlusal: '#fbbf24',
    lingual: '#f472b6',
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-8">
      <div className="bg-gradient-to-r from-coral-500 to-coral-400 text-white">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="p-2 -ml-2 rounded-full hover:bg-white/20 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <h1 className="text-xl font-bold">医生视角</h1>
            </div>
            <button
              onClick={handlePrint}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
              title="打印报告"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
          <p className="text-white/80 text-sm">
            {childName} · 复诊宣教摘要
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4">
        <div className="flex gap-2 mb-4">
          {(['7days', '30days', 'all'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all ${
                timeRange === range
                  ? 'bg-coral-500 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {range === '7days' ? '近7天' : range === '30days' ? '近30天' : '全部'}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5 mb-4">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-coral-500" />
            复诊摘要
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-coral-50 rounded-xl p-4">
              <div className="text-3xl font-bold text-coral-600">{totalPractices}</div>
              <div className="text-sm text-coral-600/70">练习次数</div>
            </div>
            <div className="bg-mint-50 rounded-xl p-4">
              <div className="text-3xl font-bold text-mint-600">{avgScore}</div>
              <div className="text-sm text-mint-600/70">平均得分</div>
            </div>
            <div className="bg-sky2-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-sky2-600">
                {Math.round(totalDuration / 60)}
                <span className="text-sm">分钟</span>
              </div>
              <div className="text-sm text-sky2-600/70">总练习时长</div>
            </div>
            <div className="bg-sunshine-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-sunshine-600">
                {totalPractices > 0 
                  ? Math.round(totalDuration / totalPractices) 
                  : 0}
                <span className="text-sm">秒</span>
              </div>
              <div className="text-sm text-sunshine-600/70">平均每次</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5 mb-4">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-coral-500" />
            得分趋势
          </h2>
          <div className="relative h-40">
            <div className="absolute inset-0 flex flex-col justify-between py-2">
              <div className="h-px bg-gray-100" />
              <div className="h-px bg-gray-100" />
              <div className="h-px bg-gray-100" />
              <div className="h-px bg-gray-100" />
            </div>
            <svg className="w-full h-full" viewBox={`0 0 ${days} 100`} preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke="#F87171"
                strokeWidth="2"
                points={dailyData
                  .map((d, i) => `${i + 0.5},${100 - d.avgScore}`)
                  .join(' ')}
              />
              {dailyData.map((d, i) => (
                d.avgScore > 0 && (
                  <circle
                    key={i}
                    cx={i + 0.5}
                    cy={100 - d.avgScore}
                    r="2"
                    fill="#F87171"
                  />
                )
              ))}
            </svg>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-400">
              {getDayLabel(weekDays[0])}
            </span>
            <span className="text-xs text-gray-400">
              {getDayLabel(weekDays[Math.floor(weekDays.length / 2)])}
            </span>
            <span className="text-xs text-gray-400">今天</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5 mb-4">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-coral-500" />
            区域完成度分析
          </h2>
          <div className="space-y-3">
            {regionStats.map(({ region, avg, completionRate }) => (
              <div key={region}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {REGION_NAMES[region]}
                  </span>
                  <span className="text-sm text-gray-500">
                    平均 {Math.round(avg)}% · 完成率 {Math.round(completionRate)}%
                  </span>
                </div>
                <div className="flex gap-1">
                  <div
                    className="h-2 rounded-l-full"
                    style={{
                      width: `${avg}%`,
                      backgroundColor: regionColors[region],
                    }}
                  />
                  <div className="flex-1 h-2 bg-gray-100 rounded-r-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {weakRegions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-5 mb-4">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-sunshine-500" />
              薄弱环节
            </h2>
            <div className="space-y-2">
              {weakRegions.map((region) => (
                <div
                  key={region}
                  className="flex items-center gap-3 p-3 bg-sunshine-50 rounded-xl"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: regionColors[region] }}
                  />
                  <span className="font-medium text-gray-800">
                    {REGION_NAMES[region]}
                  </span>
                  <span className="text-sm text-gray-500 ml-auto">
                    需加强练习
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-4">
          <button
            onClick={() => setShowGuidance(!showGuidance)}
            className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-coral-500" />
              复诊宣教要点
            </h2>
            {showGuidance ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          {showGuidance && (
            <div className="px-5 pb-5">
              <div className="bg-coral-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-coral-700 font-medium mb-2">
                  💬 夸奖孩子的话：
                </p>
                <p className="text-coral-800">
                  "{childName}最近刷牙进步很大！
                  {totalPractices >= 10 && '坚持练习了这么多次，特别棒！'}
                  {avgScore >= 80 && '得分很高，动作很标准！'}
                  继续保持，牙齿会越来越健康的～"
                </p>
              </div>
              <div className="space-y-2">
                {talkingPoints.map((point, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="w-6 h-6 bg-coral-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                      {index + 1}
                    </div>
                    <p className="text-sm text-gray-700">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-coral-500" />
            口腔健康建议
          </h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <span className="text-mint-500">✓</span>
              <p>每天早晚各刷牙一次，每次不少于2分钟</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-mint-500">✓</span>
              <p>使用含氟牙膏，用量约豌豆大小</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-mint-500">✓</span>
              <p>采用巴氏刷牙法，刷毛与牙面呈45度角</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-mint-500">✓</span>
              <p>每3个月更换一次牙刷</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-mint-500">✓</span>
              <p>每半年进行一次口腔检查</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-mint-500">✓</span>
              <p>减少甜食摄入，饭后及时漱口</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorPage;
