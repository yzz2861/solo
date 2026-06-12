import { UserPlus, FileText, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CalibrationForm, Customer, Unit, WeightClassOrEmpty } from '@/types'

const ACCURACY_GRADES: WeightClassOrEmpty[] = ['E1', 'E2', 'F1', 'F2', 'M1', 'M2', 'M3']
const WEIGHT_UNITS: Unit[] = ['mg', 'g', 'kg']

interface BasicInfoCardProps {
  form: CalibrationForm
  customers: Customer[]
  onChange: <K extends keyof CalibrationForm>(key: K, value: CalibrationForm[K]) => void
  onNewCustomer?: () => void
}

function generateCertNo(): string {
  const year = new Date().getFullYear()
  const seq = String(Math.floor(Math.random() * 90000) + 10000)
  return `JL${year}${seq}`
}

export default function BasicInfoCard({ form, customers, onChange, onNewCustomer }: BasicInfoCardProps) {
  const handleCalDateChange = (date: string) => {
    const nextRecal = date
      ? new Date(new Date(date).setFullYear(new Date(date).getFullYear() + 1))
          .toISOString()
          .split('T')[0]
      : ''
    onChange('calibrationDate', date)
    onChange('nextRecalDate', nextRecal)
  }

  const handleCustomerSelect = (id: string) => {
    if (id === '__new__') {
      onChange('customerId', '')
      onChange('customerName', '')
      onChange('customerContact', '')
      onChange('customerPhone', '')
      onNewCustomer?.()
    } else {
      const c = customers.find((o) => o.id === id)
      if (c) {
        onChange('customerId', c.id)
        onChange('customerName', c.name)
        onChange('customerContact', c.contact)
        onChange('customerPhone', c.phone)
      }
    }
  }

  const handleAutoCertNo = () => {
    onChange('certNumber', generateCertNo())
  }

  const isNewCustomer = form.customerId === '' && form.customerName === ''

  return (
    <div className={cn('bg-white rounded-lg border border-blue-200 overflow-hidden shadow-sm')}>
      <div className="bg-blue-600 px-5 py-3 flex items-center gap-2">
        <FileText className="w-5 h-5 text-white" />
        <h3 className="text-white font-semibold text-base">基本信息</h3>
      </div>

      <div className="p-5 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">客户信息</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <select
                value={form.customerId || (isNewCustomer ? '__new__' : '')}
                onChange={(e) => handleCustomerSelect(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">选择客户...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="__new__">+ 新建客户</option>
              </select>
            </div>
            <div>
              <div className="relative">
                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={form.customerName}
                  onChange={(e) => onChange('customerName', e.target.value)}
                  placeholder="客户名称"
                  className="w-full h-10 pl-9 pr-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
            <div>
              <div className="relative">
                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={form.customerContact}
                  onChange={(e) => onChange('customerContact', e.target.value)}
                  placeholder="联系人"
                  className="w-full h-10 pl-9 pr-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div className="md:col-start-3">
              <input
                type="tel"
                value={form.customerPhone}
                onChange={(e) => onChange('customerPhone', e.target.value)}
                placeholder="联系电话"
                className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">证书编号</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={form.certNumber}
                onChange={(e) => onChange('certNumber', e.target.value)}
                className="flex-1 h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
              />
              <button
                onClick={handleAutoCertNo}
                className="inline-flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-md text-xs font-medium hover:bg-blue-100 transition-colors whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                自动生成
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">校准日期</label>
            <input
              type="date"
              value={form.calibrationDate}
              onChange={(e) => handleCalDateChange(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">被校砝码信息</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">标称值</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={form.nominalValue || ''}
                  onChange={(e) => onChange('nominalValue', parseFloat(e.target.value) || 0)}
                  placeholder="数值"
                  className="flex-1 h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono text-right"
                />
                <select
                  value={form.nominalUnit}
                  onChange={(e) => onChange('nominalUnit', e.target.value as Unit)}
                  className="w-20 h-10 px-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  {WEIGHT_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">准确度等级</label>
              <select
                value={form.weightClass}
                onChange={(e) => onChange('weightClass', e.target.value as WeightClassOrEmpty)}
                className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {ACCURACY_GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">砝码编号</label>
              <input
                type="text"
                value={form.weightSerial}
                onChange={(e) => onChange('weightSerial', e.target.value)}
                placeholder="如：FM-001-2024"
                className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
