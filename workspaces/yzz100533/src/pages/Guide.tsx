import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Droplets, Sun, AlertCircle, Cloud, Thermometer, Eye } from 'lucide-react';
import { PLANT_CONFIGS, PLANT_EMOJI, ERROR_EXPLANATIONS } from '@/data/plants';
import type { PlantType, ErrorType } from '@/types';

const PLANT_TYPES: PlantType[] = ['succulent', 'mint', 'seedling', 'flowering'];

const TYPE_ERRORS: Record<PlantType, ErrorType[]> = {
  succulent: ['overwater', 'drain_miss', 'consecutive_water'],
  mint: ['underwater', 'drain_miss'],
  seedling: ['overwater', 'underwater', 'consecutive_water'],
  flowering: ['rain_water', 'underwater'],
};

const ERROR_ICONS: Record<ErrorType, string> = {
  overwater: '💧', underwater: '🏜️', drain_miss: '🛁', rain_water: '🌧️', consecutive_water: '🌊',
};

const ERROR_LABELS: Record<ErrorType, string> = {
  overwater: '过度浇水', underwater: '浇水不足', drain_miss: '忘记排水', rain_water: '雨天浇水', consecutive_water: '连续大水',
};

const ERROR_COLORS: Record<ErrorType, string> = {
  overwater: 'bg-blue-50 border-blue-300 text-blue-700',
  underwater: 'bg-orange-50 border-orange-300 text-orange-700',
  drain_miss: 'bg-purple-50 border-purple-300 text-purple-700',
  rain_water: 'bg-slate-50 border-slate-300 text-slate-700',
  consecutive_water: 'bg-cyan-50 border-cyan-300 text-cyan-700',
};

function DropletBar({ count, total }: { count: number; total: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <Droplets key={i} size={16} className={i < count ? 'text-cyan-500' : 'text-gray-200'} />
      ))}
    </div>
  );
}

function MoistureBar({ min, max }: { min: number; max: number }) {
  return (
    <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="absolute h-full bg-gradient-to-r from-green-300 to-green-500 rounded-full"
        style={{ left: `${min}%`, width: `${max - min}%` }}
      />
      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-600">
        {min}% - {max}%
      </div>
    </div>
  );
}

function PlantGuideCard({ plantType }: { plantType: PlantType }) {
  const config = PLANT_CONFIGS[plantType];
  const emoji = PLANT_EMOJI[plantType];
  const relatedErrors = TYPE_ERRORS[plantType];
  const amountLabel = config.preferredAmount === 1 ? '少量' : config.preferredAmount === 2 ? '适中' : '大量';

  return (
    <div className="glass-card animate-fade-in-up rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-4">
        <span className="text-5xl animate-scale-in">{emoji}</span>
        <h3 className="text-2xl font-display font-bold text-[#4A7C59]">{config.name}</h3>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Droplets size={16} className="text-blue-500 shrink-0" />
          <span className="text-sm text-gray-600">浇水频率：每 {config.waterFrequencyMin}-{config.waterFrequencyMax} 天</span>
          <DropletBar count={4 - config.waterFrequencyMin} total={4} />
        </div>

        <div className="flex items-center gap-3">
          <Droplets size={16} className="text-cyan-500 shrink-0" />
          <span className="text-sm text-gray-600">适宜水量：{amountLabel}</span>
          <DropletBar count={config.preferredAmount} total={3} />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-base shrink-0">🚰</span>
          <span className="text-sm text-gray-600">
            排水孔：{config.drainNeed >= 4 ? '✅ 必须' : config.drainNeed >= 2 ? '⚠️ 建议' : '⭕ 可选'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Sun size={16} className="text-yellow-500 shrink-0" />
          <span className="text-sm text-gray-600">光照需求：</span>
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Sun key={i} size={14} className={i < config.lightNeed ? 'text-yellow-400' : 'text-gray-200'} />
            ))}
          </div>
        </div>
      </div>

      <div className="bg-amber-50 rounded-xl p-3 border-l-4 border-amber-400 animate-fade-in-up stagger-1">
        <div className="flex items-center gap-1 text-xs font-bold text-amber-700 mb-1">
          <AlertCircle size={12} /> 特殊规则
        </div>
        <div className="text-sm text-amber-800">{config.specialRule}</div>
      </div>

      <div className="space-y-1.5 animate-fade-in-up stagger-2">
        <div className="flex items-center gap-1">
          <AlertCircle size={14} className="text-red-400" />
          <span className="text-sm font-bold text-red-500">常见错误</span>
        </div>
        <div className="space-y-2">
          {relatedErrors.map((errType) => (
            <div key={errType} className={`rounded-lg p-3 border ${ERROR_COLORS[errType]}`}>
              <div className="text-xs font-bold mb-1">{ERROR_ICONS[errType]} {ERROR_LABELS[errType]}</div>
              <div className="text-xs opacity-80">{ERROR_EXPLANATIONS[errType]}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="animate-fade-in-up stagger-3">
        <div className="flex items-center gap-1 mb-2">
          <Eye size={14} className="text-[#4A7C59]" />
          <span className="text-sm font-bold text-[#4A7C59]">最佳湿度范围</span>
        </div>
        <MoistureBar min={config.moistureMin} max={config.moistureMax} />
      </div>
    </div>
  );
}

function DecisionFlowchart() {
  const steps = [
    { label: '查看天气', icon: Cloud, color: 'bg-blue-50 border-blue-300 text-blue-700', guide: '雨天湿度高，减少浇水' },
    { label: '检查土壤', icon: Droplets, color: 'bg-cyan-50 border-cyan-300 text-cyan-700', guide: '手指插入2cm感受干湿' },
    { label: '辨别植物', icon: Thermometer, color: 'bg-green-50 border-green-300 text-green-700', guide: '不同植物需水量差异大' },
    { label: '决定水量', icon: Eye, color: 'bg-amber-50 border-amber-300 text-amber-700', guide: '少量多次比一次浇透更安全' },
  ];

  return (
    <div className="glass-card animate-fade-in-up rounded-2xl p-5 stagger-4">
      <h3 className="text-sm font-bold text-[#4A7C59] mb-4 font-display">🧭 浇水决策流程</h3>
      <div className="flex flex-col items-center">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={i} className={`flex flex-col items-center animate-fade-in-up stagger-${i + 1}`}>
              <div className={`rounded-xl border-2 px-5 py-3 text-center w-56 ${step.color}`}>
                <Icon size={20} className="mx-auto mb-1" />
                <div className="text-sm font-bold">{step.label}</div>
                <div className="text-[11px] mt-1 opacity-70">{step.guide}</div>
              </div>
              {i < steps.length - 1 && (
                <div className="w-0.5 h-6 bg-gradient-to-b from-[#4A7C59] to-[#4A7C59]/30" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Guide() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<PlantType>('succulent');

  return (
    <div className="min-h-screen pb-20 p-4 soil-texture" style={{ background: 'linear-gradient(180deg, #f0f7f0, #e8f5e9)' }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-[#4A7C59]/10 transition-colors">
            <ArrowLeft size={22} className="text-[#4A7C59]" />
          </button>
          <h1 className="text-lg font-display font-bold text-[#4A7C59]">植物知识指南</h1>
        </div>

        <div className="flex gap-2 mb-5 overflow-x-auto">
          {PLANT_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                activeTab === type
                  ? 'text-white shadow-md scale-105'
                  : 'bg-white text-[#4A7C59] border border-[#4A7C59]/20'
              }`}
              style={activeTab === type ? { backgroundColor: '#4A7C59' } : {}}
            >
              {PLANT_EMOJI[type]} {PLANT_CONFIGS[type].name}
            </button>
          ))}
        </div>

        <div className="mb-5">
          <PlantGuideCard plantType={activeTab} />
        </div>

        <DecisionFlowchart />
      </div>
    </div>
  );
}
