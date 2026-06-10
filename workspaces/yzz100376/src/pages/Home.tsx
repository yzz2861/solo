import { Croissant, Github, Info } from 'lucide-react';
import { RecipeInput } from '@/components/RecipeInput';
import { EnvParamsPanel } from '@/components/EnvParamsPanel';
import { ResultTabs } from '@/components/ResultTabs';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-bakery-cream via-white to-bakery-orange/5">
      <header className="no-print sticky top-0 z-40 bg-bakery-cream/95 backdrop-blur-sm border-b border-bakery-orange/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-bakery-brown to-bakery-orange rounded-xl flex items-center justify-center shadow-lg">
                <Croissant className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-serif text-xl font-bold text-bakery-brownDark">
                  烘焙配方湿度换算
                </h1>
                <p className="text-xs text-bakery-brown/60 -mt-0.5">
                  稳定出品 · 不再发黏
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-bakery-brown/50 hover:text-bakery-brown hover:bg-bakery-cream rounded-lg transition-colors">
                <Info className="w-5 h-5" />
              </button>
              <button className="p-2 text-bakery-brown/50 hover:text-bakery-brown hover:bg-bakery-cream rounded-lg transition-colors">
                <Github className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="no-print mb-6 p-4 bg-gradient-to-r from-bakery-orange/10 to-bakery-water/10 rounded-2xl border border-bakery-orange/20">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🥖</span>
            <div className="text-sm text-bakery-brownDark space-y-1">
              <p>
                <strong>使用说明：</strong>左侧输入基础配方（支持克/公斤/烘焙百分比混写），设置环境参数，右侧实时查看换算结果。
              </p>
              <p className="text-bakery-brown/70">
                💡 老面/种面/汤种会自动扣除其中的水分，避免重复加水。湿度大于60%自动减水，小于60%自动加水。
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-6">
            <RecipeInput />
            <EnvParamsPanel />
          </div>

          <div className="lg:col-span-7 min-h-[600px] lg:sticky lg:top-24 lg:self-start">
            <ResultTabs />
          </div>
        </div>
      </main>

      <footer className="no-print mt-12 py-6 border-t border-bakery-brown/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-bakery-brown/50">
            🍞 烘焙配方湿度换算工具 · 让每一个面包都恰到好处
          </p>
        </div>
      </footer>
    </div>
  );
}
