import type { PriceSession, PriceItem } from "@/types";

const CATEGORIES = ["叶菜类", "根茎类", "瓜果类", "菌菇类", "豆制品", "调味类"];
const ITEMS_BY_CATEGORY: Record<string, { name: string; basePrice: number }[]> = {
  叶菜类: [
    { name: "青菜", basePrice: 2.8 },
    { name: "小青菜", basePrice: 3.5 },
    { name: "白菜", basePrice: 1.5 },
    { name: "生菜", basePrice: 4.0 },
    { name: "菠菜", basePrice: 5.5 },
  ],
  根茎类: [
    { name: "土豆", basePrice: 2.0 },
    { name: "胡萝卜", basePrice: 2.5 },
    { name: "白萝卜", basePrice: 1.2 },
    { name: "莲藕", basePrice: 6.0 },
  ],
  瓜果类: [
    { name: "番茄", basePrice: 4.0 },
    { name: "黄瓜", basePrice: 3.0 },
    { name: "茄子", basePrice: 4.5 },
    { name: "辣椒", basePrice: 5.0 },
  ],
  菌菇类: [
    { name: "香菇", basePrice: 8.0 },
    { name: "平菇", basePrice: 4.5 },
    { name: "金针菇", basePrice: 5.0 },
  ],
  豆制品: [
    { name: "豆腐", basePrice: 2.0 },
    { name: "豆干", basePrice: 5.0 },
  ],
  调味类: [
    { name: "生姜", basePrice: 8.0 },
    { name: "大蒜", basePrice: 7.0 },
    { name: "大葱", basePrice: 3.5 },
  ],
};

function randomFloat(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 10) / 10;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function generateItemsForDay(daysAgo: number): PriceItem[] {
  const items: PriceItem[] = [];
  const stallNos = ["A01", "A02", "A03", "B01", "B02", "B03", "C01", "C02"];

  for (const cat of CATEGORIES) {
    const entries = ITEMS_BY_CATEGORY[cat];
    for (const entry of entries) {
      const variation = randomFloat(-0.8, 0.8);
      const jinPrice = Math.max(0.5, entry.basePrice + variation);
      const isKg = Math.random() > 0.7;
      const unit = isKg ? ("公斤" as const) : ("斤" as const);
      const displayPrice = isKg ? Math.round(jinPrice * 2 * 10) / 10 : jinPrice;

      items.push({
        id: uid(),
        name: entry.name,
        category: cat,
        oralPrice: displayPrice,
        oralUnit: unit,
        ocrPrice: Math.random() > 0.15 ? Math.round((displayPrice + randomFloat(-0.3, 0.3)) * 10) / 10 : undefined,
        ocrUnit: Math.random() > 0.2 ? unit : (isKg ? "斤" : "公斤"),
        ocrConfidence: Math.random() > 0.15 ? randomFloat(0.7, 1.0) : randomFloat(0.2, 0.5),
        yesterdayPrice: undefined,
        yesterdayUnit: undefined,
        confirmedPrice: displayPrice,
        confirmedUnit: unit,
        confirmedSource: "oral",
        status: "confirmed",
        stallNo: randomPick(stallNos),
      });
    }
  }
  return items;
}

export function generateMockSessions(): PriceSession[] {
  const sessions: PriceSession[] = [];

  for (let ago = 3; ago >= 1; ago--) {
    const items = generateItemsForDay(ago);
    sessions.push({
      id: uid(),
      date: dateStr(ago),
      items,
      broadcastScript: "",
      changeLog: [],
      status: "published",
    });
  }

  return sessions;
}

export function generateTodaySession(yesterdaySession?: PriceSession): PriceSession {
  const stallNos = ["A01", "A02", "A03", "B01", "B02", "B03", "C01", "C02"];
  const items: PriceItem[] = [];
  const yesterdayMap = new Map<string, PriceItem>();

  if (yesterdaySession) {
    for (const it of yesterdaySession.items) {
      yesterdayMap.set(it.name, it);
    }
  }

  const problemItems = [
    { name: "青菜", cat: "叶菜类", oralPrice: 5.6, oralUnit: "公斤" as const, ocrPrice: 2.8, ocrUnit: "斤" as const, ocrConfidence: 0.92 },
    { name: "小青菜", cat: "叶菜类", oralPrice: 3.5, oralUnit: "斤" as const, ocrPrice: 3.5, ocrUnit: "斤" as const, ocrConfidence: 0.88 },
    { name: "白菜", cat: "叶菜类", oralPrice: 1.2, oralUnit: "斤" as const, ocrPrice: 1.5, ocrUnit: "公斤" as const, ocrConfidence: 0.35 },
    { name: "生菜", cat: "叶菜类", oralPrice: 4.0, oralUnit: "斤" as const, ocrPrice: 4.2, ocrUnit: "斤" as const, ocrConfidence: 0.9 },
    { name: "菠菜", cat: "叶菜类", oralPrice: 9.0, oralUnit: "斤" as const, ocrPrice: 8.8, ocrUnit: "斤" as const, ocrConfidence: 0.85 },
    { name: "土豆", cat: "根茎类", oralPrice: 2.0, oralUnit: "斤" as const, ocrPrice: 2.2, ocrUnit: "斤" as const, ocrConfidence: 0.91 },
    { name: "胡萝卜", cat: "根茎类", oralPrice: 2.5, oralUnit: "斤" as const, ocrPrice: 2.5, ocrUnit: "斤" as const, ocrConfidence: 0.93 },
    { name: "白萝卜", cat: "根茎类", oralPrice: 1.0, oralUnit: "斤" as const, ocrPrice: 0.6, ocrUnit: "公斤" as const, ocrConfidence: 0.4 },
    { name: "番茄", cat: "瓜果类", oralPrice: 6.0, oralUnit: "公斤" as const, ocrPrice: 3.0, ocrUnit: "斤" as const, ocrConfidence: 0.87 },
    { name: "黄瓜", cat: "瓜果类", oralPrice: 3.0, oralUnit: "斤" as const, ocrPrice: 3.1, ocrUnit: "斤" as const, ocrConfidence: 0.89 },
    { name: "辣椒", cat: "瓜果类", oralPrice: 5.0, oralUnit: "斤" as const, ocrPrice: 15.0, ocrUnit: "公斤" as const, ocrConfidence: 0.22 },
    { name: "香菇", cat: "菌菇类", oralPrice: 8.0, oralUnit: "斤" as const, ocrPrice: 7.8, ocrUnit: "斤" as const, ocrConfidence: 0.94 },
    { name: "豆腐", cat: "豆制品", oralPrice: 2.0, oralUnit: "斤" as const, ocrPrice: 2.0, ocrUnit: "斤" as const, ocrConfidence: 0.96 },
    { name: "生姜", cat: "调味类", oralPrice: 12.0, oralUnit: "斤" as const, ocrPrice: 11.5, ocrUnit: "斤" as const, ocrConfidence: 0.88 },
    { name: "大蒜", cat: "调味类", oralPrice: 7.0, oralUnit: "斤" as const, ocrPrice: 7.2, ocrUnit: "斤" as const, ocrConfidence: 0.91 },
  ];

  for (const pi of problemItems) {
    const yItem = yesterdayMap.get(pi.name);
    items.push({
      id: uid(),
      name: pi.name,
      category: pi.cat,
      oralPrice: pi.oralPrice,
      oralUnit: pi.oralUnit,
      ocrPrice: pi.ocrPrice,
      ocrUnit: pi.ocrUnit,
      ocrConfidence: pi.ocrConfidence,
      yesterdayPrice: yItem?.confirmedPrice,
      yesterdayUnit: yItem?.confirmedUnit,
      status: "pending",
      stallNo: randomPick(stallNos),
    });
  }

  return {
    id: uid(),
    date: dateStr(0),
    items,
    broadcastScript: "",
    changeLog: [],
    status: "draft",
  };
}

export const CATEGORY_LIST = CATEGORIES;
export const STALL_LIST = ["A01", "A02", "A03", "B01", "B02", "B03", "C01", "C02"];
