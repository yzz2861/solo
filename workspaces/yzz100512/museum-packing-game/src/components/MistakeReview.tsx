import React, { useState } from 'react';
import type { StudentProgress, MaterialType, MistakeRecord, Level } from '../types';
import { getMaterialLabel, getSeverityColor, getSeverityLabel } from '../logic/packingEvaluation';

interface Props {
  progress: StudentProgress;
  levels: Level[];
  onBack: () => void;
  onPracticeLevel: (level: Level) => void;
}

const materialOrder: MaterialType[] = ['pottery', 'wood', 'metal'];

const materialStyles: Record<MaterialType, { bg: string; border: string; text: string; icon: string }> = {
  pottery: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: '🏺' },
  wood: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: '🪵' },
  metal: { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-800', icon: '⚙️' },
};

export const MistakeReview: React.FC<Props> = ({ progress, levels, onBack, onPracticeLevel }) => {
  const [activeMaterial, setActiveMaterial] = useState<MaterialType | 'all'>('all');

  const allMistakes = [
    ...progress.mistakesByMaterial.pottery,
    ...progress.mistakesByMaterial.wood,
    ...progress.mistakesByMaterial.metal,
  ];

  const displayMistakes = activeMaterial === 'all'
    ? allMistakes
    : progress.mistakesByMaterial[activeMaterial];

  const getLevelForMistake = (mistake: MistakeRecord): Level | undefined => {
    return levels.find(l => l.id === mistake.levelId);
  };

  const getCommonMistakes = (material: MaterialType) => {
    const mistakes = progress.mistakesByMaterial[material];
    const categoryCount: Record<string, number> = {};
    const riskDescriptions: Record<string, string[]> = {};

    mistakes.forEach(m => {
      m.mistakes.forEach(risk => {
        if (!categoryCount[risk.category]) {
          categoryCount[risk.category] = 0;
          riskDescriptions[risk.category] = [];
        }
        categoryCount[risk.category]++;
        if (!riskDescriptions[risk.category].includes(risk.title)) {
          riskDescriptions[risk.category].push(risk.title);
        }
      });
    });

    return Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({
        category,
        count,
        examples: riskDescriptions[category].slice(0, 3),
      }));
  };

  return (
    <div className="min-h-screen bg-bg-cream py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <button onClick={onBack} className="text-primary hover:text-primary-dark mb-6 flex items-center gap-2">
          <span>←</span>
          <span>返回首页</span>
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-dark mb-2">错题回顾</h1>
          <p className="text-text-muted">
            共 {allMistakes.length} 道错题，按材质分类复习
          </p>
        </div>

        <div className="flex gap-3 mb-8 flex-wrap">
          <button
            onClick={() => setActiveMaterial('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeMaterial === 'all'
                ? 'bg-primary text-white'
                : 'bg-white text-text-muted hover:bg-gray-50'
            }`}
          >
            全部 ({allMistakes.length})
          </button>
          {materialOrder.map(mat => (
            <button
              key={mat}
              onClick={() => setActiveMaterial(mat)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeMaterial === mat
                  ? 'bg-primary text-white'
                  : 'bg-white text-text-muted hover:bg-gray-50'
              }`}
            >
              {materialStyles[mat].icon} {getMaterialLabel(mat)} ({progress.mistakesByMaterial[mat].length})
            </button>
          ))}
        </div>

        {activeMaterial !== 'all' && (
          <div className={`${materialStyles[activeMaterial].bg} ${materialStyles[activeMaterial].border} border rounded-xl p-6 mb-8`}>
            <h3 className={`text-lg font-semibold ${materialStyles[activeMaterial].text} mb-4`}>
              {materialStyles[activeMaterial].icon} {getMaterialLabel(activeMaterial)} 常见错误
            </h3>
            <div className="space-y-3">
              {getCommonMistakes(activeMaterial).map(({ category, count, examples }) => (
                <div key={category} className="bg-white/60 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-text-dark">{category}</span>
                    <span className="text-sm text-text-muted">出现 {count} 次</span>
                  </div>
                  <ul className="text-sm text-text-muted space-y-1">
                    {examples.map((ex, i) => (
                      <li key={i}>• {ex}</li>
                    ))}
                  </ul>
                </div>
              ))}
              {getCommonMistakes(activeMaterial).length === 0 && (
                <p className="text-text-muted">暂无错题记录</p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {displayMistakes.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-xl font-semibold text-text-dark mb-2">
                {activeMaterial === 'all' ? '暂无错题' : `暂无${getMaterialLabel(activeMaterial as MaterialType)}错题`}
              </h3>
              <p className="text-text-muted">
                {activeMaterial === 'all'
                  ? '太棒了！你还没有做错的题目，继续保持！'
                  : '这类文物的打包你掌握得很好，继续加油！'}
              </p>
            </div>
          ) : (
            displayMistakes.map(mistake => {
              const level = getLevelForMistake(mistake);
              const style = materialStyles[mistake.material];
              return (
                <div
                  key={mistake.id}
                  className="bg-white rounded-xl shadow-md overflow-hidden"
                >
                  <div className={`${style.bg} px-5 py-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{style.icon}</span>
                      <div>
                        <h4 className="font-semibold text-text-dark">{mistake.artifactName}</h4>
                        <p className="text-sm text-text-muted">{getMaterialLabel(mistake.material)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-text-muted">
                        重试 {mistake.retryCount} 次
                      </div>
                      <div className="text-xs text-text-muted">
                        {new Date(mistake.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <h5 className="font-medium text-text-dark mb-3">错误点：</h5>
                    <div className="space-y-2 mb-4">
                      {mistake.mistakes.slice(0, 3).map(risk => (
                        <div
                          key={risk.id}
                          className={`p-3 rounded-lg border ${getSeverityColor(risk.severity)}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/50">
                              {getSeverityLabel(risk.severity)}
                            </span>
                            <span className="font-medium">{risk.title}</span>
                          </div>
                          <p className="text-sm mt-1 opacity-80">{risk.description}</p>
                        </div>
                      ))}
                    </div>

                    {level && (
                      <button
                        onClick={() => onPracticeLevel(level)}
                        className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
                      >
                        重新练习这道题
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
