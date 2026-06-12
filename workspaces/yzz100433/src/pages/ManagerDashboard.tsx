import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Eye,
  BookOpen,
  RotateCcw,
  Plus,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAppStore } from '@/store/useAppStore';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  ERROR_CATEGORY_LABELS,
  type StaffStatus,
  type ErrorCategory,
} from '@/types';
import { getLocalStorage } from '@/hooks/useLocalStorage';
import { STORAGE_KEYS } from '@/utils/constants';
import type { StaffStats, Staff } from '@/types';
import { formatRelativeTime } from '@/utils/formatters';

const CATEGORY_ORDER: ErrorCategory[] = [
  'full_reduction',
  'discount',
  'points',
  'stacking',
  'exchange',
  'partial_refund',
  'damaged_coupon',
  'group_order',
  'change',
  'basic',
];

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const {
    staffList,
    isManagerMode,
    loadStaffList,
    updateStaffStatus,
    resetStaffProgress,
    addStaff,
  } = useAppStore();
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState('');
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [allStats, setAllStats] = useState<Map<string, StaffStats>>(new Map());

  useEffect(() => {
    if (!isManagerMode) {
      navigate('/manager');
      return;
    }
    loadStaffList();
  }, [isManagerMode, navigate, loadStaffList]);

  useEffect(() => {
    const statsMap = new Map<string, StaffStats>();
    staffList.forEach(staff => {
      const stats = getLocalStorage<StaffStats>(
        `${STORAGE_KEYS.STATS_PREFIX}${staff.id}`,
        {
          staffId: staff.id,
          totalPractice: 0,
          correctCount: 0,
          wrongCount: 0,
          accuracy: 0,
          errorByType: {},
          unpassedScenarios: [],
          lastPracticeAt: staff.createdAt,
        }
      );
      statsMap.set(staff.id, stats);
    });
    setAllStats(statsMap);
  }, [staffList]);

  const handleUpdateStatus = (staffId: string, status: StaffStatus) => {
    updateStaffStatus(staffId, status, statusNote || undefined);
    setSelectedStaff(null);
    setStatusNote('');
  };

  const handleResetProgress = (staffId: string) => {
    if (confirm('确定要重置该店员的练习进度吗？此操作不可恢复。')) {
      resetStaffProgress(staffId);
      const updatedMap = new Map(allStats);
      updatedMap.set(staffId, {
        staffId,
        totalPractice: 0,
        correctCount: 0,
        wrongCount: 0,
        accuracy: 0,
        errorByType: {},
        unpassedScenarios: [],
        lastPracticeAt: new Date().toISOString(),
      });
      setAllStats(updatedMap);
    }
  };

  const handleAddStaff = () => {
    if (newStaffName.trim()) {
      addStaff(newStaffName.trim());
      setNewStaffName('');
      setShowAddStaff(false);
    }
  };

  const getAllErrorStats = () => {
    const totals: Record<string, number> = {};
    allStats.forEach(stats => {
      Object.entries(stats.errorByType).forEach(([type, count]) => {
        totals[type] = (totals[type] || 0) + count;
      });
    });
    return totals;
  };

  const errorStats = getAllErrorStats();
  const totalPractice = Array.from(allStats.values()).reduce((sum, s) => sum + s.totalPractice, 0);
  const avgAccuracy = allStats.size > 0
    ? Math.round(Array.from(allStats.values()).reduce((sum, s) => sum + s.accuracy, 0) / allStats.size)
    : 0;
  const totalUnpassed = Array.from(allStats.values()).reduce((sum, s) => sum + s.unpassedScenarios.length, 0);

  const getStaffStatusCount = (status: StaffStatus) =>
    staffList.filter(s => s.status === status).length;

  return (
    <Layout title="店长管理后台">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 card-shadow animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary-100 rounded-xl">
                <Users className="w-6 h-6 text-primary-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-caramel-800">{staffList.length}</p>
                <p className="text-xs text-caramel-500">店员总数</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 card-shadow animate-fade-in delay-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-matcha-100 rounded-xl">
                <TrendingUp className="w-6 h-6 text-matcha-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-matcha-600">{avgAccuracy}%</p>
                <p className="text-xs text-caramel-500">平均正确率</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 card-shadow animate-fade-in delay-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-peach-100 rounded-xl">
                <BookOpen className="w-6 h-6 text-peach-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-caramel-800">{totalPractice}</p>
                <p className="text-xs text-caramel-500">总练习次数</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 card-shadow animate-fade-in delay-300">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{totalUnpassed}</p>
                <p className="text-xs text-caramel-500">待复习题数</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 card-shadow animate-fade-in delay-400">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-peach-500" />
              <span className="text-sm font-medium text-caramel-700">旁听中</span>
            </div>
            <p className="text-3xl font-bold text-peach-600">
              {getStaffStatusCount('observing')}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 card-shadow animate-fade-in delay-500">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-primary-500" />
              <span className="text-sm font-medium text-caramel-700">练习中</span>
            </div>
            <p className="text-3xl font-bold text-primary-600">
              {getStaffStatusCount('practicing')}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 card-shadow animate-fade-in" style={{ animationDelay: '600ms' }}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-matcha-500" />
              <span className="text-sm font-medium text-caramel-700">可上岗</span>
            </div>
            <p className="text-3xl font-bold text-matcha-600">
              {getStaffStatusCount('ready')}
            </p>
          </div>
        </div>

        {Object.keys(errorStats).length > 0 && (
          <div className="bg-white rounded-xl p-5 card-shadow animate-fade-in" style={{ animationDelay: '700ms' }}>
            <h3 className="font-bold text-caramel-700 mb-4">全店错误类型排名</h3>
            <div className="space-y-3">
              {CATEGORY_ORDER
                .filter(cat => errorStats[cat])
                .sort((a, b) => (errorStats[b] || 0) - (errorStats[a] || 0))
                .slice(0, 5)
                .map((cat, index) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-orange-400' : 'bg-caramel-300'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="flex-1 text-caramel-700">
                      {ERROR_CATEGORY_LABELS[cat]}
                    </span>
                    <span className="font-semibold text-caramel-800">
                      {errorStats[cat]}次
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl p-5 card-shadow animate-fade-in" style={{ animationDelay: '800ms' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-caramel-700">店员管理</h3>
            <button
              onClick={() => setShowAddStaff(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加店员
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-primary-100">
                  <th className="text-left py-3 px-2 text-sm font-semibold text-caramel-600">店员</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-caramel-600">状态</th>
                  <th className="text-center py-3 px-2 text-sm font-semibold text-caramel-600">练习次数</th>
                  <th className="text-center py-3 px-2 text-sm font-semibold text-caramel-600">正确率</th>
                  <th className="text-center py-3 px-2 text-sm font-semibold text-caramel-600">待复习</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-caramel-600">上次练习</th>
                  <th className="text-center py-3 px-2 text-sm font-semibold text-caramel-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((staff, index) => {
                  const stats = allStats.get(staff.id);
                  return (
                    <tr
                      key={staff.id}
                      className="border-b border-primary-50 hover:bg-primary-50/50 transition-colors"
                      style={{ animationDelay: `${index * 50 + 900}ms` }}
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{staff.avatar}</span>
                          <span className="font-medium text-caramel-800">{staff.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[staff.status]}`}>
                          {STATUS_LABELS[staff.status]}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center text-caramel-700">
                        {stats?.totalPractice || 0}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`font-semibold ${
                          (stats?.accuracy || 0) >= 80 ? 'text-matcha-600' :
                          (stats?.accuracy || 0) >= 60 ? 'text-peach-600' : 'text-red-600'
                        }`}>
                          {stats?.accuracy || 0}%
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`font-semibold ${
                          (stats?.unpassedScenarios.length || 0) === 0 ? 'text-matcha-600' : 'text-red-600'
                        }`}>
                          {stats?.unpassedScenarios.length || 0}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-sm text-caramel-500">
                        {stats ? formatRelativeTime(stats.lastPracticeAt) : '-'}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedStaff(staff.id);
                              setStatusNote(staff.statusNote || '');
                            }}
                            className="p-1.5 hover:bg-caramel-100 rounded-lg transition-colors"
                            title="更新状态"
                          >
                            <CheckCircle className="w-4 h-4 text-caramel-500" />
                          </button>
                          <button
                            onClick={() => handleResetProgress(staff.id)}
                            className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                            title="重置进度"
                          >
                            <RotateCcw className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full animate-slide-in-up">
            <h3 className="text-xl font-bold text-caramel-800 mb-4">
              更新店员状态
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-caramel-700 mb-2">
                  选择状态
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['observing', 'practicing', 'ready'] as StaffStatus[]).map(status => (
                    <button
                      key={status}
                      onClick={() => handleUpdateStatus(selectedStaff, status)}
                      className={`py-2 px-3 rounded-xl text-sm font-medium transition-colors ${STATUS_COLORS[status]} hover:opacity-80`}
                    >
                      {STATUS_LABELS[status]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-caramel-700 mb-2">
                  备注（可选）
                </label>
                <textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="输入备注信息..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-primary-200 rounded-xl focus:outline-none focus:border-primary-400 transition-colors resize-none"
                />
              </div>
              <button
                onClick={() => setSelectedStaff(null)}
                className="w-full py-3 bg-caramel-100 text-caramel-700 font-semibold rounded-xl hover:bg-caramel-200 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full animate-slide-in-up">
            <h3 className="text-xl font-bold text-caramel-800 mb-4">
              添加新店员
            </h3>
            <input
              type="text"
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddStaff()}
              placeholder="请输入店员姓名"
              className="w-full px-4 py-3 border-2 border-primary-200 rounded-xl focus:outline-none focus:border-primary-400 transition-colors mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddStaff(false)}
                className="flex-1 py-3 bg-caramel-100 text-caramel-700 font-semibold rounded-xl hover:bg-caramel-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddStaff}
                disabled={!newStaffName.trim()}
                className="flex-1 py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
