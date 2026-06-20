import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText, Search, Filter, ArrowRight, PlusCircle, Camera, CheckCircle, Clock,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { caseApi } from '../api/client';
import type { Case } from '../types';
import {
  cn,
  formatDate,
  getConfidenceColor,
  getConfidenceLabel,
  getStatusLabel,
  getStatusColor,
} from '../utils';

const statusFilters = [
  { value: '', label: '全部状态' },
  { value: 'draft', label: '草稿' },
  { value: 'confirmed', label: '已确认' },
  { value: 'reshoot-pending', label: '待补拍' },
  { value: 'reshoot-completed', label: '补拍完成' },
];

export default function CaseList() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [cases, setCases] = useState<Case[]>([]);
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState<'' | 'high' | 'medium' | 'low'>('');

  useEffect(() => {
    loadCases();
  }, [user]);

  useEffect(() => {
    filterCases();
  }, [cases, searchTerm, statusFilter, confidenceFilter]);

  const loadCases = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await caseApi.list({ surveyorId: user.id });
      setCases(response.data);
      setFilteredCases(response.data);
    } catch (error) {
      console.error('Failed to load cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCases = () => {
    let filtered = [...cases];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.plateNumber.toLowerCase().includes(term) ||
        c.originalDescription.toLowerCase().includes(term)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    if (confidenceFilter) {
      if (confidenceFilter === 'high') {
        filtered = filtered.filter(c => c.confidenceScore >= 0.7);
      } else if (confidenceFilter === 'medium') {
        filtered = filtered.filter(c => c.confidenceScore >= 0.5 && c.confidenceScore < 0.7);
      } else {
        filtered = filtered.filter(c => c.confidenceScore < 0.5);
      }
    }

    setFilteredCases(filtered);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">案件列表</h2>
          <p className="text-gray-500 mt-1">共 {cases.length} 个案件</p>
        </div>
        <button
          onClick={() => navigate('/create')}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
        >
          <PlusCircle className="w-5 h-5" />
          新建案件
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索车牌号、事故描述..."
              className="w-full pl-12 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-0 outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-0 outline-none bg-white"
          >
            {statusFilters.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>

          <select
            value={confidenceFilter}
            onChange={(e) => setConfidenceFilter(e.target.value as any)}
            className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-0 outline-none bg-white"
          >
            <option value="">全部置信度</option>
            <option value="high">高置信</option>
            <option value="medium">中置信</option>
            <option value="low">低置信</option>
          </select>
        </div>
      </div>

      {filteredCases.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">暂无案件</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || statusFilter || confidenceFilter
              ? '没有找到匹配的案件'
              : '还没有创建任何案件'}
          </p>
          <button
            onClick={() => navigate('/create')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <PlusCircle className="w-5 h-5" />
            创建第一个案件
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCases.map((caseItem, index) => (
            <motion.div
              key={caseItem.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(`/cases/${caseItem.id}`)}
              className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      caseItem.status === 'confirmed' ? 'bg-success-100' :
                      caseItem.status === 'reshoot-pending' ? 'bg-warning-100' :
                      caseItem.status === 'reshoot-completed' ? 'bg-primary-100' :
                      'bg-gray-100'
                    )}>
                      {caseItem.status === 'confirmed' ? (
                        <CheckCircle className="w-6 h-6 text-success-600" />
                      ) : caseItem.status === 'reshoot-pending' || caseItem.status === 'reshoot-completed' ? (
                        <Camera className="w-6 h-6 text-orange-600" />
                      ) : (
                        <Clock className="w-6 h-6 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-800 text-lg">
                          {caseItem.plateNumber}
                        </span>
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          getStatusColor(caseItem.status)
                        )}>
                          {getStatusLabel(caseItem.status)}
                        </span>
                        {caseItem.confidenceScore < 0.7 && (
                          <span className="px-2 py-0.5 bg-danger-100 text-danger-700 rounded-full text-xs font-medium">
                            低置信
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {caseItem.id} · {formatDate(caseItem.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      'text-2xl font-bold',
                      getConfidenceColor(caseItem.confidenceScore)
                    )}>
                      {Math.round(caseItem.confidenceScore * 100)}%
                    </div>
                    <div className="text-xs text-gray-400">
                      {getConfidenceLabel(caseItem.confidenceScore)}
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {caseItem.originalDescription}
                </p>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {caseItem.lowConfidenceFlags.slice(0, 3).map((flag, i) => (
                      <span
                        key={i}
                        className={cn(
                          "px-2 py-1 rounded text-xs font-medium",
                          flag.severity === 'high' ? "bg-danger-100 text-danger-700" :
                          flag.severity === 'medium' ? "bg-warning-100 text-warning-700" :
                          "bg-gray-100 text-gray-700"
                        )}
                      >
                        {flag.message}
                      </span>
                    ))}
                    {caseItem.lowConfidenceFlags.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        +{caseItem.lowConfidenceFlags.length - 3}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-primary-600 text-sm font-medium">
                    查看详情 <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
