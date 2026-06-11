import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useCallback } from 'react'
import { useSchemeStore } from '@/stores/schemeStore'
import { useProductStore } from '@/stores/productStore'
import { useValidationStore } from '@/stores/validationStore'
import {
  generatePlacementList,
  generateAdjustmentSuggestions,
  generateRestockNotes,
} from '@/utils/export'
import Scene3D from '@/components/3d/Scene3D'
import {
  Download,
  AlertTriangle,
  AlertCircle,
  Info,
  FileText,
  ClipboardList,
  Package,
  ArrowLeft,
} from 'lucide-react'
import type { ValidationSeverity } from '@/types'

const SEVERITY_STYLES: Record<ValidationSeverity, { icon: typeof AlertCircle; color: string }> = {
  error: { icon: AlertCircle, color: 'text-red-400' },
  warning: { icon: AlertTriangle, color: 'text-amber-400' },
  info: { icon: Info, color: 'text-blue-400' },
}

const FACE_LABELS: Record<string, string> = {
  front: '前',
  back: '后',
  left: '左',
  right: '右',
  top: '上',
}

export default function Export() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const schemes = useSchemeStore((s) => s.schemes)
  const products = useProductStore((s) => s.products)
  const issues = useValidationStore((s) => s.issues)
  const validate = useValidationStore((s) => s.validate)
  const setCurrentSchemeId = useSchemeStore((s) => s.setCurrentSchemeId)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const scheme = id ? schemes[id] : null

  useEffect(() => {
    if (scheme) {
      setCurrentSchemeId(id!)
      validate(scheme, products)
    }
  }, [scheme, products, validate, id, setCurrentSchemeId])

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

  const handleScreenshot = useCallback(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) {
      alert('3D场景未加载，请稍后再试')
      return
    }
    const dataUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `${scheme?.name ?? 'scene'}-screenshot.png`
    link.click()
  }, [scheme])

  if (!scheme) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f0f1a] text-gray-500">
        方案不存在
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-[#0f0f1a]">
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/schemes')}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold text-gray-100">
            导出中心 — {scheme.name}
          </h1>
        </div>
        <button
          onClick={handleScreenshot}
          className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-medium text-gray-900 transition hover:bg-amber-400"
        >
          <Download size={16} />
          导出截图
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 border-r border-gray-800">
          <Scene3D schemeId={id} />
        </div>

        <div className="w-[400px] overflow-y-auto p-4">
          <div className="space-y-4">
            <div className="rounded-xl bg-gray-900 p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-200">
                <ClipboardList size={16} />
                摆放清单
              </h2>
              <div className="space-y-3">
                {placementList.map((layer, layerIdx) => (
                  <div key={layer.layerId} className="rounded-lg border border-gray-800 bg-gray-800/30 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                        层 {layerIdx + 1}
                      </span>
                      <span className="text-xs text-gray-500">
                        高度 {layer.layerHeight}cm
                      </span>
                    </div>
                    {layer.items.length === 0 ? (
                      <p className="text-xs text-gray-500">无商品</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500">
                            <th className="py-1 text-left w-8">序</th>
                            <th className="py-1 text-left">商品名</th>
                            <th className="py-1 text-left w-16">位置</th>
                            <th className="py-1 text-left w-20">尺寸</th>
                            <th className="py-1 text-left w-8">面</th>
                          </tr>
                        </thead>
                        <tbody>
                          {layer.items.map((item) => (
                            <tr key={`${layer.layerId}-${item.index}`} className="text-gray-300">
                              <td className="py-1">{item.index + 1}</td>
                              <td className="py-1 truncate">{item.name}</td>
                              <td className="py-1">{item.positionX}cm</td>
                              <td className="py-1">{item.size}</td>
                              <td className="py-1">{FACE_LABELS[item.displayFace] ?? item.displayFace}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
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
          </div>
        </div>
      </div>
    </div>
  )
}
