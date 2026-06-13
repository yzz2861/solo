import { useState, useMemo } from 'react';
import { X, AlertTriangle, Check, Clock, LogOut } from 'lucide-react';
import { useBoardingStore } from '@/store/useBoardingStore';
import type { PetBoarding, Warning, CareTask } from '@/types';
import { TASK_TYPE_LABELS, PET_TYPE_LABELS } from '@/types';

interface Props {
  boarding: PetBoarding;
  onClose: () => void;
  onCompleted: () => void;
}

export default function PickupModal({ boarding, onClose, onCompleted }: Props) {
  const store = useBoardingStore();
  const [pickupDate, setPickupDate] = useState(new Date().toISOString().slice(0, 10));
  const [confirmed, setConfirmed] = useState(false);

  const warnings = useMemo(
    () => store.validatePickup(boarding.id, pickupDate),
    [boarding.id, pickupDate, store.tasks, store.boardings]
  );

  const pendingTasks = useMemo(
    () => store.getPendingTasksByBoardingId(boarding.id),
    [boarding.id, store.tasks]
  );

  const isEarly = pickupDate < boarding.expectedPickupDate;
  const hasWarnings = warnings.length > 0;
  const hasPendingTasks = pendingTasks.length > 0;

  const handleConfirm = () => {
    store.pickupBoarding(boarding.id, pickupDate);
    onCompleted();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-warm-50 rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-warm-50 z-10 px-6 pt-5 pb-3 border-b border-warm-200">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-warm-800 flex items-center gap-2">
              <LogOut className="w-5 h-5 text-warm-500" />
              办理接回
            </h3>
            <button
              onClick={onClose}
              className="text-warm-400 hover:text-warm-600 p-1 rounded-lg hover:bg-warm-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* Pet Summary */}
          <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-warm-200">
            <div className="w-14 h-14 bg-warm-100 rounded-xl flex items-center justify-center text-2xl">
              {PET_TYPE_LABELS[boarding.petType].split(' ')[0]}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-warm-800 text-lg">{boarding.petName}</div>
              <div className="text-sm text-warm-500">
                {boarding.breed && `${boarding.breed} · `}
                笼位 {boarding.cageNumber}
              </div>
              <div className="text-xs text-warm-400 mt-0.5">
                主人：{boarding.ownerName} · {boarding.ownerPhone}
              </div>
            </div>
          </div>

          {/* Date Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-white rounded-lg border border-warm-200">
              <div className="text-xs text-warm-400 mb-1">计划接回日期</div>
              <div className="font-medium text-warm-700">{boarding.expectedPickupDate || '未设置'}</div>
            </div>
            <div>
              <label className="text-xs text-warm-400 mb-1 block">实际接回日期 *</label>
              <input
                type="date"
                className="input-field"
                value={pickupDate}
                onChange={(e) => {
                  setPickupDate(e.target.value);
                  setConfirmed(false);
                }}
              />
            </div>
          </div>

          {/* Early pickup indicator */}
          {isEarly && (
            <div className="p-3 bg-amber-500/10 border border-amber-400 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-amber-700">提前接回</div>
                <div className="text-xs text-amber-600">
                  比计划提前 {Math.ceil((new Date(boarding.expectedPickupDate).getTime() - new Date(pickupDate).getTime()) / 86400000)} 天
                </div>
              </div>
            </div>
          )}

          {/* Warnings */}
          {hasWarnings && (
            <div className="space-y-2">
              {warnings.map((w: Warning, i: number) => (
                <div
                  key={`warn-${i}`}
                  className={`p-3 rounded-lg border flex items-start gap-2 ${
                    w.severity === 'error'
                      ? 'bg-danger-50 border-danger-400 text-danger-600'
                      : 'bg-amber-500/10 border-amber-400 text-amber-700'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span className="text-sm">{w.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Pending Tasks Detail */}
          {hasPendingTasks && (
            <div>
              <h4 className="text-sm font-semibold text-warm-700 mb-2">
                未处理任务清单（{pendingTasks.length}项）
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {pendingTasks.map((task: CareTask) => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
                      task.status === 'abnormal'
                        ? 'bg-danger-50 border-danger-200'
                        : 'bg-white border-warm-100'
                    }`}
                  >
                    <button
                      onClick={() => store.completeTask(task.id)}
                      className="w-4 h-4 rounded border border-warm-300 hover:border-mint-400 flex items-center justify-center shrink-0 transition-colors"
                      title="快速完成"
                    >
                      <Check className="w-3 h-3 text-transparent hover:text-mint-500" />
                    </button>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        task.taskType === 'feeding'
                          ? 'bg-amber-500/10 text-amber-600'
                          : task.taskType === 'medication'
                            ? 'bg-mint-400/10 text-mint-600'
                            : task.taskType === 'walk'
                              ? 'bg-warm-400/10 text-warm-600'
                              : 'bg-warm-100 text-warm-500'
                      }`}
                    >
                      {TASK_TYPE_LABELS[task.taskType]}
                    </span>
                    <span className="text-warm-600 flex-1 truncate">{task.description}</span>
                    <span className="text-xs text-warm-400 flex items-center gap-0.5 shrink-0">
                      <Clock className="w-3 h-3" />
                      {task.scheduledTime?.slice(11, 16) || '--:--'}
                    </span>
                    {task.status === 'abnormal' && (
                      <span className="text-xs text-danger-500 shrink-0">异常</span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-warm-400 mt-1.5">
                点击左侧勾选框可快速完成任务
              </p>
            </div>
          )}

          {/* Allergen reminder */}
          {boarding.allergicFood && (
            <div className="p-3 bg-danger-50 border border-danger-300 rounded-lg">
              <div className="text-sm font-semibold text-danger-600">⚠ 过敏食物提醒</div>
              <div className="text-xs text-danger-500 mt-0.5">
                「{boarding.petName}」对以下食物过敏：{boarding.allergicFood}
              </div>
              <div className="text-xs text-danger-400 mt-0.5">
                接回时请向主人确认近期是否误食，并归还剩余药品/用品
              </div>
            </div>
          )}

          {/* Special notes reminder */}
          {boarding.specialNotes && (
            <div className="p-3 bg-warm-100 rounded-lg">
              <div className="text-sm font-medium text-warm-700">📋 特殊备注</div>
              <div className="text-xs text-warm-500 mt-0.5">{boarding.specialNotes}</div>
            </div>
          )}

          {/* Checklist for handover items */}
          <div className="p-4 bg-white rounded-xl border border-warm-200">
            <h4 className="text-sm font-semibold text-warm-700 mb-3">接回确认清单</h4>
            <div className="space-y-2">
              {[
                '已核对宠物身份（笼位+特征）',
                '已归还主人自带物品（笼/垫/玩具）',
                '已结算全部费用',
                '已交代用药/喂食情况',
                boarding.allergicFood ? '已提醒主人过敏食物' : null,
                hasPendingTasks ? '已知晓并处理未完成任务' : null,
              ]
                .filter(Boolean)
                .map((item, i) => (
                  <label key={i} className="flex items-center gap-2 text-sm text-warm-600 cursor-pointer">
                    <input type="checkbox" className="rounded border-warm-300 text-warm-500" />
                    {item}
                  </label>
                ))}
            </div>
          </div>

          {/* Confirm checkbox if warnings */}
          {hasWarnings && (
            <label className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-300 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="rounded border-warm-300 mt-0.5"
              />
              <span className="text-sm text-amber-700">
                我已了解以上风险提醒，确认可以办理接回
              </span>
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-warm-50 border-t border-warm-200 px-6 py-4 flex items-center justify-between">
          <button onClick={onClose} className="btn-outline">
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={hasWarnings && !confirmed}
            className={`flex items-center gap-2 ${
              hasWarnings && !confirmed
                ? 'bg-warm-200 text-warm-400 cursor-not-allowed px-4 py-2 rounded-lg font-medium'
                : 'btn-danger'
            }`}
          >
            <LogOut className="w-4 h-4" />
            确认接回
          </button>
        </div>
      </div>
    </div>
  );
}
