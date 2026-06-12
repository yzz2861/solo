import { useEffect, useMemo, useState } from 'react';
import { 
  Users, 
  Calendar, 
  AlertTriangle, 
  Music,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Filter
} from 'lucide-react';
import { StatsCard } from '../components/StatsCard';
import { AlertCard } from '../components/AlertCard';
import { useStore, useMembers, useLeaveRecords, useAlerts, useCurrentRole } from '../store/useStore';
import { voicePartList, getVoicePartName, getVoicePartBadgeClass } from '../utils/voiceParts';
import { formatDate, formatDateShort, isThisWeek, daysBetween } from '../utils/date';
import { VoicePart } from '../types';
import { AlertType } from '../types';

export default function Dashboard() {
  const members = useMembers();
  const leaveRecords = useLeaveRecords();
  const alerts = useAlerts();
  const currentRole = useCurrentRole();
  const generateAlerts = useStore((state) => state.generateAlerts);
  const clearAlerts = useStore((state) => state.clearAlerts);
  const markAlertRead = useStore((state) => state.markAlertRead);

  const [alertFilter, setAlertFilter] = useState<AlertType | 'all'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (alerts.length === 0) {
      generateAlerts();
    }
  }, [alerts.length, generateAlerts]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    generateAlerts();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const stats = useMemo(() => {
    const activeMembers = members.filter(m => m.status === 'active').length;
    
    const todayLeaves = leaveRecords.filter(r => r.rehearsalDate === today).length;
    const todayAttendance = activeMembers > 0 
      ? Math.round(((activeMembers - todayLeaves) / activeMembers) * 100) 
      : 0;

    const thisWeekLeaves = leaveRecords.filter(r => isThisWeek(r.rehearsalDate)).length;
    
    const unreadAlerts = alerts.filter(a => !a.read).length;

    const voicePartStats = voicePartList.map(part => {
      const partMembers = members.filter(m => m.voicePart === part.key && m.status === 'active');
      const partLeavesToday = leaveRecords.filter(
        r => r.rehearsalDate === today && 
             members.find(m => m.id === r.memberId)?.voicePart === part.key
      ).length;
      return {
        ...part,
        total: partMembers.length,
        onLeave: partLeavesToday,
        available: partMembers.length - partLeavesToday,
        rate: partMembers.length > 0 
          ? Math.round(((partMembers.length - partLeavesToday) / partMembers.length) * 100)
          : 0,
      };
    });

    const upcomingLeaves = leaveRecords
      .filter(r => daysBetween(today, r.rehearsalDate) >= 0 && daysBetween(today, r.rehearsalDate) <= 7)
      .sort((a, b) => new Date(a.rehearsalDate).getTime() - new Date(b.rehearsalDate).getTime())
      .slice(0, 5);

    return {
      activeMembers,
      todayAttendance,
      thisWeekLeaves,
      unreadAlerts,
      voicePartStats,
      upcomingLeaves,
    };
  }, [members, leaveRecords, alerts, today]);

  const filteredAlerts = useMemo(() => {
    if (alertFilter === 'all') return alerts;
    return alerts.filter(a => a.type === alertFilter);
  }, [alerts, alertFilter]);

  const alertTypeFilters: Array<{ key: AlertType | 'all'; label: string }> = [
    { key: 'all', label: '全部' },
    { key: 'duplicate', label: '重复请假' },
    { key: 'consecutive', label: '连续缺席' },
    { key: 'shortage', label: '声部不足' },
    { key: 'online', label: '线上练习' },
  ];

  return (
    <div className="space-y-8">
      {/* 页面标题 */}
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-serif text-burgundy-900 text-shadow">
              仪表盘
            </h1>
            <p className="text-charcoal/60 mt-1">
              {formatDate(today)} • 欢迎使用社区合唱团请假管理系统
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-charcoal/50">
              当前角色：{currentRole === 'leader' ? '团长' : currentRole === 'conductor' ? '指挥' : '成员'}
            </span>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-burgundy-50 text-burgundy-700 hover:bg-burgundy-100 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">刷新提醒</span>
            </button>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="活跃成员"
          value={stats.activeMembers}
          icon={Users}
          color="burgundy"
          delay={1}
        />
        <StatsCard
          title="今日预计出席率"
          value={`${stats.todayAttendance}%`}
          icon={Calendar}
          color={stats.todayAttendance >= 80 ? 'green' : stats.todayAttendance >= 60 ? 'gold' : 'burgundy'}
          trend={{ value: 5, isPositive: stats.todayAttendance >= 75 }}
          delay={2}
        />
        <StatsCard
          title="本周请假人次"
          value={stats.thisWeekLeaves}
          icon={TrendingDown}
          color="gold"
          delay={3}
        />
        <StatsCard
          title="待处理提醒"
          value={stats.unreadAlerts}
          icon={AlertTriangle}
          color={stats.unreadAlerts > 0 ? 'burgundy' : 'green'}
          delay={4}
        />
      </div>

      {/* 声部概况 */}
      <div className="card p-6 animate-stagger-1">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold font-serif text-burgundy-900 flex items-center gap-2">
            <Music className="w-5 h-5" />
            声部出席概况
          </h2>
          <span className="text-sm text-charcoal/50">
            更新于 {formatDate(today)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.voicePartStats.map((part, index) => (
            <div
              key={part.key}
              className={`p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-md ${
                part.rate < 60 
                  ? 'border-red-200 bg-red-50/50' 
                  : part.rate < 80 
                  ? 'border-amber-200 bg-amber-50/50'
                  : 'border-emerald-200 bg-emerald-50/50'
              }`}
              style={{ animationDelay: `${(index + 1) * 0.1}s` }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white ${getVoicePartBadgeClass(part.key as VoicePart)}`}>
                  {part.name}
                </span>
                <span className={`text-2xl font-bold font-serif ${
                  part.rate < 60 ? 'text-red-600' : part.rate < 80 ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {part.rate}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-charcoal/60">
                  应到 {part.total} 人
                </span>
                <span className="text-charcoal/60">
                  实到 {part.available} 人
                </span>
              </div>
              {part.onLeave > 0 && (
                <div className="mt-2 pt-2 border-t border-current/10">
                  <span className="text-xs text-red-600">
                    请假 {part.onLeave} 人
                  </span>
                </div>
              )}
              {/* 进度条 */}
              <div className="mt-3 h-2 bg-white/50 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    part.rate < 60 ? 'bg-red-500' : part.rate < 80 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${part.rate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 主要内容区 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 智能提醒 */}
        <div className="lg:col-span-2 card p-6 animate-stagger-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold font-serif text-burgundy-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              智能提醒中心
              {alerts.filter(a => !a.read).length > 0 && (
                <span className="w-6 h-6 flex items-center justify-center bg-red-500 text-white text-xs rounded-full">
                  {alerts.filter(a => !a.read).length}
                </span>
              )}
            </h2>
            
            <div className="flex items-center gap-3">
              {/* 筛选器 */}
              <div className="flex items-center gap-1 bg-burgundy-50 rounded-xl p-1">
                <Filter className="w-4 h-4 text-burgundy-500 ml-2" />
                {alertTypeFilters.map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setAlertFilter(filter.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      alertFilter === filter.key
                        ? 'bg-white text-burgundy-700 shadow-sm'
                        : 'text-burgundy-600/70 hover:text-burgundy-700'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              
              {alerts.length > 0 && (
                <button
                  onClick={() => clearAlerts()}
                  className="text-xs text-charcoal/50 hover:text-burgundy-700 transition-colors"
                >
                  清空全部
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {filteredAlerts.length > 0 ? (
              filteredAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-charcoal/60 font-medium">暂无提醒</p>
                <p className="text-sm text-charcoal/40 mt-1">
                  合唱团运行正常，继续保持！
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 即将到来的请假 */}
        <div className="card p-6 animate-stagger-3">
          <h2 className="text-xl font-bold font-serif text-burgundy-900 flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5" />
            近期请假
          </h2>

          <div className="space-y-3">
            {stats.upcomingLeaves.length > 0 ? (
              stats.upcomingLeaves.map((leave, index) => {
                const member = members.find(m => m.id === leave.memberId);
                return (
                  <div
                    key={leave.id}
                    className="p-3 rounded-xl bg-burgundy-50/50 hover:bg-burgundy-50 transition-colors"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-charcoal">
                        {member?.name}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getVoicePartBadgeClass(member?.voicePart || 'soprano')} text-white`}>
                        {member && getVoicePartName(member.voicePart)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-charcoal/60">
                        {formatDateShort(leave.rehearsalDate)}
                      </span>
                      <span className="text-charcoal/60 truncate max-w-[120px]">
                        {leave.reason}
                      </span>
                    </div>
                    {leave.notes && (
                      <p className="text-xs text-charcoal/50 mt-1 truncate">
                        备注：{leave.notes}
                      </p>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 mx-auto mb-2 text-charcoal/20" />
                <p className="text-sm text-charcoal/40">暂无近期请假</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
