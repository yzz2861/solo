import type {
  Customer,
  Consumption,
  Appointment,
  FollowUpNote,
  Complaint,
  ChurnAnalysis,
  ProjectTypeRule,
} from '@/types'

function daysBetween(a: string, b: string): number {
  const da = new Date(a).getTime()
  const db = new Date(b).getTime()
  return Math.abs(db - da) / (1000 * 60 * 60 * 24)
}

function classifyProject(
  projectName: string,
  amount: number,
  rules: ProjectTypeRule[],
  trialAmountThreshold: number
): 'trial' | 'regular' | 'package' {
  for (const rule of rules) {
    if (projectName.includes(rule.keyword)) {
      return rule.type as 'trial' | 'regular'
    }
  }
  if (amount > 0 && amount < trialAmountThreshold) {
    return 'trial'
  }
  if (projectName.includes('套餐') || projectName.includes('次卡') || projectName.includes('包')) {
    return 'package'
  }
  return 'regular'
}

export function classifyConsumptions(
  consumptions: Consumption[],
  rules: ProjectTypeRule[],
  trialAmountThreshold: number = 99
): Consumption[] {
  return consumptions.map((c) => ({
    ...c,
    projectType: classifyProject(c.projectName, c.amount, rules, trialAmountThreshold),
  }))
}

export function mergeCustomers(
  rawRecords: Array<{ name: string; phone: string; memberId?: string }>
): { customers: Customer[]; mergeSuggestions: Array<{ ids: string[]; reason: string }> } {
  const phoneMap = new Map<string, string[]>()
  const nameMap = new Map<string, string[]>()
  const memberMap = new Map<string, string[]>()
  const ids: string[] = []
  const mergeSuggestions: Array<{ ids: string[]; reason: string }> = []

  for (const rec of rawRecords) {
    const id = `${rec.phone}_${rec.name}_${Math.random().toString(36).slice(2, 8)}`
    ids.push(id)

    const phone = rec.phone.replace(/\D/g, '')
    if (phone) {
      if (!phoneMap.has(phone)) phoneMap.set(phone, [])
      phoneMap.get(phone)!.push(id)
    }
    if (rec.name) {
      if (!nameMap.has(rec.name)) nameMap.set(rec.name, [])
      nameMap.get(rec.name)!.push(id)
    }
    if (rec.memberId) {
      if (!memberMap.has(rec.memberId)) memberMap.set(rec.memberId, [])
      memberMap.get(rec.memberId)!.push(id)
    }
  }

  const merged = new Map<string, Set<string>>()
  const idToGroup = new Map<string, string>()

  for (const [, groupIds] of phoneMap) {
    if (groupIds.length > 1) {
      const rep = groupIds[0]
      if (!merged.has(rep)) merged.set(rep, new Set(groupIds))
      else groupIds.forEach((gid) => merged.get(rep)!.add(gid))
      groupIds.forEach((gid) => idToGroup.set(gid, rep))
    }
  }

  for (const [, groupIds] of memberMap) {
    if (groupIds.length > 1) {
      const rep = groupIds[0]
      const existingGroup = idToGroup.get(rep)
      if (existingGroup && merged.has(existingGroup)) {
        groupIds.forEach((gid) => merged.get(existingGroup)!.add(gid))
        groupIds.forEach((gid) => idToGroup.set(gid, existingGroup))
      } else if (!merged.has(rep)) {
        merged.set(rep, new Set(groupIds))
        groupIds.forEach((gid) => idToGroup.set(gid, rep))
      }
    }
  }

  for (const [name, groupIds] of nameMap) {
    if (groupIds.length > 1) {
      const phones = groupIds.map((gid) => {
        const rec = rawRecords[ids.indexOf(gid)]
        return rec?.phone.replace(/\D/g, '') || ''
      })
      const hasSimilarPhones = phones.some(
        (p, i) => phones.some((p2, j) => i !== j && p.length >= 8 && p2.length >= 8 && p.slice(0, 8) === p2.slice(0, 8))
      )
      if (hasSimilarPhones) {
        const rep = groupIds[0]
        const existingGroup = idToGroup.get(rep)
        if (existingGroup && merged.has(existingGroup)) {
          groupIds.forEach((gid) => merged.get(existingGroup)!.add(gid))
          groupIds.forEach((gid) => idToGroup.set(gid, existingGroup))
        } else {
          merged.set(rep, new Set(groupIds))
          groupIds.forEach((gid) => idToGroup.set(gid, rep))
        }
      } else {
        mergeSuggestions.push({ ids: groupIds, reason: `同名"${name}"，手机号不同，需确认是否为同一人` })
      }
    }
  }

  const customers: Customer[] = []
  const processedIds = new Set<string>()

  for (const [, groupIds] of merged) {
    const groupArr = Array.from(groupIds)
    const records = groupArr.map((gid) => rawRecords[ids.indexOf(gid)]).filter(Boolean)
    const allPhones = [...new Set(records.map((r) => r.phone.replace(/\D/g, '')).filter(Boolean))]
    const allMemberIds = [...new Set(records.map((r) => r.memberId).filter(Boolean))]
    const primaryRecord = records[0]

    customers.push({
      id: `c_${customers.length}`,
      canonicalName: primaryRecord.name,
      canonicalPhone: allPhones[0] || '',
      memberIds: allMemberIds,
      phoneHistory: allPhones,
      assignedConsultant: '',
      riskLevel: 'safe',
      isExcluded: false,
    })

    groupArr.forEach((gid) => processedIds.add(gid))
  }

  for (let i = 0; i < rawRecords.length; i++) {
    const gid = ids[i]
    if (!processedIds.has(gid)) {
      const rec = rawRecords[i]
      customers.push({
        id: `c_${customers.length}`,
        canonicalName: rec.name,
        canonicalPhone: rec.phone.replace(/\D/g, ''),
        memberIds: rec.memberId ? [rec.memberId] : [],
        phoneHistory: [rec.phone.replace(/\D/g, '')],
        assignedConsultant: '',
        riskLevel: 'safe',
        isExcluded: false,
      })
    }
  }

  return { customers, mergeSuggestions }
}

export function computeChurnAnalysis(
  customers: Customer[],
  consumptions: Consumption[],
  appointments: Appointment[],
  followUpNotes: FollowUpNote[],
  complaints: Complaint[]
): ChurnAnalysis[] {
  const now = new Date()
  const results: ChurnAnalysis[] = []

  for (const customer of customers) {
    const custConsumptions = consumptions.filter((c) => c.customerId === customer.id)
    const custAppointments = appointments.filter((a) => a.customerId === customer.id)
    const custFollowUps = followUpNotes.filter((n) => n.customerId === customer.id)
    const custComplaints = complaints.filter((c) => c.customerId === customer.id)

    const visitDates = custConsumptions
      .map((c) => c.consumeDate)
      .sort()

    let lastVisitDate = ''
    let avgVisitInterval = 0
    let currentInterval = 0
    let intervalDeviation = 0

    if (visitDates.length > 0) {
      lastVisitDate = visitDates[visitDates.length - 1]
      currentInterval = daysBetween(lastVisitDate, now.toISOString().slice(0, 10))

      if (visitDates.length > 1) {
        const intervals: number[] = []
        for (let i = 1; i < visitDates.length; i++) {
          intervals.push(daysBetween(visitDates[i - 1], visitDates[i]))
        }
        avgVisitInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
        intervalDeviation = avgVisitInterval > 0 ? currentInterval / avgVisitInterval : 0
      } else {
        avgVisitInterval = 0
        intervalDeviation = currentInterval > 30 ? 2 : 0
      }
    }

    const threeMonthsAgo = new Date(now)
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const threeMonthsAgoStr = threeMonthsAgo.toISOString().slice(0, 10)

    const recentConsumptions = custConsumptions.filter((c) => c.consumeDate >= threeMonthsAgoStr)
    const regularConsumptions = custConsumptions.filter((c) => c.projectType === 'regular')
    const trialConsumptions = custConsumptions.filter((c) => c.projectType === 'trial')

    const repurchaseRate = custConsumptions.length > 1 ? (custConsumptions.length - 1) / custConsumptions.length : 0
    const regularRepurchaseRate = regularConsumptions.length > 1 ? (regularConsumptions.length - 1) / regularConsumptions.length : 0
    const trialRepurchaseRate = trialConsumptions.length > 1 ? (trialConsumptions.length - 1) / trialConsumptions.length : 0

    const recentRepurchaseRate = recentConsumptions.length > 1 ? (recentConsumptions.length - 1) / recentConsumptions.length : 0
    const repurchaseDecay = repurchaseRate > 0 ? 1 - recentRepurchaseRate / repurchaseRate : 0

    const sixMonthsAgo = new Date(now)
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().slice(0, 10)
    const recentAppointments = custAppointments.filter((a) => a.appointmentDate >= sixMonthsAgoStr)
    const noShowRate = recentAppointments.length > 0
      ? recentAppointments.filter((a) => a.status === 'no_show').length / recentAppointments.length
      : 0

    const latestFollowUp = custFollowUps.length > 0
      ? custFollowUps.sort((a, b) => b.followUpDate.localeCompare(a.followUpDate))[0]
      : null
    const followUpFrequency = latestFollowUp
      ? daysBetween(latestFollowUp.followUpDate, now.toISOString().slice(0, 10))
      : 999

    const activeComplaints = custComplaints.filter((c) => c.status !== 'resolved')
    const hasActiveComplaint = activeComplaints.length > 0

    let riskScore = 0

    if (avgVisitInterval > 0) {
      riskScore += Math.min(intervalDeviation * 15, 40)
    } else if (currentInterval > 30) {
      riskScore += 30
    }

    riskScore += repurchaseDecay * 25
    riskScore += noShowRate * 15
    riskScore += Math.min(followUpFrequency / 7, 1) * 10
    if (hasActiveComplaint) riskScore += 10

    riskScore = Math.min(Math.round(riskScore), 100)

    let riskLevel: 'high' | 'medium' | 'low' | 'safe'
    if (riskScore >= 60) riskLevel = 'high'
    else if (riskScore >= 40) riskLevel = 'medium'
    else if (riskScore >= 20) riskLevel = 'low'
    else riskLevel = 'safe'

    results.push({
      customerId: customer.id,
      customerName: customer.canonicalName,
      customerPhone: customer.canonicalPhone,
      lastVisitDate,
      avgVisitInterval: Math.round(avgVisitInterval),
      currentInterval: Math.round(currentInterval),
      intervalDeviation: Math.round(intervalDeviation * 100) / 100,
      repurchaseRate: Math.round(repurchaseRate * 100) / 100,
      trialRepurchaseRate: Math.round(trialRepurchaseRate * 100) / 100,
      regularRepurchaseRate: Math.round(regularRepurchaseRate * 100) / 100,
      noShowRate: Math.round(noShowRate * 100) / 100,
      followUpFrequency: Math.round(followUpFrequency),
      hasActiveComplaint,
      riskScore,
      riskLevel,
      assignedConsultant: customer.assignedConsultant,
      isExcluded: customer.isExcluded,
      excludeReason: customer.excludeReason,
    })
  }

  return results.sort((a, b) => b.riskScore - a.riskScore)
}

export function autoMarkComplaintPause(
  complaints: Complaint[],
  customers: Customer[]
): { updatedCustomers: Customer[]; pauseCount: number } {
  let pauseCount = 0
  const updatedCustomers = customers.map((c) => {
    const activeComplaints = complaints.filter(
      (comp) => comp.customerId === c.id && comp.triggerContactPause && comp.status !== 'resolved'
    )
    if (activeComplaints.length > 0 && !c.isExcluded) {
      pauseCount++
      return {
        ...c,
        isExcluded: true,
        excludeReason: '投诉未处理，暂缓联系',
        excludeDate: new Date().toISOString().slice(0, 10),
      }
    }
    return c
  })
  return { updatedCustomers, pauseCount }
}

export function generateDemoData(): {
  customers: Customer[]
  consumptions: Consumption[]
  appointments: Appointment[]
  followUpNotes: FollowUpNote[]
  complaints: Complaint[]
} {
  const consultants = ['张美丽', '李晓雯', '王雅琴', '赵婉如']
  const projects = [
    { name: '面部护理-正价', type: 'regular' as const, amount: 398 },
    { name: '全身SPA-正价', type: 'regular' as const, amount: 698 },
    { name: '面部护理-体验卡', type: 'trial' as const, amount: 68 },
    { name: '肩颈按摩-体验卡', type: 'trial' as const, amount: 58 },
    { name: '抗衰套餐', type: 'package' as const, amount: 3998 },
    { name: '美白护理-正价', type: 'regular' as const, amount: 498 },
    { name: '精油SPA-体验卡', type: 'trial' as const, amount: 88 },
    { name: '脱毛套餐', type: 'package' as const, amount: 2998 },
  ]

  const customerNames = [
    '刘芳', '陈静', '杨丽', '黄敏', '周婷', '吴燕', '郑慧', '孙琳',
    '朱晓', '马玲', '胡雪', '林萍', '何丹', '高颖', '罗倩', '谢芸',
    '韩冰', '唐璐', '邓蕊', '曹莹', '许瑶', '冯菲', '曾薇', '彭悦',
    '萧娜', '田媛', '董雯', '袁晴', '蒋蓉', '潘淑',
  ]

  const customers: Customer[] = []
  const consumptions: Consumption[] = []
  const appointments: Appointment[] = []
  const followUpNotes: FollowUpNote[] = []
  const complaints: Complaint[] = []

  for (let i = 0; i < customerNames.length; i++) {
    const name = customerNames[i]
    const consultant = consultants[i % consultants.length]
    const phone = `138${String(10000000 + i * 137).slice(0, 8)}`
    const memberId = `VIP${String(1000 + i)}`

    const riskLevels: Array<'high' | 'medium' | 'low' | 'safe'> = ['high', 'high', 'medium', 'medium', 'low', 'safe', 'safe', 'safe']
    const risk = riskLevels[i % riskLevels.length]

    customers.push({
      id: `c_${i}`,
      canonicalName: name,
      canonicalPhone: phone,
      memberIds: [memberId],
      phoneHistory: i % 7 === 0 ? [phone, `139${String(20000000 + i * 137).slice(0, 8)}`] : [phone],
      assignedConsultant: consultant,
      riskLevel: risk,
      isExcluded: i === 2 || i === 15,
      excludeReason: i === 2 ? '投诉未处理，暂缓联系' : i === 15 ? '客户要求暂不打扰' : undefined,
    })

    const numConsumptions = risk === 'high' ? Math.floor(Math.random() * 3) + 1
      : risk === 'medium' ? Math.floor(Math.random() * 4) + 2
      : risk === 'low' ? Math.floor(Math.random() * 5) + 3
      : Math.floor(Math.random() * 6) + 4

    for (let j = 0; j < numConsumptions; j++) {
      const proj = projects[Math.floor(Math.random() * projects.length)]
      const monthOffset = risk === 'high' ? (j * 2 + 3) : (j * 1)
      const date = new Date()
      date.setMonth(date.getMonth() - monthOffset - Math.floor(Math.random() * 2))
      date.setDate(Math.floor(Math.random() * 28) + 1)

      consumptions.push({
        id: `con_${i}_${j}`,
        customerId: `c_${i}`,
        projectName: proj.name,
        projectType: proj.type,
        amount: proj.amount * (0.8 + Math.random() * 0.4),
        consumeDate: date.toISOString().slice(0, 10),
        consultant,
      })
    }

    const numAppointments = Math.floor(Math.random() * 4) + 1
    for (let j = 0; j < numAppointments; j++) {
      const date = new Date()
      date.setMonth(date.getMonth() - j)
      date.setDate(Math.floor(Math.random() * 28) + 1)
      const statuses: Array<'completed' | 'no_show' | 'cancelled'> = ['completed', 'completed', 'completed', risk === 'high' ? 'no_show' : 'completed']
      const proj = projects[Math.floor(Math.random() * projects.length)]

      appointments.push({
        id: `apt_${i}_${j}`,
        customerId: `c_${i}`,
        appointmentDate: date.toISOString().slice(0, 10),
        status: statuses[Math.floor(Math.random() * statuses.length)],
        projectName: proj.name,
        consultant,
      })
    }

    const numFollowUps = Math.floor(Math.random() * 3) + 1
    for (let j = 0; j < numFollowUps; j++) {
      const date = new Date()
      date.setDate(date.getDate() - (j * 7 + Math.floor(Math.random() * 5)))
      const methods: Array<'phone' | 'wechat' | 'in_person' | 'other'> = ['phone', 'wechat', 'in_person', 'other']

      followUpNotes.push({
        id: `fn_${i}_${j}`,
        customerId: `c_${i}`,
        consultant,
        followUpDate: date.toISOString().slice(0, 10),
        method: methods[Math.floor(Math.random() * methods.length)],
        content: j === 0 ? '客户表示近期工作忙，下月再来' : '已联系，客户约了下周',
        isSensitive: j === 0 && i % 5 === 0,
      })
    }

    if (i === 2 || i === 15 || i === 22) {
      const date = new Date()
      date.setDate(date.getDate() - Math.floor(Math.random() * 14))
      complaints.push({
        id: `comp_${i}`,
        customerId: `c_${i}`,
        complaintDate: date.toISOString().slice(0, 10),
        content: i === 2 ? '服务态度不满意' : i === 15 ? '效果与宣传不符' : '预约等待时间过长',
        status: i === 22 ? 'resolved' : 'pending',
        triggerContactPause: i !== 22,
        pauseUntil: i === 22 ? undefined : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      })
    }
  }

  return { customers, consumptions, appointments, followUpNotes, complaints }
}
