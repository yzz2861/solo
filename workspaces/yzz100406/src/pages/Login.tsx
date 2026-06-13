import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Lock, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';

export default function Login() {
  const navigate = useNavigate();
  const { login, checkAuth, isAuthenticated, isLoading, error } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/accidents');
    }
  }, [isAuthenticated]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/accidents');
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/30">
            <Car className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight font-serif-cn">
            租车事故交接台
          </h1>
          <p className="text-slate-400 mt-1">Accident Desk</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label-text">用户名</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label-text">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 text-rose-600 text-sm px-4 py-2.5 rounded-lg border border-rose-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || isLoading}
              className="btn-primary w-full"
            >
              {submitting ? '登录中...' : '登 录'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-3">演示账号</p>
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="font-medium text-slate-700 mb-1">店员</p>
                <p>staff1 / staff123</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="font-medium text-slate-700 mb-1">经理</p>
                <p>manager1 / manager123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
