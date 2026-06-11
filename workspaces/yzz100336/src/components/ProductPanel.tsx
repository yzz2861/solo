import { useState } from 'react'
import { ChevronRight, ChevronDown, PackagePlus } from 'lucide-react'
import { useProductStore } from '@/stores/productStore'
import { useSchemeStore } from '@/stores/schemeStore'
import { useUIStore } from '@/stores/uiStore'
import { CATEGORY_COLORS } from '@/types'
import type { Product } from '@/types'

export default function ProductPanel() {
  const products = useProductStore((s) => s.products)
  const collapsed = useUIStore((s) => s.leftPanelCollapsed)
  const toggleLeftPanel = useUIStore((s) => s.toggleLeftPanel)
  const currentSchemeId = useSchemeStore((s) => s.currentSchemeId)
  const addPlacement = useSchemeStore((s) => s.addPlacement)
  const schemes = useSchemeStore((s) => s.schemes)

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    const cats = [...new Set(products.map((p) => p.category))]
    const init: Record<string, boolean> = {}
    cats.forEach((c) => { init[c] = true })
    return init
  })

  const grouped = products.reduce<Record<string, Product[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {})

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }))
  }

  const handleAddProduct = (product: Product) => {
    if (!currentSchemeId) return
    const scheme = schemes[currentSchemeId]
    if (!scheme) return
    const firstLayer = scheme.shelf.layers[0]
    if (!firstLayer) return
    addPlacement(currentSchemeId, {
      id: crypto.randomUUID(),
      productId: product.id,
      shelfLayerId: firstLayer.id,
      positionX: 0,
      positionZ: 0,
      rotationY: 0,
    })
  }

  if (collapsed) {
    return (
      <div className="flex w-12 flex-col items-center border-r border-gray-800 bg-[#1e1e2e] py-3">
        <button
          onClick={toggleLeftPanel}
          className="rounded p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex w-[280px] shrink-0 flex-col border-r border-gray-800 bg-[#1e1e2e]">
      <div className="flex items-center justify-between border-b border-gray-800 px-3 py-2.5">
        <h2 className="text-sm font-semibold text-gray-200">商品库</h2>
        <button
          onClick={toggleLeftPanel}
          className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {Object.entries(grouped).map(([category, items]) => {
          const expanded = expandedCategories[category] ?? true
          const color = CATEGORY_COLORS[category] ?? '#6b7280'
          return (
            <div key={category}>
              <button
                onClick={() => toggleCategory(category)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800"
              >
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="flex-1">{category}</span>
                <span className="text-xs text-gray-500">{items.length}</span>
              </button>

              {expanded && (
                <div className="pb-1">
                  {items.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleAddProduct(product)}
                      className="flex w-full items-center gap-2 px-4 py-1.5 text-left text-xs text-gray-400 hover:bg-gray-800 active:ring-2 active:ring-amber-500"
                    >
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: product.color }}
                      />
                      <span className="flex-1 truncate text-gray-300">{product.name}</span>
                      <span className="shrink-0 text-gray-500">
                        {product.width}×{product.height}×{product.depth}
                      </span>
                      <PackagePlus size={12} className="shrink-0 text-gray-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="border-t border-gray-800 px-3 py-2">
        <p className="text-xs text-gray-500">点击商品添加到货架</p>
      </div>
    </div>
  )
}
