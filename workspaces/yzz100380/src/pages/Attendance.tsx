import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Calendar, CheckCircle, XCircle, Clock, FileText, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { getAttendanceLabel, getAttendanceColor, formatDate } from '@/utils/helpers';
import type { Attendance } from '@/types';

export default function AttendancePage() {
  const { members, sections, attendances, addAttendance, updateAttendance } = useAppStore();

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [showModal, setShowModal] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    status: 'present' as Attendance['status'],
    reason: '',
    note: '',
  });

  const todayAttendances = attendances.filter((a) => a.date === selectedDate);

  const getMemberAttendance = (memberId: string) =>
    attendances.find((a) => a.memberId === memberId && a.date === selectedDate);

  const presentCount = todayAttendances.filter((a) => a.status === 'present').length;
  const absentCount = todayAttendances.filter((a) => a.status === 'absent').length;
  const lateCount = todayAttendances.filter((a) => a.status === 'late').length;
  const leaveCount = todayAttendances.filter((a) => a.status === 'leave').length;
  const unmarkedCount = members.length - todayAttendances.length;

  const handlePrevDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleOpenModal = (memberId: string) => {
    const attendance = getMemberAttendance(memberId);
    if (attendance) {
      setEditingMemberId(memberId);
      setFormData({
        status: attendance.status,
        reason: attendance.reason || '',
        note: attendance.note || '',
      });
    } else {
      setEditingMemberId(memberId);
      setFormData({
        status: 'present',
        reason: '',
        note: '',
      });
    }
    setShowModal(true);
  };

  const handleQuickMark = (memberId: string, status: Attendance['status']) => {
    const existing = getMemberAttendance(memberId);
    if (existing) {
      updateAttendance(existing.id, { status });
    } else {
      addAttendance({
        date: selectedDate,
        memberId,
        status,
      });
    }
  };

  const handleSubmit = () => {
    if (!editingMemberId) return;

    const existing = getMemberAttendance(editingMemberId);
    if (existing) {
      updateAttendance(existing.id, formData);
    } else {
      addAttendance({
        date: selectedDate,
        memberId: editingMemberId,
        ...formData,
      });
    }
    setShowModal(false);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const groupedMembers = sections.map((section) => ({
    section,
    members: members.filter((m) => m.sectionId === section.id),
  }));

  return (
    <div className="p-6">
      <PageHeader
        title="出勤记录"
        subtitle="记录排练出勤和缺勤原因"
        actions={
          <Badge variant="default" size="md">
            <Calendar className="w-3 h-3 mr-1" />
            {members.length} 名成员
          </Badge>
        }
      />

      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrevDay}
              className="p-2 hover:bg-wood-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-wood-600" />
            </button>
            <div className="text-center">
              <h2 className="text-xl font-serif font-bold text-wood-800">
                {formatDate(selectedDate)}
              </h2>
              {isToday && (
                <Badge variant="gold" size="sm">
                  今天
                </Badge>
              )}
            </div>
            <button
              onClick={handleNextDay}
              className="p-2 hover:bg-wood-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-wood-600" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-wood-600">
                出勤 <span className="font-semibold text-green-600">{presentCount}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-wood-600">
                缺勤 <span className="font-semibold text-red-600">{absentCount}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-wood-600">
                迟到 <span className="font-semibold text-yellow-600">{lateCount}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-wood-600">
                请假 <span className="font-semibold text-blue-600">{leaveCount}</span>
              </span>
            </div>
            {unmarkedCount > 0 && (
              <div className="px-3 py-1 bg-wood-100 rounded-lg">
                <span className="text-sm text-wood-500">
                  未签到 <span className="font-semibold text-wood-700">{unmarkedCount}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        {groupedMembers.map(({ section, members: secMembers }) => (
          <Card key={section.id}>
            <div
              className="px-4 py-3 border-b border-wood-100 flex items-center gap-2"
              style={{ backgroundColor: `${section.color}10` }}
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: section.color }}
              />
              <h3 className="font-semibold text-wood-800">{section.name}</h3>
              <span className="text-sm text-wood-500">({secMembers.length} 人)</span>
            </div>
            <div className="divide-y divide-wood-50">
              {secMembers.map((member) => {
                const attendance = getMemberAttendance(member.id);
                const status = attendance?.status || 'unmarked';

                return (
                  <div
                    key={member.id}
                    className="px-4 py-3 flex items-center justify-between hover:bg-wood-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                        style={{ backgroundColor: section.color }}
                      >
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-wood-800 text-sm">
                          {member.name}
                        </div>
                        {attendance?.reason && (
                          <div className="text-xs text-wood-500">{attendance.reason}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleQuickMark(member.id, 'present')}
                          className={`p-1.5 rounded-lg transition-colors ${
                            status === 'present'
                              ? 'bg-green-100 text-green-600'
                              : 'text-wood-400 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title="出勤"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleQuickMark(member.id, 'absent')}
                          className={`p-1.5 rounded-lg transition-colors ${
                            status === 'absent'
                              ? 'bg-red-100 text-red-600'
                              : 'text-wood-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                          title="缺勤"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleQuickMark(member.id, 'late')}
                          className={`p-1.5 rounded-lg transition-colors ${
                            status === 'late'
                              ? 'bg-yellow-100 text-yellow-600'
                              : 'text-wood-400 hover:text-yellow-600 hover:bg-yellow-50'
                          }`}
                          title="迟到"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleQuickMark(member.id, 'leave')}
                          className={`p-1.5 rounded-lg transition-colors ${
                            status === 'leave'
                              ? 'bg-blue-100 text-blue-600'
                              : 'text-wood-400 hover:text-blue-600 hover:bg-blue-50'
                          }`}
                          title="请假"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>

                      {status !== 'unmarked' && (
                        <Badge
                          variant={
                            status === 'present'
                              ? 'success'
                              : status === 'absent'
                              ? 'danger'
                              : status === 'late'
                              ? 'warning'
                              : 'info'
                          }
                          size="sm"
                        >
                          {getAttendanceLabel(status as Attendance['status'])}
                        </Badge>
                      )}

                      <button
                        onClick={() => handleOpenModal(member.id)}
                        className="p-1.5 text-wood-400 hover:text-gold-600 hover:bg-gold-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-wood-lg w-full max-w-md">
            <div className="p-5 border-b border-wood-200">
              <h3 className="text-lg font-serif font-bold text-wood-800">记录出勤</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-wood-700 mb-2">
                  出勤状态
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['present', 'absent', 'late', 'leave'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setFormData({ ...formData, status: s })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.status === s
                          ? getAttendanceColor(s) + ' text-white'
                          : 'bg-wood-100 text-wood-600 hover:bg-wood-200'
                      }`}
                    >
                      {getAttendanceLabel(s)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-wood-700 mb-1.5">
                  原因
                </label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 text-sm"
                  placeholder="请假/缺勤原因"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-wood-700 mb-1.5">
                  备注
                </label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full px-3 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 text-sm resize-none"
                  rows={2}
                  placeholder="备注信息"
                />
              </div>
            </div>
            <div className="p-5 border-t border-wood-200 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowModal(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit}>保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
