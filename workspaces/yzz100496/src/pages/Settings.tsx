import { useState } from 'react';
import { 
  Settings, 
  Calendar, 
  Shield, 
  Home,
  Plus,
  Edit,
  Trash2,
  ChevronRight
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { INSURANCE_PLANS, ROOM_TYPES } from '@/types';
import { formatCurrency, formatDate } from '@/utils';

type TabType = 'trips' | 'insurance' | 'rooms';

export default function SettingsPage() {
  const { trips } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('trips');

  const tabs = [
    { id: 'trips', label: '团期管理', icon: Calendar },
    { id: 'insurance', label: '保险套餐', icon: Shield },
    { id: 'rooms', label: '房型配置', icon: Home },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-warm-800">系统设置</h1>
        <p className="text-warm-500 mt-1">管理团期、保险、房型等配置</p>
      </div>

      <div className="flex gap-1 bg-warm-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-warm-600 hover:text-warm-800'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'trips' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-warm-800">团期列表</h2>
            <button className="btn-primary text-sm">
              <Plus size={16} />
              新建团期
            </button>
          </div>
          
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-warm-50">
                <tr>
                  <th className="text-left p-4 font-medium text-warm-600 text-sm">团期名称</th>
                  <th className="text-left p-4 font-medium text-warm-600 text-sm">目的地</th>
                  <th className="text-left p-4 font-medium text-warm-600 text-sm">出发日期</th>
                  <th className="text-left p-4 font-medium text-warm-600 text-sm">基准价</th>
                  <th className="text-left p-4 font-medium text-warm-600 text-sm">年龄限制</th>
                  <th className="text-left p-4 font-medium text-warm-600 text-sm">状态</th>
                  <th className="text-right p-4 font-medium text-warm-600 text-sm">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                {trips.map(trip => (
                  <tr key={trip.id} className="hover:bg-warm-50 transition-colors">
                    <td className="p-4">
                      <p className="font-medium text-warm-800">{trip.name}</p>
                    </td>
                    <td className="p-4 text-warm-600">{trip.destination}</td>
                    <td className="p-4 text-warm-600">{formatDate(trip.startDate)}</td>
                    <td className="p-4 text-primary-600 font-medium">{formatCurrency(trip.basePrice)}</td>
                    <td className="p-4 text-warm-600">{trip.minChildAge}-{trip.maxChildAge}岁</td>
                    <td className="p-4">
                      <span className={`badge ${trip.status === 'upcoming' ? 'badge-success' : 'badge-gray'}`}>
                        {trip.status === 'upcoming' ? '即将出发' : trip.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button className="btn-ghost p-2 text-warm-500 hover:text-primary-600">
                        <Edit size={16} />
                      </button>
                      <button className="btn-ghost p-2 text-warm-500 hover:text-danger-500">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'insurance' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-warm-800">保险套餐</h2>
            <button className="btn-primary text-sm">
              <Plus size={16} />
              添加套餐
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {INSURANCE_PLANS.map(plan => (
              <div key={plan.id} className="card p-5 hover:shadow-card transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-warm-800">{plan.name}</h3>
                    <p className="text-sm text-warm-500 mt-1">{plan.insurer}</p>
                  </div>
                  <span className="text-primary-600 font-bold text-lg">
                    ¥{plan.premiumPerPerson}
                    <span className="text-sm font-normal text-warm-400">/人</span>
                  </span>
                </div>
                <p className="text-sm text-warm-600 mt-4">{plan.coverage}</p>
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-warm-100">
                  <button className="btn-ghost text-sm py-1.5">
                    <Edit size={14} />
                    编辑
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'rooms' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-warm-800">房型配置</h2>
            <button className="btn-primary text-sm">
              <Plus size={16} />
              添加房型
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ROOM_TYPES.map(room => (
              <div key={room.id} className="card p-5 hover:shadow-card transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
                    <Home size={22} className="text-primary-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-warm-800">{room.name}</h3>
                    <p className="text-sm text-warm-500">可住 {room.capacity} 人</p>
                  </div>
                </div>
                {room.description && (
                  <p className="text-sm text-warm-600">{room.description}</p>
                )}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-warm-100">
                  <span className="text-primary-600 font-bold text-lg">
                    ¥{room.price}<span className="text-sm font-normal text-warm-400">/晚</span>
                  </span>
                  <button className="btn-ghost text-sm py-1.5">
                    <Edit size={14} />
                    编辑
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-6 mt-8">
        <h2 className="text-lg font-semibold text-warm-800 mb-4">系统信息</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-warm-50 rounded-xl">
            <p className="text-sm text-warm-500">系统名称</p>
            <p className="font-medium text-warm-800 mt-1">亲子游合同台</p>
          </div>
          <div className="p-4 bg-warm-50 rounded-xl">
            <p className="text-sm text-warm-500">版本号</p>
            <p className="font-medium text-warm-800 mt-1">v1.0.0</p>
          </div>
          <div className="p-4 bg-warm-50 rounded-xl">
            <p className="text-sm text-warm-500">数据存储</p>
            <p className="font-medium text-warm-800 mt-1">本地存储</p>
          </div>
          <div className="p-4 bg-warm-50 rounded-xl">
            <p className="text-sm text-warm-500">最后更新</p>
            <p className="font-medium text-warm-800 mt-1">{formatDate(new Date())}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
