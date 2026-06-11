import type { SuspicionTag, SuspicionType, EvidenceSentence, UrgencyLevel } from '../../shared/types'
import { uuid } from '../db/database'

interface ExtractedInfo {
  community: string | null
  building: string | null
  roomNumber: string | null
  problemType: string | null
  urgency: UrgencyLevel | null
  callbackSentence: string | null
  evidenceSentences: EvidenceSentence[]
  suspicions: SuspicionTag[]
}

const UNCLEAR_KEYWORDS = ['听不清', '好像', '大概', '可能', '也许', '差不多', '呃', '嗯', '那个', '那个什么', '?', '？']
const MULTIPLE_PROBLEM_CONNECTORS = ['还有', '另外', '再就是', '以及', '还有个']
const PROBLEM_CATEGORIES: Record<string, string[]> = {
  plumbing: ['水管', '漏水', '渗水', '堵塞', '水龙头', '热水', '下水', '地漏', '反水', '管道'],
  electrical: ['电', '电路', '跳闸', '停电', '灯', '灯泡', '灯管'],
  door: ['门', '门锁', '门禁'],
  elevator: ['电梯'],
  wall: ['墙', '裂缝'],
  window: ['窗', '窗户'],
  lock: ['锁']
}

const NICKNAME_PATTERNS = [
  /老[王李张刘陈赵周吴徐孙朱马胡郭林何高梁郑罗宋谢唐韩曹许邓萧冯曾程蔡彭潘袁于董余苏叶吕魏蒋田杜丁沈姜范江傅钟卢汪戴崔任陆廖姚方金邱夏谭韦贾邹石熊孟秦阎薛侯雷白龙段郝孔邵史毛常万顾赖武康贺严尹钱施牛洪龚]/,
  /[王李张刘陈赵周吴徐孙朱马胡郭林何高梁郑罗宋谢唐韩曹许邓萧冯曾程蔡彭潘袁于董余苏叶吕魏蒋田杜丁沈姜范江傅钟卢汪戴崔任陆廖姚方金邱夏谭韦贾邹石熊孟秦阎薛侯雷白龙段郝孔邵史毛常万顾赖武康贺严尹钱施牛洪龚][阿姨叔大爷姐哥嫂婶舅]$/
]

const checkUnclear = (text: string): SuspicionTag | null => {
  for (const kw of UNCLEAR_KEYWORDS) {
    if (text.includes(kw)) {
      return {
        id: uuid.v4(),
        type: 'unclear',
        description: `检测到不确定的表述"${kw}"，可能存在听不清或疑似错字`,
        sourceText: kw,
        resolved: false,
        resolverNote: null
      }
    }
  }
  return null
}

const checkMultiple = (text: string): SuspicionTag | null => {
  const foundCategories = new Set<string>()
  for (const [category, keywords] of Object.entries(PROBLEM_CATEGORIES)) {
    for (const kw of keywords) {
      if (text.includes(kw)) {
        foundCategories.add(category)
        break
      }
    }
  }

  const hasConnector = MULTIPLE_PROBLEM_CONNECTORS.some(c => text.includes(c))

  if (foundCategories.size >= 2 || (foundCategories.size >= 1 && hasConnector)) {
    const count = Math.max(foundCategories.size, 2)
    return {
      id: uuid.v4(),
      type: 'multiple',
      description: `检测到${count}个问题或多问题连接词，可能是同一通话多问题`,
      sourceText: text,
      resolved: false,
      resolverNote: null
    }
  }

  return null
}

const checkNickname = (text: string): SuspicionTag | null => {
  for (const pattern of NICKNAME_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      return {
        id: uuid.v4(),
        type: 'nickname',
        description: `检测到称呼"${match[0]}"，可能是住户外号，建议确认真实姓名`,
        sourceText: match[0],
        resolved: false,
        resolverNote: null
      }
    }
  }
  return null
}

const checkDateAmbiguous = (text: string, extracted: ExtractedInfo): SuspicionTag | null => {
  const roomNumber = extracted.roomNumber
  if (!roomNumber) return null

  const datePatterns = [
    { regex: /(\d{1,2})\/(\d{1,2})/, desc: '斜杠分隔' },
    { regex: /(\d{1,2})\.(\d{1,2})/, desc: '点号分隔' },
    { regex: /(\d{1,2})-(\d{1,2})/, desc: '横线分隔' },
    { regex: /(\d{1,2})月(\d{1,2})[日号]?/, desc: '月日格式' }
  ]

  for (const { regex, desc } of datePatterns) {
    const match = roomNumber?.match(regex) || text.match(regex)
    if (match) {
      return {
        id: uuid.v4(),
        type: 'date_ambiguous',
        description: `检测到${desc}的数字格式"${match[0]}"，可能是日期而非房号`,
        sourceText: match[0],
        resolved: false,
        resolverNote: null
      }
    }
  }
  return null
}

export const detectSuspicions = (text: string, extracted: ExtractedInfo): SuspicionTag[] => {
  const tags: SuspicionTag[] = []

  const unclear = checkUnclear(text)
  if (unclear) tags.push(unclear)

  const multiple = checkMultiple(text)
  if (multiple) tags.push(multiple)

  const nickname = checkNickname(text)
  if (nickname) tags.push(nickname)

  const dateAmbiguous = checkDateAmbiguous(text, extracted)
  if (dateAmbiguous) tags.push(dateAmbiguous)

  return tags
}
