import { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import CustomerManager from '@/components/CustomerManager'
import TapeManager from '@/components/TapeManager'
import DeliveryPanel from '@/components/DeliveryPanel'
import { Users, Video, Package, Search } from 'lucide-react'

export default function ReceptionView() {
  const [activeTab, setActiveTab] = useState<'customers' | 'tapes' | 'delivery'>('customers')
  const [searchKeyword, setSearchKeyword] = useState('')
  const { customers, tapes } = useAppStore()

  const tabs = [
    { key: 'customers', label: '客户管理', icon: Users },
    { key: 'tapes', label: '磁带管理', icon: Video },
    { key: 'delivery', label: '交付清单', icon: Package }
  ]

  const stats = [
    { label: '客户总数', value: customers.length, color: 'from-blue-500 to-blue-600' },
    { label: '磁带总数', value: tapes.length, color: 'from-purple-500 to-purple-600' },
    { label: '待转录', value: tapes.filter((t) => t.status === 'pending').length, color: 'from-yellow-500 to-yellow-600' },
    { label: '可交付', value: tapes.filter((t) => t.status === 'completed' && !t.delivered).length, color: 'from-green-500 to-green-600' }
  ]

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-gray-100 bg-white">
        <div className="grid grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} opacity-80`}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-100">
          <div className="flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索客户/磁带..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-9 pr-4 py-2 w-64 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeTab === 'customers' && <CustomerManager searchKeyword={searchKeyword} />}
          {activeTab === 'tapes' && <TapeManager searchKeyword={searchKeyword} />}
          {activeTab === 'delivery' && <DeliveryPanel searchKeyword={searchKeyword} />}
        </div>
      </div>
    </div>
  )
}
