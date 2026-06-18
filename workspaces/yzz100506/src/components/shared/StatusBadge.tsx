import { AppointmentStatus, STATUS_LABELS } from '@/types'

const statusStyles: Record<AppointmentStatus, string> = {
  pending: 'bg-brand-100 text-brand-700',
  'in-progress': 'bg-mint-100 text-mint-600',
  completed: 'bg-mint-50 text-mint-500',
  'no-show': 'bg-coral-100 text-coral-500',
  cancelled: 'bg-gray-100 text-gray-500',
}

export default function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}
