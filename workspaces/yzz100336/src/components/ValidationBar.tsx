import { useEffect, useMemo } from 'react'
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useValidationStore } from '@/stores/validationStore'
import { useSchemeStore } from '@/stores/schemeStore'
import { useProductStore } from '@/stores/productStore'
import { useUIStore } from '@/stores/uiStore'
import type { ValidationType, ValidationSeverity } from '@/types'

const TYPE_LABELS: Record<ValidationType, string> = {
  overflow: '超出层板',
  overlap: '重叠',
  weight: '超重',
  faceBlocked: '展示面遮挡',
  restockHard: '补货困难',
  childInvisible: '儿童视线不可达',
}

const SEVERITY_CONFIG: Record<ValidationSeverity, { icon: typeof AlertCircle; color: string; bg: string }> = {
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-900/30 border-red-800' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-900/30 border-amber-800' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-900/30 border-blue-800' },
}

export default function ValidationBar() {
  const issues = useValidationStore((s) => s.issues)
  const validate = useValidationStore((s) => s.validate)
  const currentSchemeId = useSchemeStore((s) => s.currentSchemeId)
  const schemes = useSchemeStore((s) => s.schemes)
  const products = useProductStore((s) => s.products)
  const setSelectedPlacement = useUIStore((s) => s.setSelectedPlacement)

  const scheme = currentSchemeId ? schemes[currentSchemeId] : null

  useEffect(() => {
    if (scheme) {
      validate(scheme, products)
    }
  }, [scheme, products, validate])

  const grouped = useMemo(() => {
    const map = new Map<ValidationType, { count: number; severity: ValidationSeverity; placementIds: string[] }>()
    for (const issue of issues) {
      const existing = map.get(issue.type)
      if (existing) {
        existing.count++
        existing.placementIds = [...new Set([...existing.placementIds, ...issue.placementIds])]
        if (issue.severity === 'error') existing.severity = 'error'
        else if (issue.severity === 'warning' && existing.severity !== 'error') existing.severity = 'warning'
      } else {
        map.set(issue.type, {
          count: 1,
          severity: issue.severity,
          placementIds: [...issue.placementIds],
        })
      }
    }
    return map
  }, [issues])

  const handleTagClick = (placementIds: string[]) => {
    if (placementIds.length > 0) {
      setSelectedPlacement(placementIds[0])
    }
  }

  if (issues.length === 0) {
    return (
      <div className="flex flex-wrap gap-2 p-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-green-800 bg-green-900/30 px-2.5 py-0.5 text-xs text-green-400">
          <CheckCircle size={12} />
          ✓ 校验通过
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2 p-2">
      {[...grouped.entries()].map(([type, { count, severity, placementIds }]) => {
        const config = SEVERITY_CONFIG[severity]
        const Icon = config.icon
        return (
          <button
            key={type}
            onClick={() => handleTagClick(placementIds)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition hover:opacity-80',
              config.bg,
              config.color
            )}
          >
            <Icon size={12} />
            {count} {TYPE_LABELS[type]}
          </button>
        )
      })}
    </div>
  )
}
