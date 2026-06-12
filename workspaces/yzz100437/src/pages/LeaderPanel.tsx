import { useState, useMemo } from 'react';
import { Printer, Download, Bell, ChevronLeft, ChevronRight, MessageSquare, Copy, Check } from 'lucide-react';
import { useStore, useMembers, useLeaveRecords } from '../store/useStore';
import { getVoicePartName, getVoicePartBadgeClass, voicePartList } from '../utils/voiceParts';
import { formatDate, formatDateShort, getWeekStart, getWeekDates, getWeekEnd } from '../utils/date';
import { printRollCall, generateAttendanceStats, generateReminderMessage } from '../utils/export';
import { VoicePart } from '../types';
import { StarRating } from '../components/StarRating';

export default function LeaderPanel() {
  const members = useMembers();
  const leaveRecords = useLeaveRecords();
  
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const weekStart = getWeekStart(currentWeek);
  const weekEnd = getWeekEnd(currentWeek);
  const weekDates = getWeekDates(currentWeek);

  const rollCallData = useMemo(() => {
    return members
      .filter(m => m.status === 'active')
      .sort((a, b) => {
        const partCompare = voicePartList.findIndex(v => v.key === a.voicePart) - voicePartList.findIndex(v => v.key === b.voicePart);
        if (partCompare !== 0) return partCompare;
        return a.name.localeCompare(b.name);
      })
      .map(m => {
        const memberLeaves = leaveRecords.filter(r => r.memberId === m.id);
        const weekLeaveDates = weekDates.map(date => {
          const leave = memberLeaves.find(r => r.rehearsalDate === date);
          return { date, leave };
        });
        return {
          ...m,
          weekLeaveDates,
          leaveCount: weekLeaveDates.filter(d => d.leave).length,
        };
      });
  }, [members, leaveRecords, weekDates]);

  const attendanceStats = useMemo(() => {
    return generateAttendanceStats(members, leaveRecords, 30);
  }, [members, leaveRecords]);

  const membersNeedingReminder = useMemo(() => {
    return attendanceStats.filter(s => s.needsReminder);
  }, [attendanceStats]);

  const handlePrevWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeek(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeek(newDate);
  };

  const handlePrint = () => {
    printRollCall(members, leaveRecords, weekStart);
  };

  const copyReminder = async (memberId: string, message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedId(memberId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const voicePartSummary = useMemo(() => {
    return voicePartList.map(part => {
      const partMembers = members.filter(m => m.voicePart === part.key && m.status === 'active');
      const partLeavesThisWeek = leaveRecords.filter(r => {
        const member = members.find(m => m.id === r.memberId);
        return member?.voicePart === part.key && weekDates.includes(r.rehearsalDate);
      });
      return {
        ...part,
        total: partMembers.length,
        leaveCount: partLeavesThisWeek.length,
        uniqueMembersOnLeave: new Set(partLeavesThisWeek.map(r => r.memberId)).size,
      };
    });
  }, [members, leaveRecords, weekDates]);

  return (
    <div className="space-y-8">
      {/* 页面标题 */}
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold font-serif text-burgundy-900 text-shadow">
          团长面板
        </h1>
        <p className="text-charcoal/60 mt-1">
          管理点名表和成员补练提醒
        </p>
      </div>

      {/* 声部本周概况 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-stagger-1">
        {voicePartSummary.map((part, index) => (
          <div key={part.key} className="card p-4" style={{ animationDelay: `${index * 0.1}s` }}>
            <div className="flex items-center justify-between mb-2">
              <span className={`badge ${getVoicePartBadgeClass(part.key as VoicePart)} text-white`}>
                {part.name}
              </span>
              <span className="text-2xl font-bold font-serif text-burgundy-900">
                {part.total - part.uniqueMembersOnLeave}/{part.total}
              </span>
            </div>
            <p className="text-xs text-charcoal/60">
              本周请假 {part.uniqueMembersOnLeave} 人，共 {part.leaveCount} 人次
            </p>
          </div>
        ))}
      </div>

      {/* 本周点名表 */}
      <div className="card p-6 animate-stagger-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold font-serif text-burgundy-900 flex items-center gap-2">
              <Printer className="w-5 h-5" />
              本周排练点名表
            </h2>
            <p className="text-charcoal/60 mt-1">
              {formatDate(weekStart)} - {formatDate(weekEnd)}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-burgundy-50 rounded-xl p-1">
              <button
                onClick={handlePrevWeek}
                className="p-2 rounded-lg hover:bg-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-burgundy-700" />
              </button>
              <span className="px-3 py-1 text-sm font-medium text-burgundy-700">
                本周
              </span>
              <button
                onClick={handleNextWeek}
                className="p-2 rounded-lg hover:bg-white transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-burgundy-700" />
              </button>
            </div>
            
            <button
              onClick={handlePrint}
              className="btn-primary flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              打印点名表
            </button>
          </div>
        </div>

        {/* 点名表 */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="table-header sticky left-0 bg-burgundy-50/90 backdrop-blur-sm z-10">姓名</th>
                <th className="table-header">声部</th>
                {weekDates.map(date => (
                  <th key={date} className="table-header text-center whitespace-nowrap">
                    {formatDateShort(date)}
                  </th>
                ))}
                <th className="table-header text-center">本周请假</th>
                <th className="table-header text-center">签名</th>
              </tr>
            </thead>
            <tbody>
              {rollCallData.map((member, index) => (
                <tr key={member.id} className="table-row">
                  <td className="table-cell sticky left-0 bg-white/90 backdrop-blur-sm z-10 font-medium">
                    {member.name}
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${getVoicePartBadgeClass(member.voicePart)} text-white text-xs`}>
                      {getVoicePartName(member.voicePart)}
                    </span>
                  </td>
                  {member.weekLeaveDates.map(({ date, leave }) => (
                    <td key={date} className="table-cell text-center">
                      {leave ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-medium" title={leave.reason}>
                          ✗
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 text-xs font-medium">
                          ✓
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="table-cell text-center">
                    <span className={member.leaveCount > 0 ? 'text-red-600 font-medium' : 'text-emerald-600'}>
                      {member.leaveCount} 次
                    </span>
                  </td>
                  <td className="table-cell" style={{ minWidth: '80px' }}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 补练提醒 */}
      <div className="card p-6 animate-stagger-3">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold font-serif text-burgundy-900 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            补练提醒
            {membersNeedingReminder.length > 0 && (
              <span className="w-6 h-6 flex items-center justify-center bg-red-500 text-white text-xs rounded-full">
                {membersNeedingReminder.length}
              </span>
            )}
          </h2>
          <span className="text-sm text-charcoal/50">
            近30天出勤率低于70%或连续缺席2次以上
          </span>
        </div>

        {membersNeedingReminder.length > 0 ? (
          <div className="space-y-4">
            {membersNeedingReminder.map((stats, index) => {
              const reminderMessage = generateReminderMessage(stats);
              return (
                <div
                  key={stats.memberId}
                  className="p-4 rounded-xl bg-amber-50 border border-amber-200 animate-slide-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-full ${getVoicePartBadgeClass(stats.voicePart)} flex items-center justify-center text-white font-bold text-lg`}>
                        {stats.name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-charcoal">{stats.name}</h3>
                          <span className={`badge ${getVoicePartBadgeClass(stats.voicePart)} text-white text-xs`}>
                            {getVoicePartName(stats.voicePart)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-charcoal/70">
                          <span>出勤率: <strong className={stats.attendanceRate < 70 ? 'text-red-600' : ''}>{stats.attendanceRate}%</strong></span>
                          <span>请假: <strong>{stats.leaveCount} 次</strong></span>
                          {stats.consecutiveLeaves > 0 && (
                            <span className="text-red-600 font-medium">
                              连续缺席 {stats.consecutiveLeaves} 次
                            </span>
                          )}
                        </div>
                        <div className="mt-3 p-3 bg-white rounded-lg border border-amber-200">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="w-4 h-4 text-amber-600" />
                            <span className="text-xs font-medium text-amber-800">提醒消息：</span>
                          </div>
                          <p className="text-sm text-charcoal whitespace-pre-line">{reminderMessage}</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => copyReminder(stats.memberId, reminderMessage)}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors self-start"
                    >
                      {copiedId === stats.memberId ? (
                        <>
                          <Check className="w-4 h-4" />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          复制提醒
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-charcoal/60 font-medium">所有成员出勤正常</p>
            <p className="text-sm text-charcoal/40 mt-1">暂无需要提醒补练的成员</p>
          </div>
        )}
      </div>

      {/* 出勤统计表 */}
      <div className="card p-6 animate-stagger-4">
        <h2 className="text-xl font-bold font-serif text-burgundy-900 flex items-center gap-2 mb-6">
          <Download className="w-5 h-5" />
          出勤统计（近30天）
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">姓名</th>
                <th className="table-header">声部</th>
                <th className="table-header text-center">应到</th>
                <th className="table-header text-center">实到</th>
                <th className="table-header text-center">请假</th>
                <th className="table-header text-center">出勤率</th>
                <th className="table-header text-center">连续缺席</th>
                <th className="table-header text-center">状态</th>
              </tr>
            </thead>
            <tbody>
              {attendanceStats.map((stats, index) => (
                <tr key={stats.memberId} className={`table-row ${stats.needsReminder ? 'bg-red-50/30' : ''}`}>
                  <td className="table-cell font-medium">{stats.name}</td>
                  <td className="table-cell">
                    <span className={`badge ${getVoicePartBadgeClass(stats.voicePart)} text-white text-xs`}>
                      {getVoicePartName(stats.voicePart)}
                    </span>
                  </td>
                  <td className="table-cell text-center">{stats.totalRehearsals}</td>
                  <td className="table-cell text-center">{stats.attendedCount}</td>
                  <td className="table-cell text-center">{stats.leaveCount}</td>
                  <td className="table-cell text-center">
                    <span className={`font-medium ${
                      stats.attendanceRate >= 80 ? 'text-emerald-600' :
                      stats.attendanceRate >= 60 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {stats.attendanceRate}%
                    </span>
                  </td>
                  <td className="table-cell text-center">
                    <span className={stats.consecutiveLeaves >= 2 ? 'text-red-600 font-medium' : ''}>
                      {stats.consecutiveLeaves > 0 ? `${stats.consecutiveLeaves} 次` : '-'}
                    </span>
                  </td>
                  <td className="table-cell text-center">
                    {stats.needsReminder ? (
                      <span className="badge bg-red-100 text-red-800">需要提醒</span>
                    ) : (
                      <span className="badge bg-emerald-100 text-emerald-800">正常</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
