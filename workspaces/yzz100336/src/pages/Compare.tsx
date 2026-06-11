import { useSearchParams } from 'react-router-dom'
import { useEffect, useCallback } from 'react'
import { useSchemeStore } from '@/stores/schemeStore'
import { useUIStore } from '@/stores/uiStore'
import Scene3D from '@/components/3d/Scene3D'
import { Columns2, Download } from 'lucide-react'

export default function Compare() {
  const [searchParams, setSearchParams] = useSearchParams()
  const schemes = useSchemeStore((s) => s.schemes)
  const setCurrentSchemeId = useSchemeStore((s) => s.setCurrentSchemeId)
  const compareLeftId = useUIStore((s) => s.compareLeftId)
  const compareRightId = useUIStore((s) => s.compareRightId)
  const setCompareIds = useUIStore((s) => s.setCompareIds)

  const leftId = searchParams.get('left') ?? compareLeftId
  const rightId = searchParams.get('right') ?? compareRightId

  const schemeList = Object.values(schemes)
  const leftScheme = leftId ? schemes[leftId] : null
  const rightScheme = rightId ? schemes[rightId] : null

  useEffect(() => {
    if (leftId) setCurrentSchemeId(leftId)
  }, [leftId, setCurrentSchemeId])

  const handleLeftChange = (id: string) => {
    setCompareIds(id || null, rightId)
    setSearchParams((prev) => {
      if (id) prev.set('left', id)
      else prev.delete('left')
      return prev
    })
  }

  const handleRightChange = (id: string) => {
    setCompareIds(leftId, id || null)
    setSearchParams((prev) => {
      if (id) prev.set('right', id)
      else prev.delete('right')
      return prev
    })
  }

  const handleExportScreenshots = useCallback(async () => {
    const canvases = document.querySelectorAll('canvas')
    if (canvases.length < 2) {
      alert('请先确保两个方案的3D场景都已加载')
      return
    }

    const leftCanvas = canvases[0]
    const rightCanvas = canvases[1]

    const combinedCanvas = document.createElement('canvas')
    combinedCanvas.width = leftCanvas.width + rightCanvas.width
    combinedCanvas.height = Math.max(leftCanvas.height, rightCanvas.height)

    const ctx = combinedCanvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#111827'
    ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height)

    ctx.drawImage(leftCanvas, 0, 0)
    ctx.drawImage(rightCanvas, leftCanvas.width, 0)

    if (leftScheme && rightScheme) {
      ctx.fillStyle = '#e5e7eb'
      ctx.font = '16px "Noto Sans SC", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(leftScheme.name, leftCanvas.width / 2, 30)
      ctx.fillText(rightScheme.name, leftCanvas.width + rightCanvas.width / 2, 30)
    }

    const dataUrl = combinedCanvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `方案对比_${leftScheme?.name || '左'}_vs_${rightScheme?.name || '右'}.png`
    link.click()
  }, [leftScheme, rightScheme])

  return (
    <div className="flex h-screen flex-col bg-[#0f0f1a]">
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-100">方案对比</h1>
          <select
            value={leftId ?? ''}
            onChange={(e) => handleLeftChange(e.target.value)}
            className="rounded border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-gray-300"
          >
            <option value="">选择左侧方案</option>
            {schemeList.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <Columns2 size={20} className="text-gray-500" />
          <select
            value={rightId ?? ''}
            onChange={(e) => handleRightChange(e.target.value)}
            className="rounded border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-gray-300"
          >
            <option value="">选择右侧方案</option>
            {schemeList.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleExportScreenshots}
          disabled={!leftScheme || !rightScheme}
          className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-medium text-gray-900 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={16} />
          导出对比截图
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col border-r border-gray-800">
          {leftScheme ? (
            <>
              <div className="flex-1">
                <Scene3D schemeId={leftId} />
              </div>
              <div className="border-t border-gray-800 p-3">
                <p className="text-sm font-medium text-gray-200">{leftScheme.name}</p>
                <p className="text-xs text-gray-500">
                  商品数: {leftScheme.placements.length} · 层数: {leftScheme.shelf.layers.length}
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-gray-500">
              请选择左侧方案
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col">
          {rightScheme ? (
            <>
              <div className="flex-1">
                <Scene3D schemeId={rightId} />
              </div>
              <div className="border-t border-gray-800 p-3">
                <p className="text-sm font-medium text-gray-200">{rightScheme.name}</p>
                <p className="text-xs text-gray-500">
                  商品数: {rightScheme.placements.length} · 层数: {rightScheme.shelf.layers.length}
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-gray-500">
              请选择右侧方案
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
