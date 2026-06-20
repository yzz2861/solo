import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Link2,
  Link2Off,
  Search,
  Package2,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCommitmentStore } from "@/stores/commitmentStore";
import { useOrderStore } from "@/stores/orderStore";
import { useEmailStore } from "@/stores/emailStore";
import { useUIStore } from "@/stores/uiStore";
import type { Commitment, Order } from "@/types";
import { ORDER_STATUS_LABELS } from "@/types";
import ConfidenceBadge from "@/components/ConfidenceBadge";
import OrderLinkModal from "@/components/OrderLinkModal";

type KanbanColumn = "unlinked" | "linked" | "exception";

const columns: {
  key: KanbanColumn;
  label: string;
  icon: typeof Link2;
  desc: string;
  color: string;
  badge: string;
}[] = [
  {
    key: "unlinked",
    label: "待关联",
    icon: Link2Off,
    desc: "已确认但未关联订单的承诺",
    color: "from-red-500 to-orange-500",
    badge: "bg-red-500",
  },
  {
    key: "linked",
    label: "已关联",
    icon: Link2,
    desc: "已关联至少一个订单的承诺",
    color: "from-emerald-500 to-sky-500",
    badge: "bg-emerald-500",
  },
  {
    key: "exception",
    label: "关联异常",
    icon: AlertTriangle,
    desc: "关联但供应商或数量不匹配，需人工核对",
    color: "from-amber-500 to-amber-600",
    badge: "bg-amber-500",
  },
];

export default function OrderLink() {
  const { commitments } = useCommitmentStore();
  const { orders } = useOrderStore();
  const { suppliers } = useEmailStore();
  const { orderLinkModalOpen, setOrderLinkModalOpen } = useUIStore();

  const [activeCommitmentId, setActiveCommitmentId] = useState<string | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");

  const activeCommitment = activeCommitmentId
    ? commitments.find((c) => c.id === activeCommitmentId) || null
    : null;

  const { unlinked, linked, exception } = useMemo(() => {
    const confirmed = commitments.filter((c) => c.status === "confirmed");

    const u: Commitment[] = [];
    const l: Commitment[] = [];
    const e: Commitment[] = [];

    confirmed.forEach((c) => {
      if (c.linkedOrderIds.length === 0) {
        u.push(c);
        return;
      }
      const matchedOrders = c.linkedOrderIds
        .map((id) => orders.find((o) => o.id === id))
        .filter(Boolean) as Order[];
      const hasMismatch = matchedOrders.some(
        (o) =>
          o.supplierId !== c.supplierId ||
          (c.quantity.value !== null &&
            o.quantity !== c.quantity.value &&
            Math.abs(o.quantity - c.quantity.value) / o.quantity > 0.2)
      );
      if (hasMismatch) e.push(c);
      else l.push(c);
    });

    const filterFn = (c: Commitment) => {
      if (filterSupplier && c.supplierId !== filterSupplier) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSupplier = c.supplierName.toLowerCase().includes(q);
        const matchesDate = (c.deliveryDate.value || "").includes(q);
        const matchesOrder = c.linkedOrderIds.some((oid) => {
          const o = orders.find((x) => x.id === oid);
          return o?.orderNo.toLowerCase().includes(q);
        });
        return matchesSupplier || matchesDate || matchesOrder;
      }
      return true;
    };

    return {
      unlinked: u.filter(filterFn),
      linked: l.filter(filterFn),
      exception: e.filter(filterFn),
    };
  }, [commitments, orders, searchQuery, filterSupplier]);

  const total = unlinked.length + linked.length + exception.length;

  return (
    <div className="p-6 max-w-[1800px] mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="h1-display">订单关联管理</h1>
          <p className="text-sm text-steel-500 mt-1">
            将已确认的供应商承诺与采购订单手动关联，三栏看板一目了然
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-white border border-steel-100 shadow-sm">
            <span className="inline-flex items-center gap-1.5 text-red-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              待关联 {unlinked.length}
            </span>
            <span className="w-px h-4 bg-steel-200" />
            <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              已关联 {linked.length}
            </span>
            <span className="w-px h-4 bg-steel-200" />
            <span className="inline-flex items-center gap-1.5 text-amber-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              异常 {exception.length}
            </span>
          </div>
        </div>
      </header>

      <div className="glass-card gradient-border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索供应商、交期、订单号..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-steel-50/60 border border-transparent text-sm focus:bg-white focus:border-steel-200 focus:ring-2 focus:ring-steel-700/10 transition-all outline-none"
            />
          </div>
          <select
            value={filterSupplier}
            onChange={(e) => setFilterSupplier(e.target.value)}
            className="px-4 py-2 rounded-xl bg-steel-50/60 border border-transparent text-sm text-steel-700 focus:bg-white focus:border-steel-200 transition-colors outline-none inline-flex items-center"
          >
            <option value="">全部供应商</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="flex-1" />
          <div className="text-xs text-steel-500">
            共 {total} 条已确认承诺
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {columns.map((col, colIdx) => {
          const data =
            col.key === "unlinked"
              ? unlinked
              : col.key === "linked"
              ? linked
              : exception;
          return (
            <motion.div
              key={col.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: colIdx * 0.08 }}
              className="flex flex-col min-h-[600px]"
            >
              <div className="flex items-center gap-3 mb-3 px-1">
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md bg-gradient-to-br",
                    col.color
                  )}
                >
                  <col.icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif text-base font-semibold text-steel-900">
                      {col.label}
                    </h2>
                    <span
                      className={cn(
                        "inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-[11px] font-bold text-white",
                        col.badge
                      )}
                    >
                      {data.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-steel-500 leading-tight mt-0.5">
                    {col.desc}
                  </p>
                </div>
              </div>

              <div className="flex-1 p-3 rounded-2xl bg-gradient-to-br from-steel-50/60 to-white/40 border border-steel-100 space-y-3 overflow-y-auto scrollbar-thin max-h-[calc(100vh-420px)]">
                {data.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center py-16 text-center px-4">
                    <CheckCircle2
                      size={36}
                      className="text-emerald-400 mb-3"
                    />
                    <p className="text-sm font-medium text-steel-600">
                      {col.key === "unlinked"
                        ? "全部已关联"
                        : col.key === "linked"
                        ? "暂无关联"
                        : "无异常"}
                    </p>
                    <p className="text-xs text-steel-400 mt-1">
                      {col.key === "unlinked"
                        ? "所有承诺均已关联订单"
                        : col.key === "linked"
                        ? "还没有成功关联的承诺"
                        : "所有关联均正常"}
                    </p>
                  </div>
                ) : (
                  data.map((cmt, i) => (
                    <KanbanCard
                      key={cmt.id}
                      commitment={cmt}
                      orders={orders}
                      index={i}
                      onClick={() => setActiveCommitmentId(cmt.id)}
                      onLink={() => {
                        setActiveCommitmentId(cmt.id);
                        setOrderLinkModalOpen(true);
                      }}
                      isException={col.key === "exception"}
                    />
                  ))
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {activeCommitment && orderLinkModalOpen && (
          <OrderLinkModal
            commitmentId={activeCommitment.id}
            currentSupplierId={activeCommitment.supplierId}
            currentLinkedIds={activeCommitment.linkedOrderIds}
          />
        )}
      </AnimatePresence>

      {activeCommitment && !orderLinkModalOpen && (
        <OrderLinkModal
          commitmentId={activeCommitment.id}
          currentSupplierId={activeCommitment.supplierId}
          currentLinkedIds={activeCommitment.linkedOrderIds}
        />
      )}

      {!activeCommitment && (
        <div style={{ display: "none" }}>
          <OrderLinkModal
            commitmentId="__placeholder__"
            currentSupplierId=""
            currentLinkedIds={[]}
          />
        </div>
      )}
    </div>
  );
}

function KanbanCard({
  commitment,
  orders,
  index,
  onClick,
  onLink,
  isException,
}: {
  commitment: Commitment;
  orders: Order[];
  index: number;
  onClick: () => void;
  onLink: () => void;
  isException: boolean;
}) {
  const linked = commitment.linkedOrderIds
    .map((oid) => orders.find((o) => o.id === oid))
    .filter(Boolean) as Order[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
      className={cn(
        "group relative p-4 rounded-xl bg-white border cursor-pointer transition-all hover:shadow-card-hover hover:-translate-y-0.5",
        isException
          ? "border-amber-200 border-l-4 border-l-amber-500"
          : "border-steel-100 hover:border-steel-200"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-steel-800 truncate">
            {commitment.supplierName}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <ConfidenceBadge
              confidence={commitment.deliveryDate.confidence}
              size="sm"
              showIcon={false}
            />
            {isException && (
              <span className="badge bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 animate-pulse-soft">
                <AlertTriangle size={10} />
                异常
              </span>
            )}
          </div>
        </div>
        {commitment.linkedOrderIds.length === 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLink();
            }}
            className="p-1.5 rounded-lg bg-steel-100 text-steel-500 group-hover:bg-steel-700 group-hover:text-white transition-all opacity-0 group-hover:opacity-100"
            title="关联订单"
          >
            <Link2 size={13} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
        <div className="p-1.5 rounded-lg bg-emerald-50/70">
          <p className="text-[10px] text-emerald-600 uppercase tracking-wide mb-0.5">
            交期
          </p>
          <p className="font-mono font-semibold text-emerald-800">
            {commitment.deliveryDate.value?.slice(5) || "-"}
          </p>
        </div>
        <div className="p-1.5 rounded-lg bg-sky-50/70">
          <p className="text-[10px] text-sky-600 uppercase tracking-wide mb-0.5">
            数量
          </p>
          <p className="font-mono font-semibold text-sky-800">
            {commitment.quantity.value?.toLocaleString() || "-"}
          </p>
        </div>
        <div className="p-1.5 rounded-lg bg-amber-50/70">
          <p className="text-[10px] text-amber-600 uppercase tracking-wide mb-0.5">
            价格
          </p>
          <p className="font-mono font-semibold text-amber-800">
            {commitment.price.value === null
              ? "按上次"
              : "¥" + commitment.price.value.toLocaleString()}
          </p>
        </div>
      </div>

      {linked.length > 0 && (
        <div className="pt-3 border-t border-dashed border-steel-100 space-y-1.5">
          <p className="text-[10px] font-medium text-steel-500 uppercase tracking-wide">
            关联订单 ({linked.length})
          </p>
          {linked.slice(0, 3).map((o) => (
            <div
              key={o.id}
              className={cn(
                "flex items-center justify-between text-xs p-2 rounded-lg",
                o.supplierId !== commitment.supplierId
                  ? "bg-red-50 border border-red-100"
                  : "bg-sky-50/70"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Package2
                  size={11}
                  className={cn(
                    "flex-shrink-0",
                    o.supplierId !== commitment.supplierId
                      ? "text-red-500"
                      : "text-sky-500"
                  )}
                />
                <span className="font-mono font-medium text-steel-800 truncate">
                  {o.orderNo}
                </span>
                {o.supplierId !== commitment.supplierId && (
                  <span className="badge bg-red-100 text-red-700 ring-0 px-1 py-0 text-[10px]">
                    供应商不匹配
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "badge ring-1 ring-inset px-1.5 py-0 text-[10px]",
                  o.status === "pending" &&
                    "bg-steel-100 text-steel-600 ring-steel-200",
                  o.status === "partial" &&
                    "bg-amber-50 text-amber-700 ring-amber-200",
                  o.status === "completed" &&
                    "bg-emerald-50 text-emerald-700 ring-emerald-200"
                )}
              >
                {ORDER_STATUS_LABELS[o.status]}
              </span>
            </div>
          ))}
          {linked.length > 3 && (
            <p className="text-[10px] text-steel-400 text-center pt-1">
              +{linked.length - 3} 个更多...
            </p>
          )}
        </div>
      )}

      {commitment.confirmedAt && (
        <p className="text-[10px] text-steel-400 mt-3 flex items-center gap-1">
          <Clock size={10} />
          确认于{" "}
          {new Date(commitment.confirmedAt).toLocaleDateString("zh-CN")} ·{" "}
          {commitment.confirmedBy}
        </p>
      )}
    </motion.div>
  );
}
