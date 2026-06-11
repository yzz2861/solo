import { useMemo } from 'react';
import { CheckCircle2, XCircle, Calculator, Gift, TrendingUp } from 'lucide-react';
import { useSolutionStore } from '@/store/useSolutionStore';
import { runTrial } from '@/engine/giftCalculator';
import WarningBanner from './WarningBanner';
import GiftCard from './GiftCard';

export default function TrialResult() {
  const solution = useSolutionStore((s) => s.getActive());

  const result = useMemo(() => {
    if (!solution) return null;
    return runTrial(solution.rules, solution.cart, solution.couponAmount, solution.orderNumber);
  }, [solution]);

  if (!result || !solution) return null;

  const hitRules = result.ruleDetails.filter((r) => r.hit);
  const missedRules = result.ruleDetails.filter((r) => !r.hit);

  return (
    <div className="card flex flex-col h-full min-h-0">
      <div className="card-header justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-emerald-500" />
          <span className="card-title">试算结果</span>
          {hitRules.length > 0 && (
            <span className="tag-success">命中 {hitRules.length} 条</span>
          )}
          {result.gifts.length > 0 && (
            <span className="tag-accent">
              <Gift className="w-3 h-3" />
              {result.gifts.reduce((s, g) => s + g.quantity, 0)} 件赠品
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200">
            <div className="text-xs text-gray-500">券前金额</div>
            <div
              className={`text-lg font-semibold mt-0.5 ${
                solution.couponAmount > 0 ? 'text-gray-500 line-through' : 'text-gray-800'
              }`}
            >
              ¥{result.originalTotal.toFixed(2)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary-50 to-purple-50 border border-primary-200">
            <div className="text-xs text-primary-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              券后实付
            </div>
            <div className="text-lg font-bold mt-0.5 text-primary-700">
              ¥{result.finalTotal.toFixed(2)}
            </div>
          </div>
        </div>

        {result.warnings.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              边界提醒
            </div>
            <WarningBanner warnings={result.warnings} />
          </div>
        )}

        {result.gifts.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <Gift className="w-3.5 h-3.5" />
              将获得赠品
            </div>
            <div className="space-y-3">
              {result.gifts.map((g) => (
                <GiftCard key={g.giftId} gift={g} ruleDetails={result.ruleDetails} />
              ))}
            </div>
          </div>
        )}

        {result.ruleDetails.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 mb-2">规则命中情况</div>
            <div className="space-y-2">
              {hitRules.map((r) => (
                <div
                  key={r.ruleId}
                  className={`flex items-start gap-2 p-2.5 rounded-lg text-sm ${
                    r.isBoundary
                      ? 'bg-amber-50 border-2 border-amber-200'
                      : 'bg-emerald-50 border border-emerald-100'
                  }`}
                >
                  <CheckCircle2
                    className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      r.isBoundary ? 'text-amber-500' : 'text-emerald-500'
                    }`}
                  />
                  <div className="min-w-0">
                    <div
                      className={`font-medium ${
                        r.isBoundary ? 'text-amber-800' : 'text-emerald-800'
                      }`}
                    >
                      {r.ruleName}
                    </div>
                    <div
                      className={`text-xs mt-0.5 ${
                        r.isBoundary ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      {r.reason}
                    </div>
                  </div>
                </div>
              ))}
              {missedRules.map((r) => (
                <div
                  key={r.ruleId}
                  className={`flex items-start gap-2 p-2.5 rounded-lg text-sm ${
                    r.isBoundary
                      ? 'bg-amber-50 border-2 border-amber-200'
                      : 'bg-gray-50 border border-gray-100'
                  }`}
                >
                  <XCircle
                    className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      r.isBoundary ? 'text-amber-500' : 'text-gray-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <div
                      className={`font-medium ${
                        r.isBoundary ? 'text-amber-800' : 'text-gray-500'
                      }`}
                    >
                      {r.ruleName}
                    </div>
                    <div
                      className={`text-xs mt-0.5 ${
                        r.isBoundary ? 'text-amber-600' : 'text-gray-400'
                      }`}
                    >
                      {r.reason}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.ruleDetails.length === 0 && result.gifts.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            请先添加赠品规则和购物车商品
          </div>
        )}
      </div>
    </div>
  );
}
