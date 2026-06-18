import { useNavigate } from 'react-router-dom';
import { FlaskConical, Microscope } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A2E23] bg-lab-pattern flex flex-col items-center justify-center relative overflow-hidden px-4">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/5"
            style={{
              width: `${12 + i * 6}px`,
              height: `${12 + i * 6}px`,
              left: `${10 + i * 11}%`,
              bottom: '-20px',
              animation: `bubble-up ${3 + i * 0.5}s ease-in-out ${i * 0.7}s infinite`,
            }}
          />
        ))}
      </div>

      <div className="animate-bubble-up text-center mb-12 z-10">
        <h1 className="font-display text-5xl md:text-6xl text-white mb-4">
          课堂实验安全选择
        </h1>
        <p className="text-white/60 text-lg md:text-xl">
          在情境中学习安全，在选择中养成习惯
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 z-10 animate-bubble-up" style={{ animationDelay: '0.2s' }}>
        <button
          onClick={() => navigate('/login?role=student')}
          className="group w-72 p-8 rounded-2xl bg-[#0D3B2E]/80 backdrop-blur-sm border-2 border-[#2ECC71]
                     flex flex-col items-center gap-4 transition-all duration-300
                     hover:scale-105 hover:shadow-lg hover:shadow-[#2ECC71]/30 cursor-pointer"
        >
          <FlaskConical className="w-16 h-16 text-[#2ECC71] transition-transform duration-300 group-hover:scale-110" />
          <span className="font-display text-2xl text-white">学生入口</span>
          <span className="text-white/50 text-sm">进入安全选择游戏</span>
        </button>

        <button
          onClick={() => navigate('/login?role=teacher')}
          className="group w-72 p-8 rounded-2xl bg-[#0D3B2E]/80 backdrop-blur-sm border-2 border-[#FF6B35]
                     flex flex-col items-center gap-4 transition-all duration-300
                     hover:scale-105 hover:shadow-lg hover:shadow-[#FF6B35]/30 cursor-pointer"
        >
          <Microscope className="w-16 h-16 text-[#FF6B35] transition-transform duration-300 group-hover:scale-110" />
          <span className="font-display text-2xl text-white">教师入口</span>
          <span className="text-white/50 text-sm">管理关卡与查看统计</span>
        </button>
      </div>

      <footer className="absolute bottom-8 text-white/30 text-sm z-10">
        安全第一，实验第二
      </footer>
    </div>
  );
}
