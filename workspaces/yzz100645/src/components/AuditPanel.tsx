import { AnimatePresence, motion } from "framer-motion";
import { X, Clock, User, FileEdit } from "lucide-react";
import type { AuditLog } from "@/types";
import { FIELD_LABELS } from "@/types";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";

interface AuditPanelProps {
  auditLogs: AuditLog[];
  commitmentId: string;
}

const fmtValue = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "(空)";
  if (Array.isArray(v)) return v.length ? v.join("、") : "(空)";
  return String(v);
};

const getFieldColor = (field: string) => {
  const map: Record<string, string> = {
    deliveryDate: "bg-emerald-500",
    quantity: "bg-sky-500",
    price: "bg-amber-500",
    alternativeMaterials: "bg-violet-500",
    additionalTerms: "bg-rose-500",
    status: "bg-steel-600",
    linkedOrderIds: "bg-indigo-500",
    general: "bg-steel-400",
  };
  return map[field] || "bg-steel-400";
};

export default function AuditPanel({ auditLogs, commitmentId }: AuditPanelProps) {
  const { auditPanelOpen, toggleAuditPanel } = useUIStore();

  return (
    <AnimatePresence>
      {auditPanelOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => toggleAuditPanel(false)}
            className="fixed inset-0 bg-steel-900/20 backdrop-blur-sm z-40"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-full w-[420px] max-w-[90vw] bg-gradient-to-b from-white to-steel-50 border-l border-steel-100 shadow-2xl z-50 flex flex-col"
          >
            <header className="h-16 px-6 flex items-center justify-between border-b border-steel-100 bg-white/80 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-steel-700 flex items-center justify-center text-white shadow-md shadow-steel-700/20">
                  <FileEdit size={18} />
                </div>
                <div>
                  <h2 className="font-serif text-base font-semibold text-steel-900">
                    修正历史
                  </h2>
                  <p className="text-xs text-steel-500 mt-0.5">
                    共 {auditLogs.length} 条记录
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggleAuditPanel(false)}
                className="p-2 rounded-xl hover:bg-steel-100 text-steel-500 hover:text-steel-700 transition-colors"
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
              {auditLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-steel-50 flex items-center justify-center mb-4">
                    <FileEdit size={28} className="text-steel-300" />
                  </div>
                  <p className="text-steel-600 font-medium">暂无修正记录</p>
                  <p className="text-sm text-steel-400 mt-1">
                    当您对抽取结果进行修改或确认时，
                    <br />
                    操作记录会显示在这里。
                  </p>
                </div>
              ) : (
                <ol className="relative pl-7 space-y-5">
                  <div className="absolute left-[13px] top-2 bottom-2 w-px bg-gradient-to-b from-steel-200 via-steel-200 to-transparent" />
                  {auditLogs.map((log, idx) => (
                    <motion.li
                      key={log.id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="relative"
                    >
                      <div
                        className={cn(
                          "timeline-dot",
                          getFieldColor(log.fieldChanged)
                        )}
                      />
                      <div className="glass-card p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold",
                              log.fieldChanged === "status"
                                ? "bg-steel-700 text-white"
                                : log.fieldChanged === "linkedOrderIds"
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-steel-100 text-steel-700"
                            )}
                          >
                            {FIELD_LABELS[log.fieldChanged] ||
                              log.fieldChanged}
                          </span>
                          <div className="flex items-center gap-1 text-[11px] text-steel-500">
                            <Clock size={11} />
                            {new Date(log.timestamp).toLocaleString("zh-CN", {
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-2.5">
                          <div className="p-2 rounded-lg bg-red-50/60 border border-red-100">
                            <p className="text-[10px] font-medium text-red-600 uppercase tracking-wide mb-1">
                              旧值
                            </p>
                            <p className="text-xs text-red-800 break-all line-clamp-2">
                              {fmtValue(log.oldValue)}
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
                            <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wide mb-1">
                              新值
                            </p>
                            <p className="text-xs text-emerald-800 break-all line-clamp-2">
                              {fmtValue(log.newValue)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-dashed border-steel-100">
                          <div className="w-5 h-5 rounded-md bg-steel-700 flex items-center justify-center text-white text-[10px] font-semibold">
                            {log.operatorName.slice(0, 1)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-steel-700 truncate flex items-center gap-1.5">
                              <User size={11} className="text-steel-400" />
                              {log.operatorName}
                            </p>
                            {log.note && (
                              <p className="text-[11px] text-steel-500 mt-0.5 leading-relaxed">
                                💬 {log.note}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </ol>
              )}
            </div>

            <div className="px-6 py-3 border-t border-steel-100 bg-white/60 text-[11px] text-steel-400 flex items-center justify-between">
              <span>承诺ID: {commitmentId}</span>
              <span>不可删除，仅作追溯</span>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
