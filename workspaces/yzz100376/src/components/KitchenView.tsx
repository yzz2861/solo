import { Printer, Scale } from 'lucide-react';
import { useRecipeStore } from '@/store';
import { roundTo } from '@/utils/calculator';

const categoryIcons: Record<string, string> = {
  flour: '🌾',
  water: '💧',
  salt: '🧂',
  sugar: '🍬',
  fat: '🧈',
  yeast: '🍞',
  starter: '🥖',
  other: '📦',
};

export function KitchenView() {
  const result = useRecipeStore((s) => s.result);

  if (!result) {
    return (
      <div className="p-8 text-center text-bakery-brown/50">
        请输入配方数据
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="no-print flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-bakery-green">
          <Scale className="w-5 h-5" />
          <span className="text-sm font-medium">后厨称量版 · 共{result.finalRecipe.length}项</span>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-bakery-green text-white text-sm rounded-lg hover:bg-bakery-greenLight transition-colors"
        >
          <Printer className="w-4 h-4" />
          打印
        </button>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-bakery-green/20 p-6 print-area overflow-auto">
        <div className="text-center mb-6 print:block">
          <h1 className="font-serif text-2xl font-bold text-bakery-brownDark">
            🍞 后厨称量配方单
          </h1>
          <p className="text-sm text-bakery-brown/60 mt-1">
            总重量：{roundTo(result.totalWeight, 0)}g · 放大{result.scaleFactor}倍 ·{' '}
            {new Date().toLocaleDateString('zh-CN')}
          </p>
        </div>

        <div className="space-y-1">
          {result.finalRecipe.map((ing, idx) => {
            const isWater = ing.category === 'water';
            return (
              <div
                key={idx}
                className={`flex items-center justify-between py-3 px-4 rounded-xl transition-all ${
                  isWater
                    ? 'bg-bakery-waterLight/20 border-2 border-bakery-water/30'
                    : idx % 2 === 0
                    ? 'bg-bakery-cream/30'
                    : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{categoryIcons[ing.category] || '📦'}</span>
                  <div>
                    <span className={`font-bold text-lg ${
                      isWater ? 'text-bakery-water' : 'text-bakery-brownDark'
                    }`}>
                      {ing.name}
                    </span>
                    {ing.note && (
                      <p className="text-xs text-bakery-brown/50 mt-0.5">{ing.note}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-mono font-black text-3xl ${
                    isWater ? 'text-bakery-water' : 'text-bakery-brownDark'
                  }`}>
                    {roundTo(ing.value, 0)}
                  </span>
                  <span className={`text-lg font-bold ml-1 ${
                    isWater ? 'text-bakery-water' : 'text-bakery-brown/60'
                  }`}>g</span>
                </div>
              </div>
            );
          })}
        </div>

        {result.adjustments.filter((a) => a.type === 'warning' || a.type === 'water').length > 0 && (
          <div className="mt-6 p-4 bg-bakery-orange/10 border border-bakery-orange/30 rounded-xl">
            <p className="font-bold text-bakery-orange text-sm mb-2">⚠️ 重要提示</p>
            <ul className="space-y-1">
              {result.adjustments
                .filter((a) => a.type === 'warning' || a.type === 'water')
                .map((adj, i) => (
                  <li key={i} className="text-sm text-bakery-brownDark">
                    • {adj.description}
                  </li>
                ))}
            </ul>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-bakery-brown/10 text-center">
          <p className="text-xs text-bakery-brown/40">
            — 称量前请确认电子秤已归零 —
          </p>
        </div>
      </div>
    </div>
  );
}
