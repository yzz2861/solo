import { useMemo, useState } from 'react';
import { useAppStore } from '@/stores/app';
import type { Seat, LostItemType } from '@/types';
import { LOST_ITEM_LABEL, VIOLATION_LABEL, ZONE_LABEL } from '@/types';
import { SeatGrid } from '@/components/SeatGrid';
import { StatCard } from '@/components/StatCard';
import { Modal, Button, LabelValue, Tag } from '@/components/UI';
import {
  LayoutGrid,
  Sparkles,
  BookOpen,
  AlertTriangle,
  Clock,
  CheckCircle,
  UserX,
  XCircle,
  Package,
  ChevronRight,
  ScanLine,
  ShieldCheck,
  User,
  QrCode,
  Trash2,
  Search,
  X,
  Sparkles as Broom,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { dayjs, formatDateTime, formatCountdown } from '@/utils';
import { useEffect } from 'react';

function useTick() {
  const [, setT] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
}

export default function ReceptionPage() {
  useTick();
  const seats = useAppStore((s) => s.seats);
  const reservations = useAppStore((s) => s.reservations);
  const violations = useAppStore((s) => s.violations);
  const lockers = useAppStore((s) => s.lockers);
  const lostItems = useAppStore((s) => s.lostItems);
  const currentClearance = useAppStore((s) => s.currentClearance);
  const currentUser = useAppStore((s) => s.currentUser);
  const checkIn = useAppStore((s) => s.checkIn);
  const checkOut = useAppStore((s) => s.checkOut);
  const forceReleaseSeat = useAppStore((s) => s.forceReleaseSeat);
  const markViolationHandled = useAppStore((s) => s.markViolationHandled);
  const startClearance = useAppStore((s) => s.startClearance);
  const checkSeatInClearance = useAppStore((s) => s.checkSeatInClearance);
  const addLostItem = useAppStore((s) => s.addLostItem);
  const completeClearance = useAppStore((s) => s.completeClearance);
  const markLostItemClaimed = useAppStore((s) => s.markLostItemClaimed);

  const operator = currentUser?.role === 'reception' ? currentUser.name : '前台小林';
  const [seatDetail, setSeatDetail] = useState<Seat | null>(null);
  const [releaseModal, setReleaseModal] = useState(false);
  const [releaseReason, setReleaseReason] = useState('');
  const [filter, setFilter] = useState<'all' | 1 | 2>('all');
  const [lostModal, setLostModal] = useState(false);
  const [lostSeat, setLostSeat] = useState<Seat | null>(null);
  const [lostType, setLostType] = useState<LostItemType>('other');
  const [lostDesc, setLostDesc] = useState('');
  const [violTab, setViolTab] = useState<'pending' | 'all'>('pending');
  const [search, setSearch] = useState('');

  const stats = useMemo(() => {
    const total = seats.length;
    const available = seats.filter((s) => s.status === 'available').length;
    const inUse = seats.filter((s) => s.status === 'in_use').length;
    const temp = seats.filter((s) => s.status === 'temporarily_away').length;
    const viol = seats.filter((s) => s.status === 'violation').length;
    const pendingCheckin = reservations.filter((r) => r.status === 'pending_checkin').length;
    return { total, available, inUse, temp, viol, pendingCheckin };
  }, [seats, reservations]);

  const pendingReservations = useMemo(() => {
    return reservations
      .filter((r) => r.status === 'pending_checkin')
      .sort((a, b) => a.reservationExpireAt - b.reservationExpireAt);
  }, [reservations]);

  const violationList = useMemo(() => {
    let list = [...violations].sort((a, b) => b.occurredAt - a.occurredAt);
    if (violTab === 'pending') list = list.filter((v) => !v.handled);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (v) =>
          v.seatCode.toLowerCase().includes(q) ||
          (v.studentName || '').toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q),
      );
    }
    return list;
  }, [violations, violTab, search]);

  const unclaimedLost = useMemo(
    () => lostItems.filter((l) => !l.claimed).sort((a, b) => b.foundAt - a.foundAt),
    [lostItems],
  );

  const clearanceSeatChecked = (id: string) =>
    currentClearance?.seatsChecked.includes(id) ?? false;

  const filteredSeats = useMemo(() => {
    if (filter === 'all') return seats;
    return seats.filter((s) => s.floor === filter);
  }, [seats, filter]);

  const handleRelease = () => {
    if (!seatDetail) return;
    const reason = releaseReason.trim() || '前台强制释放';
    forceReleaseSeat(seatDetail.id, reason, operator);
    setReleaseModal(false);
    setReleaseReason('');
    setSeatDetail(null);
  };

  const handleSubmitLost = () => {
    if (!lostSeat || !lostDesc.trim()) return;
    addLostItem({
      seatId: lostSeat.id,
      seatCode: lostSeat.code,
      type: lostType,
      description: lostDesc.trim(),
    });
    setLostModal(false);
    setLostSeat(null);
    setLostDesc('');
    setLostType('other');
  };

  const openLostForSeat = (seat: Seat) => {
    setLostSeat(seat);
    setLostModal(true);
  };

  const onSeatClick = (seat: Seat) => {
    if (currentClearance) {
      checkSeatInClearance(seat.id);
    }
    if (seat.status !== 'available') setSeatDetail(seat);
  };

  return (
    <div className="grain-bg min-h-[calc(100vh-64px)]">
      <div className="mx-auto max-w-[1600px] px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink-800">前台工作台</h1>
            <p className="mt-1 text-sm text-ink-500">
              实时监控座位状态 · 处理签到与违规 · 清场与遗留物管理
              {currentClearance && (
                <span className="ml-3 inline-flex items-center gap-1 rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-700 animate-breath">
                  <Broom size={12} /> 清场模式进行中
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-ink-200 bg-white p-1">
              {(['all', 1, 2] as const).map((f) => (
                <button
                  key={String(f)}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'rounded-lg px-3.5 py-1.5 text-sm font-medium transition',
                    filter === f
                      ? 'bg-ink-700 text-white'
                      : 'text-ink-600 hover:bg-ink-50',
                  )}
                >
                  {f === 'all' ? '全部' : `${f}楼`}
                </button>
              ))}
            </div>
            {!currentClearance ? (
              <Button variant="warn" onClick={() => startClearance(operator)}>
                <Broom size={16} /> 开始清场
              </Button>
            ) : (
              <Button
                variant="danger"
                onClick={completeClearance}
                disabled={currentClearance.seatsChecked.length < 30}
              >
                <CheckCircle size={16} /> 完成清场
                {currentClearance.seatsChecked.length > 0 && (
                  <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                    {currentClearance.seatsChecked.length}
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <StatCard label="空闲座位" value={stats.available} accent="moss" icon={<Sparkles size={20} />} hint={`/ 共${stats.total}座`} />
          <StatCard label="使用中" value={stats.inUse} accent="ink" icon={<BookOpen size={20} />} hint="正在学习" />
          <StatCard label="临时离座" value={stats.temp} accent="amber" icon={<Clock size={20} />} hint="倒计时中" />
          <StatCard label="待签到" value={stats.pendingCheckin} accent="amber" icon={<ScanLine size={20} />} hint="即将签到" />
          <StatCard label="违规待处理" value={stats.viol} accent="clay" icon={<AlertTriangle size={20} />} hint="需关注" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_400px]">
          <div className="space-y-6">
            <SeatGrid
              seats={filteredSeats}
              selectedSeatId={seatDetail?.id}
              showChecked={clearanceSeatChecked}
              onSeatClick={onSeatClick}
            />
          </div>

          <aside className="space-y-5">
            <div className="card-shadow rounded-2xl border border-ink-100 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink-800">
                  <ScanLine size={18} /> 待签到列表
                </h3>
                <Tag tone="amber">{pendingReservations.length}</Tag>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin pr-1">
                {pendingReservations.length === 0 && (
                  <div className="rounded-xl bg-ink-50 py-8 text-center text-sm text-ink-500">
                    暂无待签到
                  </div>
                )}
                {pendingReservations.map((r) => {
                  const now = Date.now();
                  const ms = r.reservationExpireAt - now;
                  const urgent = ms < 5 * 60 * 1000;
                  return (
                    <div
                      key={r.id}
                      className={cn(
                        'flex items-center justify-between rounded-xl border p-3 transition',
                        urgent ? 'border-clay-200 bg-clay-50' : 'border-ink-100 bg-white',
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink-800">{r.seatCode}</span>
                          <span className="text-xs text-ink-500">柜{r.lockerCode}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-ink-600">
                          {r.studentName} · {r.studentPhone}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'text-right tabular-nums text-sm font-semibold',
                            urgent ? 'text-clay-500 animate-breath' : 'text-amber-600',
                          )}
                        >
                          {formatCountdown(ms)}
                        </div>
                        <Button size="sm" variant="primary" onClick={() => checkIn(r.id)}>
                          <QrCode size={12} /> 签到
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card-shadow rounded-2xl border border-ink-100 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink-800">
                  <ShieldCheck size={18} /> 违规记录
                </h3>
                <div className="flex items-center gap-1">
                  <input
                    className="hidden"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="搜索"
                  />
                  <div className="flex rounded-lg border border-ink-200 p-0.5 text-xs">
                    <button
                      onClick={() => setViolTab('pending')}
                      className={cn(
                        'rounded-md px-2.5 py-1 transition',
                        violTab === 'pending'
                          ? 'bg-ink-700 text-white'
                          : 'text-ink-600 hover:bg-ink-50',
                      )}
                    >
                      待处理
                    </button>
                    <button
                      onClick={() => setViolTab('all')}
                      className={cn(
                        'rounded-md px-2.5 py-1 transition',
                        violTab === 'all' ? 'bg-ink-700 text-white' : 'text-ink-600 hover:bg-ink-50',
                      )}
                    >
                      全部
                    </button>
                  </div>
                </div>
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={14} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索座位号/姓名"
                  className="w-full rounded-lg border border-ink-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-ink-500 focus:ring-2 focus:ring-ink-100"
                />
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
                {violationList.length === 0 && (
                  <div className="rounded-xl bg-ink-50 py-8 text-center text-sm text-ink-500">
                    暂无记录
                  </div>
                )}
                {violationList.map((v) => (
                  <div
                    key={v.id}
                    className={cn(
                      'rounded-xl border p-3 text-xs',
                      v.handled
                        ? 'border-ink-100 bg-white opacity-80'
                        : 'border-clay-200 bg-clay-50/60',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Tag tone={v.handled ? 'ink' : 'clay'}>
                          {VIOLATION_LABEL[v.type]}
                        </Tag>
                        <b className="text-ink-800">{v.seatCode}</b>
                        {v.studentName && (
                          <span className="truncate text-ink-500">{v.studentName}</span>
                        )}
                      </div>
                      {!v.handled && (
                        <button
                          onClick={() => markViolationHandled(v.id, operator)}
                          className="shrink-0 rounded-md bg-moss-100 px-2 py-1 text-[10px] font-medium text-moss-700 transition hover:bg-moss-200"
                        >
                          标记已处理
                        </button>
                      )}
                    </div>
                    <div className="mt-2 text-ink-600 leading-relaxed">{v.description}</div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-ink-400">
                      <span>{formatDateTime(v.occurredAt)}</span>
                      {v.handledBy && <span>处理人：{v.handledBy}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-shadow rounded-2xl border border-ink-100 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink-800">
                  <Package size={18} /> 遗留物待认领
                </h3>
                <Tag tone="amber">{unclaimedLost.length}</Tag>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin pr-1">
                {unclaimedLost.length === 0 && (
                  <div className="rounded-xl bg-ink-50 py-8 text-center text-sm text-ink-500">
                    暂无遗留物
                  </div>
                )}
                {unclaimedLost.map((it) => (
                  <div key={it.id} className="rounded-xl border border-ink-100 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag tone="amber">{LOST_ITEM_LABEL[it.type]}</Tag>
                        <b className="text-xs text-ink-800">{it.seatCode}</b>
                      </div>
                      <button
                        onClick={() => markLostItemClaimed(it.id, operator)}
                        className="rounded-md bg-moss-100 px-2 py-1 text-[10px] font-medium text-moss-700 transition hover:bg-moss-200"
                      >
                        标记已领
                      </button>
                    </div>
                    <div className="mt-1.5 text-xs text-ink-600 leading-relaxed">
                      {it.description}
                    </div>
                    <div className="mt-1 text-[10px] text-ink-400">
                      拾于 {formatDateTime(it.foundAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <Modal
          open={!!seatDetail}
          onClose={() => setSeatDetail(null)}
          title={`座位 ${seatDetail?.code ?? ''} 详情`}
          subtitle={seatDetail ? `${ZONE_LABEL[seatDetail.zone]} · ${seatDetail.floor}楼` : ''}
          footer={
            seatDetail && seatDetail.status !== 'available' ? (
              <div className="flex justify-between items-center">
                {currentClearance && (
                  <Button
                    variant="outline"
                    onClick={() => openLostForSeat(seatDetail)}
                  >
                    <Package size={14} /> 登记遗留物
                  </Button>
                )}
                <div className="flex gap-2">
                  {seatDetail.status === 'temporarily_away' && (
                    <Button variant="outline" onClick={() => { checkOut(seatDetail.id); setSeatDetail(null); }}>
                      <UserX size={14} /> 离座释放
                    </Button>
                  )}
                  {(seatDetail.status === 'violation' ||
                    seatDetail.status === 'in_use' ||
                    seatDetail.status === 'temporarily_away') && (
                    <Button variant="danger" onClick={() => setReleaseModal(true)}>
                      <XCircle size={14} /> 强制释放
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => setSeatDetail(null)}>
                    关闭
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button variant="ghost" onClick={() => setSeatDetail(null)}>关闭</Button>
              </div>
            )
          }
        >
          {seatDetail && (
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Tag
                  tone={
                    seatDetail.status === 'available'
                      ? 'moss'
                      : seatDetail.status === 'violation'
                        ? 'clay'
                        : seatDetail.status === 'reserved'
                          ? 'amber'
                          : 'ink'
                  }
                >
                  {({
                    available: '空闲',
                    reserved: '已预约',
                    in_use: '使用中',
                    temporarily_away: '临时离座',
                    violation: '违规',
                  } as Record<string, string>)[seatDetail.status]}
                </Tag>
                {seatDetail.studentName && (
                  <span className="text-xs text-ink-500">
                    <User className="mr-1 inline" size={12} />
                    {seatDetail.studentName}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <LabelValue label="区域" value={`${seatDetail.zone}区 · ${seatDetail.floor}楼`} />
                <LabelValue
                  label="储物柜"
                  value={
                    seatDetail.lockerId
                      ? lockers.find((l) => l.id === seatDetail.lockerId)?.code ?? '--'
                      : '--'
                  }
                />
                {seatDetail.checkInAt && (
                  <LabelValue
                    label="签到时间"
                    value={formatDateTime(seatDetail.checkInAt)}
                    hint={
                      '已使用 ' +
                      formatCountdown(Date.now() - seatDetail.checkInAt).replace(':', '时') + '分'
                    }
                  />
                )}
                {seatDetail.status === 'reserved' && seatDetail.reservationExpireAt && (
                  <LabelValue
                    label="签到截止"
                    value={formatDateTime(seatDetail.reservationExpireAt)}
                    hint={
                      '剩余 ' +
                      formatCountdown(seatDetail.reservationExpireAt - Date.now())
                    }
                  />
                )}
                {seatDetail.status === 'temporarily_away' && seatDetail.tempAwayExpireAt && (
                  <>
                    <LabelValue
                      label="离座时间"
                      value={seatDetail.tempAwayAt ? formatDateTime(seatDetail.tempAwayAt) : '--'}
                    />
                    <LabelValue
                      label="返回时限"
                      value={formatDateTime(seatDetail.tempAwayExpireAt)}
                      hint={
                        '剩余 ' +
                        formatCountdown(seatDetail.tempAwayExpireAt - Date.now()) +
                        ' · 续时剩' +
                        (seatDetail.tempAwayExtensionsLeft ?? 0) +
                        '次'
                      }
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </Modal>

        <Modal
          open={releaseModal}
          onClose={() => setReleaseModal(false)}
          title="强制释放座位"
          subtitle="将同时释放储物柜并记录违规，请谨慎操作"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setReleaseModal(false)}>
                取消
              </Button>
              <Button variant="danger" onClick={handleRelease}>
                <Trash2 size={14} /> 确认释放
              </Button>
            </div>
          }
        >
          <div className="mb-4 rounded-xl bg-clay-50 p-3 text-xs text-clay-700 leading-relaxed">
            <AlertTriangle className="mr-1 inline" size={12} />
            此操作将立即释放座位 {seatDetail?.code}，同步释放关联储物柜，
            并生成一条「前台强制释放」的违规记录。
          </div>
          <label className="mb-1.5 block text-sm font-medium text-ink-700">释放原因</label>
          <textarea
            value={releaseReason}
            onChange={(e) => setReleaseReason(e.target.value)}
            rows={4}
            placeholder="如：学生长时间未归、长时间无人、物品遗留等"
            className="w-full resize-none rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-clay-500 focus:ring-2 focus:ring-clay-100"
          />
        </Modal>

        <Modal
          open={lostModal}
          onClose={() => setLostModal(false)}
          title={`登记遗留物 · 座位 ${lostSeat?.code ?? ''}`}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setLostModal(false)}>
                取消
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitLost}
                disabled={!lostDesc.trim()}
              >
                <CheckCircle size={14} /> 确认登记
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">遗留物类型</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(LOST_ITEM_LABEL) as LostItemType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setLostType(t)}
                    className={cn(
                      'rounded-xl border-2 px-3 py-2 text-xs font-medium transition',
                      lostType === t
                        ? 'border-amber-400 bg-amber-50 text-amber-700'
                        : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300',
                    )}
                  >
                    {LOST_ITEM_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">详细描述</label>
              <textarea
                value={lostDesc}
                onChange={(e) => setLostDesc(e.target.value)}
                rows={3}
                placeholder="颜色、品牌、特征、数量等"
                className="w-full resize-none rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-ink-500 focus:ring-2 focus:ring-ink-100"
              />
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
