import { useMemo, useState } from 'react';
import { ClipboardList, CheckCircle2, AlertTriangle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBoardingStore } from '@/store/useBoardingStore';
import TaskCard from '@/components/TaskCard';
import type { CareTask } from '@/types';

type TabKey = 'pending' | 'completed' | 'abnormal';

export default function Board() {
  const store = useBoardingStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('pending');

  const todayTasks = useMemo(() => store.getTodayTasks(), [store.tasks]);
  const pending = useMemo(
    () => todayTasks.filter((t) => t.status === 'pending').sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime)),
    [todayTasks]
  );
  const completed = useMemo(
    () => todayTasks.filter((t) => t.status === 'completed').sort((a, b) => (b.completedTime || '').localeCompare(a.completedTime || '')),
    [todayTasks]
  );
  const abnormal = useMemo(
    () => todayTasks.filter((t) => t.status === 'abnormal'),
    [todayTasks]
  );

  const tabs: { key: TabKey; label: string; icon: React.ElementType; count: number; color: string }[] = [
    { key: 'pending', label: '今日待做', icon: ClipboardList, count: pending.length, color: 'text-amber-500' },
    { key: 'completed', label: '已完成', icon: CheckCircle2, count: completed.length, color: 'text-mint-400' },
    { key: 'abnormal', label: '异常', icon: AlertTriangle, count: abnormal.length, color: 'text-danger-500' },
  ];

  const taskMap: Record<TabKey, CareTask[]> = {
    pending,
    completed,
    abnormal,
  };

  const activeBoardings = store.getActiveBoardings();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl font-bold text-warm-800">任务看板</h2>
        <button
          onClick={() => navigate('/register')}
          className="btn-mint flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          新寄养
        </button>
      </div>

      <div className="flex items-center gap-2 mb-2 text-sm text-warm-400">
        <span>当前在住 {activeBoardings.length} 只</span>
        <span className="text-warm-200">|</span>
        <span>今日任务 {todayTasks.length} 项</span>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon, count, color }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === key
                ? 'bg-white shadow-sm border border-warm-200 text-warm-800'
                : 'text-warm-400 hover:text-warm-600 hover:bg-warm-100'
            }`}
          >
            <Icon className={`w-4 h-4 ${color}`} />
            {label}
            <span
              className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === key ? 'bg-warm-100 text-warm-600' : 'bg-warm-50 text-warm-400'
              }`}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {taskMap[activeTab].length === 0 ? (
        <div className="text-center py-16 text-warm-300">
          <div className="text-4xl mb-3">
            {activeTab === 'pending' ? '📋' : activeTab === 'completed' ? '✅' : '⚠️'}
          </div>
          <p className="text-sm">
            {activeTab === 'pending'
              ? '暂无待做任务，去登记新寄养吧'
              : activeTab === 'completed'
                ? '还没有已完成的任务'
                : '没有异常任务，太好了！'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {taskMap[activeTab].map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
