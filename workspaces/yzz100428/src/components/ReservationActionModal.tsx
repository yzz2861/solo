import { useState, useEffect } from 'react';
import Modal from './Modal';
import { Calendar, Clock, User as UserIcon, Car, XCircle, CheckCircle } from 'lucide-react';
import {
  useAppStore,
  todayStr,
  timeToMinutes,
  hasTimeOverlap,
} from '../store/useAppStore';
import { Reservation } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  reservation: Reservation | null;
  mode: 'reschedule' | 'cancel' | 'changeDriver' | 'status';
  newStatus?: string;
}

export default function ReservationActionModal({
  open,
  onClose,
  reservation,
  mode,
  newStatus,
}: Props) {
  const {
    drivers,
    rescheduleReservation,
    cancelReservation,
    changeDriver,
    updateReservationStatus,
    checkDriverConflict,
    checkMachineConflict,
  } = useAppStore();

  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState('07:30');
  const [reason, setReason] = useState('');
  const [driverId, setDriverId] = useState('');
  const [conflictWarn, setConflictWarn] = useState<string[]>([]);

  useEffect(() => {
    if (!reservation) return;
    if (mode === 'reschedule') {
      setDate(reservation.workDate);
      setTime(reservation.startTime);
    }
    if (mode === 'changeDriver') {
      setDriverId(reservation.driverId);
    }
    setReason('');
    setConflictWarn([]);
  }, [open, reservation, mode]);

  useEffect(() => {
    if (!reservation || mode !== 'reschedule') return;
    const w: string[] = [];
    const dc = checkDriverConflict(
      reservation.driverId, date, time, reservation.durationHours, reservation.id
    );
    if (dc) w.push(`司机冲突：${dc.farmerName} - ${dc.plotName} (${dc.startTime})`);
    const mc = checkMachineConflict(
      reservation.machineId, date, time, reservation.durationHours, reservation.id
    );
    if (mc) w.push(`机器冲突：${mc.farmerName} - ${mc.plotName} (${mc.startTime})`);
    setConflictWarn(w);
  }, [date, time, reservation, mode, checkDriverConflict, checkMachineConflict]);

  if (!reservation) return null;

  const titleMap = {
    reschedule: '改期作业',
    cancel: '取消预约',
    changeDriver: '改派司机',
    status: '变更作业状态',
  };

  const handleSubmit = () => {
    if (mode === 'reschedule') {
      if (!reason.trim()) return alert('请填写改期原因');
      rescheduleReservation(reservation.id, date, time, reason.trim());
    } else if (mode === 'cancel') {
      if (!reason.trim()) return alert('请填写取消原因（财务汇总需要）');
      cancelReservation(reservation.id, reason.trim());
    } else if (mode === 'changeDriver') {
      if (!driverId) return alert('请选择新司机');
      if (driverId === reservation.driverId) return alert('请选择不同的司机');
      if (!reason.trim()) return alert('请填写改派原因');
      changeDriver(reservation.id, driverId, reason.trim());
    } else if (mode === 'status' && newStatus) {
      updateReservationStatus(reservation.id, newStatus as any, reason || '状态更新');
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titleMap[mode]}
      subtitle={`${reservation.farmerName} · ${reservation.plotName} · ${reservation.workType}`}
    >
      <div className="space-y-5">
        <div className="p-3 rounded-xl bg-farm-50 border border-farm-200 text-xs space-y-1">
          <div className="flex items-center gap-2 text-earth-500">
            <Calendar size={13} />
            <span>原安排：{reservation.workDate} {reservation.startTime} · {reservation.durationHours}小时</span>
          </div>
          <div className="flex items-center gap-2 text-earth-500">
            <Car size={13} />
            <span>农机：{reservation.machineName} · 司机：{reservation.driverName}</span>
          </div>
          <div className="flex items-center gap-2 text-earth-500">
            <UserIcon size={13} />
            <span>农户电话：{reservation.farmerPhone}</span>
          </div>
        </div>

        {mode === 'reschedule' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label input-required">新作业日期</label>
                <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className="input-label input-required">新开始时间</label>
                <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
            {conflictWarn.length > 0 && (
              <div className="text-xs space-y-1 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                {conflictWarn.map((w, i) => <div key={i}>⚠️ {w}</div>)}
                <div className="text-red-400">（仍可提交，请协调安排）</div>
              </div>
            )}
            <div>
              <label className="input-label input-required">改期原因</label>
              <textarea
                className="input min-h-[80px]"
                placeholder="例：雨天顺延 / 农户临时有事 / 机器故障等"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </>
        )}

        {mode === 'cancel' && (
          <div>
            <label className="input-label input-required">取消原因（必填，财务导出需要）</label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {['农户临时取消', '天气原因', '机器故障', '重复预约', '其他原因'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`text-xs py-2 rounded-lg border transition-colors ${
                    reason === r
                      ? 'bg-red-500 text-white border-red-500'
                      : 'bg-white text-earth-500 border-earth-300 hover:bg-red-50'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              className="input min-h-[80px]"
              placeholder="补充说明取消详情..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}

        {mode === 'changeDriver' && (
          <>
            <div>
              <label className="input-label input-required">改派给新司机</label>
              <div className="grid grid-cols-2 gap-2">
                {drivers
                  .filter((d) => d.active && d.id !== reservation.driverId)
                  .map((d) => {
                    const otherSameDay = useAppStore
                      .getState()
                      .getReservationsByDriver(d.id, reservation.workDate);
                    const hasConflict = otherSameDay.some((r) =>
                      timeToMinutes(r.startTime) < timeToMinutes(reservation.startTime) + reservation.durationHours * 60 &&
                      timeToMinutes(reservation.startTime) < timeToMinutes(r.startTime) + r.durationHours * 60
                    ) ? '可能冲突' : '';
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDriverId(d.id)}
                        className={`p-3 rounded-lg border text-left text-sm transition-all ${
                          driverId === d.id
                            ? 'bg-farm-600 text-white border-farm-600 shadow-farm'
                            : 'bg-white text-earth-500 border-earth-300 hover:border-farm-400 hover:bg-farm-50'
                        }`}
                      >
                        <div className="font-bold">{d.name} <span className="text-xs opacity-75">{hasConflict}</span></div>
                        <div className={`text-xs mt-0.5 ${driverId === d.id ? 'text-farm-100' : 'text-earth-400'}`}>
                          📱 {d.phone}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
            <div>
              <label className="input-label input-required">改派原因</label>
              <textarea
                className="input min-h-[70px]"
                placeholder="例：原司机请假 / 机器换人 / 更顺路等"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </>
        )}

        {mode === 'status' && (
          <div>
            <label className="input-label">更新备注（可选）</label>
            <textarea
              className="input min-h-[70px]"
              placeholder="状态变更说明..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}

        <div className="flex gap-3 pt-2 border-t border-earth-200">
          <button onClick={onClose} className="btn btn-secondary flex-1">
            <XCircle size={16} />取消操作
          </button>
          <button onClick={handleSubmit} className={`btn flex-1 ${
            mode === 'cancel' ? 'btn-danger' : mode === 'status' && newStatus === '已完成' ? 'btn-primary' : 'btn-wheat'
          }`}>
            <CheckCircle size={16} />确认
          </button>
        </div>
      </div>
    </Modal>
  );
}
