import { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '@/stores/app';
import type { Seat } from '@/types';
import { SeatGrid } from '@/components/SeatGrid';
import { Modal, Button, LabelValue, Tag } from '@/components/UI';
import {
  Clock,
  MapPin,
  User as UserIcon,
  QrCode,
  LogOut,
  Hand,
  PlayCircle,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  Phone,
  Lock,
  RefreshCw as SwapIcon,
} from 'lucide-react';
import { dayjs, formatCountdown, formatDateTime, formatMinutes, deriveStudentId } from '@/utils';
import { cn } from '@/lib/utils';

function useCountdown(target?: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);
  if (!target) return { ms: 0, expired: false };
  const ms = target - now;
  return { ms, expired: ms <= 0 };
}

export default function StudentPage() {
  const seats = useAppStore((s) => s.seats);
  const lockers = useAppStore((s) => s.lockers);
  const currentUser = useAppStore((s) => s.currentUser);
  const reserveSeat = useAppStore((s) => s.reserveSeat);
  const cancelReservation = useAppStore((s) => s.cancelReservation);
  const checkIn = useAppStore((s) => s.checkIn);
  const checkOut = useAppStore((s) => s.checkOut);
  const markTempAway = useAppStore((s) => s.markTempAway);
  const extendTempAway = useAppStore((s) => s.extendTempAway);
  const returnFromTempAway = useAppStore((s) => s.returnFromTempAway);
  const swapLocker = useAppStore((s) => s.swapLocker);
  const getAvailableLockers = useAppStore((s) => s.getAvailableLockers);

  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [reserveModal, setReserveModal] = useState(false);
  const [studentName, setStudentName] = useState('张三');
  const [studentPhone, setStudentPhone] = useState('13800000001');
  const [floorFilter, setFloorFilter] = useState<1 | 2 | 'all'>('all');
  const [lockerModal, setLockerModal] = useState(false);
  const [swapError, setSwapError] = useState('');

  const studentId = useMemo(
    () => {
      const name = currentUser?.role === 'student' ? currentUser.name : studentName;
      const base = currentUser?.role === 'student' ? currentUser.id : 'stu_zhangsan';
      const canonical = deriveStudentId(name);
      return base.startsWith('stu_') ? base : canonical;
    },
    [currentUser, studentName],
  );
  const displayName = useMemo(
    () => currentUser?.role === 'student' ? currentUser.name : studentName,
    [currentUser, studentName],
  );
  const canonicalId = useMemo(() => deriveStudentId(displayName), [displayName]);

  const mySeat = useMemo(
    () =>
      seats.find(
        (s) =>
          (s.studentId === studentId || s.studentId === canonicalId ||
            (s.studentName && s.studentName.trim() === displayName.trim())) &&
          (s.status === 'reserved' ||
            s.status === 'in_use' ||
            s.status === 'temporarily_away' ||
            s.status === 'violation'),
      ),
    [seats, studentId, canonicalId, displayName],
  );

  const myReservation = useMemo(() => {
    if (!mySeat) return null;
    return useAppStore
      .getState()
      .reservations.find(
        (r) =>
          r.seatId === mySeat.id &&
          (r.status === 'pending_checkin' ||
            r.status === 'checked_in' ||
            r.status === 'violation'),
      );
  }, [mySeat]);

  const myLocker = useMemo(
    () => (mySeat?.lockerId ? lockers.find((l) => l.id === mySeat.lockerId) : undefined),
    [lockers, mySeat],
  );

  const reserveCd = useCountdown(mySeat?.reservationExpireAt);
  const tempAwayCd = useCountdown(mySeat?.tempAwayExpireAt);

  const handleReserve = () => {
    if (!selectedSeat) return;
    const name = displayName.trim() || studentName;
    const phone = studentPhone.trim() || '13800000000';
    const r = reserveSeat({
      seatId: selectedSeat.id,
      studentId,
      studentName: name,
      studentPhone: phone,
    });
    if (r.ok) {
      setReserveModal(false);
      setSelectedSeat(null);
    }
  };

  const handleSwapLocker = (newLockerId: string) => {
    if (!mySeat) return;
    setSwapError('');
    const res = swapLocker(mySeat.id, newLockerId);
    if (!res.ok) setSwapError(res.error || '更换失败');
    else setLockerModal(false);
  };

  const availableLockersForSwap = mySeat ? getAvailableLockers(mySeat.zone) : [];

  const statusBar = (() => {
    if (!mySeat) {
      return (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-5 text-center">
          <div className="text-sm text-ink-500">暂无使用中的座位</div>
          <div className="mt-1 text-xs text-ink-400">从下方座位图选择一个空闲座位开始预约</div>
        </div>
      );
    }
    if (mySeat.status === 'reserved') {
      const urgent = reserveCd.ms < 5 * 60 * 1000;
      return (
        <div
          className={cn(
            'rounded-2xl border p-5 transition',
            urgent ? 'border-clay-300 bg-clay-50' : 'border-amber-200 bg-amber-50',
          )}
        >
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Tag tone="amber">待签到</Tag>
                {urgent && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-clay-100 px-2 py-0.5 text-xs text-clay-600 animate-breath">
                    <AlertCircle size={12} /> 即将超时
                  </span>
                )}
              </div>
              <div className="mt-3 font-display text-3xl font-semibold text-ink-800">
                座位 {mySeat.code} · 柜 {myLocker?.code ?? '--'}
              </div>
              <div className="mt-1 text-sm text-ink-600">
                请于 <b>{formatDateTime(mySeat.reservationExpireAt!)}</b> 之前到店签到
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div
                  className={cn(
                    'font-display text-4xl font-semibold tabular-nums',
                    urgent ? 'text-clay-500 animate-breath' : 'text-amber-700',
                  )}
                >
                  {formatCountdown(reserveCd.ms)}
                </div>
                <div className="text-xs text-ink-500 mt-1">剩余签到时间</div>
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={() => myReservation && checkIn(myReservation.id)} variant="primary" size="lg">
                  <QrCode size={16} /> 扫码签到
                </Button>
                <Button
                  onClick={() => myReservation && cancelReservation(myReservation.id)}
                  variant="ghost"
                  size="sm"
                >
                  取消预约
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    if (mySeat.status === 'in_use') {
      const used = mySeat.checkInAt ? formatMinutes(Date.now() - mySeat.checkInAt) : '0分钟';
      return (
        <div className="rounded-2xl border border-moss-200 bg-gradient-to-br from-moss-50 to-white p-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Tag tone="moss">使用中</Tag>
                <span className="text-xs text-ink-500">已使用 {used}</span>
              </div>
              <div className="mt-3 font-display text-3xl font-semibold text-ink-800">
                座位 {mySeat.code} · 柜 {myLocker?.code ?? '--'}
                <button
                  onClick={() => {
                    setSwapError('');
                    setLockerModal(true);
                  }}
                  className="ml-3 inline-flex items-center gap-1 rounded-lg border border-ink-200 bg-white px-2.5 py-1 text-xs text-ink-600 transition hover:bg-ink-50 align-middle"
                >
                  <SwapIcon size={12} /> 更换储物柜
                </button>
              </div>
              <div className="mt-1 text-sm text-ink-600">
                签到于 {mySeat.checkInAt ? formatDateTime(mySeat.checkInAt) : '--'}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="lg" onClick={() => markTempAway(mySeat.id)}>
                <Hand size={16} /> 临时离座
              </Button>
              <Button variant="primary" size="lg" onClick={() => checkOut(mySeat.id)}>
                <LogOut size={16} /> 结束离座
              </Button>
            </div>
          </div>
        </div>
      );
    }
    if (mySeat.status === 'temporarily_away') {
      const urgent = tempAwayCd.ms < 5 * 60 * 1000;
      return (
        <div
          className={cn(
            'rounded-2xl border p-5',
            urgent ? 'border-clay-300 bg-clay-50' : 'border-ink-300 bg-ink-50',
          )}
        >
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Tag tone="ink">临时离座中</Tag>
                {urgent && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-clay-100 px-2 py-0.5 text-xs text-clay-600 animate-breath">
                    <AlertCircle size={12} /> 即将超时
                  </span>
                )}
              </div>
              <div className="mt-3 font-display text-3xl font-semibold text-ink-800">
                座位 {mySeat.code} · 柜 {myLocker?.code ?? '--'}
              </div>
              <div className="mt-1 text-sm text-ink-600">
                离开于 {mySeat.tempAwayAt ? formatDateTime(mySeat.tempAwayAt) : '--'}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div
                  className={cn(
                    'font-display text-4xl font-semibold tabular-nums',
                    urgent ? 'text-clay-500 animate-breath' : 'text-ink-700',
                  )}
                >
                  {formatCountdown(tempAwayCd.ms)}
                </div>
                <div className="text-xs text-ink-500 mt-1">
                  剩余 · 续时剩余 {mySeat.tempAwayExtensionsLeft ?? 0}/2 次
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="primary" size="lg" onClick={() => returnFromTempAway(mySeat.id)}>
                  <PlayCircle size={16} /> 我回来了
                </Button>
                <Button
                  variant="warn"
                  size="sm"
                  disabled={(mySeat.tempAwayExtensionsLeft ?? 0) <= 0}
                  onClick={() => extendTempAway(mySeat.id)}
                >
                  <RefreshCw size={14} /> 续时30分钟
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    if (mySeat.status === 'violation') {
      return (
        <div className="rounded-2xl border border-clay-300 bg-clay-50 p-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Tag tone="clay">违规标记</Tag>
              </div>
              <div className="mt-3 font-display text-3xl font-semibold text-ink-800">
                座位 {mySeat.code}
              </div>
              <div className="mt-1 text-sm text-clay-700">
                <AlertCircle className="mr-1 inline" size={14} />
                临时离座已超时，请联系前台处理或更换座位重新预约
              </div>
            </div>
            <Button variant="danger" onClick={() => checkOut(mySeat.id)}>
              <LogOut size={16} /> 释放座位
            </Button>
          </div>
        </div>
      );
    }
    return null;
  })();

  return (
    <div className="grain-bg min-h-[calc(100vh-64px)]">
      <div className="mx-auto max-w-[1600px] px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink-800">学生预约台</h1>
            <p className="mt-1 text-sm text-ink-500">
              <UserIcon className="mr-1 inline" size={14} />
              {displayName} · 请选择空闲座位预约，30分钟内到店签到
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ChevronDown className="text-ink-400" size={16} />
            {(['all', 1, 2] as const).map((f) => (
              <button
                key={String(f)}
                onClick={() => setFloorFilter(f)}
                className={cn(
                  'rounded-lg px-3.5 py-1.5 text-sm font-medium transition',
                  floorFilter === f
                    ? 'bg-ink-700 text-white'
                    : 'bg-white border border-ink-200 text-ink-600 hover:bg-ink-50',
                )}
              >
                {f === 'all' ? '全部楼层' : `${f}楼`}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div>
            <SeatGrid
              seats={seats}
              selectedSeatId={selectedSeat?.id}
              floor={floorFilter}
              onSeatClick={(seat) => {
                if (!mySeat && seat.status === 'available') setSelectedSeat(seat);
              }}
            />
          </div>

          <aside className="space-y-4">
            <div className="card-shadow rounded-2xl border border-ink-100 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-ink-800">
                  我的座位状态
                </h3>
              </div>
              {statusBar}
            </div>

            {selectedSeat && !mySeat && (
              <div className="card-shadow animate-slide-in rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <h3 className="font-display text-base font-semibold text-ink-800">
                  即将预约
                </h3>
                <div className="mt-3 space-y-1">
                  <LabelValue label="座位号" value={<b>{selectedSeat.code}</b>} hint={`${selectedSeat.floor}楼 · ${selectedSeat.zone}区`} />
                  <LabelValue label="签到时限" value="30分钟" hint="超时自动释放" />
                  <LabelValue label="临时离座" value="30分钟×(1+2次)" hint="可续时2次" />
                </div>
                <div className="mt-4 flex gap-2">
                  <Button block onClick={() => setReserveModal(true)} variant="primary">
                    <MapPin size={16} /> 确认预约
                  </Button>
                  <Button variant="ghost" onClick={() => setSelectedSeat(null)}>
                    取消
                  </Button>
                </div>
              </div>
            )}

            <div className="card-shadow rounded-2xl border border-ink-100 bg-white p-5 text-sm text-ink-600">
              <h4 className="font-display font-semibold text-ink-800">使用须知</h4>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed">
                <li>1. 同一账号仅可预约一个座位，如需更换请先离座释放</li>
                <li>2. 预约成功后请于30分钟内在前台扫码签到</li>
                <li>3. 临时离座需点击「临时离座」，超时将被前台处理</li>
                <li>4. 储物柜与座位同区绑定，可在「使用中」状态下更换</li>
                <li>5. 违规累计3次将被限制预约，请注意遵守规则</li>
              </ul>
            </div>
          </aside>
        </div>

        <Modal
          open={reserveModal}
          onClose={() => setReserveModal(false)}
          title={`预约座位 ${selectedSeat?.code ?? ''}`}
          subtitle={`${selectedSeat?.floor}楼 · ${selectedSeat?.zone}区 · 将自动分配同区储物柜`}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setReserveModal(false)}>
                取消
              </Button>
              <Button variant="primary" onClick={handleReserve}>
                <Lock size={14} /> 确认预约
              </Button>
            </div>
          }
        >
          <div className="space-y-1">
            <LabelValue label="座位号" value={selectedSeat?.code ?? '--'} />
            <LabelValue label="签到截止" value={dayjs().add(30, 'minute').format('HH:mm')} />
          </div>
          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">
                <UserIcon className="mr-1 inline" size={14} /> 姓名
              </label>
              <input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-ink-500 focus:ring-2 focus:ring-ink-100"
                placeholder="请输入姓名"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">
                <Phone className="mr-1 inline" size={14} /> 手机号
              </label>
              <input
                value={studentPhone}
                onChange={(e) => setStudentPhone(e.target.value)}
                className="w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-ink-500 focus:ring-2 focus:ring-ink-100"
                placeholder="请输入手机号"
              />
            </div>
          </div>
        </Modal>

        <Modal
          open={lockerModal}
          onClose={() => setLockerModal(false)}
          title={`更换储物柜 · ${mySeat?.zone ?? ''}区`}
          subtitle="仅可更换同区域的空闲储物柜"
          footer={
            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => setLockerModal(false)}>
                关闭
              </Button>
            </div>
          }
        >
          <div className="text-sm text-ink-500">
            当前柜号：<b className="text-ink-700">{myLocker?.code}</b>
          </div>
          {swapError && (
            <div className="mt-3 rounded-lg bg-clay-50 px-3 py-2 text-xs text-clay-600">
              {swapError}
            </div>
          )}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {availableLockersForSwap.length === 0 && (
              <div className="col-span-3 rounded-xl bg-ink-50 p-4 text-center text-sm text-ink-500">
                暂无可用储物柜
              </div>
            )}
            {availableLockersForSwap.map((l) => (
              <button
                key={l.id}
                onClick={() => handleSwapLocker(l.id)}
                className="rounded-xl border-2 border-ink-200 bg-white py-3 text-sm font-medium text-ink-700 transition hover:border-amber-400 hover:bg-amber-50"
              >
                {l.code}
              </button>
            ))}
          </div>
        </Modal>
      </div>
    </div>
  );
}
