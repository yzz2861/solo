import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { 
  ReferralStatus, 
  ReferralType,
  REFERRAL_STATUS_LABELS,
  REFERRAL_TYPE_LABELS,
  GRADING_LEVEL_LABELS
} from '@/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  Send, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  Filter,
  User,
  MessageSquare,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

const statusIcons: Record<ReferralStatus, React.ReactNode> = {
  pending: <Clock className="w-4 h-4" />,
  accepted: <CheckCircle2 className="w-4 h-4" />,
  completed: <CheckCircle2 className="w-4 h-4" />,
  rejected: <XCircle className="w-4 h-4" />,
};

const statusColors: Record<ReferralStatus, string> = {
  pending: 'text-orange-600 bg-orange-50',
  accepted: 'text-blue-600 bg-blue-50',
  completed: 'text-green-600 bg-green-50',
  rejected: 'text-red-600 bg-red-50',
};

export default function ReferralsPage() {
  const { referrals, requests, loadData, updateReferralStatus } = useAppStore();
  const [statusFilter, setStatusFilter] = useState<ReferralStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ReferralType | 'all'>('all');
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const filteredReferrals = referrals
    .filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (typeFilter !== 'all' && r.referralType !== typeFilter) return false;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const getRequestById = (id: string) => requests.find(r => r.id === id);
  
  const statuses: Array<ReferralStatus | 'all'> = ['all', 'pending', 'accepted', 'completed', 'rejected'];
  const types: Array<ReferralType | 'all'> = ['all', 'psychology', 'headteacher', 'other'];
  
  const stats = {
    total: referrals.length,
    pending: referrals.filter(r => r.status === 'pending').length,
    completed: referrals.filter(r => r.status === 'completed').length,
  };
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">转介记录</h1>
          <p className="text-gray-500 text-sm">查看和管理所有转介记录，追踪处理状态</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Send className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">总转介数</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">待处理</p>
              <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">已完成</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">筛选：</span>
          </div>
          
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
                {status === 'all' ? '全部状态' : REFERRAL_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
          
          <div className="w-px h-6 bg-gray-200" />
          
          <div className="flex flex-wrap gap-2">
            {types.map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  typeFilter === type
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {type === 'all' ? '全部类型' : REFERRAL_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {filteredReferrals.length > 0 ? (
        <div className="space-y-4">
          {filteredReferrals.map((referral) => {
            const request = getRequestById(referral.requestId);
            const level = request?.confirmedLevel || request?.gradingResult?.level;
            
            return (
              <div
                key={referral.id}
                className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Send className="w-6 h-6 text-purple-500" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          'px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1',
                          statusColors[referral.status]
                        )}>
                          {statusIcons[referral.status]}
                          {REFERRAL_STATUS_LABELS[referral.status]}
                        </span>
                        
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                          {REFERRAL_TYPE_LABELS[referral.referralType]}
                        </span>
                        
                        {level && (
                          <span className="text-xs text-gray-500">
                            {GRADING_LEVEL_LABELS[level]}
                          </span>
                        )}
                      </div>
                      
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(referral.createdAt), 'MM-dd HH:mm', { locale: zhCN })}
                      </span>
                    </div>
                    
                    {request && (
                      <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                        {request.content.substring(0, 150)}
                        {request.content.length > 150 && '...'}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">
                          由 <span className="text-gray-700 font-medium">{referral.fromRole}</span>
                          <ArrowRight className="w-3 h-3 inline mx-1" />
                          <span className="text-gray-700 font-medium">{referral.toRole}</span>
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500 line-clamp-1">
                          {referral.reason}
                        </span>
                      </div>
                    </div>
                    
                    {referral.status === 'pending' && (
                      <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                        <button
                          onClick={() => updateReferralStatus(referral.id, 'accepted', '已接收，正在处理')}
                          className="px-4 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          接收
                        </button>
                        <button
                          onClick={() => updateReferralStatus(referral.id, 'completed', '已处理完成')}
                          className="px-4 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          完成
                        </button>
                        <button
                          onClick={() => updateReferralStatus(referral.id, 'rejected', '退回，不属职责范围')}
                          className="px-4 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          退回
                        </button>
                      </div>
                    )}
                    
                    {(referral.handledAt || referral.handleRemark) && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          {referral.handledBy && (
                            <span className="mr-3">处理人：{referral.handledBy}</span>
                          )}
                          {referral.handledAt && (
                            <span>
                              处理时间：{format(new Date(referral.handledAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                            </span>
                          )}
                        </p>
                        {referral.handleRemark && (
                          <p className="text-xs text-gray-500 mt-1">
                            处理备注：{referral.handleRemark}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 mb-2">暂无符合条件的转介记录</p>
          <p className="text-sm text-gray-400">转介记录将在这里显示</p>
        </div>
      )}
    </div>
  );
}
