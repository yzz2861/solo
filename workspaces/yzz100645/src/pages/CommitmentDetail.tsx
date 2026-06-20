import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  Package,
  BadgeDollarSign,
  RefreshCcw,
  FileText,
  CheckCircle2,
  XCircle,
  FileEdit,
  Link2,
  Link2Off,
  Unlink,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCommitmentStore } from "@/stores/commitmentStore";
import { useEmailStore } from "@/stores/emailStore";
import { useOrderStore } from "@/stores/orderStore";
import { useUIStore } from "@/stores/uiStore";
import type { ExtractFieldKey, ExtractedField } from "@/types";
import { EXTRACT_FIELD_LABELS, EXTRACT_FIELD_KEYS, STATUS_LABELS } from "@/types";
import FieldCard from "@/components/FieldCard";
import EmailPreview from "@/components/EmailPreview";
import AuditPanel from "@/components/AuditPanel";
import FieldEditModal from "@/components/FieldEditModal";
import OrderLinkModal from "@/components/OrderLinkModal";
import ConfidenceBadge, { ReasonTagList } from "@/components/ConfidenceBadge";

export default function CommitmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const commitment = useCommitmentStore((s) =>
    id ? s.getCommitmentById(id) : undefined
  );
  const email = useEmailStore((s) =>
    commitment ? s.getEmailById(commitment.emailId) : undefined
  );
  const orders = useOrderStore((s) => s.orders);
  const {
    updateField,
    confirmCommitment,
    rejectCommitment,
    unlinkOrder: unlinkOrderFromCommitment,
  } = useCommitmentStore();
  const { unlinkCommitment } = useOrderStore();
  const {
    editingField,
    setEditingField,
    toggleAuditPanel,
    setOrderLinkModalOpen,
    showToast,
  } = useUIStore();

  useEffect(() => {
    if (!commitment && id) {
      showToast("error", "未找到该承诺记录");
      navigate("/commitments/pending", { replace: true });
    }
  }, [commitment, id, navigate, showToast]);

  if (!commitment) return null;

  const linkedOrders = commitment.linkedOrderIds
    .map((oid) => orders.find((o) => o.id === oid))
    .filter(Boolean) as NonNullable<ReturnType<typeof orders.find>>[];

  const handleFieldEdit = (key: ExtractFieldKey) => {
    setEditingField(key);
  };

  const handleFieldConfirm = (newValue: unknown, note?: string) => {
    if (!editingField) return;
    updateField(commitment.id, editingField, newValue, note);
    showToast("success", `${EXTRACT_FIELD_LABELS[editingField]} 已更新`);
  };

  const evidenceRanges = EXTRACT_FIELD_KEYS.map((key) => {
    const field = commitment[key] as ExtractedField<unknown>;
    if (!field.evidenceRange || (field.evidenceRange[0] === 0 && field.evidenceRange[1] === 0))
      return null;
    const classNameMap: Record<ExtractFieldKey, string> = {
      deliveryDate: "evidence-highlight-delivery",
      quantity: "evidence-highlight-quantity",
      price: "evidence-highlight-price",
      alternativeMaterials: "evidence-highlight-alternative",
      additionalTerms: "evidence-highlight-terms",
    };
    return {
      range: field.evidenceRange,
      className: classNameMap[key],
      label: EXTRACT_FIELD_LABELS[key],
    };
  }).filter(Boolean) as { range: [number, number]; className: string; label: string }[];

  const currentFieldForModal = (() => {
    if (!editingField) return null;
    return commitment[editingField] as ExtractedField<unknown>;
  })();

  return (
    <div className="min-h-screen bg-steel-50/30">
      <div className="max-w-[1600px] mx-auto">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-steel-100 px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-xl hover:bg-steel-50 text-steel-500 hover:text-steel-700 transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-0.5">
                  <h1 className="font-serif text-lg font-semibold text-steel-900 truncate">
                    {commitment.supplierName}
                  </h1>
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
                </div>
                <p className="text-xs text-steel-500 truncate">
                  {email?.subject || "承诺ID: " + commitment.id}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => toggleAuditPanel(true)}
                className="btn-secondary text-sm"
              >
                <FileEdit size={15} />
                修正历史
                {commitment.auditLogs.length > 0 && (
                  <span className="ml-0.5 text-xs text-steel-500">
                    ({commitment.auditLogs.length})
                  </span>
                )}
              </button>

              {commitment.status === "pending" && (
                <>
                  <button
                    onClick={() => {
                      rejectCommitment(commitment.id, "驳回重抽");
                      showToast("info", "已驳回该承诺");
                    }}
                    className="btn-danger text-sm"
                  >
                    <XCircle size={15} />
                    驳回
                  </button>
                  <button
                    onClick={() => {
                      confirmCommitment(commitment.id);
                      showToast("success", "承诺已确认");
                    }}
                    className="btn-primary text-sm"
                  >
                    <CheckCircle2 size={15} />
                    确认承诺
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 p-6">
          <div className="xl:col-span-3 space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card gradient-border p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="h2-section flex items-center gap-2">
                  <Eye size={18} className="text-steel-600" />
                  抽取结果
                </h2>
                <div className="flex items-center gap-2 text-[11px] text-steel-500">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-md bg-emerald-200" />
                    交期
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-md bg-sky-200" />
                    数量
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-md bg-amber-200" />
                    价格
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-md bg-violet-200" />
                    替代料
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-md bg-rose-200" />
                    附加条件
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldCard<string>
                  fieldKey="deliveryDate"
                  field={commitment.deliveryDate}
                  valueRender={(v) =>
                    v ? (
                      <span className="font-mono">{v}</span>
                    ) : (
                      <span>未抽取</span>
                    )
                  }
                  onEdit={() => handleFieldEdit("deliveryDate")}
                  animationDelay={0}
                />
                <FieldCard<number>
                  fieldKey="quantity"
                  field={commitment.quantity}
                  valueRender={(v) =>
                    v !== null ? (
                      <span className="font-mono">{v.toLocaleString()}</span>
                    ) : (
                      <span>未抽取</span>
                    )
                  }
                  onEdit={() => handleFieldEdit("quantity")}
                  animationDelay={0.05}
                />
                <FieldCard<number>
                  fieldKey="price"
                  field={commitment.price}
                  valueRender={(v) =>
                    v === null ? (
                      <span>按上次</span>
                    ) : (
                      <span className="font-mono">¥{v.toLocaleString()}</span>
                    )
                  }
                  onEdit={() => handleFieldEdit("price")}
                  animationDelay={0.1}
                />
                <FieldCard<string[]>
                  fieldKey="alternativeMaterials"
                  field={commitment.alternativeMaterials}
                  valueRender={(v) =>
                    v && v.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {v.map((item, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/70 text-violet-700 text-sm ring-1 ring-inset ring-violet-200"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span>无替代料</span>
                    )
                  }
                  onEdit={() => handleFieldEdit("alternativeMaterials")}
                  animationDelay={0.15}
                />
                <div className="md:col-span-2">
                  <FieldCard<string>
                    fieldKey="additionalTerms"
                    field={commitment.additionalTerms}
                    valueRender={(v) =>
                      v ? (
                        <span className="text-base leading-relaxed">
                          {v}
                        </span>
                      ) : (
                        <span>无附加条件</span>
                      )
                    }
                    onEdit={() => handleFieldEdit("additionalTerms")}
                    animationDelay={0.2}
                    compact
                  />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="glass-card gradient-border p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="h2-section flex items-center gap-2">
                  <Link2 size={18} className="text-indigo-600" />
                  关联订单
                </h2>
                <button
                  onClick={() => setOrderLinkModalOpen(true)}
                  className="btn-secondary text-sm"
                >
                  <Link2 size={14} />
                  {linkedOrders.length > 0 ? "调整关联" : "关联订单"}
                </button>
              </div>

              {linkedOrders.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
                    <Link2Off
                      size={26}
                      className="text-amber-500"
                    />
                  </div>
                  <p className="text-sm font-medium text-steel-700">
                    尚未关联订单
                  </p>
                  <p className="text-xs text-steel-500 mt-1">
                    {commitment.status === "confirmed"
                      ? "请尽快关联对应订单，便于计划员跟进交付"
                      : "确认承诺后可关联订单"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {linkedOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-sky-50/50 border border-sky-100"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono font-semibold text-sky-800">
                            {order.orderNo}
                          </span>
                          <span
                            className={cn(
                              "badge ring-1 ring-inset",
                              order.status === "pending" &&
                                "bg-steel-100 text-steel-600 ring-steel-200",
                              order.status === "partial" &&
                                "bg-amber-50 text-amber-700 ring-amber-200",
                              order.status === "completed" &&
                                "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            )}
                          >
                            {order.status === "pending"
                              ? "待交付"
                              : order.status === "partial"
                              ? "部分交付"
                              : "已完成"}
                          </span>
                        </div>
                        <p className="text-xs text-steel-600 truncate">
                          {order.materialName}
                          <span className="text-steel-400 mx-1">·</span>
                          数量 {order.quantity.toLocaleString()}
                          <span className="text-steel-400 mx-1">·</span>
                          金额 ¥{order.totalAmount.toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          unlinkOrderFromCommitment(commitment.id, order.id);
                          unlinkCommitment(order.id, commitment.id);
                          showToast("info", "已取消关联");
                        }}
                        className="p-1.5 rounded-lg text-steel-400 hover:bg-white hover:text-red-500 transition-colors"
                        title="取消关联"
                      >
                        <Unlink size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {email && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-xs font-semibold text-steel-600 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
                  <span className="w-1 h-4 rounded bg-steel-300" />
                  邮件原文（证据句高亮）
                </h3>
                <EmailPreview email={email} evidenceRanges={evidenceRanges} />
              </motion.div>
            )}
          </div>

          <div className="xl:col-span-2 space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card gradient-border p-5"
            >
              <h2 className="h3-card mb-4 flex items-center gap-2">
                <CalendarDays size={15} className="text-steel-500" />
                置信度评估
              </h2>
              <ConfidenceAssessment commitment={commitment} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card gradient-border p-5"
            >
              <h2 className="h3-card mb-4 flex items-center gap-2">
                <FileEdit size={15} className="text-steel-500" />
                操作记录
              </h2>
              <div className="space-y-3 max-h-[360px] overflow-y-auto scrollbar-thin pr-1">
                {commitment.auditLogs.length === 0 ? (
                  <div className="py-8 text-center">
                    <FileText
                      size={32}
                      className="text-steel-200 mx-auto mb-2"
                    />
                    <p className="text-xs text-steel-400">
                      尚未有任何操作记录
                    </p>
                  </div>
                ) : (
                  commitment.auditLogs
                    .slice()
                    .reverse()
                    .map((log, idx) => (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="flex items-start gap-3 p-3 rounded-xl bg-steel-50/70 border border-steel-100"
                      >
                        <div className="w-7 h-7 rounded-lg bg-steel-700 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                          {log.operatorName.slice(0, 1)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-semibold text-steel-700">
                              {log.operatorName}
                            </span>
                            <span className="text-[10px] text-steel-400">
                              {new Date(log.timestamp).toLocaleString("zh-CN", {
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-steel-600">
                            修改了{" "}
                            <span className="font-medium text-steel-800">
                              {EXTRACT_FIELD_LABELS[
                                log.fieldChanged as ExtractFieldKey
                              ] || log.fieldChanged}
                            </span>
                          </p>
                          {log.note && (
                            <p className="text-[11px] text-steel-500 mt-1 italic">
                              💬 {log.note}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <AuditPanel
        auditLogs={commitment.auditLogs}
        commitmentId={commitment.id}
      />
      <FieldEditModal
        fieldKey={editingField}
        field={currentFieldForModal}
        onConfirm={handleFieldConfirm}
      />
      <OrderLinkModal
        commitmentId={commitment.id}
        currentSupplierId={commitment.supplierId}
        currentLinkedIds={commitment.linkedOrderIds}
      />
    </div>
  );
}

function ConfidenceAssessment({
  commitment,
}: {
  commitment: ReturnType<typeof useCommitmentStore.getState>["commitments"][number];
}) {
  const items = [
    {
      key: "deliveryDate" as const,
      label: "交期",
      icon: CalendarDays,
      data: commitment.deliveryDate,
    },
    {
      key: "quantity" as const,
      label: "数量",
      icon: Package,
      data: commitment.quantity,
    },
    {
      key: "price" as const,
      label: "价格",
      icon: BadgeDollarSign,
      data: commitment.price,
    },
    {
      key: "alternativeMaterials" as const,
      label: "替代料",
      icon: RefreshCcw,
      data: commitment.alternativeMaterials,
    },
    {
      key: "additionalTerms" as const,
      label: "附加条件",
      icon: FileText,
      data: commitment.additionalTerms,
    },
  ];

  const lowItems = items.filter((i) => i.data.confidence === "low").length;
  const mediumItems = items.filter((i) => i.data.confidence === "medium").length;
  const highItems = items.filter((i) => i.data.confidence === "high").length;
  const total = items.length;
  const score = Math.round(
    (highItems * 100 + mediumItems * 60 + lowItems * 20) / total
  );

  return (
    <>
      <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-steel-50 to-white border border-steel-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-steel-500 mb-0.5">整体置信度</p>
            <p
              className={cn(
                "font-mono text-3xl font-bold",
                score >= 80
                  ? "text-emerald-600"
                  : score >= 50
                  ? "text-amber-600"
                  : "text-red-600"
              )}
            >
              {score}
              <span className="text-sm font-medium text-steel-400 ml-1">
                / 100
              </span>
            </p>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <span className="text-[11px] text-emerald-600 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              高 {highItems}
            </span>
            <span className="text-[11px] text-amber-600 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              中 {mediumItems}
            </span>
            <span className="text-[11px] text-red-600 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              低 {lowItems}
            </span>
          </div>
        </div>
        <div className="flex gap-1">
          {items.map((item) => (
            <div
              key={item.key}
              className={cn(
                "flex-1 h-2 rounded-full",
                item.data.confidence === "high" && "bg-emerald-500",
                item.data.confidence === "medium" && "bg-amber-500",
                item.data.confidence === "low" && "bg-red-500"
              )}
              title={`${item.label}: ${item.data.confidence}`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        {items.map((item, idx) => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
            className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-steel-50 transition-colors"
          >
            <item.icon size={14} className="text-steel-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-medium text-steel-700">
                  {item.label}
                </span>
                <ConfidenceBadge
                  confidence={item.data.confidence}
                  size="sm"
                  reasons={item.data.reasons}
                />
              </div>
              <ReasonTagList reasons={item.data.reasons} />
            </div>
          </motion.div>
        ))}
      </div>
    </>
  );
}
