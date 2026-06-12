import { STATUS_LABELS, STATUS_COLORS } from '@/types'
import type { FileStatus } from '@/types'

interface StatusTagProps {
  status: FileStatus
}

export default function StatusTag({ status }: StatusTagProps) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white shrink-0"
      style={{ backgroundColor: STATUS_COLORS[status] }}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
