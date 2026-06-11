import type {
  Scheme,
  Product,
  Placement,
  ValidationIssue,
  ShelfLayer,
} from '@/types'

export function generatePlacementList(
  scheme: Scheme,
  products: Product[],
): {
  layerId: string
  layerHeight: number
  items: {
    index: number
    name: string
    positionX: number
    size: string
    displayFace: string
  }[]
}[] {
  const productMap = new Map<string, Product>()
  for (const p of products) {
    productMap.set(p.id, p)
  }

  const layerMap = new Map<string, ShelfLayer>()
  for (const layer of scheme.shelf.layers) {
    layerMap.set(layer.id, layer)
  }

  const sortedLayers = [...scheme.shelf.layers].sort(
    (a, b) => b.heightFromGround - a.heightFromGround,
  )

  return sortedLayers.map((layer) => {
    const layerPlacements = scheme.placements.filter(
      (p) => p.shelfLayerId === layer.id,
    )

    const items = layerPlacements.map((placement, idx) => {
      const product = productMap.get(placement.productId)
      return {
        index: idx,
        name: product?.name ?? '',
        positionX: placement.positionX,
        size: product
          ? `${product.width}x${product.height}x${product.depth}`
          : '',
        displayFace: product?.displayFace ?? '',
      }
    })

    return {
      layerId: layer.id,
      layerHeight: layer.heightFromGround,
      items,
    }
  })
}

export function generateAdjustmentSuggestions(
  issues: ValidationIssue[],
): { productName: string; problem: string; suggestion: string }[] {
  return issues.map((issue) => ({
    productName: issue.placementIds[0] ?? '',
    problem: issue.message,
    suggestion: issue.suggestion,
  }))
}

export function generateRestockNotes(
  scheme: Scheme,
  products: Product[],
  issues: ValidationIssue[],
): { productName: string; layer: string; note: string }[] {
  const productMap = new Map<string, Product>()
  for (const p of products) {
    productMap.set(p.id, p)
  }

  const placementMap = new Map<string, Placement>()
  for (const pl of scheme.placements) {
    placementMap.set(pl.id, pl)
  }

  const layerMap = new Map<string, ShelfLayer>()
  for (const layer of scheme.shelf.layers) {
    layerMap.set(layer.id, layer)
  }

  const notes: { productName: string; layer: string; note: string }[] = []
  const seen = new Set<string>()

  for (const placement of scheme.placements) {
    const layer = layerMap.get(placement.shelfLayerId)
    if (layer && layer.heightFromGround > 190) {
      const product = productMap.get(placement.productId)
      const key = placement.productId + placement.shelfLayerId
      if (!seen.has(key)) {
        seen.add(key)
        notes.push({
          productName: product?.name ?? '',
          layer: placement.shelfLayerId,
          note: `层高 ${layer.heightFromGround}cm 超过补货安全线 190cm`,
        })
      }
    }
  }

  for (const issue of issues) {
    if (issue.type === 'restockHard') {
      for (const pid of issue.placementIds) {
        const placement = placementMap.get(pid)
        if (!placement) continue
        const product = productMap.get(placement.productId)
        const key = placement.productId + placement.shelfLayerId + 'restockHard'
        if (!seen.has(key)) {
          seen.add(key)
          notes.push({
            productName: product?.name ?? '',
            layer: placement.shelfLayerId,
            note: issue.suggestion,
          })
        }
      }
    }
  }

  return notes
}

export function captureSceneScreenshot(
  canvasElement: HTMLCanvasElement,
): Promise<string> {
  return Promise.resolve(canvasElement.toDataURL('image/png'))
}
