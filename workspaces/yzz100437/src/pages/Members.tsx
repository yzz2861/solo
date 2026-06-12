import { useState, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, UserX, UserCheck } from 'lucide-react';
import { MemberForm } from '../components/MemberForm';
import { useStore, useMembers } from '../store/useStore';
import { getVoicePartName, getVoicePartBadgeClass, voicePartList } from '../utils/voiceParts';
import { formatDate } from '../utils/date';
import { StarRating } from '../components/StarRating';
import { VoicePart, Member } from '../types';

export default function Members() {
  const members = useMembers();
  const deleteMember = useStore((state) => state.deleteMember);
  const leaveRecords = useStore((state) => state.leaveRecords);

  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [voicePartFilter, setVoicePartFilter] = useState<VoicePart | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesVoicePart = voicePartFilter === 'all' || member.voicePart === voicePartFilter;
      const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
      return matchesSearch && matchesVoicePart && matchesStatus;
    }).sort((a, b) => {
      const partCompare = voicePartList.findIndex(v => v.key === a.voicePart) - voicePartList.findIndex(v => v.key === b.voicePart);
      if (partCompare !== 0) return partCompare;
      return a.name.localeCompare(b.name);
    });
  }, [members, searchTerm, voicePartFilter, statusFilter]);

  const getMemberStats = (memberId: string) => {
    const memberLeaves = leaveRecords.filter(r => r.memberId === memberId);
    const recentLeaves = memberLeaves.slice(0, 5);
    const avgProficiency = recentLeaves.length > 0
      ? recentLeaves.reduce((sum, r) => sum + r.proficiency, 0) / recentLeaves.length
      : 0;
    return {
      leaveCount: memberLeaves.length,
      avgProficiency: Math.round(avgProficiency * 10) / 10,
    };
  };

  const handleAdd = () => {
    setEditingMember(null);
    setShowForm(true);
  };

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setShowForm(true);
  };

  const handleDelete = (member: Member) => {
    if (confirm(`确定要删除成员「${member.name}」吗？相关的请假记录也会被删除。`)) {
      deleteMember(member.id);
    }
  };

  const stats = useMemo(() => {
    const active = members.filter(m => m.status === 'active').length;
    const inactive = members.filter(m => m.status === 'inactive').length;
    const byVoicePart = voicePartList.map(part => ({
      ...part,
      count: members.filter(m => m.voicePart === part.key && m.status === 'active').length,
    }));
    return { total: members.length, active, inactive, byVoicePart };
  }, [members]);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-serif text-burgundy-900 text-shadow">
              成员管理
            </h1>
            <p className="text-charcoal/60 mt-1">
              共 {stats.total} 名成员，{stats.active} 名活跃，{stats.inactive} 名已离团
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            添加成员
          </button>
        </div>
      </div>

      {/* 声部统计 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-stagger-1">
        {stats.byVoicePart.map((part, index) => (
          <div
            key={part.key}
            className="card p-4"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-charcoal/60">{part.name}</p>
                <p className="text-2xl font-bold font-serif text-burgundy-900">
                  {part.count} 人
                </p>
              </div>
              <div className={`w-10 h-10 rounded-full ${getVoicePartBadgeClass(part.key as VoicePart)} flex items-center justify-center text-white font-bold`}>
                {part.name[0]}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 筛选和搜索 */}
      <div className="card p-4 animate-stagger-2">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 搜索框 */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal/40" />
            <input
              type="text"
              placeholder="搜索成员姓名..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          {/* 声部筛选 */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setVoicePartFilter('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
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
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  voicePartFilter === part.key
                    ? getVoicePartBadgeClass(part.key as VoicePart) + ' text-white'
                    : 'bg-burgundy-50 text-burgundy-700 hover:bg-burgundy-100'
                }`}
              >
                {part.name}
              </button>
            ))}
          </div>

          {/* 状态筛选 */}
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                statusFilter === 'all'
                  ? 'bg-burgundy-700 text-white'
                  : 'bg-burgundy-50 text-burgundy-700 hover:bg-burgundy-100'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1 transition-all ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              活跃
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1 transition-all ${
                statusFilter === 'inactive'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <UserX className="w-4 h-4" />
              离团
            </button>
          </div>
        </div>
      </div>

      {/* 成员列表 */}
      <div className="card overflow-hidden animate-stagger-3">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">姓名</th>
                <th className="table-header">声部</th>
                <th className="table-header">状态</th>
                <th className="table-header">请假次数</th>
                <th className="table-header">平均熟练度</th>
                <th className="table-header">加入时间</th>
                <th className="table-header text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member, index) => {
                  const memberStats = getMemberStats(member.id);
                  return (
                    <tr 
                      key={member.id} 
                      className="table-row"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full ${getVoicePartBadgeClass(member.voicePart)} flex items-center justify-center text-white font-medium`}>
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
                        <span className={`badge ${
                          member.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {member.status === 'active' ? '活跃' : '已离团'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={memberStats.leaveCount > 3 ? 'text-red-600 font-medium' : ''}>
                          {memberStats.leaveCount} 次
                        </span>
                      </td>
                      <td className="table-cell">
                        {memberStats.avgProficiency > 0 ? (
                          <StarRating value={memberStats.avgProficiency} readOnly size="sm" />
                        ) : (
                          <span className="text-charcoal/40">暂无数据</span>
                        )}
                      </td>
                      <td className="table-cell text-charcoal/60">
                        {formatDate(member.createdAt)}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(member)}
                            className="p-2 rounded-lg hover:bg-burgundy-50 text-burgundy-700 transition-colors"
                            title="编辑"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(member)}
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
                  <td colSpan={7} className="table-cell text-center py-12">
                    <div className="text-charcoal/40">
                      <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>没有找到匹配的成员</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 成员表单弹窗 */}
      {showForm && (
        <MemberForm
          member={editingMember}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
