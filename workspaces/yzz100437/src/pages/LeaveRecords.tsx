import { useState, useMemo } from 'react';
import { Plus, Search, Filter, Trash2, Calendar, User, Music } from 'lucide-react';
import { LeaveForm } from '../components/LeaveForm';
import { StarRating } from '../components/StarRating';
import { useStore, useMembers, useLeaveRecords } from '../store/useStore';
import { getVoicePartName, getVoicePartBadgeClass, voicePartList } from '../utils/voiceParts';
import { formatDate, formatDateShort } from '../utils/date';
import { VoicePart } from '../types';

export default function LeaveRecords() {
  const members = useMembers();
  const leaveRecords = useLeaveRecords();
  const deleteLeave = useStore((state) => state.deleteLeave);

  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [voicePartFilter, setVoicePartFilter] = useState<VoicePart | 'all'>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [willPerformFilter, setWillPerformFilter] = useState<'all' | 'yes' | 'no'>('all');

  const filteredRecords = useMemo(() => {
    return leaveRecords
      .filter(record => {
        const member = members.find(m => m.id === record.memberId);
        if (!member) return false;

        const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              record.reason.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesVoicePart = voicePartFilter === 'all' || member.voicePart === voicePartFilter;
        const matchesDate = !dateFilter || record.rehearsalDate === dateFilter;
        const matchesWillPerform = willPerformFilter === 'all' || 
          (willPerformFilter === 'yes' && record.willPerform) ||
          (willPerformFilter === 'no' && !record.willPerform);

        return matchesSearch && matchesVoicePart && matchesDate && matchesWillPerform;
      })
      .sort((a, b) => new Date(b.rehearsalDate).getTime() - new Date(a.rehearsalDate).getTime());
  }, [leaveRecords, members, searchTerm, voicePartFilter, dateFilter, willPerformFilter]);

  const getMember = (memberId: string) => members.find(m => m.id === memberId);

  const handleDelete = (id: string, memberName: string) => {
    if (confirm(`确定要删除「${memberName}」的这条请假记录吗？`)) {
      deleteLeave(id);
    }
  };

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayLeaves = leaveRecords.filter(r => r.rehearsalDate === today).length;
    const upcomingLeaves = leaveRecords.filter(r => r.rehearsalDate >= today).length;
    const notPerforming = leaveRecords.filter(r => !r.willPerform).length;
    
    return {
      total: leaveRecords.length,
      today: todayLeaves,
      upcoming: upcomingLeaves,
      notPerforming,
    };
  }, [leaveRecords]);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-serif text-burgundy-900 text-shadow">
              请假管理
            </h1>
            <p className="text-charcoal/60 mt-1">
              共 {stats.total} 条请假记录，今日 {stats.today} 人请假
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            提交请假
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-stagger-1">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-burgundy-100 rounded-xl">
              <Calendar className="w-5 h-5 text-burgundy-700" />
            </div>
            <div>
              <p className="text-xs text-charcoal/60">总请假数</p>
              <p className="text-xl font-bold font-serif text-burgundy-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl">
              <User className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="text-xs text-charcoal/60">今日请假</p>
              <p className="text-xl font-bold font-serif text-amber-700">{stats.today}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Calendar className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <p className="text-xs text-charcoal/60">即将到来</p>
              <p className="text-xl font-bold font-serif text-blue-700">{stats.upcoming}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-xl">
              <Music className="w-5 h-5 text-red-700" />
            </div>
            <div>
              <p className="text-xs text-charcoal/60">不参加演出</p>
              <p className="text-xl font-bold font-serif text-red-700">{stats.notPerforming}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="card p-4 animate-stagger-2">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 搜索框 */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal/40" />
            <input
              type="text"
              placeholder="搜索姓名或请假原因..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          {/* 日期筛选 */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-charcoal/50" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="input-field w-auto"
              placeholder="选择日期"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-xs text-charcoal/50 hover:text-burgundy-700"
              >
                清除
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-burgundy-100">
          {/* 声部筛选 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-charcoal/60">声部：</span>
            <button
              onClick={() => setVoicePartFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                voicePartFilter === 'all'
                  ? 'bg-burgundy-700 text-white'
                  : 'bg-burgundy-50 text-burgundy-700 hover:bg-burgundy-100'
              }`}
            >
              全部
            </button>
            {voicePartList.map((part) => (
              <button
                key={part.key}
                onClick={() => setVoicePartFilter(part.key as VoicePart)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  voicePartFilter === part.key
                    ? getVoicePartBadgeClass(part.key as VoicePart) + ' text-white'
                    : 'bg-burgundy-50 text-burgundy-700 hover:bg-burgundy-100'
                }`}
              >
                {part.name}
              </button>
            ))}
          </div>

          {/* 演出意愿筛选 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-charcoal/60">演出意愿：</span>
            <button
              onClick={() => setWillPerformFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                willPerformFilter === 'all'
                  ? 'bg-burgundy-700 text-white'
                  : 'bg-burgundy-50 text-burgundy-700 hover:bg-burgundy-100'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setWillPerformFilter('yes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                willPerformFilter === 'yes'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              参加
            </button>
            <button
              onClick={() => setWillPerformFilter('no')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                willPerformFilter === 'no'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              不参加
            </button>
          </div>
        </div>
      </div>

      {/* 请假记录列表 */}
      <div className="card overflow-hidden animate-stagger-3">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">成员</th>
                <th className="table-header">声部</th>
                <th className="table-header">排练日期</th>
                <th className="table-header">请假原因</th>
                <th className="table-header">熟练度</th>
                <th className="table-header">演出意愿</th>
                <th className="table-header">备注</th>
                <th className="table-header text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record, index) => {
                  const member = getMember(record.memberId);
                  if (!member) return null;
                  
                  return (
                    <tr key={record.id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${getVoicePartBadgeClass(member.voicePart)} flex items-center justify-center text-white text-sm font-medium`}>
                            {member.name[0]}
                          </div>
                          <span className="font-medium">{member.name}</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${getVoicePartBadgeClass(member.voicePart)} text-white`}>
                          {getVoicePartName(member.voicePart)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-charcoal/40" />
                          <span>{formatDateShort(record.rehearsalDate)}</span>
                        </div>
                      </td>
                      <td className="table-cell">{record.reason}</td>
                      <td className="table-cell">
                        <StarRating value={record.proficiency} readOnly size="sm" />
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${
                          record.willPerform
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {record.willPerform ? '参加' : '不参加'}
                        </span>
                      </td>
                      <td className="table-cell max-w-[200px]">
                        <span className="text-sm text-charcoal/60 truncate block">
                          {record.notes || '-'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => handleDelete(record.id, member.name)}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="table-cell text-center py-12">
                    <div className="text-charcoal/40">
                      <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>没有找到匹配的请假记录</p>
                      <button
                        onClick={() => setShowForm(true)}
                        className="mt-3 text-burgundy-700 hover:underline text-sm"
                      >
                        + 提交第一条请假
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 请假表单弹窗 */}
      {showForm && (
        <LeaveForm onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
