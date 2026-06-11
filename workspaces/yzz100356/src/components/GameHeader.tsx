import React from 'react'
import { Trophy, Zap, Target, ArrowLeft, Pause } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface GameHeaderProps {
  level: number
  score: number
  streak: number
  totalItems: number
  currentIndex: number
  onPause?: () => void
}

const GameHeader: React.FC<GameHeaderProps> = ({
  level,
  score,
  streak,
  totalItems,
  currentIndex,
  onPause,
}) => {
  const navigate = useNavigate()

  const progress = ((currentIndex + 1) / totalItems) * 100

  return (
    <div className="w-full max-w-3xl mx-auto mb-6">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 px-3 py-2 bg-white/80 backdrop-blur rounded-xl shadow text-gray-600 hover:bg-white hover:text-gray-800 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">返回</span>
        </button>

        <div className="flex items-center gap-2 bg-white/80 backdrop-blur rounded-xl px-4 py-2 shadow">
          <Target className="w-5 h-5 text-blue-500" />
          <span className="font-bold text-gray-700">第 {level} 关</span>
        </div>

        <button
          onClick={onPause}
          className="flex items-center gap-1 px-3 py-2 bg-white/80 backdrop-blur rounded-xl shadow text-gray-600 hover:bg-white hover:text-gray-800 transition-all"
        >
          <Pause className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 rounded-xl">
          <Trophy className="w-5 h-5 text-yellow-600" />
          <span className="font-bold text-yellow-700">{score} 分</span>
        </div>

        {streak >= 2 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 rounded-xl animate-pulse">
            <Zap className="w-5 h-5 text-orange-500" />
            <span className="font-bold text-orange-600">连击 x{streak}</span>
          </div>
        )}

        <div className="flex-1" />

        <div className="px-4 py-2 bg-white/80 backdrop-blur rounded-xl shadow">
          <span className="text-sm text-gray-500">进度 </span>
          <span className="font-bold text-gray-700">
            {currentIndex + 1}/{totalItems}
          </span>
        </div>
      </div>

      <div className="w-full h-3 bg-white/50 rounded-full overflow-hidden shadow-inner">
        <div
          className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export default GameHeader
