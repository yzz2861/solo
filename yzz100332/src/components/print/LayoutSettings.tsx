import { useAppStore } from "@/store/useAppStore";
import type { PaperType } from "@/types";
import { FileText, Settings, Grid } from "lucide-react";

const PAPER_OPTIONS: {
  value: PaperType;
  label: string;
  desc: string;
  cols: number;
  rows: number;
}[] = [
  {
    value: "a4-30",
    label: "A4 普通纸",
    desc: "210×297mm · 每排5 × 6排 = 30枚",
    cols: 5,
    rows: 6,
  },
  {
    value: "sticker-10",
    label: "不干胶贴纸",
    desc: "100×150mm · 每排2 × 5排 = 10枚",
    cols: 2,
    rows: 5,
  },
  {
    value: "thermal",
    label: "热敏标签纸",
    desc: "60mm 宽 · 单排连续出纸",
    cols: 1,
    rows: 999,
  },
];

export default function LayoutSettings({
  onPrint,
  printCount,
}: {
  onPrint: () => void;
  printCount: number;
}) {
  const ps = useAppStore((s) => s.printSettings);
  const setPS = useAppStore((s) => s.setPrintSettings);

  const opt = PAPER_OPTIONS.find((p) => p.value === ps.paper)!;

  return (
    <aside className="w-[340px] shrink-0 h-full bg-brand-600/70 border-r border-white/10 p-4 flex flex-col gap-4 overflow-y-auto no-print">
      <div>
        <h3 className="text-white/90 font-semibold text-sm flex items-center gap-2 mb-3">
          <Settings size={15} className="text-brand-300" /> 排版设置
        </h3>
        <div className="space-y-2">
          {PAPER_OPTIONS.map((p) => (
            <label
              key={p.value}
              className={[
                "block p-3 rounded-lg border-2 cursor-pointer transition-all",
                ps.paper === p.value
                  ? "bg-white/10 border-brand-300 shadow-press"
                  : "bg-black/10 border-white/8 hover:bg-white/5 hover:border-white/15",
              ].join(" ")}
            >
              <input
                type="radio"
                name="paper"
                value={p.value}
                checked={ps.paper === p.value}
                onChange={() => setPS({ paper: p.value })}
                className="sr-only"
              />
              <div className="flex items-start gap-2.5">
                <FileText size={18} className="text-white/60 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-semibold">{p.label}</div>
                  <div className="text-white/50 text-[11px] mt-0.5">{p.desc}</div>
                </div>
                {ps.paper === p.value && (
                  <Grid size={14} className="text-brand-300" />
                )}
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-white/90 font-semibold text-sm flex items-center gap-2 mb-2">
          <Grid size={15} className="text-brand-300" /> 边距 & 选项
        </h3>
        <div className="space-y-2">
          <label className="block">
            <div className="text-white/60 text-xs mb-1">
              价签外边距：<b className="text-white font-mono">{ps.marginMm}mm</b>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={ps.marginMm}
              onChange={(e) => setPS({ marginMm: parseInt(e.target.value) })}
              className="w-full accent-brand-300"
            />
          </label>
          <label className="flex items-center gap-2 text-white/80 text-sm bg-black/15 p-2.5 rounded-lg cursor-pointer hover:bg-black/25 border border-white/8">
            <input
              type="checkbox"
              checked={ps.onlyConfirmed}
              onChange={(e) => setPS({ onlyConfirmed: e.target.checked })}
              className="w-4 h-4 accent-success"
            />
            <div>
              <div className="font-medium">仅打印已确认项</div>
              <div className="text-[11px] text-white/50">未确认/草稿将被跳过</div>
            </div>
          </label>
        </div>
      </div>

      <div className="h-px bg-white/8 -mx-4" />

      <div>
        <div className="text-white/60 text-xs mb-1">
          纸张规格：<span className="text-white font-medium">{opt.label}</span>
        </div>
        <div className="text-white/60 text-xs">
          每版 <b className="text-white">{opt.rows === 999 ? "∞（连续）" : opt.cols * opt.rows}</b> 枚 · 列 {opt.cols}
        </div>
      </div>

      <div className="mt-auto space-y-2">
        <div className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm">
          待打印：
          <b className="text-success-light font-mono text-lg ml-2">{printCount}</b>
          <span className="text-white/40"> 张</span>
        </div>
        <button
          className="w-full btn-success !py-3 text-base"
          disabled={printCount === 0}
          onClick={onPrint}
        >
          🖨️ 打印 {printCount > 0 ? `${printCount} 张` : ""}
        </button>
        <div className="text-[11px] text-white/40 text-center leading-relaxed">
          打印后系统将自动把这些价签标记为「已打印」
        </div>
      </div>
    </aside>
  );
}
