import dayjs from 'dayjs'

const STORAGE_KEY = 'canteen_ticket_data'

const defaultData = {
  elderly: [],
  ticket_types: [
    { id: 1, name: '早餐票', price: 5, meal_type: '早餐', description: '早餐专用', is_active: 1, created_at: dayjs().format() },
    { id: 2, name: '午餐票', price: 10, meal_type: '午餐', description: '午餐专用', is_active: 1, created_at: dayjs().format() },
    { id: 3, name: '晚餐票', price: 10, meal_type: '晚餐', description: '晚餐专用', is_active: 1, created_at: dayjs().format() },
    { id: 4, name: '通用餐票', price: 10, meal_type: '通用', description: '任意餐次通用', is_active: 1, created_at: dayjs().format() }
  ],
  subsidies: [],
  transactions: [],
  credit: [],
  settings: [{ key: 'credit_limit', value: '200', updated_at: dayjs().format() }],
  nextId: {
    elderly: 1,
    ticket_types: 5,
    subsidies: 1,
    transactions: 1,
    credit: 1
  }
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error('加载数据失败', e)
  }
  return JSON.parse(JSON.stringify(defaultData))
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function getNextId(data, table) {
  const id = data.nextId[table]
  data.nextId[table] = id + 1
  return id
}

function getCurrentCreditBalance(data, elderlyId) {
  let balance = 0
  data.credit.forEach(c => {
    if (c.elderly_id === elderlyId) {
      balance += c.credit_type === 'borrow' ? c.amount : -c.amount
    }
  })
  return balance
}

function getCreditLimit(data) {
  const s = data.settings.find(s => s.key === 'credit_limit')
  return s ? parseFloat(s.value) : 200
}

const mockAPI = {
  getElderly: async () => {
    const data = loadData()
    return [...data.elderly].sort((a, b) => a.name.localeCompare(b.name, 'zh'))
  },

  searchElderly: async (keyword) => {
    const data = loadData()
    const kw = keyword.toLowerCase()
    return data.elderly.filter(e =>
      e.name.toLowerCase().includes(kw) ||
      (e.phone && e.phone.includes(kw)) ||
      (e.id_card && e.id_card.includes(kw))
    )
  },

  getElderlyById: async (id) => {
    const data = loadData()
    return data.elderly.find(e => e.id === id)
  },

  addElderly: async (d) => {
    const data = loadData()
    const id = getNextId(data, 'elderly')
    const now = dayjs().format()
    const item = { ...d, id, created_at: now, updated_at: now }
    data.elderly.push(item)
    saveData(data)
    return { success: true, id }
  },

  updateElderly: async (id, d) => {
    const data = loadData()
    const idx = data.elderly.findIndex(e => e.id === id)
    if (idx >= 0) {
      data.elderly[idx] = { ...data.elderly[idx], ...d, updated_at: dayjs().format() }
      saveData(data)
    }
    return { success: true }
  },

  deleteElderly: async (id) => {
    const data = loadData()
    data.elderly = data.elderly.filter(e => e.id !== id)
    data.credit = data.credit.filter(c => c.elderly_id !== id)
    data.transactions = data.transactions.filter(t => t.elderly_id !== id)
    data.subsidies = data.subsidies.filter(s => s.elderly_id !== id)
    saveData(data)
    return { success: true }
  },

  getElderlyBalance: async (elderlyId) => {
    const data = loadData()
    let availableTickets = 0
    let balanceAmount = 0

    data.transactions.forEach(t => {
      if (t.elderly_id !== elderlyId) return
      if (t.transaction_type === 'purchase' && t.status === 'active') {
        availableTickets += t.quantity
        balanceAmount += t.total_amount
      } else if (t.transaction_type === 'refund') {
        availableTickets -= t.quantity
        balanceAmount -= Math.abs(t.total_amount)
      }
    })

    const ticketMap = {}
    data.transactions.forEach(t => {
      if (t.elderly_id !== elderlyId) return
      const tt = data.ticket_types.find(tt => tt.id === t.ticket_type_id)
      if (!tt) return
      if (!ticketMap[tt.id]) {
        ticketMap[tt.id] = { name: tt.name, meal_type: tt.meal_type, count: 0 }
      }
      if (t.transaction_type === 'purchase' && t.status === 'active') {
        ticketMap[tt.id].count += t.quantity
      } else if (t.transaction_type === 'refund') {
        ticketMap[tt.id].count -= t.quantity
      }
    })
    const tickets = Object.values(ticketMap).filter(t => t.count > 0)

    return {
      available_tickets: availableTickets,
      balance_amount: balanceAmount,
      credit_balance: getCurrentCreditBalance(data, elderlyId),
      tickets
    }
  },

  getTicketTypes: async () => {
    const data = loadData()
    return data.ticket_types.filter(t => t.is_active === 1)
  },

  addTicketType: async (d) => {
    const data = loadData()
    const id = getNextId(data, 'ticket_types')
    const item = { ...d, id, is_active: 1, created_at: dayjs().format() }
    data.ticket_types.push(item)
    saveData(data)
    return { success: true, id }
  },

  updateTicketType: async (id, d) => {
    const data = loadData()
    const idx = data.ticket_types.findIndex(t => t.id === id)
    if (idx >= 0) {
      data.ticket_types[idx] = { ...data.ticket_types[idx], ...d, is_active: d.is_active ? 1 : 0 }
      saveData(data)
    }
    return { success: true }
  },

  deleteTicketType: async (id) => {
    const data = loadData()
    const t = data.ticket_types.find(t => t.id === id)
    if (t) {
      t.is_active = 0
      saveData(data)
    }
    return { success: true }
  },

  getSubsidy: async (elderlyId) => {
    const data = loadData()
    let subs = data.subsidies
    if (elderlyId) subs = subs.filter(s => s.elderly_id === elderlyId)
    return subs.map(s => {
      const tt = data.ticket_types.find(t => t.id === s.ticket_type_id) || {}
      const e = data.elderly.find(e => e.id === s.elderly_id) || {}
      return {
        ...s,
        ticket_type_name: tt.name,
        meal_type: tt.meal_type,
        price: tt.price,
        elderly_name: e.name,
        remaining_quantity: s.quantity - s.used_quantity,
        is_expired: dayjs(s.valid_to).isBefore(dayjs(), 'day')
      }
    }).sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf())
  },

  checkSubsidyConflict: async (elderlyId, ticketTypeId, validFrom, validTo) => {
    const data = loadData()
    const existing = data.subsidies.filter(s =>
      s.elderly_id === elderlyId &&
      s.ticket_type_id === ticketTypeId &&
      (s.quantity - s.used_quantity) > 0 &&
      dayjs(s.valid_from).isBefore(validTo) &&
      dayjs(s.valid_to).isAfter(validFrom)
    )
    return { hasConflict: existing.length > 0, existing }
  },

  getExpiredSubsidyCount: async () => {
    const data = loadData()
    const today = dayjs().format('YYYY-MM-DD')
    return data.subsidies.filter(s =>
      dayjs(s.valid_to).isBefore(today) && (s.quantity - s.used_quantity) > 0
    ).length
  },

  addSubsidy: async (d) => {
    const data = loadData()
    const id = getNextId(data, 'subsidies')
    const item = { ...d, id, used_quantity: 0, created_at: dayjs().format() }
    data.subsidies.push(item)
    saveData(data)
    return { success: true, id }
  },

  purchaseTicket: async (d) => {
    const data = loadData()
    const { elderly_id, ticket_type_id, quantity, payment_type, operator, handler_name, subsidy_id } = d
    const ticketType = data.ticket_types.find(t => t.id === ticket_type_id)
    if (!ticketType) throw new Error('票种不存在')

    const unitPrice = ticketType.price
    const totalAmount = unitPrice * quantity

    if (payment_type === 'subsidy') {
      if (!subsidy_id) throw new Error('补贴支付需指定补贴ID')
      const subsidy = data.subsidies.find(s => s.id === subsidy_id)
      if (!subsidy) throw new Error('补贴不存在')
      if (dayjs(subsidy.valid_to).isBefore(dayjs(), 'day')) throw new Error('补贴已过期')
      const remaining = subsidy.quantity - subsidy.used_quantity
      if (remaining < quantity) throw new Error(`补贴剩余${remaining}张，不足${quantity}张`)
      if (subsidy.ticket_type_id !== ticket_type_id) throw new Error('补贴票种与购买票种不符')
    }

    if (payment_type === 'credit') {
      const currentBalance = getCurrentCreditBalance(data, elderly_id)
      const creditLimit = getCreditLimit(data)
      const newBalance = currentBalance + totalAmount
      if (newBalance > creditLimit) {
        throw new Error(`赊账超限！当前赊账${currentBalance}元，新增${totalAmount}元后将达到${newBalance}元，超过限额${creditLimit}元`)
      }
    }

    const id = getNextId(data, 'transactions')
    const tx = {
      id,
      elderly_id,
      ticket_type_id,
      transaction_type: 'purchase',
      payment_type,
      quantity,
      unit_price: unitPrice,
      total_amount: totalAmount,
      meal_type: d.meal_type || ticketType.meal_type,
      operator,
      handler_name,
      subsidy_id: payment_type === 'subsidy' ? subsidy_id : null,
      related_transaction_id: null,
      status: 'active',
      notes: null,
      created_at: dayjs().format()
    }
    data.transactions.push(tx)

    if (payment_type === 'subsidy' && subsidy_id) {
      const s = data.subsidies.find(s => s.id === subsidy_id)
      if (s) s.used_quantity += quantity
    }

    if (payment_type === 'credit') {
      const newBalance = getCurrentCreditBalance(data, elderly_id) + totalAmount
      const cid = getNextId(data, 'credit')
      data.credit.push({
        id: cid,
        elderly_id,
        transaction_id: id,
        credit_type: 'borrow',
        amount: totalAmount,
        balance: newBalance,
        operator,
        notes: '购票赊账',
        created_at: dayjs().format()
      })
    }

    saveData(data)
    return { success: true, id, total_amount: totalAmount }
  },

  getTransactions: async (filters) => {
    const data = loadData()
    let list = data.transactions
    if (filters?.elderly_id) list = list.filter(t => t.elderly_id === filters.elderly_id)
    if (filters?.type) list = list.filter(t => t.transaction_type === filters.type)
    if (filters?.start_date) list = list.filter(t => dayjs(t.created_at).isSameOrAfter(filters.start_date))
    if (filters?.end_date) list = list.filter(t => dayjs(t.created_at).isSameOrBefore(filters.end_date))

    list = list.slice(-500).map(t => {
      const e = data.elderly.find(e => e.id === t.elderly_id) || {}
      const tt = data.ticket_types.find(tt => tt.id === t.ticket_type_id) || {}
      return {
        ...t,
        elderly_name: e.name,
        ticket_type_name: tt.name,
        meal_type: t.meal_type || tt.meal_type
      }
    })

    return list.sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf())
  },

  getUnredeemedTickets: async (elderlyId) => {
    const data = loadData()
    const purchases = data.transactions.filter(t =>
      t.elderly_id === elderlyId && t.transaction_type === 'purchase' && t.status === 'active'
    )

    const result = []
    for (const p of purchases) {
      const used = data.transactions
        .filter(t => t.related_transaction_id === p.id && (t.transaction_type === 'redeem' || t.transaction_type === 'refund'))
        .reduce((s, t) => s + t.quantity, 0)
      const remaining = p.quantity - used
      if (remaining > 0) {
        const e = data.elderly.find(e => e.id === p.elderly_id) || {}
        const tt = data.ticket_types.find(tt => tt.id === p.ticket_type_id) || {}
        result.push({
          ...p,
          elderly_name: e.name,
          ticket_type_name: tt.name,
          meal_type: tt.meal_type,
          price: tt.price,
          remaining_quantity: remaining
        })
      }
    }
    return result.sort((a, b) => dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf())
  },

  redeemTicket: async (d) => {
    const data = loadData()
    const { transaction_id, quantity, meal_type, meal_date, operator } = d
    const purchase = data.transactions.find(t => t.id === transaction_id)
    if (!purchase || purchase.transaction_type !== 'purchase' || purchase.status !== 'active') {
      throw new Error('找不到该购票记录')
    }
    if (purchase.status === 'refunded') throw new Error('该票已退票，无法核销')
    if (purchase.status === 'redeemed') throw new Error('该票已全部核销')

    const used = data.transactions
      .filter(t => t.related_transaction_id === purchase.id && (t.transaction_type === 'redeem' || t.transaction_type === 'refund'))
      .reduce((s, t) => s + t.quantity, 0)
    const remaining = purchase.quantity - used
    if (remaining < quantity) throw new Error(`剩余票数不足，仅剩${remaining}张`)

    const tt = data.ticket_types.find(t => t.id === purchase.ticket_type_id) || {}
    if (tt.meal_type !== '通用' && tt.meal_type !== meal_type) {
      throw new Error(`票种为${tt.meal_type}，不能用于${meal_type}核销`)
    }

    const id = getNextId(data, 'transactions')
    data.transactions.push({
      id,
      elderly_id: purchase.elderly_id,
      ticket_type_id: purchase.ticket_type_id,
      transaction_type: 'redeem',
      payment_type: purchase.payment_type,
      quantity,
      unit_price: purchase.unit_price,
      total_amount: 0,
      meal_type,
      meal_date: meal_date || dayjs().format('YYYY-MM-DD'),
      operator,
      handler_name: null,
      subsidy_id: null,
      related_transaction_id: transaction_id,
      status: 'redeemed',
      redeem_time: dayjs().format(),
      notes: null,
      created_at: dayjs().format()
    })

    const usedTotal = used + quantity
    if (usedTotal >= purchase.quantity) {
      purchase.status = 'redeemed'
    }

    saveData(data)
    return { success: true, id }
  },

  refundTicket: async (transactionId, reason) => {
    const data = loadData()
    const purchase = data.transactions.find(t => t.id === transactionId)
    if (!purchase || purchase.transaction_type !== 'purchase') throw new Error('找不到该购票记录')
    if (purchase.status === 'refunded') throw new Error('该票已退票，不能重复退票')

    const redeemed = data.transactions
      .filter(t => t.related_transaction_id === transactionId && t.transaction_type === 'redeem')
      .reduce((s, t) => s + t.quantity, 0)
    const remaining = purchase.quantity - redeemed
    if (remaining <= 0) throw new Error('该票已全部核销，不能退票')

    const refundAmount = remaining * purchase.unit_price

    const id = getNextId(data, 'transactions')
    data.transactions.push({
      id,
      elderly_id: purchase.elderly_id,
      ticket_type_id: purchase.ticket_type_id,
      transaction_type: 'refund',
      payment_type: purchase.payment_type,
      quantity: remaining,
      unit_price: purchase.unit_price,
      total_amount: -refundAmount,
      operator: null,
      handler_name: null,
      subsidy_id: null,
      related_transaction_id: transactionId,
      status: 'refunded',
      refund_reason: reason || '用户退票',
      refund_time: dayjs().format(),
      notes: null,
      created_at: dayjs().format()
    })

    purchase.status = 'refunded'

    if (purchase.subsidy_id) {
      const s = data.subsidies.find(s => s.id === purchase.subsidy_id)
      if (s) s.used_quantity = Math.max(0, s.used_quantity - remaining)
    }

    if (purchase.payment_type === 'credit') {
      const newBalance = Math.max(0, getCurrentCreditBalance(data, purchase.elderly_id) - refundAmount)
      const cid = getNextId(data, 'credit')
      data.credit.push({
        id: cid,
        elderly_id: purchase.elderly_id,
        transaction_id: transactionId,
        credit_type: 'repay',
        amount: refundAmount,
        balance: newBalance,
        notes: '退票冲抵',
        created_at: dayjs().format()
      })
    }

    saveData(data)
    return { success: true, refund_amount: refundAmount, refund_quantity: remaining }
  },

  getCredit: async (elderlyId) => {
    const data = loadData()
    let list = data.credit
    if (elderlyId) list = list.filter(c => c.elderly_id === elderlyId)
    return list.slice(-200).map(c => {
      const e = data.elderly.find(e => e.id === c.elderly_id) || {}
      return { ...c, elderly_name: e.name }
    }).reverse()
  },

  addCredit: async (d) => {
    const data = loadData()
    const { elderly_id, amount, operator, notes } = d
    const currentBalance = getCurrentCreditBalance(data, elderly_id)
    const newBalance = currentBalance + amount
    const creditLimit = getCreditLimit(data)
    if (newBalance > creditLimit) {
      throw new Error(`赊账超限！当前${currentBalance}元，新增${amount}元后${newBalance}元 > 限额${creditLimit}元`)
    }
    const id = getNextId(data, 'credit')
    data.credit.push({
      id, elderly_id, credit_type: 'borrow', amount,
      balance: newBalance, operator, notes,
      created_at: dayjs().format()
    })
    saveData(data)
    return { success: true, id, new_balance: newBalance }
  },

  repayCredit: async (d) => {
    const data = loadData()
    const { elderly_id, amount, operator, notes } = d
    const currentBalance = getCurrentCreditBalance(data, elderly_id)
    if (currentBalance <= 0) throw new Error('当前无赊账，无需还款')
    const repayAmount = Math.min(amount, currentBalance)
    const newBalance = currentBalance - repayAmount
    const id = getNextId(data, 'credit')
    data.credit.push({
      id, elderly_id, credit_type: 'repay', amount: repayAmount,
      balance: newBalance, operator, notes: notes || '还款',
      created_at: dayjs().format()
    })
    saveData(data)
    return { success: true, id, new_balance: newBalance, repaid_amount: repayAmount }
  },

  getCreditLimit: async () => {
    const data = loadData()
    return getCreditLimit(data)
  },

  setCreditLimit: async (limit) => {
    const data = loadData()
    const idx = data.settings.findIndex(s => s.key === 'credit_limit')
    if (idx >= 0) {
      data.settings[idx].value = String(limit)
      data.settings[idx].updated_at = dayjs().format()
    } else {
      data.settings.push({ key: 'credit_limit', value: String(limit), updated_at: dayjs().format() })
    }
    saveData(data)
    return { success: true }
  },

  getOverCreditCount: async () => {
    const data = loadData()
    const limit = getCreditLimit(data)
    const balances = {}
    data.credit.forEach(c => {
      if (!balances[c.elderly_id]) balances[c.elderly_id] = 0
      balances[c.elderly_id] += c.credit_type === 'borrow' ? c.amount : -c.amount
    })
    return Object.values(balances).filter(b => b > limit).length
  },

  getDailyReport: async (date) => {
    const data = loadData()
    const targetDate = date || dayjs().format('YYYY-MM-DD')
    const isToday = t => dayjs(t.created_at).isSame(targetDate, 'day')

    const dayTx = data.transactions.filter(isToday)

    const cashPurchases = dayTx.filter(t => t.transaction_type === 'purchase' && t.payment_type === 'cash')
      .reduce((s, t) => ({ amount: s.amount + t.total_amount, count: s.count + t.quantity }), { amount: 0, count: 0 })

    const subsidyPurchases = dayTx.filter(t => t.transaction_type === 'purchase' && t.payment_type === 'subsidy')
      .reduce((s, t) => ({ amount: s.amount + t.total_amount, count: s.count + t.quantity }), { amount: 0, count: 0 })

    const creditPurchases = dayTx.filter(t => t.transaction_type === 'purchase' && t.payment_type === 'credit')
      .reduce((s, t) => ({ amount: s.amount + t.total_amount, count: s.count + t.quantity }), { amount: 0, count: 0 })

    const redemptions = dayTx.filter(t => t.transaction_type === 'redeem')
      .reduce((s, t) => {
        s[t.meal_type === '早餐' ? 'breakfast_count' : t.meal_type === '午餐' ? 'lunch_count' : t.meal_type === '晚餐' ? 'dinner_count' : 'total_count'] += t.quantity
        s.total_count += t.quantity
        return s
      }, { breakfast_count: 0, lunch_count: 0, dinner_count: 0, total_count: 0 })

    const refunds = dayTx.filter(t => t.transaction_type === 'refund')
      .reduce((s, t) => ({ amount: s.amount + Math.abs(t.total_amount), count: s.count + t.quantity }), { amount: 0, count: 0 })

    const abnormalRedemptions = dayTx.filter(t => {
      if (t.transaction_type !== 'redeem') return false
      const tt = data.ticket_types.find(tt => tt.id === t.ticket_type_id)
      return tt && tt.meal_type !== '通用' && tt.meal_type !== t.meal_type
    }).map(t => {
      const e = data.elderly.find(e => e.id === t.elderly_id) || {}
      const tt = data.ticket_types.find(tt => tt.id === t.ticket_type_id) || {}
      return { ...t, elderly_name: e.name, ticket_type_name: tt.name }
    })

    const ticketTypeSales = data.ticket_types.map(tt => {
      const tx = dayTx.filter(t => t.transaction_type === 'purchase' && t.ticket_type_id === tt.id)
      return {
        name: tt.name,
        meal_type: tt.meal_type,
        price: tt.price,
        sold_count: tx.reduce((s, t) => s + t.quantity, 0),
        cash_amount: tx.filter(t => t.payment_type === 'cash').reduce((s, t) => s + t.total_amount, 0),
        subsidy_amount: tx.filter(t => t.payment_type === 'subsidy').reduce((s, t) => s + t.total_amount, 0),
        credit_amount: tx.filter(t => t.payment_type === 'credit').reduce((s, t) => s + t.total_amount, 0)
      }
    })

    const creditRepaid = data.credit.filter(c => isToday(c) && c.credit_type === 'repay')
      .reduce((s, c) => s + c.amount, 0)

    return {
      date: targetDate,
      cash: cashPurchases,
      subsidy: subsidyPurchases,
      credit: creditPurchases,
      credit_repaid: creditRepaid,
      redemptions,
      refunds,
      abnormal_redemptions: abnormalRedemptions,
      ticket_type_sales: ticketTypeSales
    }
  },

  getElderlyUsageReport: async (startDate, endDate) => {
    const data = loadData()
    return data.elderly.map(e => {
      const tx = data.transactions.filter(t =>
        t.elderly_id === e.id &&
        dayjs(t.created_at).isBetween(startDate, endDate, null, '[]')
      )
      return {
        id: e.id,
        name: e.name,
        age: e.age,
        gender: e.gender,
        address: e.address,
        phone: e.phone,
        cash_purchase_count: tx.filter(t => t.transaction_type === 'purchase' && t.payment_type === 'cash').reduce((s, t) => s + t.quantity, 0),
        subsidy_purchase_count: tx.filter(t => t.transaction_type === 'purchase' && t.payment_type === 'subsidy').reduce((s, t) => s + t.quantity, 0),
        credit_purchase_count: tx.filter(t => t.transaction_type === 'purchase' && t.payment_type === 'credit').reduce((s, t) => s + t.quantity, 0),
        total_purchase_count: tx.filter(t => t.transaction_type === 'purchase').reduce((s, t) => s + t.quantity, 0),
        total_redeem_count: tx.filter(t => t.transaction_type === 'redeem').reduce((s, t) => s + t.quantity, 0),
        cash_amount: tx.filter(t => t.transaction_type === 'purchase' && t.payment_type === 'cash').reduce((s, t) => s + t.total_amount, 0),
        subsidy_amount: tx.filter(t => t.transaction_type === 'purchase' && t.payment_type === 'subsidy').reduce((s, t) => s + t.total_amount, 0),
        credit_amount: tx.filter(t => t.transaction_type === 'purchase' && t.payment_type === 'credit').reduce((s, t) => s + t.total_amount, 0),
        total_amount: tx.reduce((s, t) => {
          if (t.transaction_type === 'purchase') return s + t.total_amount
          if (t.transaction_type === 'refund') return s + t.total_amount
          return s
        }, 0)
      }
    }).sort((a, b) => b.total_redeem_count - a.total_redeem_count || b.total_purchase_count - a.total_purchase_count)
  },

  getDashboardStats: async () => {
    const data = loadData()
    const today = dayjs().format('YYYY-MM-DD')
    const isToday = t => dayjs(t.created_at).isSame(today, 'day')

    const elderlyCount = data.elderly.length
    const ticketCount = data.transactions.filter(t => t.transaction_type === 'purchase' && t.status === 'active')
      .reduce((s, t) => s + t.quantity, 0)

    const todayPurchases = data.transactions.filter(t => isToday(t) && t.transaction_type === 'purchase')
      .reduce((s, t) => {
        s[t.payment_type === 'cash' ? 'cash' : t.payment_type === 'subsidy' ? 'subsidy' : 'credit'] += t.total_amount
        s.count += t.quantity
        return s
      }, { cash: 0, subsidy: 0, credit: 0, count: 0 })

    const todayRedemptions = data.transactions.filter(t => isToday(t) && t.transaction_type === 'redeem')
      .reduce((s, t) => {
        s[t.meal_type === '早餐' ? 'breakfast' : t.meal_type === '午餐' ? 'lunch' : t.meal_type === '晚餐' ? 'dinner' : 'count'] += t.quantity
        s.count += t.quantity
        return s
      }, { breakfast: 0, lunch: 0, dinner: 0, count: 0 })

    const now = dayjs()
    const expiringSubsidyCount = data.subsidies.filter(s =>
      dayjs(s.valid_to).isBetween(today, now.add(7, 'day'), null, '[]') &&
      (s.quantity - s.used_quantity) > 0
    ).length

    const expiredCount = data.subsidies.filter(s =>
      dayjs(s.valid_to).isBefore(today) && (s.quantity - s.used_quantity) > 0
    ).length

    const limit = getCreditLimit(data)
    const balances = {}
    data.credit.forEach(c => {
      if (!balances[c.elderly_id]) balances[c.elderly_id] = 0
      balances[c.elderly_id] += c.credit_type === 'borrow' ? c.amount : -c.amount
    })
    const overCreditCount = Object.values(balances).filter(b => b > limit).length

    return {
      elderly_count: elderlyCount,
      active_ticket_count: ticketCount,
      today_purchases: todayPurchases,
      today_redemptions: todayRedemptions,
      expiring_subsidy_count: expiringSubsidyCount,
      expired_subsidy_count: expiredCount,
      over_credit_count: overCreditCount
    }
  },

  exportDailyReport: async (date, filePath) => {
    console.warn('浏览器模式下不支持导出到文件，请在 Electron 中使用')
    return { success: false }
  },

  showSaveDialog: async () => {
    return { canceled: true }
  }
}

export default mockAPI
