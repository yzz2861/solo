import type { Store, SKU, StoreInventory, TransferOrder, LossRecord, OperationLog } from '@/types';

export const STORES: Store[] = [
  { id: 'store-a', name: 'A店·太古汇', code: 'A', address: '广州市天河区天河路383号太古汇B1', manager: '张小红', teardownDate: '2026-06-30' },
  { id: 'store-b', name: 'B店·正佳广场', code: 'B', address: '广州市天河区天河路228号正佳广场1F', manager: '李明辉', teardownDate: '2026-06-30' },
  { id: 'store-c', name: 'C店·天环广场', code: 'C', address: '广州市天河区天河路218号天环广场L1', manager: '王思远', teardownDate: '2026-06-25' },
];

export const SKUS: SKU[] = [
  { id: 'sku-001', name: '焕活精华液 30ml', code: 'SKU001', category: '正品', unit: '瓶' },
  { id: 'sku-002', name: '焕活精华液 5ml', code: 'SKU002', category: '试用装', unit: '支' },
  { id: 'sku-003', name: '水润面霜 50ml', code: 'SKU003', category: '正品', unit: '罐' },
  { id: 'sku-004', name: '水润面霜 5ml', code: 'SKU004', category: '试用装', unit: '支' },
  { id: 'sku-005', name: '限定帆布袋', code: 'SKU005', category: '赠品', unit: '个' },
  { id: 'sku-006', name: '限定明信片套装', code: 'SKU006', category: '赠品', unit: '套' },
  { id: 'sku-007', name: '焕活精华液 30ml（样）', code: 'SKU007', category: '样品', unit: '瓶' },
  { id: 'sku-008', name: '水润面霜 50ml（样）', code: 'SKU008', category: '样品', unit: '罐' },
];

export const INITIAL_INVENTORIES: StoreInventory[] = [
  { storeId: 'store-a', skuId: 'sku-001', quantities: { sample: 0, gift: 0, trial: 0, damaged: 0 }, lastUpdated: '2026-06-10T08:00:00Z', lastOperator: '张小红' },
  { storeId: 'store-a', skuId: 'sku-002', quantities: { sample: 0, gift: 0, trial: 200, damaged: 0 }, lastUpdated: '2026-06-10T08:00:00Z', lastOperator: '张小红' },
  { storeId: 'store-a', skuId: 'sku-003', quantities: { sample: 0, gift: 0, trial: 0, damaged: 2 }, lastUpdated: '2026-06-10T08:00:00Z', lastOperator: '张小红' },
  { storeId: 'store-a', skuId: 'sku-004', quantities: { sample: 0, gift: 0, trial: 150, damaged: 0 }, lastUpdated: '2026-06-10T08:00:00Z', lastOperator: '张小红' },
  { storeId: 'store-a', skuId: 'sku-005', quantities: { sample: 0, gift: 80, trial: 0, damaged: 0 }, lastUpdated: '2026-06-10T08:00:00Z', lastOperator: '张小红' },
  { storeId: 'store-a', skuId: 'sku-006', quantities: { sample: 0, gift: 50, trial: 0, damaged: 0 }, lastUpdated: '2026-06-10T08:00:00Z', lastOperator: '张小红' },
  { storeId: 'store-a', skuId: 'sku-007', quantities: { sample: 3, gift: 0, trial: 0, damaged: 1 }, lastUpdated: '2026-06-10T08:00:00Z', lastOperator: '张小红' },
  { storeId: 'store-a', skuId: 'sku-008', quantities: { sample: 3, gift: 0, trial: 0, damaged: 0 }, lastUpdated: '2026-06-10T08:00:00Z', lastOperator: '张小红' },
  { storeId: 'store-b', skuId: 'sku-001', quantities: { sample: 0, gift: 0, trial: 0, damaged: 1 }, lastUpdated: '2026-06-10T08:00:00Z', lastOperator: '李明辉' },
  { storeId: 'store-b', skuId: 'sku-002', quantities: { sample: 0, gift: 0, trial: 50, damaged: 0 }, lastUpdated: '2026-06-10T08:00:00Z', lastOperator: '李明辉' },
  { storeId: 'store-b', skuId: 'sku-003', quantities: { sample: 0, gift: 0, trial: 0, damaged: 0 }, lastUpdated: '2026-06-10T08:00:00Z', lastOperator: '李明辉' },
  { storeId: 'store-b', skuId: 'sku-004', quantities: { sample: 0, gift: 0, trial: 80, damaged: 3 }, lastUpdated: '2026-06-10T08:00:00Z', lastOperator: '李明辉' },
  { storeId: 'store-b', skuId: 'sku-005', quantities: { sample: 0, gift: 120, trial: 0, damaged: 0 }, lastUpdated: '2026-06-10T08:00:00Z', lastOperator: '李明辉' },
  { storeId: 'store-b', skuId: 'sku-006', quantities: { sample: 0, gift: 30, trial: 0, damaged: 2 }, lastUpdated: '2026-06-10T08:00:00Z', lastOperator: '李明辉' },
  { storeId: 'store-b', skuId: 'sku-007', quantities: { sample: 2, gift: 0, trial: 0, damaged: 0 }, lastUpdated: '2026-06-10T08:00:00Z', lastOperator: '李明辉' },
  { storeId: 'store-b', skuId: 'sku-008', quantities: { sample: 2, gift: 0, trial: 0, damaged: 1 }, lastUpdated: '2026-06-10T08:00:00Z', lastOperator: '李明辉' },
  { storeId: 'store-c', skuId: 'sku-001', quantities: { sample: 0, gift: 0, trial: 0, damaged: 0 }, lastUpdated: '2026-06-10T08:00:00Z', lastOperator: '王思远' },
  { storeId: 'store-c', skuId: 'sku-002', quantities: { sample: 0, gift: 0, trial: 300, damaged: 0 }, lastUpdated: '2026-06-10T08:00:00Z', lastOperator: '王思远' },
  { storeId: 'store-c', skuId: 'sku-003', quantities: { sample: 0, gift: 0, trial: 0, damaged: 0 }, lastUpdated: '2026-06-10T08:00:00Z', lastOperator: '王思远' },
  { storeId: 'store-c', skuId: 'sku-004', quantities: { sample: 0, gift: 0, trial: 200, damaged: 0 }, lastUpdated: '2026-06-10T08:00:00Z', lastOperator: '王思远' },
  { storeId: 'store-c', skuId: 'sku-005', quantities: { sample: 0, gift: 40, trial: 0, damaged: 0 }, lastUpdated: '2026-06-10T08:00:00Z', lastOperator: '王思远' },
  { storeId: 'store-c', skuId: 'sku-006', quantities: { sample: 0, gift: 60, trial: 0, damaged: 0 }, lastUpdated: '2026-06-10T08:00:00Z', lastOperator: '王思远' },
  { storeId: 'store-c', skuId: 'sku-007', quantities: { sample: 4, gift: 0, trial: 0, damaged: 0 }, lastUpdated: '2026-06-10T08:00:00Z', lastOperator: '王思远' },
  { storeId: 'store-c', skuId: 'sku-008', quantities: { sample: 4, gift: 0, trial: 0, damaged: 0 }, lastUpdated: '2026-06-10T08:00:00Z', lastOperator: '王思远' },
];

export const INITIAL_TRANSFERS: TransferOrder[] = [
  {
    id: 'tf-001',
    orderNo: 'TF-20260610-001',
    fromStoreId: 'store-c',
    toStoreId: 'store-a',
    status: 'completed',
    items: [
      { id: 'ti-001', skuId: 'sku-002', quantities: { sample: 0, gift: 0, trial: 50, damaged: 0 }, remark: '' },
    ],
    operator: '王思远',
    receiver: '张小红',
    remark: 'A店试用装不足，从C店紧急调拨',
    createdAt: '2026-06-10T10:30:00Z',
    updatedAt: '2026-06-10T14:00:00Z',
    completedAt: '2026-06-10T14:00:00Z',
  },
];

export const INITIAL_LOSS_RECORDS: LossRecord[] = [
  {
    id: 'loss-001',
    storeId: 'store-a',
    skuId: 'sku-003',
    quantity: 2,
    type: 'normal_trial',
    photos: [],
    remark: '顾客试用时不慎摔落，瓶身破裂',
    reporter: '张小红',
    reportedAt: '2026-06-11T16:20:00Z',
    reviewer: '运营-陈静',
    reviewedAt: '2026-06-11T18:00:00Z',
  },
];

export const INITIAL_OPERATION_LOGS: OperationLog[] = [
  {
    id: 'log-001',
    orderId: 'tf-001',
    lossId: '',
    action: '创建调拨单',
    operator: '王思远',
    timestamp: '2026-06-10T10:30:00Z',
    detail: '创建调拨单 TF-20260610-001，从C店调往A店',
  },
  {
    id: 'log-002',
    orderId: 'tf-001',
    lossId: '',
    action: '完成调拨',
    operator: '张小红',
    timestamp: '2026-06-10T14:00:00Z',
    detail: '确认收到50支焕活精华液5ml试用装',
  },
];
