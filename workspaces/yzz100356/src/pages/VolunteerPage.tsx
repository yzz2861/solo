import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BarChart3, TrendingDown, Monitor, Lock, Unlock, RefreshCcw } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { getItemById, getEasyMistakeItems } from '@/data/trashItems'
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/types'
import type { TrashCategory, TrashItem, MistakeRecord } from '@/types'
import { getVolunteerMode, setVolunteerMode } from '@/utils/storage'

const VolunteerPage: React.FC = () => {
  const navigate = useNavigate()
  const { mistakes, progress, resetGame } = useGameStore()
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [password, setPassword] = useState('')
  const [showPasswordError, setShowPasswordError] = useState(false)

  useEffect(() => {
    if (getVolunteerMode()) {
      setIsUnlocked(true)
    }
  }, [])

  const handleUnlock = () => {
    if (password === '0000') {
      setIsUnlocked(true)
      setVolunteerMode(true)
      setShowPasswordError(false)
    } else {
      setShowPasswordError(true)
    }
  }

  const handleLock = () => {
    setIsUnlocked(false)
    setPassword('')
    setVolunteerMode(false)
  }

  const mistakeItems: Array<{ record: MistakeRecord; item: TrashItem }> = mistakes
    .map(record => {
      const item = getItemById(record.itemId)
      if (!item) return null
      return { record, item }
    })
    .filter((item): item is { record: MistakeRecord; item: TrashItem } => item !== null)
    .sort((a, b) => b.record.wrongCount - a.record.wrongCount)

  const categoryStats: Record<TrashCategory, { total: number; wrong: number }> = {
    recyclable: { total: 0, wrong: 0 },
    kitchen: { total: 0, wrong: 0 },
    harmful: { total: 0, wrong: 0 },
    other: { total: 0, wrong: 0 },
  }

  mistakeItems.forEach(({ item, record }) => {
    categoryStats[item.category].total += record.wrongCount
    categoryStats[item.category].wrong += record.wrongCount
  })

  const totalMistakes = mistakeItems.reduce((sum, { record }) => sum + record.wrongCount, 0)
  const easyMistakeItems = getEasyMistakeItems()
  const topMistakes = mistakeItems.slice(0, 10)

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 animate-pop-in">
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-10 h-10 text-purple-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">志愿者入口</h1>
            <p className="text-gray-500 mt-2">请输入访问密码</p>
          </div>

          <div className="mb-6">
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setShowPasswordError(false)
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              placeholder="请输入密码"
              className={`
                w-full px-4 py-3 text-center text-2xl tracking-widest
                border-2 rounded-xl
                focus:outline-none focus:ring-2 focus:ring-purple-300
                ${showPasswordError ? 'border-red-400 bg-red-50' : 'border-gray-200'}
              `}
              maxLength={10}
              autoFocus
            />
            {showPasswordError && (
              <p className="text-red-500 text-sm text-center mt-2">密码错误，请重试</p>
            )}
            <p className="text-gray-400 text-xs text-center mt-3">
              提示：默认密码 0000
            </p>
          </div>

          <button
            onClick={handleUnlock}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-lg shadow-purple-200"
          >
            进入后台
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full mt-3 py-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← 返回首页
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 bg-white rounded-xl shadow hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              📊 志愿者后台
            </h1>
          </div>
          <button
            onClick={handleLock}
            className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Unlock className="w-4 h-4" />
            <span className="text-sm">退出</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-lg">
            <div className="text-3xl font-bold text-purple-600">{progress.itemsAnswered}</div>
            <div className="text-sm text-gray-500">总答题数</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-lg">
            <div className="text-3xl font-bold text-green-600">{progress.itemsCorrect}</div>
            <div className="text-sm text-gray-500">答对数</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-lg">
            <div className="text-3xl font-bold text-orange-600">{mistakeItems.length}</div>
            <div className="text-sm text-gray-500">错题种类</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-lg">
            <div className="text-3xl font-bold text-blue-600">
              {progress.itemsAnswered > 0 ? Math.round((progress.itemsCorrect / progress.itemsAnswered) * 100) : 0}%
            </div>
            <div className="text-sm text-gray-500">正确率</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            <h2 className="text-xl font-bold text-gray-800">各分类错误统计</h2>
          </div>

          <div className="space-y-3">
            {(Object.keys(categoryStats) as TrashCategory[]).map(cat => {
              const stat = categoryStats[cat]
              const percentage = totalMistakes > 0 ? (stat.wrong / totalMistakes) * 100 : 0
              
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {CATEGORY_LABELS[cat]}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {stat.wrong} 次 ({Math.round(percentage)}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%`, backgroundColor: CATEGORY_COLORS[cat] }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-500" />
              <h2 className="text-xl font-bold text-gray-800">Top 10 易错题</h2>
            </div>
            <button
              onClick={() => navigate('/volunteer/screen')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-medium rounded-xl hover:scale-105 transition-transform shadow-lg shadow-purple-200"
            >
              <Monitor className="w-4 h-4" />
              大屏模式
            </button>
          </div>

          {topMistakes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无错题数据
            </div>
          ) : (
            <div className="space-y-2">
              {topMistakes.map(({ item, record }, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm
                    ${index === 0 ? 'bg-red-500' : index === 1 ? 'bg-orange-500' : index === 2 ? 'bg-yellow-500' : 'bg-gray-400'}
                  `}>
                    {index + 1}
                  </div>
                  <div className="text-2xl">{item.emoji}</div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{item.name}</div>
                    <div className="text-xs text-gray-500">
                      正确分类：
                      <span
                        className="px-1.5 py-0.5 rounded text-white ml-1"
                        style={{ backgroundColor: CATEGORY_COLORS[item.category] }}
                      >
                        {CATEGORY_LABELS[item.category]}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-red-500">{record.wrongCount} 次</div>
                    <div className="text-xs text-gray-400">错误</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">📚</span>
            <h2 className="text-xl font-bold text-gray-800">全部易错题（{easyMistakeItems.length} 道）</h2>
          </div>
          <p className="text-gray-500 text-sm mb-4">
            这些是游戏中最容易搞混的题目，活动时可以重点讲解
          </p>
          <div className="flex flex-wrap gap-2">
            {easyMistakeItems.map(item => (
              <div
                key={item.id}
                className="flex items-center gap-2 px-3 py-2 bg-yellow-50 rounded-lg border border-yellow-200"
              >
                <span>{item.emoji}</span>
                <span className="text-sm text-gray-700">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">⚠️</span>
            <h2 className="text-lg font-bold text-red-700">危险操作</h2>
          </div>
          <button
            onClick={() => {
              if (confirm('确定要重置所有游戏数据吗？此操作不可恢复！')) {
                resetGame()
                alert('数据已重置')
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            重置所有数据
          </button>
        </div>
      </div>
    </div>
  )
}

export default VolunteerPage
