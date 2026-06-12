import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import initSqlJs, { Database } from 'sql.js'
import * as XLSX from 'xlsx'

let db: Database
let SQL: any
let dbPath: string

async function initDatabase() {
  SQL = await initSqlJs()
  const userDataPath = app.getPath('userData')
  dbPath = path.join(userDataPath, 'orders.db')

  let dbData: Uint8Array | null = null
  if (fs.existsSync(dbPath)) {
    dbData = fs.readFileSync(dbPath)
  }
  
  db = dbData ? new SQL.Database(dbData) : new SQL.Database()

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      original_image_path TEXT,
      repair_requirements TEXT,
      price REAL DEFAULT 0,
      delivery_date TEXT,
      status TEXT DEFAULT 'pending',
      confirmed INTEGER DEFAULT 0,
      urgent_type TEXT,
      urgent_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      version_number INTEGER DEFAULT 1,
      image_path TEXT,
      is_final INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      field_name TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      operator TEXT DEFAULT 'system',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      warning_type TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `)

  saveDatabase()
  console.log('Database initialized at:', dbPath)
}

function saveDatabase() {
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
}

function checkFileExists(filePath: string): boolean {
  if (!filePath) return true
  return fs.existsSync(filePath)
}

function containsSensitiveContent(text: string): boolean {
  if (!text) return false
  const sensitivePatterns = [
    '领导人', '政治', '敏感', '国家领导人', '总书记', '主席', '总理',
    '反动', '色情', '暴力', '恐怖'
  ]
  return sensitivePatterns.some(pattern => text.includes(pattern))
}

function generateWarnings(order: any, versions: any[]) {
  const warnings: { type: string; message: string }[] = []

  if (order.original_image_path && !checkFileExists(order.original_image_path)) {
    warnings.push({
      type: 'missing_image',
      message: `原图路径不存在: ${order.original_image_path}`
    })
  }

  versions.forEach(v => {
    if (v.image_path && !checkFileExists(v.image_path)) {
      warnings.push({
        type: 'missing_image',
        message: `版本${v.version_number}修复图路径不存在: ${v.image_path}`
      })
    }
  })

  const finalVersions = versions.filter(v => v.is_final === 1)
  if (finalVersions.length > 1) {
    warnings.push({
      type: 'multiple_finals',
      message: `订单有 ${finalVersions.length} 个最终版本，请确认使用哪一个`
    })
  }

  if (order.status === 'delivered' && order.confirmed === 0) {
    warnings.push({
      type: 'unconfirmed_delivery',
      message: '订单标记为已交付但客户未确认'
    })
  }

  if (containsSensitiveContent(order.repair_requirements)) {
    warnings.push({
      type: 'sensitive_content',
      message: '修复要求中可能包含敏感内容，请审核'
    })
  }

  if (order.urgent_type === 'birthday_banquet' && order.delivery_date) {
    const today = new Date()
    const deliveryDate = new Date(order.delivery_date)
    const diffDays = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays <= 1) {
      warnings.push({
        type: 'urgent_warning',
        message: `寿宴照片紧急！距离交付仅剩 ${diffDays} 天，不能拖到最后一天！`
      })
    }
  }

  if (order.delivery_date && order.confirmed === 0 && order.status !== 'cancelled') {
    const today = new Date()
    const deliveryDate = new Date(order.delivery_date)
    const diffDays = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays <= 3 && diffDays >= 0) {
      warnings.push({
        type: 'delivery_reminder',
        message: `距离交付日期还有 ${diffDays} 天，请提醒客户确认`
      })
    } else if (diffDays < 0) {
      warnings.push({
        type: 'overdue',
        message: `订单已逾期 ${Math.abs(diffDays)} 天`
      })
    }
  }

  return warnings
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: '老照片修复订单柜',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(async () => {
  await initDatabase()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  saveDatabase()
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('order:create', async (_, orderData) => {
  const stmt = db.prepare(`
    INSERT INTO orders (customer_name, customer_phone, original_image_path, 
      repair_requirements, price, delivery_date, urgent_type, urgent_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  stmt.run([
    orderData.customer_name,
    orderData.customer_phone || null,
    orderData.original_image_path || null,
    orderData.repair_requirements || null,
    orderData.price || 0,
    orderData.delivery_date || null,
    orderData.urgent_type || null,
    orderData.urgent_date || null
  ])
  
  const lastId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number

  const historyStmt = db.prepare(`
    INSERT INTO history (order_id, field_name, old_value, new_value, operator)
    VALUES (?, ?, ?, ?, ?)
  `)
  historyStmt.run([lastId, 'order', null, JSON.stringify(orderData), '前台'])

  saveDatabase()
  return { id: lastId }
})

ipcMain.handle('order:list', async () => {
  const result = db.exec('SELECT * FROM orders ORDER BY created_at DESC')
  if (result.length === 0) return []
  const columns = result[0].columns
  return result[0].values.map((row: any[]) => {
    const obj: any = {}
    columns.forEach((col: string, i: number) => obj[col] = row[i])
    return obj
  })
})

ipcMain.handle('order:get', async (_, id) => {
  const orderResult = db.exec('SELECT * FROM orders WHERE id = ?', [id])
  const versionsResult = db.exec('SELECT * FROM order_versions WHERE order_id = ? ORDER BY version_number', [id])
  const historyResult = db.exec('SELECT * FROM history WHERE order_id = ? ORDER BY created_at DESC', [id])

  const toObjects = (result: any) => {
    if (result.length === 0) return []
    const columns = result[0].columns
    return result[0].values.map((row: any[]) => {
      const obj: any = {}
      columns.forEach((col: string, i: number) => obj[col] = row[i])
      return obj
    })
  }

  const orders = toObjects(orderResult)
  return { 
    order: orders[0] || null, 
    versions: toObjects(versionsResult), 
    history: toObjects(historyResult) 
  }
})

ipcMain.handle('order:update', async (_, id, updates, operator = 'system') => {
  const oldOrderResult = db.exec('SELECT * FROM orders WHERE id = ?', [id])
  const oldOrder = oldOrderResult.length > 0 ? 
    oldOrderResult[0].columns.reduce((obj: any, col: string, i: number) => {
      obj[col] = oldOrderResult[0].values[0][i]
      return obj
    }, {}) : null
  
  const fields = Object.keys(updates)
  const placeholders = fields.map(f => `${f} = ?`).join(', ')
  const values = [...Object.values(updates), id]

  const stmt = db.prepare(`UPDATE orders SET ${placeholders}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
  stmt.run(values)

  const historyStmt = db.prepare(`
    INSERT INTO history (order_id, field_name, old_value, new_value, operator)
    VALUES (?, ?, ?, ?, ?)
  `)
  fields.forEach(field => {
    historyStmt.run([id, field, String(oldOrder?.[field] || ''), String(updates[field] || ''), operator])
  })

  saveDatabase()
  return { success: true }
})

ipcMain.handle('order:delete', async (_, id) => {
  db.run('DELETE FROM orders WHERE id = ?', [id])
  db.run('DELETE FROM order_versions WHERE order_id = ?', [id])
  db.run('DELETE FROM history WHERE order_id = ?', [id])
  saveDatabase()
  return { success: true }
})

ipcMain.handle('version:add', async (_, orderId, versionData) => {
  const maxResult = db.exec('SELECT COALESCE(MAX(version_number), 0) as max FROM order_versions WHERE order_id = ?', [orderId])
  const maxVersion = maxResult.length > 0 ? (maxResult[0].values[0][0] as number) : 0
  const versionNumber = maxVersion + 1

  const stmt = db.prepare(`
    INSERT INTO order_versions (order_id, version_number, image_path, is_final, notes)
    VALUES (?, ?, ?, ?, ?)
  `)
  stmt.run([orderId, versionNumber, versionData.image_path || null, versionData.is_final ? 1 : 0, versionData.notes || null])

  const lastId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number

  const historyStmt = db.prepare(`
    INSERT INTO history (order_id, field_name, old_value, new_value, operator)
    VALUES (?, ?, ?, ?, ?)
  `)
  historyStmt.run([orderId, `version_${versionNumber}`, null, JSON.stringify(versionData), '修图师'])

  saveDatabase()
  return { id: lastId, versionNumber }
})

ipcMain.handle('version:setFinal', async (_, orderId, versionId, isFinal) => {
  db.run('UPDATE order_versions SET is_final = 0 WHERE order_id = ?', [orderId])
  db.run('UPDATE order_versions SET is_final = ? WHERE id = ?', [isFinal ? 1 : 0, versionId])
  
  const historyStmt = db.prepare(`
    INSERT INTO history (order_id, field_name, old_value, new_value, operator)
    VALUES (?, ?, ?, ?, ?)
  `)
  historyStmt.run([orderId, 'final_version', null, String(versionId), '修图师'])

  saveDatabase()
  return { success: true }
})

ipcMain.handle('version:delete', async (_, id) => {
  db.run('DELETE FROM order_versions WHERE id = ?', [id])
  saveDatabase()
  return { success: true }
})

ipcMain.handle('warnings:check', async () => {
  const ordersResult = db.exec('SELECT * FROM orders')
  if (ordersResult.length === 0) return []
  
  const columns = ordersResult[0].columns
  const orders = ordersResult[0].values.map((row: any[]) => {
    const obj: any = {}
    columns.forEach((col: string, i: number) => obj[col] = row[i])
    return obj
  })

  const allWarnings: any[] = []

  for (const order of orders) {
    const versionsResult = db.exec('SELECT * FROM order_versions WHERE order_id = ?', [order.id])
    const versions = versionsResult.length > 0 ? 
      versionsResult[0].values.map((row: any[]) => {
        const obj: any = {}
        versionsResult[0].columns.forEach((col: string, i: number) => obj[col] = row[i])
        return obj
      }) : []

    const orderWarnings = generateWarnings(order, versions)
    orderWarnings.forEach(w => {
      allWarnings.push({
        ...w,
        order_id: order.id,
        customer_name: order.customer_name,
        order_status: order.status,
      })
    })
  }

  return allWarnings
})

ipcMain.handle('warnings:list', async () => {
  const result = db.exec('SELECT * FROM warnings ORDER BY created_at DESC')
  if (result.length === 0) return []
  const columns = result[0].columns
  return result[0].values.map((row: any[]) => {
    const obj: any = {}
    columns.forEach((col: string, i: number) => obj[col] = row[i])
    return obj
  })
})

ipcMain.handle('warnings:markRead', async (_, id) => {
  db.run('UPDATE warnings SET is_read = 1 WHERE id = ?', [id])
  saveDatabase()
  return { success: true }
})

ipcMain.handle('export:deliveryList', async (_, startDate, endDate) => {
  const result = db.exec(`
    SELECT o.*, v.image_path as final_image_path
    FROM orders o
    LEFT JOIN order_versions v ON o.id = v.order_id AND v.is_final = 1
    WHERE o.delivery_date BETWEEN ? AND ?
    ORDER BY o.delivery_date
  `, [startDate, endDate])

  if (result.length === 0) return []
  
  const columns = result[0].columns
  const orders = result[0].values.map((row: any[]) => {
    const obj: any = {}
    columns.forEach((col: string, i: number) => obj[col] = row[i])
    return obj
  })

  const exportData = orders.map((o: any) => ({
    '客户姓名': o.customer_name,
    '联系电话': o.customer_phone,
    '修复要求': o.repair_requirements,
    '报价': o.price,
    '交付日期': o.delivery_date,
    '状态': getStatusText(o.status),
    '是否确认': o.confirmed ? '是' : '否',
    '紧急类型': o.urgent_type || '普通',
    '最终版路径': o.final_image_path || '',
  }))

  return exportData
})

ipcMain.handle('export:excel', async (_, data, fileName) => {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '订单清单')
  
  const userDataPath = app.getPath('documents')
  const filePath = path.join(userDataPath, `${fileName}.xlsx`)
  XLSX.writeFile(wb, filePath)
  
  return { filePath }
})

ipcMain.handle('orders:pending', async () => {
  const result = db.exec(`
    SELECT o.*, COUNT(v.id) as version_count
    FROM orders o
    LEFT JOIN order_versions v ON o.id = v.order_id
    WHERE o.status IN ('pending', 'repairing')
    GROUP BY o.id
    ORDER BY o.delivery_date IS NULL, o.delivery_date ASC, o.created_at DESC
  `)

  if (result.length === 0) return []
  const columns = result[0].columns
  return result[0].values.map((row: any[]) => {
    const obj: any = {}
    columns.forEach((col: string, i: number) => obj[col] = row[i])
    return obj
  })
})

ipcMain.handle('file:check', async (_, filePath) => {
  return checkFileExists(filePath)
})

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '待处理',
    repairing: '修复中',
    review: '待审核',
    delivered: '已交付',
    confirmed: '已确认',
    cancelled: '已取消',
  }
  return map[status] || status
}
