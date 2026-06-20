import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { exportToExcel, exportToCsv, exportDutyList } from '@/utils/export';
import { 
  GradingLevel, 
  RequestStatus,
  GRADING_LEVEL_LABELS,
  REQUEST_STATUS_LABELS
} from '@/types';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Shield,
  Calendar,
  CheckSquare,
  ChevronDown,
  AlertCircle,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ExportPage() {
  const { requests, referrals, currentUser, loadData } = useAppStore();
  
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedLevels, setSelectedLevels] = useState<GradingLevel[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<RequestStatus[]>([]);
  const [maskSensitive, setMaskSensitive] = useState(true);
  const [includeReferrals, setIncludeReferrals] = useState(true);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [reviewerName, setReviewerName] = useState(currentUser);
  const [showPreview, setShowPreview] = useState(false);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const levels: GradingLevel[] = ['emergency', 'psychology', 'headteacher', 'general', 'review'];
  const statuses: RequestStatus[] = ['pending', 'graded', 'confirmed', 'referred', 'closed'];
  
  const toggleLevel = (level: GradingLevel) => {
    setSelectedLevels(prev => 
      prev.includes(level) 
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };
  
  const toggleStatus = (status: RequestStatus) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };
  
  const filteredRequests = requests.filter(r => {
    const submitDate = new Date(r.submitTime);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    if (submitDate < start || submitDate > end) return false;
    
    if (selectedLevels.length > 0) {
      const rLevel = r.confirmedLevel || r.gradingResult?.level;
      if (rLevel && !selectedLevels.includes(rLevel)) return false;
    }
    
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(r.status)) return false;
    
    return true;
  });
  
  const filteredReferrals = includeReferrals ? referrals.filter(r => {
    const createdAt = new Date(r.createdAt);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return createdAt >= start && createdAt <= end;
  }) : [];
  
  const handleExport = () => {
    if (exportFormat === 'xlsx') {
      exportToExcel(filteredRequests, filteredReferrals, maskSensitive, includeReferrals);
    } else {
      exportToCsv(filteredRequests, filteredReferrals, maskSensitive, includeReferrals);
    }
  };
  
  const handleExportDutyList = () => {
    const todayRequests = requests.filter(r => {
      const submitDate = new Date(r.submitTime);
      const today = new Date();
      return (
        submitDate.getFullYear() === today.getFullYear() &&
        submitDate.getMonth() === today.getMonth() &&
        submitDate.getDate() === today.getDate()
      );
    });
    
    if (todayRequests.length === 0) {
      alert('今日暂无求助记录');
      return;
    }
    
    exportDutyList(todayRequests, new Date(), reviewerName);
  };
  
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">导出中心</h1>
        <p className="text-gray-500 text-sm">导出求助记录和值班清单，支持脱敏处理</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#1e3a5f]" />
              时间范围
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">开始日期</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">结束日期</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-[#1e3a5f]" />
              分级筛选
            </h3>
            <div className="flex flex-wrap gap-2">
              {levels.map((level) => (
                <button
                  key={level}
                  onClick={() => toggleLevel(level)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border-2',
                    selectedLevels.includes(level) || selectedLevels.length === 0
                      ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  )}
                >
                  {GRADING_LEVEL_LABELS[level]}
                </button>
              ))}
            </div>
            {selectedLevels.length === 0 && (
              <p className="text-xs text-gray-400 mt-2">未选择则导出全部分级</p>
            )}
          </div>
          
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-[#1e3a5f]" />
              状态筛选
            </h3>
            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border-2',
                    selectedStatuses.includes(status) || selectedStatuses.length === 0
                      ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  )}
                >
                  {REQUEST_STATUS_LABELS[status]}
                </button>
              ))}
            </div>
            {selectedStatuses.length === 0 && (
              <p className="text-xs text-gray-400 mt-2">未选择则导出全部状态</p>
            )}
          </div>
          
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#1e3a5f]" />
              导出选项
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">敏感信息脱敏</p>
                    <p className="text-xs text-gray-500">隐藏姓名、班级、联系方式等个人信息</p>
                  </div>
                </div>
                <button
                  onClick={() => setMaskSensitive(!maskSensitive)}
                  className={cn(
                    'w-12 h-6 rounded-full transition-colors duration-200 relative',
                    maskSensitive ? 'bg-[#1e3a5f]' : 'bg-gray-300'
                  )}
                >
                  <div className={cn(
                    'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
                    maskSensitive ? 'translate-x-6' : 'translate-x-0.5'
                  )} />
                </button>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">包含转介记录</p>
                    <p className="text-xs text-gray-500">同时导出转介历史和处理状态</p>
                  </div>
                </div>
                <button
                  onClick={() => setIncludeReferrals(!includeReferrals)}
                  className={cn(
                    'w-12 h-6 rounded-full transition-colors duration-200 relative',
                    includeReferrals ? 'bg-[#1e3a5f]' : 'bg-gray-300'
                  )}
                >
                  <div className={cn(
                    'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
                    includeReferrals ? 'translate-x-6' : 'translate-x-0.5'
                  )} />
                </button>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-3">导出格式</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setExportFormat('xlsx')}
                    className={cn(
                      'flex-1 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors flex items-center justify-center gap-2',
                      exportFormat === 'xlsx'
                        ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    )}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => setExportFormat('csv')}
                    className={cn(
                      'flex-1 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors flex items-center justify-center gap-2',
                      exportFormat === 'csv'
                        ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    )}
                  >
                    <FileText className="w-4 h-4" />
                    CSV (.csv)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">导出预览</h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">时间范围</span>
                <span className="text-gray-700 font-medium">
                  {startDate} ~ {endDate}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">求助记录</span>
                <span className="text-gray-700 font-medium">{filteredRequests.length} 条</span>
              </div>
              {includeReferrals && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">转介记录</span>
                  <span className="text-gray-700 font-medium">{filteredReferrals.length} 条</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">脱敏处理</span>
                <span className={cn(
                  'font-medium',
                  maskSensitive ? 'text-green-600' : 'text-orange-600'
                )}>
                  {maskSensitive ? '已启用' : '未启用'}
                </span>
              </div>
            </div>
            
            {maskSensitive && (
              <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700 flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  导出内容将对姓名、班级、联系方式等敏感信息进行脱敏处理
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              <button
                onClick={handleExport}
                disabled={filteredRequests.length === 0}
                className={cn(
                  'w-full py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2',
                  filteredRequests.length > 0
                    ? 'bg-[#1e3a5f] text-white hover:bg-[#2d5a8f]'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}
              >
                <Download className="w-4 h-4" />
                导出 {filteredRequests.length} 条记录
              </button>
              
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="w-full py-2.5 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? '隐藏' : '查看'}数据预览
              </button>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">快速导出</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">值班老师</label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="请输入值班老师姓名"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                />
              </div>
              
              <button
                onClick={handleExportDutyList}
                className="w-full py-3 rounded-lg font-medium bg-purple-500 text-white hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                导出今日值班清单
              </button>
              
              <p className="text-xs text-gray-500">
                值班清单包含：分级、内容摘要、处理结果、复核人
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {showPreview && filteredRequests.length > 0 && (
        <div className="mt-8 bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">数据预览（前5条）</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">提交时间</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">内容摘要</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">分级</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">状态</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.slice(0, 5).map((request) => {
                  const level = request.confirmedLevel || request.gradingResult?.level || 'general';
                  return (
                    <tr key={request.id} className="border-b border-gray-50">
                      <td className="py-3 px-4 text-gray-600">
                        {format(new Date(request.submitTime), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                      </td>
                      <td className="py-3 px-4 text-gray-700 max-w-md truncate">
                        {request.content.substring(0, 50)}...
                      </td>
                      <td className="py-3 px-4">
                        {GRADING_LEVEL_LABELS[level]}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {REQUEST_STATUS_LABELS[request.status]}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
