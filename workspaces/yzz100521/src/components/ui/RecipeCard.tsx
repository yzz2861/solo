import React from 'react';
import { Clock, FileText, Trash2, Edit3 } from 'lucide-react';
import type { Recipe } from '../../engine';
import { formatRelativeTime, getScoreEmoji, truncateText } from '../../utils/formatters';
import * as storage from '../../utils/storage';

interface RecipeCardProps {
  recipe: Recipe;
  onView: (recipeId: string) => void;
  onDelete: (recipeId: string) => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onView, onDelete }) => {
  const versions = storage.getVersions(recipe.id);
  const latestVersion = versions[0];
  
  const avgScore = React.useMemo(() => {
    if (!latestVersion) return 0;
    const feedbacks = storage.getFeedbacks(latestVersion.id);
    if (feedbacks.length === 0) return 0;
    const total = feedbacks.reduce(
      (sum, f) => sum + (f.iceCrystalScore + f.creaminessScore + f.sweetnessScore + f.flavorScore) / 4,
      0
    );
    return total / feedbacks.length;
  }, [latestVersion]);

  return (
    <div className="card group animate-fade-in-up opacity-0">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-chocolate-900 font-display mb-1">
            {recipe.name}
          </h3>
          <p className="text-sm text-chocolate-500">
            {truncateText(recipe.description, 50)}
          </p>
        </div>
        {avgScore > 0 && (
          <span className="text-2xl" role="img" aria-label="average rating">
            {getScoreEmoji(avgScore)}
          </span>
        )}
      </div>

      {latestVersion && (
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-chocolate-600">
            <FileText size={16} className="text-icecream-pink" />
            <span>版本 v{latestVersion.versionNumber}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {latestVersion.calculationResult.risks.length > 0 ? (
              <span className="badge badge-warning">
                ⚠️ {latestVersion.calculationResult.risks.length}个风险
              </span>
            ) : (
              <span className="badge badge-success">✅ 无风险</span>
            )}
            <span className="badge bg-cream-100 text-chocolate-500">
              ❄️ {latestVersion.calculationResult.freezingPoint.toFixed(1)}°C
            </span>
            <span className="badge bg-cream-100 text-chocolate-500">
              🥛 {latestVersion.calculationResult.solidsRatio.toFixed(1)}% 固形物
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-cream-100">
        <div className="flex items-center gap-1 text-xs text-chocolate-400">
          <Clock size={14} />
          <span>{formatRelativeTime(recipe.updatedAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onView(recipe.id)}
            className="btn-ghost flex items-center gap-1 text-sm"
          >
            <Edit3 size={16} />
            查看
          </button>
          <button
            type="button"
            onClick={() => onDelete(recipe.id)}
            className="btn-ghost flex items-center gap-1 text-sm text-warning-red hover:bg-warning-red/10"
          >
            <Trash2 size={16} />
            删除
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;
