import { useEffect } from 'react';
import { 
  Wind, 
  Mountain, 
  Thermometer, 
  Gauge,
  Clock,
  User,
  Shield,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { useRecordStore } from '@/store/useRecordStore';
import { InputField, SelectField } from '@/components/form/InputField';
import { WarningCard } from '@/components/cards/WarningCard';
import { ProgressBar, SimpleProgress } from '@/components/charts/ProgressBar';
import { BarChart } from '@/components/charts/BarChart';
import { getCorrectionEncouragement, formatWindSpeed, formatWindDirection } from '@/utils/format';
import { TRACK_TYPE_LABELS } from '@/types';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const eventOptions = [
  { value: '100m', label: '100 米短跑' },
  { value: '200m', label: '200 米短跑' },
];

const trackOptions = [
  { value: 'synthetic', label: TRACK_TYPE_LABELS.synthetic },
  { value: 'tartan', label: TRACK_TYPE_LABELS.tartan },
  { value: 'cinder', label: TRACK_TYPE_LABELS.cinder },
  { value: 'dirt', label: TRACK_TYPE_LABELS.dirt },
];

const timingOptions = [
  { value: 'electronic', label: '电计时' },
  { value: 'manual', label: '手计时' },
];

export default function Calculator() {
  const {
    currentRecord,
    currentResult,
    reportMode,
    updateCurrentRecord,
    calculateCurrent,
    setReportMode,
    addRecord,
  } = useRecordStore();

  const [showTips, setShowTips] = useState(true);

  useEffect(() => {
    if (currentRecord.rawTime) {
      calculateCurrent();
    }
  }, [currentRecord, calculateCurrent]);

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    updateCurrentRecord({ rawTime: isNaN(value) ? undefined : value });
  };

  const handleWindChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    if (value === '' || value === '-') {
      updateCurrentRecord({ windSpeed: undefined });
    } else {
      const num = parseFloat(value);
      updateCurrentRecord({ windSpeed: isNaN(num) ? undefined : num });
    }
  };

  const encouragement = currentResult
    ? getCorrectionEncouragement(
        currentResult.totalCorrection,
        currentResult.factors
      )
    : null;

  const breakdownData = currentResult ? [
    { label: '风速', value: currentResult.breakdown.wind, color: currentResult.breakdown.wind >= 0 ? '#22c55e' : '#f97316' },
    { label: '海拔', value: currentResult.breakdown.altitude, color: '#3b82f6' },
    { label: '温度', value: currentResult.breakdown.temperature, color: '#a855f7' },
    { label: '赛道', value: currentResult.breakdown.track, color: '#eab308' },
    { label: '计时', value: currentResult.breakdown.timing, color: '#ec4899' },
  ] : [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 animate-fade-in">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 font-display">
            环境修正计算器
          </h2>
          <p className="text-dark-400 text-sm">
            输入成绩与环境数据，获得科学修正后的真实成绩
          </p>
        </div>

        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-dark-800/50 rounded-xl p-1 border border-dark-700/50">
            <button
              onClick={() => setReportMode('student')}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
                reportMode === 'student'
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                  : 'text-dark-400 hover:text-dark-200'
              )}
            >
              <User className="w-4 h-4" />
              学生版
            </button>
            <button
              onClick={() => setReportMode('coach')}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
                reportMode === 'coach'
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                  : 'text-dark-400 hover:text-dark-200'
              )}
            >
              <Shield className="w-4 h-4" />
              教练版
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="glass-card p-6 space-y-4 animate-slide-up">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary-400" />
                基础信息
              </h3>
              
              <SelectField
                label="比赛项目"
                value={currentRecord.event || '100m'}
                options={eventOptions}
                onChange={(e) => updateCurrentRecord({ event: e.target.value as '100m' | '200m' })}
              />

              <InputField
                label="原始成绩"
                type="number"
                step="0.01"
                placeholder="例如：12.56"
                value={currentRecord.rawTime || ''}
                onChange={handleTimeChange}
                rightAddon="秒"
                hint="支持输入秒数，如 12.56 或 12.56 秒"
              />

              <SelectField
                label="计时方式"
                value={currentRecord.timingMethod || 'electronic'}
                options={timingOptions}
                onChange={(e) => updateCurrentRecord({ timingMethod: e.target.value as 'manual' | 'electronic' })}
                hint="手计时会自动扣除反应时差"
              />
            </div>

            <div className="glass-card p-6 space-y-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Wind className="w-5 h-5 text-primary-400" />
                环境参数
              </h3>

              <InputField
                label="风速"
                type="number"
                step="0.1"
                placeholder="例如：+1.5 或 -2.0"
                value={currentRecord.windSpeed ?? ''}
                onChange={handleWindChange}
                leftIcon={<Wind className="w-4 h-4" />}
                rightAddon="m/s"
                hint="正数顺风，负数逆风，留空表示未记录"
              />

              {currentRecord.windSpeed !== undefined && currentRecord.windSpeed !== null && (
                <div className="flex items-center gap-2 text-sm">
                  <span className={cn(
                    'tag',
                    currentRecord.windSpeed > 0 ? 'tag-success' : currentRecord.windSpeed < 0 ? 'tag-warning' : 'tag-neutral'
                  )}>
                    {formatWindDirection(currentRecord.windSpeed)}
                  </span>
                  <span className="text-dark-400">
                    {formatWindSpeed(currentRecord.windSpeed)}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="海拔"
                  type="number"
                  placeholder="0"
                  value={currentRecord.altitude ?? 0}
                  onChange={(e) => updateCurrentRecord({ altitude: parseFloat(e.target.value) || 0 })}
                  leftIcon={<Mountain className="w-4 h-4" />}
                  rightAddon="m"
                />

                <InputField
                  label="温度"
                  type="number"
                  placeholder="20"
                  value={currentRecord.temperature ?? 20}
                  onChange={(e) => updateCurrentRecord({ temperature: parseFloat(e.target.value) || 20 })}
                  leftIcon={<Thermometer className="w-4 h-4" />}
                  rightAddon="°C"
                />
              </div>

              <SelectField
                label="赛道类型"
                value={currentRecord.trackType || 'synthetic'}
                options={trackOptions}
                onChange={(e) => updateCurrentRecord({ trackType: e.target.value as any })}
              />
            </div>

            <div className="glass-card overflow-hidden animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <button
                onClick={() => setShowTips(!showTips)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-dark-700/30 transition-colors"
              >
                <span className="text-sm font-medium text-dark-300 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  输入提示与说明
                </span>
                {showTips ? (
                  <ChevronUp className="w-4 h-4 text-dark-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-dark-500" />
                )}
              </button>
              
              {showTips && (
                <div className="px-4 pb-4 space-y-3 text-sm">
                  <div className="p-3 bg-dark-900/50 rounded-lg">
                    <p className="text-dark-300 font-medium mb-1">🌬️ 顺风逆风符号</p>
                    <p className="text-dark-500 text-xs">
                      正数（+）表示顺风，成绩会被提升；负数（-）表示逆风，成绩会受影响。
                      风速超过 ±2.0m/s 的成绩不适合正式比赛比较。
                    </p>
                  </div>
                  <div className="p-3 bg-dark-900/50 rounded-lg">
                    <p className="text-dark-300 font-medium mb-1">⏱️ 秒和毫秒</p>
                    <p className="text-dark-500 text-xs">
                      成绩以秒为单位输入，支持两位小数（毫秒）。例如 12.56 表示 12秒56。
                    </p>
                  </div>
                  <div className="p-3 bg-dark-900/50 rounded-lg">
                    <p className="text-dark-300 font-medium mb-1">📱 手计与电计差异</p>
                    <p className="text-dark-500 text-xs">
                      手计时比电计时约慢 0.24秒（100米）/ 0.14秒（200米），
                      系统会自动扣除反应时差。手计误差较大的记录不适合精确比较。
                    </p>
                  </div>
                  <div className="p-3 bg-dark-900/50 rounded-lg">
                    <p className="text-dark-300 font-medium mb-1">📊 风速缺失</p>
                    <p className="text-dark-500 text-xs">
                      风速缺失时无法进行精确风阻修正，结果会标注"不适合精确比较"。
                      建议训练时尽量记录风速数据。
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            {currentResult ? (
              <>
                <div className="glass-card p-6 animate-slide-up">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <p className="text-dark-400 text-sm mb-1">
                        {reportMode === 'student' ? '修正后成绩' : '修正结果'}
                      </p>
                      <div className="flex items-baseline gap-3">
                        <span className="text-5xl md:text-6xl font-bold text-gradient font-display">
                          {currentResult.correctedTime.toFixed(2)}
                        </span>
                        <span className="text-xl text-dark-400">秒</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-dark-500 text-xs mb-1">原始成绩</p>
                      <p className="text-lg text-dark-300 font-medium font-display">
                        {currentResult.originalTime.toFixed(2)}s
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-6">
                    {currentResult.isComparable ? (
                      <span className="tag-success">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mr-1.5" />
                        适合比较
                      </span>
                    ) : (
                      <span className="tag-warning">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        不适合精确比较
                      </span>
                    )}
                    <span className="text-dark-400 text-sm flex items-center gap-1.5">
                      {currentResult.totalCorrection > 0 ? (
                        <TrendingUp className="w-4 h-4 text-accent-400" />
                      ) : currentResult.totalCorrection < 0 ? (
                        <TrendingDown className="w-4 h-4 text-primary-400" />
                      ) : (
                        <Minus className="w-4 h-4 text-dark-500" />
                      )}
                      修正量：
                      <span className={cn(
                        'font-medium',
                        currentResult.totalCorrection > 0 ? 'text-accent-400' : 'text-primary-400'
                      )}>
                        {currentResult.totalCorrection > 0 ? '+' : ''}
                        {currentResult.totalCorrection.toFixed(3)}s
                      </span>
                    </span>
                  </div>

                  <ProgressBar
                    value={currentResult.totalCorrection}
                    max={Math.max(1, Math.abs(currentResult.totalCorrection) * 1.5)}
                    min={-Math.max(1, Math.abs(currentResult.totalCorrection) * 1.5)}
                    label="修正幅度"
                    showValue
                    color="primary"
                  />
                </div>

                {reportMode === 'student' && encouragement && (
                  <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">{encouragement.emoji}</div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-2 font-display">
                          {encouragement.title}
                        </h3>
                        <p className="text-dark-300 leading-relaxed">
                          {encouragement.message}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {currentResult.factors.slice(0, 3).map((factor, i) => (
                            <span key={i} className="tag-neutral">
                              {factor.split('，')[0]}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentResult.warnings.length > 0 && (
                  <div className="space-y-2 animate-slide-up" style={{ animationDelay: '0.15s' }}>
                    {currentResult.warnings.map((warning, i) => (
                      <WarningCard
                        key={i}
                        type="warning"
                        title={warning}
                      />
                    ))}
                  </div>
                )}

                <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Gauge className="w-5 h-5 text-primary-400" />
                    {reportMode === 'student' ? '环境因素影响' : '修正因子分解'}
                  </h3>

                  {reportMode === 'student' ? (
                    <div className="space-y-3">
                      {currentResult.factors.map((factor, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-dark-900/50 rounded-lg">
                          <div className="w-2 h-2 rounded-full bg-primary-500" />
                          <p className="text-sm text-dark-300">{factor}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <BarChart
                        data={breakdownData}
                        height={160}
                        showValues
                      />
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                        {Object.entries(currentResult.breakdown).map(([key, value]) => (
                          <div key={key} className="bg-dark-900/50 rounded-xl p-3 text-center">
                            <p className="text-xs text-dark-500 mb-1">
                              {{ wind: '风速', altitude: '海拔', temperature: '温度', track: '赛道', timing: '计时' }[key]}
                            </p>
                            <p className={cn(
                              'text-lg font-bold font-display',
                              value > 0 ? 'text-accent-400' : value < 0 ? 'text-primary-400' : 'text-dark-400'
                            )}>
                              {value > 0 ? '+' : ''}{value.toFixed(3)}s
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {reportMode === 'coach' && (
                  <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.25s' }}>
                    <h3 className="text-lg font-semibold text-white mb-4">数据完整性评估</h3>
                    <div className="space-y-3">
                      <SimpleProgress
                        label="数据完整度"
                        percentage={currentResult.isComparable ? 100 : 70}
                        color="primary"
                        showPercentage
                      />
                      <div className="flex flex-wrap gap-2 mt-4">
                        {currentResult.warnings.length === 0 ? (
                          <span className="tag-success">所有参数齐全</span>
                        ) : (
                          currentResult.warnings.map((w, i) => (
                            <span key={i} className="tag-warning">{w.split('，')[0]}</span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                  <button
                    onClick={() => addRecord(currentRecord)}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <TrendingUp className="w-4 h-4" />
                    保存到训练记录
                  </button>
                </div>
              </>
            ) : (
              <div className="glass-card p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
                <div className="w-20 h-20 rounded-2xl bg-dark-800 flex items-center justify-center mb-6">
                  <Gauge className="w-10 h-10 text-dark-600" />
                </div>
                <h3 className="text-xl font-semibold text-dark-300 mb-2">输入成绩开始计算</h3>
                <p className="text-dark-500 text-sm max-w-sm">
                  填写左侧的基础信息和环境参数，系统将自动计算修正后的成绩
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
