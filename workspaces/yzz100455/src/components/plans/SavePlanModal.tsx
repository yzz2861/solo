import { useState } from 'react';
import { usePlanStore, useCalculatorStore } from '@/store';
import { X, Save } from 'lucide-react';

interface SavePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SavePlanModal({ isOpen, onClose }: SavePlanModalProps) {
  const [planName, setPlanName] = useState('');
  const { params, result } = useCalculatorStore();
  const { savePlan, plans } = usePlanStore();

  if (!isOpen) return null;

  const handleSave = () => {
    const name = planName.trim() || `方案 ${plans.length + 1}`;
    savePlan(name, params, result);
    setPlanName('');
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl animate-slide-down">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Save size={20} className="text-ice-500" />
            保存方案
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="label-text">方案名称</label>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="例如：三楼会议室"
              className="input-field"
              autoFocus
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl text-sm text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>面积</span>
              <span className="font-mono">{params.area} {params.areaUnit === 'sqm' ? '㎡' : 'sqft'}</span>
            </div>
            <div className="flex justify-between">
              <span>人数</span>
              <span className="font-mono">{params.peopleCount} 人</span>
            </div>
            <div className="flex justify-between">
              <span>估算冷负荷</span>
              <span className="font-mono text-ice-600">{(result.totalCoolingLoad / 1000).toFixed(1)} kW</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="btn-secondary flex-1">
            取消
          </button>
          <button onClick={handleSave} className="btn-primary flex-1">
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
