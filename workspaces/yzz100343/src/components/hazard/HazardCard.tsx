import React from 'react';
import type { Hazard } from '@/types';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TeamBadge } from '@/components/ui/TeamBadge';
import {
  MapPin,
  CalendarDays,
  Eye,
  Wrench,
  CheckSquare,
  AlertOctagon,
} from 'lucide-react';
import { formatRelative, formatDate } from '@/utils/dateUtils';
import { ROLE_LABELS } from '@/types';

interface Props {
  hazard: Hazard;
  showActions?: boolean;
  compact?: boolean;
}

export const HazardCard: React.FC<Props> = ({
  hazard,
  showActions = true,
  compact = false,
}) => {
  const navigate = useNavigate();
  const relative = formatRelative(hazard.deadline);
  const lastReview = hazard.reviews[hazard.reviews.length - 1];
  const canRectify =
    hazard.status === 'PENDING_RECTIFICATION' || hazard.status === 'REJECTED';
  const canReview = hazard.status === 'PENDING_REVIEW';
  const isLocked = hazard.status === 'CLOSED';

  return (
    <div
      className={`industrial-card p-5 relative overflow-hidden
        ${hazard.isOverdue && !isLocked ? 'ring-1 ring-danger-red/40 danger-pattern' : ''}
        ${isLocked ? 'opacity-90 bg-industrial-gray-50/50' : ''}`}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-[4px] bg-steel-blue/10 text-steel-blue
                       flex items-center justify-center border border-steel-blue/20 flex-shrink-0"
          >
            <span className="font-mono font-black text-sm">
              {hazard.boxNumber.replace(/^PDX-?-?/, '').slice(0, 5) || '电'}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-xs text-industrial-gray-500">
                #{hazard.boxNumber}
              </span>
              <StatusBadge
                status={hazard.status}
                isOverdue={hazard.isOverdue}
                size="sm"
              />
              {isLocked && (
                <span className="chip bg-industrial-gray-100 text-industrial-gray-600 border-industrial-gray-200">
                  <AlertOctagon size={11} />
                  已锁定
                </span>
              )}
              {hazard.rejectCount > 0 && (
                <span className="chip bg-danger-red/10 text-danger-red border-danger-red/30">
                  打回 ×{hazard.rejectCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-industrial-gray-700">
              <MapPin size={14} className="flex-shrink-0 text-industrial-gray-400" />
              <span className="truncate font-medium">{hazard.location}</span>
            </div>
          </div>
        </div>
        <TeamBadge team={hazard.team} size="sm" />
      </div>

      <p
        className={`text-industrial-gray-700 mb-4 leading-relaxed ${
          compact ? 'line-clamp-2' : 'line-clamp-3'
        }`}
      >
        {hazard.description}
      </p>

      {hazard.photoUrl && !compact && (
        <div className="mb-4 rounded-[4px] overflow-hidden border border-industrial-gray-200 h-32">
          <img
            src={hazard.photoUrl}
            alt={hazard.location}
            className="w-full h-full object-cover"
            onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
          />
        </div>
      )}

      {lastReview && !lastReview.passed && (
        <div
          className="mb-4 p-3 rounded-[4px] bg-danger-red/5 border border-danger-red/20
                     text-danger-red text-xs leading-relaxed"
        >
          <div className="font-bold mb-1 flex items-center gap-1.5">
            <AlertOctagon size={13} />
            最近复查被打回 · {ROLE_LABELS[lastReview.reviewedBy]}
          </div>
          <div className="opacity-90">「{lastReview.comment}」</div>
        </div>
      )}

      <div
        className={`flex items-center justify-between gap-3 pt-3
          border-t border-dashed border-industrial-gray-200 ${
            showActions && !isLocked ? '' : 'pb-0'
          }`}
      >
        <div
          className={`flex items-center gap-1.5 text-xs ${
            relative.isOverdue ? 'text-danger-red font-bold' : 'text-industrial-gray-500'
          }`}
        >
          <CalendarDays size={13} />
          <span>{formatDate(hazard.deadline)}</span>
          <span className="opacity-60">·</span>
          <span
            className={
              relative.isOverdue
                ? 'px-1.5 py-0.5 rounded bg-danger-red/10'
                : 'px-1.5 py-0.5 rounded bg-industrial-gray-100'
            }
          >
            {relative.text}
          </span>
        </div>

        {showActions && !isLocked && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/hazards/${hazard.id}`)}
              className="btn-outline px-3 py-1.5 text-xs"
            >
              <Eye size={13} />
              详情
            </button>
            {canRectify && (
              <button
                onClick={() => navigate(`/hazards/${hazard.id}?action=rectify`)}
                className="btn-steel px-3 py-1.5 text-xs"
              >
                <Wrench size={13} />
                整改
              </button>
            )}
            {canReview && (
              <button
                onClick={() => navigate(`/hazards/${hazard.id}?action=review`)}
                className="btn-primary px-3 py-1.5 text-xs"
              >
                <CheckSquare size={13} />
                复查
              </button>
            )}
          </div>
        )}
        {isLocked && showActions && (
          <button
            onClick={() => navigate(`/hazards/${hazard.id}`)}
            className="btn-ghost px-3 py-1.5 text-xs"
          >
            <Eye size={13} />
            查看记录
          </button>
        )}
      </div>
    </div>
  );
};
