import type { PriceTag, ValidationIssue } from "@/types";
import {
  calcExpectedBoxPrice,
  calcExpectedJinPrice,
  priceDiffPct,
} from "./priceCalc";
import { parseDate, todayStr } from "./id";

const TOLERANCE_PCT = 2;

export function validateTags(tags: PriceTag[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const today = todayStr();
  const comboMap = new Map<string, number[]>();

  tags.forEach((tag, idx) => {
    const comboKey = [
      tag.category?.trim(),
      tag.name?.trim(),
      tag.origin?.trim(),
      tag.grade?.trim(),
      String(tag.boxSpec || 0),
    ].join("|");
    const exist = comboMap.get(comboKey);
    if (exist) {
      exist.push(idx);
    } else {
      comboMap.set(comboKey, [idx]);
    }

    if (!tag.category?.trim()) {
      issues.push(err(tag.id, "empty", "品类不能为空", "category"));
    }
    if (!tag.name?.trim()) {
      issues.push(err(tag.id, "empty", "品名不能为空", "name"));
    }
    if (!tag.origin?.trim()) {
      issues.push(err(tag.id, "empty", "产地不能为空", "origin"));
    }
    if (!tag.grade?.trim()) {
      issues.push(err(tag.id, "empty", "等级不能为空", "grade"));
    }
    if (!tag.boxSpec || tag.boxSpec <= 0) {
      issues.push(err(tag.id, "empty", "箱规必须大于 0", "boxSpec"));
    }
    if (
      (!tag.jinPrice || tag.jinPrice <= 0) &&
      (!tag.boxPrice || tag.boxPrice <= 0)
    ) {
      issues.push(err(tag.id, "empty", "斤价/箱价至少填一个", "jinPrice"));
    }

    if (tag.jinPrice > 0 && tag.boxSpec > 0 && tag.boxPrice > 0) {
      const md = tag.memberDiscount || 1;
      const expectedBox = calcExpectedBoxPrice(tag.jinPrice, tag.boxSpec, md);
      if (expectedBox > 0) {
        const diff = priceDiffPct(tag.boxPrice, expectedBox);
        if (Math.abs(diff) > TOLERANCE_PCT) {
          issues.push({
            tagId: tag.id,
            level: "warning",
            type: "price",
            message: `箱价偏差 ${diff.toFixed(1)}%，建议 ${expectedBox.toFixed(2)} 元`,
            field: "boxPrice",
          });
        }
      }
    } else if (tag.boxPrice > 0 && tag.boxSpec > 0 && !tag.jinPrice) {
      const md = tag.memberDiscount || 1;
      const expectedJin = calcExpectedJinPrice(tag.boxPrice, tag.boxSpec, md);
      issues.push({
        tagId: tag.id,
        level: "warning",
        type: "price",
        message: `根据箱价推算斤价约 ${expectedJin.toFixed(2)} 元/斤`,
        field: "jinPrice",
      });
    }

    const ps = parseDate(tag.promoStart);
    const pe = parseDate(tag.promoEnd);
    if (!ps && pe) {
      issues.push(err(tag.id, "promotion", "促销开始日期未填", "promoStart"));
    }
    if (ps && !pe) {
      issues.push(warn(tag.id, "promotion", "促销结束日期未填", "promoEnd"));
    }
    if (ps && pe && pe < ps) {
      issues.push(err(tag.id, "promotion", "促销结束早于开始", "promoEnd"));
    }
    if (pe && parseDate(today) && pe < parseDate(today)!) {
      issues.push(err(tag.id, "promotion", "促销已过期", "promoEnd"));
    }
  });

  comboMap.forEach((indexes) => {
    if (indexes.length > 1) {
      indexes.forEach((idx, i) => {
        if (i > 0) {
          const firstIdx = indexes[0] + 1;
          issues.push(
            warn(
              tags[idx].id,
              "duplicate",
              `与第 ${firstIdx} 行组合重复（品类+品名+产地+等级+箱规）`,
              "name"
            )
          );
        }
      });
    }
  });

  return issues;
}

export function issuesCountByTag(
  issues: ValidationIssue[]
): Record<string, { error: number; warning: number; info: number }> {
  const map: Record<string, { error: number; warning: number; info: number }> =
    {};
  issues.forEach((i) => {
    const entry = (map[i.tagId] ||= { error: 0, warning: 0, info: 0 });
    entry[i.level]++;
  });
  return map;
}

export function worstIssueLevel(
  counts: { error: number; warning: number; info: number } | undefined
): ValidationIssue["level"] | null {
  if (!counts) return null;
  if (counts.error > 0) return "error";
  if (counts.warning > 0) return "warning";
  if (counts.info > 0) return "info";
  return null;
}

function err(
  tagId: string,
  type: ValidationIssue["type"],
  message: string,
  field?: string
): ValidationIssue {
  return { tagId, level: "error", type, message, field };
}
function warn(
  tagId: string,
  type: ValidationIssue["type"],
  message: string,
  field?: string
): ValidationIssue {
  return { tagId, level: "warning", type, message, field };
}
