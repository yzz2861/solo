import { useState } from 'react';
import { FileText, Eye, Printer, AlertTriangle, CheckCircle, Search } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { RecordDetailModal } from '@/components/RecordDetailModal';
import type { ShiftRecord } from '@/types';
import { formatNumber, formatDoseUnit } from '@/utils/unitConversion';

export default function RecordsPage() {
  const { records, currentUser, markAsPrinted } = useAppStore();
  const [selectedRecord, setSelectedRecord] = useState<ShiftRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRecords = records.filter((record) => {
    if (!searchTerm) return true;
    return (
      record.calculatorName.includes(searchTerm) ||
      record.operatorName.includes(searchTerm) ||
      record.chemicalName.includes(searchTerm)
    );
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
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

  const handlePrint = (record: ShiftRecord) => {
    setSelectedRecord(record);
    markAsPrinted(record.id);
    window.print();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-7 h-7 text-sky-600" />
            交班记录
          </h1>
          <p className="text-gray-500 mt-1">查看和管理所有加药交班记录</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索值班人员或药剂..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none w-64"
          />
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
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">投加前余氯</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">投加后余氯</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">状态</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>暂无交班记录</p>
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
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {record.calculatorName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {record.operatorName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                      {record.chemicalName}
                    </td>
                    <td className="px-4 py-3 text-sm text-center font-mono font-medium text-sky-700">
                      {formatNumber(record.calculatedDose)} {formatDoseUnit(record.doseUnit)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {record.currentChlorine !== null
                        ? `${formatNumber(record.currentChlorine)} mg/L`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {record.postChlorine !== null
                        ? `${formatNumber(record.postChlorine)} mg/L`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {record.hasBoundaryViolation ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                          <AlertTriangle className="w-3 h-3" />
                          越界
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          正常
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleViewDetail(record)}
                          className="p-1.5 text-sky-600 hover:bg-sky-50 rounded transition-colors"
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePrint(record)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="打印"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
          共 {filteredRecords.length} 条记录
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
