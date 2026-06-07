import * as fs from 'fs';
import * as path from 'path';
import { ClassificationConfig, ClassifyRule } from './types';

export function loadConfig(configPath: string): ClassificationConfig {
  const absolutePath = path.resolve(configPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`配置文件不存在: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');
  let rawConfig: any;

  try {
    rawConfig = JSON.parse(content);
  } catch (e) {
    throw new Error(`配置文件解析失败: ${e instanceof Error ? e.message : '未知错误'}`);
  }

  return validateAndNormalizeConfig(rawConfig);
}

function validateAndNormalizeConfig(raw: any): ClassificationConfig {
  const requiredFields = raw.requiredFields || [
    'id',
    'title',
    'content',
    'receiveTime',
  ];

  if (!Array.isArray(requiredFields)) {
    throw new Error('requiredFields 必须是数组');
  }

  const rules: ClassifyRule[] = Array.isArray(raw.rules) ? raw.rules : [];
  validateRules(rules);

  const duplicateCheckFields = raw.duplicateCheckFields || ['title', 'reporterPhone'];

  if (!Array.isArray(duplicateCheckFields)) {
    throw new Error('duplicateCheckFields 必须是数组');
  }

  return {
    requiredFields,
    rules: rules.sort((a, b) => b.priority - a.priority),
    duplicateCheckFields,
    defaultCategory: raw.defaultCategory || '其他诉求',
    defaultDepartment: raw.defaultDepartment || '综合协调部门',
  };
}

function validateRules(rules: ClassifyRule[]): void {
  const ruleIds = new Set<string>();

  for (const rule of rules) {
    if (!rule.id) {
      throw new Error('规则必须包含 id 字段');
    }
    if (ruleIds.has(rule.id)) {
      throw new Error(`规则 id 重复: ${rule.id}`);
    }
    ruleIds.add(rule.id);

    if (!rule.name) {
      throw new Error(`规则 ${rule.id} 缺少 name 字段`);
    }
    if (!rule.category) {
      throw new Error(`规则 ${rule.id} 缺少 category 字段`);
    }
    if (!rule.department) {
      throw new Error(`规则 ${rule.id} 缺少 department 字段`);
    }
    if (!Array.isArray(rule.conditions) || rule.conditions.length === 0) {
      throw new Error(`规则 ${rule.id} 必须包含至少一个条件`);
    }

    for (const cond of rule.conditions) {
      if (!cond.field) {
        throw new Error(`规则 ${rule.id} 的条件缺少 field 字段`);
      }
      if (!cond.operator) {
        throw new Error(`规则 ${rule.id} 的条件缺少 operator 字段`);
      }
      const validOperators = [
        'contains',
        'equals',
        'regex',
        'startsWith',
        'endsWith',
        'in',
      ];
      if (!validOperators.includes(cond.operator)) {
        throw new Error(
          `规则 ${rule.id} 的条件 operator 无效: ${cond.operator}`
        );
      }
      if (cond.value === undefined || cond.value === null) {
        throw new Error(`规则 ${rule.id} 的条件缺少 value 字段`);
      }
    }
  }
}
