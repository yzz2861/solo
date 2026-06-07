import { HotlineRecord, ClassifyRule, RuleMatchResult, RuleCondition } from './types';

export function matchRule(record: HotlineRecord, rule: ClassifyRule): RuleMatchResult {
  const matchAll = rule.matchAll !== false;
  let matchedCount = 0;

  for (const condition of rule.conditions) {
    const matched = matchCondition(record, condition);
    if (matched) {
      matchedCount++;
    } else if (matchAll) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        department: rule.department,
        matched: false,
        matchedConditions: matchedCount,
        totalConditions: rule.conditions.length,
      };
    }
  }

  const isMatched = matchAll
    ? matchedCount === rule.conditions.length
    : matchedCount > 0;

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    category: rule.category,
    department: rule.department,
    matched: isMatched,
    matchedConditions: matchedCount,
    totalConditions: rule.conditions.length,
  };
}

function matchCondition(record: HotlineRecord, condition: RuleCondition): boolean {
  const fieldValue = String(record[condition.field] || '');
  const condValue = condition.value;

  switch (condition.operator) {
    case 'contains':
      return fieldValue.includes(String(condValue));

    case 'equals':
      return fieldValue === String(condValue);

    case 'startsWith':
      return fieldValue.startsWith(String(condValue));

    case 'endsWith':
      return fieldValue.endsWith(String(condValue));

    case 'regex':
      try {
        const regex = new RegExp(String(condValue));
        return regex.test(fieldValue);
      } catch {
        return false;
      }

    case 'in':
      if (Array.isArray(condValue)) {
        return condValue.includes(fieldValue);
      }
      return String(condValue).split(',').includes(fieldValue);

    default:
      return false;
  }
}

export function matchAllRules(
  record: HotlineRecord,
  rules: ClassifyRule[]
): RuleMatchResult[] {
  return rules.map((rule) => matchRule(record, rule));
}

export function getMatchedRules(results: RuleMatchResult[]): RuleMatchResult[] {
  return results.filter((r) => r.matched);
}

export function detectRuleConflict(matchedRules: RuleMatchResult[]): {
  hasConflict: boolean;
  conflictingRules: string[];
  categories: string[];
  departments: string[];
} {
  if (matchedRules.length <= 1) {
    return {
      hasConflict: false,
      conflictingRules: [],
      categories: [],
      departments: [],
    };
  }

  const categories = new Set<string>();
  const departments = new Set<string>();

  for (const rule of matchedRules) {
    categories.add(rule.category);
    departments.add(rule.department);
  }

  const hasConflict = categories.size > 1 || departments.size > 1;

  return {
    hasConflict,
    conflictingRules: matchedRules.map((r) => `${r.ruleId}:${r.ruleName}`),
    categories: Array.from(categories),
    departments: Array.from(departments),
  };
}

export function getTopPriorityRule(matchedRules: RuleMatchResult[], rules: ClassifyRule[]): RuleMatchResult | null {
  if (matchedRules.length === 0) {
    return null;
  }

  const rulePriorityMap = new Map<string, number>();
  for (const rule of rules) {
    rulePriorityMap.set(rule.id, rule.priority);
  }

  const sorted = [...matchedRules].sort((a, b) => {
    const priA = rulePriorityMap.get(a.ruleId) || 0;
    const priB = rulePriorityMap.get(b.ruleId) || 0;
    return priB - priA;
  });

  return sorted[0] || null;
}
