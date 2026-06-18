import React, { useState } from 'react';
import type { Level, PackingChoice, PackingResult } from '../types';
import { linerMaterials, fixingMaterials, desiccantTypes, boxTypes } from '../data/materials';
import { evaluatePacking, getSeverityColor, getSeverityLabel, getMaterialLabel, getDistanceLabel } from '../logic/packingEvaluation';

interface Props {
  level: Level;
  onBack: () => void;
  onComplete: (result: PackingResult, choice: PackingChoice) => void;
  mode?: 'practice' | 'exam' | 'confirm';
}

export const PackingPractice: React.FC<Props> = ({ level, onBack, onComplete, mode = 'practice' }) => {
  const [choice, setChoice] = useState<PackingChoice>({
    liner: null,
    fixing: null,
    desiccant: null,
    box: null,
    supportPoints: [],
  });
  const [result, setResult] = useState<PackingResult | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);

  const steps = [
    { key: 'liner', label: '内衬材料' },
    { key: 'fixing', label: '固定方式' },
    { key: 'desiccant', label: '干燥剂' },
    { key: 'box', label: '箱体选择' },
    { key: 'support', label: '支撑点' },
  ];

  const handleSubmit = () => {
    const evalResult = evaluatePacking(level, choice);
    setResult(evalResult);
    onComplete(evalResult, choice);
  };

  const handleRetry = () => {
    setChoice({
      liner: null,
      fixing: null,
      desiccant: null,
      box: null,
      supportPoints: [],
    });
    setResult(null);
    setCurrentStep(0);
  };

  const toggleSupportPoint = (pointName: string) => {
    setChoice(prev => ({
      ...prev,
      supportPoints: prev.supportPoints.includes(pointName)
        ? prev.supportPoints.filter(p => p !== pointName)
        : [...prev.supportPoints, pointName],
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return choice.liner !== null;
      case 1: return choice.fixing !== null;
      case 2: return choice.desiccant !== null;
      case 3: return choice.box !== null;
      case 4: return choice.supportPoints.length > 0;
      default: return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(linerMaterials).map(([key, mat]) => (
              <div
                key={key}
                onClick={() => setChoice(prev => ({ ...prev, liner: key as any }))}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  choice.liner === key
                    ? 'border-primary bg-primary/5'
                    : 'border-border-light hover:border-primary/50'
                }`}
              >
                <h4 className="font-semibold text-text-dark mb-1">{mat.name}</h4>
                <p className="text-sm text-text-muted mb-2">{mat.description}</p>
                <div className="flex flex-wrap gap-1">
                  {mat.properties.map((p, i) => (
                    <span key={i} className="text-xs bg-bg-wood text-primary px-2 py-0.5 rounded">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );

      case 1:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(fixingMaterials).map(([key, mat]) => (
              <div
                key={key}
                onClick={() => setChoice(prev => ({ ...prev, fixing: key as any }))}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  choice.fixing === key
                    ? 'border-primary bg-primary/5'
                    : 'border-border-light hover:border-primary/50'
                }`}
              >
                <h4 className="font-semibold text-text-dark mb-1">{mat.name}</h4>
                <p className="text-sm text-text-muted mb-2">{mat.description}</p>
                <div className="flex flex-wrap gap-1">
                  {mat.properties.map((p, i) => (
                    <span key={i} className="text-xs bg-bg-wood text-primary px-2 py-0.5 rounded">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );

      case 2:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(desiccantTypes).map(([key, mat]) => (
              <div
                key={key}
                onClick={() => setChoice(prev => ({ ...prev, desiccant: key as any }))}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  choice.desiccant === key
                    ? 'border-primary bg-primary/5'
                    : 'border-border-light hover:border-primary/50'
                }`}
              >
                <h4 className="font-semibold text-text-dark mb-1">{mat.name}</h4>
                <p className="text-sm text-text-muted mb-2">{mat.description}</p>
                <div className="flex flex-wrap gap-1">
                  {mat.properties.map((p, i) => (
                    <span key={i} className="text-xs bg-bg-wood text-primary px-2 py-0.5 rounded">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );

      case 3:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(boxTypes).map(([key, mat]) => (
              <div
                key={key}
                onClick={() => setChoice(prev => ({ ...prev, box: key as any }))}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  choice.box === key
                    ? 'border-primary bg-primary/5'
                    : 'border-border-light hover:border-primary/50'
                }`}
              >
                <h4 className="font-semibold text-text-dark mb-1">{mat.name}</h4>
                <p className="text-sm text-text-muted mb-2">{mat.description}</p>
                <div className="flex flex-wrap gap-1">
                  {mat.properties.map((p, i) => (
                    <span key={i} className="text-xs bg-bg-wood text-primary px-2 py-0.5 rounded">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );

      case 4:
        return (
          <div>
            <p className="text-text-muted mb-4">请选择文物的支撑点（点击选择/取消，建议选2-4个）</p>
            <div className="flex flex-wrap gap-3">
              {level.artifact.vulnerablePoints.map((vp) => (
                <div
                  key={vp.id}
                  onClick={() => toggleSupportPoint(vp.name)}
                  className={`px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
                    choice.supportPoints.includes(vp.name)
                      ? 'border-secondary bg-secondary/10 text-secondary'
                      : 'border-border-light hover:border-secondary/50'
                  }`}
                >
                  <div className="font-medium">{vp.name}</div>
                  <div className="text-xs text-text-muted mt-1">{vp.description}</div>
                </div>
              ))}
            </div>
            <p className="text-sm text-text-muted mt-4">
              已选择 {choice.supportPoints.length} 个支撑点
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-bg-cream py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <button onClick={onBack} className="text-primary hover:text-primary-dark mb-6 flex items-center gap-2">
            <span>←</span>
            <span>返回关卡选择</span>
          </button>

          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="text-center mb-6">
              <div className={`text-6xl mb-4 ${result.isCorrect ? 'text-green-500' : 'text-orange-500'}`}>
                {result.isCorrect ? '🎉' : '⚠️'}
              </div>
              <h2 className="text-2xl font-bold text-text-dark mb-2">
                {result.isCorrect ? '打包成功！' : '需要改进'}
              </h2>
              <div className="text-4xl font-bold mb-2" style={{ color: result.score >= 80 ? '#10B981' : result.score >= 60 ? '#F59E0B' : '#DC2626' }}>
                {result.score} 分
              </div>
              <p className="text-text-muted">{result.feedback}</p>
            </div>
          </div>

          {result.risks.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-text-dark mb-4">风险分析</h3>
              <div className="space-y-3">
                {result.risks.map((risk) => (
                  <div
                    key={risk.id}
                    className={`p-4 rounded-lg border ${getSeverityColor(risk.severity)}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{risk.category}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/50">
                        {getSeverityLabel(risk.severity)}
                      </span>
                    </div>
                    <h4 className="font-semibold">{risk.title}</h4>
                    <p className="text-sm mt-1 opacity-80">{risk.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-text-dark mb-4">正确方案</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="p-3 bg-bg-wood rounded-lg">
                <div className="text-text-muted text-xs mb-1">内衬材料</div>
                <div className="font-medium">{linerMaterials[result.correctSolution.liner]?.name}</div>
              </div>
              <div className="p-3 bg-bg-wood rounded-lg">
                <div className="text-text-muted text-xs mb-1">固定方式</div>
                <div className="font-medium">{fixingMaterials[result.correctSolution.fixing]?.name}</div>
              </div>
              <div className="p-3 bg-bg-wood rounded-lg">
                <div className="text-text-muted text-xs mb-1">干燥剂</div>
                <div className="font-medium">{desiccantTypes[result.correctSolution.desiccant]?.name}</div>
              </div>
              <div className="p-3 bg-bg-wood rounded-lg">
                <div className="text-text-muted text-xs mb-1">箱体</div>
                <div className="font-medium">{boxTypes[result.correctSolution.box]?.name}</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-text-muted text-sm mb-2">支撑点：</div>
              <div className="flex flex-wrap gap-2">
                {result.correctSolution.supportPoints.map((p, i) => (
                  <span key={i} className="px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {level.tips && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
              <h4 className="font-semibold text-blue-800 mb-2">💡 学习提示</h4>
              <p className="text-blue-700 text-sm">{level.tips}</p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleRetry}
              className="flex-1 py-3 bg-white border-2 border-primary text-primary rounded-lg font-semibold hover:bg-primary/5 transition-colors"
            >
              再试一次
            </button>
            <button
              onClick={onBack}
              className="flex-1 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
            >
              返回关卡列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-cream py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <button onClick={onBack} className="text-primary hover:text-primary-dark mb-6 flex items-center gap-2">
          <span>←</span>
          <span>返回</span>
        </button>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-text-dark">{level.name}</h2>
              <div className="flex gap-3 mt-2 text-sm">
                <span className="px-2 py-0.5 bg-bg-wood text-primary rounded">
                  {getMaterialLabel(level.artifact.material)}
                </span>
                <span className="px-2 py-0.5 bg-bg-wood text-primary rounded">
                  {getDistanceLabel(level.transportDistance)}
                </span>
                <span className="px-2 py-0.5 bg-bg-wood text-primary rounded">
                  尺寸: {level.artifact.size === 'small' ? '小' : level.artifact.size === 'medium' ? '中' : '大'}
                </span>
              </div>
            </div>
            {mode !== 'exam' && (
              <span className="text-xs text-text-muted">
                第 {currentStep + 1}/{steps.length} 步
              </span>
            )}
          </div>

          <div className="bg-bg-cream rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-text-dark mb-2">{level.artifact.name}</h3>
            <p className="text-sm text-text-muted mb-3">{level.artifact.description}</p>
            <div className="text-sm">
              <span className="text-text-muted">脆弱点：</span>
              <span className="text-text-dark">
                {level.artifact.vulnerablePoints.map(v => v.name).join('、')}
              </span>
            </div>
          </div>

          <p className="text-text-dark mb-4">{level.description}</p>

          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {steps.map((step, index) => (
              <div
                key={step.key}
                className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  currentStep === index
                    ? 'bg-primary text-white'
                    : index < currentStep
                    ? 'bg-secondary/20 text-secondary'
                    : 'bg-gray-100 text-gray-400'
                }`}
                onClick={() => {
                  if (mode !== 'exam') {
                    setCurrentStep(index);
                  }
                }}
              >
                {index < currentStep && '✓ '}
                {step.label}
              </div>
            ))}
          </div>

          <div className="min-h-[300px]">
            <h3 className="font-semibold text-lg text-text-dark mb-4">
              {steps[currentStep].label}
            </h3>
            {renderStepContent()}
          </div>

          <div className="flex gap-4 mt-6 pt-4 border-t border-border-light">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-6 py-2.5 border-2 border-border-light text-text-dark rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                上一步
              </button>
            )}
            <div className="flex-1" />
            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!canProceed()}
                className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
                  canProceed()
                    ? 'bg-primary text-white hover:bg-primary-dark'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                下一步
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed()}
                className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
                  canProceed()
                    ? 'bg-secondary text-white hover:bg-secondary/90'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                提交方案
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
