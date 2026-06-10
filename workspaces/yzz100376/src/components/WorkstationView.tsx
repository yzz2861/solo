import { Maximize2, Minimize2, Droplets, AlertCircle } from 'lucide-react';
import { useRecipeStore } from '@/store';
import { roundTo } from '@/utils/calculator';

export function WorkstationView() {
  const result = useRecipeStore((s) => s.result);
  const isFullscreen = useRecipeStore((s) => s.isFullscreenWorkstation);
  const toggleFullscreen = useRecipeStore((s) => s.toggleFullscreen);

  if (!result) {
    return (
      <div className="p-8 text-center text-bakery-brown/50">
        请输入配方数据
      </div>
    );
  }

  const waterItem = result.finalRecipe.find((i) => i.category === 'water');
  const otherItems = result.finalRecipe.filter((i) => i.category !== 'water');
  const warnings = [
    ...result.boundaryWarnings,
    ...result.adjustments.filter((a) => a.type === 'warning').map((a) => a.description),
  ];

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-white print-full-page'
    : 'h-full flex flex-col';

  return (
    <div className={containerClass}>
      {!isFullscreen && (
        <div className="no-print flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-bakery-water">
            <Droplets className="w-5 h-5" />
            <span className="text-sm font-medium">操作台大字版 · 学徒称量专用</span>
          </div>
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-bakery-water text-white text-sm rounded-lg hover:bg-bakery-waterLight transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
            全屏
          </button>
        </div>
      )}

      {isFullscreen && (
        <button
          onClick={toggleFullscreen}
          className="no-print fixed top-4 right-4 z-50 flex items-center gap-1.5 px-4 py-2 bg-bakery-brown text-white rounded-lg shadow-lg hover:bg-bakery-brownLight transition-colors"
        >
          <Minimize2 className="w-4 h-4" />
          退出全屏
        </button>
      )}

      <div
        className={`flex-1 bg-gradient-to-b from-white to-bakery-waterLight/10 rounded-2xl border-2 ${
          isFullscreen ? 'border-none rounded-none' : 'border-bakery-water/30'
        } p-8 overflow-auto`}
      >
        {waterItem && (
          <div className="text-center mb-8 pb-8 border-b-4 border-bakery-water/30">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-bakery-water/10 rounded-2xl mb-4">
              <Droplets className={`${isFullscreen ? 'w-16 h-16' : 'w-10 h-10'} text-bakery-water`} />
              <div className="text-left">
                <p className={`${isFullscreen ? 'text-2xl' : 'text-base'} font-bold text-bakery-water`}>
                  {waterItem.name}
                </p>
                {waterItem.note && (
                  <p className={`${isFullscreen ? 'text-lg' : 'text-xs'} text-bakery-water/70`}>
                    ⚠️ {waterItem.note}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-baseline justify-center gap-2">
              <span className={`font-mono font-black text-bakery-water ${
                isFullscreen ? 'text-[10rem] leading-none' : 'text-7xl'
              }`}>
                {roundTo(waterItem.value, 0)}
              </span>
              <span className={`font-black text-bakery-water ${
                isFullscreen ? 'text-6xl' : 'text-4xl'
              }`}>g</span>
            </div>
            <p className={`mt-2 text-bakery-water/60 ${isFullscreen ? 'text-xl' : 'text-sm'}`}>
              ⚠️ 水量最容易出错！称量前请再三确认
            </p>
          </div>
        )}

        <div className={`grid ${isFullscreen ? 'grid-cols-2 gap-8' : 'grid-cols-2 gap-4'}`}>
          {otherItems.map((ing, idx) => {
            const isFlour = ing.category === 'flour';
            const isStarter = ing.category === 'starter';
            return (
              <div
                key={idx}
                className={`p-6 rounded-2xl border-2 transition-all ${
                  isFlour
                    ? 'bg-bakery-cream/50 border-bakery-orange/30'
                    : isStarter
                    ? 'bg-bakery-green/10 border-bakery-green/30'
                    : 'bg-white border-bakery-brown/10'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`font-bold ${
                    isFullscreen ? 'text-2xl' : 'text-lg'
                  } ${
                    isFlour
                      ? 'text-bakery-orange'
                      : isStarter
                      ? 'text-bakery-green'
                      : 'text-bakery-brownDark'
                  }`}>
                    {ing.name}
                  </span>
                  {idx < 3 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      idx === 0
                        ? 'bg-bakery-orange text-white'
                        : idx === 1
                        ? 'bg-bakery-brown text-white'
                        : 'bg-bakery-green text-white'
                    }`}>
                      第{idx + 1}步
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`font-mono font-black ${
                    isFullscreen ? 'text-6xl' : 'text-4xl'
                  } ${
                    isFlour
                      ? 'text-bakery-orange'
                      : isStarter
                      ? 'text-bakery-green'
                      : 'text-bakery-brownDark'
                  }`}>
                    {roundTo(ing.value, 0)}
                  </span>
                  <span className={`font-bold ${
                    isFullscreen ? 'text-3xl' : 'text-2xl'
                  } ${
                    isFlour
                      ? 'text-bakery-orange/60'
                      : isStarter
                      ? 'text-bakery-green/60'
                      : 'text-bakery-brown/40'
                  }`}>g</span>
                </div>
                {ing.note && (
                  <p className={`mt-2 ${isFullscreen ? 'text-base' : 'text-xs'} text-bakery-brown/50`}>
                    {ing.note}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {warnings.length > 0 && (
          <div className="mt-8 p-6 bg-bakery-orange/10 border-2 border-bakery-orange/40 rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className={`${isFullscreen ? 'w-8 h-8' : 'w-5 h-5'} text-bakery-orange`} />
              <span className={`font-bold ${isFullscreen ? 'text-2xl' : 'text-lg'} text-bakery-orange`}>
                操作注意事项
              </span>
            </div>
            <ul className="space-y-2">
              {warnings.map((w, i) => (
                <li
                  key={i}
                  className={`flex items-start gap-2 ${isFullscreen ? 'text-lg' : 'text-sm'} text-bakery-brownDark`}
                >
                  <span className="text-bakery-orange">•</span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={`mt-8 text-center ${isFullscreen ? 'text-2xl' : 'text-sm'} text-bakery-brown/40`}>
          <p>🎯 目标出品量：{roundTo(result.totalWeight, 0)}g · 放大 {result.scaleFactor}×</p>
          <p className="mt-1">称量完毕请师傅复核确认</p>
        </div>
      </div>
    </div>
  );
}
