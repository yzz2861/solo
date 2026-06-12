import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepProgressProps {
  steps: string[]
  currentStep: number
}

export default function StepProgress({ steps, currentStep }: StepProgressProps) {
  return (
    <div className="w-full py-6 px-4">
      <div className="flex items-start justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          return (
            <div
              key={index}
              className="flex flex-col items-center relative flex-1 last:flex-none"
            >
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'absolute top-5 left-1/2 w-full h-0.5 z-0',
                    index < currentStep ? 'bg-green-500' : 'bg-gray-300'
                  )}
                />
              )}
              <div
                className={cn(
                  'relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                  isCompleted && 'bg-green-500 border-green-500',
                  isCurrent && 'bg-blue-600 border-blue-600 ring-4 ring-blue-100',
                  !isCompleted && !isCurrent && 'bg-white border-gray-300'
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5 text-white" />
                ) : (
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      isCurrent ? 'text-white' : 'text-gray-400'
                    )}
                  >
                    {index + 1}
                  </span>
                )}
              </div>
              <div
                className={cn(
                  'mt-3 text-sm font-medium text-center max-w-24',
                  isCompleted && 'text-green-600',
                  isCurrent && 'text-blue-600',
                  !isCompleted && !isCurrent && 'text-gray-500'
                )}
              >
                {step}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
