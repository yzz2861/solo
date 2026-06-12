import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ThermometerSun,
  Droplets,
  Sun,
  Wind,
  Sprout,
  Gauge,
  Settings2,
  ArrowRight,
  RotateCcw,
  Cloud,
} from 'lucide-react';
import { useIrrigationStore } from '../store/irrigationStore';
import InputGroup from '../components/InputGroup';
import UnitInput from '../components/UnitInput';
import CropStageTimeline from '../components/CropStageTimeline';
import WarningBanner from '../components/WarningBanner';
import {
  tempConvert,
  radiationConvert,
  windConvert,
  soilMoistureConvert,
  TEMP_UNIT_LABELS,
  RAD_UNIT_LABELS,
  WIND_UNIT_LABELS,
  SOIL_UNIT_LABELS,
} from '../utils/unitConverter';
import type {
  TemperatureUnit,
  RadiationUnit,
  WindUnit,
  SoilMoistureUnit,
} from '../../shared/types';
import { clsx } from 'clsx';

const InputPage = () => {
  const navigate = useNavigate();
  const { input, warnings, setInput, runCalculate, isCalculating, totalConservativeFactor, reset, todayDate } =
    useIrrigationStore((s) => ({
      input: s.input,
      warnings: s.warnings,
      setInput: s.setInput,
      runCalculate: s.runCalculate,
      isCalculating: s.isCalculating,
      totalConservativeFactor: s.result?.totalConservativeFactor ?? 1,
      reset: s.reset,
      todayDate: s.todayDate,
    }));

  const [tempUnit, setTempUnit] = useState<TemperatureUnit>('celsius');
  const [radUnit, setRadUnit] = useState<RadiationUnit>('w_m2');
  const [windUnit, setWindUnit] = useState<WindUnit>('m_s');
  const [soilUnit, setSoilUnit] = useState<SoilMoistureUnit>('vol_percent');

  const hasTempWarn = warnings.some(
    (w) => w.field === 'temperature'
  );
  const hasHumidityWarn = warnings.some((w) => w.field === 'humidity');
  const hasRadWarn = warnings.some((w) => w.field === 'radiation');
  const hasWindWarn = warnings.some((w) => w.field === 'wind');
  const hasSoilWarn = warnings.some((w) => w.field === 'soilMoisture');

  const humidityJump = warnings.find(
    (w) => w.type === 'jump' && w.field === 'humidity'
  );

  const handleCalc = () => {
    const r = runCalculate();
    if (r) {
      setTimeout(() => navigate('/report'), 600);
    }
  };

  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const today = new Date(todayDate);
  const dateLabel = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日 · 周${
    weekdays[today.getDay()]
  }`;

  return (
    <div className="min-h-screen">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence>
          {warnings.length > 0 && (
            <div className="mb-5">
              <WarningBanner
                warnings={warnings}
                totalFactor={totalConservativeFactor}
              />
            </div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-base p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 text-white flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-greenhouse-500">今日</p>
              <p className="font-serif text-lg font-bold text-greenhouse-800">
                {dateLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={reset}
              className="btn-secondary !px-4 !py-2 text-sm flex-1 sm:flex-none"
            >
              <RotateCcw className="w-4 h-4" />
              清空
            </button>
            <button
              type="button"
              onClick={handleCalc}
              disabled={isCalculating}
              className={clsx(
                'btn-primary flex-1 sm:flex-none',
                isCalculating && '!opacity-80 cursor-wait'
              )}
            >
              {isCalculating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  计算中…
                </>
              ) : (
                <>
                  生成灌溉建议
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="space-y-5">
            <InputGroup
              icon={ThermometerSun}
              title="温室环境参数"
              subtitle="从传感器读数抄录，单位可切换"
              accent="green"
            >
              <UnitInput
                label="气温"
                hint="棚内日均温度"
                value={
                  input.temperature === null
                    ? null
                    : tempUnit === 'celsius'
                    ? input.temperature
                    : tempConvert(input.temperature, 'celsius', 'fahrenheit')
                }
                unit={tempUnit}
                unitOptions={[
                  { value: 'celsius', label: TEMP_UNIT_LABELS.celsius },
                  { value: 'fahrenheit', label: TEMP_UNIT_LABELS.fahrenheit },
                ]}
                placeholder="例如 25"
                warning={hasTempWarn ? 'warn' : 'none'}
                warningMsg={warnings.find((w) => w.field === 'temperature')?.message}
                onChangeValue={(v) => {
                  const celsius =
                    v === null ? null : tempConvert(v, tempUnit, 'celsius');
                  setInput('temperature', celsius);
                  setInput('temperatureRaw', v === null ? null : { value: v, unit: tempUnit });
                }}
                onChangeUnit={(u) => setTempUnit(u)}
                min={-20}
                max={70}
              />

              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <label className="text-sm font-medium text-greenhouse-800">
                    相对湿度
                  </label>
                  <span className="text-xs text-greenhouse-400">%</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="例如 65"
                    value={input.humidity === null ? '' : String(input.humidity)}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const v = raw === '' ? null : Number(raw);
                      if (v === null) {
                        setInput('humidityPrevious', input.humidity);
                        setInput('humidity', null);
                      } else if (Number.isFinite(v)) {
                        setInput('humidityPrevious', input.humidity);
                        setInput('humidity', v);
                      }
                    }}
                    className={clsx('input-base pr-10 text-right tabular-nums', {
                      'input-error': humidityJump,
                      'input-warning':
                        !humidityJump && hasHumidityWarn,
                    })}
                    min={0}
                    max={100}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-greenhouse-500 font-medium">
                    %
                  </span>
                </div>
                {(hasHumidityWarn || humidityJump) && (
                  <p className="text-xs text-warning-600 pt-1 flex items-start gap-1.5">
                    <span>{humidityJump ? '🔀' : '⚠️'}</span>
                    <span>
                      {warnings.find((w) => w.field === 'humidity')?.message ??
                        ''}
                    </span>
                  </p>
                )}
              </div>

              <UnitInput
                label="光照强度"
                hint="棚内平均日辐射"
                value={
                  input.radiation === null
                    ? null
                    : radUnit === 'w_m2'
                    ? input.radiation
                    : radiationConvert(input.radiation, 'w_m2', 'lux')
                }
                unit={radUnit}
                unitOptions={[
                  { value: 'w_m2', label: RAD_UNIT_LABELS.w_m2 },
                  { value: 'lux', label: RAD_UNIT_LABELS.lux },
                ]}
                placeholder="例如 300"
                warning={hasRadWarn ? 'warn' : 'none'}
                warningMsg={warnings.find((w) => w.field === 'radiation')?.message}
                onChangeValue={(v) => {
                  const si =
                    v === null ? null : radiationConvert(v, radUnit, 'w_m2');
                  setInput('radiation', si);
                  setInput('radiationRaw', v === null ? null : { value: v, unit: radUnit });
                }}
                onChangeUnit={(u) => setRadUnit(u)}
                min={0}
                max={200000}
              />

              <UnitInput
                label="风速"
                hint="放风口附近"
                value={
                  input.wind === null
                    ? null
                    : windUnit === 'm_s'
                    ? input.wind
                    : windConvert(input.wind, 'm_s', 'km_h')
                }
                unit={windUnit}
                unitOptions={[
                  { value: 'm_s', label: WIND_UNIT_LABELS.m_s },
                  { value: 'km_h', label: WIND_UNIT_LABELS.km_h },
                ]}
                placeholder="例如 0.8"
                warning={hasWindWarn ? 'warn' : 'none'}
                warningMsg={warnings.find((w) => w.field === 'wind')?.message}
                onChangeValue={(v) => {
                  const si = v === null ? null : windConvert(v, windUnit, 'm_s');
                  setInput('wind', si);
                  setInput('windRaw', v === null ? null : { value: v, unit: windUnit });
                }}
                onChangeUnit={(u) => setWindUnit(u)}
                min={0}
                max={40}
              />
            </InputGroup>
          </div>

          <div className="space-y-5">
            <InputGroup
              icon={Sprout}
              title="作物与土壤"
              subtitle="当前生长阶段 + 土壤湿度传感器"
              accent="soil"
            >
              <CropStageTimeline
                value={input.cropStage}
                onChange={(v) => setInput('cropStage', v)}
              />

              <div className="h-px bg-gradient-to-r from-transparent via-greenhouse-100 to-transparent my-2" />

              <UnitInput
                label="土壤湿度"
                hint="根层（15~20cm）读数"
                value={
                  input.soilMoisture === null
                    ? null
                    : soilUnit === 'vol_percent'
                    ? input.soilMoisture
                    : soilMoistureConvert(input.soilMoisture, 'vol_percent', 'mbar')
                }
                unit={soilUnit}
                unitOptions={[
                  { value: 'vol_percent', label: SOIL_UNIT_LABELS.vol_percent },
                  { value: 'mbar', label: SOIL_UNIT_LABELS.mbar },
                ]}
                placeholder="例如 28"
                warning={hasSoilWarn ? 'warn' : 'none'}
                warningMsg={warnings.find((w) => w.field === 'soilMoisture')?.message}
                onChangeValue={(v) => {
                  const si =
                    v === null
                      ? null
                      : soilMoistureConvert(v, soilUnit, 'vol_percent');
                  setInput('soilMoisture', si);
                  setInput('soilMoistureRaw', v === null ? null : { value: v, unit: soilUnit });
                }}
                onChangeUnit={(u) => setSoilUnit(u)}
                min={-5}
                max={1200}
              />
            </InputGroup>

            <InputGroup
              icon={Settings2}
              title="灌溉系统配置"
              subtitle="一次设置，每天可微调"
              accent="water"
            >
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <label className="text-sm font-medium text-greenhouse-800">
                    系统效率
                  </label>
                  <span className="font-mono text-water-600 font-bold">
                    {(input.irrigationEfficiency * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.3}
                  max={1}
                  step={0.01}
                  value={input.irrigationEfficiency}
                  onChange={(e) =>
                    setInput('irrigationEfficiency', Number(e.target.value))
                  }
                  className="w-full accent-water-500"
                />
                <div className="flex justify-between text-[10px] text-greenhouse-400 mt-1">
                  <span>沟灌 50~65%</span>
                  <span>微喷 70~80%</span>
                  <span>滴灌 85~95%</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-greenhouse-800 block mb-2">
                  灌水方式
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { k: 'drip', label: '滴灌', icon: '💧' },
                      { k: 'sprinkler', label: '微喷', icon: '🌦️' },
                      { k: 'furrow', label: '沟灌', icon: '🚿' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.k}
                      type="button"
                      onClick={() => setInput('irrigationMethod', m.k)}
                      className={clsx(
                        'p-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-1',
                        input.irrigationMethod === m.k
                          ? 'border-water-500 bg-water-50 text-water-700 shadow-soft'
                          : 'border-greenhouse-100 bg-white text-greenhouse-700 hover:border-greenhouse-300'
                      )}
                    >
                      <span className="text-xl">{m.icon}</span>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-2 p-3 rounded-xl bg-water-50/60 border border-water-100 text-xs text-water-700 leading-relaxed flex items-start gap-2">
                <Gauge className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  系统效率越高，毛灌水量越接近实际需水量。老旧管路或地面不平可适当降低10%；新铺设滴灌可设 85%~90%。
                </span>
              </div>
            </InputGroup>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center"
        >
          <button
            type="button"
            onClick={handleCalc}
            disabled={isCalculating}
            className="btn-primary !px-10 !py-4 text-lg"
          >
            {isCalculating ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                正在分析温湿度与作物蒸散…
              </>
            ) : (
              <>
                🚜 计算今日需水量
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
          <p className="text-xs text-greenhouse-500 mt-2">
            基于 FAO Penman-Monteith 公式 · 番茄专用作物系数表
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default InputPage;
