import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Settings, Cake } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import StaffCard from '@/components/staff/StaffCard';
import { useAppStore } from '@/store/useAppStore';
import { DEFAULT_MANAGER_PASSWORD } from '@/utils/constants';
import { getLocalStorage } from '@/hooks/useLocalStorage';
import { STORAGE_KEYS } from '@/utils/constants';

export default function Home() {
  const navigate = useNavigate();
  const { staffList, loadStaffList, addStaff, enterManagerMode } = useAppStore();
  const [activeTab, setActiveTab] = useState<'practice' | 'manager'>('practice');
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    loadStaffList();
  }, [loadStaffList]);

  const handleAddStaff = () => {
    if (newStaffName.trim()) {
      addStaff(newStaffName.trim());
      setNewStaffName('');
      setShowAddStaff(false);
    }
  };

  const handleManagerLogin = () => {
    const savedPassword = getLocalStorage(STORAGE_KEYS.MANAGER_PASSWORD, DEFAULT_MANAGER_PASSWORD);
    if (managerPassword === savedPassword) {
      enterManagerMode(managerPassword);
      navigate('/manager/dashboard');
    } else {
      setPasswordError('密码错误，请重试');
    }
  };

  return (
    <Layout className="max-w-2xl mx-auto">
      <div className="text-center mb-8 animate-fade-in">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-500 rounded-full mb-4 shadow-lg shadow-primary-200">
          <Cake className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-caramel-800 mb-2">
          🍰 甜品店找零训练
        </h1>
        <p className="text-caramel-600">
          新员工收银培训，零风险练习找零计算
        </p>
      </div>

      <div className="flex bg-white rounded-2xl p-1 mb-6 card-shadow animate-fade-in delay-100">
        <button
          onClick={() => setActiveTab('practice')}
          className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
            activeTab === 'practice'
              ? 'bg-primary-500 text-white shadow-md'
              : 'text-caramel-600 hover:bg-primary-50'
          }`}
        >
          👨‍🍳 练习模式
        </button>
        <button
          onClick={() => setActiveTab('manager')}
          className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
            activeTab === 'manager'
              ? 'bg-caramel-500 text-white shadow-md'
              : 'text-caramel-600 hover:bg-caramel-50'
          }`}
        >
          👔 店长模式
        </button>
      </div>

      {activeTab === 'practice' && (
        <div className="space-y-4 animate-fade-in delay-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-caramel-700">
              选择店员开始练习
            </h2>
            <button
              onClick={() => setShowAddStaff(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-xl font-medium hover:bg-primary-200 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              添加店员
            </button>
          </div>

          <div className="grid gap-4">
            {staffList.map((staff, index) => (
              <div key={staff.id} style={{ animationDelay: `${index * 100 + 300}ms` }}>
                <StaffCard staff={staff} />
              </div>
            ))}
          </div>

          {staffList.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl card-shadow">
              <p className="text-caramel-500">暂无店员，请先添加</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'manager' && (
        <div className="bg-white rounded-2xl p-6 card-shadow animate-fade-in delay-200">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-caramel-100 rounded-full mb-4">
              <Settings className="w-8 h-8 text-caramel-600" />
            </div>
            <h2 className="text-xl font-bold text-caramel-800 mb-2">
              店长登录
            </h2>
            <p className="text-sm text-caramel-500">
              输入密码进入管理后台
            </p>
            <p className="text-xs text-caramel-400 mt-1">
              默认密码: {DEFAULT_MANAGER_PASSWORD}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-caramel-700 mb-2">
                管理密码
              </label>
              <input
                type="password"
                value={managerPassword}
                onChange={(e) => {
                  setManagerPassword(e.target.value);
                  setPasswordError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleManagerLogin()}
                placeholder="请输入密码"
                className="w-full px-4 py-3 border-2 border-caramel-200 rounded-xl focus:outline-none focus:border-caramel-400 transition-colors"
              />
              {passwordError && (
                <p className="text-sm text-red-500 mt-2">{passwordError}</p>
              )}
            </div>

            <button
              onClick={handleManagerLogin}
              className="w-full py-3 bg-caramel-500 text-white font-semibold rounded-xl hover:bg-caramel-600 transition-colors"
            >
              登录
            </button>
          </div>
        </div>
      )}

      {showAddStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full animate-slide-in-up">
            <h3 className="text-xl font-bold text-caramel-800 mb-4">
              添加新店员
            </h3>
            <input
              type="text"
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddStaff()}
              placeholder="请输入店员姓名"
              className="w-full px-4 py-3 border-2 border-primary-200 rounded-xl focus:outline-none focus:border-primary-400 transition-colors mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddStaff(false)}
                className="flex-1 py-3 bg-caramel-100 text-caramel-700 font-semibold rounded-xl hover:bg-caramel-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddStaff}
                disabled={!newStaffName.trim()}
                className="flex-1 py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
