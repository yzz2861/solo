import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, TrendingUp, AlertCircle, Lightbulb, Calendar, Target } from 'lucide-react';
import { useRecordStore } from '@/store/useRecordStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { REGION_ORDER, REGION_NAMES, ToothRegion } from '@/types';
import { formatDuration, getRecentDays, getDayLabel, getTodayString } from '@/utils/dateUtils';
import { generateParentSuggestions } from '@/utils/feedback';
import ProgressRing from '@/components/ProgressRing';

function calcAverageScore(records: any[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((sum: number, r: any) => sum + r.score, 0);
  return Math.round(total / records.length);
}

function calcTotalDuration(records: any[]): number {
  return records.reduce((sum: number, r: any) => sum + r.totalDuration, 0);
}

function calcWeakRegions(records: any[]): ToothRegion[] {
  if (records.length === 0) return [];

  const regionScores: Record<ToothRegion, number> = {
    outer: 0,
    inner: 0,
    occlusal: 0,
    lingual: 0,
  };
  const regionCounts: Record<ToothRegion, number> = {
    outer: 0,
    inner: 0,
    occlusal: 0,
    lingual: 0,
  };

  records.forEach((record: any) => {
    (Object.keys(record.regions) as ToothRegion[]).forEach((region) => {
      regionScores[region] += record.regions[region].cleanliness;
      regionCounts[region] += 1;
    });
  });

  const avgScores = (Object.keys(regionScores) as ToothRegion[])
    .filter((r) => regionCounts[r] > 0)
    .map((r) => ({
      region: r,
      avg: regionScores[r] / regionCounts[r],
    }))
    .sort((a, b) => a.avg - b.avg);

  return avgScores.filter((s) => s.avg < 70).map((s) => s.region);
}

const ParentPage: React.FC = () => {
  const records = useRecordStore((state) => state.records);
  const { childName } = useSettingsStore();

  const todayRecords = useMemo(() => {
    const today = getTodayString();
    return records.filter((r) => r.date === today);
  }, [records]);

  const todayCount = todayRecords.length;
  const todayDuration = calcTotalDuration(todayRecords);
  const todayAvgScore = calcAverageScore(todayRecords);

  const weekRecords = useMemo(() => {
    const days = getRecentDays(7);
    return records.filter((r) => days.includes(r.date));
  }, [records]);

  const weekAvgScore = calcAverageScore(weekRecords);
  const weekTotalDuration = calcTotalDuration(weekRecords);

  const allWeakRegions = useMemo(() => calcWeakRegions(records), [records]);
  const suggestions = generateParentSuggestions(allWeakRegions, weekAvgScore);

  const weekDays = getRecentDays(7);
  const dailyData = useMemo(() => {
    return weekDays.map((date) => {
      const dayRecords = records.filter((r) => r.date === date);
      return {
        date,
        count: dayRecords.length,
        avgScore: calcAverageScore(dayRecords),
        duration: calcTotalDuration(dayRecords),
      };
    });
  }, [weekDays, records]);

  const maxDuration = Math.max(...dailyData.map((d) => d.duration), 1);

  const regionStats = useMemo(() => {
    const stats: Record<ToothRegion, { total: number; count: number }> = {
      outer: { total: 0, count: 0 },
      inner: { total: 0, count: 0 },
      occlusal: { total: 0, count: 0 },
      lingual: { total: 0, count: 0 },
    };

    records.forEach((record) => {
      REGION_ORDER.forEach((region) => {
        stats[region].total += record.regions[region].cleanliness;
        stats[region].count += 1;
      });
    });

    return REGION_ORDER.map((region) => ({
      region,
      avg: stats[region].count > 0 ? stats[region].total / stats[region].count : 0,
    }));
  }, [records]);

  const regionColors: Record<ToothRegion, string> = {
    outer: '#4ECDC4',
    inner: '#38bdf8',
    occlusal: '#fbbf24',
    lingual: '#f472b6',
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-gradient-to-r from-sky2-500 to-sky2-400 text-white">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Link
              to="/"
              className="p-2 -ml-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold">家长中心</h1>
          </div>
          <p className="text-white/80 text-sm">
            {childName} 的刷牙练习记录
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-lg p-5 mb-4">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky2-500" />
            今日统计
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-sky2-600">{todayCount}</div>
              <div className="text-xs text-gray-500 mt-1">练习次数</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-mint-600">
                {Math.round(todayDuration / 60)}
                <span className="text-base">分</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">总时长</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-sunshine-600">{todayAvgScore}</div>
              <div className="text-xs text-gray-500 mt-1">平均分</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5 mb-4">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-mint-500" />
            区域掌握度
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {regionStats.map(({ region, avg }) => (
              <div key={region} className="flex flex-col items-center">
                <ProgressRing
                  progress={avg}
                  size={60}
                  strokeWidth={5}
                  color={regionColors[region]}
                  label={`${Math.round(avg)}%`}
                />
                <span className="text-xs text-gray-600 mt-2">
                  {REGION_NAMES[region]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5 mb-4">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-coral-500" />
            近7天趋势
          </h2>
          <div className="h-40 flex items-end justify-between gap-1">
            {dailyData.map((day, index) => {
              const height = day.duration > 0 ? (day.duration / maxDuration) * 100 : 0;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center">
                  <div className="text-xs text-gray-400 mb-1">
                    {day.count > 0 ? day.count : ''}
                  </div>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full bg-gradient-to-t from-mint-500 to-mint-300 rounded-t-lg transition-all duration-500"
                      style={{
                        height: `${Math.max(height, 4)}%`,
                        opacity: day.duration > 0 ? 1 : 0.3,
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {getDayLabel(day.date)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-4 pt-4 border-t border-gray-100">
            <div>
              <span className="text-sm text-gray-500">近7天总分</span>
              <span className="ml-2 font-bold text-mint-600">{weekAvgScore}分</span>
            </div>
            <div>
              <span className="text-sm text-gray-500">总时长</span>
              <span className="ml-2 font-bold text-sky2-600">
                {formatDuration(weekTotalDuration)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5 mb-4">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-sunshine-500" />
            练习建议
          </h2>
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-sunshine-50 rounded-xl"
              >
                <div className="w-6 h-6 bg-sunshine-400 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                  {index + 1}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {suggestion}
                </p>
              </div>
            ))}
          </div>
        </div>

        {allWeakRegions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-5 mb-4">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-coral-500" />
              需要加强的区域
            </h2>
            <div className="space-y-2">
              {allWeakRegions.map((region) => (
                <div
                  key={region}
                  className="flex items-center justify-between p-3 bg-coral-50 rounded-xl"
                >
                  <span className="font-medium text-coral-700">
                    {REGION_NAMES[region]}
                  </span>
                  <Link
                    to="/practice"
                    className="px-4 py-1.5 bg-coral-500 text-white text-sm font-medium rounded-full hover:bg-coral-600 transition-colors"
                  >
                    去练习
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-sky2-50 rounded-2xl p-5">
          <h3 className="font-bold text-sky2-800 mb-3">💡 陪练小贴士</h3>
          <ul className="text-sm text-sky2-700 space-y-2">
            <li>• 和孩子一起刷牙，做好榜样</li>
            <li>• 刷完后检查一下，及时表扬</li>
            <li>• 固定刷牙时间，养成习惯</li>
            <li>• 每3个月检查一次牙齿</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ParentPage;
