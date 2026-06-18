import React from 'react';
import { ThermometerSnowflake, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useRecipeStore } from '../../store/useRecipeStore';
import RingChart from '../ui/RingChart';
import { getSolidsRatioStatus, getRiskLevelColor } from '../../utils/formatters';

const ResultDisplay: React.FC = () => {
  const { currentResult } = useRecipeStore();

  if (!currentResult) {
    return (
      <div className="card flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-24 h-24 mb-4 rounded-full bg-cream-100 flex items-center justify-center">
          <ThermometerSnowflake size={40} className="text-icecream-pink" />
        </div>
        <h3 className="text-xl font-bold text-chocolate-700 mb-2 font-display">
          开始输入配方
        </h3>
        <p className="text-chocolate-500 max-w-xs">
          在左侧输入配料用量，系统会自动计算凝固点、固形物比例和口感风险
        </p>
      </div>
    );
  }

  const { freezingPoint, solidsRatio, fatContent, sugarContent, alcoholContent, stabilizerContent, risks } = currentResult;
  const solidsStatus = getSolidsRatioStatus(solidsRatio);

  return (
    <div className="space-y-6">
      <div className="card animate-fade-in-up opacity-0">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-icecream-pinkLight to-icecream-pink mb-4">
            <ThermometerSnowflake size={20} className="text-chocolate-700" />
            <span className="text-sm font-medium text-chocolate-700">预估凝固点</span>
          </div>
          <div className="text-6xl font-bold text-chocolate-900 font-display mb-2">
            {freezingPoint.toFixed(1)}°C
          </div>
          <p className="text-chocolate-500">
            建议冷冻温度：{Math.min(-18, freezingPoint - 4).toFixed(1)}°C 以下
          </p>
        </div>

        {risks.length > 0 && (
          <div className="space-y-2 mb-6">
            {risks.map((risk, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-4 rounded-xl animate-pulse-soft ${
                  risk.level === 'danger'
                    ? 'bg-warning-red/10 border border-warning-red/30'
                    : 'bg-warning-orange/10 border border-warning-orange/30'
                }`}
              >
                <AlertTriangle
                  size={20}
                  className="shrink-0 mt-0.5"
                  style={{ color: getRiskLevelColor(risk.level) }}
                />
                <div>
                  <span
                    className="text-xs font-bold uppercase tracking-wide"
                    style={{ color: getRiskLevelColor(risk.level) }}
                  >
                    {risk.level === 'danger' ? '危险' : '警告'}
                  </span>
                  <p className="text-sm text-chocolate-700 mt-1">{risk.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <RingChart
            value={solidsRatio}
            maxValue={50}
            color={solidsStatus.color}
            label="固形物比例"
            unit="%"
            size={120}
          />
          <RingChart
            value={fatContent}
            maxValue={20}
            color="#FFB6C1"
            label="脂肪含量"
            unit="%"
            size={120}
          />
          <RingChart
            value={sugarContent}
            maxValue={30}
            color="#FFD93D"
            label="总糖含量"
            unit="%"
            size={120}
          />
          <RingChart
            value={alcoholContent}
            maxValue={10}
            color="#98D8C8"
            label="酒精含量"
            unit="%"
            size={120}
          />
        </div>

        <div className="mt-6 p-4 rounded-xl bg-cream-50">
          <div className="flex items-center gap-2 mb-2">
            {solidsStatus.status === 'ideal' ? (
              <CheckCircle2 size={20} className="text-mint-500" />
            ) : (
              <AlertTriangle size={20} className="text-warning-orange" />
            )}
            <span
              className="font-bold"
              style={{ color: solidsStatus.status === 'ideal' ? '#6BC4AE' : '#FFA94D' }}
            >
              {solidsStatus.message}
            </span>
          </div>
          <p className="text-sm text-chocolate-500">
            理想固形物范围：35-45%。当前：{solidsRatio.toFixed(1)}%
            {solidsRatio < 35 && '，建议增加糖、奶粉或果泥用量'}
            {solidsRatio > 45 && '，建议减少糖或增加牛奶用量'}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between items-center p-3 bg-cream-50 rounded-xl">
            <span className="text-chocolate-500">稳定剂</span>
            <span className="font-bold text-chocolate-700">{stabilizerContent.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-cream-50 rounded-xl">
            <span className="text-chocolate-500">配料总重</span>
            <span className="font-bold text-chocolate-700">{currentResult.weights.total.toFixed(0)}g</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultDisplay;
