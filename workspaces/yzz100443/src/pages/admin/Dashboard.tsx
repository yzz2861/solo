import { useEffect, useState } from 'react';
import { Users, BookOpen, TrendingUp, AlertTriangle } from 'lucide-react';
import { analyticsApi, caseApi } from '../../services/api';
import { FRAUD_TYPE_LABELS, type FraudType } from '../../../shared/types';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface OverviewStats {
  totalElderly: number;
  totalAnswers: number;
  averageCorrectRate: number;
  focusElderly: number;
}

interface VulnerableCase {
  caseId: number;
  caseTitle: string;
  fraudType: FraudType;
  fraudTypeLabel: string;
  totalAnswers: number;
  incorrectAnswers: number;
  fraudRate: number;
}

const COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981'];

export default function Dashboard() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [fraudTypes, setFraudTypes] = useState<any[]>([]);
  const [vulnerableCases, setVulnerableCases] = useState<VulnerableCase[]>([]);
  const [caseStats, setCaseStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [overviewData, fraudTypesData, vulnerableData, caseStatsData] = await Promise.all([
        analyticsApi.overview(),
        analyticsApi.fraudTypes(),
        analyticsApi.vulnerableCases(5),
        caseApi.stats(),
      ]);

      setOverview(overviewData);
      setFraudTypes(fraudTypesData);
      setVulnerableCases(vulnerableData);
      setCaseStats(caseStatsData);
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  const pieData = fraudTypes.map((item) => ({
    name: item.label,
    value: item.fraudRate,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">数据概览</h1>
        <p className="text-gray-500">社区防诈骗培训整体情况</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{overview?.totalElderly || 0}</p>
              <p className="text-sm text-gray-500">学习老人数</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{caseStats?.total || 0}</p>
              <p className="text-sm text-gray-500">案例总数</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{overview?.averageCorrectRate || 0}%</p>
              <p className="text-sm text-gray-500">平均正确率</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{overview?.focusElderly || 0}</p>
              <p className="text-sm text-gray-500">重点关注老人</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">各类型骗局中招率</h2>
          {pieData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-400">
              暂无数据
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">最易中招案例 TOP5</h2>
          {vulnerableCases.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vulnerableCases} layout="vertical">
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="caseTitle" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="fraudRate" fill="#EF4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-400">
              暂无数据
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-4">快速操作</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => window.location.href = '/admin/cases/new'}
            className="p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
          >
            <BookOpen className="w-6 h-6 text-blue-600 mb-2" />
            <p className="font-medium text-gray-800">新建案例</p>
            <p className="text-sm text-gray-500">添加本地真实案例</p>
          </button>
          <button
            onClick={() => window.location.href = '/admin/analytics'}
            className="p-4 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all text-left"
          >
            <TrendingUp className="w-6 h-6 text-purple-600 mb-2" />
            <p className="font-medium text-gray-800">数据分析</p>
            <p className="text-sm text-gray-500">查看详细统计</p>
          </button>
          <button
            onClick={() => window.location.href = '/admin/elderly'}
            className="p-4 border border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all text-left"
          >
            <Users className="w-6 h-6 text-green-600 mb-2" />
            <p className="font-medium text-gray-800">老人管理</p>
            <p className="text-sm text-gray-500">查看学习情况</p>
          </button>
          <button
            onClick={handleExport}
            className="p-4 border border-gray-200 rounded-xl hover:border-orange-300 hover:bg-orange-50 transition-all text-left"
          >
            <AlertTriangle className="w-6 h-6 text-orange-600 mb-2" />
            <p className="font-medium text-gray-800">导出数据</p>
            <p className="text-sm text-gray-500">导出培训报表</p>
          </button>
        </div>
      </div>
    </div>
  );

  async function handleExport() {
    try {
      const response = await analyticsApi.export();
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `防诈骗培训数据_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('导出失败，请稍后重试');
    }
  }
}
