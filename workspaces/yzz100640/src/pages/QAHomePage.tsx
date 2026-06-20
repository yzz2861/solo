import React, { useEffect, useState } from 'react';
import { History, Plus } from 'lucide-react';
import FilterPanel from '@/components/qa/FilterPanel';
import QuestionInput from '@/components/qa/QuestionInput';
import AnswerCard from '@/components/qa/AnswerCard';
import { useQAStore } from '@/stores/useQAStore';

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hour}:${minute}`;
}

export default function QAHomePage() {
  const [, setShowHistory] = useState<boolean>(false);
  const { history, loadHistory, currentRecord } = useQAStore();

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleSelectHistory = (index: number) => {
    const record = history[index];
    if (record) {
      useQAStore.setState({ currentRecord: record });
    }
  };

  const recentHistory = history.slice(0, 8);

  return (
    <div className="animate-fade-in-up">
      <div className="mb-5">
        <h1 className="font-serif text-2xl font-bold text-leaf-800">问答主页</h1>
        <p className="text-sm text-leaf-500 mt-1">
          输入农户的问题，选择适用条件，获取精准回答与来源依据
        </p>
      </div>

      <div className="flex gap-5">
        <div className="w-64 flex-shrink-0 hidden md:block">
          <FilterPanel />
        </div>

        <div className="flex-1 space-y-5 min-w-0">
          <QuestionInput />
          <AnswerCard />
        </div>

        <div className="w-72 flex-shrink-0 hidden lg:block">
          <div className="card p-4 sticky top-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-leaf-800 flex items-center gap-2">
                <History className="w-4 h-4" />
                问答历史
              </h4>
              <button
                type="button"
                className="text-leaf-500 hover:text-leaf-700 text-xs transition"
                onClick={() => setShowHistory(true)}
              >
                查看全部
              </button>
            </div>

            <div className="space-y-2">
              {recentHistory.length === 0 ? (
                <p className="text-center text-sm text-leaf-400 py-6">暂无问答记录</p>
              ) : (
                recentHistory.map((item, index) => (
                  <div
                    key={item.id}
                    className={
                      'p-3 rounded-lg hover:bg-leaf-50 cursor-pointer transition ' +
                      'border border-transparent hover:border-leaf-100 ' +
                      (currentRecord?.id === item.id ? 'bg-leaf-50 border-leaf-100' : '')
                    }
                    onClick={() => handleSelectHistory(index)}
                  >
                    <p className="text-sm font-medium text-leaf-900 truncate">
                      {item.question}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-leaf-500">
                        {formatDate(item.createdAt)}
                      </span>
                      {item.adopted === true ? (
                        <span className="text-xs text-leaf-600">✅已采纳</span>
                      ) : item.adopted === false ? (
                        <span className="text-xs text-red-500">❌未采纳</span>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
