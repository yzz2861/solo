import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Order, OrderVersion, HistoryRecord, STATUS_MAP, STATUS_COLORS, URGENT_TYPES } from '../types'
import { api } from '../api'

interface Props {
  onRefresh?: () => void
}

export default function OrderDetail({ onRefresh }: Props) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [versions, setVersions] = useState<OrderVersion[]>([])
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [activeTab, setActiveTab] = useState<'info' | 'versions' | 'history'>('info')
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<any>({})
  const [newVersion, setNewVersion] = useState({ image_path: '', is_final: false, notes: '' })
  const [operator, setOperator] = useState('前台')

  useEffect(() => {
    if (id) {
      loadOrder(parseInt(id))
    }
  }, [id])

  const loadOrder = async (orderId: number) => {
    try {
      const data = await api.order.get(orderId)
      setOrder(data.order)
      setVersions(data.versions)
      setHistory(data.history)
      setEditData(data.order)
      onRefresh?.()
    } catch (error) {
      console.error('Failed to load order:', error)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return

    const updates: any = {}
    const fields = ['customer_name', 'customer_phone', 'original_image_path', 
                    'repair_requirements', 'price', 'delivery_date', 'urgent_type', 'urgent_date']
    fields.forEach(field => {
      if (editData[field] !== order?.[field as keyof Order]) {
        updates[field] = field === 'price' ? parseFloat(editData[field]) || 0 : editData[field]
      }
    })

    if (Object.keys(updates).length === 0) {
      setEditing(false)
      return
    }

    try {
      await api.order.update(parseInt(id!), updates, operator)
      alert('更新成功！')
      loadOrder(parseInt(id))
      setEditing(false)
    } catch (error) {
      console.error('Failed to update order:', error)
      alert('更新失败')
    }
  }

  const handleStatusUpdate = async (newStatus: Order['status']) => {
    if (!id || !order) return
    if (newStatus === 'delivered' && order.confirmed === 0) {
      if (!confirm('客户还未确认，确定要标记为已交付吗？系统会记录此操作。')) {
        return
      }
    }
    try {
      await api.order.update(parseInt(id!), { status: newStatus }, operator)
      alert('状态已更新！')
      loadOrder(parseInt(id))
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleConfirm = async () => {
    if (!id) return
    if (!confirm('确认客户已确认订单吗？')) return
    try {
      await api.order.update(parseInt(id!), { confirmed: 1 }, '前台')
      alert('已标记为客户确认！')
      loadOrder(parseInt(id))
    } catch (error) {
      console.error('Failed to confirm:', error)
    }
  }

  const handleAddVersion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    if (!newVersion.image_path.trim()) {
      alert('请输入修复图路径')
      return
    }
    try {
      await api.version.add(parseInt(id!), newVersion)
      alert('版本添加成功！')
      setNewVersion({ image_path: '', is_final: false, notes: '' })
      loadOrder(parseInt(id))
    } catch (error) {
      console.error('Failed to add version:', error)
      alert('添加失败')
    }
  }

  const handleSetFinal = async (versionId: number, isFinal: boolean) => {
    if (!id) return
    try {
      await api.version.setFinal(parseInt(id!), versionId, isFinal)
      loadOrder(parseInt(id))
    } catch (error) {
      console.error('Failed to set final:', error)
    }
  }

  const handleDeleteVersion = async (versionId: number) => {
    if (!confirm('确定删除这个版本吗？')) return
    try {
      await api.version.delete(versionId)
      loadOrder(parseInt(id!))
    } catch (error) {
      console.error('Failed to delete version:', error)
    }
  }

  const formatHistoryValue = (value: string | undefined) => {
    if (!value) return '-'
    if (value.startsWith('{')) {
      try {
        const parsed = JSON.parse(value)
        return Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(', ')
      } catch {
        return value
      }
    }
    if (value.startsWith('version_')) {
      return `新版本 ${value.split('_')[1]}`
    }
    return STATUS_MAP[value] || value
  }

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      customer_name: '客户姓名',
      customer_phone: '联系电话',
      original_image_path: '原图路径',
      repair_requirements: '修复要求',
      price: '报价',
      delivery_date: '交付日期',
      status: '状态',
      confirmed: '确认状态',
      urgent_type: '紧急类型',
      urgent_date: '活动日期',
      order: '创建订单',
      final_version: '设置最终版',
    }
    return labels[field] || field
  }

  if (!order) {
    return (
      <div className="text-center py-16">
        <div className="animate-spin w-12 h-12 border-4 border-vintage-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p>加载中...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-vintage-600 hover:text-vintage-800 text-xl"
          >
            ← 返回
          </button>
          <h2 className="text-2xl font-bold text-vintage-800">
            订单详情 #{order.id}
          </h2>
          {order.urgent_type && (
            <span className="bg-red-500 text-white text-sm px-3 py-1 rounded-full">
              🚨 {URGENT_TYPES.find(t => t.value === order.urgent_type)?.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={operator}
            onChange={e => setOperator(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
          >
            <option value="前台">前台</option>
            <option value="修图师">修图师</option>
            <option value="管理员">管理员</option>
          </select>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${STATUS_COLORS[order.status]}`}>
            {STATUS_MAP[order.status]}
          </span>
          {order.confirmed ? (
            <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              ✓ 客户已确认
            </span>
          ) : (
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium hover:bg-yellow-200"
            >
              ○ 标记客户确认
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {[
          { key: 'info', label: '📋 基本信息' },
          { key: 'versions', label: `🖼️ 版本管理 (${versions.length})` },
          { key: 'history', label: `📜 修改历史 (${history.length})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === tab.key
                ? 'border-vintage-500 text-vintage-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <div>
          <div className="flex justify-end mb-4">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-vintage-100 text-vintage-700 rounded-lg hover:bg-vintage-200"
              >
                ✏️ 编辑
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 bg-vintage-600 text-white rounded-lg hover:bg-vintage-700"
                >
                  保存
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleUpdate} className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">客户姓名</label>
                  <input
                    type="text"
                    value={editData.customer_name}
                    onChange={e => setEditData({ ...editData, customer_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
                  <input
                    type="text"
                    value={editData.customer_phone}
                    onChange={e => setEditData({ ...editData, customer_phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">原图路径</label>
                  <input
                    type="text"
                    value={editData.original_image_path}
                    onChange={e => setEditData({ ...editData, original_image_path: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">报价</label>
                  <input
                    type="number"
                    value={editData.price}
                    onChange={e => setEditData({ ...editData, price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">交付日期</label>
                  <input
                    type="date"
                    value={editData.delivery_date}
                    onChange={e => setEditData({ ...editData, delivery_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">紧急类型</label>
                  <select
                    value={editData.urgent_type}
                    onChange={e => setEditData({ ...editData, urgent_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    {URGENT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">修复要求</label>
                <textarea
                  value={editData.repair_requirements}
                  onChange={e => setEditData({ ...editData, repair_requirements: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <InfoRow label="客户姓名" value={order.customer_name} />
                <InfoRow label="联系电话" value={order.customer_phone} />
                <InfoRow label="原图路径" value={order.original_image_path} copyable />
              </div>
              <div className="space-y-4">
                <InfoRow label="报价" value={`¥${order.price?.toFixed(2)}`} />
                <InfoRow label="交付日期" value={order.delivery_date} />
                <InfoRow 
                  label="紧急类型" 
                  value={URGENT_TYPES.find(t => t.value === order.urgent_type)?.label || '普通'} 
                />
              </div>
              <div className="col-span-2">
                <InfoRow label="修复要求" value={order.repair_requirements} />
              </div>
            </div>
          )}

          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">状态流转</h3>
            <div className="flex flex-wrap gap-3">
              {[
                { status: 'pending', label: '待处理', icon: '⏳' },
                { status: 'repairing', label: '修复中', icon: '🎨' },
                { status: 'review', label: '待审核', icon: '👀' },
                { status: 'delivered', label: '已交付', icon: '📤' },
                { status: 'confirmed', label: '已确认', icon: '✅' },
                { status: 'cancelled', label: '已取消', icon: '❌' },
              ].map(item => (
                <button
                  key={item.status}
                  onClick={() => handleStatusUpdate(item.status as Order['status'])}
                  disabled={order.status === item.status}
                  className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                    order.status === item.status
                      ? 'bg-vintage-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'versions' && (
        <div>
          <div className="bg-vintage-50 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-vintage-700 mb-4">➕ 添加新版本</h3>
            <form onSubmit={handleAddVersion} className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">修复图路径</label>
                <input
                  type="text"
                  value={newVersion.image_path}
                  onChange={e => setNewVersion({ ...newVersion, image_path: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="输入修复完成的图片路径"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newVersion.is_final}
                    onChange={e => setNewVersion({ ...newVersion, is_final: e.target.checked })}
                    className="w-5 h-5 rounded text-vintage-600"
                  />
                  <span className="text-sm font-medium">设为最终版</span>
                </label>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">备注说明</label>
                <input
                  type="text"
                  value={newVersion.notes}
                  onChange={e => setNewVersion({ ...newVersion, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="例如：按要求保留了折痕，脸部未做过多处理"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full px-6 py-2 bg-vintage-600 text-white rounded-lg hover:bg-vintage-700"
                >
                  添加版本
                </button>
              </div>
            </form>
          </div>

          {versions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <span className="text-5xl mb-4 block">🖼️</span>
              <p>暂无版本记录</p>
              <p className="text-sm">修图师完成修复后可在此添加版本</p>
            </div>
          ) : (
            <div className="space-y-4">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className={`border rounded-xl p-5 ${
                    version.is_final ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="bg-vintage-100 text-vintage-700 px-3 py-1 rounded-full text-sm font-medium">
                          版本 {version.version_number}
                        </span>
                        {version.is_final && (
                          <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                            ✓ 最终版
                          </span>
                        )}
                        <span className="text-gray-400 text-sm">
                          {version.created_at}
                        </span>
                      </div>
                      <p className="text-gray-600 font-mono text-sm mb-2">
                        📁 {version.image_path}
                      </p>
                      {version.notes && (
                        <p className="text-gray-500 text-sm">
                          💬 {version.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!version.is_final && (
                        <button
                          onClick={() => handleSetFinal(version.id, true)}
                          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          设为最终版
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteVersion(version.id)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
          <div className="space-y-6">
            {history.length === 0 ? (
              <div className="text-center py-12 text-gray-500 pl-12">
                <span className="text-5xl mb-4 block">📜</span>
                <p>暂无修改记录</p>
              </div>
            ) : (
              history.map(record => (
                <div key={record.id} className="relative pl-12">
                  <div className="absolute left-4 w-5 h-5 rounded-full bg-vintage-500 border-4 border-white shadow"></div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-vintage-100 text-vintage-700 px-2 py-0.5 rounded text-xs font-medium">
                          {record.operator}
                        </span>
                        <span className="font-medium text-gray-700">
                          {getFieldLabel(record.field_name)}
                        </span>
                      </div>
                      <span className="text-gray-400 text-sm">{record.created_at}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      {record.old_value && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">旧值:</span>
                          <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded line-through">
                            {formatHistoryValue(record.old_value)}
                          </span>
                        </div>
                      )}
                      {record.new_value && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">新值:</span>
                          <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded">
                            {formatHistoryValue(record.new_value)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value, copyable = false }: { label: string; value?: string; copyable?: boolean }) {
  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(value)
      alert('已复制到剪贴板')
    }
  }

  return (
    <div className="flex">
      <span className="w-24 text-gray-500 flex-shrink-0">{label}:</span>
      <span className="text-gray-800 flex-1">
        {value || '-'}
        {copyable && value && (
          <button onClick={handleCopy} className="ml-2 text-vintage-500 hover:text-vintage-700 text-sm">
            📋
          </button>
        )}
      </span>
    </div>
  )
}
