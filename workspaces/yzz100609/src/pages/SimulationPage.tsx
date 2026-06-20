import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Snowflake } from 'lucide-react';
import ComparisonChart from '@/components/ComparisonChart';
import { useCalcStore } from '@/store/calculationStore';

export default function SimulationPage() {
  const { input, result, simulation, simulate } = useCalcStore();
  const navigate = useNavigate();

  const [reducedCount, setReducedCount] = useState(Math.max(1, Math.floor(input.openCount * 0.6)));
  const [reducedDuration, setReducedDuration] = useState(Math.max(30, Math.floor(input.avgOpenDuration * 0.5)));

  useEffect(() => {
    if (!result) navigate('/');
  }, [result, navigate]);

  if (!result) return null;

  const handleSimulate = () => {
    simulate(reducedCount, reducedDuration);
  };

  const durationMinutes = Math.floor(reducedDuration / 60);
  const durationSeconds = reducedDuration % 60;

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/result')}
            className="rounded-lg border border-slate-600 p-1.5 text-slate-400 hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <Snowflake className="h-5 w-5 text-sky-400" />
            <h1 className="text-lg font-bold text-slate-100">收益模拟</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-400">调整开门策略</h3>
              <p className="text-xs text-slate-500">拖动滑块调整减少后的开门参数，查看改善效果</p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">开门次数</span>
                    <span className="font-mono">
                      <span className="text-slate-500">{input.openCount}</span>
                      <span className="text-slate-600 mx-1">→</span>
                      <span className="text-emerald-400 font-bold">{reducedCount}</span>
                      <span className="text-slate-500 ml-1">次/天</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={input.openCount}
                    value={reducedCount}
                    onChange={(e) => setReducedCount(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>1次</span>
                    <span>{input.openCount}次</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">平均开门时长</span>
                    <span className="font-mono">
                      <span className="text-slate-500">{Math.floor(input.avgOpenDuration / 60)}分{input.avgOpenDuration % 60}秒</span>
                      <span className="text-slate-600 mx-1">→</span>
                      <span className="text-emerald-400 font-bold">{durationMinutes}分{durationSeconds}秒</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={input.avgOpenDuration}
                    step={10}
                    value={reducedDuration}
                    onChange={(e) => setReducedDuration(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>10秒</span>
                    <span>{Math.floor(input.avgOpenDuration / 60)}分</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSimulate}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 active:scale-[0.98] transition-all"
              >
                <Play className="h-4 w-4" />
                计算改善效果
              </button>
            </div>

            <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 space-y-2">
              <h4 className="text-xs font-semibold text-sky-400">实用建议</h4>
              <ul className="space-y-1.5 text-xs text-slate-400 leading-relaxed">
                <li>• 合并装卸作业，减少零散开门</li>
                <li>• 提前备货，缩短库内找货时间</li>
                <li>• 高温时段减少开门，改在早晚进出货</li>
                <li>• 培训装卸工"快进快出"意识</li>
                <li>• 安装开门超时报警器</li>
              </ul>
            </div>
          </div>

          <div>
            {simulation ? (
              <ComparisonChart
                simulation={simulation}
                originalCount={input.openCount}
                originalDuration={input.avgOpenDuration}
              />
            ) : (
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-8 text-center">
                <div className="text-sm text-slate-500">调整参数后点击"计算改善效果"</div>
                <div className="text-xs text-slate-600 mt-1">查看减少开门后的收益对比</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
