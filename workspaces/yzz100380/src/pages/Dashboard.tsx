import { useAppStore } from '@/store/useAppStore';
import {
  AlertTriangle,
  Users,
  FileWarning,
  CheckCircle2,
  Pencil,
  Music,
  Calendar,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Clock,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import {
  formatDate,
  formatDateShort,
  isDateWithinDays,
  isUpcoming,
  getDaysUntil,
} from '@/utils/helpers';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const {
    sheets,
    members,
    sectionHistories,
    practices,
    performances,
    performanceConfirms,
    sections,
    attendances,
  } = useAppStore();

  const invalidSheets = sheets.filter((s) => !s.fileValid);

  const recentSectionChanges = sectionHistories.filter((sh) =>
    isDateWithinDays(sh.changeDate, 7)
  );

  const teacherModifiedPractices = practices.filter((p) => p.teacherModified);

  const upcomingPerformances = performances
    .filter((p) => isUpcoming(p.date, 60))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const unconfirmedPerformances = upcomingPerformances.filter((perf) => {
    const confirms = performanceConfirms.filter((pc) => pc.performanceId === perf.id);
    const confirmedCount = confirms.filter((c) => c.confirmed).length;
    return confirmedCount < members.length;
  });

  const today = new Date().toISOString().split('T')[0];
  const todayAttendances = attendances.filter((a) => a.date === today);
  const presentCount = todayAttendances.filter((a) => a.status === 'present').length;

  const totalPractices = practices.length;
  const avgMastery =
    practices.length > 0
      ? Math.round(practices.reduce((sum, p) => sum + p.mastery, 0) / practices.length)
      : 0;

  const alertCards = [
    {
      title: '曲谱路径失效',
      count: invalidSheets.length,
      icon: FileWarning,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      link: '/sheets',
    },
    {
      title: '近期声部变更',
      count: recentSectionChanges.length,
      icon: Users,
      color: 'from-amber-500 to-yellow-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      link: '/members',
    },
    {
      title: '演出待确认',
      count: unconfirmedPerformances.length,
      icon: AlertTriangle,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
      link: '/performances',
    },
    {
      title: '老师改动备注',
      count: teacherModifiedPractices.length,
      icon: Pencil,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      link: '/practice',
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="总览仪表盘"
        subtitle="欢迎回到口琴社曲谱练习柜"
        actions={
          <Badge variant="gold" size="md">
            <Sparkles className="w-3 h-3 mr-1" />
            {members.length} 名成员
          </Badge>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {alertCards.map((card) => (
          <Link to={card.link} key={card.title}>
            <Card hover className="p-4 h-full">
              <div className="flex items-start justify-between">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-md`}
                >
                  <card.icon className="w-6 h-6 text-white" />
                </div>
                {card.count > 0 && (
                  <span className={`text-2xl font-bold ${card.textColor}`}>
                    {card.count}
                  </span>
                )}
              </div>
              <div className="mt-4">
                <h3 className="font-medium text-wood-800">{card.title}</h3>
                <p className={`text-sm mt-1 ${card.textColor}`}>
                  {card.count > 0 ? `有 ${card.count} 项需要关注` : '暂无异常'}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-serif font-bold text-wood-800 flex items-center gap-2">
                <Music className="w-5 h-5 text-gold-500" />
                今日排练
              </h2>
              <Badge variant="default">{formatDate(today)}</Badge>
            </div>

            <div className="space-y-4">
              {sheets.slice(0, 3).map((sheet) => {
                const sheetPractices = practices.filter((p) => p.sheetId === sheet.id);
                const avgMasteryForSheet =
                  sheetPractices.length > 0
                    ? Math.round(
                        sheetPractices.reduce((sum, p) => sum + p.mastery, 0) /
                          sheetPractices.length
                      )
                    : 0;

                const sheetSections = sections.filter((sec) =>
                  sheet.sectionIds.includes(sec.id)
                );

                return (
                  <div
                    key={sheet.id}
                    className="p-4 bg-wood-50 rounded-lg border border-wood-200/50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-wood-800">{sheet.title}</h3>
                        <p className="text-sm text-wood-500">{sheet.composer}</p>
                      </div>
                      {!sheet.fileValid && (
                        <Badge variant="danger" size="sm">
                          路径失效
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {sheetSections.map((sec) => (
                        <span
                          key={sec.id}
                          className="text-xs px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: sec.color }}
                        >
                          {sec.name}
                        </span>
                      ))}
                    </div>
                    <ProgressBar value={avgMasteryForSheet} size="sm" showLabel={false} />
                    <div className="flex justify-between mt-1.5 text-xs text-wood-500">
                      <span>平均掌握度</span>
                      <span className="font-medium text-wood-700">{avgMasteryForSheet}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-serif font-bold text-wood-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                练习统计
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <div className="text-3xl font-bold text-green-600">{totalPractices}</div>
                <div className="text-sm text-green-700 mt-1">练习记录</div>
              </div>
              <div className="text-center p-4 bg-gold-50 rounded-xl">
                <div className="text-3xl font-bold text-gold-600">{avgMastery}%</div>
                <div className="text-sm text-gold-700 mt-1">平均掌握度</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <div className="text-3xl font-bold text-blue-600">{sheets.length}</div>
                <div className="text-sm text-blue-700 mt-1">曲谱总数</div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-serif font-bold text-wood-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gold-500" />
                近期演出
              </h2>
              <Link
                to="/performances"
                className="text-sm text-gold-600 hover:text-gold-700 flex items-center gap-0.5"
              >
                查看全部 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {upcomingPerformances.length > 0 ? (
              <div className="space-y-3">
                {upcomingPerformances.slice(0, 3).map((perf) => {
                  const confirms = performanceConfirms.filter(
                    (pc) => pc.performanceId === perf.id
                  );
                  const confirmedCount = confirms.filter((c) => c.confirmed).length;
                  const confirmRate = members.length > 0
                    ? Math.round((confirmedCount / members.length) * 100)
                    : 0;
                  const daysUntil = getDaysUntil(perf.date);

                  return (
                    <Link
                      key={perf.id}
                      to={`/performances`}
                      className="block p-3 bg-wood-50 rounded-lg border border-wood-200/50 hover:border-gold-300 hover:bg-gold-50/30 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-wood-800 text-sm">{perf.name}</h3>
                          <p className="text-xs text-wood-500 mt-0.5">
                            {formatDateShort(perf.date)}
                          </p>
                        </div>
                        <Badge
                          variant={daysUntil <= 7 ? 'warning' : 'default'}
                          size="sm"
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          {daysUntil}天后
                        </Badge>
                      </div>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-wood-500 mb-1">
                          <span>已确认</span>
                          <span>
                            {confirmedCount}/{members.length}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-wood-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gold-500 rounded-full transition-all"
                            style={{ width: `${confirmRate}%` }}
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-wood-400">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>近期没有演出安排</p>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-serif font-bold text-wood-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                今日出勤
              </h2>
              <Badge variant="success" size="sm">
                {presentCount} 人已到
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-wood-600">应到人数</span>
                <span className="font-medium text-wood-800">{members.length} 人</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-wood-600">已签到</span>
                <span className="font-medium text-green-600">{presentCount} 人</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-wood-600">未签到</span>
                <span className="font-medium text-red-600">
                  {members.length - todayAttendances.length} 人
                </span>
              </div>
            </div>
            <Link
              to="/attendance"
              className="mt-4 block text-center py-2 bg-wood-100 hover:bg-wood-200 rounded-lg text-sm text-wood-700 transition-colors"
            >
              管理出勤
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
