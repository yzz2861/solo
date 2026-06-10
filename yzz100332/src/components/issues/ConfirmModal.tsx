import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import {
  X,
  ShieldCheck,
  Fingerprint,
  AlertCircle,
  AlertTriangle,
  Info,
  ArrowLeftCircle,
  ChevronDown,
  ChevronRight,
  FileCheck2,
} from "lucide-react";
import type { ValidationIssue } from "@/types";

export default function ConfirmModal() {
  const open = useAppStore((s) => s.confirmModalOpen);
  const setOpen = useAppStore((s) => s.setConfirmModalOpen);
  const tags = useAppStore((s) => s.tags);
  const issues = useAppStore((s) => s.issues);
  const currentOperator = useAppStore((s) => s.currentOperator);
  const submitConfirm = useAppStore((s) => s.submitConfirm);
  const rejectConfirm = useAppStore((s) => s.rejectConfirm);

  const [password, setPassword] = useState("");
  const [checked, setChecked] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [err, setErr] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const draftTags = tags.filter((t) => t.status === "draft");
  const confirmedTags = tags.filter((t) => t.status === "confirmed");
  const printedTags = tags.filter((t) => t.status === "printed");

  const draftTagIds = new Set(draftTags.map((t) => t.id));
  const draftIssues = issues.filter((i) => draftTagIds.has(i.tagId));

  const errors = draftIssues.filter((i) => i.level === "error");
  const warnings = draftIssues.filter((i) => i.level === "warning");
  const infos = draftIssues.filter((i) => i.level === "info");

  const byType: Record<ValidationIssue["type"], ValidationIssue[]> = {
    empty: draftIssues.filter((i) => i.type === "empty"),
    duplicate: draftIssues.filter((i) => i.type === "duplicate"),
    price: draftIssues.filter((i) => i.type === "price"),
    promotion: draftIssues.filter((i) => i.type === "promotion"),
  };

  function close() {
    setPassword("");
    setChecked(false);
    setRejectOpen(false);
    setRejectReason("");
    setErr("");
    setOpen(false);
  }

  function handleConfirm() {
    if (!checked) {
      setErr("请先勾选确认");
      return;
    }
    if (password.length < 6) {
      setErr("请输入 6 位老板确认密码");
      return;
    }
    const res = submitConfirm(password);
    if (!res.ok) {
      setErr(res.message);
    } else {
      close();
    }
  }

  function handleReject() {
    if (!rejectReason.trim()) {
      setErr("请填写驳回原因");
      return;
    }
    rejectConfirm(rejectReason.trim());
    close();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 no-print">
      <div className="w-[820px] max-w-full max-h-[90vh] bg-white rounded-2xl shadow-2xl border-2 border-brand-500/15 overflow-hidden flex flex-col animate-[tag-in_0.35s_ease-out]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-brand-500/5 to-warn/5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-warn to-warn-dark flex items-center justify-center text-white shadow-warn/30 shadow-lg">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="font-display text-2xl text-brand-500 leading-tight">
                老板确认 · 异常汇总
              </h2>
              <p className="text-xs text-ink-light">
                请核查以下异常后，输入密码确认准许打印
              </p>
            </div>
          </div>
          <button
            onClick={close}
            className="p-2 rounded-lg hover:bg-gray-100 text-ink-light"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 px-6 pt-4">
          <Stat color="danger" label="错误 (必须处理)" count={errors.length} />
          <Stat color="warn" label="警告 (建议检查)" count={warnings.length} />
          <Stat color="info" label="提示" count={infos.length} />
          <Stat color="success" label="可正常打印" count={draftTags.length - (errors.length > 0 ? 0 : 0)} sub={`共 ${draftTags.length} 条草稿`} />
        </div>

        <div className="grid grid-cols-4 gap-3 px-6 pb-4 mt-2 text-xs">
          <MiniCard label="草稿" value={draftTags.length} tone="text-gray-500" />
          <MiniCard label="待打印" value={confirmedTags.length} tone="text-warn-dark" />
          <MiniCard label="已打印" value={printedTags.length} tone="text-success-dark" />
          <MiniCard label="操作人" value={currentOperator || "未设置"} tone="text-brand-500" />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-2 min-h-[200px]">
          {draftTags.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-ink-light text-sm">
              当前没有草稿，全部已确认
            </div>
          ) : draftIssues.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <div className="text-center space-y-2 text-success-dark">
                <FileCheck2 size={36} className="mx-auto opacity-70" />
                <p className="font-display text-lg">🎉 全部校验通过，没有异常！</p>
                <p className="text-xs opacity-70">输入密码确认即可进入打印队列</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {(Object.keys(byType) as ValidationIssue["type"][]).map((k) => {
                if (byType[k].length === 0) return null;
                const TITLES: Record<string, string> = {
                  empty: "📝 空值类（产地/等级/价格必填）",
                  duplicate: "🔁 重复类（同规格重复出现）",
                  price: "💰 价格互算校验（斤价×箱规×折扣≈箱价）",
                  promotion: "📅 促销时段（日期顺序与过期）",
                };
                const group = byType[k];
                const isCol = collapsed[k];
                return (
                  <div
                    key={k}
                    className="border rounded-xl border-brand-500/10 overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setCollapsed((s) => ({ ...s, [k]: !s[k] }))
                      }
                      className="flex items-center w-full px-4 py-2.5 bg-brand-500/4 text-left hover:bg-brand-500/8 transition-colors"
                    >
                      {isCol ? (
                        <ChevronRight size={14} className="text-brand-400 mr-1" />
                      ) : (
                        <ChevronDown size={14} className="text-brand-400 mr-1" />
                      )}
                      <span className="font-semibold text-sm text-brand-500">
                        {TITLES[k]}
                      </span>
                      <span className="ml-2 text-xs px-2 py-0.5 rounded bg-white text-ink-light">
                        {group.length} 项
                      </span>
                    </button>
                    {!isCol && (
                      <ul className="divide-y divide-brand-500/5">
                        {group.map((i, idx) => {
                          const tag = tags.find((t) => t.id === i.tagId);
                          const ToneIcon =
                            i.level === "error"
                              ? AlertCircle
                              : i.level === "warning"
                              ? AlertTriangle
                              : Info;
                          const toneColor =
                            i.level === "error"
                              ? "text-danger"
                              : i.level === "warning"
                              ? "text-warn"
                              : "text-blue-500";
                          return (
                            <li
                              key={idx}
                              className="flex items-start gap-3 px-4 py-2.5 text-sm hover:bg-brand-500/3"
                            >
                              <ToneIcon size={15} className={`mt-0.5 ${toneColor}`} />
                              <div className="flex-1 min-w-0">
                                <div className="text-ink">{i.message}</div>
                                <div className="text-[11px] text-ink-light mt-0.5 font-mono">
                                  {tag?.category}｜{tag?.name || "(无品名)"}｜
                                  {tag?.origin || "(无产地)"}｜{tag?.grade || "-"}｜
                                  {tag?.boxSpec}斤
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {rejectOpen ? (
          <div className="px-6 py-4 border-t border-gray-100 bg-warn/5">
            <label className="text-xs text-warn-dark font-semibold block mb-1.5">
              驳回原因（店员将看到）：
            </label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border-2 border-warn/30 text-sm focus:outline-none focus:border-warn resize-none h-20"
              placeholder="例如：蓝莓产地改为云南，等级 AAA"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            {err && (
              <div className="text-xs text-danger mt-1.5 font-medium">{err}</div>
            )}
            <div className="flex gap-2 mt-3">
              <button
                className="btn-ghost !text-warn-dark !border-warn/30 !bg-warn/10"
                onClick={() => {
                  setRejectOpen(false);
                  setErr("");
                }}
              >
                取消
              </button>
              <button className="btn-danger ml-auto" onClick={handleReject}>
                确认驳回并退回编辑
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <label className="flex items-start gap-2.5 text-xs text-ink cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-brand-500"
              />
              <span>
                <b className="text-brand-500">我已核实全部异常情况。</b>
                存在的错误或信息偏差已与当值店员口头确认，准许以上价签进入打印程序。
                后续客诉/法务风险由确认人承担。
              </span>
            </label>

            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2">
                <Fingerprint className="text-brand-500" size={18} />
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="输入 6 位老板确认密码（默认 888888）"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfirm();
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg border-2 border-brand-500/20 focus:border-brand-500 focus:outline-none font-mono tracking-widest text-lg text-center"
                />
              </div>
              {confirmedTags.length > 0 && (
                <button
                  className="btn !bg-warn/10 !border-warn/30 !text-warn-dark"
                  onClick={() => {
                    setErr("");
                    setRejectOpen(true);
                  }}
                >
                  <ArrowLeftCircle size={15} />
                  退回已确认项
                </button>
              )}
              <button
                className="btn-danger"
                onClick={() => {
                  setRejectOpen(true);
                  setErr("");
                }}
              >
                驳回 · 回到编辑
              </button>
              <button
                className="btn-success !px-6 !py-2.5 text-base"
                onClick={handleConfirm}
              >
                <ShieldCheck size={17} />
                老板确认通过
              </button>
            </div>
            {err && (
              <div className="text-xs text-danger mt-2 font-medium text-right">
                ⚠ {err}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  color,
  label,
  count,
}: {
  color: "danger" | "warn" | "info" | "success";
  label: string;
  count: number;
  sub?: string;
}) {
  const map = {
    danger: "from-danger/15 to-danger/5 border-danger/25 text-danger",
    warn: "from-warn/15 to-warn/5 border-warn/25 text-warn-dark",
    info: "from-blue-500/15 to-blue-500/5 border-blue-500/25 text-blue-700",
    success: "from-success/15 to-success/5 border-success/25 text-success-dark",
  };
  return (
    <div
      className={`rounded-xl p-3 border bg-gradient-to-br ${map[color]}`}
    >
      <div className="text-[11px] font-medium opacity-80 leading-tight">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <div className="font-mono text-3xl font-bold leading-none">{count}</div>
        <div className="text-[10px] opacity-60">项</div>
      </div>
    </div>
  );
}

function MiniCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: string;
}) {
  return (
    <div className="rounded-lg bg-white border border-gray-200 px-3 py-1.5 flex items-center justify-between">
      <span className="text-ink-light">{label}</span>
      <span className={`font-semibold ${tone}`}>{value}</span>
    </div>
  );
}
