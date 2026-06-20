import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sliders, FileText, Snowflake } from 'lucide-react';
import ResultCard from '@/components/ResultCard';
import { useCalcStore } from '@/store/calculationStore';

export default function ResultPage() {
  const { result, input } = useCalcStore();
  const navigate = useNavigate();

  if (!result) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="rounded-lg border border-slate-600 p-1.5 text-slate-400 hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <Snowflake className="h-5 w-5 text-sky-400" />
              <h1 className="text-lg font-bold text-slate-100">估算结果</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/simulation')}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-500 transition-colors"
            >
              <Sliders className="h-3 w-3" />
              收益模拟
            </button>
            <button
              onClick={() => navigate('/report')}
              className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-600 transition-colors"
            >
              <FileText className="h-3 w-3" />
              导出报告
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResultCard result={result} />
        </div>
      </div>
    </div>
  );
}
