import { useState, useMemo } from 'react'
import { X, Check, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import type { TableSchema } from '@/utils/csvParser'
import { cn } from '@/lib/utils'

interface FieldMappingModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (mapping: Record<string, string>) => void
  schema: TableSchema | null
  csvHeaders: string[]
  initialMapping?: Record<string, string>
}

export default function FieldMappingModal({
  open,
  onClose,
  onConfirm,
  schema,
  csvHeaders,
  initialMapping = {},
}: FieldMappingModalProps) {
  const [mapping, setMapping] = useState<Record<string, string>>(initialMapping)
  const [expanded, setExpanded] = useState<string | null>(null)

  const requiredFields = useMemo(() => {
    if (!schema) return []
    return schema.fields.filter((f) => f.required)
  }, [schema])

  const missingRequired = useMemo(() => {
    return requiredFields.filter(
      (f) => !Object.values(mapping).includes(f.target)
    )
  }, [requiredFields, mapping])

  if (!open || !schema) return null

  const handleSelect = (csvHeader: string, targetField: string) => {
    setMapping((prev) => {
      const next = { ...prev }
      for (const [h, t] of Object.entries(next)) {
        if (t === targetField) delete next[h]
      }
      if (targetField === '') delete next[csvHeader]
      else next[csvHeader] = targetField
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              字段映射配置 — {schema.name}
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              将CSV列与系统字段对应，系统已尽可能自动匹配
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4 scrollbar-thin">
          {missingRequired.length > 0 && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
              <div className="text-xs text-amber-800">
                以下必填字段尚未映射：
                <span className="ml-1 font-medium">
                  {missingRequired.map((f) => f.label).join('、')}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-1">
            {schema.fields.map((field) => {
              const assignedHeader = Object.entries(mapping).find(
                ([, t]) => t === field.target
              )?.[0]
              const isExpanded = expanded === field.target

              return (
                <div
                  key={field.target}
                  className={cn(
                    'rounded-lg border transition-colors',
                    field.required && !assignedHeader
                      ? 'border-amber-300 bg-amber-50/50'
                      : 'border-gray-200 bg-white'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : field.target)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <div
                      className={cn(
                        'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-xs font-semibold',
                        assignedHeader
                          ? 'bg-green-100 text-green-700'
                          : field.required
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-500'
                      )}
                    >
                      {assignedHeader ? <Check className="h-3.5 w-3.5" /> : (field.required ? '!' : '?')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">
                          {field.label}
                        </span>
                        {field.required && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                            必填
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {assignedHeader
                          ? `已映射: ${assignedHeader}`
                          : field.description}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 px-4 py-3">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <button
                          type="button"
                          onClick={() => handleSelect(csvHeaders[0] ?? '', '')}
                          className={cn(
                            'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                            !assignedHeader
                              ? 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100'
                              : 'border-gray-200 bg-white text-gray-400 hover:text-gray-600'
                          )}
                        >
                          不映射
                        </button>
                        {csvHeaders.map((header) => (
                          <button
                            key={header}
                            type="button"
                            onClick={() => handleSelect(header, field.target)}
                            className={cn(
                              'truncate rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                              assignedHeader === header
                                ? 'border-transparent text-white'
                                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                            )}
                            style={
                              assignedHeader === header
                                ? { backgroundColor: '#B76E79' }
                                : undefined
                            }
                          >
                            {header}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="button"
            disabled={missingRequired.length > 0}
            onClick={() => onConfirm(mapping)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
              missingRequired.length > 0
                ? 'cursor-not-allowed opacity-50'
                : 'hover:opacity-90'
            )}
            style={{ backgroundColor: '#B76E79' }}
          >
            确认映射
          </button>
        </div>
      </div>
    </div>
  )
}
