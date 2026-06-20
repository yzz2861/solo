import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Search,
  Package2,
  Link2,
  Check,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { useOrderStore } from "@/stores/orderStore";
import { useCommitmentStore } from "@/stores/commitmentStore";
import { useEmailStore } from "@/stores/emailStore";
import type { Order } from "@/types";
import { ORDER_STATUS_LABELS } from "@/types";

interface OrderLinkModalProps {
  commitmentId: string;
  currentSupplierId: string;
  currentLinkedIds: string[];
}

export default function OrderLinkModal({
  commitmentId,
  currentSupplierId,
  currentLinkedIds,
}: OrderLinkModalProps) {
  const { orderLinkModalOpen, setOrderLinkModalOpen, showToast } = useUIStore();
  const {
    searchQuery,
    filterStatus,
    filterSupplier,
    setSearchQuery,
    setFilterStatus,
    setFilterSupplier,
    getFilteredOrders,
    linkCommitment,
    unlinkCommitment,
  } = useOrderStore();
  const { linkOrders } = useCommitmentStore();
  const { suppliers } = useEmailStore();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (orderLinkModalOpen) {
      setSelectedIds(new Set(currentLinkedIds));
      setFilterSupplier(currentSupplierId);
    }
  }, [orderLinkModalOpen, currentLinkedIds, currentSupplierId, setFilterSupplier]);

  const filtered = getFilteredOrders();

  const toggleSelect = (orderId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const handleConfirm = () => {
    const newIds = Array.from(selectedIds);
    const toRemove = currentLinkedIds.filter((id) => !selectedIds.has(id));
    const toAdd = newIds.filter((id) => !currentLinkedIds.includes(id));

    linkOrders(commitmentId, newIds);

    toAdd.forEach((oid) => linkCommitment(oid, commitmentId));
    toRemove.forEach((oid) => unlinkCommitment(oid, commitmentId));

    showToast(
      "success",
      `已关联 ${toAdd.length} 个订单，取消 ${toRemove.length} 个关联`
    );
    setOrderLinkModalOpen(false);
  };

  if (!orderLinkModalOpen) return null;

  const availableOrders = filtered.filter(
    (o) =>
      !o.linkedCommitmentIds.length ||
      o.linkedCommitmentIds.includes(commitmentId)
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setOrderLinkModalOpen(false)}
        className="fixed inset-0 bg-steel-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          <header className="px-6 py-4 border-b border-steel-100 bg-gradient-to-r from-steel-50 to-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
                <Link2 size={18} />
              </div>
              <div>
                <h2 className="font-serif text-lg font-semibold text-steel-900">
                  关联订单
                </h2>
                <p className="text-xs text-steel-500 mt-0.5">
                  为该承诺选择对应的采购订单
                </p>
              </div>
            </div>
            <button
              onClick={() => setOrderLinkModalOpen(false)}
              className="p-2 rounded-xl hover:bg-steel-100 text-steel-500 hover:text-steel-700 transition-colors"
            >
              <X size={18} />
            </button>
          </header>

          <div className="px-6 py-3 border-b border-steel-100 space-y-3 bg-white">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索订单号、物料名称、编码..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-steel-50/60 border border-transparent text-sm focus:bg-white focus:border-steel-200 focus:ring-2 focus:ring-steel-700/10 transition-all outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-steel-50 text-sm">
                  <Filter size={14} className="text-steel-400" />
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
                  className="px-3 py-2 rounded-xl bg-steel-50 text-sm outline-none text-steel-700 border border-transparent focus:bg-white focus:border-steel-200 transition-colors"
                >
                  <option value="all">全部状态</option>
                  <option value="pending">待交付</option>
                  <option value="partial">部分交付</option>
                  <option value="completed">已完成</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-steel-500">
              <span>
                共 {availableOrders.length} 个候选订单 · 已选{" "}
                <span className="font-semibold text-steel-700">
                  {selectedIds.size}
                </span>{" "}
                个
              </span>
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-steel-500 hover:text-steel-700 font-medium"
                >
                  清空选择
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {availableOrders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-steel-50 flex items-center justify-center mb-4">
                  <Package2 size={28} className="text-steel-300" />
                </div>
                <p className="text-steel-600 font-medium">没有找到匹配的订单</p>
                <p className="text-sm text-steel-400 mt-1">
                  尝试调整筛选条件或清空搜索关键词
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-steel-50/95 backdrop-blur-sm z-10">
                  <tr>
                    <th className="table-th w-12"></th>
                    <th className="table-th">订单号</th>
                    <th className="table-th">物料</th>
                    <th className="table-th text-right">数量</th>
                    <th className="table-th text-right">金额</th>
                    <th className="table-th">交期</th>
                    <th className="table-th">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {availableOrders.map((order, idx) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      selected={selectedIds.has(order.id)}
                      onToggle={() => toggleSelect(order.id)}
                      isCurrentLinked={currentLinkedIds.includes(order.id)}
                      animationDelay={idx * 0.02}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <footer className="px-6 py-4 border-t border-steel-100 bg-gradient-to-r from-white to-steel-50 flex items-center justify-between">
            <div className="text-xs text-steel-500">
              <span className="inline-flex items-center gap-1.5 mr-4">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                原关联 {currentLinkedIds.length} 个
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                新关联 {selectedIds.size} 个
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOrderLinkModalOpen(false)}
                className="btn-secondary text-sm"
              >
                取消
              </button>
              <button onClick={handleConfirm} className="btn-primary text-sm">
                <Check size={15} />
                确认关联
              </button>
            </div>
          </footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function OrderRow({
  order,
  selected,
  onToggle,
  isCurrentLinked,
  animationDelay,
}: {
  order: Order;
  selected: boolean;
  onToggle: () => void;
  isCurrentLinked: boolean;
  animationDelay: number;
}) {
  const statusBadgeClass =
    order.status === "completed"
      ? "badge-high"
      : order.status === "partial"
      ? "badge-medium"
      : "badge bg-steel-100 text-steel-600 ring-1 ring-inset ring-steel-200";

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: animationDelay }}
      onClick={onToggle}
      className={cn(
        "zebra-row cursor-pointer transition-colors",
        selected && "bg-indigo-50/80 hover:bg-indigo-50"
      )}
    >
      <td className="table-td">
        <div
          className={cn(
            "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
            selected
              ? "bg-indigo-600 border-indigo-600"
              : "border-steel-300 bg-white hover:border-steel-400"
          )}
        >
          {selected && (
            <motion.svg
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-3.5 h-3.5 text-white"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </motion.svg>
          )}
        </div>
      </td>
      <td className="table-td">
        <span className="font-mono text-sm font-medium text-steel-800">
          {order.orderNo}
        </span>
        {isCurrentLinked && !selected && (
          <span className="ml-2 badge bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-200">
            原关联
          </span>
        )}
      </td>
      <td className="table-td">
        <p className="font-medium text-steel-800 leading-tight">
          {order.materialName}
        </p>
        <p className="text-[11px] text-steel-400 font-mono mt-0.5">
          {order.materialCode}
        </p>
      </td>
      <td className="table-td text-right font-mono text-steel-800">
        {order.quantity.toLocaleString()}
      </td>
      <td className="table-td text-right font-mono font-medium text-steel-800">
        ¥{order.totalAmount.toLocaleString()}
      </td>
      <td className="table-td font-mono text-sm text-steel-600">
        {order.expectedDelivery}
      </td>
      <td className="table-td">
        <span className={statusBadgeClass}>{ORDER_STATUS_LABELS[order.status]}</span>
        {order.linkedCommitmentIds.length > 0 && (
          <span className="ml-1.5 text-[11px] text-steel-400">
            ({order.linkedCommitmentIds.length}承诺)
          </span>
        )}
      </td>
    </motion.tr>
  );
}
