import type { PriceTag } from "@/types";
import { calcMemberPrice } from "@/utils/priceCalc";

export default function PriceTagPrint({ tag }: { tag: PriceTag }) {
  const memberJin = calcMemberPrice(tag.jinPrice, tag.memberDiscount);
  const unconfirmed = tag.status !== "confirmed" && tag.status !== "printed";
  const isPrinted = tag.status === "printed";
  const hasPromo = tag.promoStart || tag.promoEnd;

  return (
    <div
      className={[
        "price-tag-print paper-bg relative overflow-hidden",
        unconfirmed ? "tag-unconfirmed opacity-30" : "",
      ].join(" ")}
      style={{
        width: "90mm",
        height: "60mm",
        padding: "3mm",
        boxSizing: "border-box",
      }}
    >
      {isPrinted && (
        <div
          style={{
            position: "absolute",
            top: "4mm",
            right: "4mm",
            border: "1.5px solid #EF4444",
            color: "#EF4444",
            borderRadius: "3px",
            padding: "1px 8px",
            fontSize: "11px",
            fontWeight: 700,
            transform: "rotate(-12deg)",
            opacity: 0.85,
          }}
        >
          已打印
        </div>
      )}
      {hasPromo && (
        <div
          style={{
            position: "absolute",
            top: "3mm",
            left: "3mm",
            background: "#FF7A45",
            color: "white",
            fontSize: "9px",
            fontWeight: 600,
            padding: "1px 6px",
            borderRadius: "2px",
          }}
        >
          📅 促销中
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginTop: hasPromo ? "7mm" : "1mm",
          gap: "2mm",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: '"ZCOOL XiaoWei", serif',
              fontSize: "7mm",
              lineHeight: 1.05,
              color: "#0F2A24",
              fontWeight: 600,
            }}
          >
            {tag.name || "——"}
          </div>
          <div
            style={{
              display: "flex",
              gap: "2mm",
              marginTop: "1.5mm",
              fontSize: "3.2mm",
              color: "#374151",
            }}
          >
            <span>{tag.category || "未分类"}</span>
            <span style={{ opacity: 0.4 }}>|</span>
            <span>
              产地 <b>{tag.origin || "—"}</b>
            </span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          {tag.grade && (
            <div
              style={{
                display: "inline-block",
                fontSize: "3.2mm",
                fontWeight: 700,
                color: "#92400e",
                background: "linear-gradient(135deg, #fde68a, #fcd34d)",
                border: "0.3mm solid #d97706",
                borderRadius: "1.5mm",
                padding: "0.3mm 2mm",
              }}
            >
              {tag.grade}
            </div>
          )}
          <div
            style={{
              marginTop: "1.5mm",
              fontSize: "2.8mm",
              color: "#6B7280",
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            箱规: <b>{tag.boxSpec || 0}</b> 斤
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "3mm",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "2mm",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "2.6mm",
              color: "#6B7280",
            }}
          >
            斤价
          </div>
          <div
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "8mm",
              fontWeight: 700,
              color: "#1F2937",
              lineHeight: 1,
            }}
          >
            ¥{(tag.jinPrice || 0).toFixed(2)}
          </div>
          {tag.memberDiscount < 1 && memberJin > 0 && (
            <div
              style={{
                marginTop: "1mm",
                fontSize: "2.8mm",
                color: "#15803D",
                fontWeight: 600,
                fontFamily: '"JetBrains Mono", monospace',
                background: "rgba(34,197,94,0.1)",
                borderRadius: "1.2mm",
                padding: "0.5mm 1.5mm",
                display: "inline-block",
              }}
            >
              会员 ¥{memberJin.toFixed(2)}
            </div>
          )}
        </div>
        <div>
          <div
            style={{
              fontSize: "2.6mm",
              color: "#6B7280",
              textAlign: "right",
            }}
          >
            整箱价
          </div>
          <div
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "9mm",
              fontWeight: 800,
              color: "#0F2A24",
              lineHeight: 1,
              textAlign: "right",
            }}
          >
            ¥{(tag.boxPrice || 0).toFixed(2)}
          </div>
          <div
            style={{
              textAlign: "right",
              marginTop: "1mm",
              fontSize: "2.5mm",
              color: "#6B7280",
            }}
          >
            {(tag.memberDiscount < 1 ? (tag.memberDiscount * 10).toFixed(1) + "折" : "无折扣")}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "auto",
          paddingTop: "2mm",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "2mm",
        }}
      >
        <div
          style={{
            fontSize: "2.6mm",
            color: "#4B5563",
            maxWidth: "48mm",
            lineHeight: 1.15,
            flex: 1,
          }}
        >
          {tag.remark ||
            (hasPromo
              ? `促销：${tag.promoStart || "?"} → ${tag.promoEnd || "?"}`
              : "每日新鲜 · 量大从优")}
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              width: "24mm",
              height: "6mm",
              background:
                "repeating-linear-gradient(90deg, #1F2937 0, #1F2937 0.4mm, transparent 0.4mm, transparent 1mm)",
              marginLeft: "auto",
              marginBottom: "0.5mm",
            }}
            aria-hidden
          />
          <div
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "2.2mm",
              color: "#6B7280",
              letterSpacing: "0.3mm",
            }}
          >
            {tag.id.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10)}
          </div>
        </div>
      </div>
    </div>
  );
}
