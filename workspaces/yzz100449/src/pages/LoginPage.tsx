import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Smartphone, ShieldCheck, Lock, User, ChevronRight, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useAuthStore, MOCK_OPERATORS, MANAGER_PASSWORD } from '../store/useAuthStore';

export default function LoginPage() {
  const { currentUser, login } = useAuthStore();
  const nav = useNavigate();
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [password, setPassword] = useState('');
  const [pwdVisible, setPwdVisible] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const selected = MOCK_OPERATORS.find(o => o.code === selectedCode) ?? null;
  const isManager = selected?.role === 'manager';

  if (currentUser) return <Navigate to="/register" replace />;

  const handleLogin = () => {
    if (!selected) {
      setErrMsg('请先选择工号');
      return;
    }
    if (isManager) {
      if (password !== MANAGER_PASSWORD) {
        setErrMsg('店长密码错误');
        return;
      }
    }
    setErrMsg('');
    login(selected);
    nav(isManager ? '/dashboard' : '/register', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-slate-50 to-brand-100 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-32 -right-20 w-96 h-96 rounded-full bg-brand-200/40 blur-3xl" />
      <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-brand-300/30 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-soft mb-5 text-white">
            <Smartphone size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">回收估价台</h1>
          <p className="text-sm text-slate-500 mt-2">Phone Recycle Desk · 门店收机系统</p>
        </div>

        <div className="card p-8 shadow-xl">
          <h2 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
            <User size={20} className="text-brand-600" />
            身份登录
          </h2>

          <div className="space-y-5">
            <div>
              <label className="label">选择工号</label>
              <div className="grid grid-cols-2 gap-2.5">
                {MOCK_OPERATORS.map(o => (
                  <button
                    key={o.id}
                    onClick={() => { setSelectedCode(o.code); setErrMsg(''); setPassword(''); }}
                    className={`relative text-left px-3.5 py-3 rounded-xl border-2 transition-all ${
                      selectedCode === o.code
                        ? 'border-brand-500 bg-brand-50 shadow-soft'
                        : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0 ${
                        o.role === 'manager' ? 'bg-warn-500' : 'bg-brand-500'
                      }`}>
                        {o.name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-800 truncate">{o.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">{o.code}</div>
                      </div>
                    </div>
                    <div className="absolute top-2.5 right-2.5">
                      {o.role === 'manager' ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-warn-100 text-warn-700 text-[10px] font-bold">
                          <ShieldCheck size={10} />
                          店长
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold">
                          店员
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {isManager && (
              <div>
                <label className="label flex items-center gap-1.5">
                  <Lock size={14} className="text-warn-600" />
                  店长密码
                </label>
                <div className="relative">
                  <input
                    type={pwdVisible ? 'text' : 'password'}
                    className="input pr-12 font-mono tracking-widest"
                    placeholder="请输入 6 位密码"
                    maxLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  />
                  <button
                    type="button"
                    onClick={() => setPwdVisible(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {pwdVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className="text-[11px] text-slate-400 mt-1.5">默认密码：888888</div>
              </div>
            )}

            {errMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-center gap-2">
                <AlertTriangle size={16} />
                {errMsg}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={!selected || (isManager && password.length !== 6)}
              className="btn-primary w-full text-base py-3"
            >
              进入系统
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="pt-5 mt-5 border-t border-slate-100">
            <div className="text-[11px] text-slate-400 text-center">
              选择工号即代表您已阅读并同意《门店收机操作规范》
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
