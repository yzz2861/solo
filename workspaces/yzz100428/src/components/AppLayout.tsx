import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  CalendarCheck2,
  ClipboardList,
  Clock,
  Wrench,
  Car,
  FileSpreadsheet,
  Tractor,
  CloudRain,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useAppStore, todayStr, tomorrowStr } from '../store/useAppStore';
import { exportTomorrowWorksheet, exportDriverWorksheet } from '../utils/exportCSV';
import { format, addDays, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const navItems = [
  { to: '/', label: '首页看板', icon: CalendarCheck2 },
  { to: '/reservation', label: '预约登记', icon: ClipboardList },
  { to: '/schedule', label: '排班看板', icon: Clock },
  { to: '/maintenance', label: '维修管理', icon: Wrench },
  { to: '/driver', label: '司机视图', icon: Car },
  { to: '/export', label: '数据导出', icon: FileSpreadsheet },
];

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { reservations, batchRescheduleRain } = useAppStore();
  const today = todayStr();

  const handleRainBatch = () => {
    const date = window.prompt('请输入需要批量顺延的日期（格式 YYYY-MM-DD）：', today);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const count = batchRescheduleRain(date);
    if (count > 0) {
      window.alert(`✅ 已将 ${date} 的 ${count} 条作业预约顺延至次日（${format(addDays(parseISO(date), 1), 'yyyy-MM-dd')}），无需逐户电话确认，请到排班看板查看新安排。`);
    } else {
      window.alert(`ℹ️ ${date} 当日无需要顺延的待作业预约。`);
    }
  };

  const handleQuickTomorrow = () => {
    const tmr = tomorrowStr();
    const data = reservations.filter(r => r.workDate === tmr && r.status !== '已取消');
    if (data.length === 0) {
      window.alert('明日暂无预约记录');
      return;
    }
    exportTomorrowWorksheet(reservations, tmr);
  };

  const handleQuickDriverSheet = () => {
    const data = reservations.filter(r => r.workDate === today && r.status !== '已取消');
    if (data.length === 0) {
      window.alert('今日暂无预约记录');
      return;
    }
    exportDriverWorksheet(reservations, today);
  };

  return (
    <div className="min-h-screen bg-farm-texture">
      <header className="sticky top-0 z-40 bg-gradient-to-r from-farm-700 via-farm-600 to-farm-700 text-white shadow-farm border-b-4 border-wheat-500">
        <div className="container flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="w-10 h-10 rounded-xl bg-wheat-500 flex items-center justify-center text-farm-700 text-xl shadow-soft">
              <Tractor size={24} strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="font-serif text-lg md:text-xl font-bold tracking-wide leading-tight">
                农机共享预约台
              </h1>
              <p className="text-xs text-wheat-200/90 tracking-wider">
                乡镇合作社 · 春耕农机调度管理系统
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <div className="text-xs text-wheat-100 mr-2">
              <div>今日 {format(new Date(), 'yyyy年MM月dd日 EEEE', { locale: zhCN })}</div>
            </div>
            <button onClick={handleQuickTomorrow} className="btn btn-wheat btn-sm">
              <FileSpreadsheet size={14} />
              导出明日单
            </button>
            <button onClick={handleQuickDriverSheet} className="btn btn-sm bg-white/10 text-white border-white/20 hover:bg-white/20">
              <Car size={14} />
              今日司机单
            </button>
            <button onClick={handleRainBatch} className="btn btn-sm bg-red-500/90 text-white border-red-400 hover:bg-red-600">
              <CloudRain size={14} />
              雨天批量改期
            </button>
          </div>
        </div>

        <div className="md:hidden flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-thin">
          <button onClick={handleQuickTomorrow} className="btn btn-wheat btn-sm whitespace-nowrap">
            <FileSpreadsheet size={14} />明日单
          </button>
          <button onClick={handleQuickDriverSheet} className="btn btn-sm bg-white/10 text-white border-white/20 whitespace-nowrap">
            <Car size={14} />司机单
          </button>
          <button onClick={handleRainBatch} className="btn btn-sm bg-red-500/90 text-white border-red-400 whitespace-nowrap">
            <CloudRain size={14} />雨天改期
          </button>
        </div>
      </header>

      <div className="container flex gap-6 px-6 py-6">
        <aside className={`
          ${menuOpen ? 'fixed inset-0 top-[100px] z-30 bg-black/40 lg:static lg:bg-transparent lg:inset-auto' : 'hidden'}
          lg:block lg:w-60 lg:flex-shrink-0
        `} onClick={(e) => { if (menuOpen && e.target === e.currentTarget) setMenuOpen(false); }}>
          <nav className="
            bg-white rounded-xl p-3 shadow-soft border border-earth-200/50 space-y-1
            lg:sticky lg:top-[120px]
            ${menuOpen ? 'w-64 max-w-[85vw] ml-auto h-fit mr-3 lg:mr-0 lg:w-full' : ''}
          ">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'active' : ''}`
                }
                onClick={() => setMenuOpen(false)}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>

      <footer className="py-6 text-center text-xs text-earth-400 border-t border-earth-200/50 mt-12">
        🌾 农机共享预约台 · 数据存储于本机浏览器 · 请定期导出备份
      </footer>
    </div>
  );
}
