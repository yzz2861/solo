const dayjs = require('dayjs')
const XLSX = require('xlsx')

function register(ipcMain, dbModule, dialog) {
  const db = dbModule.getDb()

  function getCurrentCreditBalance(elderlyId) {
    const row = db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN credit_type = 'borrow' THEN amount ELSE -amount END), 0) as balance
      FROM credit WHERE elderly_id = ?
    `).get(elderlyId)
    return row ? row.balance : 0
  }

  function getCreditLimit() {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('credit_limit')
    return row ? parseFloat(row.value) : 200
  }

  ipcMain.handle('elderly:list', async () => {
    return db.prepare('SELECT * FROM elderly ORDER BY name').all()
  })

  ipcMain.handle('elderly:search', async (_, keyword) => {
    const search = `%${keyword}%`
    return db.prepare(`
      SELECT * FROM elderly 
      WHERE name LIKE ? OR phone LIKE ? OR id_card LIKE ? 
      ORDER BY name
    `).all(search, search, search)
  })

  ipcMain.handle('elderly:get', async (_, id) => {
    return db.prepare('SELECT * FROM elderly WHERE id = ?').get(id)
  })

  ipcMain.handle('elderly:add', async (_, data) => {
    const info = db.prepare(`
      INSERT INTO elderly (name, id_card, phone, address, age, gender, contact_person, contact_phone, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.name, data.id_card, data.phone, data.address,
      data.age, data.gender, data.contact_person, data.contact_phone, data.notes
    )
    return { success: true, id: info.lastInsertRowid }
  })

  ipcMain.handle('elderly:update', async (_, id, data) => {
    db.prepare(`
      UPDATE elderly SET name=?, id_card=?, phone=?, address=?, age=?, gender=?, 
      contact_person=?, contact_phone=?, notes=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(
      data.name, data.id_card, data.phone, data.address,
      data.age, data.gender, data.contact_person, data.contact_phone, data.notes, id
    )
    return { success: true }
  })

  ipcMain.handle('elderly:delete', async (_, id) => {
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM credit WHERE elderly_id = ?').run(id)
      db.prepare('DELETE FROM transactions WHERE elderly_id = ?').run(id)
      db.prepare('DELETE FROM subsidies WHERE elderly_id = ?').run(id)
      db.prepare('DELETE FROM elderly WHERE id = ?').run(id)
    })
    tx()
    return { success: true }
  })

  ipcMain.handle('elderly:balance', async (_, elderlyId) => {
    const balance = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'purchase' AND status = 'active' THEN quantity 
                          WHEN transaction_type = 'refund' THEN -quantity ELSE 0 END), 0) as available_tickets,
        COALESCE(SUM(CASE WHEN transaction_type = 'purchase' AND status = 'active' THEN total_amount
                          WHEN transaction_type = 'refund' THEN -total_amount ELSE 0 END), 0) as balance_amount
      FROM transactions 
      WHERE elderly_id = ?
    `).get(elderlyId)

    const creditBalance = getCurrentCreditBalance(elderlyId)
    const tickets = db.prepare(`
      SELECT tt.name, tt.meal_type,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'purchase' AND t.status = 'active' THEN t.quantity
                          WHEN t.transaction_type = 'refund' THEN -t.quantity ELSE 0 END), 0) as count
      FROM transactions t
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      WHERE t.elderly_id = ?
      GROUP BY tt.id, tt.name, tt.meal_type
      HAVING count > 0
      ORDER BY tt.meal_type
    `).all(elderlyId)

    return { ...balance, credit_balance: creditBalance, tickets }
  })

  ipcMain.handle('ticket:types', async () => {
    return db.prepare('SELECT * FROM ticket_types WHERE is_active = 1 ORDER BY meal_type, price').all()
  })

  ipcMain.handle('ticket:type:add', async (_, data) => {
    const info = db.prepare(`
      INSERT INTO ticket_types (name, price, meal_type, description)
      VALUES (?, ?, ?, ?)
    `).run(data.name, data.price, data.meal_type, data.description)
    return { success: true, id: info.lastInsertRowid }
  })

  ipcMain.handle('ticket:type:update', async (_, id, data) => {
    db.prepare(`
      UPDATE ticket_types SET name=?, price=?, meal_type=?, description=?, is_active=?
      WHERE id=?
    `).run(data.name, data.price, data.meal_type, data.description, data.is_active ? 1 : 0, id)
    return { success: true }
  })

  ipcMain.handle('ticket:type:delete', async (_, id) => {
    db.prepare('UPDATE ticket_types SET is_active = 0 WHERE id = ?').run(id)
    return { success: true }
  })

  ipcMain.handle('subsidy:list', async (_, elderlyId) => {
    return db.prepare(`
      SELECT s.*, tt.name as ticket_type_name, tt.meal_type, tt.price,
        e.name as elderly_name,
        (s.quantity - s.used_quantity) as remaining_quantity,
        CASE WHEN date(s.valid_to) < date('now') THEN 1 ELSE 0 END as is_expired
      FROM subsidies s
      JOIN ticket_types tt ON s.ticket_type_id = tt.id
      JOIN elderly e ON s.elderly_id = e.id
      ${elderlyId ? 'WHERE s.elderly_id = ?' : ''}
      ORDER BY s.created_at DESC
    `)[elderlyId ? 'all' : 'all'](elderlyId || [])
  })

  ipcMain.handle('subsidy:check-conflict', async (_, elderlyId, ticketTypeId, validFrom, validTo) => {
    const existing = db.prepare(`
      SELECT * FROM subsidies 
      WHERE elderly_id = ? AND ticket_type_id = ?
      AND valid_from <= ? AND valid_to >= ?
      AND (quantity - used_quantity) > 0
    `).all(elderlyId, ticketTypeId, validTo, validFrom)
    
    return { hasConflict: existing.length > 0, existing }
  })

  ipcMain.handle('subsidy:expired-count', async () => {
    return db.prepare(`
      SELECT COUNT(*) as count FROM subsidies
      WHERE date(valid_to) < date('now')
      AND (quantity - used_quantity) > 0
    `).get().count
  })

  ipcMain.handle('subsidy:add', async (_, data) => {
    const info = db.prepare(`
      INSERT INTO subsidies (elderly_id, ticket_type_id, quantity, valid_from, valid_to, subsidy_type, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.elderly_id, data.ticket_type_id, data.quantity,
      data.valid_from, data.valid_to, data.subsidy_type, data.notes
    )
    return { success: true, id: info.lastInsertRowid }
  })

  ipcMain.handle('transaction:purchase', async (_, data) => {
    const { elderly_id, ticket_type_id, quantity, payment_type, operator, handler_name, subsidy_id, meal_type } = data
    
    const ticketType = db.prepare('SELECT * FROM ticket_types WHERE id = ?').get(ticket_type_id)
    if (!ticketType) throw new Error('票种不存在')

    const unitPrice = ticketType.price
    const totalAmount = unitPrice * quantity

    if (payment_type === 'subsidy') {
      if (!subsidy_id) throw new Error('补贴支付需指定补贴ID')
      
      const subsidy = db.prepare('SELECT * FROM subsidies WHERE id = ?').get(subsidy_id)
      if (!subsidy) throw new Error('补贴不存在')
      if (dayjs(subsidy.valid_to).isBefore(dayjs(), 'day')) {
        throw new Error('补贴已过期')
      }
      const remaining = subsidy.quantity - subsidy.used_quantity
      if (remaining < quantity) {
        throw new Error(`补贴剩余${remaining}张，不足${quantity}张`)
      }
      if (subsidy.ticket_type_id !== ticket_type_id) {
        throw new Error('补贴票种与购买票种不符')
      }
    }

    if (payment_type === 'credit') {
      const currentBalance = getCurrentCreditBalance(elderly_id)
      const creditLimit = getCreditLimit()
      const newBalance = currentBalance + totalAmount
      if (newBalance > creditLimit) {
        throw new Error(`赊账超限！当前赊账${currentBalance}元，新增${totalAmount}元后将达到${newBalance}元，超过限额${creditLimit}元`)
      }
    }

    const tx = db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO transactions 
        (elderly_id, ticket_type_id, transaction_type, payment_type, quantity, 
         unit_price, total_amount, meal_type, operator, handler_name, subsidy_id, status)
        VALUES (?, ?, 'purchase', ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `).run(
        elderly_id, ticket_type_id, payment_type, quantity,
        unitPrice, totalAmount, meal_type || ticketType.meal_type, operator, handler_name, subsidy_id
      )

      if (payment_type === 'subsidy' && subsidy_id) {
        db.prepare(`
          UPDATE subsidies SET used_quantity = used_quantity + ? WHERE id = ?
        `).run(quantity, subsidy_id)
      }

      if (payment_type === 'credit') {
        const newBalance = getCurrentCreditBalance(elderly_id) + totalAmount
        db.prepare(`
          INSERT INTO credit (elderly_id, transaction_id, credit_type, amount, balance, operator, notes)
          VALUES (?, ?, 'borrow', ?, ?, ?, ?)
        `).run(elderly_id, info.lastInsertRowid, totalAmount, newBalance, operator, '购票赊账')
      }

      return info.lastInsertRowid
    })

    const id = tx()
    return { success: true, id, total_amount: totalAmount }
  })

  ipcMain.handle('transaction:list', async (_, filters) => {
    let sql = `
      SELECT t.*, e.name as elderly_name, tt.name as ticket_type_name, tt.meal_type,
        COALESCE(e2.name, '') as handler_elderly_name
      FROM transactions t
      JOIN elderly e ON t.elderly_id = e.id
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      LEFT JOIN elderly e2 ON t.handler_name = e2.name
      WHERE 1=1
    `
    const params = []

    if (filters?.elderly_id) {
      sql += ' AND t.elderly_id = ?'
      params.push(filters.elderly_id)
    }
    if (filters?.type) {
      sql += ' AND t.transaction_type = ?'
      params.push(filters.type)
    }
    if (filters?.start_date) {
      sql += ' AND date(t.created_at) >= ?'
      params.push(filters.start_date)
    }
    if (filters?.end_date) {
      sql += ' AND date(t.created_at) <= ?'
      params.push(filters.end_date)
    }

    sql += ' ORDER BY t.created_at DESC LIMIT 500'

    return db.prepare(sql).all(...params)
  })

  ipcMain.handle('transaction:unredeemed', async (_, elderlyId) => {
    return db.prepare(`
      SELECT t.*, e.name as elderly_name, tt.name as ticket_type_name, tt.meal_type, tt.price,
        (t.quantity - COALESCE(SUM(CASE WHEN r.transaction_type = 'redeem' AND r.related_transaction_id = t.id THEN r.quantity 
                                        WHEN r.transaction_type = 'refund' AND r.related_transaction_id = t.id THEN r.quantity 
                                        ELSE 0 END), 0)) as remaining_quantity
      FROM transactions t
      JOIN elderly e ON t.elderly_id = e.id
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      LEFT JOIN transactions r ON r.related_transaction_id = t.id
      WHERE t.elderly_id = ? AND t.transaction_type = 'purchase' AND t.status = 'active'
      GROUP BY t.id
      HAVING remaining_quantity > 0
      ORDER BY t.created_at ASC
    `).all(elderlyId)
  })

  ipcMain.handle('transaction:redeem', async (_, data) => {
    const { transaction_id, quantity, meal_type, meal_date, operator } = data

    const purchase = db.prepare(`
      SELECT t.*, tt.meal_type as ticket_meal_type
      FROM transactions t
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      WHERE t.id = ? AND t.transaction_type = 'purchase' AND t.status = 'active'
    `).get(transaction_id)
    
    if (!purchase) throw new Error('找不到该购票记录')
    if (purchase.status === 'refunded') throw new Error('该票已退票，无法核销')
    if (purchase.status === 'redeemed') throw new Error('该票已全部核销')

    const remaining = db.prepare(`
      SELECT t.quantity - COALESCE(SUM(CASE WHEN r.transaction_type IN ('redeem', 'refund') AND r.related_transaction_id = t.id THEN r.quantity ELSE 0 END), 0) as remaining
      FROM transactions t
      LEFT JOIN transactions r ON r.related_transaction_id = t.id
      WHERE t.id = ?
      GROUP BY t.id
    `).get(transaction_id)

    if (!remaining || remaining.remaining < quantity) {
      throw new Error(`剩余票数不足，仅剩${remaining?.remaining || 0}张`)
    }

    const ticketMealType = purchase.ticket_meal_type
    if (ticketMealType !== '通用' && ticketMealType !== meal_type) {
      throw new Error(`票种为${ticketMealType}，不能用于${meal_type}核销`)
    }

    const tx = db.transaction(() => {
      const redeemInfo = db.prepare(`
        INSERT INTO transactions 
        (elderly_id, ticket_type_id, transaction_type, payment_type, quantity, 
         unit_price, total_amount, meal_type, meal_date, operator, related_transaction_id, status, redeem_time)
        VALUES (?, ?, 'redeem', ?, ?, ?, ?, ?, ?, ?, ?, 'redeemed', datetime('now'))
      `).run(
        purchase.elderly_id, purchase.ticket_type_id, purchase.payment_type, quantity,
        purchase.unit_price, 0, meal_type, meal_date || dayjs().format('YYYY-MM-DD'), operator, transaction_id
      )

      const usedTotal = db.prepare(`
        SELECT COALESCE(SUM(quantity), 0) as used 
        FROM transactions 
        WHERE related_transaction_id = ? AND transaction_type IN ('redeem', 'refund')
      `).get(transaction_id).used + quantity

      if (usedTotal >= purchase.quantity) {
        db.prepare('UPDATE transactions SET status = ? WHERE id = ?').run('redeemed', transaction_id)
      }

      return redeemInfo.lastInsertRowid
    })

    const id = tx()
    return { success: true, id }
  })

  ipcMain.handle('transaction:refund', async (_, transactionId, reason) => {
    const purchase = db.prepare(`
      SELECT t.*, tt.meal_type as ticket_meal_type
      FROM transactions t
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      WHERE t.id = ? AND t.transaction_type = 'purchase'
    `).get(transactionId)

    if (!purchase) throw new Error('找不到该购票记录')
    if (purchase.status === 'refunded') throw new Error('该票已退票，不能重复退票')

    const redeemed = db.prepare(`
      SELECT COALESCE(SUM(quantity), 0) as redeemed_quantity
      FROM transactions 
      WHERE related_transaction_id = ? AND transaction_type = 'redeem'
    `).get(transactionId).redeemed_quantity

    const remaining = purchase.quantity - redeemed
    if (remaining <= 0) throw new Error('该票已全部核销，不能退票')

    const refundAmount = remaining * purchase.unit_price

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO transactions 
        (elderly_id, ticket_type_id, transaction_type, payment_type, quantity, 
         unit_price, total_amount, operator, related_transaction_id, status, refund_reason, refund_time)
        VALUES (?, ?, 'refund', ?, ?, ?, ?, '', ?, 'refunded', ?, datetime('now'))
      `).run(
        purchase.elderly_id, purchase.ticket_type_id, purchase.payment_type, remaining,
        purchase.unit_price, -refundAmount, transactionId, reason || '用户退票'
      )

      db.prepare('UPDATE transactions SET status = ? WHERE id = ?').run('refunded', transactionId)

      if (purchase.subsidy_id) {
        db.prepare(`
          UPDATE subsidies SET used_quantity = used_quantity - ? WHERE id = ?
        `).run(remaining, purchase.subsidy_id)
      }

      if (purchase.payment_type === 'credit') {
        const newBalance = getCurrentCreditBalance(purchase.elderly_id) - refundAmount
        db.prepare(`
          INSERT INTO credit (elderly_id, transaction_id, credit_type, amount, balance, notes)
          VALUES (?, ?, 'repay', ?, ?, '退票冲抵')
        `).run(purchase.elderly_id, transactionId, refundAmount, newBalance < 0 ? 0 : newBalance)
      }
    })

    tx()
    return { success: true, refund_amount: refundAmount, refund_quantity: remaining }
  })

  ipcMain.handle('credit:list', async (_, elderlyId) => {
    return db.prepare(`
      SELECT c.*, e.name as elderly_name
      FROM credit c
      JOIN elderly e ON c.elderly_id = e.id
      ${elderlyId ? 'WHERE c.elderly_id = ?' : ''}
      ORDER BY c.created_at DESC
      LIMIT 200
    `)[elderlyId ? 'all' : 'all'](elderlyId || [])
  })

  ipcMain.handle('credit:add', async (_, data) => {
    const { elderly_id, amount, operator, notes } = data
    const currentBalance = getCurrentCreditBalance(elderly_id)
    const newBalance = currentBalance + amount
    const creditLimit = getCreditLimit()
    
    if (newBalance > creditLimit) {
      throw new Error(`赊账超限！当前${currentBalance}元，新增${amount}元后${newBalance}元 > 限额${creditLimit}元`)
    }

    const info = db.prepare(`
      INSERT INTO credit (elderly_id, credit_type, amount, balance, operator, notes)
      VALUES (?, 'borrow', ?, ?, ?, ?)
    `).run(elderly_id, amount, newBalance, operator, notes)

    return { success: true, id: info.lastInsertRowid, new_balance: newBalance }
  })

  ipcMain.handle('credit:repay', async (_, data) => {
    const { elderly_id, amount, operator, notes } = data
    const currentBalance = getCurrentCreditBalance(elderly_id)
    
    if (currentBalance <= 0) {
      throw new Error('当前无赊账，无需还款')
    }

    const repayAmount = Math.min(amount, currentBalance)
    const newBalance = currentBalance - repayAmount

    const info = db.prepare(`
      INSERT INTO credit (elderly_id, credit_type, amount, balance, operator, notes)
      VALUES (?, 'repay', ?, ?, ?, ?)
    `).run(elderly_id, repayAmount, newBalance, operator, notes || '还款')

    return { success: true, id: info.lastInsertRowid, new_balance: newBalance, repaid_amount: repayAmount }
  })

  ipcMain.handle('credit:limit', async () => {
    return getCreditLimit()
  })

  ipcMain.handle('credit:set-limit', async (_, limit) => {
    db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime(\'now\'))').run('credit_limit', String(limit))
    return { success: true }
  })

  ipcMain.handle('credit:over-limit-count', async () => {
    const limit = getCreditLimit()
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM (
        SELECT elderly_id, 
               COALESCE(SUM(CASE WHEN credit_type = 'borrow' THEN amount ELSE -amount END), 0) as balance
        FROM credit
        GROUP BY elderly_id
        HAVING balance > ?
      ) t
    `).get(limit)
    return result ? result.count : 0
  })

  ipcMain.handle('report:daily', async (_, date) => {
    const targetDate = date || dayjs().format('YYYY-MM-DD')

    const cashPurchases = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as amount, COALESCE(SUM(quantity), 0) as count
      FROM transactions 
      WHERE date(created_at) = ? AND transaction_type = 'purchase' AND payment_type = 'cash'
    `).get(targetDate)

    const subsidyPurchases = db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN payment_type = 'subsidy' THEN total_amount ELSE 0 END), 0) as amount,
             COALESCE(SUM(CASE WHEN payment_type = 'subsidy' THEN quantity ELSE 0 END), 0) as count
      FROM transactions 
      WHERE date(created_at) = ? AND transaction_type = 'purchase'
    `).get(targetDate)

    const creditPurchases = db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN payment_type = 'credit' THEN total_amount ELSE 0 END), 0) as amount,
             COALESCE(SUM(CASE WHEN payment_type = 'credit' THEN quantity ELSE 0 END), 0) as count
      FROM transactions 
      WHERE date(created_at) = ? AND transaction_type = 'purchase'
    `).get(targetDate)

    const redemptions = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN meal_type = '早餐' THEN quantity ELSE 0 END), 0) as breakfast_count,
        COALESCE(SUM(CASE WHEN meal_type = '午餐' THEN quantity ELSE 0 END), 0) as lunch_count,
        COALESCE(SUM(CASE WHEN meal_type = '晚餐' THEN quantity ELSE 0 END), 0) as dinner_count,
        COALESCE(SUM(quantity), 0) as total_count
      FROM transactions 
      WHERE date(created_at) = ? AND transaction_type = 'redeem'
    `).get(targetDate)

    const refunds = db.prepare(`
      SELECT COALESCE(SUM(-total_amount), 0) as amount, COALESCE(SUM(quantity), 0) as count
      FROM transactions 
      WHERE date(created_at) = ? AND transaction_type = 'refund'
    `).get(targetDate)

    const abnormalRedemptions = db.prepare(`
      SELECT t.*, e.name as elderly_name, tt.name as ticket_type_name
      FROM transactions t
      JOIN elderly e ON t.elderly_id = e.id
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      WHERE date(t.created_at) = ? AND t.transaction_type = 'redeem'
        AND tt.meal_type != '通用' AND tt.meal_type != t.meal_type
    `).all(targetDate)

    const ticketTypeSales = db.prepare(`
      SELECT tt.name, tt.meal_type, tt.price,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'purchase' THEN t.quantity ELSE 0 END), 0) as sold_count,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'purchase' AND t.payment_type = 'cash' THEN t.total_amount ELSE 0 END), 0) as cash_amount,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'purchase' AND t.payment_type = 'subsidy' THEN t.total_amount ELSE 0 END), 0) as subsidy_amount,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'purchase' AND t.payment_type = 'credit' THEN t.total_amount ELSE 0 END), 0) as credit_amount
      FROM ticket_types tt
      LEFT JOIN transactions t ON t.ticket_type_id = tt.id AND date(t.created_at) = ? AND t.transaction_type = 'purchase'
      GROUP BY tt.id
      ORDER BY tt.meal_type, tt.price
    `).all(targetDate)

    const creditRepaid = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as amount
      FROM credit 
      WHERE date(created_at) = ? AND credit_type = 'repay'
    `).get(targetDate)

    return {
      date: targetDate,
      cash: cashPurchases,
      subsidy: subsidyPurchases,
      credit: creditPurchases,
      credit_repaid: creditRepaid.amount,
      redemptions,
      refunds,
      abnormal_redemptions: abnormalRedemptions,
      ticket_type_sales: ticketTypeSales
    }
  })

  ipcMain.handle('report:elderly-usage', async (_, startDate, endDate) => {
    return db.prepare(`
      SELECT 
        e.id, e.name, e.age, e.gender, e.address, e.phone,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'purchase' AND t.payment_type = 'cash' THEN t.quantity ELSE 0 END), 0) as cash_purchase_count,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'purchase' AND t.payment_type = 'subsidy' THEN t.quantity ELSE 0 END), 0) as subsidy_purchase_count,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'purchase' AND t.payment_type = 'credit' THEN t.quantity ELSE 0 END), 0) as credit_purchase_count,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'purchase' THEN t.quantity ELSE 0 END), 0) as total_purchase_count,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'redeem' THEN t.quantity ELSE 0 END), 0) as total_redeem_count,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'purchase' AND t.payment_type = 'cash' THEN t.total_amount ELSE 0 END), 0) as cash_amount,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'purchase' AND t.payment_type = 'subsidy' THEN t.total_amount ELSE 0 END), 0) as subsidy_amount,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'purchase' AND t.payment_type = 'credit' THEN t.total_amount ELSE 0 END), 0) as credit_amount,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'purchase' THEN t.total_amount 
                          WHEN t.transaction_type = 'refund' THEN t.total_amount ELSE 0 END), 0) as total_amount
      FROM elderly e
      LEFT JOIN transactions t ON t.elderly_id = e.id 
        AND date(t.created_at) BETWEEN ? AND ?
      GROUP BY e.id
      ORDER BY total_redeem_count DESC, total_purchase_count DESC
    `).all(startDate, endDate)
  })

  ipcMain.handle('report:export-daily', async (_, date, filePath) => {
    const report = await new Promise(resolve => {
      const targetDate = date || dayjs().format('YYYY-MM-DD')
      const cashPurchases = db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as amount, COALESCE(SUM(quantity), 0) as count
        FROM transactions WHERE date(created_at) = ? AND transaction_type = 'purchase' AND payment_type = 'cash'
      `).get(targetDate)
      const subsidyPurchases = db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as amount, COALESCE(SUM(quantity), 0) as count
        FROM transactions WHERE date(created_at) = ? AND transaction_type = 'purchase' AND payment_type = 'subsidy'
      `).get(targetDate)
      const creditPurchases = db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as amount, COALESCE(SUM(quantity), 0) as count
        FROM transactions WHERE date(created_at) = ? AND transaction_type = 'purchase' AND payment_type = 'credit'
      `).get(targetDate)
      const redemptions = db.prepare(`
        SELECT t.*, e.name as elderly_name, tt.name as ticket_type_name
        FROM transactions t
        JOIN elderly e ON t.elderly_id = e.id
        JOIN ticket_types tt ON t.ticket_type_id = tt.id
        WHERE date(t.created_at) = ? AND t.transaction_type = 'redeem'
      `).all(targetDate)
      const purchases = db.prepare(`
        SELECT t.*, e.name as elderly_name, tt.name as ticket_type_name
        FROM transactions t
        JOIN elderly e ON t.elderly_id = e.id
        JOIN ticket_types tt ON t.ticket_type_id = tt.id
        WHERE date(t.created_at) = ? AND t.transaction_type = 'purchase'
      `).all(targetDate)
      const refunds = db.prepare(`
        SELECT t.*, e.name as elderly_name, tt.name as ticket_type_name
        FROM transactions t
        JOIN elderly e ON t.elderly_id = e.id
        JOIN ticket_types tt ON t.ticket_type_id = tt.id
        WHERE date(t.created_at) = ? AND t.transaction_type = 'refund'
      `).all(targetDate)
      const abnormal = db.prepare(`
        SELECT t.*, e.name as elderly_name, tt.name as ticket_type_name
        FROM transactions t
        JOIN elderly e ON t.elderly_id = e.id
        JOIN ticket_types tt ON t.ticket_type_id = tt.id
        WHERE date(t.created_at) = ? AND t.transaction_type = 'redeem'
          AND tt.meal_type != '通用' AND tt.meal_type != t.meal_type
      `).all(targetDate)
      resolve({ targetDate, cashPurchases, subsidyPurchases, creditPurchases, redemptions, purchases, refunds, abnormal })
    })

    const wb = XLSX.utils.book_new()

    const summaryData = [
      ['社区食堂日结报表', `日期: ${report.targetDate}`],
      [],
      ['项目', '数量', '金额(元)'],
      ['现金购票', report.cashPurchases.count, report.cashPurchases.amount],
      ['补贴购票', report.subsidyPurchases.count, report.subsidyPurchases.amount],
      ['赊账购票', report.creditPurchases.count, report.creditPurchases.amount],
      ['合计购票', report.cashPurchases.count + report.subsidyPurchases.count + report.creditPurchases.count, 
       report.cashPurchases.amount + report.subsidyPurchases.amount + report.creditPurchases.amount],
      [],
      ['午餐核销', report.redemptions.filter(r => r.meal_type === '午餐').reduce((s, r) => s + r.quantity, 0), ''],
      ['异常核销', report.abnormal.length, ''],
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, ws1, '汇总')

    if (report.purchases.length > 0) {
      const purchaseSheet = report.purchases.map(t => ({
        时间: t.created_at,
        老人: t.elderly_name,
        票种: t.ticket_type_name,
        数量: t.quantity,
        单价: t.unit_price,
        金额: t.total_amount,
        支付方式: { cash: '现金', subsidy: '补贴', credit: '赊账', free: '免费' }[t.payment_type],
        经手人: t.handler_name || '',
        备注: t.notes || ''
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(purchaseSheet), '购票明细')
    }

    if (report.redemptions.length > 0) {
      const redeemSheet = report.redemptions.map(t => ({
        时间: t.created_at,
        老人: t.elderly_name,
        票种: t.ticket_type_name,
        餐次: t.meal_type,
        数量: t.quantity,
        操作人: t.operator || '',
        是否异常: (report.abnormal.find(a => a.id === t.id) ? '是' : '')
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(redeemSheet), '核销明细')
    }

    if (report.refunds.length > 0) {
      const refundSheet = report.refunds.map(t => ({
        时间: t.created_at,
        老人: t.elderly_name,
        票种: t.ticket_type_name,
        数量: t.quantity,
        金额: t.total_amount,
        原因: t.refund_reason || ''
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(refundSheet), '退票明细')
    }

    if (report.abnormal.length > 0) {
      const abnormalSheet = report.abnormal.map(t => ({
        时间: t.created_at,
        老人: t.elderly_name,
        票种: t.ticket_type_name,
        票种餐次: t.meal_type,
        核销餐次: t.meal_type,
        数量: t.quantity,
        说明: '票种与核销餐次不匹配'
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(abnormalSheet), '异常核销')
    }

    XLSX.writeFile(wb, filePath)
    return { success: true }
  })

  ipcMain.handle('dialog:save', async (_, options) => {
    return await dialog.showSaveDialog(options)
  })

  ipcMain.handle('dashboard:stats', async () => {
    const today = dayjs().format('YYYY-MM-DD')
    const now = dayjs()

    const elderlyCount = db.prepare('SELECT COUNT(*) as count FROM elderly').get().count
    const ticketCount = db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN transaction_type = 'purchase' AND status = 'active' THEN quantity ELSE 0 END), 0) as count
      FROM transactions
    `).get().count

    const todayPurchases = db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN payment_type = 'cash' THEN total_amount ELSE 0 END), 0) as cash,
             COALESCE(SUM(CASE WHEN payment_type = 'subsidy' THEN total_amount ELSE 0 END), 0) as subsidy,
             COALESCE(SUM(CASE WHEN payment_type = 'credit' THEN total_amount ELSE 0 END), 0) as credit,
             COALESCE(SUM(quantity), 0) as count
      FROM transactions WHERE date(created_at) = ? AND transaction_type = 'purchase'
    `).get(today)

    const todayRedemptions = db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN meal_type = '早餐' THEN quantity ELSE 0 END), 0) as breakfast,
             COALESCE(SUM(CASE WHEN meal_type = '午餐' THEN quantity ELSE 0 END), 0) as lunch,
             COALESCE(SUM(CASE WHEN meal_type = '晚餐' THEN quantity ELSE 0 END), 0) as dinner,
             COALESCE(SUM(quantity), 0) as count
      FROM transactions WHERE date(created_at) = ? AND transaction_type = 'redeem'
    `).get(today)

    const expiringSubsidyCount = db.prepare(`
      SELECT COUNT(*) as count FROM subsidies
      WHERE date(valid_to) BETWEEN ? AND ?
      AND (quantity - used_quantity) > 0
    `).get(today, now.add(7, 'day').format('YYYY-MM-DD')).count

    const expiredCount = db.prepare(`
      SELECT COUNT(*) as count FROM subsidies
      WHERE date(valid_to) < date('now')
      AND (quantity - used_quantity) > 0
    `).get().count

    const overCreditCount = await new Promise(resolve => {
      const limit = getCreditLimit()
      const result = db.prepare(`
        SELECT COUNT(*) as count FROM (
          SELECT elderly_id, COALESCE(SUM(CASE WHEN credit_type = 'borrow' THEN amount ELSE -amount END), 0) as balance
          FROM credit GROUP BY elderly_id HAVING balance > ?
        ) t
      `).get(limit)
      resolve(result ? result.count : 0)
    })

    return {
      elderly_count: elderlyCount,
      active_ticket_count: ticketCount,
      today_purchases: todayPurchases,
      today_redemptions: todayRedemptions,
      expiring_subsidy_count: expiringSubsidyCount,
      expired_subsidy_count: expiredCount,
      over_credit_count: overCreditCount
    }
  })
}

module.exports = { register }
