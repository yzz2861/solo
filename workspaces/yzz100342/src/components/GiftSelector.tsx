import { useState } from 'react';
import { Package, Plus, Check, X } from 'lucide-react';
import type { GiftRule } from '@/types';

interface Props {
  rule: GiftRule;
  allGifts: Array<{ giftId: string; giftName: string; giftStock: number; giftPerOrder: number }>;
  onUpdate: (patch: Partial<GiftRule>) => void;
}

export default function GiftSelector({ rule, allGifts, onUpdate }: Props) {
  const [showSelector, setShowSelector] = useState(false);
  const [isNewGift, setIsNewGift] = useState(true);

  const existingGifts = allGifts.filter((g) => g.giftId !== rule.giftId);

  const handleSelectGift = (gift: typeof allGifts[0]) => {
    onUpdate({
      giftId: gift.giftId,
      giftName: gift.giftName,
      giftStock: gift.giftStock,
      giftPerOrder: gift.giftPerOrder,
    });
    setIsNewGift(false);
    setShowSelector(false);
  };

  const handleCreateNewGift = () => {
    onUpdate({
      giftId: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    });
    setIsNewGift(true);
    setShowSelector(false);
  };

  const currentGiftInfo = allGifts.find((g) => g.giftId === rule.giftId);
  const sameGiftRules = allGifts.filter((g) => g.giftId === rule.giftId).length;

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowSelector(!showSelector)}
          className="flex-1 flex items-center justify-between px-3 py-2 rounded-lg border-2 border-primary-100 hover:border-primary-300 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-medium text-gray-800 truncate">{rule.giftName}</span>
            {sameGiftRules > 1 && (
              <span className="tag-danger">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {sameGiftRules} 条规则
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400">选择赠品</span>
        </button>
        {!isNewGift && (
          <button
            onClick={handleCreateNewGift}
            className="p-2 rounded-lg border-2 border-dashed border-gray-200 text-gray-400 hover:border-primary-300 hover:text-primary-500 transition-colors"
            title="创建新赠品"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {showSelector && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-glow border border-primary-100 py-2 z-50 animate-fade-in">
          <div className="px-3 py-2 border-b border-gray-100">
            <span className="text-xs font-medium text-gray-500">选择已有赠品（复用）</span>
          </div>

          {existingGifts.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-gray-400">
              暂无其他赠品，当前为新赠品
            </div>
          ) : (
            <div className="max-h-40 overflow-y-auto">
              {existingGifts.map((gift) => (
                <button
                  key={gift.giftId}
                  onClick={() => handleSelectGift(gift)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-primary-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-100 to-purple-100 flex items-center justify-center">
                    <Package className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{gift.giftName}</div>
                    <div className="text-xs text-gray-400">
                      x{gift.giftPerOrder} · 库存 {gift.giftStock}
                    </div>
                  </div>
                  <Check className="w-4 h-4 text-primary-500" />
                </button>
              ))}
            </div>
          )}

          <div className="px-3 py-2 border-t border-gray-100">
            <button
              onClick={handleCreateNewGift}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-primary-600 hover:bg-primary-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              创建新赠品
            </button>
          </div>

          <button
            onClick={() => setShowSelector(false)}
            className="absolute -top-1 -right-1 p-1 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
