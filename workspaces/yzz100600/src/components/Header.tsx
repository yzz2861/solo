import { Droplets, HardHat, ClipboardList } from 'lucide-react';
import { useWaterStore } from '@/store/useWaterStore';

const Header = () => {
  const { viewMode, setViewMode } = useWaterStore();

  return (
    <header className="relative bg-industrial-gradient overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-20 animate-float"
          style={{ background: 'radial-gradient(circle, #00B8D9, transparent 70%)' }}
        />
        <div
          className="absolute top-1/2 -left-16 w-72 h-72 rounded-full opacity-15 animate-float"
          style={{
            background: 'radial-gradient(circle, #345FA8, transparent 70%)',
            animationDelay: '1.5s',
          }}
        />
        <div className="absolute left-1/4 top-1/3 opacity-30">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-aqua-300 animate-drip-down"
              style={{ left: `${i * 16}px`, animationDelay: `${i * 0.7}s` }}
            />
          ))}
        </div>
      </div>

      <div className="container relative py-8 md:py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-center gap-4 animate-fade-up">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
                <Droplets className="w-7 h-7 text-aqua-200" strokeWidth={2} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-status-success flex items-center justify-center">
                <span className="text-[10px] text-white font-bold">OK</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-aqua-400/20 text-aqua-200 border border-aqua-400/30">
                  物业工程系统
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-white/10 text-white/70 border border-white/15">
                  v1.0
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight">
                水塔补水耗时估算系统
              </h1>
              <p className="mt-1 text-sm md:text-base text-white/60">
                精准估算 · 杜绝早高峰缺水投诉 · 记录闭环优化
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-white/10 backdrop-blur border border-white/15 animate-fade-up stagger-2">
            <button
              onClick={() => setViewMode('engineer')}
              className={`tab-btn flex items-center gap-2 ${viewMode === 'engineer' ? 'active' : ''}`}
            >
              <HardHat className="w-4 h-4" strokeWidth={2.2} />
              <span className="text-sm">值班工程师</span>
            </button>
            <button
              onClick={() => setViewMode('supervisor')}
              className={`tab-btn flex items-center gap-2 ${viewMode === 'supervisor' ? 'active' : ''}`}
            >
              <ClipboardList className="w-4 h-4" strokeWidth={2.2} />
              <span className="text-sm">主管审核</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
