import type { Rule } from './types'

const absolutePatterns: RegExp[] = [
  /行业第一/, /全球第一/, /全国第一/, /排名第一/, /位列第一/,
  /唯一/, /独一无二/, /绝无仅有/,
  /首个/, /首家/, /率先/,
  /独家/, /独家代理/, /独家授权/,
  /最强/, /最大/, /最优/, /最好/, /最低/, /最高/, /最先进/, /最领先/, /最完善/,
  /全面领先/, /遥遥领先/, /绝对领先/, /处于领先/,
  /首屈一指/, /无与伦比/, /无人能及/, /没有对手/,
  /无可匹敌/, /不可超越/, /前所未有/,
  /最\b(?!近|终|初|后|少|多|大|小|基础)/,
]

const politicalPatterns: RegExp[] = [
  /国家主席/, /总书记/, /政治局/, /中央委员/,
  /颠覆国家/, /分裂国家/, /危害国家安全/,
  /国家机密/, /军事机密/, /涉密/,
  /敏感时期/, /政治风波/, /政治事件/,
  /反华势力/, /敌对势力/,
  /军[事队]?(?:介入|行动|部署|演习|冲突|对抗)/,
  /涉台/, /涉藏/, /涉疆/, /涉港/,
]

const dataSourcePatterns: RegExp[] = [
  /(?:增长|上涨|下降|下滑|提升|降低|提高|减少|增加|扩大|缩小|占比|份额|规模|营收|利润|收入|用户|客户|市场)\s*(?:了|为|至|到|达)?\s*\d[\d,.]*\s*%(?!.*(?:根据|据|来源|数据显示|报告显示|统计|调查|研究|白皮书|蓝皮书))/,
  /\d[\d,.]*\s*(?:亿|万|千万|百万|万亿)(?:元|美元|人|家|个|次|吨|件)(?!.*(?:根据|据|来源|数据显示|报告显示|统计|调查|研究))/,
]

const exaggerationPatterns: RegExp[] = [
  /颠覆[性了]/, /革命性/, /突破性/,
  /划时代/, /史无前例/, /开创性/,
  /里程碑式/, /开创先河/,
  /彻底改变/, /重塑行业/, /改写历史/,
  /终结时代/, /终结传统/,
  /行业洗牌/, /重新定义/,
]

const hasSourceRef = (s: string): boolean =>
  /(?:根据|据|来源|数据显示|报告显示|统计|调查|研究|白皮书|蓝皮书|发布)/.test(s)

const absoluteRule: Rule = {
  id: 'absolute',
  category: 'absolute',
  label: '绝对化表述',
  severity: 'high',
  rewriteHint: '建议使用相对化表述，如"领先之一""位居前列""处于行业前列""名列前茅"等',
  match: (s: string) => absolutePatterns.some(p => p.test(s)),
}

const politicalRule: Rule = {
  id: 'political',
  category: 'political',
  label: '涉政敏感',
  severity: 'high',
  rewriteHint: '建议删除涉政内容或使用官方标准表述，请法务人工确认',
  match: (s: string) => politicalPatterns.some(p => p.test(s)),
}

const dataSourceRule: Rule = {
  id: 'data_source',
  category: 'data_source',
  label: '数据口径缺来源',
  severity: 'medium',
  rewriteHint: '建议补充数据来源，如"根据XX机构发布的《XX报告》""据XX统计数据显示"',
  match: (s: string) => {
    if (hasSourceRef(s)) return false
    return dataSourcePatterns.some(p => p.test(s))
  },
}

const exaggerationRule: Rule = {
  id: 'exaggeration',
  category: 'exaggeration',
  label: '夸大表述',
  severity: 'medium',
  rewriteHint: '建议使用保守表述，如"创新性""显著提升""重要进展""有力推动"等',
  match: (s: string) => exaggerationPatterns.some(p => p.test(s)),
}

export const rules: Rule[] = [absoluteRule, politicalRule, dataSourceRule, exaggerationRule]

export function generateRewrite(sentence: string, rule: Rule): string {
  const matched = rules.find(r => r.id === rule.id)
  if (!matched) return ''
  return matched.rewriteHint
}
