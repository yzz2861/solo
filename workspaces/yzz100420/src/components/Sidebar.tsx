import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileUp,
  LineChart,
  FileText,
  Palette,
  Flame,
  User,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useFiringStore } from '../store/firingStore';
import { cn } from '../lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '仪表盘', desc: '烧成概览' },
  { to: '/import', icon: FileUp, label: '数据导入', desc: '日志/计划/作品' },
  { to: '/analysis', icon: LineChart, label: '曲线分析', desc: '温度曲线对比' },
  { to: '/report', icon: FileText, label: '复盘报告', desc: '双视图报告' },
  { to: '/works', icon: Palette, label: '作品关联', desc: '釉色与讲评' },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { records, currentRecordId, viewMode, setViewMode } = useFiringStore();
  const currentRecord = records.find((r) => r.id === currentRecordId);

  const goToRecord = (page: string) => {
    if (currentRecordId) {
      navigate(`/${page}/${currentRecordId}`);
    } else {
      navigate(`/${page}`);
    }
  };

  return (
    <aside className="w-72 h-screen flex flex-col bg-white/60 backdrop-blur-xl border-r border-kiln-100 shadow-[4px_0_24px_-12px_rgba(139,67,34,0.15)]">
      <div className="px-6 pt-6 pb-5 border-b border-kiln-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-kiln-gradient flex items-center justify-center shadow-warm glow-orange">
            <Flame className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-gradient-fire leading-tight">
              窑火
            </h1>
            <p className="text-[11px] text-kiln-500 font-medium">陶瓷烧成曲线分析系统</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 border-b border-kiln-100">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-kiln-500 uppercase tracking-wider">
            当前窑次
          </span>
        </div>
        {currentRecord ? (
          <div className="p-3 rounded-xl bg-gradient-to-br from-fire-50 to-kiln-50 border border-fire-100 cursor-pointer hover:shadow-card transition-all"
               onClick={() => goToRecord('analysis')}>
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm font-semibold text-kiln-800 leading-snug line-clamp-1">
                {currentRecord.name}
              </p>
              <span className={`grade-ring w-8 h-8 text-sm grade-${currentRecord.overallGrade} shrink-0`}>
                {currentRecord.overallGrade}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-kiln-600">
              <span className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3" />
                {currentRecord.segments?.length || 0}段
              </span>
              <span>·</span>
              <span>最高 {currentRecord.summary.peakTemp.toFixed(0)}℃</span>
            </div>
            <div className="mt-2 w-full h-1 rounded-full temp-bar opacity-70"></div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-kiln-50 border-2 border-dashed border-kiln-200 text-center">
            <p className="text-xs text-kiln-500 mb-2">暂无烧成记录</p>
            <button className="btn btn-primary !py-1.5 !px-3 text-xs" onClick={() => navigate('/import')}>
              <FileUp className="w-3.5 h-3.5" /> 导入数据
            </button>
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 custom-scroll-container overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            (item.to === '/' && location.pathname === '/') ||
            (item.to !== '/' && location.pathname.startsWith(item.to));
          return (
            <button
              key={item.to}
              onClick={() => goToRecord(item.to.replace('/', '') || '')}
              className={cn(
                'nav-link w-full text-left',
                isActive ? 'nav-link-active' : 'nav-link-inactive',
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" strokeWidth={1.8} />
              <div className="flex-1 min-w-0">
                <div className="leading-tight">{item.label}</div>
                <div className={cn(
                  'text-[11px] font-normal leading-tight mt-0.5',
                  isActive ? 'text-white/75' : 'text-kiln-400',
                )}>
                  {item.desc}
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-kiln-100 space-y-3">
        <div className="p-2 rounded-xl bg-kiln-50 border border-kiln-100">
          <div className="text-[11px] font-semibold text-kiln-500 uppercase tracking-wider mb-2 px-1">
            视图模式
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setViewMode('teacher')}
              className={cn(
                'flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all',
                viewMode === 'teacher'
                  ? 'bg-kiln-gradient text-white shadow-warm'
                  : 'bg-white text-kiln-600 hover:bg-kiln-100 border border-kiln-200',
              )}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              老师
            </button>
            <button
              onClick={() => setViewMode('student')}
              className={cn(
                'flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all',
                viewMode === 'student'
                  ? 'bg-kiln-gradient text-white shadow-warm'
                  : 'bg-white text-kililn-600 hover:bg-kiln-100 border border-kiln-200',
              )}
            >
              <User className="w-3.5 h-3.5" />
              学生
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-clay-300 to-clay-500 flex items-center justify-center text-white text-xs font-bold">
            陶
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-kiln-800 leading-tight">陶艺工作室</p>
            <p className="text-[11px] text-kiln-500">v1.0 · 本窑 {records.length} 次</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
