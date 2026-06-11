import { create } from 'zustand'
import type {
  Scheme,
  Product,
  Placement,
  ValidationIssue,
  ValidationType,
  ValidationSeverity,
} from '@/types'

interface ValidationState {
  issues: ValidationIssue[]
  validate: (scheme: Scheme, products: Product[]) => void
}

function getProductMap(products: Product[]) {
  const map = new Map<string, Product>()
  for (const p of products) map.set(p.id, p)
  return map
}

function getBounds(placement: Placement, product: Product) {
  const rotated = placement.rotationY % 180 !== 0
  const w = rotated ? product.depth : product.width
  const d = rotated ? product.width : product.depth
  return {
    minX: placement.positionX,
    maxX: placement.positionX + w,
    minZ: placement.positionZ,
    maxZ: placement.positionZ + d,
    w,
    d,
  }
}

function rangesOverlap(aMin: number, aMax: number, bMin: number, bMax: number) {
  return Math.max(aMin, bMin) < Math.min(aMax, bMax)
}

function overlapArea(
  aMinX: number, aMaxX: number, aMinZ: number, aMaxZ: number,
  bMinX: number, bMaxX: number, bMinZ: number, bMaxZ: number,
) {
  const xOverlap = Math.max(0, Math.min(aMaxX, bMaxX) - Math.max(aMinX, bMinX))
  const zOverlap = Math.max(0, Math.min(aMaxZ, bMaxZ) - Math.max(aMinZ, bMinZ))
  return xOverlap * zOverlap
}

function makeIssue(
  type: ValidationType,
  severity: ValidationSeverity,
  placementIds: string[],
  message: string,
  shelfLayerId: string,
  suggestion: string,
): ValidationIssue {
  return {
    id: crypto.randomUUID(),
    type,
    severity,
    placementIds,
    message,
    shelfLayerId,
    suggestion,
  }
}

export const useValidationStore = create<ValidationState>()((set) => ({
  issues: [],

  validate: (scheme, products) => {
    const issues: ValidationIssue[] = []
    const productMap = getProductMap(products)
    const layers = [...scheme.shelf.layers].sort((a, b) => a.heightFromGround - b.heightFromGround)
    const placementsByLayer = new Map<string, Placement[]>()
    for (const p of scheme.placements) {
      const arr = placementsByLayer.get(p.shelfLayerId) ?? []
      arr.push(p)
      placementsByLayer.set(p.shelfLayerId, arr)
    }

    for (let li = 0; li < layers.length; li++) {
      const layer = layers[li]
      const nextLayer = li < layers.length - 1 ? layers[li + 1] : null
      const ceiling = nextLayer ? nextLayer.heightFromGround : 220
      const layerPlacements = placementsByLayer.get(layer.id) ?? []

      for (const placement of layerPlacements) {
        const product = productMap.get(placement.productId)
        if (!product) continue

        const productTop = layer.heightFromGround + product.height
        if (productTop > ceiling) {
          issues.push(makeIssue(
            'overflow',
            'error',
            [placement.id],
            `商品"${product.name}"高度超出层板限制，顶部达到${productTop}cm，层板上限为${ceiling}cm`,
            layer.id,
            '请将该商品移至更高层板或更换更矮的商品',
          ))
        }

        if (productTop > 190) {
          issues.push(makeIssue(
            'restockHard',
            'warning',
            [placement.id],
            `商品"${product.name}"顶部高度为${productTop}cm，超过190cm，补货困难`,
            layer.id,
            '建议将该商品移至190cm以下的层板',
          ))
        }

        const productBottom = layer.heightFromGround
        const productTopCm = productBottom + product.height
        if (productBottom >= 140 || productTopCm <= 80) {
          issues.push(makeIssue(
            'childInvisible',
            'info',
            [placement.id],
            `商品"${product.name}"在儿童视线（110cm）范围外，高度区间${productBottom}~${productTopCm}cm`,
            layer.id,
            '建议将面向儿童的商品放置在80~140cm可见范围内',
          ))
        }
      }

      const totalWeight = layerPlacements.reduce((sum, p) => {
        const prod = productMap.get(p.productId)
        return sum + (prod?.weight ?? 0)
      }, 0)
      if (totalWeight > layer.maxLoad) {
        issues.push(makeIssue(
          'weight',
          'error',
          layerPlacements.map((p) => p.id),
          `层板承重${totalWeight.toFixed(1)}kg超过最大负荷${layer.maxLoad}kg`,
          layer.id,
          '请减少该层商品数量或更换更轻的商品',
        ))
      }

      for (let i = 0; i < layerPlacements.length; i++) {
        const pi = layerPlacements[i]
        const prodI = productMap.get(pi.productId)
        if (!prodI) continue
        const bi = getBounds(pi, prodI)

        for (let j = i + 1; j < layerPlacements.length; j++) {
          const pj = layerPlacements[j]
          const prodJ = productMap.get(pj.productId)
          if (!prodJ) continue
          const bj = getBounds(pj, prodJ)

          if (!rangesOverlap(bi.minX, bi.maxX, bj.minX, bj.maxX)) continue
          if (!rangesOverlap(bi.minZ, bi.maxZ, bj.minZ, bj.maxZ)) continue

          const area = overlapArea(
            bi.minX, bi.maxX, bi.minZ, bi.maxZ,
            bj.minX, bj.maxX, bj.minZ, bj.maxZ,
          )
          const areaI = bi.w * bi.d
          const areaJ = bj.w * bj.d
          const smallerArea = Math.min(areaI, areaJ)

          if (area > smallerArea * 0.1) {
            issues.push(makeIssue(
              'overlap',
              'error',
              [pi.id, pj.id],
              `商品"${prodI.name}"与"${prodJ.name}"重叠面积超过10%`,
              layer.id,
              '请调整商品位置，避免重叠',
            ))
          }
        }
      }

      for (const placement of layerPlacements) {
        const product = productMap.get(placement.productId)
        if (!product) continue
        const b = getBounds(placement, product)

        const checkAdjacent = (
          direction: 'front' | 'back' | 'left' | 'right',
        ): string[] => {
          const blocked: string[] = []
          for (const other of layerPlacements) {
            if (other.id === placement.id) continue
            const otherProd = productMap.get(other.productId)
            if (!otherProd) continue
            const ob = getBounds(other, otherProd)

            let close = false
            switch (direction) {
              case 'front':
                close = ob.maxZ >= b.minZ - 2 && ob.maxZ <= b.minZ + 2 && rangesOverlap(b.minX, b.maxX, ob.minX, ob.maxX)
                break
              case 'back':
                close = ob.minZ >= b.maxZ - 2 && ob.minZ <= b.maxZ + 2 && rangesOverlap(b.minX, b.maxX, ob.minX, ob.maxX)
                break
              case 'left':
                close = ob.maxX >= b.minX - 2 && ob.maxX <= b.minX + 2 && rangesOverlap(b.minZ, b.maxZ, ob.minZ, ob.maxZ)
                break
              case 'right':
                close = ob.minX >= b.maxX - 2 && ob.minX <= b.maxX + 2 && rangesOverlap(b.minZ, b.maxZ, ob.minZ, ob.maxZ)
                break
            }
            if (close) blocked.push(other.id)
          }
          return blocked
        }

        let blockedIds: string[] = []
        switch (product.displayFace) {
          case 'front':
            blockedIds = checkAdjacent('front')
            break
          case 'back':
            blockedIds = checkAdjacent('back')
            break
          case 'left':
            blockedIds = checkAdjacent('left')
            break
          case 'right':
            blockedIds = checkAdjacent('right')
            break
          case 'top': {
            if (nextLayer) {
              const gap = nextLayer.heightFromGround - (layer.heightFromGround + product.height)
              if (gap < 2) {
                const abovePlacements = placementsByLayer.get(nextLayer.id) ?? []
                for (const ap of abovePlacements) {
                  const apProd = productMap.get(ap.productId)
                  if (!apProd) continue
                  const ab = getBounds(ap, apProd)
                  if (rangesOverlap(b.minX, b.maxX, ab.minX, ab.maxX) && rangesOverlap(b.minZ, b.maxZ, ab.minZ, ab.maxZ)) {
                    blockedIds.push(ap.id)
                  }
                }
              }
            }
            break
          }
        }

        if (blockedIds.length > 0) {
          const dirNames: Record<string, string> = {
            front: '前方',
            back: '后方',
            left: '左侧',
            right: '右侧',
            top: '上方',
          }
          issues.push(makeIssue(
            'faceBlocked',
            'warning',
            [placement.id, ...blockedIds],
            `商品"${product.name}"展示面（${dirNames[product.displayFace]}）2cm内有遮挡`,
            layer.id,
            '建议调整间距，确保展示面可见',
          ))
        }
      }
    }

    set({ issues })
  },
}))
