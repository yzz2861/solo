import { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { Plus, Edit2, Trash2, User, Phone, Mail, MapPin, FileText } from 'lucide-react'
import Modal from '@/components/Modal'
import type { Customer } from '@/types'
import { formatDateShort } from '@/utils'

interface Props {
  searchKeyword: string
}

export default function CustomerManager({ searchKeyword }: Props) {
  const { customers, addCustomer, updateCustomer, deleteCustomer, tapes } = useAppStore()
  const [showModal, setShowModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

  const filtered = customers.filter((c) => {
    if (!searchKeyword) return true
    const kw = searchKeyword.toLowerCase()
    return (
      c.name.toLowerCase().includes(kw) ||
      c.phone.includes(kw) ||
      (c.email || '').toLowerCase().includes(kw)
    )
  })

  const handleSubmit = (data: any) => {
    if (editingCustomer) {
      updateCustomer(editingCustomer.id, data)
    } else {
      addCustomer(data)
    }
    setShowModal(false)
    setEditingCustomer(null)
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setShowModal(true)
  }

  const handleDelete = (customer: Customer) => {
    const hasTapes = tapes.some((t) => t.customerId === customer.id)
    const msg = hasTapes
      ? `确定删除客户「${customer.name}」吗？该客户下的所有磁带数据也会被删除。`
      : `确定删除客户「${customer.name}」吗？`
    if (confirm(msg)) {
      deleteCustomer(customer.id)
    }
  }

  const getTapeCount = (customerId: string) => {
    return tapes.filter((t) => t.customerId === customerId).length
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">客户列表</h3>
          <button
            onClick={() => {
              setEditingCustomer(null)
              setShowModal(true)
            }}
            className="btn-primary btn-sm flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            新增客户
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>暂无客户数据</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((customer) => (
              <div key={customer.id} className="card overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">{customer.name}</h4>
                        <p className="text-xs text-gray-500">
                          {getTapeCount(customer.id)} 盘磁带
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(customer)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(customer)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span>{customer.phone}</span>
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    {customer.address && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate">{customer.address}</span>
                      </div>
                    )}
                    {customer.notes && (
                      <div className="flex items-start gap-2 text-gray-500 text-xs mt-2 pt-2 border-t border-gray-50">
                        <FileText className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                        <span className="line-clamp-2">{customer.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
                  <span>创建于 {formatDateShort(customer.createdAt)}</span>
                  <span>更新于 {formatDateShort(customer.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <CustomerFormModal
          customer={editingCustomer}
          onClose={() => {
            setShowModal(false)
            setEditingCustomer(null)
          }}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}

function CustomerFormModal({
  customer,
  onClose,
  onSubmit
}: {
  customer: Customer | null
  onClose: () => void
  onSubmit: (data: any) => void
}) {
  const [form, setForm] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    address: customer?.address || '',
    notes: customer?.notes || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) {
      alert('请填写客户姓名和电话')
      return
    }
    onSubmit(form)
  }

  return (
    <Modal title={customer ? '编辑客户' : '新增客户'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            客户姓名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input-field"
            placeholder="请输入客户姓名"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            联系电话 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="input-field"
            placeholder="请输入联系电话"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">电子邮箱</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input-field"
            placeholder="请输入电子邮箱（选填）"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="input-field"
            placeholder="请输入地址（选填）"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="input-field h-20 resize-none"
            placeholder="请输入备注信息（选填）"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary btn-sm">
            取消
          </button>
          <button type="submit" className="btn-primary btn-sm">
            {customer ? '保存修改' : '创建客户'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
