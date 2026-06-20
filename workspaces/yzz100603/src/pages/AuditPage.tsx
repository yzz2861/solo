import { useState } from 'react';
import { ClipboardCheck, Search, Filter, Eye, AlertTriangle, CheckCircle, User } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { RecordDetailModal } from '@/components/RecordDetailModal';
import type { ShiftRecord } from '@/types';
import { formatNumber, formatDoseUnit } from '@/utils/unitConversion';

export default function AuditPage() {
  const { records, users } = useAppStore();
  const [selectedRecord, setSelectedRecord] = useState<ShiftRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: 'all',
    operatorId: '',
    violationOnly: false,
  });

  const admins = users.filter((u) => u.role === 'admin');

  const filteredRecords = records.filter((record) => {
    if (filters.violationOnly && !record.hasBoundaryViolation) return false;
    if (filters.operatorId && record.operatorId !== filters.operatorId) return false;

    if (filters.dateRange !== 'all') {
      const now = new Date();
      const recordDate = new Date(record.createdAt);
      const diffDays = Math.floor((now.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));

      if (filters.dateRange === 'today' && diffDays > 0) return false;
      if (filters.dateRange === 'week' && diffDays > 7) return false;
      if (filters.dateRange === 'month' && diffDays > 30) return false;
    }

    return true;
  });

  const violationCount = records.filter((r) => r.hasBoundaryViolation).length;
  const totalRecords = records.length;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleViewDetail = (record: ShiftRecord) => {
    setSelectedRecord(record);
    setDetailOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardCheck className="w-7 h-7 text-amber-600" />
            主管抽查
          </h1>
          <p className="text-gray-500 mt-1">审计交班记录，核查安全边界执行情况</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">总记录数</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{totalRecords}</p>
            </div>
            <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-sky-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">越界记录</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{violationCount}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">合规率</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {totalRecords > 0
                  ? ((totalRecords - violationCount) / totalRecords) * 100
                  : 0
                }
                %
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">筛选条件</span>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">时间范围：</label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            >
              <option value="all">全部</option>
              <option value="today">今天</option>
              <option value="week">近7天</option>
              <option value="month">近30天</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">值班人员：</label>
            <select
              value={filters.operatorId}
              onChange={(e) => setFilters({ ...filters, operatorId: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            >
              <option value="">全部人员</option>
              {admins.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.violationOnly}
              onChange={(e) => setFilters({ ...filters, violationOnly: e.target.checked })}
              className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
            />
            <span className="text-sm text-gray-600">仅显示越界记录</span>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">日期时间</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">计算人</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">投加人</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">药剂</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">投加量</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">投加前/后余氯</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">状态</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>暂无符合条件的记录</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      record.hasBoundaryViolation ? 'bg-red-50/50' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatDate(record.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-sky-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-sky-600" />
                        </div>
                        <span className="text-sm text-gray-700">{record.calculatorName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="text-sm text-gray-700">{record.operatorName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                      {record.chemicalName}
                    </td>
                    <td className="px-4 py-3 text-sm text-center font-mono font-medium text-sky-700">
                      {formatNumber(record.calculatedDose)} {formatDoseUnit(record.doseUnit)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className="text-gray-500">
                        {record.currentChlorine !== null
                          ? formatNumber(record.currentChlorine)
                          : '-'}
                      </span>
                      <span className="mx-1 text-gray-400">→</span>
                      <span className="text-green-600 font-medium">
                        {record.postChlorine !== null
                          ? formatNumber(record.postChlorine)
                          : '-'}
                      </span>
                      <span className="text-gray-400 text-xs ml-1">mg/L</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {record.hasBoundaryViolation ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          越界
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                          <CheckCircle className="w-3 h-3" />
                          合规
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleViewDetail(record)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-sky-600 hover:bg-sky-50 rounded-md transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        详情
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
          共 {filteredRecords.length} 条记录，其中越界{' '}
          {filteredRecords.filter((r) => r.hasBoundaryViolation).length} 条
        </div>
      </div>

      <RecordDetailModal
        record={selectedRecord}
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedRecord(null);
        }}
      />
    </div>
  );
}
