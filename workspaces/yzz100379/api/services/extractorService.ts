import type { UrgencyLevel, EvidenceSentence, SuspicionTag } from '../../shared/types'
import { uuid } from '../db/database'
import { PROBLEM_TYPES } from '../../shared/types'

const COMMUNITY_PATTERN = /(?:^|[\s，,。！!?？、的是住在我叫])([\u4e00-\u9fa5A-Za-z]{2,8}?)(小区|花园|苑|园|府|里|庭)/
const BUILDING_PATTERNS = [
  /第(\d+)(栋|号楼|幢|座)/,
  /(\d+)\s*(栋|号楼|幢|座)/
]
const ROOM_PATTERNS = [
  /(\d+)单元\s*(\d+)(?:室|号)?/,
  /(\d{1,2})[-\s](\d{2,3})(?:室|号)?/,
  /(\d{3,4})\s*(室|号房|房)?/
]

const PROBLEM_KEYWORD_MAP: Record<string, string> = {
  '水管': '水管漏水',
  '漏水': '水管漏水',
  '渗水': '水管漏水',
  '管道': '水管堵塞',
  '堵塞': '水管堵塞',
  '不通': '水管堵塞',
  '水龙头': '水龙头损坏',
  '龙头': '水龙头损坏',
  '热水': '热水器故障',
  '热水器': '热水器故障',
  '电': '电路跳闸',
  '电路': '电路跳闸',
  '跳闸': '电路跳闸',
  '停电': '电路跳闸',
  '灯': '灯具损坏',
  '灯泡': '灯具损坏',
  '灯管': '灯具损坏',
  '门': '门锁损坏',
  '门锁': '门锁损坏',
  '门禁': '门禁故障',
  '电梯': '电梯故障',
  '墙': '墙体开裂',
  '裂缝': '墙体开裂',
  '窗': '窗户损坏',
  '窗户': '窗户损坏',
  '下水': '下水道堵塞',
  '下水道': '下水道堵塞',
  '地漏': '下水道堵塞',
  '反水': '下水道堵塞'
}

const HIGH_URGENCY_KEYWORDS = ['马上', '赶紧', '现在就要', '很急', '紧急', '爆了', '淹了']
const MEDIUM_URGENCY_KEYWORDS = ['尽快', '今天', '快点']

const CALLBACK_KEYWORDS = ['请回电', '麻烦联系', '回个电话', '联系我', '打给我']

const splitSentences = (text: string): string[] => {
  return text.split(/[。！？.!?\n]+/).map(s => s.trim()).filter(s => s.length > 0)
}

const findSentenceContaining = (text: string, keyword: string): string | null => {
  const sentences = splitSentences(text)
  for (const sentence of sentences) {
    if (sentence.includes(keyword)) {
      return sentence
    }
  }
  return keyword
}

export interface ExtractionResult {
  community: string | null
  building: string | null
  roomNumber: string | null
  problemType: string | null
  urgency: UrgencyLevel | null
  callbackSentence: string | null
  evidenceSentences: EvidenceSentence[]
  suspicions: SuspicionTag[]
}

const extractCommunity = (text: string): { value: string | null; evidence: string | null } => {
  const match = text.match(COMMUNITY_PATTERN)
  if (match) {
    let namePart = match[1]
    namePart = namePart.replace(/^(的|是|在|住|叫|我|你|他|她|我们|你们|他们)+/g, '')
    const value = namePart + match[2]
    if (namePart.length >= 2) {
      return { value, evidence: value }
    }
  }
  return { value: null, evidence: null }
}

const extractBuilding = (text: string): { value: string | null; evidence: string | null } => {
  for (const pattern of BUILDING_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      const num = match[1]
      return { value: `${num}号楼`, evidence: match[0] }
    }
  }
  return { value: null, evidence: null }
}

const extractRoomNumber = (text: string): { value: string | null; evidence: string | null } => {
  for (const pattern of ROOM_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      if (pattern.toString().includes('单元') && match[1] && match[2]) {
        return { value: `${match[1]}单元${match[2]}室`, evidence: match[0] }
      }
      if (pattern.toString().includes('[\\-\\s]') && match[1] && match[2]) {
        const room = `${match[1]}${match[2].padStart(2, '0')}`
        return { value: `${room}室`, evidence: match[0] }
      }
      if (match[1]) {
        const raw = match[1]
        const suffix = match[2] || ''
        if (suffix) {
          return { value: raw + suffix, evidence: match[0] }
        }
        return { value: `${raw}室`, evidence: match[0] }
      }
    }
  }
  return { value: null, evidence: null }
}

const extractProblemType = (text: string): { value: string | null; evidence: string | null } => {
  for (const [keyword, problemType] of Object.entries(PROBLEM_KEYWORD_MAP)) {
    if (text.includes(keyword)) {
      return { value: problemType, evidence: keyword }
    }
  }
  for (const problemType of PROBLEM_TYPES) {
    if (text.includes(problemType)) {
      return { value: problemType, evidence: problemType }
    }
  }
  return { value: null, evidence: null }
}

const extractUrgency = (text: string): { value: UrgencyLevel | null; evidence: string | null } => {
  for (const kw of HIGH_URGENCY_KEYWORDS) {
    if (text.includes(kw)) {
      return { value: 'high', evidence: kw }
    }
  }
  for (const kw of MEDIUM_URGENCY_KEYWORDS) {
    if (text.includes(kw)) {
      return { value: 'medium', evidence: kw }
    }
  }
  return { value: 'low', evidence: null }
}

const extractCallbackSentence = (text: string): string | null => {
  const sentences = splitSentences(text)
  for (const sentence of sentences) {
    for (const kw of CALLBACK_KEYWORDS) {
      if (sentence.includes(kw)) {
        return sentence
      }
    }
  }
  return null
}

export const extractInfo = (text: string): ExtractionResult => {
  const evidenceSentences: EvidenceSentence[] = []

  const communityResult = extractCommunity(text)
  if (communityResult.value) {
    evidenceSentences.push({
      id: uuid.v4(),
      original: findSentenceContaining(text, communityResult.evidence || communityResult.value) || communityResult.value,
      corrected: null,
      field: 'community'
    })
  }

  const buildingResult = extractBuilding(text)
  if (buildingResult.value) {
    evidenceSentences.push({
      id: uuid.v4(),
      original: findSentenceContaining(text, buildingResult.evidence || buildingResult.value) || buildingResult.value,
      corrected: null,
      field: 'building'
    })
  }

  const roomResult = extractRoomNumber(text)
  if (roomResult.value) {
    evidenceSentences.push({
      id: uuid.v4(),
      original: findSentenceContaining(text, roomResult.evidence || roomResult.value) || roomResult.value,
      corrected: null,
      field: 'roomNumber'
    })
  }

  const problemResult = extractProblemType(text)
  if (problemResult.value) {
    evidenceSentences.push({
      id: uuid.v4(),
      original: findSentenceContaining(text, problemResult.evidence || problemResult.value) || problemResult.value,
      corrected: null,
      field: 'problemType'
    })
  }

  const urgencyResult = extractUrgency(text)
  if (urgencyResult.evidence) {
    evidenceSentences.push({
      id: uuid.v4(),
      original: findSentenceContaining(text, urgencyResult.evidence) || urgencyResult.evidence,
      corrected: null,
      field: 'urgency'
    })
  }

  const callbackSentence = extractCallbackSentence(text)
  if (callbackSentence) {
    evidenceSentences.push({
      id: uuid.v4(),
      original: callbackSentence,
      corrected: null,
      field: 'callbackSentence'
    })
  }

  return {
    community: communityResult.value,
    building: buildingResult.value,
    roomNumber: roomResult.value,
    problemType: problemResult.value,
    urgency: urgencyResult.value,
    callbackSentence,
    evidenceSentences,
    suspicions: []
  }
}

export const generateShortMessage = (extraction: Omit<ExtractionResult, 'suspicions'>): string => {
  const parts: string[] = []

  if (extraction.community) parts.push(extraction.community)
  if (extraction.building) parts.push(extraction.building)
  if (extraction.roomNumber) parts.push(extraction.roomNumber)
  if (extraction.problemType) parts.push(extraction.problemType)

  if (parts.length === 0) {
    return '请查看工单详情'
  }

  const urgencyText = extraction.urgency === 'high' ? '【紧急】' :
                      extraction.urgency === 'medium' ? '【尽快】' : ''

  return `${urgencyText}${parts.join(' ')}`
}
