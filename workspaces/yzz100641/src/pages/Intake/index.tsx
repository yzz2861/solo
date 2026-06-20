import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { RequestCard } from '@/components/common/RequestCard';
import { GradingBadge } from '@/components/common/GradingBadge';
import { GradingLevel, RequestStatus, GRADING_LEVEL_LABELS, REQUEST_STATUS_LABELS } from '@/types';
import { Upload, FileText, Plus, Search, Filter, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function IntakePage() {
  const { requests, loadData, addNewRequest, addBatchRequests, gradeSingleRequest } = useAppStore();
  const [activeTab, setActiveTab] = useState<'list' | 'import'>('list');
  const [searchText, setSearchText] = useState('');
  const [levelFilter, setLevelFilter] = useState<GradingLevel | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  const [singleContent, setSingleContent] = useState('');
  const [batchContent, setBatchContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const handleSingleSubmit = () => {
    if (!singleContent.trim()) return;
    addNewRequest(singleContent.trim(), 'manual');
    setSingleContent('');
    setActiveTab('list');
  };
  
  const handleBatchSubmit = () => {
    if (!batchContent.trim()) return;
    
    const lines = batchContent.trim().split('\n').filter(line => line.trim());
    const contents = lines.map(line => ({ content: line.trim() }));
    
    if (contents.length > 0) {
      addBatchRequests(contents);
      setBatchContent('');
      setActiveTab('list');
    }
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const lines = content.split('\n').filter(line => line.trim());
      const contents = lines.map(line => ({ content: line.trim() }));
      
      if (contents.length > 0) {
        addBatchRequests(contents);
        setActiveTab('list');
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const filteredRequests = requests.filter(r => {
    if (searchText && !r.content.includes(searchText)) return false;
    if (levelFilter !== 'all') {
      const rLevel = r.confirmedLevel || r.gradingResult?.level;
      if (rLevel !== levelFilter) return false;
    }
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return true;
  });
  
  const levels: Array<GradingLevel | 'all'> = ['all', 'emergency', 'psychology', 'headteacher', 'general', 'review'];
  const statuses: Array<RequestStatus | 'all'> = ['all', 'pending', 'graded', 'confirmed', 'referred', 'closed'];
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">求助导入</h1>
          <p className="text-gray-500 text-sm">导入求助文本，自动分级，待人工确认处理</p>
        </div>
      </div>
      
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('list')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
            activeTab === 'list'
              ? 'border-[#1e3a5f] text-[#1e3a5f]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            求助列表
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
              {requests.length}
            </span>
          </span>
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
            activeTab === 'import'
              ? 'border-[#1e3a5f] text-[#1e3a5f]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          <span className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            导入文本
          </span>
        </button>
      </div>
      
      {activeTab === 'import' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#1e3a5f]" />
              单条录入
            </h3>
            <textarea
              value={singleContent}
              onChange={(e) => setSingleContent(e.target.value)}
              placeholder="粘贴或输入求助文本内容..."
              className="w-full h-40 p-4 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-colors"
            />
            <button
              onClick={handleSingleSubmit}
              disabled={!singleContent.trim()}
              className={cn(
                'mt-4 w-full py-2.5 rounded-lg font-medium transition-all duration-200',
                singleContent.trim()
                  ? 'bg-[#1e3a5f] text-white hover:bg-[#2d5a8f]'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              导入并分级
            </button>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#1e3a5f]" />
              批量导入
            </h3>
            <textarea
              value={batchContent}
              onChange={(e) => setBatchContent(e.target.value)}
              placeholder="每行一条求助文本，系统将自动识别并批量导入..."
              className="w-full h-40 p-4 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-colors"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleBatchSubmit}
                disabled={!batchContent.trim()}
                className={cn(
                  'flex-1 py-2.5 rounded-lg font-medium transition-all duration-200',
                  batchContent.trim()
                    ? 'bg-[#1e3a5f] text-white hover:bg-[#2d5a8f]'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}
              >
                批量导入
              </button>
              <label className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-full py-2.5 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-center cursor-pointer flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" />
                  上传文件
                </div>
              </label>
            </div>
            <p className="mt-3 text-xs text-gray-400">
              支持 .txt 或 .csv 文件，每行一条求助内容
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="搜索求助内容..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                />
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'px-4 py-2 border rounded-lg text-sm font-medium flex items-center gap-2 transition-colors',
                  showFilters
                    ? 'border-[#1e3a5f] text-[#1e3a5f] bg-[#1e3a5f]/5'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                )}
              >
                <Filter className="w-4 h-4" />
                筛选
                <ChevronDown className={cn('w-4 h-4 transition-transform', showFilters && 'rotate-180')} />
              </button>
              
              {(levelFilter !== 'all' || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setLevelFilter('all');
                    setStatusFilter('all');
                  }}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-red-500 flex items-center gap-1 transition-colors"
                >
                  <X className="w-4 h-4" />
                  清除筛选
                </button>
              )}
            </div>
            
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-6">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-2 block">分级</label>
                  <div className="flex flex-wrap gap-2">
                    {levels.map((level) => (
                      <button
                        key={level}
                        onClick={() => setLevelFilter(level)}
                        className={cn(
                          'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                          levelFilter === level
                            ? 'bg-[#1e3a5f] text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                      >
                        {level === 'all' ? '全部' : GRADING_LEVEL_LABELS[level]}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-2 block">状态</label>
                  <div className="flex flex-wrap gap-2">
                    {statuses.map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={cn(
                          'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                          statusFilter === status
                            ? 'bg-[#1e3a5f] text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                      >
                        {status === 'all' ? '全部' : REQUEST_STATUS_LABELS[status]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {filteredRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 mb-2">暂无符合条件的求助记录</p>
              <button
                onClick={() => setActiveTab('import')}
                className="text-[#1e3a5f] text-sm font-medium hover:underline"
              >
                去导入求助文本
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
