import React, { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { useRecipeStore } from '../../store/useRecipeStore';
import { useUIStore } from '../../store/useUIStore';
import Modal from '../ui/Modal';
import StarRating from '../ui/StarRating';

const FeedbackModal: React.FC = () => {
  const { showFeedbackModal, setShowFeedbackModal, currentVersionForFeedback } = useUIStore();
  const { addFeedback, versions, currentVersion } = useRecipeStore();

  const [iceCrystalScore, setIceCrystalScore] = useState(0);
  const [creaminessScore, setCreaminessScore] = useState(0);
  const [sweetnessScore, setSweetnessScore] = useState(0);
  const [flavorScore, setFlavorScore] = useState(0);
  const [notes, setNotes] = useState('');

  const activeVersion = currentVersion || versions.find(v => v.id === currentVersionForFeedback);

  const handleSubmit = () => {
    if (!currentVersionForFeedback) return;
    
    addFeedback({
      recipeVersionId: currentVersionForFeedback,
      iceCrystalScore,
      creaminessScore,
      sweetnessScore,
      flavorScore,
      notes: notes.trim(),
    });

    setIceCrystalScore(0);
    setCreaminessScore(0);
    setSweetnessScore(0);
    setFlavorScore(0);
    setNotes('');
    setShowFeedbackModal(false);
  };

  const avgScore = iceCrystalScore > 0 && creaminessScore > 0 && sweetnessScore > 0 && flavorScore > 0
    ? (iceCrystalScore + creaminessScore + sweetnessScore + flavorScore) / 4
    : 0;

  return (
    <Modal
      isOpen={showFeedbackModal}
      onClose={() => setShowFeedbackModal(false)}
      title="试吃反馈"
      size="lg"
    >
      <div className="space-y-6">
        {activeVersion && (
          <div className="p-4 bg-cream-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-chocolate-700">{activeVersion.recipeId ? '配方' : '版本'} v{activeVersion.versionNumber}</h4>
              {avgScore > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl" role="img" aria-label="average">
                    {avgScore >= 4.5 ? '😍' : avgScore >= 3.5 ? '😊' : avgScore >= 2.5 ? '😐' : avgScore >= 1.5 ? '😕' : '😫'}
                  </span>
                  <span className="text-xl font-bold text-chocolate-700">{avgScore.toFixed(1)}</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="badge bg-cream-100 text-chocolate-500">
                ❄️ {activeVersion.calculationResult.freezingPoint.toFixed(1)}°C
              </span>
              <span className="badge bg-cream-100 text-chocolate-500">
                🥛 {activeVersion.calculationResult.solidsRatio.toFixed(1)}% 固形物
              </span>
              <span className="badge bg-cream-100 text-chocolate-500">
                🥚 {activeVersion.calculationResult.fatContent.toFixed(1)}% 脂肪
              </span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <StarRating
            label="冰渣感（越少越好）"
            value={iceCrystalScore}
            onChange={setIceCrystalScore}
          />
          <StarRating
            label="绵密度（越高越好）"
            value={creaminessScore}
            onChange={setCreaminessScore}
          />
          <StarRating
            label="甜度（适中为好）"
            value={sweetnessScore}
            onChange={setSweetnessScore}
          />
          <StarRating
            label="风味（越好越好）"
            value={flavorScore}
            onChange={setFlavorScore}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-chocolate-700 mb-2">
            口感备注
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="记录具体的口感特点、需要改进的地方、下次调整的方向..."
            rows={4}
            className="input-field resize-none"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setShowFeedbackModal(false)}
            className="btn-secondary"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={iceCrystalScore === 0 || creaminessScore === 0 || sweetnessScore === 0 || flavorScore === 0}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <MessageSquarePlus size={18} />
            保存反馈
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default FeedbackModal;
