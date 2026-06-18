import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, User, Lock, LogIn, AlertCircle } from 'lucide-react';
import type { UserRole } from '../types';
import { useAuthStore } from '../store/authStore';
import { useSmsStore } from '../store/smsStore';

export const Login = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [role, setRole] = useState<UserRole>('nurse');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuthStore();
  const { initializeWithMockData } = useSmsStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = login(employeeId, role);
      if (success) {
        await initializeWithMockData();
        if (role === 'nurse') {
          navigate('/nurse/import');
        } else {
          navigate('/doctor/workspace');
        }
      } else {
        setError('工号或角色选择错误，请重试');
      }
    } catch {
      setError('登录失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const demoAccounts = [
    { employeeId: 'N2024001', role: 'nurse' as UserRole, name: '张护士', desc: '护士账号' },
    { employeeId: 'D2024001', role: 'doctor' as UserRole, name: '李医生', desc: '医生账号' },
  ];

  const quickLogin = async (account: (typeof demoAccounts)[0]) => {
    setEmployeeId(account.employeeId);
    setRole(account.role);
    setError('');
    setIsLoading(true);

    try {
      const success = login(account.employeeId, account.role);
      if (success) {
        await initializeWithMockData();
        if (account.role === 'nurse') {
          navigate('/nurse/import');
        } else {
          navigate('/doctor/workspace');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30 mb-4"
            >
              <Heart className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">医患短信随访摘要</h1>
            <p className="text-slate-500">智能分析 · 高效处理 · 隐私保护</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8"
          >
            <h2 className="text-xl font-semibold text-slate-800 mb-6 text-center">
              登录系统
            </h2>

            <div className="flex gap-2 mb-6">
              {(['nurse', 'doctor'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all ${
                    role === r
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r === 'nurse' ? '护士' : '医生'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  工号
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="请输入工号"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    placeholder="请输入密码"
                    disabled
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-400"
                    value="demo模式"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">演示模式，无需密码</p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
                >
                  <AlertCircle size={16} />
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoading || !employeeId}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn size={18} />
                    登录系统
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-xs text-slate-400 text-center mb-3">快速登录演示账号</p>
              <div className="grid grid-cols-2 gap-3">
                {demoAccounts.map((account) => (
                  <button
                    key={account.employeeId}
                    onClick={() => quickLogin(account)}
                    disabled={isLoading}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-left transition-all group"
                  >
                    <p className="text-sm font-medium text-slate-700 group-hover:text-blue-600">
                      {account.name}
                    </p>
                    <p className="text-xs text-slate-400">{account.desc}</p>
                    <p className="text-xs text-slate-500 mt-1">工号: {account.employeeId}</p>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          <p className="text-center text-xs text-slate-400 mt-6">
            © 2024 医患随访管理系统 · 保护患者隐私安全
          </p>
        </motion.div>
      </div>
    </div>
  );
};
