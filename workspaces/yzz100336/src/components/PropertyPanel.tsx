import { ChevronLeft, Trash2, Plus, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSchemeStore } from '@/stores/schemeStore'
import { useProductStore } from '@/stores/productStore'
import { useUIStore } from '@/stores/uiStore'
import type { DisplayFace, Placement } from '@/types'

const FACE_OPTIONS: { value: DisplayFace; label: string }[] = [
  { value: 'front', label: '前' },
  { value: 'back', label: '后' },
  { value: 'left', label: '左' },
  { value: 'right', label: '右' },
  { value: 'top', label: '上' },
]

const ROTATION_OPTIONS = [0, 90, 180, 270]

export default function PropertyPanel() {
  const collapsed = useUIStore((s) => s.rightPanelCollapsed)
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel)
  const selectedPlacementId = useUIStore((s) => s.selectedPlacementId)
  const setSelectedPlacement = useUIStore((s) => s.setSelectedPlacement)

  const currentSchemeId = useSchemeStore((s) => s.currentSchemeId)
  const schemes = useSchemeStore((s) => s.schemes)
  const updateShelfConfig = useSchemeStore((s) => s.updateShelfConfig)
  const updatePlacement = useSchemeStore((s) => s.updatePlacement)
  const removePlacement = useSchemeStore((s) => s.removePlacement)

  const products = useProductStore((s) => s.products)
  const updateProduct = useProductStore((s) => s.updateProduct)

  const scheme = currentSchemeId ? schemes[currentSchemeId] : null
  const shelf = scheme?.shelf
  const placement = scheme?.placements.find((p) => p.id === selectedPlacementId) ?? null
  const product = placement ? products.find((p) => p.id === placement.productId) : null

  if (collapsed) {
    return (
      <div className="flex w-12 flex-col items-center border-l border-gray-800 bg-[#1e1e2e] py-3">
        <button
          onClick={toggleRightPanel}
          className="rounded p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
        >
          <ChevronLeft size={18} />
        </button>
      </div>
    )
  }

  if (!scheme || !shelf) {
    return (
      <div className="flex w-[300px] shrink-0 flex-col border-l border-gray-800 bg-[#1e1e2e]">
        <div className="border-b border-gray-800 px-3 py-2.5">
          <h2 className="text-sm font-semibold text-gray-200">属性面板</h2>
        </div>
        <div className="flex flex-1 items-center justify-center p-4 text-sm text-gray-500">
          请先选择方案
        </div>
      </div>
    )
  }

  const handleShelfChange = (field: string, value: number) => {
    updateShelfConfig(currentSchemeId!, { [field]: value })
  }

  const handleLayerChange = (layerId: string, field: string, value: number) => {
    const updatedLayers = shelf.layers.map((l) =>
      l.id === layerId ? { ...l, [field]: value } : l
    )
    updateShelfConfig(currentSchemeId!, { layers: updatedLayers })
  }

  const handleAddLayer = () => {
    const lastLayer = shelf.layers[shelf.layers.length - 1]
    const newHeight = lastLayer ? lastLayer.heightFromGround + 40 : 15
    const newLayer = {
      id: crypto.randomUUID(),
      heightFromGround: newHeight,
      maxLoad: 15,
    }
    updateShelfConfig(currentSchemeId!, { layers: [...shelf.layers, newLayer] })
  }

  const handleRemoveLayer = (layerId: string) => {
    updateShelfConfig(currentSchemeId!, {
      layers: shelf.layers.filter((l) => l.id !== layerId),
    })
  }

  const handlePlacementUpdate = (partial: Partial<Omit<Placement, 'id'>>) => {
    if (!currentSchemeId || !placement) return
    updatePlacement(currentSchemeId, placement.id, partial)
  }

  const handleDelete = () => {
    if (!currentSchemeId || !placement) return
    removePlacement(currentSchemeId, placement.id)
    setSelectedPlacement(null)
  }

  return (
    <div className="flex w-[300px] shrink-0 flex-col border-l border-gray-800 bg-[#1e1e2e]">
      <div className="flex items-center justify-between border-b border-gray-800 px-3 py-2.5">
        <h2 className="text-sm font-semibold text-gray-200">属性面板</h2>
        <button
          onClick={toggleRightPanel}
          className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!placement ? (
          <div className="space-y-4 p-3">
            <section>
              <h3 className="mb-2 text-xs font-medium text-gray-400">货架配置</h3>
              <div className="space-y-2">
                <label className="block text-xs text-gray-500">
                  名称
                  <input
                    type="text"
                    value={shelf.name}
                    onChange={(e) => updateShelfConfig(currentSchemeId!, { name: e.target.value })}
                    className="mt-0.5 w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200"
                  />
                </label>
                <label className="block text-xs text-gray-500">
                  宽度 (cm)
                  <input
                    type="number"
                    value={shelf.width}
                    onChange={(e) => handleShelfChange('width', Number(e.target.value))}
                    className="mt-0.5 w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200"
                  />
                </label>
                <label className="block text-xs text-gray-500">
                  深度 (cm)
                  <input
                    type="number"
                    value={shelf.depth}
                    onChange={(e) => handleShelfChange('depth', Number(e.target.value))}
                    className="mt-0.5 w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200"
                  />
                </label>
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-medium text-gray-400">层板设置</h3>
                <button
                  onClick={handleAddLayer}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-amber-400 hover:bg-gray-800"
                >
                  <Plus size={12} /> 添加层板
                </button>
              </div>
              <div className="space-y-2">
                {shelf.layers.map((layer, idx) => (
                  <div key={layer.id} className="rounded border border-gray-700 bg-gray-900 p-2">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs text-gray-400">层 {idx + 1}</span>
                      <button
                        onClick={() => handleRemoveLayer(layer.id)}
                        className="rounded p-0.5 text-gray-500 hover:bg-gray-800 hover:text-red-400"
                      >
                        <Minus size={12} />
                      </button>
                    </div>
                    <label className="block text-xs text-gray-500">
                      离地高度
                      <input
                        type="number"
                        value={layer.heightFromGround}
                        onChange={(e) =>
                          handleLayerChange(layer.id, 'heightFromGround', Number(e.target.value))
                        }
                        className="mt-0.5 w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-200"
                      />
                    </label>
                    <label className="mt-1 block text-xs text-gray-500">
                      最大承重 (kg)
                      <input
                        type="number"
                        value={layer.maxLoad}
                        onChange={(e) =>
                          handleLayerChange(layer.id, 'maxLoad', Number(e.target.value))
                        }
                        className="mt-0.5 w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-200"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-4 p-3">
            <section>
              <h3 className="mb-2 text-xs font-medium text-gray-400">商品属性</h3>
              <div className="rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-gray-300">
                {product?.name ?? '未知商品'}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-medium text-gray-400">尺寸设置</h3>
              <div className="space-y-2">
                <label className="block text-xs text-gray-500">
                  宽度 (cm)
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={product?.width ?? 10}
                    onChange={(e) => {
                      if (product) updateProduct(product.id, { width: Number(e.target.value) })
                    }}
                    className="mt-0.5 w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-200"
                  />
                </label>
                <label className="block text-xs text-gray-500">
                  高度 (cm)
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={product?.height ?? 20}
                    onChange={(e) => {
                      if (product) updateProduct(product.id, { height: Number(e.target.value) })
                    }}
                    className="mt-0.5 w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-200"
                  />
                </label>
                <label className="block text-xs text-gray-500">
                  深度 (cm)
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={product?.depth ?? 10}
                    onChange={(e) => {
                      if (product) updateProduct(product.id, { depth: Number(e.target.value) })
                    }}
                    className="mt-0.5 w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-200"
                  />
                </label>
                <label className="block text-xs text-gray-500">
                  重量 (kg)
                  <input
                    type="number"
                    min="0.01"
                    max="20"
                    step="0.01"
                    value={product?.weight ?? 1}
                    onChange={(e) => {
                      if (product) updateProduct(product.id, { weight: Number(e.target.value) })
                    }}
                    className="mt-0.5 w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-200"
                  />
                </label>
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-medium text-gray-400">层位选择</h3>
              <select
                value={placement?.shelfLayerId ?? ''}
                onChange={(e) => handlePlacementUpdate({ shelfLayerId: e.target.value })}
                className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-gray-200"
              >
                {shelf.layers.map((layer, idx) => (
                  <option key={layer.id} value={layer.id}>
                    层 {idx + 1} ({layer.heightFromGround}cm)
                  </option>
                ))}
              </select>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-medium text-gray-400">位置调整</h3>
              <div className="space-y-3">
                <label className="block text-xs text-gray-500">
                  X 位置: {placement.positionX} cm
                  <input
                    type="range"
                    min={0}
                    max={shelf.width}
                    value={placement.positionX}
                    onChange={(e) => handlePlacementUpdate({ positionX: Number(e.target.value) })}
                    className="mt-1 w-full accent-amber-500"
                  />
                </label>
                <label className="block text-xs text-gray-500">
                  Z 位置: {placement.positionZ} cm
                  <input
                    type="range"
                    min={0}
                    max={shelf.depth}
                    value={placement.positionZ}
                    onChange={(e) => handlePlacementUpdate({ positionZ: Number(e.target.value) })}
                    className="mt-1 w-full accent-amber-500"
                  />
                </label>
                <label className="block text-xs text-gray-500">
                  旋转 Y
                  <select
                    value={placement.rotationY}
                    onChange={(e) => handlePlacementUpdate({ rotationY: Number(e.target.value) })}
                    className="mt-0.5 w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200"
                  >
                    {ROTATION_OPTIONS.map((deg) => (
                      <option key={deg} value={deg}>
                        {deg}°
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-medium text-gray-400">展示面</h3>
              <div className="flex gap-1">
                {FACE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      if (product) updateProduct(product.id, { displayFace: opt.value })
                    }}
                    className={cn(
                      'flex-1 rounded border py-1.5 text-xs transition',
                      product?.displayFace === opt.value
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                        : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </section>

            <button
              onClick={handleDelete}
              className="flex w-full items-center justify-center gap-1.5 rounded border border-red-900 bg-red-900/20 py-2 text-xs text-red-400 hover:bg-red-900/40"
            >
              <Trash2 size={14} />
              删除商品
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
