import {
  Package,
  Search,
  CalendarClock,
  CheckCircle2,
  Plus,
  ArrowUpRight,
  ScanLine,
  CalendarPlus,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";

const BRASS_GRADIENT = "linear-gradient(135deg, #e0b96e 0%, #c9a96e 50%, #93703d 100%)";

interface StatCard {
  label: string;
  value: string;
  unit: string;
  icon: LucideIcon;
  trend: string;
  trendUp: boolean;
  accent: string;
}

const stats: StatCard[] = [
  {
    label: "在库设备",
    value: "128",
    unit: "台",
    icon: Package,
    trend: "+6 今日",
    trendUp: true,
    accent: "from-brass-400/25 to-brass-700/10",
  },
  {
    label: "待检测",
    value: "17",
    unit: "台",
    icon: Search,
    trend: "+3 今日",
    trendUp: true,
    accent: "from-signal-orange/20 to-transparent",
  },
  {
    label: "待预约",
    value: "9",
    unit: "单",
    icon: CalendarClock,
    trend: "今日已满",
    trendUp: true,
    accent: "from-signal-blue/20 to-transparent",
  },
  {
    label: "今日成交",
    value: "4",
    unit: "台",
    icon: CheckCircle2,
    trend: "¥ 32,800",
    trendUp: true,
    accent: "from-signal-green/20 to-transparent",
  },
];

const quickActions = [
  { label: "设备入库", icon: Plus, desc: "新设备登记" },
  { label: "快速检测", icon: ScanLine, desc: "开启检测流程" },
  { label: "新建预约", icon: CalendarPlus, desc: "客户到店登记" },
];

const skeletonRows = 6;

function SkeletonItem() {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-space-700/40 last:border-0">
      <div className="w-10 h-10 rounded-md bg-space-700/60 animate-pulse" />
      <div className="flex-1 min-w-0">
        <div className="h-3.5 w-40 rounded bg-space-700/60 animate-pulse mb-2" />
        <div className="h-3 w-28 rounded bg-space-700/40 animate-pulse" />
      </div>
      <div className="hidden sm:flex items-center gap-3">
        <div className="h-5 w-12 rounded-full bg-space-700/50 animate-pulse" />
        <div className="h-3.5 w-20 rounded bg-space-700/40 animate-pulse" />
      </div>
      <div className="h-8 w-16 rounded bg-space-700/60 animate-pulse" />
    </div>
  );
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function ClerkDashboard() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="font-mono text-[10px] tracking-[0.3em] text-space-500 mb-1.5">
            CLERK · WORKBENCH
          </div>
          <h1 className="text-2xl font-bold text-space-100 tracking-wide">
            店员工作台
          </h1>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-space-400 px-3 py-1.5 rounded-md bg-space-800/60 border border-space-700">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse-soft"
            style={{ background: BRASS_GRADIENT }}
          />
          {new Date().toLocaleDateString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            weekday: "short",
          })}
        </div>
      </div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="card-panel p-5 relative overflow-hidden group"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${s.accent} opacity-60 pointer-events-none`}
              />
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="flex items-center justify-center rounded-md w-10 h-10"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(224,185,110,0.15) 0%, rgba(147,112,61,0.15) 100%)",
                      border: "1px solid rgba(201,169,110,0.25)",
                    }}
                  >
                    <Icon className="w-5 h-5 text-brass-300" strokeWidth={2} />
                  </div>
                  <span
                    className={`text-[11px] font-medium flex items-center gap-1 ${
                      s.trendUp ? "text-signal-green" : "text-signal-red"
                    }`}
                  >
                    {s.trend}
                    {s.trendUp && <ArrowUpRight className="w-3 h-3" />}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="font-mono text-3xl font-bold text-space-100 tracking-tight">
                    {s.value}
                  </span>
                  <span className="text-xs text-space-400">{s.unit}</span>
                </div>
                <div className="text-[12px] text-space-400 tracking-wide">
                  {s.label}
                </div>
              </div>
              <div
                className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500"
                style={{ background: BRASS_GRADIENT }}
              />
            </div>
          );
        })}
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card-panel p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-space-200 tracking-wide">
              快捷操作
            </h3>
            <div className="h-px flex-1 mx-4 divider-brass" />
          </div>
          <div className="space-y-2.5">
            {quickActions.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  className="w-full flex items-center gap-3 p-3 rounded-md bg-space-800/60 border border-transparent hover:border-brass/30 hover:bg-space-800 transition-all duration-200 group"
                >
                  <div
                    className="flex items-center justify-center w-9 h-9 rounded-md transition-all duration-200 group-hover:shadow-brass-glow"
                    style={{ background: BRASS_GRADIENT }}
                  >
                    <Icon className="w-4.5 h-4.5 w-[18px] h-[18px] text-space-950" strokeWidth={2.1} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-[13px] font-medium text-space-100 group-hover:text-brass-200 transition-colors">
                      {a.label}
                    </div>
                    <div className="text-[11px] text-space-500 mt-0.5">
                      {a.desc}
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-space-500 group-hover:text-brass-300 transition-colors -rotate-45 group-hover:rotate-0 duration-300" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="card-panel p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-space-200 tracking-wide">
                近期设备
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-space-700/60 text-[11px] font-mono text-space-400">
                {skeletonRows} ITEMS
              </span>
            </div>
            <button className="text-[11px] font-medium text-brass-300 hover:text-brass-200 flex items-center gap-1 transition-colors">
              查看全部
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="-mx-1">
            {Array.from({ length: skeletonRows }).map((_, i) => (
              <SkeletonItem key={i} />
            ))}
          </div>

          <div className="mt-4 pt-4 divider-brass flex items-center justify-center">
            <div className="flex items-center gap-2 text-[11px] font-mono text-space-500">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-3 h-3 rounded-full border-2 border-space-600 border-t-brass-400"
              />
              数据加载中 · LOADING ASSETS INDEX
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
