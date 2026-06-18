import { cn } from '@/lib/utils'
import type { WorkflowStep } from '@/types'

const STEPS: { stage: WorkflowStep['stage']; label: string }[] = [
  { stage: 'assessing', label: '评估' },
  { stage: 'reviewing', label: '审核' },
  { stage: 'recycling', label: '回收' },
  { stage: 'completed', label: '结案' },
]

function statusColor(status: WorkflowStep['status']) {
  switch (status) {
    case 'done':
      return 'bg-success-400'
    case 'in_progress':
      return 'bg-brand-500 animate-pulse-dot'
    case 'rejected':
      return 'bg-danger-500'
    default:
      return 'bg-surface-300'
  }
}

function lineClass(status: WorkflowStep['status']) {
  return status === 'pending' ? 'bg-surface-300' : 'bg-brand-500'
}

export default function StepTimeline({ workflow }: { workflow: WorkflowStep[] }) {
  const stepMap = new Map(workflow.map((s) => [s.stage, s.status]))

  return (
    <div className="flex w-full items-start justify-between">
      {STEPS.map((step, i) => {
        const status = stepMap.get(step.stage) ?? 'pending'

        return (
          <div key={step.stage} className="flex flex-1 items-start">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium text-white',
                  statusColor(status),
                )}
              />
              <span className="mt-2 text-sm text-surface-700">{step.label}</span>
            </div>

            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'mt-[15px] h-[2px] flex-1',
                  lineClass(status),
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
