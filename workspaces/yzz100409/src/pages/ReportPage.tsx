import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit3, Sun, Droplets } from 'lucide-react';
import { useIrrigationStore } from '../store/irrigationStore';
import ResultCard from '../components/ResultCard';
import TimelineHeatmap from '../components/TimelineHeatmap';
import ReportTabs, { ReportView } from '../components/ReportTabs';
import FarmerReport from '../components/FarmerReport';
import TechnicianReport from '../components/TechnicianReport';
import WarningBanner from '../components/WarningBanner';
import { clsx } from 'clsx';

const ReportPage = () => {
  const navigate = useNavigate();
  const { input, result, persistTodayRecord, todayDate } = useIrrigationStore(
    (s) => ({
      input: s.input,
      result: s.result,
      persistTodayRecord: s.persistTodayRecord,
      todayDate: s.todayDate,
    })
  );

  const [view, setView] = useState<ReportView>('farmer');

  useEffect(() => {
    if (result) persistTodayRecord();
  }, [result, persistTodayRecord]);

  if (!result) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-base p-10"
        >
          <div className="w-20 h-20 mx-auto rounded-3xl bg-water-50 flex items-center justify-center mb-5">
            <Droplets className="w-10 h-10 text-water-500" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-greenhouse-800 mb-2">
            还没有计算结果
          </h2>
          <p className="text-greenhouse-600 mb-6">
            请先回到数据录入页，填写今天的温湿度、光照和作物信息
          </p>
          <button onClick={() => navigate('/')} className="btn-primary">
            <ArrowLeft className="w-4 h-4" />
            去录入数据
          </button>
        </motion.div>
      </div>
    );
  }

  const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六'];
  const d = new Date(todayDate);
  const dateTitle = `${d.getMonth() + 1}月${d.getDate()}日 · 周${weekdayLabels[d.getDay()]}`;

  return (
    <div className="min-h-screen">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {result.warnings.length > 0 && (
          <div className="mb-5">
            <WarningBanner
              warnings={result.warnings}
              totalFactor={result.totalConservativeFactor}
            />
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-base p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="btn-secondary !px-3 !py-2"
              title="返回录入"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">返回录入</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-greenhouse-gradient text-white flex items-center justify-center">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-greenhouse-500">灌溉估算报告</p>
                <p className="font-serif text-lg font-bold text-greenhouse-800">
                  {dateTitle}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => navigate('/history')}
              className="btn-secondary flex-1 sm:flex-none !px-4 !py-2 text-sm"
            >
              <Edit3 className="w-4 h-4" />
              回填实际水量
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-xs bg-water-50 text-water-700 px-3 py-2 rounded-xl font-mono">
              <span>建议：</span>
              <span className="font-bold">{result.grossIrrigation.toFixed(1)} mm</span>
              <span className="opacity-70">=</span>
              <span className="font-bold">{result.grossIrrigationM3Mu.toFixed(1)} 方/亩</span>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-5 xl:grid-cols-5">
          <div className="xl:col-span-2 space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 gap-4"
            >
              <ResultCard
                label="参考蒸散 ET₀"
                subtitle="同种环境下参考作物"
                valueMm={result.et0}
                gradient="green"
                icon={Sun}
              />
              <ResultCard
                label="番茄蒸散 ETc"
                subtitle={`Kc × ${result.kc.toFixed(2)}`}
                valueMm={result.etc}
                gradient="green"
                icon={Droplets}
                previousMm={result.et0}
              />
              <ResultCard
                label="净灌溉量"
                subtitle={`Kₛ × ${result.soilCorrection.toFixed(2)}`}
                valueMm={result.netIrrigation}
                gradient="water"
                icon={Droplets}
              />
              <ResultCard
                label="毛灌溉量 ✦"
                subtitle={`效率 ÷ ${(input.irrigationEfficiency * 100).toFixed(0)}%`}
                valueMm={result.grossIrrigation}
                gradient="water"
                emphasize
                icon={Droplets}
                previousMm={result.netIrrigation}
              />
            </motion.div>

            {result.totalConservativeFactor > 1 && (
              <div className="p-4 rounded-2xl bg-warning-50 border border-warning-100 text-sm">
                <p className="font-semibold text-warning-600 flex items-center gap-1.5">
                  🛡️ 总保守系数 ×{result.totalConservativeFactor.toFixed(3)}
                </p>
                <p className="text-warning-700/80 mt-1 leading-relaxed">
                  因存在数据异常或缺测，以上估算比"理想真值"偏大 +
                  {((result.totalConservativeFactor - 1) * 100).toFixed(1)}%。
                  如下午 4 点观察到无萎蔫迹象，下次可按 90%~95% 实际执行。
                </p>
              </div>
            )}

            <TimelineHeatmap
              windows={result.scheduledWindows}
              temperature={input.temperature ?? 25}
            />
          </div>

          <div className="xl:col-span-3 space-y-5">
            <ReportTabs value={view} onChange={setView} />

            <div
              className={clsx(
                'transition-opacity duration-300',
              )}
            >
              {view === 'farmer' ? (
                <FarmerReport input={input} result={result} />
              ) : (
                <TechnicianReport input={input} result={result} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;
