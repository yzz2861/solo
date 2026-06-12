import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { URGENT_TYPES } from '../types'
import { api } from '../api'

export default function CreateOrder() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    original_image_path: '',
    repair_requirements: '',
    price: '',
    delivery_date: '',
    urgent_type: '',
    urgent_date: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.customer_name.trim()) {
      alert('请输入客户姓名')
      return
    }

    setSubmitting(true)
    try {
      const result = await api.order.create({
        ...formData,
        price: parseFloat(formData.price) || 0,
      })
      alert('订单创建成功！')
      navigate(`/order/${result.id}`)
    } catch (error) {
      console.error('Failed to create order:', error)
      alert('创建失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-vintage-800 mb-6">新建订单</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-gradient-to-r from-vintage-50 to-amber-50 rounded-xl p-6 border border-vintage-200">
          <h3 className="text-lg font-semibold text-vintage-700 mb-4 flex items-center gap-2">
            <span>👤</span> 客户信息
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                客户姓名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vintage-500"
                placeholder="请输入客户姓名"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                联系电话
              </label>
              <input
                type="tel"
                name="customer_phone"
                value={formData.customer_phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vintage-500"
                placeholder="请输入联系电话"
              />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-700 mb-4 flex items-center gap-2">
            <span>🖼️</span> 照片信息
          </h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              扫描原图路径
            </label>
            <input
              type="text"
              name="original_image_path"
              value={formData.original_image_path}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例如: /Users/xxx/Photos/老照片/xxx.jpg"
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 提示：将扫描好的图片文件拖入文件夹后，复制完整路径粘贴到此处
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              修复要求
            </label>
            <textarea
              name="repair_requirements"
              value={formData.repair_requirements}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例如：脸别修太假、保留折痕、去除污渍、还原色彩..."
            />
            <p className="text-xs text-gray-500 mt-1">
              ⚠️ 客户的特殊要求请务必记录清楚，系统会自动检测敏感内容
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
          <h3 className="text-lg font-semibold text-green-700 mb-4 flex items-center gap-2">
            <span>💰</span> 费用与交付
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                报价 (元)
              </label>
              <input
                type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                交付日期
              </label>
              <input
                type="date"
                name="delivery_date"
                value={formData.delivery_date}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-6 border border-red-200">
          <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
            <span>🚨</span> 紧急情况
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                紧急类型
              </label>
              <select
                name="urgent_type"
                value={formData.urgent_type}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {URGENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                活动日期 (如寿宴日期)
              </label>
              <input
                type="date"
                name="urgent_date"
                value={formData.urgent_date}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <p className="text-xs text-red-500 mt-1">
                寿宴等紧急订单不能拖到最后一天！
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-2 bg-vintage-600 text-white rounded-lg hover:bg-vintage-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {submitting ? '创建中...' : '创建订单'}
          </button>
        </div>
      </form>
    </div>
  )
}
