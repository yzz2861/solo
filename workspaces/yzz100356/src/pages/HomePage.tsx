import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, BookOpen, RefreshCw, Settings, Sparkles } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { progress, initGame } = useGameStore()

  React.useEffect(() => {
    initGame()
  }, [initGame])

  const hasProgress = progress.itemsAnswered > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 text-6xl opacity-20 animate-bounce-slow">♻️</div>
        <div className="absolute top-32 right-20 text-5xl opacity-20 animate-bounce-slow" style={{ animationDelay: '0.5s' }}>🌱</div>
        <div className="absolute bottom-20 left-20 text-5xl opacity-20 animate-bounce-slow" style={{ animationDelay: '1s' }}>🪴</div>
        <div className="absolute bottom-40 right-10 text-6xl opacity-20 animate-bounce-slow" style={{ animationDelay: '1.5s' }}>🌍</div>
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        <div className="mb-8 text-center animate-slide-up">
          <div className="text-7xl mb-4 flex justify-center gap-2">
            <span className="inline-block animate-bounce-slow">🗑️</span>
            <span className="inline-block animate-bounce-slow" style={{ animationDelay: '0.2s' }}>🔄</span>
            <span className="inline-block animate-bounce-slow" style={{ animationDelay: '0.4s' }}>🎯</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500 mb-3">
            垃圾分类接力赛
          </h1>
          <p className="text-lg text-gray-600 font-medium">
            比比谁是分类小能手 🌟
          </p>
        </div>

        {hasProgress && (
          <div className="w-full bg-white/80 backdrop-blur rounded-2xl p-4 mb-6 shadow-lg animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                <span className="text-sm text-gray-600">上次进度</span>
              </div>
              <div className="text-sm font-bold text-green-600">
                第 {progress.currentLevel} 关 · {progress.totalScore} 分
              </div>
            </div>
          </div>
        )}

        <div className="w-full space-y-4">
          <button
            onClick={() => navigate('/game')}
            className="w-full py-5 px-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-xl rounded-2xl shadow-lg shadow-green-200 hover:shadow-xl hover:shadow-green-300 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-3 animate-slide-up"
            style={{ animationDelay: '0.2s' }}
          >
            <Play className="w-7 h-7 fill-current" />
            {hasProgress ? '继续游戏' : '开始游戏'}
          </button>

          {hasProgress && (
            <button
              onClick={() => {
                if (confirm('确定要重新开始吗？所有进度将会清空。')) {
                  useGameStore.getState().resetGame()
                }
              }}
              className="w-full py-4 px-6 bg-white text-gray-600 font-semibold rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-102 active:scale-98 flex items-center justify-center gap-2 animate-slide-up"
              style={{ animationDelay: '0.3s' }}
            >
              <RefreshCw className="w-5 h-5" />
              重新开始
            </button>
          )}

          <button
            onClick={() => navigate('/mistakes')}
            className="w-full py-4 px-6 bg-gradient-to-r from-orange-400 to-amber-400 text-white font-bold rounded-2xl shadow-lg shadow-orange-200 hover:shadow-xl hover:shadow-orange-300 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-3 animate-slide-up"
            style={{ animationDelay: '0.4s' }}
          >
            <BookOpen className="w-6 h-6" />
            错题本
            {progress.itemsAnswered - progress.itemsCorrect > 0 && (
              <span className="bg-white/30 px-2 py-0.5 rounded-full text-sm">
                {progress.itemsAnswered - progress.itemsCorrect} 道
              </span>
            )}
          </button>
        </div>

        <div className="mt-10 text-center animate-slide-up" style={{ animationDelay: '0.5s' }}>
          <button
            onClick={() => navigate('/volunteer')}
            className="text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-2 text-sm"
          >
            <Settings className="w-4 h-4" />
            志愿者入口
          </button>
        </div>

        <div className="mt-6 flex gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-recyclable"></span> 可回收
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-kitchen"></span> 厨余
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-harmful"></span> 有害
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-other"></span> 其他
          </span>
        </div>
      </div>
    </div>
  )
}

export default HomePage
