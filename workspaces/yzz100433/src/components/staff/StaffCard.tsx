import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle, Eye } from 'lucide-react';
import type { Staff } from '@/types';
import { STATUS_LABELS, STATUS_COLORS } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { formatRelativeTime } from '@/utils/formatters';
import { getLocalStorage } from '@/hooks/useLocalStorage';
import { STORAGE_KEYS } from '@/utils/constants';
import type { StaffStats } from '@/types';

interface StaffCardProps {
  staff: Staff;
  onSelect?: () => void;
  showStats?: boolean;
}

export default function StaffCard({ staff, onSelect, showStats = true }: StaffCardProps) {
  const navigate = useNavigate();
  const { selectStaff } = useAppStore();

  const stats = getLocalStorage<StaffStats>(
    `${STORAGE_KEYS.STATS_PREFIX}${staff.id}`,
    {
      staffId: staff.id,
      totalPractice: 0,
      correctCount: 0,
      wrongCount: 0,
      accuracy: 0,
      errorByType: {},
      unpassedScenarios: [],
      lastPracticeAt: staff.createdAt,
    }
  );

  const handleClick = () => {
    selectStaff(staff.id);
    if (onSelect) {
      onSelect();
    } else {
      navigate(`/practice/${staff.id}`);
    }
  };

  const getStatusIcon = () => {
    switch (staff.status) {
      case 'ready':
        return <CheckCircle className="w-4 h-4" />;
      case 'practicing':
        return <BookOpen className="w-4 h-4" />;
      default:
        return <Eye className="w-4 h-4" />;
    }
  };

  const progressPercent = stats.totalPractice > 0
    ? Math.min(100, Math.round((stats.correctCount / Math.max(10, stats.totalPractice)) * 100))
    : 0;

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-2xl p-5 card-shadow card-shadow-hover cursor-pointer transition-all duration-300 hover:-translate-y-1 animate-fade-in"
    >
      <div className="flex items-start gap-4">
        <div className="text-5xl">{staff.avatar}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-caramel-800 truncate">
              {staff.name}
            </h3>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[staff.status]}`}>
              {getStatusIcon()}
              {STATUS_LABELS[staff.status]}
            </span>
          </div>
          {staff.statusNote && (
            <p className="text-xs text-caramel-500 mb-2">
              {staff.statusNote}
            </p>
          )}
          {showStats && stats.totalPractice > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-caramel-600">正确率</span>
                <span className="font-semibold text-matcha-600">{stats.accuracy}%</span>
              </div>
              <div className="h-2 bg-primary-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-400 to-primary-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-caramel-500">
                <span>练习 {stats.totalPractice} 次</span>
                <span>
                  {stats.unpassedScenarios.length > 0
                    ? `${stats.unpassedScenarios.length} 题待复习`
                    : '全部掌握'}
                </span>
              </div>
              <p className="text-xs text-caramel-400">
                上次练习: {formatRelativeTime(stats.lastPracticeAt)}
              </p>
            </div>
          )}
          {showStats && stats.totalPractice === 0 && (
            <p className="text-sm text-caramel-400 mt-2">
              还没开始练习，点击开始吧！
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
