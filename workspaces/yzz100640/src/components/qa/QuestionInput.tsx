import React, { useState } from 'react';
import { useQAStore } from '@/stores/useQAStore';
import { cn } from '@/lib/utils';

const HISTORY_SUGGESTIONS = [
  '水稻叶片发黄怎么办',
  '小麦什么时候打赤霉病药',
  '玉米播种晚了怎么补救',
  '稻纵卷叶螟防治时间',
  '稻飞虱用什么药',
  '小麦晚播增加多少播量',
  '水稻什么时候晒田',
  '玉米螟怎么治',
  '小麦蚜虫防治指标',
  '纹枯病打什么药',
];

interface QuestionInputProps {
  onAsk?: () => void;
}

export default function QuestionInput({ onAsk }: QuestionInputProps) {
  const { isLoading, query } = useQAStore();
  const [inputValue, setInputValue] = useState('');

  const handleQuery = async (question: string) => {
    if (!question.trim() || isLoading) return;
    setInputValue(question);
    try {
      await query(question.trim());
      onAsk?.();
    } finally {
      setInputValue('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleQuery(inputValue);
  };

  return (
    <div className="card p-5">
      <h3 className="font-serif font-bold text-lg text-leaf-800 mb-3">农户问题</h3>

      <form onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg pointer-events-none select-none">
              🍃
            </span>
            <input
              type="text"
              className={cn('input pl-11', isLoading && 'animate-pulse')}
              placeholder="输入农户的问题，如：水稻叶子黄了怎么办"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading || !inputValue.trim()}
          >
            查询
          </button>
        </div>
      </form>

      <div className="mt-3">
        <p className="text-xs text-leaf-500 mb-2">常见问题：</p>
        <div className="flex flex-wrap gap-2">
          {HISTORY_SUGGESTIONS.map((s) => (
            <span
              key={s}
              className={cn(
                'chip-default hover:bg-leaf-100 cursor-pointer transition',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => !isLoading && void handleQuery(s)}
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
