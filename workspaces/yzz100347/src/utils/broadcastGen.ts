import type { PriceItem } from "@/types";
import { toJin } from "@/types";

export function generateBroadcastScript(items: PriceItem[]): string {
  const confirmed = items.filter((i) => i.status === "confirmed" && i.confirmedPrice !== undefined);
  if (confirmed.length === 0) return "";

  const grouped = new Map<string, PriceItem[]>();
  for (const item of confirmed) {
    const stall = item.stallNo || "未分组";
    if (!grouped.has(stall)) grouped.set(stall, []);
    grouped.get(stall)!.push(item);
  }

  const lines: string[] = [];
  lines.push("各位市民朋友，早上好！");
  lines.push("下面播报今日农贸市场菜价：");
  lines.push("");

  const stallEntries = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  for (const [stall, stallItems] of stallEntries) {
    lines.push(`【${stall}号摊位】`);
    for (const item of stallItems) {
      const jinPrice = toJin(item.confirmedPrice!, item.confirmedUnit!);
      lines.push(`  ${item.name}，${item.confirmedPrice!.toFixed(1)}元${item.confirmedUnit!}，折合${jinPrice.toFixed(1)}元一斤`);
    }
    lines.push("");
  }

  lines.push("以上为今日菜价，请以实际标价为准。");

  return lines.join("\n");
}

export function generatePriceSummary(items: PriceItem[]): { name: string; category: string; stallNo: string; price: string; jinEquiv: string; change: string }[] {
  const confirmed = items.filter((i) => i.status === "confirmed" && i.confirmedPrice !== undefined);
  return confirmed.map((item) => {
    const jinPrice = toJin(item.confirmedPrice!, item.confirmedUnit!);
    let change = "—";
    if (item.yesterdayPrice !== undefined && item.yesterdayUnit) {
      const yJin = toJin(item.yesterdayPrice, item.yesterdayUnit);
      if (yJin > 0) {
        const rate = ((jinPrice - yJin) / yJin) * 100;
        const sign = rate > 0 ? "+" : "";
        change = `${sign}${rate.toFixed(0)}%`;
      }
    }
    return {
      name: item.name,
      category: item.category,
      stallNo: item.stallNo,
      price: `${item.confirmedPrice!.toFixed(1)}元/${item.confirmedUnit!}`,
      jinEquiv: `${jinPrice.toFixed(1)}元/斤`,
      change,
    };
  });
}
