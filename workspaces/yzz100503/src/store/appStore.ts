import { create } from 'zustand'
import type {
  Customer,
  Tape,
  Alert,
  AppData,
  VideoSegment,
  DamageSpot,
  RepairRequest,
  TapeStatus,
  RoleView
} from '@/types'
import { generateId } from '@/utils'

const DATA_FILENAME = 'family-video-archiver-data.json'
const DATA_VERSION = '1.0.0'

interface AppStore {
  customers: Customer[]
  tapes: Tape[]
  alerts: Alert[]
  currentRole: RoleView
  selectedTapeId: string | null
  isLoading: boolean
  initialized: boolean

  init: () => Promise<void>
  saveData: () => Promise<void>

  setCurrentRole: (role: RoleView) => void
  setSelectedTapeId: (id: string | null) => void

  addCustomer: (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Customer
  updateCustomer: (id: string, data: Partial<Customer>) => void
  deleteCustomer: (id: string) => void
  getCustomer: (id: string) => Customer | undefined

  addTape: (data: Omit<Tape, 'id' | 'createdAt' | 'updatedAt' | 'damageSpots' | 'segments' | 'repairRequests' | 'transcriptionProgress'> & { damageSpots?: DamageSpot[]; segments?: VideoSegment[]; repairRequests?: RepairRequest[] }) => Tape
  updateTape: (id: string, data: Partial<Tape>) => void
  deleteTape: (id: string) => void
  getTape: (id: string) => Tape | undefined
  getTapesByCustomer: (customerId: string) => Tape[]
  setTapeStatus: (id: string, status: TapeStatus, progress?: number) => void

  addSegment: (tapeId: string, segment: Omit<VideoSegment, 'id'>) => VideoSegment
  updateSegment: (tapeId: string, segmentId: string, data: Partial<VideoSegment>) => void
  deleteSegment: (tapeId: string, segmentId: string) => void
  toggleStarSegment: (tapeId: string, segmentId: string) => void

  addDamageSpot: (tapeId: string, damage: Omit<DamageSpot, 'id'>) => DamageSpot
  updateDamageSpot: (tapeId: string, damageId: string, data: Partial<DamageSpot>) => void
  deleteDamageSpot: (tapeId: string, damageId: string) => void

  addRepairRequest: (tapeId: string, request: Omit<RepairRequest, 'id' | 'createdAt'>) => RepairRequest
  updateRepairRequest: (tapeId: string, requestId: string, data: Partial<RepairRequest>) => void
  deleteRepairRequest: (tapeId: string, requestId: string) => void

  addAlert: (alert: Omit<Alert, 'id' | 'createdAt' | 'read'>) => void
  markAlertRead: (id: string) => void
  markAllAlertsRead: () => void
  clearAlert: (id: string) => void
  clearAllAlerts: () => void

  checkDuplicateTapeNumber: (tapeNumber: string, excludeId?: string) => boolean
  getPendingSegments: () => { tape: Tape; segment: VideoSegment }[]
  getStarredSegments: () => { tape: Tape; segment: VideoSegment }[]
  getDeliverableTapes: () => Tape[]
}

function getSampleData(): AppData {
  const now = new Date().toISOString()
  const yesterday = new Date(Date.now() - 86400000).toISOString()
  const twoDaysAgo = new Date(Date.now() - 86400000 * 2).toISOString()

  const customer1 = {
    id: 'cust_demo_001',
    name: '张伟',
    phone: '13800138001',
    email: 'zhangwei@example.com',
    address: '北京市朝阳区幸福小区1号楼',
    notes: '老客户，对画质要求高',
    createdAt: twoDaysAgo,
    updatedAt: yesterday
  }

  const customer2 = {
    id: 'cust_demo_002',
    name: '李芳',
    phone: '13900139002',
    email: '',
    address: '',
    notes: '',
    createdAt: yesterday,
    updatedAt: yesterday
  }

  const tape1 = {
    id: 'tape_demo_001',
    tapeNumber: 'TAPE-2024-001',
    customerId: 'cust_demo_001',
    title: '张伟的婚礼录像',
    videoFilePath: '',
    outputFormat: 'mp4' as const,
    formatConfirmed: true,
    status: 'transcribing' as const,
    tapeType: 'VHS',
    duration: '01:45:30',
    damageSpots: [
      {
        id: 'dmg_demo_001',
        timeStart: '00:15:00',
        timeEnd: '00:15:30',
        description: '画面有雪花噪点，声音略失真',
        severity: 'mild' as const
      },
      {
        id: 'dmg_demo_002',
        timeStart: '00:42:10',
        timeEnd: '00:43:00',
        description: '磁粉脱落，画面严重抖动',
        severity: 'severe' as const
      }
    ],
    segments: [
      {
        id: 'seg_demo_001',
        name: '新人入场',
        description: '婚礼开场，新人步入礼堂',
        timeStart: '00:00:00',
        timeEnd: '00:05:20',
        starred: true,
        status: 'done' as const,
        category: '婚礼',
        orderIndex: 0
      },
      {
        id: 'seg_demo_002',
        name: '交换戒指',
        description: '最感人的时刻',
        timeStart: '00:18:30',
        timeEnd: '00:22:15',
        starred: true,
        status: 'done' as const,
        category: '婚礼',
        orderIndex: 1
      },
      {
        id: 'seg_demo_003',
        name: '父母致辞',
        description: '',
        timeStart: '00:30:00',
        timeEnd: '00:38:00',
        starred: false,
        status: 'processing' as const,
        category: '婚礼',
        orderIndex: 2
      },
      {
        id: 'seg_demo_004',
        name: '敬酒环节',
        description: '需要剪辑精简',
        timeStart: '00:55:00',
        timeEnd: '01:20:00',
        starred: false,
        status: 'pending' as const,
        category: '婚礼',
        orderIndex: 3
      }
    ],
    repairRequests: [
      {
        id: 'rep_demo_001',
        description: '去除00:42:10处的画面抖动',
        priority: 'high' as const,
        status: 'in_progress' as const,
        createdAt: yesterday
      },
      {
        id: 'rep_demo_002',
        description: '整体色彩校正，老带颜色偏黄',
        priority: 'medium' as const,
        status: 'pending' as const,
        createdAt: yesterday
      }
    ],
    deliveryMedium: 'usb' as const,
    deliveryNotes: '64G U盘，金色款',
    delivered: false,
    notes: '客户特别要求：婚礼仪式部分要单独剪出来，标星的片段要特别注意不要删',
    createdAt: twoDaysAgo,
    updatedAt: yesterday,
    transcriptionProgress: 67
  }

  const tape2 = {
    id: 'tape_demo_002',
    tapeNumber: 'TAPE-2024-002',
    customerId: 'cust_demo_001',
    title: '宝宝百天宴',
    videoFilePath: '',
    outputFormat: 'mov' as const,
    formatConfirmed: false,
    status: 'interrupted' as const,
    tapeType: 'Hi8',
    duration: '00:55:00',
    damageSpots: [],
    segments: [
      {
        id: 'seg_demo_005',
        name: '宝宝出场',
        description: '客户点名要保留',
        timeStart: '00:05:00',
        timeEnd: '00:10:00',
        starred: true,
        status: 'pending' as const,
        category: '生日',
        orderIndex: 0
      },
      {
        id: 'seg_demo_006',
        name: '吹蜡烛',
        description: '',
        timeStart: '00:25:30',
        timeEnd: '00:28:00',
        starred: true,
        status: 'pending' as const,
        category: '生日',
        orderIndex: 1
      }
    ],
    repairRequests: [],
    deliveryMedium: 'cloud' as const,
    deliveryNotes: '百度云盘分享',
    delivered: false,
    notes: '',
    createdAt: yesterday,
    updatedAt: yesterday,
    transcriptionProgress: 35
  }

  const tape3 = {
    id: 'tape_demo_003',
    tapeNumber: 'TAPE-2023-088',
    customerId: 'cust_demo_002',
    title: '2008年春节家庭聚会',
    videoFilePath: '',
    outputFormat: 'mp4' as const,
    formatConfirmed: true,
    status: 'completed' as const,
    tapeType: 'VHS',
    duration: '02:10:00',
    damageSpots: [
      {
        id: 'dmg_demo_003',
        timeStart: '01:05:00',
        timeEnd: '01:06:30',
        description: '画面轻微雪花',
        severity: 'mild' as const
      }
    ],
    segments: [
      {
        id: 'seg_demo_007',
        name: '全家福合影',
        description: '',
        timeStart: '00:02:00',
        timeEnd: '00:05:00',
        starred: true,
        status: 'done' as const,
        category: '家庭',
        orderIndex: 0
      },
      {
        id: 'seg_demo_008',
        name: '包饺子',
        description: '',
        timeStart: '00:15:00',
        timeEnd: '00:30:00',
        starred: false,
        status: 'done' as const,
        category: '家庭',
        orderIndex: 1
      },
      {
        id: 'seg_demo_009',
        name: '年夜饭',
        description: '',
        timeStart: '00:45:00',
        timeEnd: '01:15:00',
        starred: false,
        status: 'done' as const,
        category: '家庭',
        orderIndex: 2
      }
    ],
    repairRequests: [
      {
        id: 'rep_demo_003',
        description: '整体清晰度提升',
        priority: 'low' as const,
        status: 'done' as const,
        createdAt: twoDaysAgo
      }
    ],
    deliveryMedium: 'dvd' as const,
    deliveryNotes: '2张DVD，带封面',
    delivered: false,
    notes: '',
    createdAt: twoDaysAgo,
    updatedAt: yesterday,
    transcriptionProgress: 100
  }

  const alert1 = {
    id: 'alert_demo_001',
    type: 'transcription_interrupted' as const,
    level: 'error' as const,
    title: '转录中断',
    message: '磁带「宝宝百天宴」(TAPE-2024-002)转录中断，请检查并恢复。',
    tapeId: 'tape_demo_002',
    customerId: 'cust_demo_001',
    read: false,
    createdAt: yesterday
  }

  const alert2 = {
    id: 'alert_demo_002',
    type: 'unconfirmed_format' as const,
    level: 'warning' as const,
    title: '格式未确认',
    message: '磁带「宝宝百天宴」已转录但客户未确认输出格式，交付前请确认。',
    tapeId: 'tape_demo_002',
    customerId: 'cust_demo_001',
    read: false,
    createdAt: yesterday
  }

  return {
    customers: [customer1, customer2],
    tapes: [tape1, tape2, tape3],
    alerts: [alert1, alert2],
    lastUpdated: now,
    version: DATA_VERSION
  }
}

export const useAppStore = create<AppStore>((set, get) => ({
  customers: [],
  tapes: [],
  alerts: [],
  currentRole: 'reception',
  selectedTapeId: null,
  isLoading: false,
  initialized: false,

  init: async () => {
    if (get().initialized) return

    set({ isLoading: true })
    try {
      const data = await window.electronAPI.readJsonFile(DATA_FILENAME)
      if (data && typeof data === 'object' && (data as AppData).version) {
        const appData = data as AppData
        set({
          customers: appData.customers || [],
          tapes: appData.tapes || [],
          alerts: appData.alerts || [],
          initialized: true
        })
      } else {
        const sampleData = getSampleData()
        await window.electronAPI.writeJsonFile(DATA_FILENAME, sampleData)
        set({
          customers: sampleData.customers,
          tapes: sampleData.tapes,
          alerts: sampleData.alerts,
          initialized: true
        })
      }
    } catch (e) {
      console.error('加载数据失败:', e)
      const sampleData = getSampleData()
      set({
        customers: sampleData.customers,
        tapes: sampleData.tapes,
        alerts: sampleData.alerts,
        initialized: true
      })
    }
    set({ isLoading: false })
  },

  saveData: async () => {
    const { customers, tapes, alerts } = get()
    const data: AppData = {
      customers,
      tapes,
      alerts,
      lastUpdated: new Date().toISOString(),
      version: DATA_VERSION
    }
    try {
      await window.electronAPI.writeJsonFile(DATA_FILENAME, data)
    } catch (e) {
      console.error('保存数据失败:', e)
    }
  },

  setCurrentRole: (role) => set({ currentRole: role }),
  setSelectedTapeId: (id) => set({ selectedTapeId: id }),

  addCustomer: (data) => {
    const now = new Date().toISOString()
    const customer: Customer = {
      ...data,
      id: generateId('cust_'),
      createdAt: now,
      updatedAt: now
    }
    set((state) => ({ customers: [...state.customers, customer] }))
    get().saveData()
    return customer
  },

  updateCustomer: (id, data) => {
    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
      )
    }))
    get().saveData()
  },

  deleteCustomer: (id) => {
    set((state) => {
      const tapeIds = state.tapes.filter((t) => t.customerId === id).map((t) => t.id)
      return {
        customers: state.customers.filter((c) => c.id !== id),
        tapes: state.tapes.filter((t) => t.customerId !== id),
        alerts: state.alerts.filter((a) => a.customerId !== id && !tapeIds.includes(a.tapeId || ''))
      }
    })
    get().saveData()
  },

  getCustomer: (id) => get().customers.find((c) => c.id === id),

  addTape: (data) => {
    const now = new Date().toISOString()
    const tape: Tape = {
      ...data,
      id: generateId('tape_'),
      damageSpots: data.damageSpots || [],
      segments: data.segments || [],
      repairRequests: data.repairRequests || [],
      transcriptionProgress: 0,
      createdAt: now,
      updatedAt: now
    }
    set((state) => ({ tapes: [...state.tapes, tape] }))

    if (get().checkDuplicateTapeNumber(tape.tapeNumber, tape.id)) {
      get().addAlert({
        type: 'duplicate_tape',
        level: 'warning',
        title: '磁带编号重复',
        message: `磁带编号「${tape.tapeNumber}」已存在，请确认是否为同一盘磁带。`,
        tapeId: tape.id,
        customerId: tape.customerId
      })
    }

    get().saveData()
    return tape
  },

  updateTape: (id, data) => {
    set((state) => ({
      tapes: state.tapes.map((t) =>
        t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t
      )
    }))
    get().saveData()
  },

  deleteTape: (id) => {
    set((state) => ({
      tapes: state.tapes.filter((t) => t.id !== id),
      alerts: state.alerts.filter((a) => a.tapeId !== id)
    }))
    get().saveData()
  },

  getTape: (id) => get().tapes.find((t) => t.id === id),
  getTapesByCustomer: (customerId) => get().tapes.filter((t) => t.customerId === customerId),

  setTapeStatus: (id, status, progress) => {
    set((state) => ({
      tapes: state.tapes.map((t) => {
        if (t.id !== id) return t
        const updated: Tape = { ...t, status, updatedAt: new Date().toISOString() }
        if (progress !== undefined) updated.transcriptionProgress = progress
        return updated
      })
    }))

    const tape = get().getTape(id)
    if (status === 'interrupted' && tape) {
      get().addAlert({
        type: 'transcription_interrupted',
        level: 'error',
        title: '转录中断',
        message: `磁带「${tape.title}」(${tape.tapeNumber})转录中断，请检查并恢复。`,
        tapeId: id,
        customerId: tape.customerId
      })
    }

    if (status === 'completed' && tape && !tape.formatConfirmed) {
      get().addAlert({
        type: 'unconfirmed_format',
        level: 'warning',
        title: '格式未确认',
        message: `磁带「${tape.title}」已完成但客户未确认输出格式，交付前请确认。`,
        tapeId: id,
        customerId: tape.customerId
      })
    }

    get().saveData()
  },

  addSegment: (tapeId, segment) => {
    const newSegment: VideoSegment = {
      ...segment,
      id: generateId('seg_')
    }
    set((state) => ({
      tapes: state.tapes.map((t) =>
        t.id === tapeId
          ? {
              ...t,
              segments: [...t.segments, newSegment].sort((a, b) => a.orderIndex - b.orderIndex),
              updatedAt: new Date().toISOString()
            }
          : t
      )
    }))
    get().saveData()
    return newSegment
  },

  updateSegment: (tapeId, segmentId, data) => {
    set((state) => ({
      tapes: state.tapes.map((t) =>
        t.id === tapeId
          ? {
              ...t,
              segments: t.segments.map((s) => (s.id === segmentId ? { ...s, ...data } : s)),
              updatedAt: new Date().toISOString()
            }
          : t
      )
    }))
    get().saveData()
  },

  deleteSegment: (tapeId, segmentId) => {
    set((state) => ({
      tapes: state.tapes.map((t) =>
        t.id === tapeId
          ? {
              ...t,
              segments: t.segments.filter((s) => s.id !== segmentId),
              updatedAt: new Date().toISOString()
            }
          : t
      )
    }))
    get().saveData()
  },

  toggleStarSegment: (tapeId, segmentId) => {
    set((state) => ({
      tapes: state.tapes.map((t) =>
        t.id === tapeId
          ? {
              ...t,
              segments: t.segments.map((s) =>
                s.id === segmentId ? { ...s, starred: !s.starred } : s
              ),
              updatedAt: new Date().toISOString()
            }
          : t
      )
    }))
    get().saveData()
  },

  addDamageSpot: (tapeId, damage) => {
    const newDamage: DamageSpot = {
      ...damage,
      id: generateId('dmg_')
    }
    set((state) => ({
      tapes: state.tapes.map((t) =>
        t.id === tapeId
          ? { ...t, damageSpots: [...t.damageSpots, newDamage], updatedAt: new Date().toISOString() }
          : t
      )
    }))
    get().saveData()
    return newDamage
  },

  updateDamageSpot: (tapeId, damageId, data) => {
    set((state) => ({
      tapes: state.tapes.map((t) =>
        t.id === tapeId
          ? {
              ...t,
              damageSpots: t.damageSpots.map((d) => (d.id === damageId ? { ...d, ...data } : d)),
              updatedAt: new Date().toISOString()
            }
          : t
      )
    }))
    get().saveData()
  },

  deleteDamageSpot: (tapeId, damageId) => {
    set((state) => ({
      tapes: state.tapes.map((t) =>
        t.id === tapeId
          ? {
              ...t,
              damageSpots: t.damageSpots.filter((d) => d.id !== damageId),
              updatedAt: new Date().toISOString()
            }
          : t
      )
    }))
    get().saveData()
  },

  addRepairRequest: (tapeId, request) => {
    const newRequest: RepairRequest = {
      ...request,
      id: generateId('rep_'),
      createdAt: new Date().toISOString()
    }
    set((state) => ({
      tapes: state.tapes.map((t) =>
        t.id === tapeId
          ? {
              ...t,
              repairRequests: [...t.repairRequests, newRequest],
              updatedAt: new Date().toISOString()
            }
          : t
      )
    }))
    get().saveData()
    return newRequest
  },

  updateRepairRequest: (tapeId, requestId, data) => {
    set((state) => ({
      tapes: state.tapes.map((t) =>
        t.id === tapeId
          ? {
              ...t,
              repairRequests: t.repairRequests.map((r) =>
                r.id === requestId ? { ...r, ...data } : r
              ),
              updatedAt: new Date().toISOString()
            }
          : t
      )
    }))
    get().saveData()
  },

  deleteRepairRequest: (tapeId, requestId) => {
    set((state) => ({
      tapes: state.tapes.map((t) =>
        t.id === tapeId
          ? {
              ...t,
              repairRequests: t.repairRequests.filter((r) => r.id !== requestId),
              updatedAt: new Date().toISOString()
            }
          : t
      )
    }))
    get().saveData()
  },

  addAlert: (alert) => {
    const newAlert: Alert = {
      ...alert,
      id: generateId('alert_'),
      read: false,
      createdAt: new Date().toISOString()
    }
    set((state) => ({ alerts: [newAlert, ...state.alerts] }))
    get().saveData()
  },

  markAlertRead: (id) => {
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a, read: true } : a))
    }))
    get().saveData()
  },

  markAllAlertsRead: () => {
    set((state) => ({
      alerts: state.alerts.map((a) => ({ ...a, read: true }))
    }))
    get().saveData()
  },

  clearAlert: (id) => {
    set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) }))
    get().saveData()
  },

  clearAllAlerts: () => {
    set({ alerts: [] })
    get().saveData()
  },

  checkDuplicateTapeNumber: (tapeNumber, excludeId) => {
    const { tapes } = get()
    return tapes.some((t) => t.tapeNumber === tapeNumber && t.id !== excludeId)
  },

  getPendingSegments: () => {
    const { tapes } = get()
    const result: { tape: Tape; segment: VideoSegment }[] = []
    tapes.forEach((tape) => {
      tape.segments
        .filter((s) => s.status !== 'done')
        .forEach((segment) => {
          result.push({ tape, segment })
        })
    })
    return result.sort((a, b) => a.segment.orderIndex - b.segment.orderIndex)
  },

  getStarredSegments: () => {
    const { tapes } = get()
    const result: { tape: Tape; segment: VideoSegment }[] = []
    tapes.forEach((tape) => {
      tape.segments
        .filter((s) => s.starred)
        .forEach((segment) => {
          result.push({ tape, segment })
        })
    })
    return result
  },

  getDeliverableTapes: () => {
    return get().tapes.filter((t) => t.status === 'completed' && !t.delivered)
  }
}))
