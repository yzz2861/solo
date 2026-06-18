import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  X,
  Check,
  ChevronRight,
} from 'lucide-react';
import useLevelStore from '@/stores/useLevelStore';
import { generateId } from '@/utils/id';
import type { Level, Step, Choice } from '@/types';

const CATEGORIES: Level['category'][] = [
  'acid-base',
  'alcohol-lamp',
  'glassware',
  'general',
  'custom',
];

const CATEGORY_LABELS: Record<Level['category'], string> = {
  'acid-base': '酸碱实验',
  'alcohol-lamp': '酒精灯',
  glassware: '玻璃仪器',
  general: '综合安全',
  custom: '自定义',
};

function createEmptyChoice(): Choice {
  return {
    id: generateId(),
    text: '',
    isCorrect: false,
    feedback: '',
    correctAction: '',
  };
}

function createEmptyStep(order: number): Step {
  return {
    order,
    scene: '',
    choices: [createEmptyChoice(), createEmptyChoice()],
  };
}

export default function LevelEditor() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const isNew = levelId === 'new';

  const { levels, loadLevels, addLevel, updateLevel, getLevelById } =
    useLevelStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Level['category']>('custom');
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(1);
  const [steps, setSteps] = useState<Step[]>([createEmptyStep(1)]);
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadLevels();
  }, [loadLevels]);

  useEffect(() => {
    if (loaded) return;
    if (!isNew && levelId) {
      const existing = getLevelById(levelId);
      if (existing) {
        setTitle(existing.title);
        setDescription(existing.description);
        setCategory(existing.category);
        setDifficulty(existing.difficulty);
        setSteps(
          existing.steps.length > 0
            ? existing.steps.map((s) => ({ ...s, choices: s.choices.map((c) => ({ ...c })) }))
            : [createEmptyStep(1)],
        );
      }
    }
    setLoaded(true);
  }, [isNew, levelId, getLevelById, loaded, levels]);

  const selectedStep = steps[selectedStepIndex] ?? null;

  const updateStep = (index: number, patch: Partial<Step>) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  };

  const updateChoice = (
    stepIndex: number,
    choiceIndex: number,
    patch: Partial<Choice>,
  ) => {
    setSteps((prev) =>
      prev.map((s, i) => {
        if (i !== stepIndex) return s;
        const newChoices = s.choices.map((c, ci) =>
          ci === choiceIndex ? { ...c, ...patch } : c,
        );
        return { ...s, choices: newChoices };
      }),
    );
  };

  const addChoice = (stepIndex: number) => {
    setSteps((prev) =>
      prev.map((s, i) => {
        if (i !== stepIndex) return s;
        if (s.choices.length >= 4) return s;
        return { ...s, choices: [...s.choices, createEmptyChoice()] };
      }),
    );
  };

  const removeChoice = (stepIndex: number, choiceIndex: number) => {
    setSteps((prev) =>
      prev.map((s, i) => {
        if (i !== stepIndex) return s;
        if (s.choices.length <= 2) return s;
        return {
          ...s,
          choices: s.choices.filter((_, ci) => ci !== choiceIndex),
        };
      }),
    );
  };

  const addStep = () => {
    const newOrder = steps.length + 1;
    const newStep = createEmptyStep(newOrder);
    setSteps((prev) => [...prev, newStep]);
    setSelectedStepIndex(steps.length);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    const newSteps = steps
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, order: i + 1 }));
    setSteps(newSteps);
    setSelectedStepIndex(Math.min(selectedStepIndex, newSteps.length - 1));
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('请填写关卡标题');
      return;
    }
    const reindexedSteps = steps.map((s, i) => ({ ...s, order: i + 1 }));

    if (isNew) {
      addLevel({
        id: generateId(),
        title: title.trim(),
        description: description.trim(),
        category,
        difficulty,
        steps: reindexedSteps,
        isCustom: true,
        createdAt: Date.now(),
      });
    } else if (levelId) {
      updateLevel(levelId, {
        title: title.trim(),
        description: description.trim(),
        category,
        difficulty,
        steps: reindexedSteps,
      });
    }
    navigate('/teacher');
  };

  return (
    <div className="min-h-screen bg-[#0D3B2E] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => navigate('/teacher')}
            className="rounded-full bg-white/10 p-2 transition hover:bg-white/20"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display text-xl font-bold">
            {isNew ? '新建关卡' : '编辑关卡'}
          </h1>
        </div>

        <div className="card-scene mb-6 border-[#2ECC71]/30">
          <h2 className="mb-4 text-sm font-semibold text-white/60">基本信息</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-white/50">关卡标题</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入关卡标题"
                className="w-full rounded-xl bg-white/10 px-4 py-2 text-sm text-white placeholder-white/30 outline-none border border-white/10 focus:border-[#2ECC71] transition"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/50">类别</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Level['category'])}
                className="w-full rounded-xl bg-white/10 px-4 py-2 text-sm text-white outline-none border border-white/10 focus:border-[#2ECC71] transition"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#0D3B2E]">
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-white/50">关卡描述</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="输入关卡描述"
                rows={2}
                className="w-full rounded-xl bg-white/10 px-4 py-2 text-sm text-white placeholder-white/30 outline-none border border-white/10 focus:border-[#2ECC71] transition resize-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/50">难度</label>
              <div className="flex gap-3">
                {([1, 2, 3] as const).map((d) => (
                  <label
                    key={d}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm transition ${
                      difficulty === d
                        ? 'bg-[#2ECC71]/20 text-[#2ECC71] border border-[#2ECC71]/40'
                        : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <input
                      type="radio"
                      name="difficulty"
                      checked={difficulty === d}
                      onChange={() => setDifficulty(d)}
                      className="sr-only"
                    />
                    {d}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          <div className="card-scene border-[#2ECC71]/30">
            <h2 className="mb-4 text-sm font-semibold text-white/60">
              步骤列表
            </h2>
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedStepIndex(idx)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                    selectedStepIndex === idx
                      ? 'bg-[#2ECC71]/15 border border-[#2ECC71]/40 text-white'
                      : 'bg-white/5 border border-transparent text-white/60 hover:bg-white/10'
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      selectedStepIndex === idx
                        ? 'bg-[#2ECC71] text-white'
                        : 'bg-white/10 text-white/40'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {step.scene || `步骤 ${idx + 1}`}
                  </span>
                  <ChevronRight size={14} className="shrink-0 text-white/30" />
                </button>
              ))}
            </div>

            <button
              onClick={addStep}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-white/50 transition hover:bg-white/10 hover:text-white/80"
            >
              <Plus size={14} />
              添加步骤
            </button>

            {steps.length > 1 && (
              <button
                onClick={() => removeStep(selectedStepIndex)}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF6B35]/10 px-3 py-2 text-sm text-[#FF6B35] transition hover:bg-[#FF6B35]/20"
              >
                <Trash2 size={14} />
                删除步骤
              </button>
            )}
          </div>

          {selectedStep && (
            <div className="card-scene border-[#2ECC71]/30">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2ECC71] text-sm font-bold text-white">
                  {selectedStepIndex + 1}
                </span>
                <h2 className="text-sm font-semibold text-white/60">
                  步骤 {selectedStepIndex + 1} 编辑
                </h2>
              </div>

              <div className="mb-6">
                <label className="mb-1 block text-sm text-white/50">
                  场景描述
                </label>
                <textarea
                  value={selectedStep.scene}
                  onChange={(e) =>
                    updateStep(selectedStepIndex, { scene: e.target.value })
                  }
                  placeholder="描述这个步骤的场景"
                  rows={3}
                  className="w-full rounded-xl bg-white/10 px-4 py-2 text-sm text-white placeholder-white/30 outline-none border border-white/10 focus:border-[#2ECC71] transition resize-none"
                />
              </div>

              <h3 className="mb-3 text-sm font-semibold text-white/60">
                选项列表
              </h3>
              <div className="space-y-4">
                {selectedStep.choices.map((choice, ci) => (
                  <div
                    key={choice.id}
                    className="rounded-xl bg-white/5 border border-white/10 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-white/40">
                        选项 {ci + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-white/50">
                          <input
                            type="checkbox"
                            checked={choice.isCorrect}
                            onChange={(e) =>
                              updateChoice(selectedStepIndex, ci, {
                                isCorrect: e.target.checked,
                              })
                            }
                            className="accent-[#2ECC71]"
                          />
                          <Check size={12} /> 正确答案
                        </label>
                        {selectedStep.choices.length > 2 && (
                          <button
                            onClick={() => removeChoice(selectedStepIndex, ci)}
                            className="rounded p-1 text-white/30 transition hover:bg-[#FF6B35]/10 hover:text-[#FF6B35]"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <input
                      type="text"
                      value={choice.text}
                      onChange={(e) =>
                        updateChoice(selectedStepIndex, ci, {
                          text: e.target.value,
                        })
                      }
                      placeholder="选项文本"
                      className="mb-2 w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder-white/30 outline-none border border-white/10 focus:border-[#2ECC71] transition"
                    />

                    <textarea
                      value={choice.feedback}
                      onChange={(e) =>
                        updateChoice(selectedStepIndex, ci, {
                          feedback: e.target.value,
                        })
                      }
                      placeholder="反馈内容"
                      rows={2}
                      className="mb-2 w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder-white/30 outline-none border border-white/10 focus:border-[#2ECC71] transition resize-none"
                    />

                    <textarea
                      value={choice.correctAction}
                      onChange={(e) =>
                        updateChoice(selectedStepIndex, ci, {
                          correctAction: e.target.value,
                        })
                      }
                      placeholder="正确做法"
                      rows={2}
                      className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder-white/30 outline-none border border-white/10 focus:border-[#2ECC71] transition resize-none"
                    />
                  </div>
                ))}
              </div>

              {selectedStep.choices.length < 4 && (
                <button
                  onClick={() => addChoice(selectedStepIndex)}
                  className="mt-4 flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm text-white/50 transition hover:bg-white/10 hover:text-white/80"
                >
                  <Plus size={14} />
                  添加选项
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={() => navigate('/teacher')}
            className="btn-ghost text-sm"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Save size={16} />
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
