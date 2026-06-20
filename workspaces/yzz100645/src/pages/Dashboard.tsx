import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Link2Off,
  TrendingUp,
  MailPlus,
  CalendarDays,
  Package,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { useCommitmentStore } from "@/stores/commitmentStore";
import type { Commitment } from "@/types";
import { STATUS_LABELS } from "@/types";
import { cn } from "@/lib/utils";
import ConfidenceBadge from "@/components/ConfidenceBadge";

export default function Dashboard() {
  const navigate = useNavigate();
  const stats = useCommitmentStore((s) => s.getDashboardStats());
  const pendingCommitments = useCommitmentStore((s) =>
    s.getCommitmentsByStatus("pending")
  );
  const unlinkedCommitments = useCommitmentStore((s) =>
    s.getUnlinkedCommitments()
  );
  const confirmedCount = useCommitmentStore((s) =>
    s.commitments.filter((c) => c.status === "confirmed").length
  );

  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" },
    }),
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <header className="flex items-start justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="h1-display"
          >
            工作台
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-sm text-steel-500 mt-1"
          >
            欢迎回来，今天有 {stats.pendingCount} 条承诺待确认，
            {stats.unlinkedCount} 条已确认承诺需要关联订单
          </motion.p>
        </div>
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          onClick={() => navigate("/email/import")}
          className="btn-primary"
        >
          <MailPlus size={16} />
          导入新邮件
        </motion.button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <motion.div
          custom={0}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="glass-card gradient-border glass-card-hover p-5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-200/40 to-transparent rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/30">
                <ClipboardList size={18} />
              </div>
              <span className="text-[11px] font-medium px-2 py-1 rounded-lg bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200">
                待处理
              </span>
            </div>
            <p className="text-xs text-steel-500 mb-1">待确认承诺</p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-4xl font-bold text-steel-900">
                {stats.pendingCount}
              </span>
              <span className="text-xs text-steel-400">条</span>
            </div>
            <div className="mt-3 h-10">
              <MiniTrend
                data={stats.sevenDayTrend}
                dataKey="imported"
                color="#F59E0B"
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          custom={1}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="glass-card gradient-border glass-card-hover p-5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-200/40 to-transparent rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white shadow-md shadow-red-500/30">
                <Link2Off size={18} />
              </div>
              <span className="text-[11px] font-medium px-2 py-1 rounded-lg bg-red-50 text-red-700 ring-1 ring-inset ring-red-200">
                需跟进
              </span>
            </div>
            <p className="text-xs text-steel-500 mb-1">未关联订单</p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-4xl font-bold text-steel-900">
                {stats.unlinkedCount}
              </span>
              <span className="text-xs text-steel-400">条</span>
            </div>
            <p className="mt-3 text-[11px] text-steel-500 flex items-center gap-1">
              <AlertTriangle size={11} className="text-red-500" />
              建议尽快关联，避免计划遗漏
            </p>
          </div>
        </motion.div>

        <motion.div
          custom={2}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="glass-card gradient-border glass-card-hover p-5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sky-200/40 to-transparent rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-500/30">
                <TrendingUp size={18} />
              </div>
              <span className="text-[11px] font-medium px-2 py-1 rounded-lg bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200">
                7日
              </span>
            </div>
            <p className="text-xs text-steel-500 mb-1">本周导入</p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-4xl font-bold text-steel-900">
                {stats.weeklyImported}
              </span>
              <span className="text-xs text-steel-400">条邮件</span>
            </div>
            <p className="mt-3 text-[11px] text-sky-600 flex items-center gap-1">
              <CheckCircle2 size={11} />
              已确认 {confirmedCount} 条承诺
            </p>
          </div>
        </motion.div>

        <motion.div
          custom={3}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="glass-card gradient-border glass-card-hover p-5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-200/40 to-transparent rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/30">
                <CheckCircle2 size={18} />
              </div>
              <span className="text-[11px] font-medium px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200">
                效率
              </span>
            </div>
            <p className="text-xs text-steel-500 mb-1">确认率</p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-4xl font-bold text-steel-900">
                {stats.weeklyImported > 0
                  ? Math.round(
                      (confirmedCount /
                        (confirmedCount + stats.pendingCount)) *
                        100
                    )
                  : 0}
              </span>
              <span className="text-xs text-steel-400">%</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-steel-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                  style={{
                    width: `${
                      stats.weeklyImported > 0
                        ? Math.round(
                            (confirmedCount /
                              (confirmedCount + stats.pendingCount)) *
                              100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="glass-card gradient-border p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="h2-section">7日趋势</h2>
            <p className="text-xs text-steel-500 mt-0.5">
              导入邮件量与确认承诺数的每日趋势
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-steel-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-amber-400" />
              导入量
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500" />
              确认量
            </span>
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.sevenDayTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorImported" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorConfirmed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748B", fontSize: 11 }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748B", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="imported"
                stroke="#F59E0B"
                strokeWidth={2}
                fill="url(#colorImported)"
                name="导入量"
              />
              <Area
                type="monotone"
                dataKey="confirmed"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#colorConfirmed)"
                name="确认量"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="glass-card gradient-border p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                <Clock size={16} />
              </div>
              <div>
                <h2 className="h2-section">待确认承诺</h2>
                <p className="text-xs text-steel-500 mt-0.5">
                  {pendingCommitments.length} 条需要您确认
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/commitments/pending")}
              className="btn-ghost text-xs"
            >
              查看全部
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-3 max-h-[480px] overflow-y-auto scrollbar-thin pr-1">
            {pendingCommitments.length === 0 ? (
              <div className="py-12 text-center text-steel-400 text-sm">
                暂无待确认承诺
              </div>
            ) : (
              pendingCommitments
                .slice(0, 6)
                .map((cmt, idx) => (
                  <CommitmentCard
                    key={cmt.id}
                    commitment={cmt}
                    onClick={() => navigate(`/commitments/pending`)}
                    delay={idx * 0.05}
                  />
                ))
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          className="glass-card gradient-border p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                <AlertTriangle size={16} />
              </div>
              <div>
                <h2 className="h2-section">未关联订单提醒</h2>
                <p className="text-xs text-steel-500 mt-0.5">
                  已确认但未关联订单，请尽快跟进
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/orders/link")}
              className="btn-ghost text-xs"
            >
              关联订单
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-3 max-h-[480px] overflow-y-auto scrollbar-thin pr-1">
            {unlinkedCommitments.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2
                    size={28}
                    className="text-emerald-500"
                  />
                </div>
                <p className="text-steel-600 font-medium text-sm">
                  全部已关联
                </p>
                <p className="text-xs text-steel-400 mt-1">
                  所有已确认承诺均已关联订单
                </p>
              </div>
            ) : (
              unlinkedCommitments
                .slice(0, 6)
                .map((cmt, idx) => (
                  <UnlinkedCard
                    key={cmt.id}
                    commitment={cmt}
                    onClick={() => navigate("/orders/link")}
                    delay={idx * 0.05}
                  />
                ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function MiniTrend({
  data,
  dataKey,
  color,
}: {
  data: { date: string; imported: number; confirmed: number }[];
  dataKey: "imported" | "confirmed";
  color: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function CommitmentCard({
  commitment,
  onClick,
  delay,
}: {
  commitment: Commitment;
  onClick: () => void;
  delay: number;
}) {
  const hasLowConfidence =
    commitment.deliveryDate.confidence === "low" ||
    commitment.quantity.confidence === "low" ||
    commitment.price.confidence === "low";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className={cn(
        "p-4 rounded-xl border transition-all cursor-pointer group",
        "bg-white border-steel-100 hover:border-steel-200 hover:shadow-card-hover hover:-translate-y-0.5",
        hasLowConfidence && "border-l-4 border-l-confidence-low"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-steel-800 truncate">
              {commitment.supplierName}
            </span>
            <ConfidenceBadge
              confidence={commitment.deliveryDate.confidence}
              size="sm"
              showIcon={false}
            />
            <span className="badge bg-steel-100 text-steel-600 ring-1 ring-inset ring-steel-200">
              {STATUS_LABELS[commitment.status]}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-steel-600">
              <CalendarDays size={12} className="text-emerald-500" />
              <span className="font-mono">
                {commitment.deliveryDate.value || "-"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-steel-600">
              <Package size={12} className="text-sky-500" />
              <span className="font-mono">
                {commitment.quantity.value?.toLocaleString() || "-"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-steel-600">
              <span className="text-amber-500 font-semibold">¥</span>
              <span className="font-mono">
                {commitment.price.value === null
                  ? "按上次"
                  : commitment.price.value?.toLocaleString()}
              </span>
            </div>
          </div>

          {commitment.alternativeMaterials.value?.length ? (
            <div className="mt-2 text-[11px] text-violet-600 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-violet-500" />
              含替代料: {commitment.alternativeMaterials.value.join("、")}
            </div>
          ) : null}
        </div>
        <ChevronRight
          size={16}
          className="text-steel-300 group-hover:text-steel-500 group-hover:translate-x-0.5 transition-all mt-1"
        />
      </div>
    </motion.div>
  );
}

function UnlinkedCard({
  commitment,
  onClick,
  delay,
}: {
  commitment: Commitment;
  onClick: () => void;
  delay: number;
}) {
  const daysOld = Math.floor(
    (Date.now() - new Date(commitment.confirmedAt || commitment.createdAt).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className="p-4 rounded-xl border border-red-100 bg-gradient-to-r from-red-50/50 to-white hover:border-red-200 hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm font-semibold text-steel-800 truncate">
              {commitment.supplierName}
            </span>
            {daysOld > 2 && (
              <span className="badge bg-red-100 text-red-700 ring-1 ring-inset ring-red-200 animate-pulse-soft">
                {daysOld}天未关联
              </span>
            )}
          </div>
          <div className="text-xs text-steel-600 space-y-0.5">
            <p>
              交期:{" "}
              <span className="font-mono">
                {commitment.deliveryDate.value}
              </span>{" "}
              · 数量:{" "}
              <span className="font-mono">
                {commitment.quantity.value?.toLocaleString()}
              </span>
            </p>
            <p className="text-steel-400 text-[11px]">
              确认于{" "}
              {commitment.confirmedAt
                ? new Date(commitment.confirmedAt).toLocaleDateString("zh-CN")
                : "-"}{" "}
              · {commitment.confirmedBy}
            </p>
          </div>
        </div>
        <ChevronRight
          size={16}
          className="text-red-300 group-hover:text-red-500 group-hover:translate-x-0.5 transition-all mt-1"
        />
      </div>
    </motion.div>
  );
}
