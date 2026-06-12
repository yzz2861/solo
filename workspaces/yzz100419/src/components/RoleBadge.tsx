import type { UserRole } from '@/types'
import { cn } from '@/lib/utils'

const roleConfig: Record<UserRole, { label: string; className: string }> = {
  boss: {
    label: '老板',
    className: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  manager: {
    label: '店长',
    className: 'bg-rose-100 text-rose-700 border-rose-300',
  },
  consultant: {
    label: '顾问',
    className: 'bg-slate-100 text-slate-600 border-slate-300',
  },
}

interface RoleBadgeProps {
  role: UserRole
  className?: string
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const config = roleConfig[role]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  )
}
