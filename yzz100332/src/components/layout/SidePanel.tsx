import { useState } from "react";
import {
  Clipboard,
  Plus,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  Trash2,
  MinusCircle,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { sampleCsvText } from "@/utils/parser";
import { todayStr } from "@/utils/id";

export default function SidePanel() {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );
  const [reduceAmt, setReduceAmt] = useState("2");
  const [promoStart, setPromoStart] = useState(todayStr());
  const [promoDays, setPromoDays] = useState("3");

  const parsePasteText = useAppStore((s) => s.parsePasteText);
  const loadSample = useAppStore((s) => s.loadSample);
  const addTag = useAppStore((s) => s.addTag);
  const removeAll = useAppStore((s) => s.removeAll);
  const bulkReduceJinPrice = useAppStore((s) => s.bulkReduceJinPrice);
  const bulkSetPromo = useAppStore((s) => s.bulkSetPromo);
  const setConfirmModalOpen = useAppStore((s) => s.setConfirmModalOpen);
  const setIssuesDrawerOpen = useAppStore((s) => s.setIssuesDrawerOpen);
  const issues = useAppStore((s) => s.issues);
  const tags = useAppStore((s) => s.tags);

  const errCount = issues.filter((i) => i.level === "error").length;
  const warnCount = issues.filter((i) => i.level === "warning").length;

  function handleParse() {
    if (!text.trim()) {
      setMsg({ type: "err", text: "请先粘贴 Excel/CSV 内容" });
      return;
    }
    const res = parsePasteText(text);
    if (res.ok > 0) {
      setMsg({ type: "ok", text: `成功解析 ${res.ok} 行${res.fail ? `，失败 ${res.fail} 行` : ""}` });
      setText("");
    } else {
      setMsg({ type: "err", text: `解析失败，请检查格式。${res.fail ? `失败 ${res.fail} 行` : ""}` });
    }
    setTimeout(() => setMsg(null), 3500);
  }

  function handleSample() {
    loadSample();
    setMsg({ type: "ok", text: "已加载示例数据（含异常，供演示）" });
    setTimeout(() => setMsg(null), 2500);
  }

  function handleReduce() {
    const amt = parseFloat(reduceAmt);
    if (isNaN(amt) || amt <= 0) return;
    bulkReduceJinPrice(amt);
    setMsg({ type: "ok", text: `已对所有行斤价降价 ${amt} 元` });
    setTimeout(() => setMsg(null), 2500);
  }

  function handleSetPromo() {
    const days = parseInt(promoDays);
    if (!promoStart || isNaN(days) || days < 1) return;
    const end = new Date(promoStart);
    end.setDate(end.getDate() + days);
    const endStr = end.toISOString().slice(0, 10);
    bulkSetPromo(promoStart, endStr);
    setMsg({ type: "ok", text: `已设置促销：${promoStart} ~ ${endStr}` });
    setTimeout(() => setMsg(null), 2500);
  }

  return (
    <aside className="w-[340px] shrink-0 h-full bg-brand-600/70 border-r border-white/10 flex flex-col p-4 gap-4 overflow-y-auto no-print">
      <div>
        <h3 className="text-white/90 font-semibold text-sm flex items-center gap-2 mb-2">
          <Clipboard size={15} className="text-brand-300" />
          批量粘贴（Excel/CSV/TSV）
        </h3>
        <textarea
          className="w-full h-44 px-3 py-2.5 rounded-lg bg-black/20 border border-white/10 text-white/90 text-xs font-mono leading-relaxed placeholder-white/30 focus:outline-none focus:border-brand-300/60 resize-none"
          placeholder={"品类\t品名\t产地\t等级\t箱规\t斤价\t箱价\t会员折扣\t促销开始\t促销结束\t备注\n浆果\t蓝莓\t云南\tAAA\t12\t18.8\t225.6\t0.95\t2026-06-10\t2026-06-13\t小箱 12斤"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
        />
        <div className="flex gap-2 mt-2.5">
          <button className="btn-primary !py-2 flex-1 text-sm" onClick={handleParse}>
            <Clipboard size={14} /> 解析粘贴
          </button>
          <button className="btn !py-2 text-sm !bg-brand-400/20 !text-white !border-white/20 hover:!bg-brand-400/30" onClick={handleSample}>
            <Sparkles size={14} /> 示例
          </button>
        </div>
        {msg && (
          <div
            className={[
              "mt-2.5 px-3 py-2 rounded text-xs font-medium border",
              msg.type === "ok"
                ? "bg-success/15 text-success-light border-success/30"
                : "bg-danger/15 text-danger-light border-danger/30",
            ].join(" ")}
          >
            {msg.text}
          </div>
        )}
        <div className="mt-2 text-[11px] text-white/40 leading-relaxed">
          列顺序：品类 / 品名 / 产地 / 等级 / 箱规 / 斤价 / 箱价 / 会员折扣 / 促销开始 / 促销结束 / 备注
        </div>
      </div>

      <div className="h-px bg-white/8 -mx-4" />

      <div>
        <h3 className="text-white/90 font-semibold text-sm flex items-center gap-2 mb-2">
          <MinusCircle size={15} className="text-warn-light" />
          快捷批量操作
        </h3>
        <div className="grid grid-cols-1 gap-2.5">
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              className="flex-1 px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white/90 text-sm placeholder-white/30 focus:outline-none focus:border-warn/50"
              value={reduceAmt}
              onChange={(e) => setReduceAmt(e.target.value)}
              placeholder="降价金额"
            />
            <button className="btn-warn !py-2 text-sm" onClick={handleReduce}>
              斤价统一降价
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="flex-1 px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white/90 text-sm focus:outline-none focus:border-brand-300/50"
              value={promoStart}
              onChange={(e) => setPromoStart(e.target.value)}
            />
            <input
              type="number"
              min="1"
              className="w-20 px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white/90 text-sm focus:outline-none focus:border-brand-300/50"
              value={promoDays}
              onChange={(e) => setPromoDays(e.target.value)}
              placeholder="天数"
            />
            <button
              className="btn !py-2 text-sm !bg-blue-500/20 !text-blue-100 !border-blue-400/30 hover:!bg-blue-500/30"
              onClick={handleSetPromo}
            >
              <Calendar size={14} /> 设促销
            </button>
          </div>
          <div className="flex gap-2">
            <button
              className="btn !py-2 text-sm flex-1 !bg-brand-400/15 !text-white !border-white/15 hover:!bg-brand-400/25"
              onClick={() => addTag()}
            >
              <Plus size={14} /> 新增一行
            </button>
            <button
              className="btn !py-2 text-sm !bg-danger/15 !text-danger-light !border-danger/25 hover:!bg-danger/25"
              onClick={() => {
                if (tags.length === 0) return;
                if (confirm(`确定清空全部 ${tags.length} 条价签吗？`)) removeAll();
              }}
            >
              <Trash2 size={14} /> 清空
            </button>
          </div>
        </div>
      </div>

      <div className="h-px bg-white/8 -mx-4" />

      <div className="space-y-2 mt-auto">
        <button
          className={[
            "w-full btn flex items-center !py-2.5 text-sm",
            errCount > 0
              ? "!bg-warn !border-warn !text-white"
              : "!bg-warn/90 !border-warn-dark !text-white",
          ].join(" ")}
          onClick={() => setIssuesDrawerOpen(true)}
        >
          <AlertTriangle size={16} />
          <span className="flex-1 text-left">异常汇总</span>
          <span className="flex items-center gap-1.5">
            {errCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-white/20 text-xs font-mono">
                ✕ {errCount}
              </span>
            )}
            {warnCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-white/20 text-xs font-mono">
                ⚠ {warnCount}
              </span>
            )}
          </span>
        </button>

        <button
          className="w-full btn-success !py-2.5 text-sm"
          onClick={() => setConfirmModalOpen(true)}
        >
          <ShieldCheck size={16} />
          提交老板确认 · 待打印
        </button>

        <div className="pt-2 text-[11px] text-white/35 text-center leading-relaxed">
          所有数据自动保存到本机浏览器 · 刷新不丢失
        </div>
      </div>
    </aside>
  );
}
