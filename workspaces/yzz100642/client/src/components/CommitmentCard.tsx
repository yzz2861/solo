import { Link } from 'react-router-dom';
import { EyeIcon, PencilIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import type { Commitment } from '../types';
import {
  getConfidenceLevel,
  getConfidenceBgColor,
  getStatusLabel,
  getTypeLabel,
  getTypeColor,
  getTypeIcon,
  formatDateShort,
  truncateText,
} from '../utils';

interface Props {
  commitment: Commitment;
  showActions?: boolean;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onRevise?: (id: number) => void;
  selected?: boolean;
  onSelect?: (id: number, selected: boolean) => void;
  animationDelay?: number;
}

export default function CommitmentCard({
  commitment,
  showActions = false,
  onApprove,
  onReject,
  onRevise,
  selected,
  onSelect,
  animationDelay = 0,
}: Props) {
  const confidenceLevel = getConfidenceLevel(commitment.confidence);

  return (
    <div
      className={`card card-hover p-4 animate-slide-up confidence-${confidenceLevel}`}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex items-start gap-3">
        {onSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(commitment.id, e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`badge ${getTypeColor(commitment.type)}`}>
              <span className="mr-1">{getTypeIcon(commitment.type)}</span>
              {getTypeLabel(commitment.type)}
            </span>
            <span className={`badge ${getConfidenceBgColor(commitment.confidence)}`}>
              置信度 {(commitment.confidence * 100).toFixed(0)}%
            </span>
            <span className={`badge status-${commitment.status}`}>
              {getStatusLabel(commitment.status)}
            </span>
          </div>

          <p className="font-medium text-slate-800 mb-1">
            {truncateText(commitment.content, 80)}
          </p>

          <p className="text-sm text-slate-500 mb-2 italic">
            「{truncateText(commitment.original_sentence, 60)}」
          </p>

          {commitment.confidence_reason && (
            <p className="text-xs text-warning-500 mb-2 flex items-center gap-1">
              <span>⚠️</span>
              {commitment.confidence_reason}
            </p>
          )}

          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <span>{commitment.sender}</span>
              <span>{commitment.opportunity_name}</span>
              {commitment.customer_name && <span>{commitment.customer_name}</span>}
            </div>
            <span>{formatDateShort(commitment.created_at)}</span>
          </div>

          {showActions && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
              <Link
                to={`/commitments/${commitment.id}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <EyeIcon className="w-4 h-4" />
                查看详情
              </Link>

              {commitment.status === 'pending' && (
                <>
                  {onApprove && (
                    <button
                      onClick={() => onApprove(commitment.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      批准
                    </button>
                  )}
                  {onReject && (
                    <button
                      onClick={() => onReject(commitment.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <XCircleIcon className="w-4 h-4" />
                      驳回
                    </button>
                  )}
                  {onRevise && (
                    <button
                      onClick={() => onRevise(commitment.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                    >
                      <ArrowPathIcon className="w-4 h-4" />
                      需修改
                    </button>
                  )}
                </>
              )}

              <Link
                to={`/commitments/${commitment.id}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors ml-auto"
              >
                <PencilIcon className="w-4 h-4" />
                编辑
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
