import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PriceItem, PriceSession, ChangeRecord, AnomalyAlert, PriceUnit, ConfirmSource, ItemStatus, SessionStatus } from "@/types";
import { generateMockSessions, generateTodaySession } from "@/utils/mockData";
import { detectAnomalies, shouldAutoMarkAskVendor } from "@/utils/verifyEngine";
import { generateBroadcastScript } from "@/utils/broadcastGen";

interface PriceStore {
  sessions: PriceSession[];
  currentSessionId: string | null;

  initStore: () => void;
  getCurrentSession: () => PriceSession | undefined;
  getSessionByDate: (date: string) => PriceSession | undefined;
  getYesterdaySession: () => PriceSession | undefined;
  createTodaySession: () => void;
  autoMarkAskVendorItems: () => void;

  addItem: (item: Omit<PriceItem, "id">) => void;
  updateItem: (itemId: string, updates: Partial<PriceItem>) => void;
  removeItem: (itemId: string) => void;
  confirmItem: (itemId: string, price: number, unit: PriceUnit, source: ConfirmSource) => void;
  markAskVendor: (itemId: string) => void;
  confirmFromVendor: (itemId: string, price: number, unit: PriceUnit) => void;

  importOcrText: (text: string) => void;
  addOralEntry: (name: string, price: number, unit: PriceUnit, stallNo: string, category: string) => void;

  getAnomalies: () => AnomalyAlert[];
  getVendorList: () => PriceItem[];
  getConfirmedItems: () => PriceItem[];

  finalizeSession: () => void;
  publishSession: () => void;
  updateBroadcastScript: (script: string) => void;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export const usePriceStore = create<PriceStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,

      initStore: () => {
        const state = get();
        if (state.sessions.length > 0) return;
        const mockSessions = generateMockSessions();
        const yesterday = mockSessions[mockSessions.length - 1];
        const today = generateTodaySession(yesterday);
        const anomalies = detectAnomalies(today.items);
        const updatedItems = today.items.map((item) => {
          if (shouldAutoMarkAskVendor(item, anomalies)) {
            return { ...item, status: "ask_vendor" as ItemStatus };
          }
          return item;
        });
        const updatedToday = { ...today, items: updatedItems };
        set({
          sessions: [...mockSessions, updatedToday],
          currentSessionId: updatedToday.id,
        });
      },

      getCurrentSession: () => {
        const { sessions, currentSessionId } = get();
        return sessions.find((s) => s.id === currentSessionId);
      },

      getSessionByDate: (date: string) => {
        return get().sessions.find((s) => s.date === date);
      },

      getYesterdaySession: () => {
        const current = get().getCurrentSession?.();
        if (!current) return undefined;
        const yDate = new Date(current.date);
        yDate.setDate(yDate.getDate() - 1);
        const yStr = yDate.toISOString().slice(0, 10);
        return get().sessions.find((s) => s.date === yStr);
      },

      createTodaySession: () => {
        const yesterday = get().getYesterdaySession?.();
        const today = generateTodaySession(yesterday);
        const anomalies = detectAnomalies(today.items);
        const updatedItems = today.items.map((item) => {
          if (shouldAutoMarkAskVendor(item, anomalies)) {
            return { ...item, status: "ask_vendor" as ItemStatus };
          }
          return item;
        });
        const updatedToday = { ...today, items: updatedItems };
        set((state) => ({
          sessions: [...state.sessions, updatedToday],
          currentSessionId: updatedToday.id,
        }));
      },

      autoMarkAskVendorItems: () => {
        const { currentSessionId } = get();
        if (!currentSessionId) return;
        const session = get().sessions.find((s) => s.id === currentSessionId);
        if (!session) return;
        
        const anomalies = detectAnomalies(session.items);
        const updatedItems = session.items.map((item) => {
          if (item.status === "pending" && shouldAutoMarkAskVendor(item, anomalies)) {
            return { ...item, status: "ask_vendor" as ItemStatus, confirmedSource: "pending" as ConfirmSource };
          }
          return item;
        });
        
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === currentSessionId ? { ...s, items: updatedItems } : s
          ),
        }));
      },

      addItem: (item) => {
        const { currentSessionId } = get();
        if (!currentSessionId) return;
        const newItem: PriceItem = { ...item, id: uid() };
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === currentSessionId ? { ...s, items: [...s.items, newItem] } : s
          ),
        }));
      },

      updateItem: (itemId, updates) => {
        const { currentSessionId } = get();
        if (!currentSessionId) return;
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === currentSessionId
              ? { ...s, items: s.items.map((i) => (i.id === itemId ? { ...i, ...updates } : i)) }
              : s
          ),
        }));
      },

      removeItem: (itemId) => {
        const { currentSessionId } = get();
        if (!currentSessionId) return;
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === currentSessionId ? { ...s, items: s.items.filter((i) => i.id !== itemId) } : s
          ),
        }));
      },

      confirmItem: (itemId, price, unit, source) => {
        const { currentSessionId } = get();
        if (!currentSessionId) return;
        const session = get().sessions.find((s) => s.id === currentSessionId);
        if (!session) return;
        const item = session.items.find((i) => i.id === itemId);
        if (!item) return;

        const changeRecord: ChangeRecord = {
          id: uid(),
          sessionId: currentSessionId,
          itemId,
          itemName: item.name,
          field: "confirmedPrice",
          oldValue: item.confirmedPrice !== undefined ? `${item.confirmedPrice}元/${item.confirmedUnit}` : "未确认",
          newValue: `${price}元/${unit}`,
          reason: `采纳${source === "oral" ? "口述" : source === "ocr" ? "OCR" : "手动"}价格`,
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === currentSessionId
              ? {
                  ...s,
                  items: s.items.map((i) =>
                    i.id === itemId
                      ? { ...i, confirmedPrice: price, confirmedUnit: unit, confirmedSource: source, status: "confirmed" as ItemStatus }
                      : i
                  ),
                  changeLog: [...s.changeLog, changeRecord],
                }
              : s
          ),
        }));
      },

      markAskVendor: (itemId) => {
        const { currentSessionId } = get();
        if (!currentSessionId) return;
        const session = get().sessions.find((s) => s.id === currentSessionId);
        if (!session) return;
        const item = session.items.find((i) => i.id === itemId);
        if (!item) return;

        const changeRecord: ChangeRecord = {
          id: uid(),
          sessionId: currentSessionId,
          itemId,
          itemName: item.name,
          field: "status",
          oldValue: item.status,
          newValue: "ask_vendor",
          reason: "价格待问摊主确认",
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === currentSessionId
              ? {
                  ...s,
                  items: s.items.map((i) =>
                    i.id === itemId ? { ...i, status: "ask_vendor" as ItemStatus, confirmedSource: "pending" as ConfirmSource } : i
                  ),
                  changeLog: [...s.changeLog, changeRecord],
                }
              : s
          ),
        }));
      },

      confirmFromVendor: (itemId, price, unit) => {
        const { currentSessionId } = get();
        if (!currentSessionId) return;
        const session = get().sessions.find((s) => s.id === currentSessionId);
        if (!session) return;
        const item = session.items.find((i) => i.id === itemId);
        if (!item) return;

        const changeRecord: ChangeRecord = {
          id: uid(),
          sessionId: currentSessionId,
          itemId,
          itemName: item.name,
          field: "confirmedPrice",
          oldValue: "待问摊主",
          newValue: `${price}元/${unit}`,
          reason: "摊主已确认价格",
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === currentSessionId
              ? {
                  ...s,
                  items: s.items.map((i) =>
                    i.id === itemId
                      ? { ...i, confirmedPrice: price, confirmedUnit: unit, confirmedSource: "manual" as ConfirmSource, status: "confirmed" as ItemStatus }
                      : i
                  ),
                  changeLog: [...s.changeLog, changeRecord],
                }
              : s
          ),
        }));
      },

      importOcrText: (text: string) => {
        const { currentSessionId } = get();
        if (!currentSessionId) return;
        const lines = text.split("\n").filter((l) => l.trim());
        const updates: { name: string; ocrPrice: number; ocrUnit: PriceUnit; ocrConfidence: number }[] = [];

        for (const line of lines) {
          const match = line.match(/(.+?)[\s：:]+(\d+\.?\d*)\s*元?\s*[\/每]?\s*(斤|公斤)/);
          if (match) {
            updates.push({
              name: match[1].trim(),
              ocrPrice: parseFloat(match[2]),
              ocrUnit: match[3] as PriceUnit,
              ocrConfidence: 0.8,
            });
          }
        }

        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== currentSessionId) return s;
            const newItems = s.items.map((item) => {
              const ocr = updates.find((u) => u.name === item.name);
              if (ocr) {
                return { ...item, ocrPrice: ocr.ocrPrice, ocrUnit: ocr.ocrUnit, ocrConfidence: ocr.ocrConfidence };
              }
              return item;
            });
            for (const ocr of updates) {
              if (!newItems.find((i) => i.name === ocr.name)) {
                newItems.push({
                  id: uid(),
                  name: ocr.name,
                  category: "未分类",
                  ocrPrice: ocr.ocrPrice,
                  ocrUnit: ocr.ocrUnit,
                  ocrConfidence: ocr.ocrConfidence,
                  status: "pending",
                  stallNo: "",
                });
              }
            }
            return { ...s, items: newItems };
          }),
        }));
      },

      addOralEntry: (name, price, unit, stallNo, category) => {
        const { currentSessionId } = get();
        if (!currentSessionId) return;
        const newItem: PriceItem = {
          id: uid(),
          name,
          category,
          oralPrice: price,
          oralUnit: unit,
          status: "pending",
          stallNo,
        };
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === currentSessionId ? { ...s, items: [...s.items, newItem] } : s
          ),
        }));
      },

      getAnomalies: () => {
        const session = get().getCurrentSession?.();
        if (!session) return [];
        return detectAnomalies(session.items);
      },

      getVendorList: () => {
        const session = get().getCurrentSession?.();
        if (!session) return [];
        return session.items.filter((i) => i.status === "ask_vendor");
      },

      getConfirmedItems: () => {
        const session = get().getCurrentSession?.();
        if (!session) return [];
        return session.items.filter((i) => i.status === "confirmed" && i.confirmedPrice !== undefined);
      },

      finalizeSession: () => {
        const { currentSessionId } = get();
        if (!currentSessionId) return;
        const session = get().sessions.find((s) => s.id === currentSessionId);
        if (!session) return;
        const script = generateBroadcastScript(session.items);
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === currentSessionId ? { ...s, broadcastScript: script, status: "verified" as SessionStatus } : s
          ),
        }));
      },

      publishSession: () => {
        const { currentSessionId } = get();
        if (!currentSessionId) return;
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === currentSessionId ? { ...s, status: "published" as SessionStatus } : s
          ),
        }));
      },

      updateBroadcastScript: (script: string) => {
        const { currentSessionId } = get();
        if (!currentSessionId) return;
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === currentSessionId ? { ...s, broadcastScript: script } : s
          ),
        }));
      },
    }),
    {
      name: "market-price-store",
    }
  )
);
