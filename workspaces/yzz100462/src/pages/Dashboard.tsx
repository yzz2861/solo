import { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Droplets,
  User,
  Mic2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useAppStore } from '@/store';
import {
  addDays,
  formatDate,
  formatDateFull,
  formatTimeRange,
  getWeekDates,
  toMinutes,
  todayISO,
  weekdayShort,
} from '@/utils';
import type { FeedingSession } from '@/types';
import SessionEditor from '@/components/SessionEditor';

const HOUR_START = 8;
const HOUR_END = 18;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => i + HOUR_START);
const ROW_HEIGHT = 48;

function timeToTop(time: string) {
  const m = toMinutes(time) - HOUR_START * 60;
  return (m / 60) * ROW_HEIGHT;
}

function timeToHeight(start: string, end: string) {
  const dur = toMinutes(end) - toMinutes(start);
  return Math.max((dur / 60) * ROW_HEIGHT, 24);
}

const statusLabel: Record<string, { text: string; cls: string }> = {
  scheduled: { text: '已排期', cls: 'badge-info' },
  completed: { text: '已完成', cls: 'badge-success' },
  cancelled: { text: '已取消', cls: 'badge-warning' },
};

export default function Dashboard() {
  const exhibits = useAppStore((s) => s.exhibits);
  const species = useAppStore((s) => s.species);
  const feeds = useAppStore((s) => s.feeds);
  const keepers = useAppStore((s) => s.keepers);
  const guides = useAppStore((s) => s.guides);
  const sessions = useAppStore((s) => s.feedingSessions);
  const waterNotes = useAppStore((s) => s.waterQualityNotes);
  const viewMode = useAppStore((s) => s.viewMode);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const deleteSession = useAppStore((s) => s.deleteFeedingSession);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<FeedingSession | null>(null);
  const [quickDate, setQuickDate] = useState<string | undefined>();
  const [quickExhibit, setQuickExhibit] = useState<string | undefined>();

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const dayDates = useMemo(() => [selectedDate], [selectedDate]);
  const dates = viewMode === 'week' ? weekDates : dayDates;

  const shift = (days: number) => {
    if (viewMode === 'week') {
      setSelectedDate(addDays(selectedDate, days * 7));
    } else {
      setSelectedDate(addDays(selectedDate, days));
    }
  };

  const handleOpenCreate = (date?: string, exhibitId?: string) => {
    setEditingSession(null);
    setQuickDate(date);
    setQuickExhibit(exhibitId);
    setEditorOpen(true);
  };

  const handleEdit = (s: FeedingSession) => {
    setEditingSession(s);
    setEditorOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确认删除该场次？')) deleteSession(id);
  };

  const speciesMap = useMemo(() => Object.fromEntries(species.map((s) => [s.id, s])), [species]);
  const feedMap = useMemo(() => Object.fromEntries(feeds.map((f) => [f.id, f])), [feeds]);
  const keeperMap = useMemo(() => Object.fromEntries(keepers.map((k) => [k.id, k])), [keepers]);
  const guideMap = useMemo(() => Object.fromEntries(guides.map((g) => [g.id, g])), [guides]);
  const exhibitMap = useMemo(() => Object.fromEntries(exhibits.map((e) => [e.id, e])), [exhibits]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-ocean-900">排班看板</h2>
          <p className="text-sm text-ocean-600 mt-1">
            按展区和时段查看投喂与讲解场次，支持拖拽与快速新增
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-ocean-200 overflow-hidden bg-white">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 text-sm font-medium transition ${
                viewMode === 'day' ? 'bg-ocean-900 text-white' : 'text-ocean-700 hover:bg-ocean-50'
              }`}
            >
              日
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-sm font-medium transition ${
                viewMode === 'week' ? 'bg-ocean-900 text-white' : 'text-ocean-700 hover:bg-ocean-50'
              }`}
            >
              周
            </button>
          </div>
          <div className="inline-flex items-center gap-1 rounded-lg border border-ocean-200 bg-white px-1">
            <button className="btn-ghost !p-1.5" onClick={() => shift(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="btn-ghost !p-1.5" onClick={() => shift(1)}>
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="px-2 text-sm font-medium text-ocean-800 min-w-[120px] text-center">
              {viewMode === 'week'
                ? `${formatDate(weekDates[0])} – ${formatDate(weekDates[6])}`
                : formatDateFull(selectedDate)}
            </div>
            <button
              className="btn-ghost !py-1 !px-2 text-xs"
              onClick={() => setSelectedDate(todayISO())}
            >
              今天
            </button>
          </div>
          <button className="btn-primary" onClick={() => handleOpenCreate()}>
            <Plus className="w-4 h-4" />
            新增场次
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-auto">
          <div className="min-w-full">
            <div className="flex border-b border-ocean-100 bg-ocean-50/60">
              <div className="w-20 shrink-0 py-3 px-3 text-xs font-medium text-ocean-500">
                <CalendarIcon className="w-4 h-4" />
              </div>
              {dates.map((d) => {
                const isToday = d === todayISO();
                return (
                  <div
                    key={d}
                    className={`flex-1 min-w-[140px] py-3 px-3 border-l border-ocean-100 ${
                      isToday ? 'bg-aqua-50/60' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium text-ocean-500">周{weekdayShort(d)}</div>
                      <div
                        className={`text-sm font-semibold ${
                          isToday ? 'text-aqua-700' : 'text-ocean-900'
                        }`}
                      >
                        {formatDate(d)}
                        {isToday && (
                          <span className="ml-1 text-[10px] text-aqua-700 bg-aqua-100 rounded px-1.5 py-0.5">
                            今天
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {exhibits.map((ex) => (
              <div key={ex.id} className="border-b border-ocean-100 last:border-b-0">
                <div className="flex">
                  <div className="w-20 shrink-0 py-3 px-3 border-r border-ocean-100 bg-ocean-50/40">
                    <div className="text-sm font-semibold text-ocean-900">{ex.name}</div>
                    <div className="text-[11px] text-ocean-500 mt-0.5 line-clamp-2">
                      {ex.description}
                    </div>
                  </div>
                  {dates.map((d) => {
                    const daySessions = sessions.filter(
                      (s) => s.date === d && s.exhibitId === ex.id,
                    );
                    const dayWater = waterNotes.filter(
                      (w) => w.date === d && w.exhibitId === ex.id,
                    );
                    return (
                      <div
                        key={`${ex.id}-${d}`}
                        className="relative flex-1 min-w-[140px] border-l border-ocean-100"
                        style={{ height: (HOUR_END - HOUR_START) * ROW_HEIGHT }}
                      >
                        {HOURS.map((h) => (
                          <div
                            key={h}
                            className="absolute left-0 right-0 border-t border-ocean-100/70"
                            style={{ top: (h - HOUR_START) * ROW_HEIGHT }}
                          >
                            <span className="text-[10px] text-ocean-400 px-1">{h}:00</span>
                          </div>
                        ))}

                        {dayWater.map((w) => (
                          <div
                            key={w.id}
                            className="absolute left-1 right-1 rounded bg-amber-100/80 border border-amber-200 px-1.5 py-0.5 text-[11px] text-amber-800 overflow-hidden"
                            style={{
                              top: timeToTop(w.startTime),
                              height: timeToHeight(w.startTime, w.endTime),
                            }}
                          >
                            <div className="flex items-center gap-1 font-medium">
                              <Droplets className="w-3 h-3" />
                              水质处理
                            </div>
                            <div className="truncate opacity-80">{w.notes}</div>
                          </div>
                        ))}

                        {daySessions.map((s) => {
                          const sp = speciesMap[s.speciesId];
                          const fd = feedMap[s.feedId];
                          const kp = keeperMap[s.keeperId];
                          const gd = s.guideId ? guideMap[s.guideId] : null;
                          const st = statusLabel[s.status] || statusLabel.scheduled;
                          return (
                            <div
                              key={s.id}
                              onClick={() => handleEdit(s)}
                              className={`absolute left-1 right-1 rounded-lg px-2 py-1.5 cursor-pointer transition hover:shadow-lg group ${
                                s.status === 'cancelled'
                                  ? 'bg-gray-100 border border-gray-200 text-gray-500'
                                  : s.isVisitorVisible
                                  ? 'bg-gradient-to-br from-ocean-500 to-ocean-700 text-white border border-ocean-600'
                                  : 'bg-white border border-ocean-200 text-ocean-900'
                              }`}
                              style={{
                                top: timeToTop(s.startTime),
                                height: timeToHeight(s.startTime, s.endTime),
                              }}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1 text-xs font-semibold truncate">
                                  <span>{sp?.emoji}</span>
                                  <span className="truncate">{sp?.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {s.isVisitorVisible ? (
                                    <Eye className="w-3 h-3 opacity-80" />
                                  ) : (
                                    <EyeOff className="w-3 h-3 opacity-60" />
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(s.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 hover:text-coral-500 transition"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <div className={`text-[11px] ${s.isVisitorVisible ? 'text-ocean-100' : 'text-ocean-500'} mt-0.5`}>
                                {formatTimeRange(s.startTime, s.endTime)}
                              </div>
                              {timeToHeight(s.startTime, s.endTime) > 40 && (
                                <div className={`text-[11px] mt-1 space-y-0.5 ${s.isVisitorVisible ? 'text-ocean-50' : 'text-ocean-700'}`}>
                                  {kp && (
                                    <div className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {kp.name}
                                    </div>
                                  )}
                                  {gd && (
                                    <div className="flex items-center gap-1">
                                      <Mic2 className="w-3 h-3" />
                                      {gd.name}
                                    </div>
                                  )}
                                  {fd && (
                                    <div className="opacity-80">
                                      {fd.name} {s.feedAmountGrams}
                                      {fd.unit}
                                    </div>
                                  )}
                                </div>
                              )}
                              {timeToHeight(s.startTime, s.endTime) > 60 && (
                                <div className="mt-1">
                                  <span className={st.cls}>{st.text}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        <button
                          onClick={() => handleOpenCreate(d, ex.id)}
                          className="absolute top-1 right-1 opacity-0 hover:opacity-100 focus:opacity-100 bg-ocean-900 text-white rounded-full p-1 transition shadow"
                          title="在该时段新增"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="section-title mb-3">图例</div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-gradient-to-br from-ocean-500 to-ocean-700" />
              游客可见场次（海报/讲解）
            </li>
            <li className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-white border border-ocean-200" />
              后台操作场次
            </li>
            <li className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-amber-100 border border-amber-200" />
              水质处理时段（不可排班）
            </li>
          </ul>
        </div>
        <div className="card p-5 md:col-span-2">
          <div className="section-title mb-3">当日场次摘要（{formatDateFull(selectedDate)}）</div>
          <div className="space-y-2">
            {sessions
              .filter((s) => s.date === selectedDate)
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((s) => {
                const sp = speciesMap[s.speciesId];
                const ex = exhibitMap[s.exhibitId];
                const kp = keeperMap[s.keeperId];
                const gd = s.guideId ? guideMap[s.guideId] : null;
                const st = statusLabel[s.status] || statusLabel.scheduled;
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-ocean-100 hover:border-ocean-300 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-2xl">{sp?.emoji || '🐾'}</div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-ocean-900 truncate">
                          {sp?.name} · {ex?.name}
                        </div>
                        <div className="text-xs text-ocean-500 flex items-center gap-2">
                          <span>{formatTimeRange(s.startTime, s.endTime)}</span>
                          <span>·</span>
                          <span>饲养 {kp?.name}</span>
                          {gd && (
                            <>
                              <span>·</span>
                              <span>讲解 {gd.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={st.cls}>
                        {s.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                        {s.status === 'cancelled' && <XCircle className="w-3 h-3" />}
                        {st.text}
                      </span>
                      {s.isVisitorVisible && <span className="badge-info">游客可见</span>}
                      <button
                        className="btn-ghost !p-1.5"
                        onClick={() => handleEdit(s)}
                        title="编辑"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            {sessions.filter((s) => s.date === selectedDate).length === 0 && (
              <div className="text-sm text-ocean-500 py-8 text-center">
                当日暂无排班，点击右上角 <Plus className="w-3.5 h-3.5 inline" /> 新增场次
              </div>
            )}
          </div>
        </div>
      </div>

      <SessionEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        editing={editingSession}
        defaultDate={quickDate}
        defaultExhibitId={quickExhibit}
      />
    </div>
  );
}
