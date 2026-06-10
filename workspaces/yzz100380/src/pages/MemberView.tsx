import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  Music,
  Calendar,
  Pencil,
  ChevronDown,
  ChevronUp,
  User,
  Clock,
  CheckCircle,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import {
  formatDate,
  formatDateShort,
  getDaysUntil,
  isUpcoming,
  getPracticedBarCount,
} from '@/utils/helpers';

export default function MemberView() {
  const {
    members,
    sections,
    sheets,
    practices,
    performances,
    performanceConfirms,
    currentMemberId,
    setCurrentMemberId,
  } = useAppStore();

  const [expandedSheetId, setExpandedSheetId] = useState<string | null>(null);

  const selectedMember = members.find((m) => m.id === currentMemberId) || members[0];
  const memberSection = sections.find((s) => s.id === selectedMember?.sectionId);

  const memberPractices = practices.filter(
    (p) => p.memberId === selectedMember?.id
  );

  const upcomingPerformances = performances
    .filter((p) => isUpcoming(p.date, 60))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getConfirmStatus = (perfId: string) => {
    const confirm = performanceConfirms.find(
      (pc) => pc.performanceId === perfId && pc.memberId === selectedMember?.id
    );
    return confirm?.confirmed || false;
  };

  const getPracticeForSheet = (sheetId: string) =>
    practices.find((p) => p.memberId === selectedMember?.id && p.sheetId === sheetId);

  const relatedSheets = sheets.filter((s) =>
    s.sectionIds.includes(selectedMember?.sectionId || '')
  );

  const avgMastery =
    memberPractices.length > 0
      ? Math.round(
          memberPractices.reduce((sum, p) => sum + p.mastery, 0) / memberPractices.length
        )
      : 0;

  const teacherModifiedCount = memberPractices.filter((p) => p.teacherModified).length;

  if (!selectedMember) {
    return (
      <div className="p-6">
        <PageHeader title="成员视图" subtitle="查看个人练习信息" />
        <Card className="p-12 text-center">
          <User className="w-16 h-16 mx-auto mb-4 text-wood-300" />
          <p className="text-wood-500">暂无成员数据</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="成员视图"
        subtitle="查看你的练习进度和演出安排"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={currentMemberId || selectedMember.id}
              onChange={(e) => setCurrentMemberId(e.target.value)}
              className="px-4 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 bg-white text-sm"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="p-6 text-center mb-6">
            <div
              className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-wood mb-4"
              style={{ backgroundColor: memberSection?.color || '#8B4513' }}
            >
              {selectedMember.name.charAt(0)}
            </div>
            <h2 className="text-xl font-serif font-bold text-wood-800">
              {selectedMember.name}
            </h2>
            <Badge
              className="mt-2"
              variant="gold"
              size="md"
            >
              {memberSection?.name}
            </Badge>
            {selectedMember.isLeader && (
              <Badge className="mt-2 ml-2" variant="default" size="md">
                社长
              </Badge>
            )}

            <div className="mt-6 pt-6 border-t border-wood-100 grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-gold-600">{avgMastery}%</div>
                <div className="text-xs text-wood-500 mt-1">平均掌握度</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {memberPractices.length}
                </div>
                <div className="text-xs text-wood-500 mt-1">练习记录</div>
              </div>
            </div>

            {teacherModifiedCount > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-blue-700 text-sm">
                  <Pencil className="w-4 h-4" />
                  {teacherModifiedCount} 条老师批注待查看
                </div>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="font-medium text-wood-800 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gold-500" />
              近期演出
            </h3>
            <div className="space-y-3">
              {upcomingPerformances.length > 0 ? (
                upcomingPerformances.slice(0, 3).map((perf) => {
                  const isConfirmed = getConfirmStatus(perf.id);
                  const daysUntil = getDaysUntil(perf.date);

                  return (
                    <div
                      key={perf.id}
                      className="p-3 bg-wood-50 rounded-lg border border-wood-200/50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-wood-800 text-sm">{perf.name}</h4>
                        <Badge
                          variant={isConfirmed ? 'success' : 'warning'}
                          size="sm"
                        >
                          {isConfirmed ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              已确认
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 mr-1" />
                              待确认
                            </>
                          )}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-wood-500">
                        <span>{formatDateShort(perf.date)}</span>
                        <span>•</span>
                        <span>{daysUntil}天后</span>
                      </div>
                      <div className="mt-2">
                        <div className="text-xs text-wood-500 mb-1">
                          曲目：{perf.songIds.length} 首
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-wood-400 text-sm">
                  近期没有演出安排
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="mb-6">
            <div className="p-4 border-b border-wood-100">
              <h3 className="font-medium text-wood-800 flex items-center gap-2">
                <Music className="w-5 h-5 text-gold-500" />
                我的待练曲目
              </h3>
              <p className="text-sm text-wood-500 mt-1">
                共 {relatedSheets.length} 首与你声部相关的曲谱
              </p>
            </div>

            <div className="divide-y divide-wood-50">
              {relatedSheets.map((sheet) => {
                const practice = getPracticeForSheet(sheet.id);
                const practicedCount = practice
                  ? getPracticedBarCount(practice.practicedBars)
                  : 0;
                const isExpanded = expandedSheetId === sheet.id;

                return (
                  <div key={sheet.id}>
                    <div
                      className="p-4 hover:bg-wood-50/50 cursor-pointer transition-colors"
                      onClick={() =>
                        setExpandedSheetId(isExpanded ? null : sheet.id)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              sheet.fileValid
                                ? 'bg-gold-100 text-gold-600'
                                : 'bg-red-100 text-red-500'
                            }`}
                          >
                            <Music className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-medium text-wood-800 flex items-center gap-2">
                              {sheet.title}
                              {practice?.teacherModified && (
                                <span className="text-blue-500">
                                  <Pencil className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </h4>
                            <p className="text-xs text-wood-500">
                              {sheet.composer} · {sheet.totalBars} 小节
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="w-32">
                            <ProgressBar
                              value={practice?.mastery || 0}
                              size="sm"
                              showLabel={false}
                            />
                          </div>
                          <span className="text-sm font-medium text-wood-700 w-12 text-right">
                            {practice?.mastery || 0}%
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-wood-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-wood-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 bg-wood-50/30">
                        <div className="ml-13 pl-14 space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs text-wood-500 mb-1">
                                已练习小节
                              </div>
                              <div className="text-sm font-medium text-wood-800">
                                {practice?.practicedBars || '未开始练习'}
                              </div>
                              {practice && (
                                <div className="text-xs text-wood-400">
                                  {practicedCount} / {sheet.totalBars} 小节
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-xs text-wood-500 mb-1">
                                最后练习
                              </div>
                              <div className="text-sm font-medium text-wood-800">
                                {practice?.lastPracticeDate || '-'}
                              </div>
                            </div>
                          </div>

                          {practice?.note && (
                            <div className="p-3 bg-white rounded-lg border border-wood-200">
                              <div className="text-xs text-wood-500 mb-1 flex items-center gap-1">
                                {practice.teacherModified && (
                                  <span className="flex items-center gap-1 text-blue-500">
                                    <Pencil className="w-3 h-3" />
                                    老师批注
                                  </span>
                                )}
                                {!practice.teacherModified && '练习备注'}
                              </div>
                              <p className="text-sm text-wood-700">{practice.note}</p>
                            </div>
                          )}

                          {!practice && (
                            <div className="text-sm text-wood-400 text-center py-4">
                              暂无练习记录，加油练习吧！
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="p-4 border-b border-wood-100">
              <h3 className="font-medium text-wood-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gold-500" />
                演出曲目确认
              </h3>
            </div>
            <div className="divide-y divide-wood-50">
              {upcomingPerformances.length > 0 ? (
                upcomingPerformances.map((perf) => {
                  const isConfirmed = getConfirmStatus(perf.id);
                  const perfSongs = sheets.filter((s) =>
                    perf.songIds.includes(s.id)
                  );

                  let allQualified = true;
                  for (const songId of perf.songIds) {
                    const p = getPracticeForSheet(songId);
                    if (!p || p.mastery < perf.requiredMastery) {
                      allQualified = false;
                      break;
                    }
                  }

                  return (
                    <div key={perf.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-wood-800">{perf.name}</h4>
                          <p className="text-xs text-wood-500">
                            {formatDate(perf.date)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!allQualified && (
                            <Badge variant="warning" size="sm">
                              未达标
                            </Badge>
                          )}
                          <Badge
                            variant={isConfirmed ? 'success' : 'warning'}
                            size="md"
                          >
                            {isConfirmed ? '已确认' : '待确认'}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs text-wood-500 mb-2">演出曲目：</p>
                        <div className="flex flex-wrap gap-1.5">
                          {perfSongs.map((song) => {
                            const songPractice = getPracticeForSheet(song.id);
                            const isSongQualified =
                              songPractice?.mastery || 0 >= perf.requiredMastery;
                            return (
                              <span
                                key={song.id}
                                className={`text-xs px-2 py-1 rounded-full ${
                                  isSongQualified
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-orange-100 text-orange-700'
                                }`}
                              >
                                {song.title} ({songPractice?.mastery || 0}%)
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <p className="text-xs text-wood-400 mt-2">
                        达标线：{perf.requiredMastery}%
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-wood-400">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">近期没有演出安排</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
