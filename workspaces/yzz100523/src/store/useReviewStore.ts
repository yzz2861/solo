import { create } from 'zustand'
import type {
  Session, Violation, ExemptionReason, Correction,
  ProductLine, Anchor, SessionStatus,
} from '../types'
import { MOCK_PRODUCT_LINES, MOCK_ANCHORS, MOCK_SESSIONS_RAW, generateId } from '../data/mockData'
import { detectViolations } from '../lib/detectionEngine'
import type { DetectionMatch } from '../types'

interface ReviewState {
  sessions: Session[]
  productLines: ProductLine[]
  anchors: Anchor[]

  initMockIfNeeded: () => void
  getSession: (id: string) => Session | undefined
  getSessionsByProductLine: (plId: string) => Session[]
  getSessionsByAnchor: (anchorId: string) => Session[]

  createSession: (data: {
    title: string
    productLineId: string
    anchorId: string
    liveDate: string
    transcript: string
    runDetection?: boolean
  }) => Session

  runDetection: (sessionId: string) => Violation[]
  markViolationReviewed: (sessionId: string, violationId: string) => void
  setViolationExemption: (
    sessionId: string,
    violationId: string,
    reason: ExemptionReason | null,
    note?: string,
  ) => void
  setViolationCorrection: (
    sessionId: string,
    violationId: string,
    data: Partial<Correction> & { isDone?: boolean },
  ) => void
  updateSessionStatus: (sessionId: string, status: SessionStatus) => void
  setRecheckPassed: (sessionId: string, passed: boolean) => void
  saveSession: (sessionId: string) => void

  addViolation: (sessionId: string, violation: Omit<Violation, 'id' | 'sessionId' | 'reviewed'>) => void
  removeViolation: (sessionId: string, violationId: string) => void
  resetViolations: (sessionId: string) => void
}

const STORAGE_KEY = 'compliance-review:data'

function loadState(): Partial<ReviewState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function persistState(state: { sessions: Session[] }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions: state.sessions }))
  } catch {}
}

function matchToViolation(sessionId: string, m: DetectionMatch): Violation {
  return {
    id: generateId(),
    sessionId,
    type: m.type,
    severity: m.severity,
    originalText: m.originalText,
    matchedKeyword: m.matchedKeyword,
    startOffset: m.startOffset,
    endOffset: m.endOffset,
    lineNumber: m.lineNumber,
    ruleBasis: m.ruleBasis,
    suggestion: m.suggestion,
    reviewed: m.contextScore < 0.7,
    exemption: undefined,
    correction: undefined,
  }
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  sessions: [],
  productLines: MOCK_PRODUCT_LINES,
  anchors: MOCK_ANCHORS,

  // 初始化时自动加载Mock数据
  ...(() => {
    // 立即在模块加载时初始化mock
    setTimeout(() => {
      const state = loadState()
      if (!state?.sessions || state.sessions.length === 0) {
        // 初始化Mock数据并直接注入
        const sessions: Session[] = MOCK_SESSIONS_RAW.map(raw => {
          const matches = detectViolations(raw.transcript)
          const violations = matches.map(m => matchToViolation(raw.id, m))

          if (raw.status === 'COMPLETED') {
            violations.forEach((v, idx) => {
              v.reviewed = true
              if (idx % 7 === 2) {
                v.exemption = {
                  id: generateId(),
                  reason: 'JOKE',
                  note: '上下文中明显是玩笑，紧接着有纠正',
                  reviewer: '合规-小王',
                  createdAt: new Date().toISOString(),
                }
              } else if (idx % 7 === 3) {
                v.exemption = {
                  id: generateId(),
                  reason: 'USER_REVIEW',
                  note: '引用用户评论，非主播承诺',
                  reviewer: '合规-小王',
                  createdAt: new Date().toISOString(),
                }
              } else if (idx % 7 === 4) {
                v.exemption = {
                  id: generateId(),
                  reason: 'SLIP_OF_TONGUE',
                  note: '紧接着有自我纠正，属于口误',
                  reviewer: '合规-小王',
                  createdAt: new Date().toISOString(),
                }
              } else {
                v.correction = {
                  id: generateId(),
                  correctedText: v.suggestion,
                  reviewerNote: '按建议整改',
                  isDone: true,
                  updatedAt: new Date().toISOString(),
                }
              }
            })
          }

          if (raw.status === 'PENDING_CORRECTION') {
            violations.forEach((v, idx) => {
              v.reviewed = true
              if (idx % 6 === 2) {
                v.exemption = {
                  id: generateId(),
                  reason: 'BRAND_COPY',
                  note: '品牌方提供的官方文案，已转交品牌合规核实',
                  reviewer: '合规-小李',
                  createdAt: new Date().toISOString(),
                }
              }
            })
          }

          return {
            ...raw,
            violations,
            createdAt: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
            updatedAt: new Date(Date.now() - Math.random() * 2 * 86400000).toISOString(),
          }
        })
        persistState({ sessions })
        useReviewStore.setState({ sessions })
      } else {
        useReviewStore.setState({ sessions: state.sessions })
      }
    }, 0)
    return {}
  })(),

  initMockIfNeeded: () => {
    const existing = loadState()
    if (existing?.sessions && existing.sessions.length > 0) {
      set({ sessions: existing.sessions })
      return
    }

    const sessions: Session[] = MOCK_SESSIONS_RAW.map(raw => {
      const matches = detectViolations(raw.transcript)
      const violations = matches.map(m => matchToViolation(raw.id, m))

      // For completed session, simulate some exemptions + corrections
      if (raw.status === 'COMPLETED') {
        violations.forEach((v, idx) => {
          v.reviewed = true
          if (idx % 7 === 2) {
            v.exemption = {
              id: generateId(),
              reason: 'JOKE',
              note: '上下文中明显是玩笑，紧接着有纠正',
              reviewer: '合规-小王',
              createdAt: new Date().toISOString(),
            }
          } else if (idx % 7 === 3) {
            v.exemption = {
              id: generateId(),
              reason: 'USER_REVIEW',
              note: '引用用户评论，非主播承诺',
              reviewer: '合规-小王',
              createdAt: new Date().toISOString(),
            }
          } else if (idx % 7 === 4) {
            v.exemption = {
              id: generateId(),
              reason: 'SLIP_OF_TONGUE',
              note: '紧接着有自我纠正，属于口误',
              reviewer: '合规-小王',
              createdAt: new Date().toISOString(),
            }
          } else {
            v.correction = {
              id: generateId(),
              correctedText: v.suggestion,
              reviewerNote: '按建议整改',
              isDone: true,
              updatedAt: new Date().toISOString(),
            }
          }
        })
      }

      // For pending correction, mark all reviewed but no corrections yet
      if (raw.status === 'PENDING_CORRECTION') {
        violations.forEach((v, idx) => {
          v.reviewed = true
          if (idx % 6 === 2) {
            v.exemption = {
              id: generateId(),
              reason: 'BRAND_COPY',
              note: '品牌方提供的官方文案，已转交品牌合规核实',
              reviewer: '合规-小李',
              createdAt: new Date().toISOString(),
            }
          }
        })
      }

      return {
        ...raw,
        violations,
        createdAt: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - Math.random() * 2 * 86400000).toISOString(),
      }
    })

    set({ sessions })
    persistState({ sessions })
  },

  getSession: (id) => get().sessions.find(s => s.id === id),
  getSessionsByProductLine: (plId) => get().sessions.filter(s => s.productLineId === plId),
  getSessionsByAnchor: (anchorId) => get().sessions.filter(s => s.anchorId === anchorId),

  createSession: (data) => {
    const now = new Date().toISOString()
    const session: Session = {
      id: generateId(),
      title: data.title,
      productLineId: data.productLineId,
      anchorId: data.anchorId,
      liveDate: data.liveDate,
      transcript: data.transcript,
      status: 'REVIEWING',
      violations: [],
      createdAt: now,
      updatedAt: now,
    }
    if (data.runDetection) {
      session.violations = detectViolations(data.transcript).map(m => matchToViolation(session.id, m))
    }
    set(s => ({ sessions: [session, ...s.sessions] }))
    persistState(get())
    return session
  },

  runDetection: (sessionId) => {
    const session = get().getSession(sessionId)
    if (!session) return []
    const violations = detectViolations(session.transcript).map(m => matchToViolation(sessionId, m))
    set(s => ({
      sessions: s.sessions.map(ss => ss.id === sessionId ? {
        ...ss,
        violations,
        status: 'REVIEWING',
        updatedAt: new Date().toISOString(),
      } : ss),
    }))
    persistState(get())
    return violations
  },

  markViolationReviewed: (sessionId, violationId) => {
    set(s => ({
      sessions: s.sessions.map(ss => ss.id === sessionId ? {
        ...ss,
        updatedAt: new Date().toISOString(),
        violations: ss.violations.map(v => v.id === violationId ? { ...v, reviewed: true } : v),
      } : ss),
    }))
  },

  setViolationExemption: (sessionId, violationId, reason, note = '') => {
    set(s => ({
      sessions: s.sessions.map(ss => ss.id === sessionId ? {
        ...ss,
        updatedAt: new Date().toISOString(),
        violations: ss.violations.map(v => {
          if (v.id !== violationId) return v
          return {
            ...v,
            reviewed: true,
            exemption: reason ? {
              id: generateId(),
              reason,
              note,
              reviewer: '当前审核员',
              createdAt: new Date().toISOString(),
            } : undefined,
          }
        }),
      } : ss),
    }))
  },

  setViolationCorrection: (sessionId, violationId, data) => {
    set(s => ({
      sessions: s.sessions.map(ss => ss.id === sessionId ? {
        ...ss,
        updatedAt: new Date().toISOString(),
        violations: ss.violations.map(v => {
          if (v.id !== violationId) return v
          const existing = v.correction
          return {
            ...v,
            reviewed: true,
            correction: {
              id: existing?.id ?? generateId(),
              correctedText: data.correctedText ?? existing?.correctedText ?? '',
              reviewerNote: data.reviewerNote ?? existing?.reviewerNote ?? '',
              isDone: data.isDone ?? existing?.isDone ?? false,
              updatedAt: new Date().toISOString(),
            },
          }
        }),
      } : ss),
    }))
  },

  updateSessionStatus: (sessionId, status) => {
    set(s => ({
      sessions: s.sessions.map(ss => ss.id === sessionId ? {
        ...ss,
        status,
        updatedAt: new Date().toISOString(),
      } : ss),
    }))
    persistState(get())
  },

  setRecheckPassed: (sessionId, passed) => {
    set(s => ({
      sessions: s.sessions.map(ss => ss.id === sessionId ? {
        ...ss,
        recheckPassed: passed,
        status: passed ? 'COMPLETED' : 'PENDING_CORRECTION',
        updatedAt: new Date().toISOString(),
      } : ss),
    }))
    persistState(get())
  },

  saveSession: (sessionId) => {
    const s = get()
    const session = s.getSession(sessionId)
    if (!session) return

    // Auto-determine status based on violation states
    const totalNonExempt = session.violations.filter(v => !v.exemption).length
    const correctedCount = session.violations.filter(v => !v.exemption && v.correction?.isDone).length
    const reviewedCount = session.violations.filter(v => v.reviewed).length

    let status: SessionStatus = session.status
    if (reviewedCount < session.violations.length) {
      status = 'REVIEWING'
    } else if (totalNonExempt > correctedCount) {
      status = 'PENDING_CORRECTION'
    } else if (totalNonExempt === correctedCount && reviewedCount === session.violations.length) {
      status = 'COMPLETED'
    }

    set(ss => ({
      sessions: ss.sessions.map(x => x.id === sessionId ? {
        ...session,
        status,
        updatedAt: new Date().toISOString(),
      } : x),
    }))
    persistState(get())
  },

  addViolation: (sessionId, violation) => {
    const newV: Violation = {
      ...violation,
      id: generateId(),
      sessionId,
      reviewed: true,
    }
    set(s => ({
      sessions: s.sessions.map(ss => ss.id === sessionId ? {
        ...ss,
        updatedAt: new Date().toISOString(),
        violations: [...ss.violations, newV].sort((a, b) => a.startOffset - b.startOffset),
      } : ss),
    }))
  },

  removeViolation: (sessionId, violationId) => {
    set(s => ({
      sessions: s.sessions.map(ss => ss.id === sessionId ? {
        ...ss,
        updatedAt: new Date().toISOString(),
        violations: ss.violations.filter(v => v.id !== violationId),
      } : ss),
    }))
  },

  resetViolations: (sessionId) => {
    set(s => ({
      sessions: s.sessions.map(ss => ss.id === sessionId ? {
        ...ss,
        violations: [],
        status: 'PENDING',
        updatedAt: new Date().toISOString(),
      } : ss),
    }))
    persistState(get())
  },
}))
