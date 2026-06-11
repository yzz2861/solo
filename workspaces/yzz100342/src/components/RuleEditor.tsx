import { Gift, Plus } from 'lucide-react';
import RuleItem from './RuleItem';
import type { GiftRule } from '@/types';
import { useSolutionStore } from '@/store/useSolutionStore';
import { generateId } from '@/utils/storage';

export default function RuleEditor() {
  const solution = useSolutionStore((s) => s.getActive());
  const addRule = useSolutionStore((s) => s.addRule);

  if (!solution) return null;

  const handleAddThresholdRule = () => {
    const rule: Omit<GiftRule, 'id'> = {
      name: `新满额规则 ${solution.rules.length + 1}`,
      type: 'threshold',
      priority: 10,
      thresholdAmount: 99,
      useCoupon: false,
      excludeBundle: false,
      giftId: generateId(),
      giftName: '新赠品',
      giftStock: 100,
      giftPerOrder: 1,
      enabled: true,
    };
    addRule(rule);
  };

  const handleAddLimitRule = () => {
    const rule: Omit<GiftRule, 'id'> = {
      name: `新限量规则 ${solution.rules.length + 1}`,
      type: 'limit_first',
      priority: 5,
      limitCount: 100,
      giftId: generateId(),
      giftName: '新赠品',
      giftStock: 100,
      giftPerOrder: 1,
      enabled: true,
    };
    addRule(rule);
  };

  return (
    <div className="card flex flex-col h-full min-h-0">
      <div className="card-header justify-between">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary-600" />
          <span className="card-title">赠品规则</span>
          <span className="tag-primary">{solution.rules.filter(r => r.enabled).length}/{solution.rules.length} 启用</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {solution.rules.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            暂无规则，点击下方按钮添加
          </div>
        )}
        {solution.rules.map((rule) => (
          <RuleItem key={rule.id} rule={rule} />
        ))}
      </div>

      <div className="p-4 border-t border-primary-50 flex gap-2">
        <button className="btn-secondary flex-1 flex items-center justify-center gap-1" onClick={handleAddThresholdRule}>
          <Plus className="w-4 h-4" />
          加满额送
        </button>
        <button className="btn-secondary flex-1 flex items-center justify-center gap-1" onClick={handleAddLimitRule}>
          <Plus className="w-4 h-4" />
          加限量送
        </button>
      </div>
    </div>
  );
}
