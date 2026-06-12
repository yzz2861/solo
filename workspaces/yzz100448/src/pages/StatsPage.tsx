import { useState, useMemo } from 'react';
import { Download, Calendar, BarChart3, Clock, Building2, TrendingUp, FileText } from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  exportToCSV,
  prepareVisitorsForExport,
  prepareOverdueForExport,
  prepareCompanyStatsForExport,
  calculateCompanyStats,
} from '../utils/export';
import { calculateOverdueMinutes, formatDateTime, getTimeSlotLabel, getStatusLabel } from '../utils/dateUtils';
import type { OverdueStats } from '../types';

export default function StatsPage() {
  const { visitors } = useStore();
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [activeTab, setActiveTab] = useState<'overdue' | 'companies' | 'all'>('overdue');

  const filteredVisitors = useMemo(() => {
    let result = [...visitors];
    
    if (dateRange.start) {
      result = result.filter((v) => v.visitDate >= dateRange.start);
    }
    if (dateRange.end) {
      result = result.filter((v) => v.visitDate <= dateRange.end);
    }
    
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [visitors, dateRange]);

  const overdueStats = useMemo((): OverdueStats[] => {
    return filteredVisitors
      .filter((v) => v.status !== 'checked_out')
      .map((v) => ({
        visitor: v,
        overdueMinutes: calculateOverdueMinutes(v.endTime, v.checkOutTime),
      }))
      .filter((s) => s.overdueMinutes > 0)
      .sort((a, b) => b.overdueMinutes - a.overdueMinutes);
  }, [filteredVisitors]);

  const companyStats = useMemo(() => {
    return calculateCompanyStats(filteredVisitors);
  }, [filteredVisitors]);

  const totalVisits = filteredVisitors.length;
  const totalOverdue = overdueStats.length;
  const avgOverdueMinutes = overdueStats.length > 0
    ? Math.round(overdueStats.reduce((sum, s) => sum + s.overdueMinutes, 0) / overdueStats.length)
    : 0;
  const topCompany = companyStats[0];

  const handleExportAll = () => {
    const data = prepareVisitorsForExport(filteredVisitors);
    exportToCSV(data, '访客预约记录');
  };

  const handleExportOverdue = () => {
    const data = prepareOverdueForExport(overdueStats);
    exportToCSV(data, '超时占位记录');
  };

  const handleExportCompanies = () => {
    const data = prepareCompanyStatsForExport(companyStats);
    exportToCSV(data, '高频来访公司统计');
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">统计导出</h1>
          <p className="text-gray-500 mt-1">查看超时占位统计、高频来访公司，导出报表</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-100 text-sm">总访客数</p>
              <p className="text-3xl font-bold mt-1">{totalVisits}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <FileText size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-700 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">超时占位</p>
              <p className="text-3xl font-bold mt-1">{totalOverdue}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Clock size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm">平均超时</p>
              <p className="text-3xl font-bold mt-1">{avgOverdueMinutes}<span className="text-lg ml-1">分钟</span></p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm">来访最多</p>
              <p className="text-xl font-bold mt-1 truncate max-w-[150px]">{topCompany?.company || '-'}</p>
              <p className="text-emerald-100 text-sm">{topCompany?.visitCount || 0} 次</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Building2 size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-primary-500" />
            <span className="font-medium text-gray-700">日期范围筛选</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">开始：</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">结束：</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
              />
            </div>
            <button
              onClick={() => setDateRange({ start: '', end: '' })}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              重置
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportAll}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Download size={16} />
              导出全部
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('overdue')}
            className={`flex-1 py-4 px-6 font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'overdue'
                ? 'text-red-600 border-b-2 border-red-500 bg-red-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Clock size={18} />
            超时占位统计
          </button>
          <button
            onClick={() => setActiveTab('companies')}
            className={`flex-1 py-4 px-6 font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'companies'
                ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <BarChart3 size={18} />
            高频来访公司
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-4 px-6 font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'all'
                ? 'text-primary-600 border-b-2 border-primary-500 bg-primary-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FileText size={18} />
            全部记录
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'overdue' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800">超时未离场车辆</h3>
                <button
                  onClick={handleExportOverdue}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Download size={16} />
                  导出报表
                </button>
              </div>
              
              {overdueStats.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Clock size={48} className="mx-auto mb-4 opacity-30" />
                  <p>暂无超时占位记录</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-600">排名</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">来访单位</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">车牌</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">日期</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">车位</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">应离场</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">超时时长</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueStats.map((stat, index) => (
                        <tr key={stat.visitor.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                              index === 0 ? 'bg-red-500 text-white' :
                              index === 1 ? 'bg-orange-500 text-white' :
                              index === 2 ? 'bg-amber-500 text-white' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {index + 1}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium">{stat.visitor.company}</td>
                          <td className="py-3 px-4 font-mono text-accent-600">{stat.visitor.plateNumber}</td>
                          <td className="py-3 px-4">{stat.visitor.visitDate}</td>
                          <td className="py-3 px-4">{stat.visitor.parkingSpot}</td>
                          <td className="py-3 px-4">{stat.visitor.endTime}</td>
                          <td className="py-3 px-4">
                            <span className="text-red-600 font-semibold">
                              {Math.floor(stat.overdueMinutes / 60)}小时{stat.overdueMinutes % 60}分钟
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'companies' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800">来访公司频次排名</h3>
                <button
                  onClick={handleExportCompanies}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  <Download size={16} />
                  导出报表
                </button>
              </div>

              {companyStats.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Building2 size={48} className="mx-auto mb-4 opacity-30" />
                  <p>暂无来访记录</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {companyStats.slice(0, 20).map((stat, index) => (
                    <div
                      key={stat.company}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold flex-shrink-0 ${
                        index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' :
                        index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' :
                        index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">{stat.company}</p>
                        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min((stat.visitCount / (companyStats[0]?.visitCount || 1)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-2xl font-bold text-emerald-600">{stat.visitCount}</p>
                        <p className="text-xs text-gray-400">次</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'all' && (
            <div>
              {filteredVisitors.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <FileText size={48} className="mx-auto mb-4 opacity-30" />
                  <p>暂无预约记录</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-3 font-medium text-gray-600">来访单位</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">被访人</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">车牌</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">日期</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">时段</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">车位</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">状态</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">登记时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVisitors.map((visitor) => (
                        <tr key={visitor.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-3 font-medium">{visitor.company}</td>
                          <td className="py-3 px-3">{visitor.contactPerson}</td>
                          <td className="py-3 px-3 font-mono text-accent-600">{visitor.plateNumber}</td>
                          <td className="py-3 px-3">{visitor.visitDate}</td>
                          <td className="py-3 px-3">{getTimeSlotLabel(visitor.timeSlot)}</td>
                          <td className="py-3 px-3">{visitor.parkingSpot}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              visitor.status === 'pending' ? 'bg-gray-100 text-gray-600' :
                              visitor.status === 'arrived' ? 'bg-green-100 text-green-700' :
                              visitor.status === 'overdue' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-500'
                            }`}>
                              {getStatusLabel(visitor.status)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-gray-500">{formatDateTime(new Date(visitor.createdAt))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
