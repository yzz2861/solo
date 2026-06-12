import type {
  BilliardTable, Product, Package, Member, Operator, Settings
} from '@/types';

export const INITIAL_TABLES: BilliardTable[] = [
  { id: 'tbl-001', table_no: 1, name: '普台1',   status: 'idle', hourly_rate: 30 },
  { id: 'tbl-002', table_no: 2, name: '普台2',   status: 'idle', hourly_rate: 30 },
  { id: 'tbl-003', table_no: 3, name: '普台3',   status: 'idle', hourly_rate: 30 },
  { id: 'tbl-004', table_no: 4, name: '普台4',   status: 'idle', hourly_rate: 30 },
  { id: 'tbl-005', table_no: 5, name: 'VIP1',    status: 'idle', hourly_rate: 50 },
  { id: 'tbl-006', table_no: 6, name: 'VIP2',    status: 'idle', hourly_rate: 50 },
  { id: 'tbl-007', table_no: 7, name: '比赛台',  status: 'idle', hourly_rate: 80 },
  { id: 'tbl-008', table_no: 8, name: '普台8',   status: 'idle', hourly_rate: 30 },
];

export const INITIAL_PRODUCTS: Product[] = [
  { id: 'p-cola',    name: '可口可乐', category: '饮料', price: 8,  stock: 100, active: true },
  { id: 'p-sprite',  name: '雪碧',     category: '饮料', price: 8,  stock: 100, active: true },
  { id: 'p-beer',    name: '青岛啤酒', category: '饮料', price: 15, stock: 80,  active: true },
  { id: 'p-redbull', name: '红牛',     category: '饮料', price: 12, stock: 60,  active: true },
  { id: 'p-tea',     name: '菊花茶',   category: '饮料', price: 10, stock: 50,  active: true },
  { id: 'p-chips',   name: '薯片',     category: '小吃', price: 12, stock: 40,  active: true },
  { id: 'p-peanut',  name: '花生',     category: '小吃', price: 10, stock: 40,  active: true },
  { id: 'p-noodle',  name: '方便面',   category: '小吃', price: 15, stock: 30,  active: true },
];

export const INITIAL_PACKAGES: Package[] = [
  { id: 'pkg-2h',   name: '2小时畅打',  duration_minutes: 120, original_price: 60,  package_price: 50,  applicable_tables: ['tbl-001','tbl-002','tbl-003','tbl-004','tbl-008'] },
  { id: 'pkg-3h',   name: '3小时畅打',  duration_minutes: 180, original_price: 90,  package_price: 72,  applicable_tables: ['tbl-001','tbl-002','tbl-003','tbl-004','tbl-008'] },
  { id: 'pkg-vip3', name: 'VIP3小时',   duration_minutes: 180, original_price: 150, package_price: 128, applicable_tables: ['tbl-005','tbl-006'] },
  { id: 'pkg-day',  name: '全天畅打',   duration_minutes: 600, original_price: 300, package_price: 198, applicable_tables: ['tbl-001','tbl-002','tbl-003','tbl-004','tbl-008'] },
];

export const INITIAL_MEMBERS: Member[] = [
  { id: 'm-001', name: '张先生', phone: '13800138001', level: 'gold',    balance: 500,  discount_rate: 0.85 },
  { id: 'm-002', name: '李女士', phone: '13900139002', level: 'silver',  balance: 200,  discount_rate: 0.90 },
  { id: 'm-003', name: '王总',   phone: '13700137003', level: 'diamond', balance: 2000, discount_rate: 0.75 },
];

export const INITIAL_OPERATORS: Operator[] = [
  { id: 'op-001', username: 'cashier', password_hash: btoa('123456'),  role: 'cashier', display_name: '前台小陈' },
  { id: 'op-002', username: 'admin',   password_hash: btoa('admin888'), role: 'admin',   display_name: '老板' },
];

export const DEFAULT_SETTINGS: Settings = {
  pause_reminder_minutes: 30,
  default_hourly_rate: 30,
  round_minutes: 1,
  round_mode: 'up',
  store_name: '精英台球俱乐部',
  print_footer: '感谢光临，欢迎下次再来！',
};
