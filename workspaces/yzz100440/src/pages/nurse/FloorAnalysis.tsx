import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  WifiOff, 
  Users, 
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Clock
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { StatCard } from '../../components/ui/StatCard';
import { FloorHeatmap } from '../../components/charts/FloorHeatmap';
import { RiskBadge } from '../../components/status/RiskBadge';
import { useDataStore } from '../../store/useDataStore';
import { formatDate, formatDateCN, getRecentDays } from '../../utils/format';
import type { FloorStatistics } from '../../../shared/types';

export function FloorAnalysis() {
  const navigate = useNavigate();
  const { getFloorStatistics, getElderlyRisks, elderlyList } = useDataStore();
  
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));

  const floorStats: FloorStatistics[] = useMemo(() => {
    return getFloorStatistics(selectedDate);
  }, [getFloorStatistics, selectedDate]);

  const elderlyRisks = useMemo(() => {
    return getElderlyRisks();
  }, [getElderlyRisks]);

  const totalMissedRate = floorStats.length > 0
    ? (floorStats.reduce((sum, f) => sum + f.missedRate * f.totalDoses, 0) /
       floorStats.reduce((sum, f) => sum + f.totalDoses, 0)).toFixed(1)
    : '0';

  const totalOfflineRate = floorStats.length > 0
    ? (floorStats.reduce((sum, f) => sum + f.offlineRate * f.totalDoses, 0) /
       floorStats.reduce((sum, f) => sum + f.totalDoses, 0)).toFixed(1)
    : '0';

  const totalDeviceIssues = floorStats.reduce((sum, f) => sum + f.deviceIssues, 0);
  const totalShiftIssues = floorStats.reduce(
    (sum, f) => sum + f.shiftIssues.morning + f.shiftIssues.afternoon + f.shiftIssues.night,
    0
  );

  const recentDays = getRecentDays(7).reverse();

  const getFloorElderly = (floor: number) => {
    return elderlyList.filter(e => e.floor === floor).map(e => ({
      ...e,
      risk: elderlyRisks.find(r => r.elderlyId === e.id),
    }));
  };

  return (
    <Layout requiredRole="nurse">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">楼层分析</h1>
            <p className="mt-1 text-gray-500">
              按楼层和班次维度分析漏服原因，判断设备问题或交接漏洞
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex bg-white rounded-xl border border-gray-200 p-1">
              {recentDays.map(date => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    selectedDate === date
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {parseInt(date.split('-')[2])}日
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title={`${selectedDate} 漏服率`}
            value={`${totalMissedRate}%`}
            icon={AlertTriangle}
            color="#F53F3F"
          />
          <StatCard
            title="设备离线率"
            value={`${totalOfflineRate}%`}
            icon={WifiOff}
            color="#FF7D00"
          />
          <StatCard
            title="设备问题总数"
            value={totalDeviceIssues}
            icon={Building2}
            color="#722ED1"
          />
          <StatCard
            title="班次交接问题"
            value={totalShiftIssues}
            icon={Users}
            color="#165DFF"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              班次异常热力图
            </h2>
            <FloorHeatmap data={floorStats} />
            <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-sm text-blue-700">
                <strong>分析提示：</strong>
                热力图颜色越深表示该楼层该班次异常越多。
                如果某楼层所有班次异常都高，可能是设备问题；
                如果只有特定班次异常高，可能是交接班问题。
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              楼层问题归因
            </h2>
            <div className="space-y-4">
              {floorStats.map(floor => {
                const shiftTotal = floor.shiftIssues.morning + floor.shiftIssues.afternoon + floor.shiftIssues.night;
                const isDeviceIssue = floor.deviceIssues > shiftTotal;
                const issueType = isDeviceIssue ? '设备问题' : '班次交接';
                const issueColor = isDeviceIssue ? '#FF7D00' : '#165DFF';
                const issueIcon = isDeviceIssue ? WifiOff : Clock;
                const IssueIcon = issueIcon;

                return (
                  <div key={floor.floor} className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{floor.floor}楼</h3>
                          <p className="text-xs text-gray-500">
                            共 {getFloorElderly(floor.floor).length} 位老人 · {floor.totalDoses} 次服药
                          </p>
                        </div>
                      </div>
                      <div
                        className="flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium"
                        style={{ backgroundColor: `${issueColor}15`, color: issueColor }}
                      >
                        <IssueIcon className="w-4 h-4" />
                        <span>{issueType}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div className="text-center p-2 rounded-lg bg-gray-50">
                        <div className="text-lg font-bold text-red-500">
                          {floor.missedRate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500">漏服率</div>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-gray-50">
                        <div className="text-lg font-bold text-orange-500">
                          {floor.shiftIssues.morning}
                        </div>
                        <div className="text-xs text-gray-500">早班问题</div>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-gray-50">
                        <div className="text-lg font-bold text-blue-500">
                          {floor.shiftIssues.afternoon}
                        </div>
                        <div className="text-xs text-gray-500">中班问题</div>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-gray-50">
                        <div className="text-lg font-bold text-purple-500">
                          {floor.shiftIssues.night}
                        </div>
                        <div className="text-xs text-gray-500">晚班问题</div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">高风险老人</span>
                        <button className="text-sm text-blue-500 hover:text-blue-600 flex items-center">
                          查看全部 <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {getFloorElderly(floor.floor)
                          .filter(e => e.risk?.riskLevel === 'high')
                          .slice(0, 4)
                          .map(e => (
                            <button
                              key={e.id}
                              onClick={() => navigate(`/elderly/${e.id}`)}
                              className="flex items-center space-x-1 px-2 py-1 bg-red-50 rounded-lg text-sm text-red-600 hover:bg-red-100 transition-colors"
                            >
                              <span>{e.name}</span>
                              <RiskBadge level="high" size="sm" />
                            </button>
                          ))}
                        {getFloorElderly(floor.floor).filter(e => e.risk?.riskLevel === 'high').length === 0 && (
                          <span className="text-sm text-gray-400">暂无高风险老人</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            各楼层老人风险分布
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...new Set<number>(elderlyList.map(e => e.floor))].sort().map(floor => {
              const floorElderly = getFloorElderly(floor);
              const highRisk = floorElderly.filter(e => e.risk?.riskLevel === 'high').length;
              const mediumRisk = floorElderly.filter(e => e.risk?.riskLevel === 'medium').length;
              const lowRisk = floorElderly.filter(e => e.risk?.riskLevel === 'low').length;

              return (
                <div key={floor} className="p-4 rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">{floor}楼</h3>
                    <span className="text-sm text-gray-500">{floorElderly.length} 位老人</span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <div className="flex-1 h-2 bg-red-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${floorElderly.length > 0 ? (highRisk / floorElderly.length) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="flex-1 h-2 bg-orange-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{ width: `${floorElderly.length > 0 ? (mediumRisk / floorElderly.length) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="flex-1 h-2 bg-green-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${floorElderly.length > 0 ? (lowRisk / floorElderly.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span className="flex items-center">
                      <span className="w-2 h-2 rounded-full bg-red-500 mr-1" />
                      高 {highRisk}
                    </span>
                    <span className="flex items-center">
                      <span className="w-2 h-2 rounded-full bg-orange-500 mr-1" />
                      中 {mediumRisk}
                    </span>
                    <span className="flex items-center">
                      <span className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                      低 {lowRisk}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
