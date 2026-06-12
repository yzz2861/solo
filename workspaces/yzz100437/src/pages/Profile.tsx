import { useState, useMemo } from 'react';
import { User, Calendar, Award, AlertCircle, Plus } from 'lucide-react';
import { LeaveForm } from '../components/LeaveForm';
import { StarRating } from '../components/StarRating';
import { useStore, useMembers, useLeaveRecords, useCurrentMemberId } from '../store/useStore';
import { getVoicePartName, getVoicePartBadgeClass } from '../utils/voiceParts';
import { formatDate, formatDateShort, daysBetween } from '../utils/date';
import { VoicePart } from '../types';

export default function Profile() {
  const members = useMembers();
  const leaveRecords = useLeaveRecords();
  const currentMemberId = useCurrentMemberId();
  const setCurrentMember = useStore((state) => state.setCurrentMember);
  
  const [showLeaveForm, setShowLeaveForm] = useState(false);

  // 如果没有选择成员，显示成员选择器
  const availableMembers = useMemo(() => {
    return members.filter(m => m.status === 'active');
  }, [members]);

  const selectedMember = useMemo(() => {
    return members.find(m => m.id === currentMemberId);
  }, [members, currentMemberId]);

  const myLeaveRecords = useMemo(() => {
    if (!currentMemberId) return [];
    return leaveRecords
      .filter(r => r.memberId === currentMemberId)
      .sort((a, b) => new Date(b.rehearsalDate).getTime() - new Date(a.rehearsalDate).getTime());
  }, [leaveRecords, currentMemberId]);

  const stats = useMemo(() => {
    if (!currentMemberId) return null;
    
    const today = new Date().toISOString().split('T')[0];
    const last30Days = myLeaveRecords.filter(r => daysBetween(r.rehearsalDate, today) <= 30);
    const upcoming = myLeaveRecords.filter(r => daysBetween(today, r.rehearsalDate) >= 0);
    
    const avgProficiency = myLeaveRecords.length > 0
      ? myLeaveRecords.reduce((sum, r) => sum + r.proficiency, 0) / myLeaveRecords.length
      : 0;
    
    const willPerformAll = myLeaveRecords.every(r => r.willPerform);
    
    return {
      totalLeaves: myLeaveRecords.length,
      last30DaysCount: last30Days.length,
      upcomingCount: upcoming.length,
      avgProficiency: Math.round(avgProficiency * 10) / 10,
      willPerformAll,
    };
  }, [currentMemberId, myLeaveRecords]);

  if (!selectedMember) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="card p-8 animate-fade-in text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-burgundy-100 rounded-full flex items-center justify-center">
            <User className="w-10 h-10 text-burgundy-700" />
          </div>
          <h1 className="text-2xl font-bold font-serif text-burgundy-900 mb-2">
            个人中心
          </h1>
          <p className="text-charcoal/60 mb-6">
            请选择您的姓名以查看个人出勤记录
          </p>
          
          <div className="space-y-3">
            <label className="label text-left">选择成员</label>
            <select
              value={currentMemberId || ''}
              onChange={(e) => setCurrentMember(e.target.value)}
              className="select-field text-center"
            >
              <option value="">请选择您的姓名</option>
              {availableMembers
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name} - {getVoicePartName(member.voicePart)}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 个人信息卡片 */}
      <div className="card p-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className={`w-24 h-24 rounded-2xl ${getVoicePartBadgeClass(selectedMember.voicePart)} flex flex-col items-center justify-center text-white`}>
            <span className="text-3xl font-bold">{selectedMember.name[0]}</span>
            <span className="text-xs opacity-80">{getVoicePartName(selectedMember.voicePart)}</span>
          </div>
          
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold font-serif text-burgundy-900 mb-1">
              {selectedMember.name}
            </h1>
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
              <span className={`badge ${getVoicePartBadgeClass(selectedMember.voicePart)} text-white`}>
                {getVoicePartName(selectedMember.voicePart)}
              </span>
              <span className="badge bg-emerald-100 text-emerald-800">
                活跃成员
              </span>
            </div>
            <p className="text-sm text-charcoal/60">
              加入时间：{formatDate(selectedMember.createdAt)}
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowLeaveForm(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              提交请假
            </button>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-stagger-1">
          <div className="card p-4 text-center">
            <Calendar className="w-6 h-6 mx-auto mb-2 text-burgundy-700" />
            <p className="text-2xl font-bold font-serif text-burgundy-900">{stats.totalLeaves}</p>
            <p className="text-xs text-charcoal/60">总请假次数</p>
          </div>
          <div className="card p-4 text-center">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-amber-600" />
            <p className="text-2xl font-bold font-serif text-amber-700">{stats.last30DaysCount}</p>
            <p className="text-xs text-charcoal/60">近30天请假</p>
          </div>
          <div className="card p-4 text-center">
            <Calendar className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold font-serif text-blue-700">{stats.upcomingCount}</p>
            <p className="text-xs text-charcoal/60">即将到来</p>
          </div>
          <div className="card p-4 text-center">
            <Award className="w-6 h-6 mx-auto mb-2 text-gold-600" />
            <div className="flex justify-center mb-1">
              <StarRating value={stats.avgProficiency} readOnly size="sm" />
            </div>
            <p className="text-xs text-charcoal/60">平均熟练度</p>
          </div>
        </div>
      )}

      {/* 演出状态 */}
      {stats && (
        <div className={`card p-4 animate-stagger-2 ${
          stats.willPerformAll
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-charcoal">演出意愿</h3>
              <p className="text-sm text-charcoal/60">
                {stats.willPerformAll
                  ? '您所有请假记录均表示可以参加演出，感谢您的支持！'
                  : '您有请假记录表示无法参加演出，请及时与团长沟通。'}
              </p>
            </div>
            <span className={`badge ${
              stats.willPerformAll
                ? 'bg-emerald-500 text-white'
                : 'bg-red-500 text-white'
            }`}>
              {stats.willPerformAll ? '可参加演出' : '需确认演出'}
            </span>
          </div>
        </div>
      )}

      {/* 请假记录列表 */}
      <div className="card p-6 animate-stagger-3">
        <h2 className="text-xl font-bold font-serif text-burgundy-900 mb-6">
          我的请假记录
        </h2>

        {myLeaveRecords.length > 0 ? (
          <div className="space-y-4">
            {myLeaveRecords.map((record, index) => (
              <div
                key={record.id}
                className="p-4 rounded-xl bg-burgundy-50/50 border border-burgundy-100 hover:border-burgundy-200 transition-colors"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-burgundy-700 font-bold">
                      {formatDateShort(record.rehearsalDate).slice(0, 2)}
                      <span className="text-xs ml-0.5">{formatDateShort(record.rehearsalDate).slice(2)}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-charcoal">
                          {formatDate(record.rehearsalDate)}
                        </h3>
                        <span className={`badge ${
                          record.willPerform
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        } text-xs`}>
                          {record.willPerform ? '参加演出' : '不参加演出'}
                        </span>
                      </div>
                      <p className="text-sm text-charcoal/70 mb-2">
                        原因：{record.reason}
                      </p>
                      {record.notes && (
                        <p className="text-sm text-charcoal/60">
                          备注：{record.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-charcoal/50">熟练度</span>
                    <StarRating value={record.proficiency} readOnly size="sm" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
              <Award className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-charcoal/60 font-medium">暂无请假记录</p>
            <p className="text-sm text-charcoal/40 mt-1">
              您的出勤记录非常好，继续保持！
            </p>
            <button
              onClick={() => setShowLeaveForm(true)}
              className="mt-4 btn-outline"
            >
              提交请假
            </button>
          </div>
        )}
      </div>

      {/* 请假表单弹窗 */}
      {showLeaveForm && (
        <LeaveForm
          onClose={() => setShowLeaveForm(false)}
          preselectedMemberId={currentMemberId || undefined}
        />
      )}
    </div>
  );
}
