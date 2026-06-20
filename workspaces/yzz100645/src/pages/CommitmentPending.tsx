import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ListFilter,
  Search,
  CalendarDays,
  Package,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCommitmentStore } from "@/stores/commitmentStore";
import { useOrderStore } from "@/stores/orderStore";
import { useUIStore } from "@/stores/uiStore";
import type { Commitment, CommitmentStatus } from "@/types";
import { STATUS_LABELS, LINK_STATUS_LABELS } from "@/types";
import ConfidenceBadge from "@/components/ConfidenceBadge";

type TabKey = "pending" | "confirmed" | "all";

const tabs: { key: TabKey; label: string; statusFilter?: CommitmentStatus | "all" }[] = [
  { key: "pending", label: "待确认", statusFilter: "pending" },
  { key: "confirmed", label: "已确认", statusFilter: "confirmed" },
  { key: "all", label: "全部", statusFilter: "all" },
];

export default function CommitmentPending() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { selectedId?: string } | null;

  const commitments = useCommitmentStore((s) => s.commitments);
  const orders = useOrderStore((s) => s.orders);
  const confirmCommitment = useCommitmentStore((s) => s.confirmCommitment);
  const rejectCommitment = useCommitmentStore((s) => s.rejectCommitment);
  const { showToast: uiToast } = useUIStore();

  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    locationState?.selectedId || null
  );

  const filtered = commitments.filter((c) => {
    const tabCfg = tabs.find((t) => t.key === activeTab)!;
    if (tabCfg.statusFilter !== "all" && c.status !== tabCfg.statusFilter)
      return false;
    if (filterSupplier && c.supplierId !== filterSupplier) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !c.supplierName.toLowerCase().includes(q) &&
        !(c.deliveryDate.value || "").includes(q) &&
        !(c.additionalTerms.value || "").toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const selected = selectedId
    ? commitments.find((c) => c.id === selectedId) || null
    : null;

  const linkStatus = (c: Commitment) => {
    if (c.status !== "confirmed") return null;
    return c.linkedOrderIds.length > 0 ? "linked" : "unlinked";
  };

  const suppliers = Array.from(new Set(commitments.map((c) => c.supplierName)));
  const supplierIds = Array.from(new Set(commitments.map((c) => c.supplierId)));

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="p-6 border-b border-steel-100 bg-white/60 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="h1-display">承诺抽取与确认</h1>
            <p className="text-sm text-steel-500 mt-1">
              审核系统抽取的承诺信息，人工修正后确认生效，或驳回重抽
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex p-1 rounded-xl bg-steel-100/60">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                  activeTab === t.key
                    ? "bg-white text-steel-800 shadow-sm"
                    : "text-steel-500 hover:text-steel-700"
                )}
              >
                {t.label}
                <span className="ml-1.5 text-[11px] opacity-70">
                  {
                    commitments.filter((c) =>
                      t.statusFilter === "all" ? true : c.status === t.statusFilter
                    ).length
                  }
                </span>
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-steel-200" />

          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索供应商、交期..."
              className="pl-8 pr-4 py-1.5 rounded-xl bg-steel-50/80 border border-transparent text-sm focus:bg-white focus:border-steel-200 focus:ring-2 focus:ring-steel-700/10 transition-all outline-none w-56"
            />
          </div>

          <select
            value={filterSupplier}
            onChange={(e) => setFilterSupplier(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-steel-50/80 border border-transparent text-sm text-steel-700 focus:bg-white focus:border-steel-200 transition-colors outline-none inline-flex items-center gap-1"
          >
            <option value="">
              <Filter size={12} />
              全部供应商
            </option>
            {supplierIds.map((sid, i) => (
              <option key={sid} value={sid}>
                {suppliers[i]}
              </option>
            ))}
          </select>

          <div className="flex-1" />

          <span className="text-xs text-steel-500">
            共 {filtered.length} 条
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex">
        <div className="w-[420px] flex-shrink-0 border-r border-steel-100 overflow-y-auto scrollbar-thin bg-steel-50/30">
          {filtered.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-16 text-center px-4">
              <ListFilter
                size={40}
                className="text-steel-300 mb-3"
              />
              <p className="text-sm font-medium text-steel-600">
                暂无匹配的承诺
              </p>
              <p className="text-xs text-steel-400 mt-1">
                尝试切换标签或清空筛选条件
              </p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              <AnimatePresence initial={false}>
                {filtered.map((cmt, idx) => (
                  <CommitmentRow
                    key={cmt.id}
                    commitment={cmt}
                    linkStatus={linkStatus(cmt)}
                    selected={selectedId === cmt.id}
                    onClick={() => setSelectedId(cmt.id)}
                    delay={idx * 0.02}
                    onConfirm={() => {
                      confirmCommitment(cmt.id);
                      uiToast("success", "已确认承诺");
                    }}
                    onReject={() => {
                      rejectCommitment(cmt.id);
                      uiToast("info", "已驳回承诺");
                    }}
                    ordersCount={cmt.linkedOrderIds.length}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 bg-steel-50/20 overflow-y-auto scrollbar-thin">
          <AnimatePresence mode="wait">
            {!selected ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-center px-8"
              >
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-steel-100 to-amber-50 flex items-center justify-center mb-5 shadow-inner">
                  <ListFilter
                    size={40}
                    className="text-steel-300"
                  />
                </div>
                <h3 className="font-serif text-xl font-semibold text-steel-800 mb-2">
                  请选择一条承诺
                </h3>
                <p className="text-sm text-steel-500 max-w-sm leading-relaxed">
                  从左侧列表选择一条承诺进行审核，您可以查看系统抽取的详细结果、
                  修正字段内容、确认或驳回，以及查看修正历史。
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.3 }}
              >
                <CommitmentDetailInline
                  commitment={selected}
                  orders={orders}
                  onEdit={() => navigate(`/commitment/${selected.id}`)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}



function CommitmentRow({
  commitment,
  linkStatus: ls,
  selected,
  onClick,
  delay,
  onConfirm,
  onReject,
  ordersCount,
}: {
  commitment: Commitment;
  linkStatus: "linked" | "unlinked" | null;
  selected: boolean;
  onClick: () => void;
  delay: number;
  onConfirm: () => void;
  onReject: () => void;
  ordersCount: number;
}) {
  const hasLow = ["low"].includes(
    commitment.deliveryDate.confidence ||
      commitment.quantity.confidence ||
      commitment.price.confidence
  )
    ? true
    : Object.values({
        d: commitment.deliveryDate.confidence,
        q: commitment.quantity.confidence,
        p: commitment.price.confidence,
      }).some((v) => v === "low");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className={cn(
        "relative p-3.5 rounded-xl cursor-pointer transition-all group border",
        selected
          ? "bg-white border-steel-300 shadow-md shadow-steel-700/5"
          : "bg-white/70 border-transparent hover:bg-white hover:border-steel-200",
        hasLow && selected === false && "border-l-4 border-l-confidence-low"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-steel-800 truncate">
            {commitment.supplierName}
          </p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <ConfidenceBadge
              confidence={commitment.deliveryDate.confidence}
              size="sm"
              showIcon={false}
            />
            <span
              className={cn(
                "badge ring-1 ring-inset",
                commitment.status === "pending" &&
                  "bg-amber-50 text-amber-700 ring-amber-200",
                commitment.status === "confirmed" &&
                  "bg-emerald-50 text-emerald-700 ring-emerald-200",
                commitment.status === "rejected" &&
                  "bg-steel-100 text-steel-600 ring-steel-200"
              )}
            >
              {STATUS_LABELS[commitment.status]}
            </span>
            {ls && (
              <span
                className={cn(
                  "badge ring-1 ring-inset",
                  ls === "linked" &&
                    "bg-sky-50 text-sky-700 ring-sky-200",
                  ls === "unlinked" &&
                    "bg-red-50 text-red-700 ring-red-200 animate-pulse-soft"
                )}
              >
                {LINK_STATUS_LABELS[ls]}
                {ordersCount > 0 && ` (${ordersCount})`}
              </span>
            )}
          </div>
        </div>
        <ChevronRight
          size={16}
          className={cn(
            "text-steel-300 flex-shrink-0 mt-0.5 transition-all",
            selected && "text-steel-600 translate-x-0.5"
          )}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-1 text-steel-600 min-w-0">
          <CalendarDays size={11} className="text-emerald-500 flex-shrink-0" />
          <span className="font-mono truncate">
            {commitment.deliveryDate.value?.slice(5) || "-"}
          </span>
        </div>
        <div className="flex items-center gap-1 text-steel-600 min-w-0">
          <Package size={11} className="text-sky-500 flex-shrink-0" />
          <span className="font-mono truncate">
            {commitment.quantity.value?.toLocaleString() || "-"}
          </span>
        </div>
        <div className="flex items-center gap-1 text-steel-600 min-w-0">
          <span className="text-amber-500 font-bold text-[10px]">¥</span>
          <span className="font-mono truncate">
            {commitment.price.value === null
              ? "按上次"
              : commitment.price.value?.toLocaleString()}
          </span>
        </div>
      </div>

      {commitment.status === "pending" && selected && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-dashed border-steel-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConfirm();
            }}
            className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors inline-flex items-center justify-center gap-1"
          >
            <CheckCircle2 size={12} />
            确认
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReject();
            }}
            className="px-3 py-1.5 rounded-lg bg-steel-100 text-steel-600 text-xs font-medium hover:bg-steel-200 transition-colors inline-flex items-center justify-center gap-1"
          >
            <XCircle size={12} />
            驳回
          </button>
        </div>
      )}

      <p className="text-[10px] text-steel-400 mt-2 flex items-center gap-1">
        <Clock size={10} />
        创建于 {new Date(commitment.createdAt).toLocaleDateString("zh-CN")}
      </p>
    </motion.div>
  );
}

function CommitmentDetailInline({
  commitment,
  orders,
  onEdit,
}: {
  commitment: Commitment;
  orders: { id: string; orderNo: string }[];
  onEdit: () => void;
}) {
  const linkedOrders = commitment.linkedOrderIds
    .map((id) => orders.find((o) => o.id === id))
    .filter(Boolean) as { id: string; orderNo: string }[];

  const lowCount = [
    commitment.deliveryDate.confidence,
    commitment.quantity.confidence,
    commitment.price.confidence,
    commitment.alternativeMaterials.confidence,
    commitment.additionalTerms.confidence,
  ].filter((c) => c === "low").length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="font-serif text-2xl font-semibold text-steel-900">
              {commitment.supplierName}
            </h2>
            {lowCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-medium ring-1 ring-inset ring-red-200 animate-pulse-soft">
                <AlertTriangle size={12} />
                {lowCount} 项低置信，请重点核对
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-steel-500">
            <span>
              创建于{" "}
              {new Date(commitment.createdAt).toLocaleString("zh-CN")}
            </span>
            {commitment.confirmedAt && (
              <span>
                · 确认于{" "}
                {new Date(commitment.confirmedAt).toLocaleString("zh-CN")}
                {" "}· {commitment.confirmedBy}
              </span>
            )}
            {commitment.auditLogs.length > 0 && (
              <span>· 已修正 {commitment.auditLogs.length} 次</span>
            )}
          </div>
        </div>
        <button onClick={onEdit} className="btn-primary text-sm">
          完整编辑
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <SummaryFieldCard
          label="交期"
          value={commitment.deliveryDate.value || "-"}
          confidence={commitment.deliveryDate.confidence}
          evidence={commitment.deliveryDate.evidenceSentence}
          iconColor="emerald"
          isEdited={commitment.deliveryDate.isEdited}
        />
        <SummaryFieldCard
          label="数量"
          value={
            commitment.quantity.value !== null
              ? commitment.quantity.value.toLocaleString()
              : "-"
          }
          confidence={commitment.quantity.confidence}
          evidence={commitment.quantity.evidenceSentence}
          iconColor="sky"
          isEdited={commitment.quantity.isEdited}
        />
        <SummaryFieldCard
          label="价格"
          value={
            commitment.price.value === null
              ? "按上次"
              : `¥${commitment.price.value.toLocaleString()}`
          }
          confidence={commitment.price.confidence}
          evidence={commitment.price.evidenceSentence}
          iconColor="amber"
          isEdited={commitment.price.isEdited}
        />
        <SummaryFieldCard
          label="替代料"
          value={
            commitment.alternativeMaterials.value?.length
              ? commitment.alternativeMaterials.value.join("、")
              : "无"
          }
          confidence={commitment.alternativeMaterials.confidence}
          evidence={commitment.alternativeMaterials.evidenceSentence}
          iconColor="violet"
          isEdited={commitment.alternativeMaterials.isEdited}
        />
        <SummaryFieldCard
          label="附加条件"
          value={commitment.additionalTerms.value || "无"}
          confidence={commitment.additionalTerms.confidence}
          evidence={commitment.additionalTerms.evidenceSentence}
          iconColor="rose"
          isEdited={commitment.additionalTerms.isEdited}
        />
        <div className="glass-card gradient-border p-4 rounded-xl">
          <p className="text-xs font-medium text-steel-600 mb-2">
            关联订单
          </p>
          {linkedOrders.length === 0 ? (
            <div className="py-3 text-center text-xs text-steel-400">
              尚未关联
            </div>
          ) : (
            <div className="space-y-1.5">
              {linkedOrders.map((o) => (
                <span
                  key={o.id}
                  className="inline-flex items-center px-2 py-1 rounded-lg bg-sky-50 text-sky-700 text-xs font-mono font-medium ring-1 ring-inset ring-sky-200"
                >
                  {o.orderNo}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryFieldCard({
  label,
  value,
  confidence,
  evidence,
  iconColor,
  isEdited,
}: {
  label: string;
  value: string;
  confidence: string;
  evidence: string;
  iconColor: "emerald" | "sky" | "amber" | "violet" | "rose";
  isEdited: boolean;
}) {
  const colorMap = {
    emerald: "from-emerald-50 to-emerald-100/30 text-emerald-700",
    sky: "from-sky-50 to-sky-100/30 text-sky-700",
    amber: "from-amber-50 to-amber-100/30 text-amber-700",
    violet: "from-violet-50 to-violet-100/30 text-violet-700",
    rose: "from-rose-50 to-rose-100/30 text-rose-700",
  };
  return (
    <div className="glass-card gradient-border p-4 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-steel-600">{label}</span>
        <div className="flex items-center gap-1.5">
          <ConfidenceBadge
            confidence={confidence as "high" | "medium" | "low"}
            size="sm"
            showIcon={false}
          />
          {isEdited && (
            <span className="text-[10px] text-sky-600 font-medium">已修正</span>
          )}
        </div>
      </div>
      <div
        className={cn(
          "px-3 py-2.5 rounded-lg bg-gradient-to-r",
          colorMap[iconColor]
        )}
      >
        <p className="font-serif font-semibold text-sm leading-tight break-all line-clamp-2">
          {value}
        </p>
      </div>
      {evidence && (
        <p className="text-[11px] text-steel-500 mt-2 line-clamp-2 italic leading-relaxed">
          「{evidence}」
        </p>
      )}
    </div>
  );
}
