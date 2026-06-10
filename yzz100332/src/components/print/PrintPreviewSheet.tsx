import { useAppStore } from "@/store/useAppStore";
import type { PaperType, PriceTag } from "@/types";
import PriceTagPrint from "./PriceTagPrint";
import { AlertTriangle } from "lucide-react";

interface PaperConfig {
  paperClass: string;
  cols: number;
  rows: number;
  colGapMm: number;
  rowGapMm: number;
  pageWidthMm: number;
  pageHeightMm: number;
}

const PAPER_CFGS: Record<PaperType, PaperConfig> = {
  "a4-30": {
    paperClass: "size-a4",
    cols: 5,
    rows: 6,
    colGapMm: 2,
    rowGapMm: 2,
    pageWidthMm: 210,
    pageHeightMm: 297,
  },
  "sticker-10": {
    paperClass: "size-sticker",
    cols: 2,
    rows: 5,
    colGapMm: 2,
    rowGapMm: 2,
    pageWidthMm: 200,
    pageHeightMm: 320,
  },
  thermal: {
    paperClass: "size-thermal",
    cols: 1,
    rows: 999,
    colGapMm: 0,
    rowGapMm: 1,
    pageWidthMm: 60,
    pageHeightMm: 9999,
  },
};

export default function PrintPreviewSheet() {
  const tags = useAppStore((s) => s.tags);
  const ps = useAppStore((s) => s.printSettings);

  const cfg = PAPER_CFGS[ps.paper];
  const filtered = ps.onlyConfirmed
    ? tags.filter((t) => t.status === "confirmed" || t.status === "printed")
    : tags;

  const perPage = cfg.cols * (cfg.rows === 999 ? filtered.length : cfg.rows);
  const pages: PriceTag[][] = [];
  if (cfg.rows === 999) {
    if (filtered.length > 0) pages.push(filtered);
  } else {
    for (let i = 0; i < filtered.length; i += perPage) {
      pages.push(filtered.slice(i, i + perPage));
    }
  }

  const pageStyle: React.CSSProperties = {
    width: `${cfg.pageWidthMm}mm`,
    minHeight:
      cfg.rows === 999 ? "auto" : `${cfg.pageHeightMm - 16}mm`,
    padding: "8mm",
    background: "white",
    boxSizing: "border-box",
    position: "relative",
  };

  const scale = 0.55;

  const confirmedCount = tags.filter((t) => t.status === "confirmed").length;
  const hasUnconfirmedForPrint = confirmedCount === 0 && ps.onlyConfirmed;

  return (
    <div className="flex-1 h-full overflow-y-auto bg-gray-200/50 p-6 no-print">
      {hasUnconfirmedForPrint && (
        <div className="mb-5 mx-auto max-w-[880px] bg-warn/15 border border-warn/40 text-warn-dark px-4 py-3 rounded-xl flex items-start gap-2.5">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            当前没有「待打印」的价签。请先在工作台「提交老板确认」后再打印，或关掉上方「仅打印已确认项」开关。
          </div>
        </div>
      )}

      <div
        className="mx-auto flex flex-col items-center gap-6 print-area"
        id="printArea"
        style={{ transformOrigin: "top center" }}
      >
        {pages.length === 0 ? (
          <div className="w-full py-20 text-center text-ink-light text-sm">
            <div className="text-4xl opacity-30 mb-3">📄</div>
            <p>暂无可预览的价签</p>
          </div>
        ) : (
          pages.map((page, pi) => (
            <div
              key={pi}
              className={cfg.paperClass + " shadow-xl rounded-lg overflow-hidden relative"}
              style={{
                ...pageStyle,
                transform: `scale(${scale})`,
                marginBottom: pi === pages.length - 1 ? 0 : `calc(-${pageStyle.minHeight} * (1 - ${scale}) - 40px)`,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${cfg.cols}, 1fr)`,
                  columnGap: `${cfg.colGapMm}mm`,
                  rowGap: `${cfg.rowGapMm}mm`,
                  justifyItems: "center",
                }}
              >
                {page.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      padding: `${ps.marginMm / 2}mm`,
                      outline: "0.2mm dashed rgba(0,0,0,0.08)",
                      outlineOffset: `${ps.marginMm / 2}mm`,
                    }}
                  >
                    <PriceTagPrint tag={t} />
                  </div>
                ))}
              </div>
              {cfg.rows !== 999 && (
                <div
                  className="absolute bottom-2 right-3 text-[10px] text-gray-400 font-mono"
                  style={{ bottom: "2mm", right: "3mm" }}
                >
                  - {pi + 1} / {pages.length} -
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
