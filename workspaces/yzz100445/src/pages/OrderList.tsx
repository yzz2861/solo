import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Order, STATUS_MAP, STATUS_COLORS } from '../types'
import { api } from '../api'

interface Props {
  onRefresh?: () => void
}

export default function OrderList({ onRefresh }: Props) {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const navigate = useNavigate()

  useEffect(() => {
    loadOrders()
  }, [])

  useEffect(() => {
    let result = [...orders]
    if (searchTerm) {
      result = result.filter(
        o =>
          o.customer_name.includes(searchTerm) ||
          (o.customer_phone && o.customer_phone.includes(searchTerm)) ||
          (o.repair_requirements && o.repair_requirements.includes(searchTerm))
      )
    }
    if (statusFilter !== 'all') {
      result = result.filter(o => o.status === statusFilter)
    }
    setFilteredOrders(result)
  }, [orders, searchTerm, statusFilter])

  const loadOrders = async () => {
    try {
      const data = await api.order.list()
      setOrders(data)
      setFilteredOrders(data)
      onRefresh?.()
    } catch (error) {
      console.error('Failed to load orders:', error)
    }
  }

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('确定要删除这个订单吗？相关历史记录也会被删除。')) {
      try {
        await api.order.delete(id)
        loadOrders()
      } catch (error) {
        console.error('Failed to delete order:', error)
      }
    }
  }

  const getUrgentBadge = (order: Order) => {
    if (!order.urgent_type) return null
    const isUrgent = order.urgent_type !== ''
    if (!isUrgent) return null
    
    const label = 
      order.urgent_type === 'birthday_banquet' ? '寿宴' :
      order.urgent_type === 'wedding' ? '婚礼' :
      order.urgent_type === 'funeral' ? '丧葬' : '紧急'
    
    const color = order.urgent_type === 'birthday_banquet' 
      ? 'bg-red-500' 
      : 'bg-orange-500'
    
    return (
      <span className={`${color} text-white text-xs px-2 py-0.5 rounded-full`}>
        🚨 {label}
      </span>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-vintage-800">订单列表</h2>
        <div className="flex gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索客户名、电话、修复要求..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vintage-500"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vintage-500"
          >
            <option value="all">全部状态</option>
            {Object.entries(STATUS_MAP).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <button
            onClick={loadOrders}
            className="px-4 py-2 bg-vintage-100 text-vintage-700 rounded-lg hover:bg-vintage-200 transition-colors"
          >
            🔄 刷新
          </button>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <span className="text-6xl mb-4 block">📭</span>
          <p className="text-lg">暂无订单</p>
          <p className="text-sm mt-2">点击"新建订单"开始录入</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-vintage-50">
                <th className="text-left px-4 py-3 font-semibold text-vintage-700">客户</th>
                <th className="text-left px-4 py-3 font-semibold text-vintage-700">修复要求</th>
                <th className="text-left px-4 py-3 font-semibold text-vintage-700">报价</th>
                <th className="text-left px-4 py-3 font-semibold text-vintage-700">交付日期</th>
                <th className="text-left px-4 py-3 font-semibold text-vintage-700">状态</th>
                <th className="text-left px-4 py-3 font-semibold text-vintage-700">确认</th>
                <th className="text-left px-4 py-3 font-semibold text-vintage-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr
                  key={order.id}
                  onClick={() => navigate(`/order/${order.id}`)}
                  className="border-b border-gray-100 hover:bg-vintage-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{order.customer_name}</span>
                      {getUrgentBadge(order)}
                    </div>
                    {order.customer_phone && (
                      <span className="text-sm text-gray-500">{order.customer_phone}</span>
                    )}
                  </td>
                  <td className="px-4 py-4 max-w-xs">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {order.repair_requirements || '-'}
                    </p>
                  </td>
                  <td className="px-4 py-4 font-semibold text-vintage-700">
                    ¥{order.price?.toFixed(2)}
                  </td>
                  <td className="px-4 py-4">
                    <span className={new Date(order.delivery_date || '') < new Date() && order.status !== 'confirmed' && order.status !== 'cancelled'
                      ? 'text-red-600 font-medium'
                      : 'text-gray-600'
                    }>
                      {order.delivery_date || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[order.status]}`}>
                      {STATUS_MAP[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={order.confirmed ? 'text-green-600' : 'text-gray-400'}>
                      {order.confirmed ? '✓ 已确认' : '○ 未确认'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button
                      className="px-3 py-1 text-sm bg-vintage-100 text-vintage-700 rounded hover:bg-vintage-200 transition-colors"
                    >
                      查看
                    </button>
                    <button
                      onClick={e => handleDelete(order.id, e)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                    >
                      删除
                    </button>
                  </div>
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
