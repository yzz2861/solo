import React from 'react'
import { Trophy, Star, ArrowRight, RotateCcw, Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getTotalLevels } from '@/data/levels'

interface LevelCompleteModalProps {
  level: number
  score: number
  totalItems: number
  correctCount: number
  onNextLevel: () => void
  onRetry: () => void
  onHome: () => void
}

const LevelCompleteModal: React.FC<LevelCompleteModalProps> = ({
  level,
  score,
  totalItems,
  correctCount,
  onNextLevel,
  onRetry,
  onHome,
}) => {
  const navigate = useNavigate()
  const accuracy = Math.round((correctCount / totalItems) * 100)
  const isPassed = accuracy >= 60
  const hasNextLevel = level < getTotalLevels()

  const getStars = () => {
    if (accuracy >= 90) return 3
    if (accuracy >= 75) return 2
    if (accuracy >= 60) return 1
    return 0
  }

  const stars = getStars()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 animate-pop-in">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center ${isPassed ? 'bg-yellow-100' : 'bg-gray-100'}`}>
              <Trophy className={`w-12 h-12 ${isPassed ? 'text-yellow-500' : 'text-gray-400'}`} />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-1">
            {isPassed ? '恭喜通关！' : '再接再厉！'}
          </h2>
          <p className="text-gray-500 mb-4">第 {level} 关 完成</p>

          <div className="flex gap-2 mb-6">
            {[1, 2, 3].map(i => (
              <Star
                key={i}
                className={`w-10 h-10 transition-all duration-500 ${i <= stars ? 'text-yellow-400 fill-yellow-400 scale-110' : 'text-gray-300'}`}
                style={{ transitionDelay: `${i * 150}ms` }}
              />
            ))}
          </div>

          <div className="w-full grid grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 rounded-2xl p-4">
              <div className="text-3xl font-bold text-green-600">{correctCount}</div>
              <div className="text-sm text-green-600">答对</div>
            </div>
            <div className="bg-blue-50 rounded-2xl p-4">
              <div className="text-3xl font-bold text-blue-600">{accuracy}%</div>
              <div className="text-sm text-blue-600">正确率</div>
            </div>
          </div>

          <div className="w-full space-y-3">
            {isPassed && hasNextLevel && (
              <button
                onClick={onNextLevel}
                className="w-full py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg rounded-2xl hover:from-green-600 hover:to-emerald-600 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-green-200"
              >
                下一关
                <ArrowRight className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={onRetry}
              className="w-full py-3 px-6 bg-orange-500 text-white font-bold rounded-2xl hover:bg-orange-600 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              再玩一次
            </button>

            <button
              onClick={() => navigate('/')}
              className="w-full py-3 px-6 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              返回首页
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LevelCompleteModal
