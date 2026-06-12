import { Check, AlertTriangle, Clock, MapPin } from 'lucide-react';
import type { CareTask } from '@/types';
import { TASK_TYPE_LABELS, PET_TYPE_LABELS } from '@/types';
import { useBoardingStore } from '@/store/useBoardingStore';

interface Props {
  task: CareTask;
}

export default function TaskCard({ task }: Props) {
  const store = useBoardingStore();
  const boarding = store.boardings.find((b) => b.id === task.boardingId);
  const petType = boarding?.petType || 'other';

  const typeColor: Record<string, string> = {
    feeding: 'bg-amber-500/10 text-amber-600 border-amber-300',
    medication: 'bg-mint-400/10 text-mint-600 border-mint-300',
    walk: 'bg-warm-400/10 text-warm-600 border-warm-300',
    other: 'bg-warm-200 text-warm-600 border-warm-300',
  };

  const statusBorder: Record<string, string> = {
    pending: 'border-l-amber-400',
    completed: 'border-l-mint-400',
    abnormal: 'border-l-danger-500',
  };

  return (
    <div
      className={`card border-l-4 ${statusBorder[task.status] || ''} hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">{PET_TYPE_LABELS[petType].split(' ')[0]}</span>
            <span className="font-semibold text-warm-800 truncate">
              {task.petName}
            </span>
            <span className="flex items-center gap-0.5 text-xs text-warm-400 bg-warm-100 px-1.5 py-0.5 rounded">
              <MapPin className="w-3 h-3" />
              {task.cageNumber}
            </span>
          </div>
          <p className="text-sm text-warm-600 truncate">{task.title}</p>
          {task.description && (
            <p className="text-xs text-warm-400 mt-0.5 truncate">
              {task.description}
            </p>
          )}
          {task.isAbnormal && task.abnormalReason && (
            <p className="text-xs text-danger-500 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {task.abnormalReason}
            </p>
          )}
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full border ${typeColor[task.taskType]}`}
        >
          {TASK_TYPE_LABELS[task.taskType]}
        </span>
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-warm-100">
        <span className="text-xs text-warm-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {task.scheduledTime?.slice(11, 16) || '--:--'}
          {task.completedTime && (
            <span className="text-mint-500 ml-1">
              ✓ {task.completedTime.slice(11, 16)}
            </span>
          )}
        </span>
        <div className="flex gap-1">
          {task.status === 'pending' && (
            <button
              onClick={() => store.completeTask(task.id)}
              className="text-mint-400 hover:text-mint-600 p-1 rounded hover:bg-mint-50 transition-colors"
              title="标记完成"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          {task.status === 'pending' && (
            <button
              onClick={() => {
                const reason = prompt('异常原因：');
                if (reason) store.markTaskAbnormal(task.id, reason);
              }}
              className="text-danger-400 hover:text-danger-600 p-1 rounded hover:bg-danger-50 transition-colors"
              title="标记异常"
            >
              <AlertTriangle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
