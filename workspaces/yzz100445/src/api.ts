let mockOrders: any[] = []
let mockVersions: any[] = []
let mockHistory: any[] = []
let nextOrderId = 1
let nextVersionId = 1
let nextHistoryId = 1

const isElectron = () => {
  return typeof window !== 'undefined' && !!(window as any).api
}

const mockApi = {
  order: {
    create: async (data: any) => {
      const id = nextOrderId++
      const order = {
        id,
        ...data,
        status: 'pending',
        confirmed: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      mockOrders.push(order)
      
      mockHistory.push({
        id: nextHistoryId++,
        order_id: id,
        field_name: 'order',
        old_value: null,
        new_value: JSON.stringify(data),
        operator: '前台',
        created_at: new Date().toISOString(),
      })
      
      return { id }
    },
    list: async () => {
      return [...mockOrders].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    },
    get: async (id: number) => {
      const order = mockOrders.find(o => o.id === id) || null
      const versions = mockVersions.filter(v => v.order_id === id)
        .sort((a, b) => a.version_number - b.version_number)
      const history = mockHistory.filter(h => h.order_id === id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      return { order, versions, history }
    },
    update: async (id: number, updates: any, operator = 'system') => {
      const order = mockOrders.find(o => o.id === id)
      if (!order) return { success: false }
      
      Object.keys(updates).forEach(field => {
        mockHistory.push({
          id: nextHistoryId++,
          order_id: id,
          field_name: field,
          old_value: String(order[field as keyof typeof order] || ''),
          new_value: String(updates[field] || ''),
          operator,
          created_at: new Date().toISOString(),
        })
        order[field as keyof typeof order] = updates[field]
      })
      order.updated_at = new Date().toISOString()
      
      return { success: true }
    },
    delete: async (id: number) => {
      mockOrders = mockOrders.filter(o => o.id !== id)
      mockVersions = mockVersions.filter(v => v.order_id !== id)
      mockHistory = mockHistory.filter(h => h.order_id !== id)
      return { success: true }
    },
    pending: async () => {
      return mockOrders
        .filter(o => o.status === 'pending' || o.status === 'repairing')
        .map(o => ({
          ...o,
          version_count: mockVersions.filter(v => v.order_id === o.id).length,
        }))
        .sort((a, b) => {
          if (!a.delivery_date && !b.delivery_date) return 0
          if (!a.delivery_date) return 1
          if (!b.delivery_date) return -1
          return new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime()
        })
    },
  },
  version: {
    add: async (orderId: number, data: any) => {
      const maxVersion = Math.max(0, ...mockVersions.filter(v => v.order_id === orderId).map(v => v.version_number))
      const versionNumber = maxVersion + 1
      
      const version = {
        id: nextVersionId++,
        order_id: orderId,
        version_number: versionNumber,
        image_path: data.image_path || null,
        is_final: data.is_final ? 1 : 0,
        notes: data.notes || null,
        created_at: new Date().toISOString(),
      }
      mockVersions.push(version)
      
      mockHistory.push({
        id: nextHistoryId++,
        order_id: orderId,
        field_name: `version_${versionNumber}`,
        old_value: null,
        new_value: JSON.stringify(data),
        operator: '修图师',
        created_at: new Date().toISOString(),
      })
      
      return { id: version.id, versionNumber }
    },
    setFinal: async (orderId: number, versionId: number, isFinal: boolean) => {
      mockVersions.forEach(v => {
        if (v.order_id === orderId) v.is_final = 0
        if (v.id === versionId) v.is_final = isFinal ? 1 : 0
      })
      
      mockHistory.push({
        id: nextHistoryId++,
        order_id: orderId,
        field_name: 'final_version',
        old_value: null,
        new_value: String(versionId),
        operator: '修图师',
        created_at: new Date().toISOString(),
      })
      
      return { success: true }
    },
    delete: async (id: number) => {
      mockVersions = mockVersions.filter(v => v.id !== id)
      return { success: true }
    },
  },
  warnings: {
    check: async () => {
      const warnings: any[] = []
      
      for (const order of mockOrders) {
        const versions = mockVersions.filter(v => v.order_id === order.id)
        
        if (order.original_image_path && !order.original_image_path.includes('不存在') === false) {
          warnings.push({
            type: 'missing_image',
            message: `原图路径不存在: ${order.original_image_path}`,
            order_id: order.id,
            customer_name: order.customer_name,
            order_status: order.status,
          })
        }
        
        const finalVersions = versions.filter(v => v.is_final === 1)
        if (finalVersions.length > 1) {
          warnings.push({
            type: 'multiple_finals',
            message: `订单有 ${finalVersions.length} 个最终版本，请确认使用哪一个`,
            order_id: order.id,
            customer_name: order.customer_name,
            order_status: order.status,
          })
        }
        
        if (order.status === 'delivered' && order.confirmed === 0) {
          warnings.push({
            type: 'unconfirmed_delivery',
            message: '订单标记为已交付但客户未确认',
            order_id: order.id,
            customer_name: order.customer_name,
            order_status: order.status,
          })
        }
        
        if (order.urgent_type === 'birthday_banquet' && order.delivery_date) {
          const today = new Date()
          const deliveryDate = new Date(order.delivery_date)
          const diffDays = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          if (diffDays <= 1) {
            warnings.push({
              type: 'urgent_warning',
              message: `寿宴照片紧急！距离交付仅剩 ${diffDays} 天，不能拖到最后一天！`,
              order_id: order.id,
              customer_name: order.customer_name,
              order_status: order.status,
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
              message: `距离交付日期还有 ${diffDays} 天，请提醒客户确认`,
              order_id: order.id,
              customer_name: order.customer_name,
              order_status: order.status,
            })
          } else if (diffDays < 0) {
            warnings.push({
              type: 'overdue',
              message: `订单已逾期 ${Math.abs(diffDays)} 天`,
              order_id: order.id,
              customer_name: order.customer_name,
              order_status: order.status,
            })
          }
        }
      }
      
      return warnings
    },
    list: async () => [],
    markRead: async () => ({ success: true }),
  },
  export: {
    deliveryList: async (startDate: string, endDate: string) => {
      return mockOrders
        .filter(o => o.delivery_date >= startDate && o.delivery_date <= endDate)
        .map(o => {
          const finalVersion = mockVersions.find(v => v.order_id === o.id && v.is_final === 1)
          return {
            '客户姓名': o.customer_name,
            '联系电话': o.customer_phone,
            '修复要求': o.repair_requirements,
            '报价': o.price,
            '交付日期': o.delivery_date,
            '状态': ({
              pending: '待处理', repairing: '修复中', review: '待审核',
              delivered: '已交付', confirmed: '已确认', cancelled: '已取消',
            } as any)[o.status] || o.status,
            '是否确认': o.confirmed ? '是' : '否',
            '紧急类型': o.urgent_type || '普通',
            '最终版路径': finalVersion?.image_path || '',
          }
        })
    },
    excel: async (data: any[], fileName: string) => {
      console.log('Export to Excel mock:', fileName, data)
      return { filePath: `~/Documents/${fileName}.xlsx` }
    },
  },
  file: {
    check: async (filePath: string) => {
      return !filePath.includes('不存在')
    },
  },
}

export const getApi = () => {
  if (isElectron()) {
    return (window as any).api
  }
  console.warn('⚠️ Running in browser mode with mock API. Data will NOT be persisted.')
  return mockApi
}

export const api = getApi()
