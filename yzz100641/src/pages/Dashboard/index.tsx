import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { GradingBadge } from '@/components/common/GradingBadge';
import { RequestCard } from '@/components/common/RequestCard';
import { 
  GRADING_LEVEL_LABELS, 
  GRADING_LEVEL_COLORS,
  GradingLevel,
  RequestStatus
} from '@/types';
import { AlertTriangle, Clock, CheckCircle2, ArrowRight, FileText, Users } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}

function StatCard({ title, value, icon, color, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-lg transition-all duration-300 cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-500 text-sm font-medium">{title}</span>
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-800">{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { requests, loadData } = useAppStore();
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const todayRequests = requests.filter(r => isToday(new Date(r.submitTime)));
  
  const levelCounts: Record<GradingLevel, number> = {
    emergency: 0,
    psychology: 0,
    headteacher: 0,
    general: 0,
    review: 0,
  };
  
  requests.forEach(r => {
    const level = r.confirmedLevel || r.gradingResult?.level;
    if (level) {
      levelCounts[level]++;
    }
  });
  
  const statusCounts: Record<RequestStatus, number> = {
    pending: 0,
    grading: 0,
    graded: 0,
    confirmed: 0,
    referred: 0,
    closed: 0,
  };
  
  requests.forEach(r => {
    statusCounts[r.status]++;
  });
  
  const pendingGraded = requests.filter(r => r.status === 'graded');
  const urgentRequests = requests.filter(r => {
    const level = r.confirmedLevel || r.gradingResult?.level;
    return (level === 'emergency' || level === 'psychology') && r.status !== 'closed';
  }).slice(0, 6);
  
  const levels: GradingLevel[] = ['emergency', 'psychology', 'headteacher', 'general', 'review'];
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          值班总览
        </h1>
        <p className="text-gray-500">
          {format(new Date(), 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="今日新求助"
          value={todayRequests.length}
          icon={<FileText className="w-5 h-5" />}
          color="bg-blue-500"
          onClick={() => navigate('/intake')}
        />
        <StatCard
          title="待人工确认"
          value={pendingGraded.length}
          icon={<Clock className="w-5 h-5" />}
          color="bg-orange-500"
          onClick={() => navigate('/duty')}
        />
        <StatCard
          title="紧急/高风险"
          value={levelCounts.emergency + levelCounts.psychology}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="bg-red-500"
          onClick={() => navigate('/duty')}
        />
        <StatCard
          title="已处理完成"
          value={statusCounts.closed}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="bg-green-500"
          onClick={() => navigate('/intake')}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800">分级分布</h2>
            <button
              onClick={() => navigate('/intake')}
              className="text-sm text-[#1e3a5f] hover:text-[#2d5a8f] flex items-center gap-1 transition-colors"
            >
              查看全部 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-4">
            {levels.map((level) => (
              <div key={level} className="flex items-center gap-4">
                <GradingBadge level={level} size="md" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${GRADING_LEVEL_COLORS[level]} transition-all duration-500 rounded-full`}
                      style={{
                        width: `${requests.length > 0 ? (levelCounts[level] / requests.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-600 w-12 text-right">
                  {levelCounts[level]}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">处理状态</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">待分级</span>
              <span className="text-sm font-medium text-gray-800">{statusCounts.pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">已分级待确认</span>
              <span className="text-sm font-medium text-orange-600">{statusCounts.graded}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">已确认</span>
              <span className="text-sm font-medium text-green-600">{statusCounts.confirmed}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">已转介</span>
              <span className="text-sm font-medium text-purple-600">{statusCounts.referred}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">已处理完成</span>
              <span className="text-sm font-medium text-gray-800">{statusCounts.closed}</span>
            </div>
            
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800">总计</span>
                <span className="text-sm font-bold text-[#1e3a5f]">{requests.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            紧急/高风险求助（待处理）
          </h2>
          <button
            onClick={() => navigate('/duty')}
            className="text-sm text-[#1e3a5f] hover:text-[#2d5a8f] flex items-center gap-1 transition-colors"
          >
            去处理 <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        
        {urgentRequests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {urgentRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>暂无紧急求助需要处理</p>
          </div>
        )}
      </div>
    </div>
  );
}
