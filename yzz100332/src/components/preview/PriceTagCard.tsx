import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { PriceTag, ValidationIssue } from "@/types";
import { issuesCountByTag, worstIssueLevel } from "@/utils/validator";
import { calcMemberPrice } from "@/utils/priceCalc";
import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";

export default function PriceTagCard({
  tag,
  issueCounts,
  issuesForTag,
  highlighted,
  delay,
}: {
  tag: PriceTag;
  issueCounts?: { error: number; warning: number; info: number };
  issuesForTag?: ValidationIssue[];
  highlighted?: boolean;
  delay?: number;
}) {
  const worst = worstIssueLevel(issueCounts);
  const memberJin = calcMemberPrice(tag.jinPrice, tag.memberDiscount);
  const totalBadge = (issueCounts?.error || 0) + (issueCounts?.warning || 0) + (issueCounts?.info || 0);

  const barCode = genBarcode(tag);

  const borderTone =
    worst === "error"
      ? "ring-2 ring-danger/80 shadow-[0_4px_16px_rgba(239,68,68,0.18)]"
      : worst === "warning"
      ? "ring-2 ring-warn/80 shadow-[0_4px_16px_rgba(255,122,69,0.2)]"
      : highlighted
      ? "ring-2 ring-brand-400 shadow-[0_4px_16px_rgba(15,42,36,0.2)]"
      : "ring-1 ring-black/5";

  const statusBadge =
    tag.status === "printed" ? "已打印" : tag.status === "confirmed" ? "待打印" : "";

  return (
    <div
      className={[
        "price-tag-card paper-bg relative rounded-lg p-3 transition-all duration-200 cursor-default hover:-translate-y-0.5 hover:shadow-tag-hover",
        borderTone,
      ].join(" ")}
      style={{
        animationDelay: `${delay || 0}ms`,
        aspectRatio: "60 / 90",
      }}
    >
      <div className="absolute top-1 left-1/2 -translate-x-1/2 w-14 h-1.5 rounded-full bg-gradient-to-r from-transparent via-amber-800/20 to-transparent" />

      {statusBadge && (
        <div
          className={[
            "stamp-printed animate-stamp-in",
            tag.status === "printed" ? "" : "text-warn border-warn",
          ].join(" ")}
        >
          {tag.status === "printed" ? "✔ " : "◎ "}
          {statusBadge}
        </div>
      )}

      {totalBadge > 0 && (
        <div
          className={[
            "absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md",
            worst === "error"
              ? "bg-danger"
              : worst === "warning"
              ? "bg-warn"
              : "bg-blue-500",
          ].join(" ")}
          title={(issuesForTag || []).map((i) => i.message).join("\n")}
        >
          {totalBadge}
        </div>
      )}

      <div className="flex items-start justify-between mt-1.5">
        <div className="flex items-center gap-1.5">
          <span className="font-display text-[15px] leading-none text-brand-500">
            {tag.name || <span className="text-ink-light/50">（品名）</span>}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {tag.category && (
            <span className="chip bg-brand-500/10 text-brand-500 text-[10px] py-0.5 px-1.5">
              {tag.category}
            </span>
          )}
          {tag.grade && (
            <span className="chip bg-gradient-to-br from-amber-400/20 to-amber-500/20 text-amber-800 border border-amber-400/30 text-[10px] py-0.5 px-1.5 font-bold">
              {tag.grade}
            </span>
          )}
        </div>
      </div>

      <div className="mt-1.5 text-[11px] text-ink flex items-center gap-1">
        <span className="text-ink-light">产地</span>
        <span className="font-medium">{tag.origin || <span className="text-danger italic">未填</span>}</span>
        <span className="text-ink-light/50 mx-0.5">·</span>
        <span className="text-ink-light">箱</span>
        <span className="font-medium">{tag.boxSpec || 0} 斤</span>
      </div>

      <div className="mt-2.5 space-y-1">
        <div className="flex items-baseline gap-1">
          <span className="text-[10px] text-ink-light w-8 shrink-0">斤价</span>
          <div className="font-mono">
            {tag.jinPrice > 0 ? (
              <span className="text-ink-dark font-bold text-[20px] leading-none tracking-tight">
                ¥{tag.jinPrice.toFixed(2)}
              </span>
            ) : (
              <span className="text-ink-light/50">——</span>
            )}
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[10px] text-ink-light w-8 shrink-0">箱价</span>
          <div className="font-mono">
            {tag.boxPrice > 0 ? (
              <span className="text-brand-500 font-bold text-[18px] leading-none tracking-tight">
                ¥{tag.boxPrice.toFixed(2)}
              </span>
            ) : (
              <span className="text-ink-light/50">——</span>
            )}
          </div>
          {worst === "warning" && issuesForTag?.some((i) => i.type === "price") && (
            <span title="价格偏差" className="ml-auto">
              <AlertTriangle size={11} className="text-warn" />
            </span>
          )}
        </div>
        {tag.memberDiscount < 1 && memberJin > 0 && (
          <div className="flex items-baseline gap-1 bg-success/8 rounded px-1.5 py-0.5 -mx-1">
            <span className="text-[10px] text-success-dark w-8 shrink-0">会员</span>
            <span className="font-mono text-success-dark font-bold text-[13px] leading-none">
              ¥{memberJin.toFixed(2)}
            </span>
            <span className="text-[10px] text-success-dark/70 ml-auto">
              {(tag.memberDiscount * 10).toFixed(1)}折
            </span>
          </div>
        )}
      </div>

      {(tag.promoStart || tag.promoEnd) && (
        <div className="mt-2 flex items-center gap-1 text-[10px] bg-warn/10 rounded px-1.5 py-1 -mx-1 border border-warn/20">
          📅
          <span className="text-warn-dark">
            促销 {tag.promoStart || "?"} → {tag.promoEnd || "?"}
          </span>
          {worst === "error" && issuesForTag?.some((i) => i.type === "promotion") && (
            <AlertCircle size={10} className="ml-auto text-danger" />
          )}
        </div>
      )}

      <div className="mt-auto pt-2 flex items-end justify-between">
        <div className="text-[9px] text-ink-light leading-tight line-clamp-2 max-w-[70%]">
          {tag.remark || "\u00A0"}
        </div>
        <div className="flex flex-col items-end">
          <div className="flex gap-[2px] items-end mb-0.5" aria-hidden>
            {barCode.map((w, i) => (
              <span
                key={i}
                className="bg-ink-dark inline-block"
                style={{ width: w === 1 ? 1 : 2, height: 14 }}
              />
            ))}
          </div>
          <div className="font-mono text-[9px] text-ink-light tracking-wider">
            {shortId(tag.id)}
          </div>
        </div>
      </div>
    </div>
  );
}

function genBarcode(tag: PriceTag): number[] {
  const seed = (tag.name + tag.origin + tag.grade).length;
  const arr: number[] = [];
  let s = seed;
  for (let i = 0; i < 26; i++) {
    s = (s * 31 + i * 7 + tag.id.charCodeAt(i % tag.id.length)) % 97;
    arr.push(s % 3 === 0 ? 2 : 1);
  }
  return arr;
}
function shortId(id: string): string {
  return id.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}
