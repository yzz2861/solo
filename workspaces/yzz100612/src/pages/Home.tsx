import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEstimateStore } from '@/store/useEstimateStore'
import InputForm from '@/components/InputForm'
import ResultPanel from '@/components/ResultPanel'
import WarningBanner from '@/components/WarningBanner'
import { Calculator, FileText, Save, RotateCcw } from 'lucide-react'

export default function Home() {
  const { input, result, calculate, saveRecord, clearInput } = useEstimateStore()
  const navigate = useNavigate()

  useEffect(() => {
    calculate()
  }, [input, calculate])

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 shadow-xl shadow-black/20">
          <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-bold text-white">
            <Calculator className="h-5 w-5 text-cyan-400" />
            参数输入
          </h2>
          <InputForm />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              saveRecord()
            }}
            disabled={!result}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2.5 text-sm font-medium text-cyan-300 transition-all hover:bg-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            存档
          </button>
          <button
            onClick={() => navigate('/report')}
            disabled={!result || result.riskLevel === 'no_anchor'}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm font-medium text-emerald-300 transition-all hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileText className="h-4 w-4" />
            船长报告
          </button>
          <button
            onClick={clearInput}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-600/50 bg-slate-700/30 px-3 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-slate-700/50"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {result ? (
          <>
            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 shadow-xl shadow-black/20">
              <h2 className="mb-4 font-serif text-lg font-bold text-white">估算结果</h2>
              <ResultPanel result={result} />
            </div>

            {result.warnings.length > 0 && (
              <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 shadow-xl shadow-black/20">
                <h2 className="mb-4 font-serif text-lg font-bold text-white">风险提示</h2>
                <WarningBanner warnings={result.warnings} riskLevel={result.riskLevel} />
              </div>
            )}
          </>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-900/60">
            <p className="text-slate-500">输入参数后将显示估算结果</p>
          </div>
        )}
      </div>
    </div>
  )
}
