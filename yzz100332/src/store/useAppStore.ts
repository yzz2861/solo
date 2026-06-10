import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  PriceTag,
  ValidationIssue,
  AuditLog,
  SaveStatus,
  PrintSettings,
} from "@/types";
import { validateTags } from "@/utils/validator";
import { parsePaste } from "@/utils/parser";
import { nanoid, timestamp } from "@/utils/id";
import { SAMPLE_TAGS } from "@/data/sampleData";

export interface AppState {
  tags: PriceTag[];
  issues: ValidationIssue[];
  logs: AuditLog[];
  currentOperator: string;
  bossPassword: string;
  saveStatus: SaveStatus;
  confirmFlashKey: number;
  selectedCategory: string;
  printSettings: PrintSettings;
  issuesDrawerOpen: boolean;
  confirmModalOpen: boolean;
}

export interface AppActions {
  addTag: (tag?: Partial<PriceTag>) => void;
  updateTag: (id: string, patch: Partial<PriceTag>) => void;
  removeTag: (id: string) => void;
  bulkAddTags: (tags: Partial<PriceTag>[]) => void;
  bulkUpdate: (ids: string[], patch: Partial<PriceTag>) => void;
  bulkReduceJinPrice: (amount: number, ids?: string[]) => void;
  bulkSetPromo: (start: string, end: string, ids?: string[]) => void;
  removeAll: () => void;
  loadSample: () => void;
  parsePasteText: (text: string) => { ok: number; fail: number };
  revalidate: () => void;
  submitConfirm: (password: string) => { ok: boolean; message: string };
  rejectConfirm: (reason: string) => void;
  markPrinted: (ids: string[]) => void;
  setOperator: (name: string) => void;
  setBossPassword: (oldPw: string, newPw: string) => boolean;
  setSaveStatus: (s: SaveStatus) => void;
  setSelectedCategory: (c: string) => void;
  setPrintSettings: (patch: Partial<PrintSettings>) => void;
  setIssuesDrawerOpen: (v: boolean) => void;
  setConfirmModalOpen: (v: boolean) => void;
  addLog: (log: Omit<AuditLog, "id" | "timestamp">) => void;
}

type Full = AppState & AppActions;

const INITIAL_SETTINGS: PrintSettings = {
  paper: "a4-30",
  onlyConfirmed: true,
  marginMm: 4,
};

function createDefaultTag(p?: Partial<PriceTag>): PriceTag {
  const now = timestamp();
  return {
    id: nanoid(),
    category: p?.category || "",
    name: p?.name || "",
    origin: p?.origin || "",
    grade: p?.grade || "",
    boxSpec: p?.boxSpec || 0,
    jinPrice: p?.jinPrice || 0,
    boxPrice: p?.boxPrice || 0,
    memberDiscount: p?.memberDiscount || 1,
    promoStart: p?.promoStart || "",
    promoEnd: p?.promoEnd || "",
    remark: p?.remark || "",
    status: p?.status || "draft",
    createdAt: p?.createdAt || now,
    updatedAt: now,
    confirmedAt: p?.confirmedAt,
    confirmedBy: p?.confirmedBy,
    printedAt: p?.printedAt,
    printedBy: p?.printedBy,
  };
}

export const useAppStore = create<Full>()(
  persist(
    (set, get) => ({
      tags: [],
      issues: [],
      logs: [],
      currentOperator: "",
      bossPassword: "888888",
      saveStatus: { status: "idle" },
      confirmFlashKey: 0,
      selectedCategory: "全部",
      printSettings: INITIAL_SETTINGS,
      issuesDrawerOpen: false,
      confirmModalOpen: false,

      addTag: (p) => {
        const tag = createDefaultTag(p);
        set({ tags: [...get().tags, tag] });
        get().addLog({ tagId: tag.id, action: "edit", operator: get().currentOperator || "店员", detail: "新增" });
        get().revalidate();
      },
      updateTag: (id, patch) => {
        set({
          tags: get().tags.map((t) =>
            t.id === id ? { ...t, ...patch, updatedAt: timestamp() } : t
          ),
        });
        get().revalidate();
      },
      removeTag: (id) => {
        set({ tags: get().tags.filter((t) => t.id !== id) });
        get().revalidate();
      },
      bulkAddTags: (list) => {
        const now = timestamp();
        const newTags = list.map((p) => createDefaultTag({ ...p, createdAt: p?.createdAt || now }));
        set({ tags: [...get().tags, ...newTags] });
        get().revalidate();
      },
      bulkUpdate: (ids, patch) => {
        const idSet = new Set(ids);
        set({
          tags: get().tags.map((t) =>
            idSet.has(t.id) ? { ...t, ...patch, updatedAt: timestamp() } : t
          ),
        });
        get().revalidate();
      },
      bulkReduceJinPrice: (amount, ids) => {
        const idSet = ids ? new Set(ids) : null;
        set({
          tags: get().tags.map((t) => {
            if (idSet && !idSet.has(t.id)) return t;
            const newJin = Math.max(0, (t.jinPrice || 0) - amount);
            return { ...t, jinPrice: newJin, updatedAt: timestamp() };
          }),
        });
        get().revalidate();
      },
      bulkSetPromo: (start, end, ids) => {
        const idSet = ids ? new Set(ids) : null;
        set({
          tags: get().tags.map((t) => {
            if (idSet && !idSet.has(t.id)) return t;
            return { ...t, promoStart: start, promoEnd: end, updatedAt: timestamp() };
          }),
        });
        get().revalidate();
      },
      removeAll: () => {
        set({ tags: [] });
        get().revalidate();
      },
      loadSample: () => {
        const now = timestamp();
        const tags = SAMPLE_TAGS.map((p) =>
          createDefaultTag({ ...p, createdAt: now })
        );
        set({ tags });
        get().revalidate();
      },
      parsePasteText: (text) => {
        const res = parsePaste(text);
        if (res.tags.length > 0) {
          const now = timestamp();
          const newTags = res.tags.map((p) =>
            createDefaultTag({ ...p, createdAt: now })
          );
          set({ tags: [...get().tags, ...newTags] });
          get().revalidate();
        }
        return { ok: res.ok, fail: res.fail };
      },
      revalidate: () => {
        const issues = validateTags(get().tags);
        set({ issues });
      },
      submitConfirm: (password) => {
        const state = get();
        if (password !== state.bossPassword) {
          return { ok: false, message: "老板密码错误" };
        }
        if (state.tags.length === 0) {
          return { ok: false, message: "尚无任何价签可确认" };
        }
        const now = timestamp();
        const op = state.currentOperator || "老板";
        const newTags = state.tags.map((t) =>
          t.status === "draft"
            ? { ...t, status: "confirmed" as const, confirmedAt: now, confirmedBy: op, updatedAt: now }
            : t
        );
        newTags.forEach((t, i) => {
          if (state.tags[i].status === "draft") {
            get().addLog({ tagId: t.id, action: "confirm", operator: op, detail: `老板确认通过` });
          }
        });
        set({ tags: newTags, confirmFlashKey: state.confirmFlashKey + 1, confirmModalOpen: false });
        get().revalidate();
        return { ok: true, message: `已确认 ${newTags.filter((t, i) => state.tags[i].status === "draft").length} 条价签` };
      },
      rejectConfirm: (reason) => {
        const state = get();
        const op = state.currentOperator || "老板";
        state.tags.forEach((t) => {
          if (t.status === "confirmed") {
            get().addLog({ tagId: t.id, action: "reject", operator: op, detail: `驳回：${reason}` });
          }
        });
        set({
          tags: state.tags.map((t) =>
            t.status === "confirmed"
              ? { ...t, status: "draft" as const, confirmedAt: undefined, confirmedBy: undefined, updatedAt: timestamp() }
              : t
          ),
          confirmModalOpen: false,
        });
        get().revalidate();
      },
      markPrinted: (ids) => {
        const state = get();
        const idSet = new Set(ids);
        const op = state.currentOperator || "店员";
        const now = timestamp();
        set({
          tags: state.tags.map((t) => {
            if (idSet.has(t.id) && t.status !== "printed") {
              get().addLog({ tagId: t.id, action: "print", operator: op, detail: "打印完成" });
              return { ...t, status: "printed" as const, printedAt: now, printedBy: op, updatedAt: now };
            }
            return t;
          }),
        });
      },
      setOperator: (name) => set({ currentOperator: name }),
      setBossPassword: (oldPw, newPw) => {
        if (get().bossPassword !== oldPw) return false;
        if (!/^\d{6}$/.test(newPw)) return false;
        set({ bossPassword: newPw });
        return true;
      },
      setSaveStatus: (s) => set({ saveStatus: s }),
      setSelectedCategory: (c) => set({ selectedCategory: c }),
      setPrintSettings: (patch) =>
        set({ printSettings: { ...get().printSettings, ...patch } }),
      setIssuesDrawerOpen: (v) => set({ issuesDrawerOpen: v }),
      setConfirmModalOpen: (v) => set({ confirmModalOpen: v }),
      addLog: (log) => {
        set({
          logs: [
            { ...log, id: nanoid(), timestamp: timestamp() },
            ...get().logs,
          ].slice(0, 500),
        });
      },
    }),
    {
      name: "fruit-tag-app-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        tags: s.tags,
        logs: s.logs,
        currentOperator: s.currentOperator,
        bossPassword: s.bossPassword,
        printSettings: s.printSettings,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          setTimeout(() => state.revalidate(), 0);
        }
      },
    }
  )
);
