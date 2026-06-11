import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2, GripVertical, ToggleLeft, ToggleRight } from 'lucide-react';
import type { GiftRule } from '@/types';
import { useSolutionStore } from '@/store/useSolutionStore';
import GiftSelector from './GiftSelector';

interface Props {
  rule: GiftRule;
}

export default function RuleItem({ rule }: Props) {
  const [expanded, setExpanded] = useState(false);
  const updateRule = useSolutionStore((s) => s.updateRule);
  const deleteRule = useSolutionStore((s) => s.deleteRule);
  const solution = useSolutionStore((s) => s.getActive());

  const isThreshold = rule.type === 'threshold';

  const allGifts = solution?.rules.map((r) => ({
    giftId: r.giftId,
    giftName: r.giftName,
    giftStock: r.giftStock,
    giftPerOrder: r.giftPerOrder,
  })) ?? [];

  return (
    <div
      className={`rounded-xl border transition-all ${
        rule.enabled
          ? 'bg-white border-primary-100 hover:border-primary-300'
          : 'bg-gray-50 border-gray-200'
      }`}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`font-medium text-sm truncate ${
                rule.enabled ? 'text-gray-800' : 'text-gray-400 line-through'
              }`}
            >
              {rule.name}
            </span>
            <span className={isThreshold ? 'tag-primary' : 'tag-accent'}>
              {isThreshold ? '满额送' : '限量送'}
            </span>
            {rule.excludeBundle && <span className="tag-warning">排除套装</span>}
            {rule.useCoupon && isThreshold && <span className="tag-success">券后计算</span>}
          </div>
          <div className="text-xs text-gray-500 mt-0.5 truncate">
            🎁 {rule.giftName} x{rule.giftPerOrder} · 库存 {rule.giftStock}
            {allGifts.filter((g) => g.giftId === rule.giftId).length > 1 && (
              <span className="ml-1 text-red-500 font-medium">(*{allGifts.filter((g) => g.giftId === rule.giftId).length}规则共用)</span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateRule(rule.id, { enabled: !rule.enabled });
          }}
          className="p-1"
        >
          {rule.enabled ? (
            <ToggleRight className="w-8 h-8 text-primary-500" />
          ) : (
            <ToggleLeft className="w-8 h-8 text-gray-300" />
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteRule(rule.id);
          }}
          className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 animate-fade-in border-t border-primary-50 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">规则名称</label>
              <input
                className="input-field"
                value={rule.name}
                onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                placeholder="例如：满199送杯子"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">规则类型</label>
              <select
                className="input-field"
                value={rule.type}
                onChange={(e) =>
                  updateRule(rule.id, { type: e.target.value as GiftRule['type'] })
                }
              >
                <option value="threshold">满额送</option>
                <option value="limit_first">限量送（前N单）</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">优先级</label>
              <input
                type="number"
                className="input-field"
                value={rule.priority}
                onChange={(e) =>
                  updateRule(rule.id, { priority: Number(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          {isThreshold ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">满额金额（元）</label>
                <input
                  type="number"
                  className="input-field"
                  value={rule.thresholdAmount ?? ''}
                  onChange={(e) =>
                    updateRule(rule.id, {
                      thresholdAmount: Number(e.target.value) || 0,
                    })
                  }
                  placeholder="199"
                />
              </div>
              <div className="flex items-end gap-3">
                <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rule.useCoupon}
                    onChange={(e) => updateRule(rule.id, { useCoupon: e.target.checked })}
                    className="w-4 h-4 rounded border-primary-300 text-primary-600 focus:ring-primary-400"
                  />
                  券后计算
                </label>
                <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rule.excludeBundle}
                    onChange={(e) =>
                      updateRule(rule.id, { excludeBundle: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-primary-300 text-primary-600 focus:ring-primary-400"
                  />
                  排除套装
                </label>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs text-gray-500 mb-1">前多少单有效</label>
              <input
                type="number"
                className="input-field"
                value={rule.limitCount ?? ''}
                onChange={(e) =>
                  updateRule(rule.id, { limitCount: Number(e.target.value) || 0 })
                }
                placeholder="200"
              />
            </div>
          )}

          <div className="pt-1">
            <label className="block text-xs text-gray-500 mb-1.5">关联赠品</label>
            <GiftSelector rule={rule} allGifts={allGifts} onUpdate={(patch) => updateRule(rule.id, patch)} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs text-gray-500 mb-1">赠品名称</label>
              <input
                className="input-field"
                value={rule.giftName}
                onChange={(e) => updateRule(rule.id, { giftName: e.target.value })}
                placeholder="马克杯"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">每单数量</label>
              <input
                type="number"
                className="input-field"
                value={rule.giftPerOrder}
                onChange={(e) =>
                  updateRule(rule.id, { giftPerOrder: Number(e.target.value) || 1 })
                }
                min={1}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">总库存</label>
              <input
                type="number"
                className="input-field"
                value={rule.giftStock}
                onChange={(e) =>
                  updateRule(rule.id, { giftStock: Number(e.target.value) || 0 })
                }
                min={0}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
