import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Plus, Trash2, LogOut, Shield, GraduationCap, Settings, Save } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { PLANT_CONFIGS, PLANT_EMOJI } from '@/data/plants';
import type { PlantType, PlantTemplateConfig } from '@/types';

const PLANT_TYPES: PlantType[] = ['succulent', 'mint', 'seedling', 'flowering'];

export default function Teacher() {
  const navigate = useNavigate();
  const {
    isTeacherMode,
    teacherConfig,
    setTeacherMode,
    updateTeacherConfig,
    addPlantTemplate,
    removePlantTemplate,
    resetStudentProgress,
  } = useGameStore();

  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [newPlantType, setNewPlantType] = useState<PlantType>('succulent');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleLogin = () => {
    if (passwordInput === teacherConfig.password) {
      setTeacherMode(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const handleAddPlant = () => {
    const config = PLANT_CONFIGS[newPlantType];
    const template: PlantTemplateConfig = {
      plantType: newPlantType,
      customName: config.name,
      hasDrainHole: newPlantType !== 'seedling',
      initialMoisture: Math.round((config.moistureMin + config.moistureMax) / 2),
    };
    addPlantTemplate(template);
    setShowAddForm(false);
  };

  const handleReset = () => {
    resetStudentProgress();
    setShowResetConfirm(false);
  };

  if (!isTeacherMode) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 30%, #f1f8e9 60%, #dcedc8 100%)' }}
      >
        <div className="animate-scale-in glass-card rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
          <div className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4A7C59, #6BA37A)' }}>
            <Shield className="text-white" size={36} />
          </div>
          <h1 className="font-display text-2xl text-[#4A7C59] mb-1">园艺浇水节奏赛</h1>
          <p className="text-sm text-[#4A7C59]/70 mb-6">教师管理模式</p>
          <div className="relative mb-2">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4A7C59]/40" size={18} />
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
              placeholder="请输入管理密码"
              className={`w-full pl-11 pr-4 py-3.5 border-2 rounded-2xl text-center text-lg focus:outline-none transition-colors ${
                passwordError ? 'border-red-400 focus:border-red-500' : 'border-[#4A7C59]/20 focus:border-[#4A7C59]'
              }`}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>
          {passwordError && <p className="text-red-500 text-xs mb-3 animate-scale-in">密码错误，请重试</p>}
          <button
            onClick={handleLogin}
            disabled={!passwordInput}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-lg transition-all disabled:opacity-40 hover:shadow-lg active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #4A7C59, #6BA37A)' }}
          >
            进入管理模式
          </button>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-sm text-[#4A7C59]/50 hover:text-[#4A7C59] transition-colors"
          >
            返回花园
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: 'linear-gradient(180deg, #f0f7f0, #e8f5e9)' }}>
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6 animate-scale-in">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4A7C59, #6BA37A)' }}>
              <GraduationCap className="text-white" size={20} />
            </div>
            <div>
              <h1 className="font-display text-xl text-[#4A7C59]">教师管理</h1>
              <p className="text-xs text-[#4A7C59]/50">园艺浇水节奏赛</p>
            </div>
          </div>
          <button
            onClick={() => setTeacherMode(false)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border-2 border-[#4A7C59] text-[#4A7C59] hover:bg-[#4A7C59] hover:text-white transition-all"
          >
            <LogOut size={15} />
            退出
          </button>
        </div>

        <div className="glass-card rounded-2xl p-5 mb-4 animate-scale-in">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="text-[#4A7C59]" size={16} />
            <h2 className="text-sm font-bold text-[#4A7C59]">班级设置</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#4A7C59] font-bold w-16">班级名</span>
              <input
                type="text"
                value={teacherConfig.className}
                onChange={(e) => updateTeacherConfig({ className: e.target.value })}
                className="flex-1 px-3 py-2 border-2 border-[#4A7C59]/20 rounded-xl focus:outline-none focus:border-[#4A7C59] transition-colors text-sm"
                placeholder="输入班级名称"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#4A7C59] font-bold w-16">管理密码</span>
              <input
                type="text"
                value={teacherConfig.password}
                onChange={(e) => updateTeacherConfig({ password: e.target.value })}
                className="flex-1 px-3 py-2 border-2 border-[#4A7C59]/20 rounded-xl focus:outline-none focus:border-[#4A7C59] transition-colors text-sm"
                placeholder="设置管理密码"
              />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 mb-4 animate-scale-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#4A7C59]">🌱 植物模板列表</h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:shadow-md active:scale-95"
              style={{ backgroundColor: '#F4A259' }}
            >
              <Plus size={14} />
              添加植物
            </button>
          </div>

          {showAddForm && (
            <div className="bg-orange-50/80 rounded-xl p-4 mb-4 animate-scale-in">
              <div className="flex items-center gap-3">
                <select
                  value={newPlantType}
                  onChange={(e) => setNewPlantType(e.target.value as PlantType)}
                  className="flex-1 px-3 py-2.5 border-2 border-[#4A7C59]/20 rounded-xl focus:outline-none focus:border-[#4A7C59] bg-white"
                >
                  {PLANT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {PLANT_EMOJI[type]} {PLANT_CONFIGS[type].name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddPlant}
                  className="px-5 py-2.5 rounded-xl text-white font-bold text-sm transition-all hover:shadow-md active:scale-95"
                  style={{ backgroundColor: '#4A7C59' }}
                >
                  确认添加
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {teacherConfig.plantTemplates.map((template, index) => (
              <div key={index} className="bg-white/60 rounded-xl p-4 transition-all hover:bg-white/80">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{PLANT_EMOJI[template.plantType]}</span>
                    <input
                      type="text"
                      value={template.customName}
                      onChange={(e) => {
                        const templates = [...teacherConfig.plantTemplates];
                        templates[index] = { ...templates[index], customName: e.target.value };
                        updateTeacherConfig({ plantTemplates: templates });
                      }}
                      className="px-2.5 py-1 border border-[#4A7C59]/20 rounded-lg text-sm focus:outline-none focus:border-[#4A7C59] w-28"
                    />
                  </div>
                  <button
                    onClick={() => removePlantTemplate(index)}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={template.hasDrainHole}
                      onChange={(e) => {
                        const templates = [...teacherConfig.plantTemplates];
                        templates[index] = { ...templates[index], hasDrainHole: e.target.checked };
                        updateTeacherConfig({ plantTemplates: templates });
                      }}
                      className="rounded accent-[#4A7C59] w-4 h-4"
                    />
                    <span className="text-gray-600">排水孔</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">初始湿度</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={template.initialMoisture}
                      onChange={(e) => {
                        const templates = [...teacherConfig.plantTemplates];
                        templates[index] = { ...templates[index], initialMoisture: Number(e.target.value) };
                        updateTeacherConfig({ plantTemplates: templates });
                      }}
                      className="w-20 accent-[#4A7C59]"
                    />
                    <span className="text-[#4A7C59] font-bold w-8 text-right">{template.initialMoisture}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {teacherConfig.plantTemplates.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-6">暂无植物模板，点击上方按钮添加</p>
          )}
        </div>

        <div className="glass-card rounded-2xl p-5 animate-scale-in">
          <h2 className="text-sm font-bold text-[#4A7C59] mb-3">⚙️ 管理操作</h2>
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full py-2.5 rounded-xl text-sm font-bold border-2 border-red-300 text-red-500 hover:bg-red-50 transition-colors"
            >
              🔄 重置学生进度
            </button>
          ) : (
            <div className="bg-red-50/80 rounded-xl p-4 text-center animate-scale-in">
              <p className="text-sm text-red-600 mb-3">确定要重置所有学生进度吗？此操作不可恢复！</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={handleReset}
                  className="px-5 py-2 rounded-xl text-white font-bold text-sm bg-red-500 hover:bg-red-600 transition-colors"
                >
                  确认重置
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-5 py-2 rounded-xl text-sm font-bold border-2 border-gray-300 text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
