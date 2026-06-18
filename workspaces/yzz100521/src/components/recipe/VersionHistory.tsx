import React from 'react';
import { History, MessageSquarePlus, CheckCircle2 } from 'lucide-react';
import { useRecipeStore } from '../../store/useRecipeStore';
import { useUIStore } from '../../store/useUIStore';
import { formatDate, formatRelativeTime, getScoreEmoji } from '../../utils/formatters';
import * as storage from '../../utils/storage';

const VersionHistory: React.FC = () => {
  const { versions, currentVersion, loadVersion, feedbacks } = useRecipeStore();
  const { setShowFeedbackModal } = useUIStore();

  if (versions.length === 0) return null;

  const getAverageScore = (versionId: string) => {
    const feedbacksForVersion = storage.getFeedbacks(versionId);
    if (feedbacksForVersion.length === 0) return null;
    const total = feedbacksForVersion.reduce(
      (sum, f) => sum + (f.iceCrystalScore + f.creaminessScore + f.sweetnessScore + f.flavorScore) / 4,
      0
    );
    return total / feedbacksForVersion.length;
  };

  return (
    <div className="card animate-fade-in-up opacity-0 animate-stagger-2">
      <div className="flex items-center gap-3 mb-6">
        <History size={20} className="text-icecream-pink" />
        <h3 className="font-bold text-chocolate-700">版本历史</h3>
        <span className="badge bg-cream-100 text-chocolate-500 text-xs">
          {versions.length} 个版本
        </span>
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin pr-2">
        {versions.map((version, index) => {
          const isActive = currentVersion?.id === version.id;
          const avgScore = getAverageScore(version.id);
          const hasFeedback = storage.getFeedbacks(version.id).length > 0;

          return (
            <div
              key={version.id}
              onClick={() => loadVersion(version.id)}
              className={`p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                isActive
                  ? 'bg-icecream-pinkLight border-2 border-icecream-pink shadow-md'
                  : 'bg-cream-50 border-2 border-transparent hover:bg-cream-100 hover:border-cream-200'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                    isActive
                      ? 'bg-icecream-pink text-white'
                      : 'bg-cream-200 text-chocolate-500'
                  }`}>
                    {version.versionNumber}
                  </span>
                  <div>
                    <h4 className="font-bold text-chocolate-700">
                      v{version.versionNumber}
                    </h4>
                    <p className="text-xs text-chocolate-500">
                      {formatRelativeTime(version.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {avgScore !== null && (
                    <span className="text-xl" role="img" aria-label="rating">
                      {getScoreEmoji(avgScore)}
                    </span>
                  )}
                  {isActive && (
                    <CheckCircle2 size={20} className="text-icecream-pink" />
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-2">
                <span className="text-xs bg-white/50 text-chocolate-600 px-2 py-1 rounded-full">
                  ❄️ {version.calculationResult.freezingPoint.toFixed(1)}°C
                </span>
                <span className="text-xs bg-white/50 text-chocolate-600 px-2 py-1 rounded-full">
                  🥛 {version.calculationResult.solidsRatio.toFixed(0)}%
                </span>
                <span className="text-xs bg-white/50 text-chocolate-600 px-2 py-1 rounded-full">
                  🥚 {version.calculationResult.fatContent.toFixed(0)}%
                </span>
                {version.calculationResult.risks.length > 0 && (
                  <span className="text-xs bg-warning-orange/20 text-warning-orange px-2 py-1 rounded-full">
                    ⚠️ {version.calculationResult.risks.length}
                  </span>
                )}
              </div>

              {version.notes && (
                <p className="text-sm text-chocolate-600 bg-white/50 p-2 rounded-lg">
                  {version.notes}
                </p>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-cream-200/50">
                <span className="text-xs text-chocolate-400">
                  {formatDate(version.createdAt)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    loadVersion(version.id);
                    setShowFeedbackModal(true, version.id);
                  }}
                  className="text-xs font-medium text-icecream-pinkDark hover:text-icecream-pink flex items-center gap-1"
                >
                  <MessageSquarePlus size={14} />
                  {hasFeedback ? '追加反馈' : '添加反馈'}
                </button>
              </div>

              {hasFeedback && (
                <div className="mt-3 pt-3 border-t border-cream-200/50">
                  <p className="text-xs text-chocolate-500 mb-2">
                    试吃反馈 ({storage.getFeedbacks(version.id).length}条)
                  </p>
                  <div className="space-y-2">
                    {storage.getFeedbacks(version.id).slice(0, 2).map(feedback => (
                      <div key={feedback.id} className="text-xs bg-white/50 p-2 rounded-lg">
                        <div className="flex items-center gap-1 mb-1">
                          <span>{getScoreEmoji((feedback.iceCrystalScore + feedback.creaminessScore + feedback.sweetnessScore + feedback.flavorScore) / 4)}</span>
                          <span className="text-chocolate-500">{formatRelativeTime(feedback.createdAt)}</span>
                        </div>
                        {feedback.notes && (
                          <p className="text-chocolate-600">{feedback.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VersionHistory;
