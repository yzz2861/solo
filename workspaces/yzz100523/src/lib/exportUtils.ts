import type { Session, ProductLine, Anchor } from '../types'
import { VIOLATION_META, SEVERITY_META, EXEMPTION_META } from '../types'
import dayjs from 'dayjs'
import { saveAs } from 'file-saver'

export function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  saveAs(blob, filename)
}

export function downloadText(text: string, filename: string, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type })
  saveAs(blob, filename)
}

export function generateInternalReport(
  session: Session,
  productLine: ProductLine | undefined,
  anchor: Anchor | undefined,
  reviewer = '当前审核员',
): string {
  const lines: string[] = []
  lines.push('='.repeat(60))
  lines.push('【内部证据版】直播商品讲解违规审查报告')
  lines.push('='.repeat(60))
  lines.push('')
  lines.push(`场次标题：${session.title}`)
  lines.push(`商品线：${productLine?.name ?? '-'}`)
  lines.push(`主播：${anchor?.name ?? '-'}`)
  lines.push(`直播日期：${session.liveDate}`)
  lines.push(`审查员：${reviewer}`)
  lines.push(`审查时间：${dayjs().format('YYYY-MM-DD HH:mm:ss')}`)
  lines.push(`场次状态：${session.status}`)
  lines.push('')

  const confirmedV = session.violations.filter(v => !v.exemption)
  const exemptedV = session.violations.filter(v => v.exemption)
  lines.push(`违规总数：${session.violations.length}`)
  lines.push(`确认违规（待整改）：${confirmedV.length}`)
  lines.push(`标记豁免（人工确认）：${exemptedV.length}`)
  lines.push('')
  lines.push('-'.repeat(60))
  lines.push('【表1：确认违规清单（需整改）】')
  lines.push('-'.repeat(60))
  lines.push('')

  if (confirmedV.length === 0) {
    lines.push('（本场次无确认违规）')
  } else {
    confirmedV.forEach((v, i) => {
      const meta = VIOLATION_META[v.type]
      const sev = SEVERITY_META[v.severity]
      lines.push(`#${i + 1} [第${v.lineNumber}行] ${meta.label}（严重度：${sev.label}）`)
      lines.push(`  匹配词：${v.matchedKeyword}`)
      lines.push(`  原句截取："${v.originalText}"`)
      lines.push(`  规则依据：${v.ruleBasis}`)
      lines.push(`  整改建议：${v.suggestion}`)
      if (v.correction) {
        lines.push(`  整改方案：${v.correction.correctedText || '(未填写)'}`)
        lines.push(`  审核备注：${v.correction.reviewerNote || '-'}`)
        lines.push(`  整改状态：${v.correction.isDone ? '✅ 已完成' : '⏳ 待整改'}`)
      } else {
        lines.push(`  整改状态：⏳ 未提交整改方案`)
      }
      lines.push('')
    })
  }

  lines.push('')
  lines.push('-'.repeat(60))
  lines.push('【表2：豁免清单（人工确认）】')
  lines.push('-'.repeat(60))
  lines.push('')

  if (exemptedV.length === 0) {
    lines.push('（本场次无豁免记录）')
  } else {
    exemptedV.forEach((v, i) => {
      const meta = VIOLATION_META[v.type]
      const exemptMeta = v.exemption ? EXEMPTION_META[v.exemption.reason] : null
      lines.push(`#${i + 1} [第${v.lineNumber}行] ${meta.label}`)
      lines.push(`  原句截取："${v.originalText}"`)
      lines.push(`  豁免类型：${exemptMeta?.icon} ${exemptMeta?.label}（${v.exemption?.reason}）`)
      lines.push(`  豁免说明：${v.exemption?.note || '-'}`)
      lines.push(`  确认人：${v.exemption?.reviewer || '-'}`)
      lines.push('')
    })
  }

  lines.push('')
  lines.push('='.repeat(60))
  lines.push('【附录：完整原文（带行号）】')
  lines.push('='.repeat(60))
  lines.push('')

  const transcriptLines = session.transcript.split('\n')
  const violationByLine = new Map<number, typeof confirmedV>()
  session.violations.forEach(v => {
    if (!violationByLine.has(v.lineNumber)) violationByLine.set(v.lineNumber, [])
    if (!v.exemption) {
      violationByLine.get(v.lineNumber)!.push(v as any)
    }
  })

  transcriptLines.forEach((line, idx) => {
    const ln = idx + 1
    const vs = violationByLine.get(ln) || []
    const flag = vs.length > 0 ? ` ⚠️${vs.length}处违规` : ''
    lines.push(`${String(ln).padStart(4, '0')}${flag}｜${line}`)
  })

  lines.push('')
  lines.push(`—— 报告生成于 ${dayjs().format('YYYY-MM-DD HH:mm:ss')} ——`)
  return lines.join('\n')
}

export function generateAnchorChecklist(
  session: Session,
  anchor: Anchor | undefined,
): string {
  const lines: string[] = []
  lines.push('▌直播讲解整改清单')
  lines.push('▌主播版')
  lines.push('')
  lines.push(`主播姓名：${anchor?.name ?? '-'}`)
  lines.push(`直播场次：${session.title}`)
  lines.push(`直播日期：${session.liveDate}`)
  lines.push(`清单生成时间：${dayjs().format('YYYY-MM-DD')}`)
  lines.push('')

  const todo = session.violations.filter(v => !v.exemption)

  lines.push(`本次共发现 ${todo.length} 项问题，请逐条整改确认：`)
  lines.push('')
  lines.push('━'.repeat(40))

  if (todo.length === 0) {
    lines.push('🎉 本场次无违规问题，继续保持！')
  } else {
    todo.forEach((v, i) => {
      const meta = VIOLATION_META[v.type]
      lines.push('')
      lines.push(`【${i + 1}】${meta.label}`)
      lines.push(`  ❌ 你的原话：「${v.originalText}」`)
      lines.push(`  ✅ 整改要求：${v.suggestion}`)
      if (v.correction?.correctedText) {
        lines.push(`  📝 参考说法：「${v.correction.correctedText}」`)
      }
      lines.push(`  ☐ 我已知晓并将整改`)
    })
  }

  lines.push('')
  lines.push('━'.repeat(40))
  lines.push('')
  lines.push('主播签字：________________    日期：___________')
  lines.push('整改截止日期：' + dayjs().add(3, 'day').format('YYYY-MM-DD'))
  lines.push('')
  lines.push(`—— 清单编号：${session.id.toUpperCase()} ——`)
  return lines.join('\n')
}

export interface ReminderSheetData {
  productLine: ProductLine
  recentSessions: Session[]
  topViolations: { type: keyof typeof VIOLATION_META; count: number }[]
  frequentKeywords: string[]
}

export function generateReminderSheet(data: ReminderSheetData): string {
  const { productLine, recentSessions, topViolations, frequentKeywords } = data
  const lines: string[] = []

  lines.push('═'.repeat(52))
  lines.push(`          ${productLine.name} · 开播重点提醒单`)
  lines.push('═'.repeat(52))
  lines.push(`生成时间：${dayjs().format('YYYY年MM月DD日')}    商品线：${productLine.name}`)
  lines.push(`统计范围：近 ${recentSessions.length} 场直播`)
  lines.push('')

  lines.push('▎TOP 3 高频违规（本场务必注意）')
  lines.push('─'.repeat(52))
  topViolations.slice(0, 3).forEach((tv, i) => {
    const meta = VIOLATION_META[tv.type]
    lines.push(`${['🔴', '🟠', '🟡'][i]} 第${i + 1}名：${meta.label}（${tv.count}次）`)
    lines.push(`   典型错误：绝对化/疗效承诺，易被投诉下架`)
    lines.push(`   应对原则：${defaultPrincipleFor(tv.type)}`)
    lines.push('')
  })

  lines.push('')
  lines.push('▎重点禁用词速查表')
  lines.push('─'.repeat(52))
  const kwLine = frequentKeywords.slice(0, 20).join('  ❌  ')
  lines.push(`❌ ${kwLine}  ❌ ……`)
  lines.push('')

  lines.push('')
  lines.push('▎典型错误 vs 合规说法对照')
  lines.push('─'.repeat(52))
  lines.push('')
  lines.push('  ❌ 错误说法              ✅ 正确说法')
  lines.push('  ─────────────────────────────────────')
  lines.push('  "全网最低价"          → "本店促销价，限时3天"')
  lines.push('  "100%美白，根治色斑"   → "坚持使用有助于提亮肤色"')
  lines.push('  "治疗便秘，立竿见影"   → "有助于肠道健康蠕动"')
  lines.push('  "最好的，顶级面料"     → "优质面料，亲肤舒适"')
  lines.push('  "免费送！"（不讲规则）  → "关注+评论，明天6点抽20份"')
  lines.push('  "用了就好，包治百病"   → "效果因人而异，建议坚持使用"')
  lines.push('')

  lines.push('')
  lines.push('▎开播自查 Checklist（开播前默念一遍）')
  lines.push('─'.repeat(52))
  lines.push('   ☐ 不说"最"字系列：最、第一、顶级、唯一、100%')
  lines.push('   ☐ 不说医疗词：治疗、治愈、疗效、根治、消炎')
  lines.push('   ☐ 不说价格承诺：最低价、最便宜、买贵双倍退')
  lines.push('   ☐ 做活动讲清五要素：条件/名额/时间/奖品/开奖方式')
  lines.push('   ☐ 引用用户评价时明确说"这是用户的反馈"')
  lines.push('   ☐ 口误后立即纠正："哦不对，应该是..."')
  lines.push('')

  lines.push('')
  lines.push('═'.repeat(52))
  lines.push('   合规一句话：不说绝对，不说疗效，活动讲清楚')
  lines.push('═'.repeat(52))
  lines.push('')
  lines.push('合规负责人签字：_______________    日期：___________')

  return lines.join('\n')
}

function defaultPrincipleFor(type: keyof typeof VIOLATION_META): string {
  switch (type) {
    case 'ABSOLUTE_WORD': return '删除最/第一/顶级，改用优质/优选/推荐'
    case 'MEDICAL_IMPLICATION': return '严禁治疗/根治/疗效，改用改善/帮助调理'
    case 'FORBIDDEN_EFFECT': return '非特证产品不提美白/祛斑/减肥/丰胸'
    case 'PRICE_PROMISE': return '不称最低/最便宜，标明促销价+期限'
    case 'UNCLEAR_LOTTERY': return '做活动一定讲清条件/时间/名额/开奖方式'
    case 'EXAGGERATION': return '不喊疯抢/秒没/闭眼入，客观描述卖点'
    default: return '谨慎表述，有疑问先问合规'
  }
}

export function exportInternalReport(session: Session, pl?: ProductLine, anchor?: Anchor) {
  const text = generateInternalReport(session, pl, anchor)
  const safeTitle = session.title.replace(/[\\/:*?"<>|]/g, '_')
  downloadText(text, `【内部证据版】${safeTitle}_${dayjs().format('YYYYMMDD')}.txt`)
}

export function exportAnchorChecklist(session: Session, anchor?: Anchor) {
  const text = generateAnchorChecklist(session, anchor)
  const safeTitle = session.title.replace(/[\\/:*?"<>|]/g, '_')
  downloadText(text, `【主播整改清单】${safeTitle}_${dayjs().format('YYYYMMDD')}.txt`)
}

export function exportReminderSheet(data: ReminderSheetData) {
  const text = generateReminderSheet(data)
  downloadText(text, `【开播重点提醒】${data.productLine.name}_${dayjs().format('YYYYMMDD')}.txt`)
}

export function exportSessionBackup(session: Session) {
  downloadJSON(session, `session_backup_${session.id}_${dayjs().format('YYYYMMDD_HHmmss')}.json`)
}
