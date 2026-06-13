import { useMemo, useState } from 'react';
import { Check, MapPin, AlertTriangle, Clock, LogOut } from 'lucide-react';
import { useBoardingStore } from '@/store/useBoardingStore';
import { TASK_TYPE_LABELS, PET_TYPE_LABELS } from '@/types';
import type { PetBoarding } from '@/types';
import PickupModal from '@/components/PickupModal';

export default function CageCheck() {
  const store = useBoardingStore();
  const activeBoardings = store.getActiveBoardings();
  const [pickupTarget, setPickupTarget] = useState<PetBoarding | null>(null);

  const tasksByCage = useMemo(() => {
    const todayTasks = store.getTodayTasks();
    const byCage: Record<string, typeof todayTasks> = {};
    for (const t of todayTasks) {
      if (!byCage[t.cageNumber]) byCage[t.cageNumber] = [];
      byCage[t.cageNumber].push(t);
    }
    for (const key of Object.keys(byCage)) {
      byCage[key].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    }
    return byCage;
  }, [store.tasks]);

  const cageNumbers = useMemo(() => {
    const cages = new Set<string>();
    activeBoardings.forEach((b) => cages.add(b.cageNumber));
    Object.keys(tasksByCage).forEach((c) => cages.add(c));
    return Array.from(cages).sort();
  }, [activeBoardings, tasksByCage]);

  const totalTasks = useMemo(
    () => Object.values(tasksByCage).flat().length,
    [tasksByCage]
  );
  const completedTasks = useMemo(
    () => Object.values(tasksByCage).flat().filter((t) => t.status === 'completed').length,
    [tasksByCage]
  );
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl font-bold text-warm-800">笼位核对</h2>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-warm-400">
            总进度 {completedTasks}/{totalTasks}
          </span>
          <div className="w-32 h-2 bg-warm-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-mint-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-mint-500 font-medium">{progressPercent}%</span>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-300 rounded-lg px-4 py-3 mb-6 flex items-center gap-2 text-sm text-amber-600">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>请按笼位逐项核对，确认宠物与笼位一致后再执行照护，防止只看宠物名字喂错药</span>
      </div>

      {cageNumbers.length === 0 ? (
        <div className="text-center py-16 text-warm-300">
          <div className="text-4xl mb-3">🏠</div>
          <p className="text-sm">暂无在住宠物</p>
        </div>
      ) : (
        <div className="space-y-6">
          {cageNumbers.map((cage) => {
            const cageTasks = tasksByCage[cage] || [];
            const cageBoardings = activeBoardings.filter(
              (b) => b.cageNumber === cage
            );
            const cageCompleted = cageTasks.filter(
              (t) => t.status === 'completed'
            ).length;
            const cagePending = cageTasks.filter(
              (t) => t.status === 'pending'
            ).length;
            const cageAbnormal = cageTasks.filter(
              (t) => t.status === 'abnormal'
            ).length;

            return (
              <div key={cage} className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-warm-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                      {cage}
                    </div>
                    <div>
                      <h3 className="font-semibold text-warm-800 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-warm-400" />
                        笼位 {cage}
                      </h3>
                      <div className="text-xs text-warm-400 mt-0.5">
                        {cageBoardings.map((b) => (
                          <span key={b.id} className="mr-2">
                            {PET_TYPE_LABELS[b.petType].split(' ')[0]}{' '}
                            {b.petName}
                            {b.breed ? ` (${b.breed})` : ''}
                          </span>
                        ))}
                        {cageBoardings.length === 0 && '无在住宠物'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs">
                    {cagePending > 0 && (
                      <span className="bg-amber-500/10 text-amber-600 px-2 py-1 rounded-full">
                        待做 {cagePending}
                      </span>
                    )}
                    {cageCompleted > 0 && (
                      <span className="bg-mint-400/10 text-mint-600 px-2 py-1 rounded-full">
                        完成 {cageCompleted}
                      </span>
                    )}
                    {cageAbnormal > 0 && (
                      <span className="bg-danger-50 text-danger-500 px-2 py-1 rounded-full">
                        异常 {cageAbnormal}
                      </span>
                    )}
                  </div>
                </div>

                {cageBoardings.length > 0 && (
                  <div className="mb-3 p-2 bg-warm-50 rounded-lg text-xs text-warm-500">
                    {cageBoardings.map((b) => (
                      <div key={b.id} className="flex items-center gap-4 py-1">
                        <span className="font-medium">{b.petName}</span>
                        <span>品种：{b.breed || '未知'}</span>
                        <span>特征：{b.features || '无'}</span>
                        {b.allergicFood && (
                          <span className="text-danger-500 font-medium">
                            ⚠ 过敏：{b.allergicFood}
                          </span>
                        )}
                        {b.specialNotes && (
                          <span className="text-warm-400">备注：{b.specialNotes}</span>
                        )}
                        <button
                          onClick={() => setPickupTarget(b)}
                          className="ml-auto text-danger-400 hover:text-danger-600 p-0.5 transition-colors flex items-center gap-0.5"
                          title="办理接回"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span className="text-xs">接回</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {cageTasks.length === 0 ? (
                  <p className="text-sm text-warm-300 text-center py-4">
                    暂无任务
                  </p>
                ) : (
                  <div className="space-y-2">
                    {cageTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
                          task.status === 'completed'
                            ? 'bg-mint-400/5 border-mint-200'
                            : task.status === 'abnormal'
                              ? 'bg-danger-50 border-danger-200'
                              : 'bg-white border-warm-100'
                        }`}
                      >
                        <button
                          onClick={() => {
                            if (task.status === 'pending') {
                              store.completeTask(task.id);
                            }
                          }}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            task.status === 'completed'
                              ? 'bg-mint-400 border-mint-400 text-white'
                              : task.status === 'abnormal'
                                ? 'bg-danger-500 border-danger-500 text-white'
                                : 'border-warm-300 hover:border-mint-400'
                          }`}
                        >
                          {task.status === 'completed' && (
                            <Check className="w-3 h-3" />
                          )}
                          {task.status === 'abnormal' && (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
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
                            <span className="text-sm text-warm-700 font-medium truncate">
                              {task.petName}
                            </span>
                            <span className="text-xs text-warm-400 truncate">
                              {task.description}
                            </span>
                          </div>
                          {task.isAbnormal && task.abnormalReason && (
                            <p className="text-xs text-danger-500 mt-0.5">
                              异常：{task.abnormalReason}
                            </p>
                          )}
                        </div>

                        <span className="text-xs text-warm-400 flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          {task.scheduledTime?.slice(11, 16) || '--:--'}
                        </span>

                        {task.status === 'pending' && (
                          <button
                            onClick={() => {
                              const reason = prompt('异常原因：');
                              if (reason) store.markTaskAbnormal(task.id, reason);
                            }}
                            className="text-danger-400 hover:text-danger-600 p-1 shrink-0"
                            title="标记异常"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {pickupTarget && (
        <PickupModal
          boarding={pickupTarget}
          onClose={() => setPickupTarget(null)}
          onCompleted={() => setPickupTarget(null)}
        />
      )}
    </div>
  );
}
