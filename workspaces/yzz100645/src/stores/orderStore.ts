import { create } from "zustand";
import type { Order } from "@/types";
import { MOCK_ORDERS } from "@/data/mockData";

interface OrderState {
  orders: Order[];
  searchQuery: string;
  filterSupplier: string;
  filterStatus: Order["status"] | "all";

  setSearchQuery: (q: string) => void;
  setFilterSupplier: (id: string) => void;
  setFilterStatus: (s: Order["status"] | "all") => void;
  getFilteredOrders: () => Order[];
  getOrderById: (id: string) => Order | undefined;
  getOrdersBySupplier: (supplierId: string) => Order[];
  getUnlinkedOrders: () => Order[];
  linkCommitment: (orderId: string, commitmentId: string) => void;
  unlinkCommitment: (orderId: string, commitmentId: string) => void;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: MOCK_ORDERS,
  searchQuery: "",
  filterSupplier: "",
  filterStatus: "all",

  setSearchQuery: (q) => set({ searchQuery: q }),
  setFilterSupplier: (id) => set({ filterSupplier: id }),
  setFilterStatus: (s) => set({ filterStatus: s }),

  getFilteredOrders: () => {
    const { orders, searchQuery, filterSupplier, filterStatus } = get();
    return orders.filter((o) => {
      if (filterSupplier && o.supplierId !== filterSupplier) return false;
      if (filterStatus !== "all" && o.status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !o.orderNo.toLowerCase().includes(q) &&
          !o.materialName.toLowerCase().includes(q) &&
          !o.materialCode.toLowerCase().includes(q) &&
          !o.supplierName.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  },

  getOrderById: (id) => get().orders.find((o) => o.id === id),

  getOrdersBySupplier: (supplierId) =>
    get().orders.filter((o) => o.supplierId === supplierId),

  getUnlinkedOrders: () =>
    get().orders.filter((o) => o.linkedCommitmentIds.length === 0),

  linkCommitment: (orderId, commitmentId) =>
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              linkedCommitmentIds: o.linkedCommitmentIds.includes(commitmentId)
                ? o.linkedCommitmentIds
                : [...o.linkedCommitmentIds, commitmentId],
            }
          : o
      ),
    })),

  unlinkCommitment: (orderId, commitmentId) =>
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              linkedCommitmentIds: o.linkedCommitmentIds.filter(
                (id) => id !== commitmentId
              ),
            }
          : o
      ),
    })),
}));
