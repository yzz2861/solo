import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Order, STATUS_MAP, STATUS_COLORS, URGENT_TYPES } from '../types'
import { api } from '../api'

interface Props {
  onRefresh?: () => void
}

export default function PendingOrders({ onRefresh }: Props) {
  const [orders, setOrders] = useState<Order[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    loadPendingOrders()
  }, [])

  const loadPendingOrders = async () => {
    try {
      const data = await api.order.pending()
      setOrders(data)
      onRefresh?.()
    } catch (error) {
      console.error('Failed to load pending orders:', error)
    }
  }

  const handleStartRepair = async (orderId: number) => {
    try {
      await api.order.update(orderId, { status: 'repairing' }, '修图师')
      loadPendingOrders()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleSubmitReview = async (orderId: number) => {
    try {
      await api.order.update(orderId, { status: 'review' }, '修图师')
      loadPendingOrders()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const getDaysUntilDelivery = (deliveryDate: string) => {
    if (!deliveryDate) return null
    const today = new Date()
    const delivery = new Date(deliveryDate)
    const diff = Math.ceil((delivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const getUrgencyClass = (order: Order) => {
    const days = getDaysUntilDelivery(order.delivery_date || '')
    if (order.urgent_type === 'birthday_banquet' && days !== null && days <= 1) {
      return 'border-red-500 bg-red-50'
    }
    if (days !== null && days <= 0) {
      return 'border-red-400 bg-red-50'
    }
    if (days !== null && days <= 2) {
      return 'border-orange-400 bg-orange-50'
    }
    if (order.urgent_type) {
      return 'border-yellow-400 bg-yellow-50'
    }
    return 'border-gray-200 bg-white'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-vintage-800">🎨 修图师待处理</h2>
        <button
          onClick={loadPendingOrders}
          className="px-4 py-2 bg-vintage-100 text-vintage-700 rounded-lg hover:bg-vintage-200 transition-colors"
        >
          🔄 刷新
        </button>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="text-3xl font-bold text-blue-600">
            {orders.filter(o => o.status === 'pending').length}
          </div>
          <div className="text-blue-700">待开始</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="text-3xl font-bold text-purple-600">
            {orders.filter(o => o.status === 'repairing').length}
          </div>
          <div className="text-purple-700">修复中</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="text-3xl font-bold text-red-600">
            {orders.filter(o => {
              const days = getDaysUntilDelivery(o.delivery_date || '')
              return days !== null && days <= 2
            }).length}
          </div>
          <div className="text-red-700">临近交付</div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <span className="text-6xl mb-4 block">🎉</span>
          <p className="text-xl">太棒了！没有待处理的订单</p>
          <p className="text-sm mt-2">继续保持高效工作</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const days = getDaysUntilDelivery(order.delivery_date || '')
            return (
              <div
                key={order.id}
                onClick={() => navigate(`/order/${order.id}`)}
                className={`border-l-4 rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow ${getUrgencyClass(order)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xl font-bold text-gray-800">#{order.id}</span>
                      <span className="text-lg font-medium text-gray-800">{order.customer_name}</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[order.status]}`}>
                        {STATUS_MAP[order.status]}
                      </span>
                      {order.urgent_type && (
                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                          🚨 {URGENT_TYPES.find(t => t.value === order.urgent_type)?.label}
                        </span>
                      )}
                      {days !== null && days <= 2 && (
                        <span className={`text-sm font-medium ${days <= 0 ? 'text-red-600' : 'text-orange-600'}`}>
                          {days < 0 ? `已逾期 ${Math.abs(days)} 天` : days === 0 ? '今天交付' : `还剩 ${days} 天`}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <span className="text-gray-500 text-sm">修复要求：</span>
                        <p className="text-gray-700 line-clamp-2">{order.repair_requirements || '无特殊要求'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-sm">原图路径：</span>
                        <p className="text-gray-700 font-mono text-sm truncate">{order.original_image_path || '未提供'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>💰 ¥{order.price?.toFixed(2)}</span>
                      <span>📅 交付: {order.delivery_date || '未安排'}</span>
                      <span>📞 {order.customer_phone || '无电话'}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4" onClick={e => e.stopPropagation()}>
                    {order.status === 'pending' && (
                      <button
                        onClick={() => handleStartRepair(order.id)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 whitespace-nowrap"
                      >
                        开始修复
                      </button>
                    )}
                    {order.status === 'repairing' && (
                      <button
                        onClick={() => handleSubmitReview(order.id)}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 whitespace-nowrap"
                      >
                        提交审核
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/order/${order.id}`)}
                      className="px-4 py-2 bg-vintage-100 text-vintage-700 rounded-lg hover:bg-vintage-200 whitespace-nowrap"
                    >
                      查看详情
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
