import type { PriceTag } from "@/types";
import { nanoid, timestamp } from "./id";

const HEADERS: { key: keyof PriceTag; aliases: string[]; type?: "num" }[] = [
  { key: "category", aliases: ["品类", "类别", "分类", "category"] },
  { key: "name", aliases: ["品名", "名称", "name", "product"] },
  { key: "origin", aliases: ["产地", "来源", "origin", "from"] },
  { key: "grade", aliases: ["等级", "级别", "grade"] },
  { key: "boxSpec", aliases: ["箱规", "规格", "净重", "斤/箱", "boxspec"], type: "num" },
  { key: "jinPrice", aliases: ["斤价", "单价", "零售价", "jinprice", "price"], type: "num" },
  { key: "boxPrice", aliases: ["箱价", "整箱价", "批发价", "boxprice"], type: "num" },
  {
    key: "memberDiscount",
    aliases: ["会员折扣", "折扣", "会员价", "discount"],
    type: "num",
  },
  { key: "promoStart", aliases: ["促销开始", "开始日期", "开始", "start"] },
  { key: "promoEnd", aliases: ["促销结束", "结束日期", "结束", "end"] },
  { key: "remark", aliases: ["备注", "说明", "remark", "note"] },
];

function detectHeaderRow(rows: string[][]): { headerIdx: number; map: number[] } | null {
  for (let hi = 0; hi < Math.min(rows.length, 3); hi++) {
    const row = rows[hi].map((c) => c.trim().toLowerCase());
    const map: number[] = HEADERS.map(() => -1);
    let matched = 0;
    HEADERS.forEach((h, i) => {
      const idx = row.findIndex((c) =>
        h.aliases.some((a) => a.toLowerCase() === c || c.includes(a.toLowerCase()))
      );
      if (idx !== -1) {
        map[i] = idx;
        matched++;
      }
    });
    if (matched >= 4) return { headerIdx: hi, map };
  }
  return null;
}

function detectSeparator(line: string): string {
  const tabCount = line.split("\t").length - 1;
  const commaCount = line.split(",").length - 1;
  const pipeCount = line.split("|").length - 1;
  const max = Math.max(tabCount, commaCount, pipeCount);
  if (max === tabCount) return "\t";
  if (max === commaCount) return ",";
  if (max === pipeCount) return "|";
  return "\t";
}

function normalizeDiscount(v: number): number {
  if (v <= 0) return 1;
  if (v > 1 && v <= 10) return v / 10;
  if (v > 10 && v <= 100) return v / 100;
  return v;
}

export function parsePaste(text: string): {
  tags: Partial<PriceTag>[];
  ok: number;
  fail: number;
  hasHeader: boolean;
} {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { tags: [], ok: 0, fail: 0, hasHeader: false };
  const sep = detectSeparator(lines[0]);
  const rows = lines.map((l) => l.split(sep).map((c) => c.trim()));
  const headerInfo = detectHeaderRow(rows);
  const startRow = headerInfo ? headerInfo.headerIdx + 1 : 0;
  const map = headerInfo?.map;

  const tags: Partial<PriceTag>[] = [];
  let fail = 0;

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    const data: Partial<PriceTag> = {
      id: nanoid(),
      category: "",
      name: "",
      origin: "",
      grade: "",
      boxSpec: 0,
      jinPrice: 0,
      boxPrice: 0,
      memberDiscount: 1,
      promoStart: "",
      promoEnd: "",
      remark: "",
      status: "draft",
      createdAt: timestamp(),
      updatedAt: timestamp(),
    };

    HEADERS.forEach((h, i) => {
      const colIdx = map ? map[i] : i;
      if (colIdx === -1 || colIdx >= row.length) return;
      const raw = row[colIdx];
      if (!raw) return;
      if (h.type === "num") {
        let n = parseFloat(raw.replace(/[^\d.-]/g, ""));
        if (isNaN(n)) n = 0;
        if (h.key === "memberDiscount") n = normalizeDiscount(n);
        (data as unknown as Record<string, unknown>)[h.key] = n;
      } else {
        (data as unknown as Record<string, unknown>)[h.key] = raw;
      }
    });

    if (!data.name && !data.category) {
      fail++;
      continue;
    }
    tags.push(data);
  }
  return { tags, ok: tags.length, fail, hasHeader: !!headerInfo };
}

export function sampleCsvText(): string {
  const header = ["品类", "品名", "产地", "等级", "箱规", "斤价", "箱价", "会员折扣", "促销开始", "促销结束", "备注"].join("\t");
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const plus = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return fmt(d);
  };
  const rows = [
    ["浆果", "蓝莓", "云南", "AAA", "12", "18.8", "225.6", "0.95", plus(0), plus(3), "小箱 12斤"],
    ["浆果", "蓝莓", "智利", "AA", "10", "22.0", "220.0", "1.0", plus(0), plus(5), "进口 10斤"],
    ["柑橘", "沃柑", "广西", "特选", "20", "5.5", "110.0", "0.9", plus(1), plus(7), "甜过初恋"],
    ["柑橘", "橙子", "江西", "AAA", "15", "6.8", "102.0", "0.9", "", "", ""],
    ["仁果", "红富士", "山东", "AA", "24", "4.2", "100.8", "0.88", "", "", "脆甜"],
    ["仁果", "红富士", "陕西", "AAA", "24", "4.5", "108.0", "0.92", plus(0), plus(10), ""],
    ["热带", "芒果", "海南", "特选", "18", "9.8", "176.4", "0.95", "", "", "金煌芒"],
    ["瓜果", "西瓜", "宁夏", "A", "40", "1.8", "72.0", "1.0", plus(0), plus(2), "石头瓜"],
  ];
  return [header, ...rows.map((r) => r.join("\t"))].join("\n");
}
