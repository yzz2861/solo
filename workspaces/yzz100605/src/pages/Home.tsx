import InputPanel from '@/components/InputPanel';
import ValidationBar from '@/components/ValidationBar';
import ResultCard from '@/components/ResultCard';
import StepByStep from '@/components/StepByStep';
import ExportButton from '@/components/ExportButton';
import { useBufferStore } from '@/store/useBufferStore';
import { Beaker } from 'lucide-react';

export default function Home() {
  const result = useBufferStore((s) => s.result);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 shadow-md shadow-teal-200">
            <Beaker className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <h1 className="font-serif text-xl font-bold text-slate-800">缓冲液 pH 配比助手</h1>
            <p className="text-xs text-slate-400">基于 Henderson-Hasselbalch 方程 · 输入即校验 · 每步可溯源</p>
          </div>
          {result && <div className="ml-auto"><ExportButton /></div>}
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <section>
          <InputPanel />
        </section>

        <section>
          <ValidationBar />
        </section>

        {result && (
          <section>
            <ResultCard />
          </section>
        )}

        <section>
          <StepByStep />
        </section>
      </main>

      <footer className="border-t border-slate-100 bg-white/50">
        <div className="mx-auto max-w-4xl px-6 py-4 text-center text-xs text-slate-400">
          缓冲液 pH 配比助手 · 仅提供估算参考，实际配制请以 pH 计校准为准
        </div>
      </footer>
    </div>
  );
}
