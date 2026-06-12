import { useMemo } from 'react';
import {
  CalendarCheck2,
  ClipboardList,
  CalendarDays,
  Car,
  FileSpreadsheet,
  Wrench,
  ArrowRight,
  CloudRain,
  Tractor,
  Users,
  Clock,
  Fuel,
  CheckCircle2,
  PlayCircle,
  UserPlus,
  MapPin,
  Phone,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, todayStr, tomorrowStr, timeToMinutes } from '../store/useAppStore';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { exportTomorrowWorksheet, exportDriverWorksheet } from '../utils/exportCSV';

export default function HomePage() {
  const navigate = useNavigate();
  const {
    reservations,
    machines,
    drivers,
    maintenances,
    batchRescheduleRain,
    isMachineUnderMaintenance,
  } = useAppStore();

  const today = todayStr();
  const tomorrow = tomorrowStr();

  const todayStats = useMemo(() => {
    const t = reservations.filter((r) => r.workDate === today);
    const active = t.filter((r) => r.status !== '已取消');
    return {
      total: t.length,
      active: active.length,
      pending: active.filter((r) => r.status === '待作业').length,
      ongoing: active.filter((r) => r.status === '进行中').length,
      done: active.filter((r) => r.status === '已完成').length,
      canceled: t.filter((r) => r.status === '已取消').length,
      hours: active.reduce((s, r) => s + r.durationHours, 0).toFixed(1),
      fuel: active.reduce((s, r) => s + r.estimatedFuel, 0),
    };
  }, [reservations, today]);

  const tomorrowCount = reservations.filter(
    (r) => r.workDate === tomorrow && r.status !== '已取消'
  ).length;

  const activeMaintenances = maintenances.filter((m) => m.status === '维修中').length;

  const todayDriverMap = useMemo(() => {
    const map: Record<string, { driver: typeof drivers[0]; items: typeof reservations }> = {};
    drivers.forEach((d) => (map[d.id] = { driver: d, items: [] }));
    reservations
      .filter((r) => r.workDate === today && r.status !== '已取消')
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .forEach((r) => {
        if (map[r.driverId]) map[r.driverId].items.push(r);
      });
    return map;
  }, [reservations, today, drivers]);

  const todayList = useMemo(() => {
    return reservations
      .filter((r) => r.workDate === today)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .slice(0, 8);
  }, [reservations, today]);

  const alertMessages: string[] = [];
  if (activeMaintenances > 0) alertMessages.push(`🔧 当前有 ${activeMaintenances} 台机器维修中，请留意排班冲突`);
  if (todayStats.pending === 0 && todayStats.ongoing === 0 && todayStats.done === 0) {
    alertMessages.push('📝 今日暂无预约，可到「预约登记」录入');
  }
  const machineIssues = reservations.filter((r) => {
    return (
      r.workDate === today &&
      r.status !== '已取消' &&
      isMachineUnderMaintenance(r.machineId, today)
    );
  });
  if (machineIssues.length > 0) {
    alertMessages.push(`⚠️ 今日有 ${machineIssues.length} 条预约的机器处于维修期，请尽快改派！`);
  }

  const quickActions = [
    { label: '预约登记', desc: '录入农户电话预约', icon: ClipboardList, color: 'bg-farm-600 hover:bg-farm-700', to: '/reservation' },
    { label: '排班看板', desc: '查看/调整时间轴安排', icon: CalendarDays, color: 'bg-wheat-500 hover:bg-wheat-600', to: '/schedule' },
    { label: '维修管理', desc: '登记机器故障/保养', icon: Wrench, color: 'bg-earth-400 hover:bg-earth-500', to: '/maintenance' },
    { label: '司机视图', desc: '司机按顺序查看作业', icon: Car, color: 'bg-blue-500 hover:bg-blue-600', to: '/driver' },
    { label: '数据导出', desc: '明日单/财务/司机单', icon: FileSpreadsheet, color: 'bg-purple-500 hover:bg-purple-600', to: '/export' },
  ];

  return (
    <div className="space-y-6">
      <section className="card bg-gradient-to-br from-farm-700 via-farm-600 to-farm-700 text-white border-farm-700 shadow-farm overflow-hidden relative">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -right-10 -bottom-10 text-[180px] select-none">🚜</div>
          <div className="absolute right-40 bottom-10 text-[80px] select-none opacity-60">🌾</div>
        </div>
        <div className="relative card-body py-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-wheat-200 tracking-widest uppercase">
                {format(new Date(), 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
              </p>
              <h1 className="font-serif text-2xl md:text-3xl font-bold mt-1">
                合作社春耕调度 · 今日概览
              </h1>
              <p className="text-wheat-100/80 text-sm mt-2 max-w-2xl">
                统一管理农户预约、机器排班、司机作业、维修阻塞和费用结算。
                数据保存于本机浏览器，刷新或重启后不丢失。
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigate('/reservation')} className="btn bg-white text-farm-700 border-white hover:bg-wheat-100 font-bold">
                <ClipboardList size={16} />
                快速登记
              </button>
              <button
                onClick={() => {
                  const date = window.prompt('雨天顺延 - 请输入待顺延的日期（YYYY-MM-DD）：', today);
                  if (!date) return;
                  const count = batchRescheduleRain(date);
                  if (count > 0) alert(`已顺延 ${count} 条预约到次日`);
                  else alert('当天无可顺延的预约');
                }}
                className="btn bg-red-500/90 border-red-400 text-white hover:bg-red-600"
              >
                <CloudRain size={16} />
                雨天批量改期
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <HeroStat label="今日作业单" value={`${todayStats.active} 单`} icon={Tractor} highlight />
            <HeroStat label="总工时 / 总油费" value={`${todayStats.hours}h / ¥${todayStats.fuel}`} icon={Fuel} highlight />
            <HeroStat label="待作业 / 进行中" value={`${todayStats.pending} / ${todayStats.ongoing}`} icon={PlayCircle} highlight />
            <HeroStat label="已完成 / 明日预排" value={`${todayStats.done} / ${tomorrowCount}`} icon={CalendarCheck2} highlight />
          </div>
        </div>
      </section>

      {alertMessages.length > 0 && (
        <div className="space-y-2">
          {alertMessages.map((m, i) => (
            <div key={i} className="card border-wheat-300 bg-wheat-100/40">
              <div className="card-body py-3 flex items-center gap-3 text-sm text-wheat-600">
                <AlertTriangle size={18} className="text-wheat-600 shrink-0" />
                <span>{m}</span>
                {m.includes('尽快改派') && (
                  <button
                    onClick={() => navigate('/schedule')}
                    className="ml-auto text-xs px-3 py-1 rounded-md bg-wheat-500 text-white hover:bg-wheat-600 flex items-center gap-1 shrink-0"
                  >
                    前往处理 <ArrowRight size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {quickActions.map((a) => (
          <button
            key={a.label}
            onClick={() => navigate(a.to)}
            className={`group card text-left p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg ${a.color} text-white border-transparent`}
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <a.icon size={20} />
              </div>
              <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="mt-3 font-bold">{a.label}</div>
            <div className="text-xs opacity-80 mt-0.5">{a.desc}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="card lg:col-span-2">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-bold text-earth-600 flex items-center gap-2">
              <CalendarDays size={16} className="text-farm-600" />
              今日预约时间线
            </h3>
            <button
              onClick={() => navigate('/schedule')}
              className="text-xs text-farm-600 hover:text-farm-700 flex items-center gap-1"
            >
              查看完整看板 <ArrowRight size={12} />
            </button>
          </div>
          <div className="card-body">
            {todayList.length === 0 ? (
              <div className="py-10 text-center text-earth-400 text-sm">
                今日暂无预约，可点击上方「快速登记」录入
              </div>
            ) : (
              <div className="space-y-2.5">
                {todayList.map((r, idx) => {
                  const colors: Record<string, string> = {
                    '待作业': 'border-l-farm-500 bg-farm-50/40',
                    '进行中': 'border-l-wheat-500 bg-wheat-100/50',
                    '已完成': 'border-l-gray-400 bg-gray-50 opacity-80',
                    '已取消': 'border-l-gray-300 bg-gray-50 opacity-60 line-through',
                    '已改期': 'border-l-blue-400 bg-blue-50 opacity-70',
                  };
                  return (
                    <div
                      key={r.id}
                      className={`p-3 rounded-lg border-l-4 ${colors[r.status] || colors['待作业']} border border-earth-200/50 transition-all hover:shadow-sm`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-earth-500 bg-white px-2 py-0.5 rounded">
                              {r.startTime}
                            </span>
                            <span className="font-bold text-earth-600">{r.farmerName}</span>
                            <span className={`tag ${
                              r.status === '待作业' ? 'tag-success' :
                              r.status === '进行中' ? 'tag-warning' :
                              r.status === '已完成' ? 'tag-gray' :
                              r.status === '已取消' ? 'tag-danger' : 'tag-info'
                            }`}>
                              {r.status}
                            </span>
                            <span className="tag tag-info">{r.workType}</span>
                          </div>
                          <div className="text-xs text-earth-500 mt-1.5 flex items-center gap-3 flex-wrap">
                            <span className="flex items-center gap-1">
                              <MapPin size={11} />{r.plotName} · {r.plotAcres}亩
                            </span>
                            <span className="flex items-center gap-1">
                              <Tractor size={11} />{r.machineName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users size={11} />{r.driverName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={11} />{r.durationHours}h
                            </span>
                            <span className="flex items-center gap-1">
                              <Fuel size={11} />¥{r.estimatedFuel}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate('/schedule')}
                          className="shrink-0 text-farm-600 hover:text-farm-700"
                        >
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="font-bold text-earth-600 flex items-center gap-2">
                <Users size={16} className="text-farm-600" />
                司机作业排程
              </h3>
              <button
                onClick={() => {
                  if (todayStats.active === 0) return alert('今日无作业');
                  exportDriverWorksheet(reservations, today);
                }}
                className="text-xs text-farm-600 hover:text-farm-700 flex items-center gap-1"
              >
                <FileSpreadsheet size={12} />导司机单
              </button>
            </div>
            <div className="card-body space-y-3">
              {drivers.filter((d) => d.active).map((d) => {
                const data = todayDriverMap[d.id];
                const items = data?.items || [];
                return (
                  <div key={d.id} className="p-3 rounded-lg bg-earth-50/50 border border-earth-200/60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-farm-100 text-farm-700 flex items-center justify-center font-bold text-sm">
                          {d.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-earth-600">{d.name}</div>
                          <div className="text-[10px] text-earth-400 flex items-center gap-1">
                            <Phone size={9} />{d.phone}
                          </div>
                        </div>
                      </div>
                      <span className={`tag ${items.length > 0 ? 'tag-success' : 'tag-gray'}`}>
                        {items.length} 单
                      </span>
                    </div>
                    {items.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {items.slice(0, 3).map((r) => (
                          <div
                            key={r.id}
                            className="text-[11px] flex items-center justify-between gap-2 text-earth-500 bg-white rounded px-2 py-1"
                          >
                            <span className="font-mono shrink-0">{r.startTime}</span>
                            <span className="truncate">{r.farmerName} · {r.plotName}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-earth-400 mt-2">今日暂无安排</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card bg-gradient-to-br from-wheat-100 to-wheat-50 border-wheat-300">
            <div className="card-body space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-wheat-500 text-white flex items-center justify-center">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <div className="font-bold text-earth-600">明日作业单</div>
                  <div className="text-xs text-earth-500">合作社主任每日导出</div>
                </div>
              </div>
              <div className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2.5">
                <div>
                  <div className="text-xs text-earth-400">明日预排</div>
                  <div className="font-bold text-farm-700 font-serif">{tomorrowCount} 单</div>
                </div>
                <button
                  onClick={() => {
                    if (tomorrowCount === 0) return alert('明日暂无预约');
                    exportTomorrowWorksheet(reservations, tomorrow);
                  }}
                  disabled={tomorrowCount === 0}
                  className="btn btn-primary btn-sm disabled:opacity-50"
                >
                  <FileSpreadsheet size={12} />导出CSV
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-bold text-earth-600 flex items-center gap-2">
            <Tractor size={16} className="text-farm-600" />
            农机状态总览
          </h3>
          <button
            onClick={() => navigate('/maintenance')}
            className="text-xs text-farm-600 hover:text-farm-700 flex items-center gap-1"
          >
            维修管理 <ArrowRight size={12} />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 p-4">
          {machines.map((m) => {
            const inMaint = isMachineUnderMaintenance(m.id, today);
            const todayWorkCount = reservations.filter(
              (r) => r.machineId === m.id && r.workDate === today && r.status !== '已取消'
            ).length;
            return (
              <div
                key={m.id}
                className={`p-3 rounded-xl border text-center transition-all ${
                  inMaint
                    ? 'bg-stripes-red border-red-300'
                    : 'bg-white border-earth-200 hover:border-farm-300 hover:shadow-sm'
                }`}
              >
                <div className="text-3xl mb-1">🚜</div>
                <div className="font-bold text-sm text-earth-600">{m.name}</div>
                <div className="text-[10px] text-earth-400">{m.type}</div>
                <div className="mt-2">
                  {inMaint ? (
                    <span className="tag tag-danger">🔧 维修中</span>
                  ) : todayWorkCount > 0 ? (
                    <span className="tag tag-success">📅 今日{todayWorkCount}单</span>
                  ) : (
                    <span className="tag tag-gray">空闲</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function HeroStat({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: any;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3.5 ${
        highlight ? 'bg-white/10 backdrop-blur-sm border border-white/20' : ''
      }`}
    >
      <div className="flex items-center gap-2 text-wheat-100/80 text-xs">
        <Icon size={13} />
        {label}
      </div>
      <div className="mt-1 font-serif text-xl md:text-2xl font-bold">{value}</div>
    </div>
  );
}
