import { useState, useMemo } from 'react';
import {
  Car,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Phone,
  Clock,
  Fuel,
  Tractor,
  FileSpreadsheet,
  User,
  Navigation,
  AlertCircle,
} from 'lucide-react';
import { useAppStore, todayStr, timeToMinutes } from '../store/useAppStore';
import { addDays, format, isSameDay, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { exportDriverWorksheet } from '../utils/exportCSV';

export default function DriverViewPage() {
  const { drivers, reservations } = useAppStore();
  const [viewDate, setViewDate] = useState(todayStr());
  const [selectedDriverId, setSelectedDriverId] = useState<string>(drivers[0]?.id || '');

  const activeDrivers = drivers.filter((d) => d.active);

  const driverData = useMemo(() => {
    return activeDrivers
      .map((d) => {
        const items = reservations
          .filter(
            (r) =>
              r.driverId === d.id &&
              r.workDate === viewDate &&
              r.status !== '已取消'
          )
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
        const totalHours = items.reduce((s, r) => s + r.durationHours, 0);
        const totalFuel = items.reduce((s, r) => s + r.estimatedFuel, 0);
        return {
          driver: d,
          items,
          totalHours: totalHours.toFixed(1),
          totalFuel,
        };
      })
      .filter((d) => !selectedDriverId || d.driver.id === selectedDriverId);
  }, [activeDrivers, reservations, viewDate, selectedDriverId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-farm-700 flex items-center gap-2">
            <Car size={24} />
            司机视图
          </h2>
          <p className="text-sm text-earth-500 mt-1">
            司机出发前查看当日作业顺序、地块位置和农户联系电话
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            {isSameDay(parseISO(viewDate), new Date()) ? '今日' : '回到今日'}
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
          <select
            className="input !w-auto !py-1.5 text-xs"
            value={selectedDriverId}
            onChange={(e) => setSelectedDriverId(e.target.value)}
          >
            <option value="">全部司机</option>
            {activeDrivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              const count = driverData.reduce((s, d) => s + d.items.length, 0);
              if (count === 0) return alert('当日暂无作业');
              exportDriverWorksheet(reservations, viewDate);
            }}
            className="btn btn-wheat btn-sm"
          >
            <FileSpreadsheet size={14} />
            导出司机作业单
          </button>
        </div>
      </div>

      <div className="text-xs text-earth-500 bg-farm-50 border border-farm-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
        <AlertCircle size={14} className="text-farm-600 shrink-0" />
        <span>
          <strong>{format(parseISO(viewDate), 'yyyy年MM月dd日 EEEE', { locale: zhCN })}</strong>
          &nbsp;共&nbsp;<strong className="text-farm-700">{driverData.length}</strong>&nbsp;位司机有安排，
          总计&nbsp;<strong className="text-farm-700">{driverData.reduce((s, d) => s + d.items.length, 0)}</strong>&nbsp;单作业
        </span>
      </div>

      {driverData.length === 0 && (
        <div className="card">
          <div className="card-body py-16 text-center text-earth-400">
            <Car size={40} className="mx-auto mb-3 opacity-40" />
            <div>当日暂无司机作业安排</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {driverData.map(({ driver, items, totalHours, totalFuel }) => (
          <div key={driver.id} className="card overflow-hidden">
            <div className="bg-gradient-to-r from-farm-700 via-farm-600 to-farm-700 text-white">
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                    <div className="w-10 h-10 rounded-lg bg-wheat-500 text-farm-700 flex items-center justify-center font-bold text-lg">
                      {driver.name.charAt(0)}
                    </div>
                  </div>
                  <div>
                    <div className="font-serif text-xl font-bold">{driver.name}</div>
                    <div className="text-xs text-wheat-100/80 flex items-center gap-1">
                      <Phone size={11} />
                      {driver.phone}
                      <span className="mx-1.5 opacity-40">|</span>
                      <Tractor size={11} />
                      可驾驶 {driver.machineIds.length} 台
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-wheat-100/80">当日任务</div>
                  <div className="font-serif text-lg font-bold">{items.length} 单</div>
                </div>
              </div>
              <div className="px-5 pb-4 grid grid-cols-2 gap-3">
                <div className="bg-white/10 rounded-lg px-3 py-2 backdrop-blur-sm">
                  <div className="text-[10px] text-wheat-100/70">总工时</div>
                  <div className="font-bold">{totalHours} 小时</div>
                </div>
                <div className="bg-white/10 rounded-lg px-3 py-2 backdrop-blur-sm">
                  <div className="text-[10px] text-wheat-100/70">预计油费</div>
                  <div className="font-bold">¥ {totalFuel}</div>
                </div>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="p-10 text-center text-earth-400 text-sm">
                <Car size={32} className="mx-auto mb-2 opacity-30" />
                当日暂无作业安排
              </div>
            ) : (
              <div className="divide-y divide-earth-100">
                {items.map((r, idx) => (
                  <div key={r.id} className="p-4 hover:bg-earth-50/40 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-farm-500 to-farm-700 text-white flex items-center justify-center font-bold shadow-farm">
                          {idx + 1}
                        </div>
                        {idx < items.length - 1 && (
                          <div className="w-0.5 flex-1 min-h-[40px] bg-earth-200" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-wheat-100 text-wheat-600">
                              <Clock size={11} className="inline mr-1" />
                              {r.startTime} · {r.durationHours}h
                            </span>
                            <span className="tag tag-success">{r.workType}</span>
                            {r.status === '进行中' && <span className="tag tag-warning">进行中</span>}
                            {r.status === '已完成' && <span className="tag tag-gray">已完成</span>}
                            {r.rescheduleFrom && (
                              <span className="tag tag-info">
                                改期自 {r.rescheduleFrom}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                          <div className="flex items-center gap-2 text-earth-600">
                            <MapPin size={13} className="text-farm-600 shrink-0" />
                            <span className="truncate font-medium">{r.plotName}</span>
                            <span className="text-earth-400 text-xs">({r.plotAcres}亩)</span>
                          </div>
                          <div className="flex items-center gap-2 text-earth-600">
                            <Navigation size={13} className="text-earth-400 shrink-0" />
                            <span className="truncate text-earth-500">{r.plotLocation || r.farmerVillage}</span>
                          </div>
                          <div className="flex items-center gap-2 text-earth-600">
                            <User size={13} className="text-wheat-600 shrink-0" />
                            <span className="font-medium">{r.farmerName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-earth-600">
                            <Phone size={13} className="text-farm-600 shrink-0" />
                            <a
                              href={`tel:${r.farmerPhone}`}
                              className="font-mono font-bold text-farm-700 hover:underline"
                            >
                              {r.farmerPhone}
                            </a>
                          </div>
                          <div className="flex items-center gap-2 text-earth-500 text-xs col-span-2">
                            <Tractor size={12} />
                            {r.machineName}（{r.machineType}）
                            <span className="mx-2 text-earth-300">·</span>
                            <Fuel size={12} />
                            预计油费 ¥{r.estimatedFuel}
                            {r.driverChangeReason && (
                              <>
                                <span className="mx-2 text-earth-300">·</span>
                                <span className="text-purple-600">司机改派：{r.driverChangeReason}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
