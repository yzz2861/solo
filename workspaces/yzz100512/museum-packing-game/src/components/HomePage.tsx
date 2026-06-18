import React from 'react';
import type { StudentProgress } from '../types';
import { getAccuracyRate, getTotalMistakes } from '../utils/progressStorage';

interface Props {
  progress: StudentProgress;
  totalLevels: number;
  onStartPractice: () => void;
  onReviewMistakes: () => void;
  onConfirmMode: () => void;
  onExamMode: () => void;
  onTeacherMode: () => void;
}

export const HomePage: React.FC<Props> = ({
  progress,
  totalLevels,
  onStartPractice,
  onReviewMistakes,
  onConfirmMode,
  onExamMode,
  onTeacherMode,
}) => {
  const completedLevels = Object.values(progress.levelProgress).filter(p => p.completed).length;
  const accuracy = getAccuracyRate(progress);
  const totalMistakes = getTotalMistakes(progress);

  return (
    <div className="min-h-screen bg-gradient-to-b from-bg-wood to-bg-cream">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">🏺</div>
          <h1 className="text-4xl font-bold text-text-dark mb-3">
            博物馆文物打包练习
          </h1>
          <p className="text-text-muted text-lg">
            库房新人培训系统 — 安全练习，避免文物损坏
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-white rounded-xl p-5 shadow-md text-center">
            <div className="text-3xl font-bold text-primary">{completedLevels}</div>
            <div className="text-sm text-text-muted">已完成关卡</div>
            <div className="text-xs text-text-muted mt-1">/ {totalLevels} 关</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-md text-center">
            <div className="text-3xl font-bold text-secondary">{progress.totalAttempts}</div>
            <div className="text-sm text-text-muted">练习次数</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-md text-center">
            <div className="text-3xl font-bold text-accent">{accuracy}%</div>
            <div className="text-sm text-text-muted">正确率</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-md text-center">
            <div className="text-3xl font-bold text-warning">{totalMistakes}</div>
            <div className="text-sm text-text-muted">待复习错题</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={onStartPractice}
            className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                📦
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-dark mb-1">常规练习</h3>
                <p className="text-sm text-text-muted">
                  按关卡顺序练习，学习不同材质文物的打包方法
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={onReviewMistakes}
            className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-warning/10 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                📖
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-dark mb-1">错题回顾</h3>
                <p className="text-sm text-text-muted">
                  按材质分类复习错误，集中讲解易错点
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={onConfirmMode}
            className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-secondary/10 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                ✅
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-dark mb-1">正式打包确认</h3>
                <p className="text-sm text-text-muted">
                  上岗前模拟测试，检验学习成果
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={onExamMode}
            className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-info/10 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                🚚
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-dark mb-1">外借运输冲刺</h3>
                <p className="text-sm text-text-muted">
                  文物外借前的强化练习，重点演练长途运输
                </p>
              </div>
            </div>
          </button>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md mb-8">
          <h3 className="font-semibold text-text-dark mb-4">三种材质要点速记</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-amber-800 mb-2">🏺 陶器</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• 最怕磕碰震动</li>
                <li>• 用软质内衬包裹</li>
                <li>• 支撑点选底足和腹部</li>
                <li>• 彩陶注意保护彩绘层</li>
              </ul>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">🪵 木器</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• 湿度控制最重要</li>
                <li>• 不能太干也不能太湿</li>
                <li>• 用透气材料包裹</li>
                <li>• 避免使用强力干燥剂</li>
              </ul>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-300">
              <h4 className="font-semibold text-gray-800 mb-2">⚙️ 金属器</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 严防潮湿生锈</li>
                <li>• 必须用干燥剂</li>
                <li>• 不能用棉/湿布类材料</li>
                <li>• 鎏金层注意防刮</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={onTeacherMode}
            className="text-text-muted hover:text-primary text-sm underline"
          >
            教师入口 / 关卡管理
          </button>
        </div>
      </div>
    </div>
  );
};
