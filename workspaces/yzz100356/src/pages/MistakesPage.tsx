import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Filter, Trash2, RotateCcw, BookOpen } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { getItemById } from '@/data/trashItems'
import type { TrashCategory, TrashItem, MistakeRecord } from '@/types'
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/types'

const MistakesPage: React.FC = () => {
  const navigate = useNavigate()
  const { mistakes, removeMistakeItem } = useGameStore()
  const [filter, setFilter] = useState<TrashCategory | 'all'>('all')

  const mistakeItems: Array<{ record: MistakeRecord; item: TrashItem }> = mistakes
    .map(record => {
      const item = getItemById(record.itemId)
      if (!item) return null
      return { record, item }
    })
    .filter((item): item is { record: MistakeRecord; item: TrashItem } => item !== null)
    .sort((a, b) => b.record.wrongCount - a.record.wrongCount)

  const filteredItems = filter === 'all'
    ? mistakeItems
    : mistakeItems.filter(({ item }) => item.category === filter)

  const categories: (TrashCategory | 'all')[] = ['all', 'recyclable', 'kitchen', 'harmful', 'other']

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 bg-white rounded-xl shadow hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            📒 错题本
          </h1>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-2xl p-4 mb-6 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-orange-500" />
            <span className="font-semibold text-gray-700">
              共有 {mistakeItems.length} 道错题
            </span>
          </div>

          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium transition-all
                  ${filter === cat
                    ? 'text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
                style={filter === cat ? { backgroundColor: cat === 'all' ? '#f97316' : CATEGORY_COLORS[cat as TrashCategory] } : {}}
              >
                {cat === 'all' ? '全部' : CATEGORY_LABELS[cat as TrashCategory]}
              </button>
            ))}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="bg-white/80 backdrop-blur rounded-2xl p-10 text-center shadow-lg">
            <div className="text-5xl mb-4">🎉</div>
            <p className="text-gray-600 text-lg">太棒了！没有错题</p>
            <p className="text-gray-400 mt-2">继续保持哦～</p>
            <button
              onClick={() => navigate('/game')}
              className="mt-6 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:scale-105 transition-transform"
            >
              去挑战一下
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map(({ record, item }) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-shadow animate-slide-up"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{item.emoji}</div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-gray-800 text-lg">{item.name}</h3>
                      {item.isEasyToMistake && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                          易错题
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-500">正确答案：</span>
                        <span
                          className="px-2 py-0.5 rounded-full text-white text-xs font-bold"
                          style={{ backgroundColor: CATEGORY_COLORS[item.category] }}
                        >
                          {CATEGORY_LABELS[item.category]}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-500">错过</span>
                        <span className="text-sm font-bold text-red-500">{record.wrongCount} 次</span>
                      </div>
                    </div>

                    {item.mistakeExplanation && (
                      <p className="text-sm text-gray-600 bg-amber-50 p-2 rounded-lg">
                        💡 {item.mistakeExplanation}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (confirm('确定要从错题本移除吗？')) {
                        removeMistakeItem(item.id)
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredItems.length > 0 && (
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => navigate('/game')}
              className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:scale-105 transition-transform flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              继续练习
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default MistakesPage
