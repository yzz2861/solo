import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Camera, ArrowLeft, FileText, Clock, CheckCircle, AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { caseApi } from '../api/client';
import type { Case } from '../types';
import {
  cn,
  formatDate,
  getConfidenceColor,
} from '../utils';

export default function ReshootList() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    loadCases();
  }, [user]);

  const loadCases = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await caseApi.list({ surveyorId: user.id });
      const casesWithReshoot = response.data.filter(c => c.reshootList.length > 0);
      setCases(casesWithReshoot);
    } catch (error) {
      console.error('Failed to load reshoot cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = cases.filter(c => {
    const pendingCount = c.reshootList.filter(r => !r.isCompleted).length;
    if (filter === 'pending') return pendingCount > 0;
    if (filter === 'completed') return pendingCount === 0;
    return true;
  });

  const pendingTotal = cases.reduce((sum, c) =>
    sum + c.reshootList.filter(r => !r.isCompleted).length, 0
  );
  const completedTotal = cases.reduce((sum, c) =>
    sum + c.reshootList.filter(r => r.isCompleted).length, 0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          返回首页
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{cases.length}</div>
              <div className="text-sm text-gray-500">待补拍案件</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{pendingTotal}</div>
              <div className="text-sm text-gray-500">待补拍照片</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{completedTotal}</div>
              <div className="text-sm text-gray-500">已补拍照片</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: '全部' },
          { key: 'pending', label: '待补拍' },
          { key: 'completed', label: '已完成' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              filter === f.key
                ? "bg-primary-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Case List */}
      {filteredCases.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <Camera className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            {filter === 'all' ? '暂无补拍任务' :
             filter === 'pending' ? '暂无待补拍任务' : '暂无已完成补拍'}
          </h3>
          <p className="text-gray-500">
            {filter === 'all' ? '所有案件都无需补拍' :
             filter === 'pending' ? '所有补拍任务已完成' : '还没有完成任何补拍任务'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCases.map((caseItem, index) => {
            const pendingCount = caseItem.reshootList.filter(r => !r.isCompleted).length;
            const completedCount = caseItem.reshootList.filter(r => r.isCompleted).length;
            const progress = (completedCount / caseItem.reshootList.length) * 100;

            return (
              <motion.div
                key={caseItem.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(`/reshoot/${caseItem.id}`)}
                className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer p-5"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      pendingCount > 0 ? "bg-orange-100" : "bg-success-100"
                    )}>
                      <Camera className={cn(
                        "w-6 h-6",
                        pendingCount > 0 ? "text-orange-600" : "text-success-600"
                      )} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-800">{caseItem.plateNumber}</span>
                        <span className={cn(
                          'font-bold',
                          getConfidenceColor(caseItem.confidenceScore)
                        )}>
                          {Math.round(caseItem.confidenceScore * 100)}%
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {caseItem.id} · {formatDate(caseItem.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      {pendingCount > 0 && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                          {pendingCount} 待补拍
                        </span>
                      )}
                      {pendingCount === 0 && (
                        <span className="px-2 py-1 bg-success-100 text-success-700 rounded-full text-xs font-medium">
                          全部完成
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {completedCount}/{caseItem.reshootList.length} 已完成
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>补拍进度</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={cn(
                        "h-2 rounded-full transition-all",
                        pendingCount > 0 ? "bg-orange-500" : "bg-success-500"
                      )}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Preview Items */}
                <div className="flex flex-wrap gap-2">
                  {caseItem.reshootList.slice(0, 3).map((item, i) => (
                    <span
                      key={item.id}
                      className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        item.isCompleted
                          ? "bg-success-50 text-success-700 border border-success-200"
                          : "bg-orange-50 text-orange-700 border border-orange-200"
                      )}
                    >
                      {item.partName || item.shotName}
                      {item.isCompleted && ' ✓'}
                    </span>
                  ))}
                  {caseItem.reshootList.length > 3 && (
                    <span className="px-2 py-1 bg-gray-50 text-gray-500 rounded text-xs">
                      +{caseItem.reshootList.length - 3} 更多
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
