import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutGrid, ShoppingBasket, Users, Search, FileBarChart,
  Settings, LogOut, User, Award
} from 'lucide-react';
import Home from '@/pages/Home';
import TableDetail from '@/pages/TableDetail';
import Checkout from '@/pages/Checkout';
import Products from '@/pages/Products';
import Members from '@/pages/Members';
import QueryCenter from '@/pages/QueryCenter';
import DailyReport from '@/pages/DailyReport';
import SettingsPage from '@/pages/SettingsPage';
import { ToastContainer, showToast } from '@/components/Toast';
import Modal from '@/components/Modal';
import { useBilliardStore } from '@/store';
import { useAutoPersist } from '@/hooks/useTick';
import { useEffect } from 'react';

function LoginModal() {
  const login = useBilliardStore(s => s.login);
  const operators = useBilliardStore(s => s.operators);
  const hydrateFromIDB = useBilliardStore(s => s.hydrateFromIDB);
  const [username, setUsername] = useState('cashier');
  const [password, setPassword] = useState('123456');
  const [open, setOpen] = useState(true);

  useEffect(() => {
    hydrateFromIDB().catch(() => void 0);
  }, [hydrateFromIDB]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = login(username.trim(), password);
    if (r.ok) {
      showToast(r.message, 'success');
      setOpen(false);
    } else {
      showToast(r.message, 'error');
    }
  };

  const quickLogin = (u: string, p: string) => {
    setUsername(u); setPassword(p);
  };

  return (
    <Modal open={open} onClose={() => setOpen(false)} size="sm" hideClose>
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-felt-500 text-gold-300 mb-3 shadow-lg">
          <Award size={32} />
        </div>
        <h2 className="font-serif text-2xl font-bold text-felt-700">精英台球俱乐部</h2>
        <p className="text-sm text-felt-500 mt-1">计费管理系统 · 请登录</p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label">账号</label>
          <input className="input" value={username} onChange={e => setUsername(e.target.value)} autoFocus placeholder="cashier / admin" />
        </div>
        <div>
          <label className="label">密码</label>
          <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" />
        </div>
        <button type="submit" className="btn-primary w-full py-3 text-base">登 录</button>
      </form>
      <div className="mt-5 pt-4 border-t border-cream-200">
        <div className="text-xs text-felt-500 mb-2 text-center">快速登录</div>
        <div className="grid grid-cols-2 gap-2">
          {operators.map(op => (
            <button key={op.id} type="button"
              onClick={() => quickLogin(op.username, atob(op.password_hash))}
              className="chip border-felt-100 hover:bg-felt-500/5 justify-center">
              <User size={14} className="text-felt-400" />
              <span className="text-felt-700">{op.display_name}</span>
              <span className="badge ml-1 bg-felt-500/10 text-felt-600">{op.role === 'admin' ? '管理员' : '收银员'}</span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function Sidebar() {
  const currentOp = useBilliardStore(s => s.operators.find(o => o.id === s.current_operator_id));
  const logout = useBilliardStore(s => s.logout);
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);

  const navItems = [
    { to: '/', icon: LayoutGrid, label: '桌台' },
    { to: '/products', icon: ShoppingBasket, label: '商品' },
    { to: '/members', icon: Users, label: '会员' },
    { to: '/query', icon: Search, label: '查询' },
    { to: '/daily-report', icon: FileBarChart, label: '日结' },
    { to: '/settings', icon: Settings, label: '设置' },
  ];

  const doLogout = () => {
    logout();
    setShowLogin(true);
    showToast('已退出登录', 'info');
  };

  return (
    <>
      <aside className="no-print fixed left-0 top-0 h-full w-16 bg-gradient-to-b from-felt-700 via-felt-600 to-felt-700 shadow-xl flex flex-col items-center py-5 z-40">
        <div className="w-10 h-10 rounded-xl bg-gold-500/90 flex items-center justify-center text-felt-900 font-serif font-black shadow-inner mb-6">
          台
        </div>
        <nav className="flex-1 flex flex-col gap-1.5 w-full items-center">
          {navItems.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
              title={n.label}
            >
              <n.icon size={20} strokeWidth={1.8} />
            </NavLink>
          ))}
        </nav>
        <div className="flex flex-col items-center gap-2 w-full">
          <button
            onClick={() => currentOp && showToast(`${currentOp.display_name} · ${currentOp.role === 'admin' ? '管理员' : '收银员'}`, 'info')}
            className="w-10 h-10 rounded-full bg-white/15 text-gold-300 flex items-center justify-center hover:bg-white/25 transition-colors"
            title={currentOp?.display_name}
          >
            <User size={18} />
          </button>
          <button onClick={doLogout} className="nav-item" title="退出登录">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      {showLogin && (
        <LoginModal />
      )}
      {/* 强制路由重定向到登录页（没登录就显示 modal） */}
      <div style={{ display: 'none' }}>{/* spacer */}{!currentOp && navigate && null}</div>
    </>
  );
}

function TopBar() {
  const currentOp = useBilliardStore(s => s.operators.find(o => o.id === s.current_operator_id));
  const sessions = useBilliardStore(s => s.sessions);
  const checkouts = useBilliardStore(s => s.checkouts);
  const openCount = sessions.filter(s => !checkouts.some(c => c.session_id === s.id)).length;
  const storeName = useBilliardStore(s => s.settings.store_name);
  return (
    <header className="no-print sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-cream-200">
      <div className="h-14 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="font-serif text-lg font-bold text-felt-700 leading-tight">{storeName}</div>
            <div className="text-[11px] text-felt-400 leading-tight">计费与换桌管理 · 桌面版</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 chip border-gold-300/50 bg-gold-500/5 text-felt-700">
            <span className="status-dot bg-felt-500"></span>
            <span className="text-xs font-medium">空闲桌台</span>
            <span className="text-sm font-bold text-felt-700">{useBilliardStore.getState().tables.filter(t => t.status === 'idle').length}</span>
          </div>
          {openCount > 0 && (
            <div className="flex items-center gap-2 chip border-danger-500/30 bg-danger-500/5 text-danger-500 animate-pulseWarn">
              <span className="status-dot bg-danger-500"></span>
              <span className="text-xs font-medium">未结订单</span>
              <span className="text-sm font-bold">{openCount}</span>
            </div>
          )}
          <div className="h-8 w-px bg-cream-200 mx-1"></div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-felt-500/10 text-felt-600 flex items-center justify-center font-serif font-bold">
              {currentOp?.display_name?.[0] ?? '?'}
            </div>
            <div className="text-xs">
              <div className="font-semibold text-felt-700 leading-tight">{currentOp?.display_name ?? '未登录'}</div>
              <div className="text-felt-400 leading-tight">{currentOp?.role === 'admin' ? '管理员' : '收银员'}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  useAutoPersist();
  const currentOp = useBilliardStore(s => s.current_operator_id);
  if (!currentOp) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-felt-700 via-felt-600 to-felt-900 flex items-center justify-center">
        <LoginModal />
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <AuthGuard>
          <Sidebar />
          <div className="ml-16 flex flex-col min-h-screen">
            <TopBar />
            <main className="flex-1 p-6">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/table/:id" element={<TableDetail />} />
                <Route path="/checkout/:sessionId" element={<Checkout />} />
                <Route path="/products" element={<Products />} />
                <Route path="/members" element={<Members />} />
                <Route path="/query" element={<QueryCenter />} />
                <Route path="/daily-report" element={<DailyReport />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Home />} />
              </Routes>
            </main>
          </div>
        </AuthGuard>
        <ToastContainer />
      </div>
    </Router>
  );
}
