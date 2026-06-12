import { useState, useEffect } from 'react'
import { Order, STATUS_MAP, URGENT_TYPES } from '../types'
import { api } from '../api'

export default function DeliveryExport() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  })
  const [exportData, setExportData] = useState<any[]>([])
  const [unconfirmedOrders, setUnconfirmedOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadDeliveryList()
    loadUnconfirmedOrders()
  }, [])

  const loadDeliveryList = async () => {
    setLoading(true)
    try {
      const data = await api.export.deliveryList(startDate, endDate)
      setExportData(data)
    } catch (error) {
      console.error('Failed to load delivery list:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUnconfirmedOrders = async () => {
    try {
      const orders = await api.order.list()
      const today = new Date()
      const threeDaysLater = new Date()
      threeDaysLater.setDate(today.getDate() + 3)

      const needRemind = orders.filter(o => {
        if (o.confirmed || o.status === 'cancelled') return false
        if (!o.delivery_date) return false
        const delivery = new Date(o.delivery_date)
        return delivery >= today && delivery <= threeDaysLater
      })
      setUnconfirmedOrders(needRemind)
    } catch (error) {
      console.error('Failed to load unconfirmed orders:', error)
    }
  }

  const handleExportExcel = async () => {
    if (exportData.length === 0) {
      alert('没有可导出的数据')
      return
    }
    try {
      const fileName = `老照片修复交付清单_${startDate}_${endDate}`
      const result = await api.export.excel(exportData, fileName)
      alert(`导出成功！文件已保存到:\n${result.filePath}`)
    } catch (error) {
      console.error('Failed to export:', error)
      alert('导出失败')
    }
  }

  const handleSendReminder = (order: any) => {
    const message = `【老照片修复提醒】尊敬的${order.customer_name}您好，您的照片修复订单将于${order.delivery_date}交付，请及时关注。如有问题请联系我们。`
    navigator.clipboard.writeText(message)
    alert(`已复制提醒短信内容到剪贴板：\n\n${message}\n\n请手动发送给客户：${order.customer_phone || '无电话'}`)
  }

  const getStats = () => {
    const total = exportData.length
    const confirmed = exportData.filter(d => d['是否确认'] === '是').length
    const totalAmount = exportData.reduce((sum, d) => sum + (d['报价'] || 0), 0)
    const urgent = exportData.filter(d => d['紧急类型'] !== '普通').length
    return { total, confirmed, totalAmount, urgent }
  }

  const stats = getStats()

  return (
    <div>
      <h2 className="text-2xl font-bold text-vintage-800 mb-6">📊 前台管理中心</h2>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-5">
          <div className="text-3xl font-bold">{stats.total}</div>
          <div className="text-blue-100">订单总数</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-5">
          <div className="text-3xl font-bold">{stats.confirmed}</div>
          <div className="text-green-100">已确认</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-5">
          <div className="text-3xl font-bold">¥{stats.totalAmount.toFixed(0)}</div>
          <div className="text-purple-100">总报价</div>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl p-5">
          <div className="text-3xl font-bold">{stats.urgent}</div>
          <div className="text-red-100">紧急订单</div>
        </div>
      </div>

      {unconfirmedOrders.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-5 mb-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center gap-2">
            <span>⏰</span> 待确认提醒（近3天内交付）
          </h3>
          <div className="space-y-3">
            {unconfirmedOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                <div className="flex items-center gap-4">
                  <span className="font-medium">{order.customer_name}</span>
                  <span className="text-gray-500">订单 #{order.id}</span>
                  <span className="text-orange-600 font-medium">
                    交付日期: {order.delivery_date}
                  </span>
                  {order.urgent_type && (
                    <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                      {URGENT_TYPES.find(t => t.value === order.urgent_type)?.label}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSendReminder(order)}
                    className="px-4 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm"
                  >
                    📱 发送提醒
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-50 rounded-xl p-5 mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">📤 导出交付清单</h3>
        <div className="flex items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vintage-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vintage-500"
            />
          </div>
          <button
            onClick={loadDeliveryList}
            className="px-6 py-2 bg-vintage-100 text-vintage-700 rounded-lg hover:bg-vintage-200"
          >
            🔄 查询
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exportData.length === 0}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📥 导出Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-10 h-10 border-4 border-vintage-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>加载中...</p>
        </div>
      ) : exportData.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <span className="text-5xl mb-4 block">📭</span>
          <p>该时间段内没有订单</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-vintage-50">
                <th className="text-left px-3 py-3 font-semibold text-vintage-700">客户</th>
                <th className="text-left px-3 py-3 font-semibold text-vintage-700">电话</th>
                <th className="text-left px-3 py-3 font-semibold text-vintage-700">修复要求</th>
                <th className="text-left px-3 py-3 font-semibold text-vintage-700">报价</th>
                <th className="text-left px-3 py-3 font-semibold text-vintage-700">交付日期</th>
                <th className="text-left px-3 py-3 font-semibold text-vintage-700">状态</th>
                <th className="text-left px-3 py-3 font-semibold text-vintage-700">确认</th>
                <th className="text-left px-3 py-3 font-semibold text-vintage-700">紧急类型</th>
              </tr>
            </thead>
            <tbody>
              {exportData.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-3 font-medium">{row['客户姓名']}</td>
                  <td className="px-3 py-3 text-gray-600">{row['联系电话'] || '-'}</td>
                  <td className="px-3 py-3 text-gray-600 max-w-xs truncate" title={row['修复要求']}>
                    {row['修复要求'] || '-'}
                  </td>
                  <td className="px-3 py-3 font-semibold text-vintage-700">¥{row['报价']}</td>
                  <td className="px-3 py-3">{row['交付日期']}</td>
                  <td className="px-3 py-3">{row['状态']}</td>
                  <td className="px-3 py-3">
                    <span className={row['是否确认'] === '是' ? 'text-green-600' : 'text-orange-500'}>
                      {row['是否确认']}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {row['紧急类型'] !== '普通' && (
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">
                        {row['紧急类型']}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
