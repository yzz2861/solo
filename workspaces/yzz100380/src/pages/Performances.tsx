import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  Plus,
  Calendar,
  MapPin,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Music,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { formatDate, getDaysUntil, isUpcoming } from '@/utils/helpers';

export default function Performances() {
  const {
    performances,
    sheets,
    members,
    performanceConfirms,
    practices,
    addPerformance,
    updatePerformance,
    deletePerformance,
    setPerformanceConfirm,
  } = useAppStore();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'upcoming' | 'all'>('upcoming');
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    location: '',
    description: '',
    songIds: [] as string[],
    requiredMastery: 70,
  });

  const sortedPerformances = [...performances].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const displayedPerformances =
    filterTab === 'upcoming'
      ? sortedPerformances.filter((p) => isUpcoming(p.date, 365))
      : sortedPerformances;

  const getConfirmStats = (perfId: string) => {
    const confirms = performanceConfirms.filter((pc) => pc.performanceId === perfId);
    const confirmedCount = confirms.filter((c) => c.confirmed).length;
    return { confirmedCount, total: members.length };
  };

  const getUnqualifiedMembers = (perf: typeof performances[0]) => {
    return members.filter((member) => {
      let allQualified = true;
      for (const songId of perf.songIds) {
        const practice = practices.find(
          (p) => p.memberId === member.id && p.sheetId === songId
        );
        if (!practice || practice.mastery < perf.requiredMastery) {
          allQualified = false;
          break;
        }
      }
      return !allQualified;
    });
  };

  const handleOpenModal = (id?: string) => {
    if (id) {
      const perf = performances.find((p) => p.id === id);
      if (perf) {
        setEditingId(id);
        setFormData({
          name: perf.name,
          date: perf.date,
          location: perf.location || '',
          description: perf.description || '',
          songIds: perf.songIds,
          requiredMastery: perf.requiredMastery,
        });
      }
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        date: new Date().toISOString().split('T')[0],
        location: '',
        description: '',
        songIds: [],
        requiredMastery: 70,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.date) return;

    if (editingId) {
      updatePerformance(editingId, formData);
    } else {
      addPerformance(formData);
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除该演出吗？')) {
      deletePerformance(id);
    }
  };

  const toggleSong = (songId: string) => {
    setFormData((prev) => ({
      ...prev,
      songIds: prev.songIds.includes(songId)
        ? prev.songIds.filter((id) => id !== songId)
        : [...prev.songIds, songId],
    }));
  };

  const toggleConfirm = (perfId: string, memberId: string) => {
    const confirm = performanceConfirms.find(
      (pc) => pc.performanceId === perfId && pc.memberId === memberId
    );
    setPerformanceConfirm(perfId, memberId, !confirm?.confirmed);
  };

  const unconfirmedCount = performances.filter((p) => {
    const stats = getConfirmStats(p.id);
    return stats.confirmedCount < stats.total;
  }).length;

  return (
    <div className="p-6">
      <PageHeader
        title="演出曲目"
        subtitle="管理演出安排和曲目确认"
        actions={
          <div className="flex items-center gap-2">
            {unconfirmedCount > 0 && (
              <Badge variant="warning" size="md">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {unconfirmedCount} 场待确认
              </Badge>
            )}
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => handleOpenModal()}>
              添加演出
            </Button>
          </div>
        }
      />

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilterTab('upcoming')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterTab === 'upcoming'
              ? 'bg-gold-500 text-wood-900'
              : 'bg-white text-wood-600 hover:bg-wood-50 border border-wood-200'
          }`}
        >
          即将到来
        </button>
        <button
          onClick={() => setFilterTab('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterTab === 'all'
              ? 'bg-gold-500 text-wood-900'
              : 'bg-white text-wood-600 hover:bg-wood-50 border border-wood-200'
          }`}
        >
          全部演出
        </button>
      </div>

      <div className="space-y-4">
        {displayedPerformances.map((perf) => {
          const { confirmedCount, total } = getConfirmStats(perf.id);
          const confirmRate = Math.round((confirmedCount / total) * 100);
          const allConfirmed = confirmedCount === total;
          const daysUntil = getDaysUntil(perf.date);
          const isExpanded = expandedId === perf.id;
          const unqualified = getUnqualifiedMembers(perf);
          const perfSongs = sheets.filter((s) => perf.songIds.includes(s.id));

          return (
            <Card key={perf.id}>
              <div
                className="p-5 cursor-pointer hover:bg-wood-50/30 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : perf.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-gold-400 to-gold-600 rounded-xl flex flex-col items-center justify-center text-white shadow-md">
                      <span className="text-lg font-bold">
                        {new Date(perf.date).getDate()}
                      </span>
                      <span className="text-xs">
                        {new Date(perf.date).toLocaleDateString('zh-CN', { month: 'short' })}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-serif font-bold text-wood-800 flex items-center gap-2">
                        {perf.name}
                        {!allConfirmed && (
                          <span className="animate-pulse-soft">
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-wood-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(perf.date)}
                        </span>
                        {perf.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {perf.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Music className="w-3.5 h-3.5" />
                          {perf.songIds.length} 首曲目
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        {daysUntil > 0 ? (
                          <Badge variant="warning" size="sm">
                            <Clock className="w-3 h-3 mr-1" />
                            {daysUntil}天后
                          </Badge>
                        ) : daysUntil === 0 ? (
                          <Badge variant="danger" size="sm">
                            今天
                          </Badge>
                        ) : (
                          <Badge variant="default" size="sm">
                            已结束
                          </Badge>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-wood-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-wood-400" />
                        )}
                      </div>
                      <div className="mt-2 w-32">
                        <div className="flex justify-between text-xs text-wood-500 mb-1">
                          <span>确认</span>
                          <span>
                            {confirmedCount}/{total}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-wood-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              allConfirmed ? 'bg-green-500' : 'bg-gold-500'
                            }`}
                            style={{ width: `${confirmRate}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal(perf.id);
                        }}
                        className="p-2 text-wood-400 hover:text-gold-600 hover:bg-gold-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(perf.id);
                        }}
                        className="p-2 text-wood-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-wood-100 p-5 bg-wood-50/30">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-wood-800 mb-3 flex items-center gap-2">
                        <Music className="w-4 h-4 text-gold-500" />
                        演出曲目
                      </h4>
                      <div className="space-y-2">
                        {perfSongs.length > 0 ? (
                          perfSongs.map((song, idx) => (
                            <div
                              key={song.id}
                              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-wood-200"
                            >
                              <span className="w-6 h-6 bg-gold-100 text-gold-700 rounded-full flex items-center justify-center text-xs font-medium">
                                {idx + 1}
                              </span>
                              <div>
                                <div className="font-medium text-wood-800 text-sm">
                                  {song.title}
                                </div>
                                <div className="text-xs text-wood-500">
                                  {song.composer} · {song.totalBars}小节
                                </div>
                              </div>
                              {!song.fileValid && (
                                <Badge variant="danger" size="sm" className="ml-auto">
                                  路径失效
                                </Badge>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-wood-400">暂未添加曲目</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-wood-800 mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-gold-500" />
                        成员确认
                        {unqualified.length > 0 && (
                          <Badge variant="warning" size="sm">
                            {unqualified.length} 人未达标
                          </Badge>
                        )}
                      </h4>
                      <div className="space-y-1 max-h-64 overflow-y-auto">
                        {members.map((member) => {
                          const confirm = performanceConfirms.find(
                            (pc) => pc.performanceId === perf.id && pc.memberId === member.id
                          );
                          const isConfirmed = confirm?.confirmed || false;
                          const isUnqualified = unqualified.some((m) => m.id === member.id);

                          return (
                            <div
                              key={member.id}
                              className={`flex items-center justify-between p-2 rounded-lg ${
                                isConfirmed ? 'bg-green-50' : 'bg-white'
                              } border border-wood-100`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-wood-700">{member.name}</span>
                                {isUnqualified && (
                                  <span
                                    className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600"
                                    title={`掌握度低于 ${perf.requiredMastery}%`}
                                  >
                                    未达标
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleConfirm(perf.id, member.id);
                                }}
                                className={`p-1 rounded transition-colors ${
                                  isConfirmed
                                    ? 'text-green-600'
                                    : 'text-wood-300 hover:text-orange-500'
                                }`}
                              >
                                {isConfirmed ? (
                                  <CheckCircle className="w-5 h-5" />
                                ) : (
                                  <Clock className="w-5 h-5" />
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {displayedPerformances.length === 0 && (
        <Card className="p-12 text-center">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-wood-300" />
          <p className="text-wood-500">暂无演出安排</p>
          <Button
            className="mt-4"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => handleOpenModal()}
          >
            添加第一场演出
          </Button>
        </Card>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-wood-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-wood-200 sticky top-0 bg-white">
              <h3 className="text-lg font-serif font-bold text-wood-800">
                {editingId ? '编辑演出' : '添加演出'}
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-wood-700 mb-1.5">
                  演出名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 text-sm"
                  placeholder="如：夏季音乐会"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-wood-700 mb-1.5">
                    演出日期 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-wood-700 mb-1.5">
                    达标线
                  </label>
                  <input
                    type="number"
                    value={formData.requiredMastery}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requiredMastery: parseInt(e.target.value) || 70,
                      })
                    }
                    className="w-full px-3 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 text-sm"
                    min="0"
                    max="100"
                  />
                  <p className="text-xs text-wood-400 mt-1">成员需达到的掌握度 %</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-wood-700 mb-1.5">
                  演出地点
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 text-sm"
                  placeholder="如：学校大礼堂"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-wood-700 mb-2">
                  演出曲目
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-wood-200 rounded-lg p-2">
                  {sheets.map((sheet) => (
                    <label
                      key={sheet.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        formData.songIds.includes(sheet.id)
                          ? 'bg-gold-50'
                          : 'hover:bg-wood-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.songIds.includes(sheet.id)}
                        onChange={() => toggleSong(sheet.id)}
                        className="w-4 h-4 text-gold-500 rounded focus:ring-gold-300"
                      />
                      <div>
                        <div className="text-sm font-medium text-wood-800">
                          {sheet.title}
                        </div>
                        <div className="text-xs text-wood-500">
                          {sheet.composer} · {sheet.totalBars}小节
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-wood-700 mb-1.5">
                  描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 text-sm resize-none"
                  rows={2}
                  placeholder="演出描述"
                />
              </div>
            </div>
            <div className="p-5 border-t border-wood-200 flex justify-end gap-2 sticky bottom-0 bg-white">
              <Button variant="ghost" onClick={() => setShowModal(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit}>
                {editingId ? '保存修改' : '添加演出'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
