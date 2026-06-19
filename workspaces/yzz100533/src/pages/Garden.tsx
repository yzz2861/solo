import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Cloud, CloudRain, FastForward, Leaf, Thermometer, Heart } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { PLANT_EMOJI, SEASON_INFO, WEATHER_INFO } from '@/data/plants';
import { getHealthLevel, getMoistureLevel } from '@/utils/gameEngine';
import type { PlantSlot, HealthLevel, MoistureLevel } from '@/types';
import BadgeUnlockModal from '@/components/BadgeUnlockModal';
import WelcomeGuide from '@/components/WelcomeGuide';

const HEALTH_LABEL: Record<HealthLevel, string> = {
  healthy: '健康', good: '良好', fair: '不佳', wilted: '萎蔫', dying: '濒死',
};

const HEALTH_COLOR: Record<HealthLevel, string> = {
  healthy: '#4ADE80', good: '#A3E635', fair: '#FACC15', wilted: '#FB923C', dying: '#EF4444',
};

const MOISTURE_COLOR: Record<MoistureLevel, string> = {
  flooded: '#3B82F6', wet: '#60A5FA', moist: '#67E8F9', dry: '#FBBF24', parched: '#F97316',
};

function PlantPot({ health, isWilted }: { health: number; isWilted: boolean }) {
  const stemH = 16 + (health / 100) * 16;
  const leafColor = health >= 60 ? '#4A7C59' : health >= 30 ? '#C4A76C' : '#A0522D';
  return (
    <svg width="56" height="64" viewBox="0 0 56 64" className={isWilted ? 'animate-wilt' : 'animate-plant-bounce'}>
      <path d="M14 38 L10 56 Q10 60 14 60 L42 60 Q46 60 46 56 L42 38 Z" fill="#8B6F47" stroke="#6B5237" strokeWidth="1" />
      <rect x="12" y="34" width="32" height="6" rx="2" fill="#A07850" stroke="#6B5237" strokeWidth="1" />
      <rect x="18" y="36" width="20" height="3" rx="1" fill="#C4A76C" opacity="0.6" />
      <line x1="28" y1="34" x2="28" y2={34 - stemH} stroke={leafColor} strokeWidth="2.5" strokeLinecap="round" />
      {health >= 20 && <ellipse cx="20" cy={34 - stemH + 6} rx="7" ry="4" fill={leafColor} opacity="0.85" transform={`rotate(-25 20 ${34 - stemH + 6})`} />}
      {health >= 20 && <ellipse cx="36" cy={34 - stemH + 4} rx="7" ry="4" fill={leafColor} opacity="0.85" transform={`rotate(25 36 ${34 - stemH + 4})`} />}
      {health >= 40 && <ellipse cx="16" cy={34 - stemH + 12} rx="6" ry="3.5" fill={leafColor} opacity="0.7" transform={`rotate(-40 16 ${34 - stemH + 12})`} />}
      {health >= 60 && <ellipse cx="40" cy={34 - stemH + 10} rx="6" ry="3.5" fill={leafColor} opacity="0.7" transform={`rotate(40 40 ${34 - stemH + 10})`} />}
      {health >= 80 && <circle cx="28" cy={34 - stemH - 2} r="5" fill="#F4A259" opacity="0.9" />}
      {health >= 80 && <circle cx="28" cy={34 - stemH - 2} r="2.5" fill="#FCD34D" />}
    </svg>
  );
}

function PlantCard({ plant, onClick, index }: { plant: PlantSlot; onClick: () => void; index: number }) {
  const healthLevel = getHealthLevel(plant.health);
  const moistureLevel = getMoistureLevel(plant.soilMoisture);
  const emoji = PLANT_EMOJI[plant.plantType];
  const isWilted = healthLevel === 'wilted' || healthLevel === 'dying';

  return (
    <button
      onClick={onClick}
      className={`garden-card glass-card rounded-2xl p-3 text-left animate-fade-in-up stagger-${index + 1} ${isWilted ? '' : ''}`}
    >
      <div className="flex items-start gap-2 mb-2">
        <div className="plant-pot flex-shrink-0">
          <PlantPot health={plant.health} isWilted={isWilted} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-base">{emoji}</span>
            <span className="font-bold text-[#4A7C59] text-sm truncate">{plant.customName}</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Heart size={11} style={{ color: HEALTH_COLOR[healthLevel] }} className={healthLevel === 'dying' ? 'animate-heartbeat' : ''} />
            <span className="text-[10px] font-bold" style={{ color: HEALTH_COLOR[healthLevel] }}>{HEALTH_LABEL[healthLevel]}</span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] text-[#4A7C59] font-bold">❤️ 生命</span>
            <span className="text-[9px] font-bold" style={{ color: HEALTH_COLOR[healthLevel] }}>{plant.health}%</span>
          </div>
          <div className="w-full bg-gray-200/60 rounded-full h-2 overflow-hidden">
            <div
              className="health-bar h-2 rounded-full"
              style={{
                width: `${plant.health}%`,
                background: `linear-gradient(90deg, ${HEALTH_COLOR.dying}, ${HEALTH_COLOR[healthLevel]})`,
              }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] text-[#4A7C59] font-bold">💧 湿度</span>
            <span className="text-[9px] font-bold" style={{ color: MOISTURE_COLOR[moistureLevel] }}>{plant.soilMoisture}%</span>
          </div>
          <div className="w-full bg-gray-200/60 rounded-full h-2 overflow-hidden relative">
            <div
              className="moisture-bar h-2 rounded-full"
              style={{ width: `${plant.soilMoisture}%`, backgroundColor: MOISTURE_COLOR[moistureLevel] }}
            />
            <div
              className="absolute inset-0 rounded-full overflow-hidden"
              style={{ opacity: 0.3 }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: '200%',
                  background: 'repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255,255,255,0.5) 8px, rgba(255,255,255,0.5) 12px)',
                  animation: 'moistureWave 3s linear infinite',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function Garden() {
  const navigate = useNavigate();
  const { playerName, plants, currentDay, environment, initGame, advanceDays, newBadge, dismissNewBadge, hasSeenGuide, setHasSeenGuide } = useGameStore();
  const [nameInput, setNameInput] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  const seasonInfo = SEASON_INFO[environment.season];
  const weatherInfo = WEATHER_INFO[environment.weather];
  const WeatherIcon = environment.weather === 'rainy' ? CloudRain : environment.weather === 'cloudy' ? Cloud : Sun;

  useEffect(() => {
    if (playerName && !hasSeenGuide && plants.length > 0) {
      setShowGuide(true);
    }
  }, [playerName, hasSeenGuide, plants.length]);

  const handleCloseGuide = () => {
    setShowGuide(false);
    setHasSeenGuide(true);
  };

  if (!playerName || plants.length === 0) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{
          background: 'linear-gradient(160deg, #2D6A4F 0%, #4A7C59 25%, #6BA37A 50%, #95D5B2 75%, #D8F3DC 100%)',
        }}
      >
        <div className="glass-card rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center animate-fade-in-up">
          <div className="text-7xl mb-3 animate-plant-bounce inline-block">🌱</div>
          <h1 className="font-display text-3xl text-white mb-1" style={{ textShadow: '0 2px 8px rgba(74,124,89,0.5)' }}>
            园艺浇水节奏赛
          </h1>
          <p className="text-white/80 text-sm mb-6 font-display">学习正确的浇水节奏，成为园艺小达人！</p>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="请输入你的名字"
            className="w-full px-4 py-3 border-2 border-white/30 bg-white/20 text-white placeholder-white/50 rounded-xl text-center text-lg font-display focus:outline-none focus:border-white/60 mb-4"
            maxLength={20}
          />
          <button
            onClick={() => { if (nameInput.trim()) initGame(nameInput.trim()); }}
            disabled={!nameInput.trim()}
            className="w-full py-3 rounded-xl text-white font-display text-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #F4A259, #E8893C)' }}
          >
            开始园艺之旅 🌿
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-20"
      style={{
        background: `
          radial-gradient(ellipse at 15% 85%, rgba(74,124,89,0.1) 0%, transparent 50%),
          radial-gradient(ellipse at 85% 15%, rgba(244,162,89,0.08) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(107,163,122,0.04) 0%, transparent 70%),
          linear-gradient(180deg, #E8F5E9 0%, #F0F7F0 40%, #FFF8E1 100%)
        `,
      }}
    >
      <div className="p-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4A7C59, #6BA37A)' }}>
              <Leaf className="text-white" size={18} />
            </div>
            <div>
              <span className="font-bold text-[#4A7C59] text-base block leading-tight">{playerName}的花园</span>
              <span className="text-[10px] text-[#4A7C59]/60">一起来照顾植物吧</span>
            </div>
          </div>
          <div
            className="px-4 py-1.5 rounded-full text-sm font-bold text-white shadow-md"
            style={{ background: 'linear-gradient(135deg, #F4A259, #E8893C)' }}
          >
            第 {currentDay} 天
          </div>
        </div>

        <div className="glass-card rounded-2xl p-3 mb-4 flex items-center justify-between animate-fade-in-up stagger-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-lg animate-leaf-sway inline-block">{seasonInfo.icon}</span>
              <span className="text-xs font-bold text-[#4A7C59]">{seasonInfo.name}</span>
            </div>
            <div className="w-px h-4 bg-[#4A7C59]/15" />
            <div className="flex items-center gap-1.5">
              <WeatherIcon size={15} className={`text-[#4A7C59] ${environment.weather === 'sunny' ? 'animate-sun-glow' : ''}`} />
              <span className="text-xs font-bold text-[#4A7C59]">{weatherInfo.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-[#4A7C59]/8 px-2.5 py-1 rounded-full">
            <Thermometer size={13} className="text-[#F4A259]" />
            <span className="text-xs font-bold text-[#4A7C59]">{environment.temperature}°C</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {plants.map((plant, i) => (
            <PlantCard key={plant.id} plant={plant} onClick={() => navigate(`/plant/${plant.id}`)} index={i} />
          ))}
        </div>

        <div className="glass-card rounded-2xl p-3 animate-fade-in-up">
          <div className="flex items-center justify-center gap-2">
            <FastForward size={16} className="text-[#F4A259]" />
            <span className="text-xs font-bold text-[#4A7C59]">快进时间</span>
            {[1, 3, 7].map((days) => (
              <button
                key={days}
                onClick={() => advanceDays(days)}
                className="px-4 py-1.5 rounded-full text-xs font-bold text-white transition-all hover:shadow-md hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #F4A259, #E8893C)' }}
              >
                +{days}天
              </button>
            ))}
          </div>
        </div>
      </div>

      {newBadge && (
        <BadgeUnlockModal
          plantType={newBadge.plantType}
          level={newBadge.level}
          onClose={dismissNewBadge}
        />
      )}

      {showGuide && <WelcomeGuide onClose={handleCloseGuide} />}
    </div>
  );
}
