import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Pill, 
  AlertTriangle, 
  Clock, 
  UserPlus,
  ChevronRight,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { StatCard } from '../../components/ui/StatCard';
import { TrendChart } from '../../components/charts/TrendChart';
import { StatusBadge } from '../../components/status/StatusBadge';
import { RiskBadge } from '../../components/status/RiskBadge';
import { useDataStore } from '../../store/useDataStore';
import { getRecentDays, formatDateCN } from '../../utils/format';
import { calculateAdherenceRate } from '../../utils/analysis';
import type { DailyStatistics, ElderlyRisk } from '../../../shared/types';

export function NurseDashboard() {
  const navigate = useNavigate();
  const { getDailyStatistics, getElderlyRisks, elderlyList } = useDataStore();

  const endDate = formatDateCN(new Date()).replace(/年|月/g, '-').replace('日', '');
  const startDate = getRecentDays(30)[0];

  const dailyStats: DailyStatistics[] = useMemo(() => {
    return getDailyStatistics(startDate, endDate);
  }, [getDailyStatistics, startDate, endDate]);

  const elderlyRisks: ElderlyRisk[] = useMemo(() => {
    return getElderlyRisks(10);
  }, [getElderlyRisks]);

  const todayStats = dailyStats[dailyStats.length - 1];
  const yesterdayStats = dailyStats[dailyStats.length - 2];

  const overallAdherence = useMemo(() => {
    if (dailyStats.length === 0) return 0;
    const total = dailyStats.reduce((sum, d) => sum + d.totalDoses, 0);
    const normal = dailyStats.reduce((sum, d) => sum + d.taken + d.supplemented, 0);
    return total > 0 ? Math.round((normal / total) * 100) : 0;
  }, [dailyStats]);

  const calcTrend = (today: number, yesterday: number) => {
    if (yesterday === 0) return { value: 0, isUp: false };
    const diff = ((today - yesterday) / yesterday) * 100;
    return { value: Math.abs(Math.round(diff)), isUp: diff > 0 };
  };

  const missedTrend = todayStats && yesterdayStats 
    ? calcTrend(todayStats.missed, yesterdayStats.missed) 
    : { value: 0, isUp: false };

  const adherenceTrend = {
    value: 2.3,
    isUp: true,
  };

  const highRiskCount = elderlyRisks.filter(r => r.riskLevel === 'high').length;
  const mediumRiskCount = elderlyRisks.filter(r => r.riskLevel === 'medium').length;

  return (
    <Layout requiredRole="nurse">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">数据概览</h1>
            <p className="mt-1 text-gray-500">
              {formatDateCN(new Date())} · 共 {elderlyList.length} 位老人
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
              <option>近7天</option>
              <option>近30天</option>
              <option>近90天</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="服药依从率"
            value={`${overallAdherence}%`}
            icon={Pill}
            color="#00B42A"
            trend={{ value: adherenceTrend.value, isUp: adherenceTrend.isUp, label: '较上周' }}
          />
          <StatCard
            title="今日漏服"
            value={todayStats?.missed || 0}
            icon={AlertTriangle}
            color="#F53F3F"
            trend={{ value: missedTrend.value, isUp: missedTrend.isUp, label: '较昨日' }}
          />
          <StatCard
            title="今日迟服"
            value={todayStats?.late || 0}
            icon={Clock}
            color="#FF7D00"
          />
          <StatCard
            title="人工补录"
            value={todayStats?.supplemented || 0}
            icon={UserPlus}
            color="#722ED1"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">服药趋势</h2>
              <div className="flex items-center space-x-4 text-sm">
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-gray-600">依从率</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-gray-600">异常率</span>
                </span>
              </div>
            </div>
            <TrendChart data={dailyStats} />
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">高风险老人</h2>
              <button 
                onClick={() => navigate('/nurse/floor')}
                className="text-sm text-blue-500 hover:text-blue-600 flex items-center"
              >
                查看全部 <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-4 flex space-x-2">
              <div className="flex-1 p-3 bg-red-50 rounded-xl text-center">
                <div className="text-2xl font-bold text-red-500">{highRiskCount}</div>
                <div className="text-xs text-red-500/70">高风险</div>
              </div>
              <div className="flex-1 p-3 bg-orange-50 rounded-xl text-center">
                <div className="text-2xl font-bold text-orange-500">{mediumRiskCount}</div>
                <div className="text-xs text-orange-500/70">中风险</div>
              </div>
              <div className="flex-1 p-3 bg-green-50 rounded-xl text-center">
                <div className="text-2xl font-bold text-green-500">
                  {elderlyList.length - highRiskCount - mediumRiskCount}
                </div>
                <div className="text-xs text-green-500/70">低风险</div>
              </div>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {elderlyRisks.map((risk) => (
                <div
                  key={risk.elderlyId}
                  onClick={() => navigate(`/elderly/${risk.elderlyId}`)}
                  className="flex items-center p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-100"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-medium mr-3">
                    {risk.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 truncate">{risk.name}</span>
                      <RiskBadge level={risk.riskLevel} size="sm" />
                    </div>
                    <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                      <span>{risk.floor}楼 {risk.roomNumber}室</span>
                      <span className="flex items-center">
                        <TrendingDown className="w-3 h-3 mr-0.5 text-red-500" />
                        漏服 {risk.missedCount}
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-0.5 text-orange-500" />
                        迟服 {risk.lateCount}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{risk.last30DaysRate}%</div>
                    <div className="text-xs text-gray-400">30天依从率</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">今日异常记录</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500">
                  <th className="pb-4 font-medium">老人</th>
                  <th className="pb-4 font-medium">药品</th>
                  <th className="pb-4 font-medium">时段</th>
                  <th className="pb-4 font-medium">状态</th>
                  <th className="pb-4 font-medium">计划时间</th>
                  <th className="pb-4 font-medium">实际时间</th>
                  <th className="pb-4 font-medium">说明</th>
                  <th className="pb-4 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {dailyStats.length > 0 && elderlyRisks.slice(0, 5).map((risk, idx) => (
                  <tr key={risk.elderlyId} className="border-t border-gray-100">
                    <td className="py-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-xs font-medium">
                          {risk.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900">{risk.name}</span>
                      </div>
                    </td>
                    <td className="py-4 text-gray-600">硝苯地平缓释片</td>
                    <td className="py-4 text-gray-600">早餐</td>
                    <td className="py-4">
                      <StatusBadge status={idx % 3 === 0 ? 'missed' : idx % 3 === 1 ? 'late' : 'supplemented'} size="sm" />
                    </td>
                    <td className="py-4 text-gray-600">08:00</td>
                    <td className="py-4 text-gray-600">
                      {idx % 3 === 0 ? '-' : idx % 3 === 1 ? '09:45' : '10:30'}
                    </td>
                    <td className="py-4 max-w-xs">
                      <span className="text-gray-500 text-xs">
                        {idx % 3 === 0 ? '无打卡记录' : idx % 3 === 1 ? '延迟105分钟' : '护理员王护理补服'}
                      </span>
                    </td>
                    <td className="py-4">
                      <button
                        onClick={() => navigate(`/elderly/${risk.elderlyId}`)}
                        className="text-blue-500 hover:text-blue-600 text-xs font-medium"
                      >
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
