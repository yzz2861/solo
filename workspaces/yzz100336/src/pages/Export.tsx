import { useParams } from 'react-router-dom'
import { useEffect, useMemo } from 'react'
import { useSchemeStore } from '@/stores/schemeStore'
import { useProductStore } from '@/stores/productStore'
import { useValidationStore } from '@/stores/validationStore'
import {
  generatePlacementList,
  generateAdjustmentSuggestions,
  generateRestockNotes,
  captureSceneScreenshot,
} from '@/utils/export'
import {
  Download,
  AlertTriangle,
  AlertCircle,
  Info,
  FileText,
  ClipboardList,
  Package,
} from 'lucide-react'
import type { ValidationSeverity } from '@/types'

const SEVERITY_STYLES: Record<ValidationSeverity, { icon: typeof AlertCircle; color: string }> = {
  error: { icon: AlertCircle, color: 'text-red-400' },
  warning: { icon: AlertTriangle, color: 'text-amber-400' },
  info: { icon: Info, color: 'text-blue-400' },
}

export default function Export() {
  const { id } = useParams<{ id: string }>()
  const schemes = useSchemeStore((s) => s.schemes)
  const products = useProductStore((s) => s.products)
  const issues = useValidationStore((s) => s.issues)
  const validate = useValidationStore((s) => s.validate)

  const scheme = id ? schemes[id] : null

  useEffect(() => {
    if (scheme) validate(scheme, products)
  }, [scheme, products, validate])

  const placementList = useMemo(
    () => (scheme ? generatePlacementList(scheme, products) : []),
    [scheme, products],
  )

  const suggestions = useMemo(
    () => generateAdjustmentSuggestions(issues),
    [issues],
  )

  const restockNotes = useMemo(
    () => (scheme ? generateRestockNotes(scheme, products, issues) : []),
    [scheme, products, issues],
  )

  const handleScreenshot = async () => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    const dataUrl = await captureSceneScreenshot(canvas)
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `${scheme?.name ?? 'scene'}-screenshot.png`
    link.click()
  }

  if (!scheme) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f0f1a] text-gray-500">
        方案不存在
      </div>
    )
  }

  return (
    <div className="h-screen overflow-y-auto bg-[#0f0f1a] p-6">
      <h1 className="mb-6 text-xl font-bold text-gray-100">
        导出中心 — {scheme.name}
      </h1>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-xl bg-gray-900 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-200">
            <ClipboardList size={16} />
            摆放清单
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500">
                  <th className="py-1.5 text-left">序号</th>
                  <th className="py-1.5 text-left">商品名</th>
                  <th className="py-1.5 text-left">位置</th>
                  <th className="py-1.5 text-left">尺寸</th>
                  <th className="py-1.5 text-left">展示面</th>
                </tr>
              </thead>
              <tbody>
                {placementList.flatMap((layer) =>
                  layer.items.map((item) => (
                    <tr
                      key={`${layer.layerId}-${item.index}`}
                      className="border-b border-gray-800/50 text-gray-300"
                    >
                      <td className="py-1.5">{item.index + 1}</td>
                      <td className="py-1.5">{item.name}</td>
                      <td className="py-1.5">{item.positionX}cm</td>
                      <td className="py-1.5">{item.size}</td>
                      <td className="py-1.5">{item.displayFace}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl bg-gray-900 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-200">
            <AlertTriangle size={16} />
            调整建议
          </h2>
          {suggestions.length === 0 ? (
            <p className="text-xs text-gray-500">暂无调整建议</p>
          ) : (
            <ul className="space-y-2">
              {suggestions.map((s, i) => {
                const issue = issues[i]
                const severity = issue?.severity ?? 'info'
                const style = SEVERITY_STYLES[severity]
                const Icon = style.icon
                return (
                  <li
                    key={i}
                    className="rounded-lg border border-gray-800 bg-gray-800/50 p-2.5"
                  >
                    <div
                      className={`mb-1 flex items-center gap-1.5 text-xs font-medium ${style.color}`}
                    >
                      <Icon size={12} />
                      {s.problem}
                    </div>
                    <p className="text-xs text-gray-400">{s.suggestion}</p>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="rounded-xl bg-gray-900 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-200">
            <Package size={16} />
            补货注意点
          </h2>
          {restockNotes.length === 0 ? (
            <p className="text-xs text-gray-500">暂无补货注意点</p>
          ) : (
            <ul className="space-y-2">
              {restockNotes.map((note, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-gray-800 bg-gray-800/50 p-2.5"
                >
                  <p className="mb-0.5 text-xs font-medium text-amber-400">
                    {note.productName}
                  </p>
                  <p className="text-xs text-gray-400">{note.note}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl bg-gray-900 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-200">
            <FileText size={16} />
            截图导出
          </h2>
          <p className="mb-4 text-xs text-gray-500">
            截取当前3D场景并导出为PNG图片
          </p>
          <button
            onClick={handleScreenshot}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-amber-400"
          >
            <Download size={16} />
            导出截图
          </button>
        </div>
      </div>
    </div>
  )
}
