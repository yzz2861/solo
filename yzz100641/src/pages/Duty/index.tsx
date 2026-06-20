import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { RequestCard } from '@/components/common/RequestCard';
import { GradingBadge } from '@/components/common/GradingBadge';
import { 
  GradingLevel, 
  GRADING_LEVEL_LABELS,
  GRADING_LEVEL_COLORS,
  RequestStatus
} from '@/types';
import { 
  AlertTriangle, 
  Brain, 
  Users, 
  MessageCircle, 
  Search,
  Clock,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface QueueItem {
  level: GradingLevel;
  title: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const queues: QueueItem[] = [
  {
    level: 'emergency',
    title: '紧急联系',
    icon: <AlertTriangle className="w-5 h-5" />,
    color: 'border-red-500 bg-red-50',
    description: '有自伤、自杀倾向或严重身体不适，需立即联系处理',
  },
  {
    level: 'psychology',
    title: '心理老师关注',
    icon: <Brain className="w-5 h-5" />,
    color: 'border-orange-500 bg-orange-50',
    description: '存在抑郁、焦虑等心理困扰，需心理老师介入',
  },
  {
    level: 'headteacher',
    title: '班主任跟进',
    icon: <Users className="w-5 h-5" />,
    color: 'border-yellow-500 bg-yellow-50',
    description: '宿舍矛盾、学业压力等，需班主任协调处理',
  },
  {
    level: 'general',
    title: '普通咨询',
    icon: <MessageCircle className="w-5 h-5" />,
    color: 'border-green-500 bg-green-50',
    description: '一般性咨询问题，可正常流程处理',
  },
  {
    level: 'review',
    title: '人工复核',
    icon: <Search className="w-5 h-5" />,
    color: 'border-gray-500 bg-gray-50',
    description: '疑似玩笑、信息不足或转述情况，需人工复核',
  },
];

export default function DutyPage() {
  const navigate = useNavigate();
  const { requests, loadData, gradeAllPending, confirmGrading, closeRequest } = useAppStore();
  const [activeQueue, setActiveQueue] = useState<GradingLevel | 'all'>('all');
  const [onlyPending, setOnlyPending] = useState(true);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const pendingCount = requests.filter(r => r.status === 'graded' || r.status === 'pending').length;
  
  const pendingRequests = requests.filter(r => {
    if (onlyPending && r.status !== 'graded' && r.status !== 'pending') return false;
    
    if (activeQueue !== 'all') {
      const level = r.confirmedLevel || r.gradingResult?.level;
      if (level !== activeQueue) return false;
    }
    
    return true;
  });
  
  const getQueueCount = (level: GradingLevel) => {
    return requests.filter(r => {
      if (onlyPending && r.status !== 'graded' && r.status !== 'pending') return false;
      const rLevel = r.confirmedLevel || r.gradingResult?.level;
      return rLevel === level;
    }).length;
  };
  
  const handleQuickConfirm = (id: string, level: GradingLevel) => {
    confirmGrading(id, level);
  };
  
  const handleQuickClose = (id: string) => {
    closeRequest(id, '值班快速处理');
  };
  
  const handleGradeAll = () => {
    gradeAllPending();
  };
  
  const hasPending = requests.some(r => r.status === 'pending');
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">值班处理</h1>
          <p className="text-gray-500 text-sm">按优先级处理求助，分级仅作参考，需人工确认</p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={onlyPending}
              onChange={(e) => setOnlyPending(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#1e3a5f] focus:ring-[#1e3a5f]"
            />
            只看待处理
          </label>
          
          {hasPending && (
            <button
              onClick={handleGradeAll}
              className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8f] transition-colors flex items-center gap-2"
            >
              <Clock className="w-4 h-4" />
              分级全部待处理
            </button>
          )}
        </div>
      </div>
      
      {pendingCount > 0 && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-800">
              有 <span className="font-bold">{pendingCount}</span> 条求助等待人工确认
            </p>
            <p className="text-xs text-orange-600">请优先处理紧急和高风险求助，分级结果仅供参考</p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        <button
          onClick={() => setActiveQueue('all')}
          className={cn(
            'p-4 rounded-xl border-2 text-left transition-all duration-200',
            activeQueue === 'all'
              ? 'border-[#1e3a5f] bg-[#1e3a5f]/5'
              : 'border-gray-100 bg-white hover:border-gray-200'
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={cn(
              'text-sm font-medium',
              activeQueue === 'all' ? 'text-[#1e3a5f]' : 'text-gray-700'
            )}>
              全部
            </span>
            <span className="text-lg font-bold text-gray-800">
              {pendingRequests.length}
            </span>
          </div>
          <p className="text-xs text-gray-400">所有待处理求助</p>
        </button>
        
        {queues.map((queue) => (
          <button
            key={queue.level}
            onClick={() => setActiveQueue(queue.level)}
            className={cn(
              'p-4 rounded-xl border-2 text-left transition-all duration-200',
              activeQueue === queue.level
                ? queue.color
                : 'border-gray-100 bg-white hover:border-gray-200'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={cn(
                'text-sm font-medium flex items-center gap-1.5',
                activeQueue === queue.level ? 'text-gray-800' : 'text-gray-700'
              )}>
                <span className={cn('w-2 h-2 rounded-full', GRADING_LEVEL_COLORS[queue.level])} />
                {queue.title}
              </span>
              <span className="text-lg font-bold text-gray-800">
                {getQueueCount(queue.level)}
              </span>
            </div>
            <p className="text-xs text-gray-500 line-clamp-2">{queue.description}</p>
          </button>
        ))}
      </div>
      
      {pendingRequests.length > 0 ? (
        <div className="space-y-4">
          {pendingRequests.map((request) => {
            const level = request.confirmedLevel || request.gradingResult?.level || 'general';
            
            return (
              <div
                key={request.id}
                className={cn(
                  'bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all duration-200',
                  request.status === 'graded' && 'ring-2 ring-orange-200'
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <GradingBadge level={level} size="md" pulse={request.status === 'graded'} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-700 text-sm mb-2 line-clamp-2 leading-relaxed">
                      {request.content.substring(0, 150)}
                      {request.content.length > 150 && '...'}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(request.submitTime), 'MM-dd HH:mm', { locale: zhCN })}
                      </span>
                      
                      {request.status === 'graded' && (
                        <span className="text-orange-500 font-medium">待确认</span>
                      )}
                      {request.status === 'pending' && (
                        <span className="text-gray-500">待分级</span>
                      )}
                      
                      {request.gradingResult && (
                        <span className="text-gray-400">
                          置信度 {request.gradingResult.confidence}%
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {request.status === 'graded' && (
                      <>
                        <button
                          onClick={() => handleQuickConfirm(request.id, level)}
                          className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          确认
                        </button>
                        <button
                          onClick={() => handleQuickClose(request.id)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                        >
                          标记处理
                        </button>
                      </>
                    )}
                    
                    <button
                      onClick={() => navigate(`/intake/${request.id}`)}
                      className="px-3 py-1.5 bg-[#1e3a5f]/5 text-[#1e3a5f] rounded-lg text-xs font-medium hover:bg-[#1e3a5f]/10 transition-colors"
                    >
                      详情
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
          <p className="text-gray-700 font-medium mb-1">太棒了！</p>
          <p className="text-gray-500 text-sm">当前没有待处理的求助</p>
        </div>
      )}
    </div>
  );
}
