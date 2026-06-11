import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '@/types'
import { PRESET_PRODUCTS } from '@/data/products'

interface ProductState {
  products: Product[]
  addProduct: (product: Product) => void
  removeProduct: (id: string) => void
  updateProduct: (id: string, partial: Partial<Omit<Product, 'id'>>) => void
  getByCategory: (category: string) => Product[]
}

export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({
      products: [...PRESET_PRODUCTS],

      addProduct: (product) =>
        set((state) => ({ products: [...state.products, product] })),

      removeProduct: (id) =>
        set((state) => ({ products: state.products.filter((p) => p.id !== id) })),

      updateProduct: (id, partial) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...partial } : p
          ),
        })),

      getByCategory: (category) =>
        get().products.filter((p) => p.category === category),
    }),
    { name: 'shelf-products' }
  )
)
