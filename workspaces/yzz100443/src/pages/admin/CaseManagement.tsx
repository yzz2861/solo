import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  Filter,
  Search,
} from 'lucide-react';
import { caseApi } from '../../services/api';
import { FRAUD_TYPE_LABELS, type FraudType } from '../../../shared/types';

interface CaseItem {
  id: number;
  title: string;
  fraudType: FraudType;
  description: string;
  difficulty: number;
  sortOrder: number;
  isActive: boolean;
}

export default function CaseManagement() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FraudType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    loadCases();
  }, [showInactive]);

  const loadCases = async () => {
    try {
      const data = await caseApi.list(showInactive);
      setCases(data as CaseItem[]);
    } catch (err) {
      console.error('加载案例失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`确定要删除案例「${title}」吗？`)) return;
    
    try {
      await caseApi.delete(id);
      loadCases();
    } catch (err) {
      alert('删除失败：' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      await caseApi.update(id, { isActive: !isActive });
      loadCases();
    } catch (err) {
      alert('操作失败');
    }
  };

  const filteredCases = cases.filter((c) => {
    if (filter !== 'all' && c.fraudType !== filter) return false;
    if (search && !c.title.includes(search) && !c.description.includes(search)) return false;
    return true;
  });

  const difficultyLabels = { 1: '简单', 2: '中等', 3: '困难' };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">案例管理</h1>
          <p className="text-gray-500">管理防诈骗教学案例，可添加、编辑、排序</p>
        </div>
        <button
          onClick={() => navigate('/admin/cases/new')}
          className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
        >
          <Plus className="w-5 h-5" />
          新建案例
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-4 border-b flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索案例..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 outline-none"
            >
              <option value="all">全部类型</option>
              {Object.entries(FRAUD_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-gray-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            显示已停用
          </label>
        </div>

        <div className="divide-y">
          {filteredCases.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              暂无案例，点击右上角新建案例
            </div>
          ) : (
            filteredCases.map((caseItem) => (
              <div
                key={caseItem.id}
                className={`p-5 flex items-center gap-4 hover:bg-gray-50 transition-colors ${
                  !caseItem.isActive ? 'opacity-50' : ''
                }`}
              >
                <div className="cursor-grab text-gray-300 hover:text-gray-500">
                  <GripVertical className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-800">{caseItem.title}</h3>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {FRAUD_TYPE_LABELS[caseItem.fraudType]}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        caseItem.difficulty === 1
                          ? 'bg-green-100 text-green-700'
                          : caseItem.difficulty === 2
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {difficultyLabels[caseItem.difficulty as 1 | 2 | 3]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{caseItem.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(caseItem.id, caseItem.isActive)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      caseItem.isActive
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {caseItem.isActive ? '已启用' : '已停用'}
                  </button>
                  <button
                    onClick={() => navigate(`/admin/cases/${caseItem.id}/edit`)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(caseItem.id, caseItem.title)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t text-sm text-gray-500">
          共 {filteredCases.length} 个案例
        </div>
      </div>
    </div>
  );
}
