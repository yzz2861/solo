import { Gift, Package, RotateCcw, AlertTriangle } from 'lucide-react';
import type { GiftResult, RuleHitDetail } from '@/types';

interface Props {
  gift: GiftResult;
  ruleDetails: RuleHitDetail[];
}

export default function GiftCard({ gift, ruleDetails }: Props) {
  const stockPercent = Math.max(
    0,
    Math.min(100, (gift.remainingStock / Math.max(1, gift.initialStock)) * 100),
  );
  const isLowStock = stockPercent <= 20;

  const hitRuleNames = ruleDetails
    .filter((d) => gift.hitRules.includes(d.ruleId))
    .map((d) => d.ruleName);

  return (
    <div
      className={`relative p-4 rounded-xl border-2 transition-all animate-fade-in ${
        gift.stockOut
          ? 'bg-gray-50 border-gray-200 opacity-70'
          : gift.isMultiHit
            ? 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-300 shadow-glow'
            : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'
      }`}
    >
      {gift.isMultiHit && (
        <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium shadow-md">
          多重命中
        </span>
      )}
      {gift.stockOut && (
        <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-medium shadow-md">
          已抢光
        </span>
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              gift.stockOut ? 'bg-gray-200' : 'bg-white shadow-sm'
            }`}
          >
            <Gift
              className={`w-5 h-5 ${gift.stockOut ? 'text-gray-400' : 'text-primary-600'}`}
            />
          </div>
          <div>
            <div
              className={`font-medium ${gift.stockOut ? 'text-gray-500 line-through' : 'text-gray-800'}`}
            >
              {gift.giftName}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              获得 <span className="font-semibold text-emerald-600">{gift.quantity}</span> 件
              {gift.willRecall && (
                <span className="ml-2 inline-flex items-center gap-0.5 text-amber-600">
                  <RotateCcw className="w-3 h-3" />
                  退货可能收回
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="flex items-center gap-1 text-gray-500">
            <Package className="w-3 h-3" />
            库存剩余
          </span>
          <span
            className={`font-medium ${
              gift.stockOut
                ? 'text-red-500'
                : isLowStock
                  ? 'text-amber-600'
                  : 'text-emerald-600'
            }`}
          >
            {gift.remainingStock} / {gift.initialStock}
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              gift.stockOut
                ? 'bg-red-400'
                : isLowStock
                  ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                  : 'bg-gradient-to-r from-emerald-400 to-teal-400'
            }`}
            style={{ width: `${stockPercent}%` }}
          />
        </div>
      </div>

      {gift.isMultiHit && hitRuleNames.length > 1 && (
        <div className="mt-3 p-2 rounded-lg bg-white/70 border border-purple-200">
          <div className="flex items-start gap-1.5 text-xs text-purple-700">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium">同时命中 {hitRuleNames.length} 条规则：</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {hitRuleNames.map((n) => (
                  <span
                    key={n}
                    className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[11px]"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
