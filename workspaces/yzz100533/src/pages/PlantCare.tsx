import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Droplets, Sun, Cloud, CloudRain, Thermometer,
  AlertTriangle, CheckCircle, XCircle, Leaf, Zap,
} from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import {
  PLANT_CONFIGS, PLANT_EMOJI, SEASON_INFO, WEATHER_INFO,
  WATER_AMOUNT_LABELS, ERROR_EXPLANATIONS,
} from '@/data/plants';
import { getHealthLevel, getMoistureLevel, getActionLogsForPlant } from '@/utils/gameEngine';
import type { WaterAmount, PlantSlot, ErrorType } from '@/types';

const PALETTES: Record<string, { stem: string; leaf: string; flower: string; lean: number }> = {
  healthy: { stem: '#4A7C59', leaf: '#66BB6A', flower: '#81C784', lean: 0 },
  good: { stem: '#4A7C59', leaf: '#66BB6A', flower: '#81C784', lean: 0 },
  fair: { stem: '#8D6E63', leaf: '#A5D6A7', flower: '#A5D6A7', lean: 5 },
  wilted: { stem: '#A1887F', leaf: '#C8B560', flower: '#C8B560', lean: 12 },
  dying: { stem: '#5D4037', leaf: '#4E342E', flower: '#4E342E', lean: 22 },
};
const ERR_ICONS: Record<ErrorType, { icon: typeof AlertTriangle; bg: string; label: string }> = {
  overwater: { icon: Droplets, bg: '#DBEAFE', label: '过度浇水' },
  underwater: { icon: Sun, bg: '#FEF3C7', label: '浇水不足' },
  drain_miss: { icon: AlertTriangle, bg: '#FFEDD5', label: '忘记排水' },
  rain_water: { icon: CloudRain, bg: '#E5E7EB', label: '雨天浇水' },
  consecutive_water: { icon: Zap, bg: '#CFFAFE', label: '连续大水' },
};

function PlantSVG({ healthLevel }: { healthLevel: string }) {
  const c = PALETTES[healthLevel] || PALETTES.fair;
  const sway = healthLevel === 'healthy' || healthLevel === 'good' ? 'animate-leaf-sway' : '';
  return (
    <svg viewBox="0 0 120 150" className="w-36 h-40">
      <g transform={`rotate(${c.lean}, 60, 130)`} className={sway}>
        <line x1="60" y1="130" x2="60" y2="50" stroke={c.stem} strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="38" cy="72" rx="20" ry="9" fill={c.leaf} transform="rotate(-25, 38, 72)" />
        <ellipse cx="82" cy="72" rx="20" ry="9" fill={c.leaf} transform="rotate(25, 82, 72)" />
        <ellipse cx="42" cy="56" rx="17" ry="8" fill={c.leaf} transform="rotate(-15, 42, 56)" opacity="0.9" />
        <ellipse cx="78" cy="56" rx="17" ry="8" fill={c.leaf} transform="rotate(15, 78, 56)" opacity="0.9" />
        <circle cx="60" cy="48" r="9" fill={c.flower} />
      </g>
      <rect x="38" y="130" width="44" height="18" rx="4" fill="#8B6F47" className="plant-pot" />
      <rect x="34" y="128" width="52" height="7" rx="3" fill="#A1887F" />
    </svg>
  );
}

function LeafView({ health, healthLevel }: { health: number; healthLevel: string }) {
  const filled = Math.ceil(health / 20);
  const fc = healthLevel === 'dying' ? '#5D4037' : healthLevel === 'wilted' ? '#C8B560' : '#4A7C59';
  const doSway = healthLevel === 'healthy' || healthLevel === 'good';
  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i}
          className={`w-9 h-9 flex items-center justify-center ${i < filled && doSway ? 'animate-leaf-sway' : ''}`}
          style={{ animationDelay: `${i * 0.15}s` }}>
          <Leaf size={22} color={i < filled ? fc : '#E0E0E0'} fill={i < filled ? fc : 'none'} />
        </div>
      ))}
    </div>
  );
}

function RootView({ plant }: { plant: PlantSlot }) {
  const hl = getHealthLevel(plant.health);
  const waterH = (plant.soilMoisture / 100) * 65;
  const rootColor = hl === 'dying' ? '#3E2723' : hl === 'wilted' ? '#5D4037' : '#D7CCC8';
  const rootClass = hl === 'dying' || hl === 'wilted' ? 'animate-root-rot' : 'animate-root-pulse';
  return (
    <svg viewBox="0 0 160 120" className="w-full h-28">
      <rect x="10" y="0" width="140" height="95" rx="5" fill="#8B6F47" />
      <rect x="18" y="8" width="124" height="78" rx="3" fill="#6D4C2A" className="soil-texture" />
      <rect x="18" y={86 - waterH} width="124" height={waterH} rx="3"
        fill="#67C3F0" opacity={plant.soilMoisture > 80 ? 0.5 : 0.25} />
      {plant.soilMoisture > 80 && (
        <rect x="18" y={86 - waterH} width="124" height={waterH} rx="3"
          fill="#67C3F0" opacity="0.3" className="animate-water-splash" />
      )}
      <g className={rootClass}>
        <path d="M80 12 Q60 35 48 58" stroke={rootColor} strokeWidth="2.5" fill="none" />
        <path d="M80 12 Q85 40 95 62" stroke={rootColor} strokeWidth="2.5" fill="none" />
        <path d="M80 12 Q65 30 55 45" stroke={rootColor} strokeWidth="2" fill="none" />
        <path d="M80 12 Q95 32 105 50" stroke={rootColor} strokeWidth="2" fill="none" />
        <path d="M80 12 Q80 42 80 68" stroke={rootColor} strokeWidth="3" fill="none" />
      </g>
      {plant.hasDrainHole ? (
        <>
          <rect x="65" y="95" width="30" height="8" rx="2" fill="#5D4037" />
          <ellipse cx="80" cy="103" rx="10" ry="3" fill="#3E2723" />
          <text x="80" y="116" textAnchor="middle" fontSize="9" fill="#4A7C59">↓ 排水孔</text>
        </>
      ) : (
        <text x="80" y="116" textAnchor="middle" fontSize="9" fill="#F4A259">⚠ 无排水孔</text>
      )}
    </svg>
  );
}

function WaterDrops({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 flex justify-center pointer-events-none overflow-hidden">
      {[0, 1, 2].map(i => (
        <div key={i} className="animate-water-drop" style={{ animationDelay: `${i * 0.15}s`, marginLeft: `${(i - 1) * 24}px` }}>
          <svg viewBox="0 0 20 28" className="w-5 h-7">
            <path d="M10 0C10 0 0 14 0 19C0 24.5 4.5 28 10 28C15.5 28 20 24.5 20 19C20 14 10 0 10 0Z" fill="#67C3F0" />
          </svg>
        </div>
      ))}
      <div className="absolute bottom-0 animate-water-splash">
        <svg viewBox="0 0 64 12" className="w-16 h-3"><ellipse cx="32" cy="6" rx="28" ry="4" fill="#67C3F0" opacity="0.5" /></svg>
      </div>
    </div>
  );
}

function EnvironmentPanel({ environment }: { environment: ReturnType<typeof useGameStore.getState>['environment'] }) {
  const si = SEASON_INFO[environment.season];
  const wi = WEATHER_INFO[environment.weather];
  const WI = environment.weather === 'rainy' ? CloudRain : environment.weather === 'cloudy' ? Cloud : Sun;
  return (
    <div className="garden-card rounded-xl p-3 flex items-center justify-around mt-4">
      <div className="flex items-center gap-1"><span>{si.icon}</span><span className="text-xs font-bold text-[#4A7C59]">{si.name}</span></div>
      <div className="flex items-center gap-1"><WI size={14} className="text-[#4A7C59]" /><span className="text-xs font-bold text-[#4A7C59]">{wi.name}</span></div>
      <div className="flex items-center gap-1"><Thermometer size={14} className="text-[#4A7C59]" /><span className="text-xs font-bold text-[#4A7C59]">{environment.temperature}°C</span></div>
    </div>
  );
}

function MoistureGauge({ moisture }: { moisture: number }) {
  const level = getMoistureLevel(moisture);
  const labels: Record<string, string> = { flooded: '积水', wet: '偏湿', moist: '适宜', dry: '偏干', parched: '干枯' };
  const color = moisture > 80 ? '#2563eb' : moisture > 60 ? '#67C3F0' : moisture > 40 ? '#4A7C59' : moisture > 20 ? '#F4A259' : '#ef4444';
  const circ = 2 * Math.PI * 34;
  return (
    <div className="text-center">
      <div className="text-xs text-gray-500 mb-1 font-bold">土壤湿度</div>
      <div className="relative w-24 h-24 mx-auto">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r="34" fill="none" stroke="#e5e7eb" strokeWidth="7" />
          <circle cx="40" cy="40" r="34" fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={`${(moisture / 100) * circ} ${circ}`} strokeLinecap="round"
            className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold" style={{ color }}>{moisture}%</span>
          <span className="text-[10px] text-gray-400">{labels[level]}</span>
        </div>
      </div>
    </div>
  );
}

function WaterControl({ onWater, onDrain, hasDrainHole, isAnimating }: {
  onWater: (a: WaterAmount) => void; onDrain: () => void; hasDrainHole: boolean; isAnimating: boolean }) {
  const fills: Record<number, string> = { 1: '#90CAF9', 2: '#67C3F0', 3: '#42A5F5' };
  const chars: Record<number, string> = { 1: '少', 2: '适', 3: '多' };
  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-500 text-center font-bold">浇水操作</div>
      <div className="flex gap-3 justify-center">
        {([1, 2, 3] as WaterAmount[]).map(a => (
          <button key={a} onClick={() => onWater(a)} disabled={isAnimating}
            className="flex flex-col items-center gap-1 transition-all active:scale-90 disabled:opacity-50">
            <svg viewBox="0 0 36 48" className="w-9 h-12">
              <path d="M18 2C18 2 4 18 4 28C4 37 10 46 18 46C26 46 32 37 32 28C32 18 18 2 18 2Z"
                fill={fills[a]} stroke="#1565C0" strokeWidth="1" />
              <text x="18" y="32" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">{chars[a]}</text>
            </svg>
            <span className="text-[10px] font-bold text-[#4A7C59]">{WATER_AMOUNT_LABELS[a]}</span>
          </button>
        ))}
      </div>
      {hasDrainHole && (
        <button onClick={onDrain} disabled={isAnimating}
          className="w-full py-2 rounded-xl text-sm font-bold border-2 border-[#67C3F0] text-[#67C3F0] hover:bg-[#67C3F0] hover:text-white active:scale-95 disabled:opacity-50 transition-all">
          💧 排水
        </button>
      )}
    </div>
  );
}

function KnowledgeTip({ errors, onDismiss }: { errors: { type: ErrorType; explanation: string }[]; onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onDismiss}>
      <div className="animate-scale-in bg-white rounded-2xl shadow-2xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-full bg-[#4A7C59]/10 flex items-center justify-center">
            <Leaf className="text-[#4A7C59]" size={20} />
          </div>
          <div>
            <div className="font-bold text-[#4A7C59] font-display">浇水提醒</div>
            <div className="text-[10px] text-gray-400">学习正确的浇水方式</div>
          </div>
        </div>
        <div className="bg-[#f0f7f0] rounded-xl p-2 mb-3 flex items-center justify-center h-20">
          <svg viewBox="0 0 80 60" className="h-16">
            <line x1="40" y1="55" x2="40" y2="15" stroke="#4A7C59" strokeWidth="3" strokeLinecap="round" />
            <ellipse cx="28" cy="22" rx="12" ry="6" fill="#C8B560" transform="rotate(-20, 28, 22)" />
            <ellipse cx="52" cy="22" rx="12" ry="6" fill="#C8B560" transform="rotate(20, 52, 22)" />
            <circle cx="40" cy="14" r="5" fill="#F4A259" />
            <text x="40" y="10" textAnchor="middle" fontSize="7" fill="#5D4037">💧?</text>
          </svg>
        </div>
        {errors.map((err, i) => {
          const info = ERR_ICONS[err.type];
          const Icon = info.icon;
          return (
            <div key={i} className="rounded-xl p-3 mb-2 flex items-start gap-2" style={{ backgroundColor: info.bg }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: info.bg }}><Icon size={14} className="text-[#4A7C59]" /></div>
              <div>
                <div className="text-sm font-bold text-[#4A7C59]">{info.label}</div>
                <div className="text-xs text-gray-600 leading-relaxed">{err.explanation}</div>
              </div>
            </div>
          );
        })}
        <button onClick={onDismiss}
          className="w-full mt-3 py-2.5 rounded-xl text-white font-bold text-sm active:scale-95 transition-transform"
          style={{ backgroundColor: '#4A7C59' }}>
          我知道了 💪
        </button>
      </div>
    </div>
  );
}

export default function PlantCare() {
  const navigate = useNavigate();
  const { plantId } = useParams<{ plantId: string }>();
  const { plants, environment, habits, lastTip, doWater, doDrain, dismissTip } = useGameStore();
  const [viewMode, setViewMode] = useState<'leaf' | 'root'>('leaf');
  const [isAnimating, setIsAnimating] = useState(false);
  const plant = plants.find(p => p.id === plantId);

  if (!plant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #e8f5e9, #f1f8e9)' }}>
        <div className="animate-scale-in bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-[#4A7C59] mb-4 font-display">植物未找到</h2>
          <button onClick={() => navigate('/')} className="px-6 py-2 rounded-xl text-white font-bold" style={{ backgroundColor: '#4A7C59' }}>返回花园</button>
        </div>
      </div>
    );
  }

  const config = PLANT_CONFIGS[plant.plantType];
  const healthLevel = getHealthLevel(plant.health);
  const actionLogs = getActionLogsForPlant(habits, plant.plantType, 5);

  const handleWater = (amount: WaterAmount) => {
    setIsAnimating(true);
    setTimeout(() => { doWater(plant.id, amount); setIsAnimating(false); }, 400);
  };
  const handleDrain = () => doDrain(plant.id);

  return (
    <div className="min-h-screen pb-6" style={{ background: 'linear-gradient(180deg, #f0f7f0 0%, #e8f5e9 40%, #f1f8e9 100%)' }}>
      <div className="p-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-[#4A7C59]/10 transition-colors">
            <ArrowLeft size={22} className="text-[#4A7C59]" />
          </button>
          <h1 className="text-lg font-bold text-[#4A7C59] font-display">{plant.customName}</h1>
          <span className="text-xl">{PLANT_EMOJI[plant.plantType]}</span>
        </div>

        <div className="glass-card rounded-2xl p-4 mb-4 relative overflow-hidden">
          <div className="flex justify-center gap-2 mb-3">
            {(['leaf', 'root'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === m ? 'text-white' : 'text-[#4A7C59] bg-[#4A7C59]/10'}`}
                style={viewMode === m ? { backgroundColor: '#4A7C59' } : {}}>
                {m === 'leaf' ? '🍃 叶片' : '🌱 根系'}
              </button>
            ))}
          </div>
          <div className="relative">
            <div className={`transition-all ${isAnimating ? 'scale-105' : ''}`}>
              <div className="flex flex-col items-center">
                <PlantSVG healthLevel={healthLevel} />
                {viewMode === 'leaf' ? (
                  <div className="mt-2">
                    <div className="text-xs text-gray-500 text-center mb-1">叶片状态</div>
                    <LeafView health={plant.health} healthLevel={healthLevel} />
                  </div>
                ) : (
                  <div className="mt-2 w-full">
                    <div className="text-xs text-gray-500 text-center mb-1">根系状态</div>
                    <RootView plant={plant} />
                  </div>
                )}
              </div>
            </div>
            <WaterDrops show={isAnimating} />
          </div>
        </div>

        <EnvironmentPanel environment={environment} />

        <div className="glass-card rounded-2xl p-4 mt-4 flex items-center justify-around">
          <MoistureGauge moisture={plant.soilMoisture} />
          <WaterControl onWater={handleWater} onDrain={handleDrain} hasDrainHole={plant.hasDrainHole} isAnimating={isAnimating} />
        </div>

        <div className="glass-card rounded-2xl p-4 mt-4">
          <h3 className="text-sm font-bold text-[#4A7C59] mb-3 font-display">📋 养护记录</h3>
          {actionLogs.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">暂无记录</p>
          ) : (
            <div className="space-y-2">
              {actionLogs.map((log, i) => (
                <div key={i} className="flex items-center gap-2 animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                  {log.errors.length > 0 ? <XCircle size={14} className="text-orange-500 flex-shrink-0" /> : <CheckCircle size={14} className="text-green-500 flex-shrink-0" />}
                  <span className="text-xs text-gray-500">第{log.day}天</span>
                  <span className={`text-xs ${log.errors.length > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                    {log.errors.length > 0
                      ? log.errors.map(e => {
                          const labels: Record<string, string> = {
                            overwater: '过度浇水',
                            underwater: '浇水不足',
                            drain_miss: '忘记排水',
                            rain_water: '雨天浇水',
                            consecutive_water: '连续大水',
                          };
                          return labels[e] || e;
                        }).join('、')
                      : '正确养护'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card rounded-2xl p-4 mt-4">
          <h3 className="text-sm font-bold text-[#4A7C59] mb-2 font-display">🌿 植物信息</h3>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{PLANT_EMOJI[plant.plantType]}</span>
            <span className="font-bold text-[#4A7C59]">{config.name}</span>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 flex items-start gap-2">
            <Zap size={14} className="text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-bold text-yellow-700 mb-0.5">特殊规则</div>
              <div className="text-xs text-yellow-800">{config.specialRule}</div>
            </div>
          </div>
        </div>
      </div>

      {lastTip && lastTip.errors.length > 0 && <KnowledgeTip errors={lastTip.errors} onDismiss={dismissTip} />}
    </div>
  );
}
