import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, Cake } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAppStore } from '@/store/useAppStore';
import { DEFAULT_MANAGER_PASSWORD } from '@/utils/constants';
import { getLocalStorage } from '@/hooks/useLocalStorage';
import { STORAGE_KEYS } from '@/utils/constants';

export default function ManagerLogin() {
  const navigate = useNavigate();
  const { enterManagerMode } = useAppStore();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    const savedPassword = getLocalStorage(STORAGE_KEYS.MANAGER_PASSWORD, DEFAULT_MANAGER_PASSWORD);
    if (password === savedPassword) {
      enterManagerMode(password);
      navigate('/manager/dashboard');
    } else {
      setError('密码错误，请重试');
    }
  };

  return (
    <Layout className="max-w-md mx-auto">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-caramel-600 hover:text-caramel-700 mb-8 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>返回首页</span>
      </button>

      <div className="text-center mb-8 animate-fade-in">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-caramel-400 to-caramel-500 rounded-full mb-4 shadow-lg shadow-caramel-200">
          <Cake className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-caramel-800 mb-2">
          🍰 甜品店找零训练
        </h1>
        <p className="text-caramel-600">
          店长管理后台
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 card-shadow animate-fade-in delay-100">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-caramel-100 rounded-full mb-4">
            <Lock className="w-8 h-8 text-caramel-600" />
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
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="请输入密码"
              className="w-full px-4 py-3 border-2 border-caramel-200 rounded-xl focus:outline-none focus:border-caramel-400 transition-colors"
              autoFocus
            />
            {error && (
              <p className="text-sm text-red-500 mt-2 animate-shake">{error}</p>
            )}
          </div>

          <button
            onClick={handleLogin}
            disabled={!password.trim()}
            className="w-full py-3 bg-caramel-500 text-white font-semibold rounded-xl hover:bg-caramel-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            登录管理后台
          </button>
        </div>
      </div>
    </Layout>
  );
}
