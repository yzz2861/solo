import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Snowflake } from 'lucide-react';
import ReportPreview from '@/components/ReportPreview';
import { useCalcStore } from '@/store/calculationStore';

export default function ReportPage() {
  const { input, result, simulation } = useCalcStore();
  const navigate = useNavigate();

  if (!result) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/result')}
            className="rounded-lg border border-slate-600 p-1.5 text-slate-400 hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <Snowflake className="h-5 w-5 text-sky-400" />
            <h1 className="text-lg font-bold text-slate-100">报告导出</h1>
          </div>
        </div>

        <ReportPreview input={input} result={result} simulation={simulation} />
      </div>
    </div>
  );
}
