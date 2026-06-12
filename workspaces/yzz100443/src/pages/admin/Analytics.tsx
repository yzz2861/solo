import { useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Download, TrendingUp, Users, AlertTriangle, BarChart3 } from 'lucide-react';
import { analyticsApi } from '../../services/api';
import { FRAUD_TYPE_LABELS } from '../../../shared/types';

const COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981'];

export default function Analytics() {
  const [fraudTypes, setFraudTypes] = useState<any[]>([]);
  const [ageGroups, setAgeGroups] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [vulnerableCases, setVulnerableCases] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [types, ages, trendData, vulnerable, overviewData] = await Promise.all([
        analyticsApi.fraudTypes(),
        analyticsApi.ageGroups(),
        analyticsApi.trend(30),
        analyticsApi.vulnerableCases(10),
        analyticsApi.overview(),
      ]);

      setFraudTypes(types);
      setAgeGroups(ages);
      setTrend(trendData);
      setVulnerableCases(vulnerable);
      setOverview(overviewData);
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
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
    total: item.totalAnswers,
    incorrect: item.incorrectAnswers,
  }));

  const ageGroupBarData = ageGroups.map((item) => ({
    name: item.ageGroup,
    中招率: item.fraudRate,
    答题数: item.totalAnswers,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">数据分析</h1>
          <p className="text-gray-500">查看培训效果、易中招骗局类型和年龄段分析</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors"
        >
          <Download className="w-5 h-5" />
          导出CSV
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">{overview?.totalElderly || 0}</p>
              <p className="text-xs text-gray-500">学习总人数</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">{overview?.totalAnswers || 0}</p>
              <p className="text-xs text-gray-500">总答题次数</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">{overview?.averageCorrectRate || 0}%</p>
              <p className="text-xs text-gray-500">平均正确率</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">{overview?.focusElderly || 0}</p>
              <p className="text-xs text-gray-500">重点关注老人</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">各类型骗局中招率</h2>
          {pieData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, '中招率']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400">
              暂无数据
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">不同年龄段中招率</h2>
          {ageGroupBarData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageGroupBarData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="中招率" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400">
              暂无数据（请填写年龄后查看）
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-4">近30天答题趋势</h2>
        {trend.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="correctRate"
                  name="正确率(%)"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="totalAnswers"
                  name="答题数"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">
            暂无数据
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-4">最易中招案例排行</h2>
        {vulnerableCases.length > 0 ? (
          <div className="space-y-3">
            {vulnerableCases.map((item, index) => (
              <div
                key={item.caseId}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                    index < 3 ? 'bg-red-500' : 'bg-gray-400'
                  }`}
                >
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-800">{item.caseTitle}</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {item.fraudTypeLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>答题 {item.totalAnswers} 次</span>
                    <span>错误 {item.incorrectAnswers} 次</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">{item.fraudRate}%</div>
                  <div className="text-xs text-gray-500">中招率</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-gray-400">
            暂无数据（需要至少3次答题记录）
          </div>
        )}
      </div>

      {ageGroups.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">各年龄段易错骗局类型</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {ageGroups.map((group) => (
              <div key={group.ageGroup} className="p-4 bg-gray-50 rounded-xl">
                <h3 className="font-bold text-gray-800 mb-3">{group.ageGroup}</h3>
                <div className="space-y-2">
                  {group.topFraudTypes?.length > 0 ? (
                    group.topFraudTypes.map((ft: any, i: number) => (
                      <div key={ft.fraudType} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {i + 1}. {FRAUD_TYPE_LABELS[ft.fraudType as keyof typeof FRAUD_TYPE_LABELS]}
                        </span>
                        <span className="text-red-600 font-medium">{ft.rate}%</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400">数据不足</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
