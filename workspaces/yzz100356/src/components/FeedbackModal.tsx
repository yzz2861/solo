import React from 'react'
import { Lightbulb, CheckCircle2, XCircle, ArrowRight } from 'lucide-react'
import type { FeedbackState } from '@/types'
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/types'

interface FeedbackModalProps {
  feedback: FeedbackState
  onClose: () => void
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ feedback, onClose }) => {
  if (!feedback.type || !feedback.item) return null

  const isCorrect = feedback.type === 'correct'
  const item = feedback.item

  const getEncouragement = () => {
    if (isCorrect) {
      const messages = [
        '太棒了！答对啦～',
        '真厉害！分类正确！',
        '好棒！你是分类小能手！',
        '完美！继续加油！',
        '正确！给你点个赞👍',
      ]
      return messages[Math.floor(Math.random() * messages.length)]
    } else {
      const messages = [
        '再想想看～',
        '没关系，下次就会了！',
        '这个容易搞混很正常～',
        '别灰心，我们来看一看为什么～',
      ]
      return messages[Math.floor(Math.random() * messages.length)]
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className={`
          relative z-10 w-full max-w-sm
          bg-white rounded-3xl shadow-2xl
          p-6 sm:p-8
          animate-pop-in
        `}
      >
        <div className="flex flex-col items-center text-center">
          <div
            className={`
              w-20 h-20 sm:w-24 sm:h-24 rounded-full
              flex items-center justify-center
              mb-4
              ${isCorrect ? 'bg-green-100' : 'bg-orange-100'}
            `}
          >
            {isCorrect ? (
              <CheckCircle2 className="w-12 h-12 sm:w-14 sm:h-14 text-green-500" />
            ) : (
              <XCircle className="w-12 h-12 sm:w-14 sm:h-14 text-orange-500" />
            )}
          </div>

          <h2
            className={`
              text-xl sm:text-2xl font-bold mb-2
              ${isCorrect ? 'text-green-600' : 'text-orange-600'}
            `}
          >
            {getEncouragement()}
          </h2>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{item.emoji}</span>
            <span className="text-lg font-semibold text-gray-700">{item.name}</span>
          </div>

          {!isCorrect && (
            <div className="w-full mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-sm text-gray-500">正确分类是：</span>
                <span
                  className="px-3 py-1 rounded-full text-white text-sm font-bold"
                  style={{ backgroundColor: CATEGORY_COLORS[item.category] }}
                >
                  {CATEGORY_LABELS[item.category]}
                </span>
              </div>

              {feedback.wrongCategory && (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm text-gray-500">你刚才选了：</span>
                  <span
                    className="px-3 py-1 rounded-full text-white/70 text-sm line-through"
                    style={{ backgroundColor: CATEGORY_COLORS[feedback.wrongCategory] }}
                  >
                    {CATEGORY_LABELS[feedback.wrongCategory]}
                  </span>
                </div>
              )}
            </div>
          )}

          {(item.mistakeExplanation || item.lifeExample) && (
            <div className="w-full bg-amber-50 rounded-2xl p-4 mb-5 border border-amber-200">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  {item.mistakeExplanation && (
                    <p className="text-sm text-amber-800 mb-2 font-medium">
                      {item.mistakeExplanation}
                    </p>
                  )}
                  {item.lifeExample && (
                    <p className="text-sm text-amber-700">
                      生活例子：{item.lifeExample}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className={`
              w-full py-3 px-6 rounded-2xl
              text-white font-bold text-lg
              transition-all duration-200
              hover:scale-105 active:scale-95
              flex items-center justify-center gap-2
              ${isCorrect ? 'bg-green-500 hover:bg-green-600' : 'bg-orange-500 hover:bg-orange-600'}
            `}
          >
            {isCorrect ? '继续挑战' : '知道啦，继续'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default FeedbackModal
