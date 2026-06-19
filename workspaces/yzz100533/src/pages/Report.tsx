import { useNavigate } from 'react-router-dom';
import { Award, Lock, ArrowLeft, TrendingUp, Star, Heart } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { PLANT_EMOJI, BADGE_NAMES, BADGE_LEVELS, PLANT_CONFIGS } from '@/data/plants';
import { getHabitStats, getBestPlantType } from '@/utils/gameEngine';
import type { ErrorType, PlantType } from '@/types';

const ERROR_CONFIG: Record<ErrorType, { emoji: string; label: string; color: string; bar: string; bg: string; tip: string }> = {
  overwater: { emoji: '💧', label: '过度浇水', color: 'text-blue-700', bar: 'bg-blue-400', bg: 'bg-blue-50', tip: '浇水前先摸摸土壤，湿润就不用浇啦' },
  underwater: { emoji: '🏜️', label: '浇水不足', color: 'text-orange-700', bar: 'bg-orange-400', bg: 'bg-orange-50', tip: '记得每天检查植物，看到土壤干了就浇浇水' },
  drain_miss: { emoji: '🛁', label: '忘记排水', color: 'text-purple-700', bar: 'bg-purple-400', bg: 'bg-purple-50', tip: '选择有排水孔的花盆，让多余的水能流出去' },
  rain_water: { emoji: '🌧️', label: '雨天浇水', color: 'text-slate-700', bar: 'bg-slate-400', bg: 'bg-slate-50', tip: '下雨天植物已经喝饱水了，不用再浇哦' },
  consecutive_water: { emoji: '🌊', label: '连续大水', color: 'text-cyan-700', bar: 'bg-cyan-400', bg: 'bg-cyan-50', tip: '植物需要干湿交替，不能天天浇大水哦' },
};

const PLANT_TYPES: PlantType[] = ['succulent', 'mint', 'seedling', 'flowering'];

function HabitChart({ stats, large = false }: { stats: Record<ErrorType, number>; large?: boolean }) {
  const maxCount = Math.max(...Object.values(stats), 1);
  const barH = large ? 'h-10' : 'h-7';
  const labelW = large ? 'w-28 text-base' : 'w-20 text-xs';

  return (
    <div className="space-y-2.5">
      {(Object.entries(ERROR_CONFIG) as [ErrorType, typeof ERROR_CONFIG[ErrorType]][]).map(([type, cfg]) => (
        <div key={type} className={`flex items-center gap-2 animate-fade-in-up`}>
          <span className={`${labelW} flex items-center gap-1.5 shrink-0`}>
            <span className={large ? 'text-xl' : 'text-sm'}>{cfg.emoji}</span>
            <span className={`font-semibold ${cfg.color}`}>{cfg.label}</span>
          </span>
          <div className="flex-1">
            <div className={`${barH} ${cfg.bg} rounded-xl overflow-hidden`}>
              <div
                className={`${barH} ${cfg.bar} rounded-xl flex items-center px-2.5 transition-all duration-700 ease-out`}
                style={{ width: `${Math.max((stats[type] / maxCount) * 100, stats[type] > 0 ? 10 : 0)}%` }}
              >
                <span className={`font-bold text-white ${large ? 'text-sm' : 'text-xs'}`}>{stats[type]}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function BadgeWall({ badges, large = false }: { badges: ReturnType<typeof useGameStore.getState>['badges']; large?: boolean }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {PLANT_TYPES.map((type, i) => {
        const badge = badges.find((b) => b.plantType === type);
        const earned = !!badge;
        const level = badge?.level ?? 0;
        const emoji = PLANT_EMOJI[type];
        const name = BADGE_NAMES[type];
        const levelName = BADGE_LEVELS.find((bl) => bl.level === level)?.name ?? '';

        return (
          <div
            key={type}
            className={`rounded-2xl p-3 text-center transition-all animate-scale-in ${large ? 'p-5' : ''} ${
              earned
                ? 'bg-gradient-to-b from-yellow-50 to-amber-100 border-2 border-amber-300 shadow-md animate-badge-shine'
                : 'bg-gray-50 border-2 border-dashed border-gray-300 opacity-60'
            }`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className={`${large ? 'text-4xl' : 'text-2xl'} mb-1`}>{emoji}</div>
            <div className={`font-bold ${large ? 'text-sm' : 'text-xs'} ${earned ? 'text-amber-700' : 'text-gray-400'}`}>
              {name}
            </div>
            <div className={`${large ? 'text-lg' : 'text-sm'} mt-1 flex justify-center gap-0.5`}>
              {earned ? (
                Array.from({ length: level }, (_, j) => (
                  <Star key={j} size={large ? 18 : 12} className="text-amber-400 fill-amber-400" />
                ))
              ) : (
                <Lock size={large ? 20 : 14} className="text-gray-300" />
              )}
            </div>
            {earned && levelName && (
              <div className={`text-amber-500 mt-0.5 ${large ? 'text-sm' : 'text-xs'}`}>{levelName}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Report() {
  const navigate = useNavigate();
  const { playerName, habits, badges, currentDay, plants, parentMode, setParentMode } = useGameStore();
  const stats = getHabitStats(habits);
  const maxErrorType = (Object.entries(stats) as [ErrorType, number][]).sort((a, b) => b[1] - a[1])[0];
  const totalErrors = Object.values(stats).reduce((s, v) => s + v, 0);
  const totalCare = plants.reduce((s, p) => s + p.correctCareCount, 0);
  const bestPlant = getBestPlantType(plants);

  if (parentMode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#4A7C59] to-[#F4A259] flex flex-col items-center py-10 px-6">
        <h1 className="text-4xl font-display font-bold text-white mb-2 animate-fade-in-up">🌻 {playerName}的园艺成长记</h1>
        <p className="text-white/80 text-lg mb-8 animate-fade-in-up stagger-1">坚持第 {currentDay} 天</p>

        <div className="w-full max-w-2xl glass-card rounded-3xl p-8 mb-6 animate-fade-in-up stagger-2">
          <h2 className="text-xl font-bold text-[#4A7C59] mb-4 flex items-center gap-2"><TrendingUp size={22} /> 习惯分析</h2>
          <HabitChart stats={stats} large />
        </div>

        <div className="w-full max-w-2xl glass-card rounded-3xl p-8 mb-6 animate-fade-in-up stagger-3">
          <h2 className="text-xl font-bold text-[#4A7C59] mb-4 flex items-center gap-2"><Award size={22} /> 成长徽章</h2>
          <BadgeWall badges={badges} large />
        </div>

        {bestPlant && totalCare > 0 && (
          <div className="w-full max-w-2xl glass-card rounded-3xl p-8 mb-6 animate-fade-in-up" style={{ animationDelay: '0.28s' }}>
            <h2 className="text-xl font-bold text-amber-600 mb-4 flex items-center gap-2">🌟 最擅长的植物</h2>
            <div className="flex items-center gap-6">
              <div className="text-6xl">{PLANT_EMOJI[bestPlant.type]}</div>
              <div>
                <div className="text-2xl font-bold text-amber-800">{PLANT_CONFIGS[bestPlant.type].name}</div>
                <div className="text-base text-amber-600 mt-2">
                  {playerName}照顾{PLANT_CONFIGS[bestPlant.type].name}特别有一套！
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="w-full max-w-2xl glass-card rounded-3xl p-8 mb-8 animate-fade-in-up stagger-4">
          <h2 className="text-xl font-bold text-[#4A7C59] mb-3 flex items-center gap-2"><Heart size={22} /> 成长总结</h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            {playerName}已经坚持了 <span className="font-bold text-[#4A7C59]">{currentDay}</span> 天园艺学习，
            累计正确养护 <span className="font-bold text-[#4A7C59]">{totalCare}</span> 次，
            犯了 <span className="font-bold text-[#F4A259]">{totalErrors}</span> 次小错误。
            {maxErrorType[1] > 0 && (
              <span>最容易出错的是<span className="font-bold text-[#F4A259]">{ERROR_CONFIG[maxErrorType[0]].label}</span>，继续加油哦！</span>
            )}
            {totalErrors === 0 && totalCare > 0 && <span>零错误表现，太棒了！🎉</span>}
          </p>
        </div>

        <button
          onClick={() => setParentMode(false)}
          className="px-10 py-3.5 rounded-2xl text-white font-bold text-lg bg-white/20 hover:bg-white/30 backdrop-blur transition-all animate-fade-in-up stagger-5"
        >
          退出家长模式
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: 'linear-gradient(180deg, #f0f7f0, #e8f5e9)' }}>
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate('/')} className="p-2.5 rounded-xl hover:bg-[#4A7C59]/10 transition-colors">
            <ArrowLeft size={22} className="text-[#4A7C59]" />
          </button>
          <h1 className="text-lg font-display font-bold text-[#4A7C59]">🌻 成长报告</h1>
          <div className="ml-auto">
            <button
              onClick={() => setParentMode(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold border-2 border-[#4A7C59] text-[#4A7C59] hover:bg-[#4A7C59] hover:text-white transition-all flex items-center gap-1.5"
            >
              <Heart size={14} /> 家长开放日
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 animate-fade-in-up stagger-1">
          <h2 className="text-sm font-bold text-[#4A7C59] mb-3 flex items-center gap-1.5"><TrendingUp size={16} /> 习惯分析</h2>
          <HabitChart stats={stats} />
          {totalErrors === 0 && totalCare > 0 && (
            <p className="text-center text-sm text-green-600 mt-3 font-semibold">🎉 零错误，太棒了！</p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 animate-fade-in-up stagger-2">
          <h2 className="text-sm font-bold text-[#4A7C59] mb-3 flex items-center gap-1.5"><Award size={16} /> 徽章墙</h2>
          <BadgeWall badges={badges} />
        </div>

        {bestPlant && totalCare > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 mb-4 animate-fade-in-up stagger-3">
            <h2 className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-1.5">
              🌟 你最擅长照顾
            </h2>
            <div className="flex items-center gap-4">
              <div className="text-5xl">{PLANT_EMOJI[bestPlant.type]}</div>
              <div>
                <div className="text-lg font-bold text-amber-800">{PLANT_CONFIGS[bestPlant.type].name}</div>
                <div className="text-sm text-amber-600 mt-1">
                  养护得非常好！继续保持哦～
                </div>
              </div>
            </div>
          </div>
        )}

        {maxErrorType[1] > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 animate-fade-in-up stagger-3">
            <h2 className="text-sm font-bold text-orange-600 mb-2 flex items-center gap-1.5">💡 最容易出错的习惯</h2>
            <p className="text-sm text-orange-700 leading-relaxed">
              {ERROR_CONFIG[maxErrorType[0]].emoji} {ERROR_CONFIG[maxErrorType[0]].label}
              —— 共 {maxErrorType[1]} 次。下次要特别注意哦！
            </p>
            <p className="text-xs text-orange-500 mt-2">
              💡 小贴士：{ERROR_CONFIG[maxErrorType[0]].tip}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
