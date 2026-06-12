import { useState, useMemo } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  RefreshCw,
  XCircle,
  CheckCircle2,
  Edit3,
  UserMinus,
  PlayCircle,
  MapPin,
  Phone,
  Fuel,
  Wrench,
  Info,
  LayoutGrid,
  Users,
} from 'lucide-react';
import {
  format,
  addDays,
  parseISO,
  isSameDay,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore, todayStr, timeToMinutes } from '../store/useAppStore';
import { Reservation, ReservationStatus } from '../types';
import ReservationActionModal from '../components/ReservationActionModal';
import { useNavigate } from 'react-router-dom';

type ViewMode = 'byMachine' | 'byDriver';

const STATUS_COLORS: Record<ReservationStatus, string> = {
  '待作业': 'bg-farm-500 text-white border-farm-600',
  '进行中': 'bg-wheat-500 text-white border-wheat-600',
  '已完成': 'bg-gray-300 text-gray-600 border-gray-400 line-through',
  '已取消': 'bg-gray-100 text-gray-400 border-gray-300 line-through',
  '已改期': 'bg-blue-100 text-blue-700 border-blue-300 line-through',
};

const STATUS_TAG: Record<ReservationStatus, string> = {
  '待作业': 'tag-success',
  '进行中': 'tag-warning',
  '已完成': 'tag-gray',
  '已取消': 'tag-gray',
  '已改期': 'tag-info',
};

const TIME_START = 5;
const TIME_END = 21;
const TOTAL_HOURS = TIME_END - TIME_START;
const PX_PER_HOUR = 56;

export default function SchedulePage() {
  const navigate = useNavigate();
  const {
    machines,
    drivers,
    reservations,
    maintenances,
    isMachineUnderMaintenance,
    getMaintenanceAt,
  } = useAppStore();

  const [viewDate, setViewDate] = useState(todayStr());
  const [viewMode, setViewMode] = useState<ViewMode>('byMachine');
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'ALL'>('ALL');
  const [driverFilter, setDriverFilter] = useState<string>('ALL');
  const [machineFilter, setMachineFilter] = useState<string>('ALL');

  const [actionModal, setActionModal] = useState<{
    open: boolean;
    reservation: Reservation | null;
    mode: 'reschedule' | 'cancel' | 'changeDriver' | 'status';
    newStatus?: ReservationStatus;
  }>({ open: false, reservation: null, mode: 'reschedule' });

  const rows = useMemo(() => {
    if (viewMode === 'byMachine') {
      return machines
        .filter((m) => machineFilter === 'ALL' || m.id === machineFilter)
        .map((m) => ({
          id: m.id,
          label: m.name,
          subtitle: `${m.type} · ${m.plateNumber}`,
          icon: '🚜',
          isUnderMaintenance: isMachineUnderMaintenance(m.id, viewDate),
          maintenance: getMaintenanceAt(m.id, viewDate),
          machineId: m.id,
          reservations: reservations.filter(
            (r) =>
              r.machineId === m.id &&
              r.workDate === viewDate &&
              (statusFilter === 'ALL' || r.status === statusFilter) &&
              (driverFilter === 'ALL' || r.driverId === driverFilter)
          ),
        }));
    } else {
      return drivers
        .filter((d) => d.active && (driverFilter === 'ALL' || d.id === driverFilter))
        .map((d) => {
          const driverRes = reservations.filter(
            (r) =>
              r.driverId === d.id &&
              r.workDate === viewDate &&
              (statusFilter === 'ALL' || r.status === statusFilter) &&
              (machineFilter === 'ALL' || r.machineId === machineFilter)
          );
          return {
            id: d.id,
            label: d.name,
            subtitle: `📱 ${d.phone}`,
            icon: '👨‍🌾',
            isUnderMaintenance: false,
            maintenance: null,
            machineId: null,
            reservations: driverRes,
          };
        });
    }
  }, [viewMode, machines, drivers, reservations, viewDate, statusFilter, driverFilter, machineFilter, isMachineUnderMaintenance, getMaintenanceAt]);

  const summaryStats = useMemo(() => {
    const dayRes = reservations.filter((r) => r.workDate === viewDate);
    return {
      total: dayRes.length,
      pending: dayRes.filter((r) => r.status === '待作业').length,
      ongoing: dayRes.filter((r) => r.status === '进行中').length,
      done: dayRes.filter((r) => r.status === '已完成').length,
      canceled: dayRes.filter((r) => r.status === '已取消').length,
      totalHours: dayRes.filter((r) => r.status !== '已取消').reduce((s, r) => s + r.durationHours, 0).toFixed(1),
      totalFuel: dayRes.filter((r) => r.status !== '已取消').reduce((s, r) => s + r.estimatedFuel, 0),
    };
  }, [reservations, viewDate]);

  const openAction = (r: Reservation, mode: 'reschedule' | 'cancel' | 'changeDriver' | 'status', newStatus?: ReservationStatus) => {
    setActionModal({ open: true, reservation: r, mode, newStatus });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-farm-700 flex items-center gap-2">
            <CalendarDays size={24} />
            排班看板
          </h2>
          <p className="text-sm text-earth-500 mt-1">
            按时间轴展示预约，点击卡片可改期、取消、改派司机或更新状态
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewDate((d) => format(addDays(parseISO(d), -1), 'yyyy-MM-dd'))}
            className="btn btn-secondary btn-sm"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setViewDate(todayStr())}
            className={`btn btn-sm ${isSameDay(parseISO(viewDate), new Date()) ? 'btn-primary' : 'btn-secondary'}`}
          >
            {isSameDay(parseISO(viewDate), new Date()) ? '📅 今日' : '回到今日'}
          </button>
          <input
            type="date"
            className="input !w-auto !py-1.5 text-xs"
            value={viewDate}
            onChange={(e) => setViewDate(e.target.value)}
          />
          <button
            onClick={() => setViewDate((d) => format(addDays(parseISO(d), 1), 'yyyy-MM-dd'))}
            className="btn btn-secondary btn-sm"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard label={format(parseISO(viewDate), 'MM月dd日 EEEE', { locale: zhCN })} value={`${summaryStats.total}单`} tone="primary" />
        <StatCard label="待作业" value={summaryStats.pending} tone="success" />
        <StatCard label="进行中" value={summaryStats.ongoing} tone="warning" />
        <StatCard label="已完成" value={summaryStats.done} tone="gray" />
        <StatCard label="已取消" value={summaryStats.canceled} tone="danger" />
        <StatCard label="工时/油费" value={`${summaryStats.totalHours}h / ¥${summaryStats.totalFuel}`} tone="wheat" />
      </div>

      <div className="card">
        <div className="card-header flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-earth-300 overflow-hidden">
              <button
                onClick={() => setViewMode('byMachine')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${
                  viewMode === 'byMachine' ? 'bg-farm-600 text-white' : 'bg-white text-earth-500 hover:bg-farm-50'
                }`}
              >
                <LayoutGrid size={13} />按农机
              </button>
              <button
                onClick={() => setViewMode('byDriver')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${
                  viewMode === 'byDriver' ? 'bg-farm-600 text-white' : 'bg-white text-earth-500 hover:bg-farm-50'
                }`}
              >
                <Users size={13} />按司机
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter size={14} className="text-earth-400" />
            <select
              className="input !w-auto !py-1.5 text-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">全部状态</option>
              <option value="待作业">待作业</option>
              <option value="进行中">进行中</option>
              <option value="已完成">已完成</option>
              <option value="已取消">已取消</option>
              <option value="已改期">已改期</option>
            </select>
            {viewMode === 'byMachine' && (
              <select
                className="input !w-auto !py-1.5 text-xs"
                value={driverFilter}
                onChange={(e) => setDriverFilter(e.target.value)}
              >
                <option value="ALL">全部司机</option>
                {drivers.filter((d) => d.active).map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
            {viewMode === 'byDriver' && (
              <select
                className="input !w-auto !py-1.5 text-xs"
                value={machineFilter}
                onChange={(e) => setMachineFilter(e.target.value)}
              >
                <option value="ALL">全部农机</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => { setStatusFilter('ALL'); setDriverFilter('ALL'); setMachineFilter('ALL'); }}
              className="btn btn-secondary btn-sm"
            >
              <RefreshCw size={12} />重置
            </button>
            <button onClick={() => navigate('/reservation')} className="btn btn-primary btn-sm">
              + 新增预约
            </button>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <div className="min-w-[1100px]">
            <div className="flex border-b border-earth-200 sticky top-0 bg-white z-10">
              <div className="w-56 flex-shrink-0 p-3 border-r border-earth-200 bg-farm-50/50">
                <div className="text-xs font-bold text-earth-500">
                  {viewMode === 'byMachine' ? '农机 / 司机' : '司机 / 电话'}
                </div>
              </div>
              <div className="flex-1 flex relative">
                {Array.from({ length: TOTAL_HOURS + 1 }).map((_, i) => {
                  const hour = TIME_START + i;
                  return (
                    <div
                      key={i}
                      className="flex-shrink-0 border-r border-earth-100 py-2 px-1 text-[10px] text-earth-400 font-medium"
                      style={{ width: PX_PER_HOUR }}
                    >
                      {String(hour).padStart(2, '0')}:00
                    </div>
                  );
                })}
              </div>
            </div>

            {rows.length === 0 && (
              <div className="p-12 text-center text-earth-400 text-sm">
                暂无数据，请调整筛选条件
              </div>
            )}

            {rows.map((row) => (
              <div
                key={row.id}
                className={`flex border-b border-earth-100 ${
                  row.isUnderMaintenance ? 'bg-stripes-red' : ''
                }`}
              >
                <div className="w-56 flex-shrink-0 p-3 border-r border-earth-200 bg-earth-50/30">
                  <div className="flex items-start gap-2">
                    <span className="text-xl leading-none">{row.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-earth-600 truncate">{row.label}</div>
                      <div className="text-[11px] text-earth-400 truncate">{row.subtitle}</div>
                      {row.isUnderMaintenance && row.maintenance && (
                        <div className="mt-1 text-[10px] text-red-600 bg-red-50 rounded px-2 py-0.5 border border-red-200">
                          🔧 维修中 {row.maintenance.startDate}→{row.maintenance.endDate}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex-1 relative py-2" style={{ minHeight: 72 }}>
                  {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 border-r border-earth-50 border-dashed"
                      style={{ left: i * PX_PER_HOUR }}
                    />
                  ))}
                  {row.reservations.map((r) => {
                    const left = (timeToMinutes(r.startTime) - TIME_START * 60) / 60 * PX_PER_HOUR;
                    const width = r.durationHours * PX_PER_HOUR - 6;
                    return (
                      <div
                        key={r.id}
                        className={`absolute top-2 rounded-lg border shadow-soft overflow-hidden
                          transition-all hover:shadow-lg hover:scale-[1.01] group
                          ${STATUS_COLORS[r.status]}`}
                        style={{
                          left: Math.max(0, left) + 3,
                          width: Math.max(60, width),
                          height: 56,
                          zIndex: r.status === '进行中' ? 5 : 2,
                        }}
                      >
                        <div className="px-2.5 py-1.5 h-full flex flex-col justify-between min-w-0">
                          <div className="flex items-center justify-between gap-1 min-w-0">
                            <div className="text-xs font-bold truncate flex items-center gap-1">
                              <span className={`shrink-0 px-1 rounded ${r.status === '进行中' ? 'bg-black/20' : 'bg-white/20'}`}>
                                {r.startTime}
                              </span>
                              {r.farmerName}
                            </div>
                            <span className={`shrink-0 text-[10px] px-1 rounded ${r.status === '进行中' ? 'bg-black/20' : 'bg-white/20'}`}>
                              {r.workType}
                            </span>
                          </div>
                          <div className="text-[10px] truncate opacity-90">
                            📍 {r.plotName} · {r.durationHours}h · ¥{r.estimatedFuel}
                          </div>
                          <div className="text-[10px] opacity-80 flex items-center justify-between">
                            <span className="truncate">
                              👨‍🌾 {viewMode === 'byMachine' ? r.driverName : r.machineName}
                            </span>
                            <span className={`tag ${STATUS_TAG[r.status]} !py-0 !text-[9px] opacity-90`}>
                              {r.status}
                            </span>
                          </div>
                        </div>

                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 px-2 backdrop-blur-[1px]">
                          {r.status === '待作业' && (
                            <button
                              onClick={() => openAction(r, 'status', '进行中')}
                              title="标记进行中"
                              className="p-1.5 rounded-md bg-wheat-500 text-white hover:bg-wheat-600"
                            >
                              <PlayCircle size={14} />
                            </button>
                          )}
                          {(r.status === '待作业' || r.status === '进行中') && (
                            <button
                              onClick={() => openAction(r, 'status', '已完成')}
                              title="完成"
                              className="p-1.5 rounded-md bg-farm-600 text-white hover:bg-farm-700"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => openAction(r, 'reschedule')}
                            title="改期"
                            className="p-1.5 rounded-md bg-blue-500 text-white hover:bg-blue-600"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => openAction(r, 'changeDriver')}
                            title="改派司机"
                            className="p-1.5 rounded-md bg-purple-500 text-white hover:bg-purple-600"
                          >
                            <UserMinus size={14} />
                          </button>
                          {r.status !== '已完成' && r.status !== '已取消' && (
                            <button
                              onClick={() => openAction(r, 'cancel')}
                              title="取消"
                              className="p-1.5 rounded-md bg-red-500 text-white hover:bg-red-600"
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-bold text-earth-600 flex items-center gap-2">
            <Info size={16} />
            当日预约明细
          </h3>
        </div>
        <div className="card-body p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-earth-50/50 text-xs text-earth-500">
                  <th className="px-4 py-2.5 text-left font-medium">时间</th>
                  <th className="px-4 py-2.5 text-left font-medium">农户</th>
                  <th className="px-4 py-2.5 text-left font-medium">地块</th>
                  <th className="px-4 py-2.5 text-left font-medium">作业</th>
                  <th className="px-4 py-2.5 text-left font-medium">农机</th>
                  <th className="px-4 py-2.5 text-left font-medium">司机</th>
                  <th className="px-4 py-2.5 text-right font-medium">时长</th>
                  <th className="px-4 py-2.5 text-right font-medium">油费</th>
                  <th className="px-4 py-2.5 text-center font-medium">状态</th>
                  <th className="px-4 py-2.5 text-center font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.flatMap((row) => row.reservations)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((r, idx, arr) => {
                    const prev = arr[idx - 1];
                    if (prev && prev.id === r.id) return null;
                    return (
                      <tr key={r.id} className="border-t border-earth-100 hover:bg-farm-50/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-earth-500">{r.startTime}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-earth-600">{r.farmerName}</div>
                          <div className="text-xs text-earth-400 flex items-center gap-1">
                            <Phone size={10} />{r.farmerPhone}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-earth-600">{r.plotName}</div>
                          <div className="text-xs text-earth-400 flex items-center gap-1">
                            <MapPin size={10} />{r.plotAcres}亩 · {r.plotLocation || r.farmerVillage}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-earth-600">{r.workType}</td>
                        <td className="px-4 py-3 text-earth-600">{r.machineName}</td>
                        <td className="px-4 py-3 text-earth-600">{r.driverName}</td>
                        <td className="px-4 py-3 text-right text-earth-600 flex items-center justify-end gap-1">
                          <Clock size={11} className="text-earth-400" />
                          {r.durationHours}h
                        </td>
                        <td className="px-4 py-3 text-right text-earth-600 flex items-center justify-end gap-1">
                          <Fuel size={11} className="text-earth-400" />
                          ¥{r.estimatedFuel}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`tag ${STATUS_TAG[r.status]}`}>{r.status}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            {r.status === '待作业' && (
                              <button
                                onClick={() => openAction(r, 'status', '进行中')}
                                className="p-1.5 rounded-md hover:bg-wheat-100 text-wheat-600"
                                title="开始作业"
                              >
                                <PlayCircle size={14} />
                              </button>
                            )}
                            {(r.status === '待作业' || r.status === '进行中') && (
                              <button
                                onClick={() => openAction(r, 'status', '已完成')}
                                className="p-1.5 rounded-md hover:bg-farm-100 text-farm-600"
                                title="完成"
                              >
                                <CheckCircle2 size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => openAction(r, 'reschedule')}
                              className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600"
                              title="改期"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => openAction(r, 'changeDriver')}
                              className="p-1.5 rounded-md hover:bg-purple-50 text-purple-600"
                              title="改派司机"
                            >
                              <UserMinus size={14} />
                            </button>
                            {r.status !== '已完成' && r.status !== '已取消' && (
                              <button
                                onClick={() => openAction(r, 'cancel')}
                                className="p-1.5 rounded-md hover:bg-red-50 text-red-500"
                                title="取消"
                              >
                                <XCircle size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                {rows.flatMap((row) => row.reservations).length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-earth-400 text-xs">
                      当日暂无预约，可点击右上角「新增预约」录入
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ReservationActionModal
        open={actionModal.open}
        onClose={() => setActionModal({ ...actionModal, open: false })}
        reservation={actionModal.reservation}
        mode={actionModal.mode}
        newStatus={actionModal.newStatus}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'gray' | 'wheat';
}) {
  const tones: Record<string, string> = {
    primary: 'from-farm-600 to-farm-700 text-white',
    success: 'bg-white text-farm-700 border-farm-200',
    warning: 'bg-white text-wheat-600 border-wheat-300',
    danger: 'bg-white text-red-600 border-red-200',
    gray: 'bg-white text-gray-600 border-gray-200',
    wheat: 'bg-gradient-to-br from-wheat-400 to-wheat-500 text-white',
  };
  const isGradient = tone === 'primary' || tone === 'wheat';
  return (
    <div className={`rounded-xl p-3.5 border shadow-soft ${tones[tone]} ${isGradient ? '' : ''}`}>
      <div className={`text-xs ${isGradient ? 'text-white/80' : 'text-earth-400'}`}>{label}</div>
      <div className={`text-lg font-bold mt-1 font-serif ${isGradient ? '' : ''}`}>{value}</div>
    </div>
  );
}
