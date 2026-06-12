import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  BilliardTable, OrderSession, OrderItem, TableTransfer, PauseRecord,
  Product, Member, Package, Checkout, RevocationLog, Operator, Settings,
  CustomerType, PaymentMethod, DeliveryStatus,
} from '@/types';
import { INITIAL_TABLES, INITIAL_PRODUCTS, INITIAL_PACKAGES, INITIAL_MEMBERS, INITIAL_OPERATORS, DEFAULT_SETTINGS } from '@/lib/seed';
import { uid, calcTableFee, calcProductTotal, calcCheckoutTotals, calcChange } from '@/lib/utils';
import { getDB, STORES } from '@/lib/db';

interface BilliardStore {
  tables: BilliardTable[];
  sessions: OrderSession[];
  items: OrderItem[];
  transfers: TableTransfer[];
  pauses: PauseRecord[];

  products: Product[];
  members: Member[];
  packages: Package[];

  checkouts: Checkout[];
  revocations: RevocationLog[];
  operators: Operator[];

  settings: Settings;
  current_operator_id: string | null;
  last_saved_at: string;

  login: (username: string, password: string) => { ok: boolean; message: string };
  logout: () => void;

  startSession: (tableId: string, customerType: CustomerType, memberId?: string | null, packageId?: string | null, note?: string) => { ok: boolean; message: string; sessionId?: string };

  pauseSession: (sessionId: string, reason: string) => void;
  resumeSession: (sessionId: string) => { remindedSessions: string[] };

  transferTable: (sessionId: string, toTableId: string, note?: string) => { ok: boolean; message: string };

  addItem: (sessionId: string, productId: string, quantity: number) => { ok: boolean; message: string };
  removeItem: (itemId: string) => void;
  updateDeliveryStatus: (itemId: string, status: DeliveryStatus) => void;

  checkout: (
    sessionId: string,
    discount: { type: 'rate' | 'amount'; value: number },
    paymentMethod: PaymentMethod,
    received: number,
    operatorId: string
  ) => { ok: boolean; message: string; checkoutId?: string };
  lockCheckout: (checkoutId: string) => void;
  revokeCheckout: (checkoutId: string, operatorId: string, reason: string, adminPassword: string) => { ok: boolean; message: string };

  getSessionItems: (sessionId: string) => OrderItem[];
  getTableFeePreview: (sessionId: string, now?: Date) => number;
  getSessionGrandTotal: (sessionId: string, now?: Date) => number;
  getSessionByTableId: (tableId: string) => OrderSession | undefined;
  getCurrentPause: (sessionId: string) => PauseRecord | undefined;

  upsertProduct: (p: Product) => void;
  upsertMember: (m: Member) => void;
  upsertPackage: (p: Package) => void;
  updateSettings: (s: Partial<Settings>) => void;

  saveToIDB: () => Promise<void>;
  hydrateFromIDB: () => Promise<void>;
}

function computeTotalPausedSeconds(sessionId: string, pauses: PauseRecord[]): number {
  let total = 0;
  for (const p of pauses) {
    if (p.session_id !== sessionId) continue;
    const start = new Date(p.pause_start).getTime();
    const end = p.pause_end ? new Date(p.pause_end).getTime() : Date.now();
    if (p.pause_end) total += Math.floor((end - start) / 1000);
  }
  return total;
}

export const useBilliardStore = create<BilliardStore>()(
  persist(
    (set, get) => ({
      tables: INITIAL_TABLES,
      sessions: [],
      items: [],
      transfers: [],
      pauses: [],
      products: INITIAL_PRODUCTS,
      members: INITIAL_MEMBERS,
      packages: INITIAL_PACKAGES,
      checkouts: [],
      revocations: [],
      operators: INITIAL_OPERATORS,
      settings: DEFAULT_SETTINGS,
      current_operator_id: null,
      last_saved_at: new Date().toISOString(),

      login: (username, password) => {
        const hash = btoa(password);
        const op = get().operators.find(o => o.username === username && o.password_hash === hash);
        if (!op) return { ok: false, message: '用户名或密码错误' };
        set({ current_operator_id: op.id });
        return { ok: true, message: `欢迎回来，${op.display_name}` };
      },
      logout: () => set({ current_operator_id: null }),

      startSession: (tableId, customerType, memberId = null, packageId = null, note) => {
        const s = get();
        const table = s.tables.find(t => t.id === tableId);
        if (!table) return { ok: false, message: '桌台不存在' };
        if (table.status !== 'idle') return { ok: false, message: `桌台 ${table.table_no} 已占用` };
        if (customerType === 'package' && !packageId) return { ok: false, message: '请选择包时套餐' };
        if (customerType === 'member' && !memberId) return { ok: false, message: '请选择会员' };

        const now = new Date().toISOString();
        const newSession: OrderSession = {
          id: uid('ses'),
          table_id: tableId,
          customer_type: customerType,
          member_id: memberId,
          package_id: packageId,
          start_time: now,
          total_paused_seconds: 0,
          created_at: now,
          note,
        };

        set(state => ({
          tables: state.tables.map(t => t.id === tableId ? { ...t, status: 'occupied' as const } : t),
          sessions: [...state.sessions, newSession],
          last_saved_at: new Date().toISOString(),
        }));
        return { ok: true, message: `已为 ${table.name} 开台`, sessionId: newSession.id };
      },

      pauseSession: (sessionId, reason) => {
        const now = new Date().toISOString();
        const pause: PauseRecord = {
          id: uid('ps'),
          session_id: sessionId,
          pause_start: now,
          pause_reason: reason,
          reminded: false,
        };
        set(state => ({
          pauses: [...state.pauses, pause],
          tables: state.tables.map(t =>
            state.sessions.find(s => s.id === sessionId)?.table_id === t.id
              ? { ...t, status: 'paused' as const }
              : t
          ),
          last_saved_at: new Date().toISOString(),
        }));
      },

      resumeSession: (sessionId) => {
        const s = get();
        const openPause = s.pauses.find(p => p.session_id === sessionId && !p.pause_end);
        const now = new Date();
        if (openPause) {
          const endIso = now.toISOString();
          set(state => {
            const updatedPauses = state.pauses.map(p =>
              p.id === openPause.id ? { ...p, pause_end: endIso } : p
            );
            const pausedTotal = computeTotalPausedSeconds(sessionId, updatedPauses);
            return {
              pauses: updatedPauses,
              sessions: state.sessions.map(s2 =>
                s2.id === sessionId ? { ...s2, total_paused_seconds: pausedTotal } : s2
              ),
              tables: state.tables.map(t =>
                state.sessions.find(sx => sx.id === sessionId)?.table_id === t.id
                  ? { ...t, status: 'occupied' as const }
                  : t
              ),
              last_saved_at: new Date().toISOString(),
            };
          });
        }
        const reminded: string[] = [];
        const settings = s.settings;
        s.pauses.forEach(p => {
          if (p.session_id !== sessionId) return;
          const durMin = (Date.now() - new Date(p.pause_start).getTime()) / 60000;
          if (durMin >= settings.pause_reminder_minutes && !p.reminded) {
            reminded.push(sessionId);
            set(st => ({
              pauses: st.pauses.map(pp => pp.id === p.id ? { ...pp, reminded: true } : pp),
            }));
          }
        });
        return { remindedSessions: reminded };
      },

      transferTable: (sessionId, toTableId, note) => {
        const s = get();
        const session = s.sessions.find(x => x.id === sessionId);
        if (!session) return { ok: false, message: '会话不存在' };
        const fromT = s.tables.find(t => t.id === session.table_id);
        const toT = s.tables.find(t => t.id === toTableId);
        if (!fromT || !toT) return { ok: false, message: '桌台不存在' };
        if (toT.status !== 'idle') return { ok: false, message: `目标桌 ${toT.table_no} 已占用` };

        const now = new Date().toISOString();
        const transfer: TableTransfer = {
          id: uid('tr'),
          session_id: sessionId,
          from_table_id: session.table_id,
          to_table_id: toTableId,
          transfer_time: now,
          operator_note: note,
        };

        set(state => ({
          sessions: state.sessions.map(sx => sx.id === sessionId ? { ...sx, table_id: toTableId } : sx),
          tables: state.tables.map(t => {
            if (t.id === fromT.id) return { ...t, status: 'idle' as const };
            if (t.id === toT.id)   return { ...t, status: fromT.status };
            return t;
          }),
          transfers: [...state.transfers, transfer],
          last_saved_at: new Date().toISOString(),
        }));
        return { ok: true, message: `已从 ${fromT.name} 换桌到 ${toT.name}` };
      },

      addItem: (sessionId, productId, quantity) => {
        const s = get();
        const product = s.products.find(p => p.id === productId);
        const session = s.sessions.find(x => x.id === sessionId);
        if (!product) return { ok: false, message: '商品不存在' };
        if (!session) return { ok: false, message: '会话不存在' };
        if (product.stock < quantity) return { ok: false, message: `${product.name} 库存不足` };

        const unit = product.price;
        const subtotal = Math.round(unit * quantity * 100) / 100;
        const item: OrderItem = {
          id: uid('it'),
          session_id: sessionId,
          product_id: productId,
          table_id_at_add: session.table_id,
          delivery_status: 'pending',
          quantity,
          unit_price: unit,
          subtotal,
          created_at: new Date().toISOString(),
        };
        set(state => ({
          items: [...state.items, item],
          products: state.products.map(p => p.id === productId ? { ...p, stock: p.stock - quantity } : p),
          last_saved_at: new Date().toISOString(),
        }));
        return { ok: true, message: `已添加 ${quantity} 份 ${product.name}` };
      },

      removeItem: (itemId) => {
        const s = get();
        const it = s.items.find(i => i.id === itemId);
        if (!it) return;
        set(state => ({
          items: state.items.filter(i => i.id !== itemId),
          products: state.products.map(p => p.id === it.product_id ? { ...p, stock: p.stock + it.quantity } : p),
          last_saved_at: new Date().toISOString(),
        }));
      },

      updateDeliveryStatus: (itemId, status) => {
        set(state => ({
          items: state.items.map(i => i.id === itemId ? { ...i, delivery_status: status } : i),
          last_saved_at: new Date().toISOString(),
        }));
      },

      checkout: (sessionId, discount, paymentMethod, received, operatorId) => {
        const s = get();
        const session = s.sessions.find(x => x.id === sessionId);
        if (!session) return { ok: false, message: '会话不存在' };
        const table = s.tables.find(t => t.id === session.table_id);
        if (!table) return { ok: false, message: '桌台不存在' };

        const items = s.items.filter(i => i.session_id === sessionId && i.delivery_status !== 'cancelled');
        const tableFee = calcTableFee(session, table, s.settings, s.packages, s.members);
        const productTotal = calcProductTotal(items);
        const { subtotal, discountAmount, discountRate, finalTotal } = calcCheckoutTotals(tableFee, productTotal, discount);
        const change = calcChange(received, finalTotal);

        if (paymentMethod === 'member_balance' && session.member_id) {
          const m = s.members.find(x => x.id === session.member_id);
          if (!m || m.balance < finalTotal) return { ok: false, message: '会员余额不足' };
        }
        if (paymentMethod === 'cash' && received < finalTotal) {
          return { ok: false, message: `实收金额不足（应收 ${finalTotal.toFixed(2)}）` };
        }

        const now = new Date().toISOString();
        const checkout: Checkout = {
          id: uid('chk'),
          session_id: sessionId,
          checkout_time: now,
          table_fee: tableFee,
          product_total: productTotal,
          subtotal,
          discount_amount: discountAmount,
          discount_rate: discountRate ?? null,
          final_total: finalTotal,
          received,
          change_amount: change,
          payment_method: paymentMethod,
          operator_id: operatorId,
          locked: false,
        };

        set(state => {
          let newMembers = state.members;
          if (paymentMethod === 'member_balance' && session.member_id) {
            newMembers = state.members.map(m =>
              m.id === session.member_id ? { ...m, balance: Math.round((m.balance - finalTotal) * 100) / 100 } : m
            );
          }
          return {
            checkouts: [...state.checkouts, checkout],
            tables: state.tables.map(t => t.id === session.table_id ? { ...t, status: 'idle' as const } : t),
            members: newMembers,
            last_saved_at: new Date().toISOString(),
          };
        });
        return { ok: true, message: '结账成功', checkoutId: checkout.id };
      },

      lockCheckout: (checkoutId) => {
        set(state => ({
          checkouts: state.checkouts.map(c => c.id === checkoutId ? { ...c, locked: true } : c),
          last_saved_at: new Date().toISOString(),
        }));
      },

      revokeCheckout: (checkoutId, operatorId, reason, adminPassword) => {
        const s = get();
        const admin = s.operators.find(o => o.role === 'admin' && o.password_hash === btoa(adminPassword));
        if (!admin) return { ok: false, message: '管理员密码错误' };
        const checkout = s.checkouts.find(c => c.id === checkoutId);
        if (!checkout) return { ok: false, message: '结账记录不存在' };

        const now = new Date().toISOString();
        const log: RevocationLog = {
          id: uid('rev'),
          checkout_id: checkoutId,
          operator_id: operatorId,
          revocation_time: now,
          reason,
          original_amount: checkout.final_total,
        };
        set(state => ({
          revocations: [...state.revocations, log],
          last_saved_at: new Date().toISOString(),
        }));
        return { ok: true, message: '已记录撤销操作' };
      },

      getSessionItems: (sessionId) => get().items.filter(i => i.session_id === sessionId),
      getTableFeePreview: (sessionId, now = new Date()) => {
        const s = get();
        const session = s.sessions.find(x => x.id === sessionId);
        if (!session) return 0;
        const table = s.tables.find(t => t.id === session.table_id);
        if (!table) return 0;
        return calcTableFee(session, table, s.settings, s.packages, s.members, now);
      },
      getSessionGrandTotal: (sessionId, now = new Date()) => {
        const s = get();
        const tableFee = s.getTableFeePreview(sessionId, now);
        const productTotal = calcProductTotal(s.items.filter(i => i.session_id === sessionId && i.delivery_status !== 'cancelled'));
        return Math.round((tableFee + productTotal) * 100) / 100;
      },
      getSessionByTableId: (tableId) => {
        return get().sessions.find(s => s.table_id === tableId && !get().checkouts.some(c => c.session_id === s.id));
      },
      getCurrentPause: (sessionId) => {
        return get().pauses.find(p => p.session_id === sessionId && !p.pause_end);
      },

      upsertProduct: (p) => set(state => {
        const exists = state.products.some(x => x.id === p.id);
        return { products: exists ? state.products.map(x => x.id === p.id ? p : x) : [...state.products, p] };
      }),
      upsertMember: (m) => set(state => {
        const exists = state.members.some(x => x.id === m.id);
        return { members: exists ? state.members.map(x => x.id === m.id ? m : x) : [...state.members, m] };
      }),
      upsertPackage: (p) => set(state => {
        const exists = state.packages.some(x => x.id === p.id);
        return { packages: exists ? state.packages.map(x => x.id === p.id ? p : x) : [...state.packages, p] };
      }),
      updateSettings: (patch) => set(state => ({ settings: { ...state.settings, ...patch } })),

      saveToIDB: async () => {
        const s = get();
        const db = await getDB();
        const tx = db.transaction([
          STORES.TABLES, STORES.SESSIONS, STORES.ITEMS, STORES.TRANSFERS, STORES.PAUSES,
          STORES.PRODUCTS, STORES.MEMBERS, STORES.PACKAGES, STORES.CHECKOUTS, STORES.REVOCATIONS, STORES.OPERATORS,
        ], 'readwrite');
        await Promise.all([
          ...s.tables.map(t => tx.objectStore(STORES.TABLES).put(t)),
          ...s.sessions.map(t => tx.objectStore(STORES.SESSIONS).put(t)),
          ...s.items.map(t => tx.objectStore(STORES.ITEMS).put(t)),
          ...s.transfers.map(t => tx.objectStore(STORES.TRANSFERS).put(t)),
          ...s.pauses.map(t => tx.objectStore(STORES.PAUSES).put(t)),
          ...s.products.map(t => tx.objectStore(STORES.PRODUCTS).put(t)),
          ...s.members.map(t => tx.objectStore(STORES.MEMBERS).put(t)),
          ...s.packages.map(t => tx.objectStore(STORES.PACKAGES).put(t)),
          ...s.checkouts.map(t => tx.objectStore(STORES.CHECKOUTS).put(t)),
          ...s.revocations.map(t => tx.objectStore(STORES.REVOCATIONS).put(t)),
          ...s.operators.map(t => tx.objectStore(STORES.OPERATORS).put(t)),
        ]);
        await tx.done;
      },

      hydrateFromIDB: async () => {
        const db = await getDB();
        const [tables, sessions, items, transfers, pauses, products, members, packages, checkouts, revocations, operators] = await Promise.all([
          db.getAll(STORES.TABLES),
          db.getAll(STORES.SESSIONS),
          db.getAll(STORES.ITEMS),
          db.getAll(STORES.TRANSFERS),
          db.getAll(STORES.PAUSES),
          db.getAll(STORES.PRODUCTS),
          db.getAll(STORES.MEMBERS),
          db.getAll(STORES.PACKAGES),
          db.getAll(STORES.CHECKOUTS),
          db.getAll(STORES.REVOCATIONS),
          db.getAll(STORES.OPERATORS),
        ]);
        if (tables.length) set({ tables });
        if (sessions.length) set({ sessions });
        if (items.length) set({ items });
        if (transfers.length) set({ transfers });
        if (pauses.length) set({ pauses });
        if (products.length) set({ products });
        if (members.length) set({ members });
        if (packages.length) set({ packages });
        if (checkouts.length) set({ checkouts });
        if (revocations.length) set({ revocations });
        if (operators.length) set({ operators });
      },
    }),
    {
      name: 'billiard:live-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tables: state.tables,
        sessions: state.sessions,
        items: state.items,
        transfers: state.transfers,
        pauses: state.pauses,
        checkouts: state.checkouts,
        revocations: state.revocations,
        settings: state.settings,
        current_operator_id: state.current_operator_id,
        products: state.products,
        members: state.members,
        packages: state.packages,
        operators: state.operators,
      }),
    }
  )
);
