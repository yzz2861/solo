import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle,
  Check,
  FileText,
  Calendar,
  Clock,
  Filter,
  ChevronRight
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { ReminderLevel, ReminderType } from '@/types';
import { formatDate } from '@/utils';

const typeFilters = [
  { value: 'all', label: '全部提醒', icon: Bell },
  { value: 'id_expiry', label: '证件过期', icon: FileText },
  { value: 'age_mismatch', label: '年龄不符', icon: AlertTriangle },
  { value: 'contract_unsigned', label: '合同未签', icon: FileText },
  { value: 'final_payment_due', label: '尾款到期', icon: Calendar },
  { value: 'document_missing', label: '材料缺失', icon: FileText },
];

const levelFilters = [
  { value: 'all', label: '全部级别' },
  { value: 'error', label: '紧急' },
  { value: 'warning', label: '警告' },
  { value: 'info', label: '提示' },
];

export default function Reminders() {
  const { reminders, markReminderRead, markAllRemindersRead } = useStore();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [showRead, setShowRead] = useState(true);

  const filteredReminders = reminders.filter(r => {
    const matchesType = typeFilter === 'all' || r.type === typeFilter;
    const matchesLevel = levelFilter === 'all' || r.level === levelFilter;
    const matchesRead = showRead || !r.read;
    return matchesType && matchesLevel && matchesRead;
  });

  const unreadCount = reminders.filter(r => !r.read).length;
  const errorCount = reminders.filter(r => r.level === 'error' && !r.read).length;
  const warningCount = reminders.filter(r => r.level === 'warning' && !r.read).length;

  const handleMarkAllRead = () => {
    if (confirm('确定要将所有提醒标记为已读吗？')) {
      markAllRemindersRead();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-warm-800">智能提醒中心</h1>
          <p className="text-warm-500 mt-1">
            共 {reminders.length} 条提醒，{unreadCount} 条未读
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowRead(!showRead)}
            className={`btn-secondary text-sm ${!showRead ? 'bg-primary-50 border-primary-200 text-primary-700' : ''}`}
          >
            {showRead ? '隐藏已读' : '显示已读'}
          </button>
          <button 
            onClick={handleMarkAllRead}
            className="btn-secondary text-sm"
            disabled={unreadCount === 0}
          >
            <Check size={16} />
            全部已读
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-danger-50 flex items-center justify-center">
              <AlertCircle size={24} className="text-danger-500" />
            </div>
            <div>
              <p className="text-warm-500 text-sm">紧急提醒</p>
              <p className="text-2xl font-bold text-danger-600">{errorCount}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle size={24} className="text-amber-500" />
            </div>
            <div>
              <p className="text-warm-500 text-sm">警告提醒</p>
              <p className="text-2xl font-bold text-amber-600">{warningCount}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Bell size={24} className="text-blue-500" />
            </div>
            <div>
              <p className="text-warm-500 text-sm">未读总数</p>
              <p className="text-2xl font-bold text-blue-600">{unreadCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-warm-500" />
            <span className="text-sm text-warm-600">类型：</span>
            <div className="flex flex-wrap gap-2">
              {typeFilters.map(filter => {
                const Icon = filter.icon;
                const isActive = typeFilter === filter.value;
                return (
                  <button
                    key={filter.value}
                    onClick={() => setTypeFilter(filter.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                      isActive 
                        ? 'bg-primary-100 text-primary-700' 
                        : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
                    }`}
                  >
                    <Icon size={14} />
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="md:ml-auto flex items-center gap-2">
            <span className="text-sm text-warm-600">级别：</span>
            <select 
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="input py-1.5 text-sm"
            >
              {levelFilters.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filteredReminders.length === 0 ? (
          <div className="card p-12 text-center">
            <CheckCircle size={48} className="mx-auto text-success-300 mb-3" />
            <p className="text-warm-500">暂无匹配的提醒</p>
          </div>
        ) : (
          filteredReminders.map(reminder => (
            <ReminderCard 
              key={reminder.id} 
              reminder={reminder}
              onRead={() => markReminderRead(reminder.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ReminderCard({ reminder, onRead }: {
  reminder: any;
  onRead: () => void;
}) {
  const levelConfig = getLevelConfig(reminder.level);
  const typeConfig = getTypeConfig(reminder.type);
  
  const TypeIcon = typeConfig.icon;

  return (
    <div 
      className={`card p-5 transition-all duration-300 ${
        reminder.read ? 'opacity-60' : ''
      } hover:shadow-card`}
      onClick={onRead}
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${levelConfig.bgClass}`}>
          <TypeIcon size={24} className={levelConfig.iconClass} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-semibold text-warm-800 ${reminder.read ? 'font-medium' : ''}`}>
                  {reminder.title}
                </h3>
                {!reminder.read && (
                  <span className="w-2 h-2 rounded-full bg-danger-500 flex-shrink-0"></span>
                )}
              </div>
              <p className="text-sm text-warm-500 mt-1">{reminder.registrationName}</p>
            </div>
            <span className={`badge ${levelConfig.badgeClass} flex-shrink-0`}>
              {levelConfig.label}
            </span>
          </div>
          
          <p className="text-sm text-warm-600 mt-3">{reminder.description}</p>
          
          {reminder.date && (
            <div className="flex items-center gap-1 mt-3 text-xs text-warm-400">
              <Clock size={12} />
              <span>{formatDate(reminder.date)}</span>
            </div>
          )}
          
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-warm-400">{typeConfig.label}</span>
            <Link 
              to={`/registration/${reminder.registrationId}`}
              className="text-primary-600 text-sm hover:text-primary-700 flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              查看详情
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function getLevelConfig(level: ReminderLevel) {
  const configs: Record<ReminderLevel, any> = {
    error: {
      bgClass: 'bg-danger-50',
      iconClass: 'text-danger-500',
      badgeClass: 'badge-danger',
      label: '紧急',
    },
    warning: {
      bgClass: 'bg-amber-50',
      iconClass: 'text-amber-500',
      badgeClass: 'badge-warning',
      label: '警告',
    },
    info: {
      bgClass: 'bg-blue-50',
      iconClass: 'text-blue-500',
      badgeClass: 'badge-primary',
      label: '提示',
    },
  };
  return configs[level] || configs.info;
}

function getTypeConfig(type: ReminderType) {
  const configs: Record<ReminderType, any> = {
    id_expiry: {
      icon: FileText,
      label: '证件提醒',
    },
    age_mismatch: {
      icon: AlertTriangle,
      label: '年龄提醒',
    },
    contract_unsigned: {
      icon: FileText,
      label: '合同提醒',
    },
    final_payment_due: {
      icon: Calendar,
      label: '付款提醒',
    },
    document_missing: {
      icon: FileText,
      label: '材料提醒',
    },
    cancellation_fee: {
      icon: AlertTriangle,
      label: '退团提醒',
    },
  };
  return configs[type] || { icon: Bell, label: '其他' };
}
