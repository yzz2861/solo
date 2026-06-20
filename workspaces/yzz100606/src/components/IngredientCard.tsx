import React, { useState } from 'react';
import { Edit2, Trash2, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { Ingredient } from '@/types';
import { useCalculatorStore } from '@/store/useCalculatorStore';
import { nutrientLabels } from '@/data/standards';

interface IngredientCardProps {
  ingredient: Ingredient;
  showActions?: boolean;
}

export const IngredientCard: React.FC<IngredientCardProps> = ({
  ingredient,
  showActions = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { updateIngredient, removeIngredient } = useCalculatorStore();

  const handleChange = (field: keyof Ingredient, value: string | number) => {
    updateIngredient(ingredient.id, { [field]: value });
  };

  const nutrients = [
    { key: 'crudeProtein', ...nutrientLabels.crudeProtein },
    { key: 'metabolizableEnergy', ...nutrientLabels.metabolizableEnergy },
    { key: 'calcium', ...nutrientLabels.calcium },
    { key: 'phosphorus', ...nutrientLabels.phosphorus },
    { key: 'lysine', ...nutrientLabels.lysine },
    { key: 'methionine', ...nutrientLabels.methionine },
  ] as const;

  return (
    <div className={`card ${ingredient.inventory < 50 ? 'animate-pulse-warning border-warning-red' : ''}`}>
      <div
        className="card-header flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">{ingredient.emoji}</span>
          <div>
            <h3 className="font-bold text-lg text-gray-800">{ingredient.name}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Package className="w-4 h-4" />
              <span>库存: {ingredient.inventory} 公斤</span>
              {ingredient.inventory < 50 && (
                <span className="status-badge fail">库存偏低</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-soil-brown">
            ¥{ingredient.price}/kg
          </span>
          {showActions && (
            <button
              className="btn btn-ghost btn-sm p-1"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(!isEditing);
              }}
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="card-body animate-fade-in">
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">原料名称</label>
                  <input
                    type="text"
                    className="input input-sm"
                    value={ingredient.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">库存 (公斤)</label>
                  <input
                    type="number"
                    className="input input-sm"
                    value={ingredient.inventory}
                    onChange={(e) => handleChange('inventory', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="label">价格 (元/公斤)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input input-sm"
                    value={ingredient.price}
                    onChange={(e) => handleChange('price', Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {nutrients.map((n) => (
                  <div key={n.key}>
                    <label className="label">{n.label} ({n.unit})</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input input-sm"
                      value={ingredient[n.key]}
                      onChange={(e) => handleChange(n.key, Number(e.target.value))}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="label">价格变动备注</label>
                <textarea
                  className="input input-sm"
                  value={ingredient.priceNote}
                  onChange={(e) => handleChange('priceNote', e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex justify-between">
                <button
                  className="btn btn-danger"
                  onClick={() => removeIngredient(ingredient.id)}
                >
                  <Trash2 className="w-4 h-4" />
                  删除原料
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => setIsEditing(false)}
                >
                  完成编辑
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {nutrients.map((n) => (
                  <div key={n.key} className="text-center p-2 bg-field rounded-lg">
                    <div className="text-xs text-gray-500">{n.label}</div>
                    <div className="font-mono font-bold text-wheat-green">
                      {ingredient[n.key]}
                    </div>
                    <div className="text-xs text-gray-400">{n.unit}</div>
                  </div>
                ))}
              </div>

              {ingredient.priceNote && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="text-sm text-amber-800">
                    💡 价格备注：{ingredient.priceNote}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
