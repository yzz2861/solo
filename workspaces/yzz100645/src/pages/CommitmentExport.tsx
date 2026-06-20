import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  CalendarDays,
  Package,
  Building2,
  Eye,
  FileDown,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCommitmentStore } from "@/stores/commitmentStore";
import { useOrderStore } from "@/stores/orderStore";
import { useEmailStore } from "@/stores/emailStore";
import { useUIStore } from "@/stores/uiStore";
import type { Commitment, ViewType, CommitmentStatus } from "@/types";
import { STATUS_LABELS } from "@/types";
import {
  exportToExcel,
  exportToPDF,
  exportEvidenceAudit,
} from "@/services/exportService";
import ConfidenceBadge from "@/components/ConfidenceBadge";

const viewOptions: { key: ViewType; label: string; desc: string }[] = [
  { key: "procurement", label: "采购视图", desc: "含置信度、证据句、修正历史等细节" },
  { key: "planner", label: "计划员视图", desc: "仅展示确认后的承诺信息，简洁交付用" },
];

export default function CommitmentExport() {
  const { commitments } = useCommitmentStore();
  const { orders } = useOrderStore();
  const { suppliers } = useEmailStore();
  const { currentView, setCurrentView, showToast } = useUIStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterStatus, setFilterStatus] = useState<CommitmentStatus | "all">("all");
  const [filterLinked, setFilterLinked] = useState<"all" | "linked" | "unlinked">("all");
  const [sortField, setSortField] = useState<"createdAt" | "deliveryDate">(
    "createdAt"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    let data = [...commitments];

    if (currentView === "planner") {
      data = data.filter((c) => c.status === "confirmed");
    }

    if (filterStatus !== "all") {
      data = data.filter((c) => c.status === filterStatus);
    }

    if (filterSupplier) {
      data = data.filter((c) => c.supplierId === filterSupplier);
    }

    if (filterLinked !== "all") {
      data = data.filter((c) => {
        const isLinked = c.linkedOrderIds.length > 0;
        return filterLinked === "linked" ? isLinked : !isLinked;
      });
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter((c) => {
        const matchesSupplier = c.supplierName.toLowerCase().includes(q);
        const matchesDate = (c.deliveryDate.value || "").includes(q);
        const matchesTerms = (c.additionalTerms.value || "")
          .toLowerCase()
          .includes(q);
        const matchesAlt = c.alternativeMaterials.value?.some((m) =>
          m.toLowerCase().includes(q)
        );
        const matchesOrder = c.linkedOrderIds.some((oid) => {
          const o = orders.find((x) => x.id === oid);
          return o?.orderNo.toLowerCase().includes(q);
        });
        return (
          matchesSupplier ||
          matchesDate ||
          matchesTerms ||
          matchesAlt ||
          matchesOrder
        );
      });
    }

    data.sort((a, b) => {
      const av =
        sortField === "deliveryDate"
          ? a.deliveryDate.value || ""
          : a.createdAt;
      const bv =
        sortField === "deliveryDate"
          ? b.deliveryDate.value || ""
          : b.createdAt;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return data;
  }, [
    commitments,
    currentView,
    filterStatus,
    filterSupplier,
    filterLinked,
    searchQuery,
    orders,
    sortField,
    sortDir,
  ]);

  const handleExportExcel = () => {
    exportToExcel(filtered, orders, currentView);
    showToast("success", "Excel 导出完成");
  };

  const handleExportPDF = () => {
    exportToPDF(filtered, orders);
    showToast("success", "PDF 导出完成");
  };

  const handleExportAudit = (cmt: Commitment) => {
    exportEvidenceAudit(cmt);
    showToast("success", `证据清单已导出（${cmt.supplierName}）`);
  };

  const toggleSort = (field: "createdAt" | "deliveryDate") => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  return (
    <div className="p-6 max-w-[1800px] mx-auto space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="h1-display">承诺表导出</h1>
          <p className="text-sm text-steel-500 mt-1">
            {currentView === "procurement"
              ? "采购视角：包含抽取细节，便于审核追溯"
              : "计划员视角：仅确认后承诺，供生产排程使用"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex p-1 rounded-xl bg-steel-100/80">
            {viewOptions.map((v) => (
              <button
                key={v.key}
                onClick={() => setCurrentView(v.key)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                  currentView === v.key
                    ? "bg-white text-steel-800 shadow-sm"
                    : "text-steel-500 hover:text-steel-700"
                )}
              >
                {v.key === "procurement" ? (
                  <FileSpreadsheet size={14} />
                ) : (
                  <Package size={14} />
                )}
                {v.label}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-steel-200" />

          <button onClick={handleExportPDF} className="btn-secondary text-sm">
            <FileText size={15} />
            导出 PDF
          </button>
          <button onClick={handleExportExcel} className="btn-primary text-sm">
            <FileDown size={15} />
            导出 Excel
          </button>
        </div>
      </header>

      <div className="glass-card gradient-border p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[260px] max-w-lg">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索供应商、交期、订单号、物料、附加条件..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-steel-50/60 border border-transparent text-sm focus:bg-white focus:border-steel-200 focus:ring-2 focus:ring-steel-700/10 transition-all outline-none"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-steel-50 text-sm border border-transparent hover:border-steel-200 hover:bg-white transition-colors">
              <Building2
                size={14}
                className="text-steel-400"
              />
              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="bg-transparent outline-none text-steel-700 pr-1"
              >
                <option value="">全部供应商</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as typeof filterStatus)
              }
              className="px-3 py-1.5 rounded-xl bg-steel-50 text-sm outline-none text-steel-700 border border-transparent hover:border-steel-200 hover:bg-white transition-colors"
            >
              <option value="all">全部状态</option>
              <option value="pending">待确认</option>
              <option value="confirmed">已确认</option>
              <option value="rejected">已驳回</option>
            </select>

            <select
              value={filterLinked}
              onChange={(e) =>
                setFilterLinked(e.target.value as typeof filterLinked)
              }
              className="px-3 py-1.5 rounded-xl bg-steel-50 text-sm outline-none text-steel-700 border border-transparent hover:border-steel-200 hover:bg-white transition-colors"
            >
              <option value="all">全部关联</option>
              <option value="linked">已关联订单</option>
              <option value="unlinked">未关联订单</option>
            </select>
          </div>

          <div className="flex-1" />

          <div className="text-xs text-steel-500 flex items-center gap-3">
            <span>共 {filtered.length} 条</span>
            <button
              onClick={() => {
                setSearchQuery("");
                setFilterSupplier("");
                setFilterStatus("all");
                setFilterLinked("all");
              }}
              className="inline-flex items-center gap-1 text-steel-500 hover:text-steel-700 transition-colors"
            >
              <RefreshCw size={12} />
              重置
            </button>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card gradient-border overflow-hidden"
      >
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-steel-50/80 to-white/60 sticky top-0 z-10">
              <tr>
                <Th>
                  <button
                    onClick={() => toggleSort("createdAt")}
                    className="flex items-center gap-1"
                  >
                    创建时间
                    <SortArrow
                      active={sortField === "createdAt"}
                      dir={sortDir}
                    />
                  </button>
                </Th>
                <Th>供应商</Th>
                <Th>
                  <button
                    onClick={() => toggleSort("deliveryDate")}
                    className="flex items-center gap-1"
                  >
                    <CalendarDays size={12} />
                    交期
                    <SortArrow
                      active={sortField === "deliveryDate"}
                      dir={sortDir}
                    />
                  </button>
                </Th>
                <Th className="text-right">数量</Th>
                <Th className="text-right">价格</Th>
                {currentView === "procurement" && <Th>交期置信</Th>}
                {currentView === "procurement" && <Th>价格置信</Th>}
                <Th>替代料</Th>
                <Th>状态</Th>
                <Th>关联订单</Th>
                {currentView === "procurement" && <Th>确认人</Th>}
                {currentView === "procurement" && <Th className="w-[90px]">操作</Th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={currentView === "procurement" ? 13 : 9}
                    className="px-4 py-20 text-center"
                  >
                    <Filter
                      size={36}
                      className="text-steel-200 mx-auto mb-3"
                    />
                    <p className="text-sm font-medium text-steel-600">
                      没有匹配的承诺记录
                    </p>
                    <p className="text-xs text-steel-400 mt-1">
                      尝试调整筛选条件或重置
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((cmt, idx) => (
                  <TableRow
                    key={cmt.id}
                    commitment={cmt}
                    orders={orders}
                    view={currentView}
                    index={idx}
                    onExportAudit={() => handleExportAudit(cmt)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-[11px] font-bold text-steel-600 uppercase tracking-wider whitespace-nowrap",
        "border-b border-steel-200 bg-white/40",
        className
      )}
    >
      {children}
    </th>
  );
}

function SortArrow({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  return (
    <span
      className={cn(
        "text-steel-300 text-[10px] leading-none transition-colors",
        active && "text-steel-600"
      )}
    >
      {active ? (dir === "asc" ? "▲" : "▼") : "⇅"}
    </span>
  );
}

function TableRow({
  commitment,
  orders,
  view,
  index,
  onExportAudit,
}: {
  commitment: Commitment;
  orders: { id: string; orderNo: string }[];
  view: ViewType;
  index: number;
  onExportAudit: () => void;
}) {
  const linkedOrders = commitment.linkedOrderIds
    .map((oid) => orders.find((o) => o.id === oid))
    .filter(Boolean) as { id: string; orderNo: string }[];

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(index * 0.01, 0.3) }}
      className={cn(
        "zebra-row transition-colors group",
        commitment.status === "rejected" && "opacity-50"
      )}
    >
      <td className="table-td font-mono text-xs text-steel-500 whitespace-nowrap">
        {new Date(commitment.createdAt).toLocaleDateString("zh-CN")}
      </td>
      <td className="table-td">
        <span className="text-sm font-semibold text-steel-800">
          {commitment.supplierName}
        </span>
      </td>
      <td className="table-td">
        <span className="inline-flex items-center gap-1.5 font-mono text-sm">
          {commitment.deliveryDate.value || "-"}
          {view === "procurement" &&
            commitment.deliveryDate.confidence !== "high" && (
              <ConfidenceBadge
                confidence={commitment.deliveryDate.confidence}
                size="sm"
                showIcon={false}
              />
            )}
        </span>
      </td>
      <td className="table-td text-right font-mono text-sm text-steel-800">
        {commitment.quantity.value !== null
          ? commitment.quantity.value.toLocaleString()
          : "-"}
      </td>
      <td className="table-td text-right font-mono text-sm text-steel-800">
        {commitment.price.value === null
          ? "按上次"
          : `¥${commitment.price.value.toLocaleString()}`}
      </td>
      {view === "procurement" && (
        <td className="table-td">
          <ConfidenceBadge
            confidence={commitment.deliveryDate.confidence}
            size="sm"
          />
        </td>
      )}
      {view === "procurement" && (
        <td className="table-td">
          <ConfidenceBadge
            confidence={commitment.price.confidence}
            size="sm"
          />
        </td>
      )}
      <td className="table-td">
        {commitment.alternativeMaterials.value?.length ? (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {commitment.alternativeMaterials.value.map((m, i) => (
              <span
                key={i}
                className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700 text-[11px] ring-1 ring-inset ring-violet-200"
              >
                {m.length > 12 ? m.slice(0, 12) + "…" : m}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-steel-300">—</span>
        )}
      </td>
      <td className="table-td">
        <span
          className={cn(
            "badge ring-1 ring-inset",
            commitment.status === "pending" &&
              "bg-amber-50 text-amber-700 ring-amber-200",
            commitment.status === "confirmed" &&
              "bg-emerald-50 text-emerald-700 ring-emerald-200",
            commitment.status === "rejected" &&
              "bg-steel-100 text-steel-500 ring-steel-200"
          )}
        >
          {STATUS_LABELS[commitment.status]}
        </span>
      </td>
      <td className="table-td">
        {linkedOrders.length > 0 ? (
          <div className="flex flex-wrap gap-1 max-w-[180px]">
            {linkedOrders.map((o) => (
              <span
                key={o.id}
                className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 text-[11px] font-mono font-medium ring-1 ring-inset ring-sky-200"
              >
                {o.orderNo}
              </span>
            ))}
          </div>
        ) : (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11px]",
              commitment.status === "confirmed"
                ? "text-red-500 animate-pulse-soft"
                : "text-steel-300"
            )}
          >
            {commitment.status === "confirmed" ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                未关联
              </>
            ) : (
              "—"
            )}
          </span>
        )}
      </td>
      {view === "procurement" && (
        <td className="table-td text-xs text-steel-600 whitespace-nowrap">
          {commitment.confirmedBy || "-"}
          {commitment.confirmedAt && (
            <span className="text-steel-400 block text-[10px]">
              {new Date(commitment.confirmedAt).toLocaleDateString("zh-CN")}
            </span>
          )}
        </td>
      )}
      {view === "procurement" && (
        <td className="table-td">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onExportAudit}
              className="p-1.5 rounded-lg hover:bg-steel-100 text-steel-500 hover:text-steel-700 transition-colors"
              title="导出证据清单"
            >
              <Eye size={14} />
            </button>
          </div>
        </td>
      )}
    </motion.tr>
  );
}
