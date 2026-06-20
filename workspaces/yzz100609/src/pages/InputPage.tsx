import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, RotateCcw, Snowflake } from 'lucide-react';
import InputCard from '@/components/InputCard';
import { useCalcStore } from '@/store/calculationStore';

export default function InputPage() {
  const { input, calculate, reset } = useCalcStore();
  const navigate = useNavigate();

  const handleCalculate = () => {
    calculate();
    navigate('/result');
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-500/10 p-2.5 border border-sky-500/20">
              <Snowflake className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100">冷库开门热负荷估算</h1>
              <p className="text-xs text-slate-500">输入参数，量化开门造成的额外热负荷</p>
            </div>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-700 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            重置
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <InputCard />
            <button
              onClick={handleCalculate}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white hover:bg-sky-500 active:scale-[0.98] transition-all shadow-lg shadow-sky-600/20"
            >
              <Calculator className="h-4 w-4" />
              开始估算
            </button>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5 space-y-4 sticky top-6">
              <h3 className="text-sm font-semibold text-slate-400">参数概览</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">库容</span>
                  <span className="font-mono text-slate-300">{input.volume} m³</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">目标温度</span>
                  <span className="font-mono text-slate-300">{input.targetTemp}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">外界温度</span>
                  <span className="font-mono text-slate-300">{input.ambientTemp}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">内外温差</span>
                  <span className="font-mono text-orange-400">{Math.abs(input.ambientTemp - input.targetTemp).toFixed(1)}°C</span>
                </div>
                <div className="h-px bg-slate-700/50" />
                <div className="flex justify-between">
                  <span className="text-slate-500">门洞面积</span>
                  <span className="font-mono text-slate-300">{(input.doorWidth * input.doorHeight).toFixed(2)} m²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">开门次数</span>
                  <span className="font-mono text-slate-300">{input.openCount} 次/天</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">日累计开门</span>
                  <span className="font-mono text-slate-300">{(input.openCount * input.avgOpenDuration / 60).toFixed(0)} 分钟</span>
                </div>
              </div>
              <div className="rounded-lg bg-slate-700/30 p-3 text-xs text-slate-500 leading-relaxed">
                填写完所有参数后，点击"开始估算"按钮查看热负荷结果。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
