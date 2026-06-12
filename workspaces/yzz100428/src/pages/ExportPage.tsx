import { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  FileBarChart,
  Car,
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  Download,
  Info,
  ArrowRight,
  TrendingUp,
  Users,
  XCircle,
  Fuel,
  Clock,
  FileJson,
} from 'lucide-react';
import { useAppStore, todayStr, tomorrowStr } from '../store/useAppStore';
import {
  exportTomorrowWorksheet,
  exportFinanceReport,
  exportDriverWorksheet,
} from '../utils/exportCSV';
import { addDays, eachDayOfInterval, format, parseISO, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';

type Range = '7d' | '30d' | 'thisMonth' | 'custom';

export default function ExportPage() {
  const { reservations, maintenances, machines, drivers } = useAppStore();
  const today = todayStr();
  const tomorrow = tomorrowStr();

  const [range, setRange] = useState<Range>('thisMonth');
  const [customStart, setCustomStart] = useState(subDays(new Date(), 7));
  const [customEnd, setCustomEnd] = useState(new Date());

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (range) {
      case '7d':
        return { start: subDays(now, 6), end: now };
      case '30d':
        return { start: subDays(now, 29), end: now };
      case 'thisMonth': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start, end: now };
      }
      case 'custom':
      default:
        return { start: customStart, end: customEnd };
    }
  }, [range, customStart, customEnd]);

  const startStr = format(dateRange.start, 'yyyy-MM-dd');
  const endStr = format(dateRange.end, 'yyyy-MM-dd');

  const tomorrowData = useMemo(
    () => reservations.filter((r) => r.workDate === tomorrow && r.status !== '已取消'),
    [reservations, tomorrow]
  );

  const financeStats = useMemo(() => {
    const inRange = reservations.filter(
      (r) => r.workDate >= startStr && r.workDate <= endStr
    );
    const valid = inRange.filter((r) => r.status !== '已取消');
    const canceled = inRange.filter((r) => r.status === '已取消');
    const totalHours = valid.reduce((s, r) => s + r.durationHours, 0);
    const totalFuel = valid.reduce((s, r) => s + r.estimatedFuel, 0);

    const byDate: Record<string, { date: string; orders: number; hours: number; fuel: number; canceled: number }> = {};
    eachDayOfInterval({ start: dateRange.start, end: dateRange.end }).forEach((d) => {
      const key = format(d, 'yyyy-MM-dd');
      byDate[key] = { date: key, orders: 0, hours: 0, fuel: 0, canceled: 0 };
    });
    inRange.forEach((r) => {
      if (!byDate[r.workDate]) return;
      if (r.status === '已取消') {
        byDate[r.workDate].canceled++;
      } else {
        byDate[r.workDate].orders++;
        byDate[r.workDate].hours += r.durationHours;
        byDate[r.workDate].fuel += r.estimatedFuel;
      }
    });

    return {
      totalOrders: valid.length,
      canceledOrders: canceled.length,
      totalHours: totalHours.toFixed(1),
      totalFuel,
      avgHoursPerOrder: valid.length > 0 ? (totalHours / valid.length).toFixed(1) : '0',
      avgFuelPerOrder: valid.length > 0 ? Math.round(totalFuel / valid.length) : 0,
      byDate: Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)),
      valid,
      canceled,
    };
  }, [reservations, startStr, endStr, dateRange.start, dateRange.end]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-farm-700 flex items-center gap-2">
          <FileSpreadsheet size={24} />
          数据导出中心
        </h2>
        <p className="text-sm text-earth-500 mt-1">
          合作社主任导出明日作业单，财务导出油费工时汇总，司机导出当日作业单
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ExportCard
          tone="wheat"
          icon={CalendarDays}
          title="合作社主任 · 明日作业单"
          desc="明日所有作业安排明细（按司机+时间排序），打印分发或发送微信群"
          badge={`明日 ${tomorrowData.length} 单`}
          badgeTone="success"
          onExport={() => {
            if (tomorrowData.length === 0) return alert('明日暂无预约记录');
            exportTomorrowWorksheet(reservations, tomorrow);
          }}
          details={[
            { label: '作业日期', value: tomorrow },
            { label: '总工时', value: `${tomorrowData.reduce((s, r) => s + r.durationHours, 0).toFixed(1)} h` },
            { label: '预计总油费', value: `¥ ${tomorrowData.reduce((s, r) => s + r.estimatedFuel, 0)}` },
            { label: '覆盖司机', value: `${new Set(tomorrowData.map((r) => r.driverId)).size} 人` },
          ]}
          filename={`明日作业单_${tomorrow}.csv`}
        />

        <ExportCard
          tone="farm"
          icon={FileBarChart}
          title="财务人员 · 油费/工时/取消汇总"
          desc="指定时间范围内：每张机/司机的油费工时、取消预约明细（财务对账用）"
          badge={`${financeStats.totalOrders}有效 · ${financeStats.canceledOrders}取消`}
          badgeTone="info"
          onExport={() => {
            if (financeStats.valid.length === 0 && financeStats.canceledOrders === 0) {
              return alert('该时段内无数据');
            }
            exportFinanceReport(reservations, startStr, endStr);
          }}
          details={[
            { label: '统计范围', value: `${startStr} ~ ${endStr}` },
            { label: '总工时', value: `${financeStats.totalHours} h` },
            { label: '总油费', value: `¥ ${financeStats.totalFuel}` },
            { label: '平均单额', value: `¥${financeStats.avgFuelPerOrder}/单 · ${financeStats.avgHoursPerOrder}h` },
          ]}
          filename={`财务汇总_${startStr}_${endStr}.csv`}
          extra={
            <div className="mt-4 space-y-3">
              <div>
                <label className="input-label text-xs">统计时段</label>
                <div className="flex flex-wrap items-center gap-2">
                  {(['7d', '30d', 'thisMonth', 'custom'] as Range[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                        range === r
                          ? 'bg-farm-600 text-white border-farm-600'
                          : 'bg-white text-earth-500 border-earth-300 hover:bg-farm-50'
                      }`}
                    >
                      {r === '7d' ? '最近7天' : r === '30d' ? '最近30天' : r === 'thisMonth' ? '本月' : '自定义'}
                    </button>
                  ))}
                </div>
              </div>
              {range === 'custom' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="input-label text-xs">开始日期</label>
                    <input
                      type="date"
                      className="input !py-1.5 text-xs"
                      value={format(dateRange.start, 'yyyy-MM-dd')}
                      onChange={(e) => setCustomStart(parseISO(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="input-label text-xs">结束日期</label>
                    <input
                      type="date"
                      className="input !py-1.5 text-xs"
                      value={format(dateRange.end, 'yyyy-MM-dd')}
                      onChange={(e) => setCustomEnd(parseISO(e.target.value))}
                    />
                  </div>
                </div>
              )}
            </div>
          }
        />

        <ExportCard
          tone="blue"
          icon={Car}
          title="司机 · 出发前作业单"
          desc="司机按作业顺序查看：地块位置、农户姓名电话、预计时长（可手机查看）"
          badge={`今日 ${reservations.filter((r) => r.workDate === today && r.status !== '已取消').length} 单`}
          badgeTone="warning"
          onExport={() => {
            const n = reservations.filter((r) => r.workDate === today && r.status !== '已取消').length;
            if (n === 0) return alert('今日暂无预约');
            exportDriverWorksheet(reservations, today);
          }}
          details={[
            { label: '作业日期', value: today },
            { label: '覆盖司机', value: `${drivers.filter((d) => d.active).length} 人` },
            { label: '司机数', value: `${new Set(reservations.filter((r) => r.workDate === today).map((r) => r.driverId)).size} 人有安排` },
            { label: '导出格式', value: 'CSV（可Excel打开）' },
          ]}
          filename={`司机作业单_${today}.csv`}
        />
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-bold text-earth-600 flex items-center gap-2">
            <TrendingUp size={16} className="text-farm-600" />
            财务时段趋势（{startStr} ~ {endStr}）
          </h3>
          <div className="text-xs text-earth-400">每日作业/工时/油费/取消概览</div>
        </div>
        <div className="p-5">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="text-xs text-earth-500 border-b border-earth-200">
                  <th className="px-3 py-2 text-left font-medium">日期</th>
                  <th className="px-3 py-2 text-center font-medium">有效单数</th>
                  <th className="px-3 py-2 text-center font-medium">已取消</th>
                  <th className="px-3 py-2 text-right font-medium">总工时(h)</th>
                  <th className="px-3 py-2 text-right font-medium">总油费(¥)</th>
                  <th className="px-3 py-2 text-left font-medium">进度</th>
                </tr>
              </thead>
              <tbody>
                {financeStats.byDate
                  .slice()
                  .reverse()
                  .map((row) => {
                    const maxFuel = Math.max(...financeStats.byDate.map((d) => d.fuel), 1);
                    const pct = maxFuel > 0 ? (row.fuel / maxFuel) * 100 : 0;
                    const isToday = row.date === today;
                    const isTomorrow = row.date === tomorrow;
                    return (
                      <tr
                        key={row.date}
                        className={`border-b border-earth-100 hover:bg-earth-50/30 transition-colors ${
                          isToday ? 'bg-farm-50/40' : ''
                        }`}
                      >
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-xs ${isToday ? 'font-bold text-farm-700' : 'text-earth-500'}`}>
                              {row.date}
                            </span>
                            {isToday && <span className="tag tag-success">今日</span>}
                            {isTomorrow && <span className="tag tag-warning">明日</span>}
                          </div>
                          <div className="text-[10px] text-earth-400">
                            {format(parseISO(row.date), 'EEE', { locale: zhCN })}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="font-bold text-farm-700">{row.orders}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {row.canceled > 0 ? (
                            <span className="tag tag-danger">{row.canceled}</span>
                          ) : (
                            <span className="text-earth-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-earth-600">
                          {row.hours.toFixed(1)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-earth-600">
                          ¥{row.fuel}
                        </td>
                        <td className="px-3 py-2.5" style={{ minWidth: 160 }}>
                          <div className="w-full h-2 bg-earth-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-farm-400 to-farm-600 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MiniStat icon={Users} label="作业单数" value={financeStats.totalOrders} unit="单" tone="farm" />
        <MiniStat icon={Clock} label="累计工时" value={financeStats.totalHours} unit="小时" tone="wheat" />
        <MiniStat icon={Fuel} label="油费总额" value={`¥${financeStats.totalFuel}`} unit="" tone="blue" />
        <MiniStat icon={XCircle} label="取消单数" value={financeStats.canceledOrders} unit="单" tone="danger" />
      </div>

      <div className="card bg-gradient-to-br from-earth-100/60 to-farm-50/50">
        <div className="card-body p-4 flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-farm-600 text-white flex items-center justify-center shrink-0">
            <Info size={22} />
          </div>
          <div className="flex-1 text-sm text-earth-500">
            <div className="font-bold text-earth-600 mb-1">导出格式说明</div>
            <div className="space-y-1">
              <div>• 所有文件均为 <strong>CSV 格式（带BOM）</strong>，可直接用 Excel/WPS 打开；</div>
              <div>• 司机可在手机上点击 <strong>「司机视图」</strong> 直接查看作业顺序与电话，无需下载；</div>
              <div>• 数据存储于本机浏览器，建议定期导出备份，避免清理缓存丢失；</div>
              <div>• 维修记录请前往「维修管理」页面导出。</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportCard({
  tone,
  icon: Icon,
  title,
  desc,
  badge,
  badgeTone,
  onExport,
  details,
  filename,
  extra,
}: {
  tone: 'farm' | 'wheat' | 'blue';
  icon: any;
  title: string;
  desc: string;
  badge: string;
  badgeTone: 'success' | 'warning' | 'info';
  onExport: () => void;
  details: { label: string; value: string }[];
  filename: string;
  extra?: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    farm: 'from-farm-600 to-farm-700',
    wheat: 'from-wheat-400 to-wheat-500',
    blue: 'from-blue-500 to-blue-600',
  };
  const badges: Record<string, string> = {
    success: 'tag-success',
    warning: 'tag-warning',
    info: 'tag-info',
  };
  return (
    <div className="card flex flex-col h-full">
      <div className={`bg-gradient-to-br ${tones[tone]} text-white p-5`}>
        <div className="flex items-start justify-between">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
            <Icon size={22} />
          </div>
          <span className={`tag ${badges[badgeTone]} !bg-white/90`}>{badge}</span>
        </div>
        <h3 className="font-serif text-lg font-bold mt-3">{title}</h3>
        <p className="text-xs opacity-90 mt-1 leading-relaxed">{desc}</p>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="space-y-2 text-sm">
          {details.map((d) => (
            <div key={d.label} className="flex items-center justify-between gap-3">
              <span className="text-earth-400 text-xs">{d.label}</span>
              <span className="font-medium text-earth-600 text-right truncate">{d.value}</span>
            </div>
          ))}
        </div>
        {extra}
        <div className="mt-auto pt-5 space-y-2">
          <button
            onClick={onExport}
            className={`w-full btn bg-gradient-to-br ${tones[tone]} text-white border-transparent shadow-soft hover:shadow-md !justify-between`}
          >
            <span className="flex items-center gap-2">
              <Download size={16} />
              导出 CSV
            </span>
            <ArrowRight size={16} />
          </button>
          <div className="text-[10px] text-earth-400 text-center">
            <FileJson size={10} className="inline mr-1" />
            {filename}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  unit,
  tone,
}: {
  icon: any;
  label: string;
  value: string | number;
  unit: string;
  tone: 'farm' | 'wheat' | 'blue' | 'danger';
}) {
  const tones: Record<string, string> = {
    farm: 'bg-farm-100 text-farm-700',
    wheat: 'bg-wheat-100 text-wheat-600',
    blue: 'bg-blue-50 text-blue-600',
    danger: 'bg-red-50 text-red-600',
  };
  return (
    <div className="card">
      <div className="card-body flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl ${tones[tone]} flex items-center justify-center`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-earth-400">{label}</div>
          <div className="text-xl font-bold font-serif text-earth-600 mt-0.5 truncate">
            {value}
            <span className="text-xs text-earth-400 font-normal ml-1">{unit}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
