import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { useRecipeStore } from '../../store/useRecipeStore';
import { useUIStore } from '../../store/useUIStore';
import Modal from '../ui/Modal';

const SaveRecipeModal: React.FC = () => {
  const { showSaveModal, setShowSaveModal } = useUIStore();
  const { saveRecipe, currentRecipe, currentResult, reset } = useRecipeStore();
  
  const [name, setName] = useState(currentRecipe?.name || '');
  const [description, setDescription] = useState(currentRecipe?.description || '');
  const [notes, setNotes] = useState('');
  const [saveAsNew, setSaveAsNew] = useState(!currentRecipe);

  const handleSave = () => {
    if (!name.trim()) return;
    
    const recipeName = saveAsNew ? name.trim() : currentRecipe!.name;
    const recipeDesc = saveAsNew ? description.trim() : currentRecipe!.description;
    
    if (saveAsNew) {
      reset();
    }
    
    saveRecipe(recipeName, recipeDesc, notes.trim());
    setShowSaveModal(false);
    setName('');
    setDescription('');
    setNotes('');
  };

  if (!currentResult) return null;

  return (
    <Modal
      isOpen={showSaveModal}
      onClose={() => setShowSaveModal(false)}
      title="保存配方"
      size="lg"
    >
      <div className="space-y-6">
        {currentRecipe && (
          <div className="flex items-center gap-4 p-4 bg-cream-50 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!saveAsNew}
                onChange={() => setSaveAsNew(false)}
                className="w-5 h-5 accent-icecream-pink"
              />
              <span className="font-medium text-chocolate-700">保存为新版本</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={saveAsNew}
                onChange={() => setSaveAsNew(true)}
                className="w-5 h-5 accent-icecream-pink"
              />
              <span className="font-medium text-chocolate-700">创建新配方</span>
            </label>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-chocolate-700 mb-2">
              配方名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：草莓朗姆酒冰淇淋"
              className="input-field"
              disabled={!saveAsNew && currentRecipe !== null}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-chocolate-700 mb-2">
              配方描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简单描述这个配方的特点..."
              rows={2}
              className="input-field resize-none"
              disabled={!saveAsNew && currentRecipe !== null}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-chocolate-700 mb-2">
              版本备注
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="记录这个版本的调整原因、实验目标等..."
              rows={3}
              className="input-field resize-none"
            />
          </div>
        </div>

        <div className="p-4 bg-cream-50 rounded-xl">
          <h4 className="font-bold text-chocolate-700 mb-3">当前配方参数</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-chocolate-500">凝固点</span>
              <span className="font-bold text-chocolate-700">{currentResult.freezingPoint.toFixed(1)}°C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-chocolate-500">固形物</span>
              <span className="font-bold text-chocolate-700">{currentResult.solidsRatio.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-chocolate-500">脂肪</span>
              <span className="font-bold text-chocolate-700">{currentResult.fatContent.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-chocolate-500">总糖</span>
              <span className="font-bold text-chocolate-700">{currentResult.sugarContent.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-chocolate-500">酒精</span>
              <span className="font-bold text-chocolate-700">{currentResult.alcoholContent.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-chocolate-500">风险</span>
              <span className={`font-bold ${currentResult.risks.length > 0 ? 'text-warning-orange' : 'text-mint-500'}`}>
                {currentResult.risks.length > 0 ? `${currentResult.risks.length}个` : '无'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setShowSaveModal(false)}
            className="btn-secondary"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />
            {saveAsNew ? '创建新配方' : '保存新版本'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SaveRecipeModal;
