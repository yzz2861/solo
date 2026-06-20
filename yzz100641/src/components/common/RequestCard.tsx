import React from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { HelpRequest, REQUEST_STATUS_LABELS } from '@/types';
import { GradingBadge } from './GradingBadge';
import { getContentSummary } from '@/utils/text';
import { cn } from '@/lib/utils';
import { Clock, FileText, User, CheckCircle2, Send } from 'lucide-react';

interface RequestCardProps {
  request: HelpRequest;
  onClick?: () => void;
  className?: string;
}

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5" />,
  grading: <Clock className="w-3.5 h-3.5 animate-spin" />,
  graded: <FileText className="w-3.5 h-3.5" />,
  confirmed: <User className="w-3.5 h-3.5" />,
  referred: <Send className="w-3.5 h-3.5" />,
  closed: <CheckCircle2 className="w-3.5 h-3.5" />,
};

const statusColors: Record<string, string> = {
  pending: 'text-gray-500',
  grading: 'text-blue-500',
  graded: 'text-indigo-500',
  confirmed: 'text-green-600',
  referred: 'text-purple-500',
  closed: 'text-gray-400',
};

export function RequestCard({ request, onClick, className }: RequestCardProps) {
  const level = request.confirmedLevel || request.gradingResult?.level || 'general';
  const summary = getContentSummary(request.content, 80);
  const submitDate = new Date(request.submitTime);
  
  const cardContent = (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-100 p-4',
        'hover:shadow-lg hover:border-gray-200 transition-all duration-300',
        'cursor-pointer group',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <GradingBadge level={level} size="sm" pulse={request.status === 'graded'} />
        
        <div className={cn(
          'flex items-center gap-1 text-xs',
          statusColors[request.status]
        )}>
          {statusIcons[request.status]}
          <span>{REQUEST_STATUS_LABELS[request.status]}</span>
        </div>
      </div>
      
      <p className="text-gray-700 text-sm mb-3 line-clamp-3 leading-relaxed group-hover:text-gray-900 transition-colors">
        {summary}
      </p>
      
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {format(submitDate, 'MM-dd HH:mm', { locale: zhCN })}
        </span>
        
        {request.confirmedBy && (
          <span className="flex items-center gap-1 text-gray-500">
            <User className="w-3 h-3" />
            {request.confirmedBy}
          </span>
        )}
      </div>
      
      {request.gradingResult && request.status === 'graded' && (
        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
          <span className="text-xs text-orange-500 font-medium">
            ⚠️ 待人工确认
          </span>
          <span className="text-xs text-gray-400">
            置信度 {request.gradingResult.confidence}%
          </span>
        </div>
      )}
    </div>
  );
  
  if (onClick) {
    return cardContent;
  }
  
  return (
    <Link to={`/intake/${request.id}`} className="block no-underline">
      {cardContent}
    </Link>
  );
}

export default RequestCard;
