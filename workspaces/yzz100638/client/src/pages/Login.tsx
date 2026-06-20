import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, User, Lock, AlertCircle, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/client';
import { cn } from '../utils';

const testUsers = [
  { username: 'surveyor1', name: '张查勘', role: '查勘员', avatar: '👨‍🔧' },
  { username: 'surveyor2', name: '李查勘', role: '查勘员', avatar: '👩‍🔧' },
  { username: 'leader1', name: '王组长', role: '查勘组长', avatar: '👨‍💼' },
];

export default function Login() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('请输入用户名');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authApi.login(username.trim());
      login(response.data.user, response.data.token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || '登录失败，请检查用户名');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (user: typeof testUsers[0]) => {
    setUsername(user.username);
    setLoading(true);
    setError('');

    try {
      const response = await authApi.login(user.username);
      login(response.data.user, response.data.token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 bg-accent-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">车险查勘描述补全系统</h1>
          <p className="text-primary-200">智能补全 · 规范描述 · 降低退回率</p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl p-8"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-6">账号登录</h2>

          {/* Quick Login */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-600 mb-3">
              快速登录（测试账号）
            </label>
            <div className="space-y-2">
              {testUsers.map((user, index) => (
                <motion.button
                  key={user.username}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  onClick={() => handleQuickLogin(user)}
                  disabled={loading}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all",
                    "hover:border-primary-500 hover:bg-primary-50",
                    "border-gray-200 bg-gray-50",
                    loading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span className="text-2xl">{user.avatar}</span>
                  <div className="text-left flex-1">
                    <div className="font-medium text-gray-800">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.role} · {user.username}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </motion.button>
              ))}
            </div>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">或手动输入</span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户名
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-0 outline-none transition-colors"
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-2 p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-600 text-sm"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full py-3 px-4 rounded-xl font-medium text-white transition-all",
                "bg-primary-600 hover:bg-primary-700 active:bg-primary-800",
                "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
                loading && "opacity-70 cursor-not-allowed"
              )}
            >
              {loading ? '登录中...' : '登 录'}
            </button>
          </form>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-6 text-primary-300 text-sm"
        >
          © 2024 车险智能查勘系统 · 让查勘更高效
        </motion.div>
      </div>
    </div>
  );
}
