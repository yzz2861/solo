import os

file1_content = r"""export interface Store {
  id: string;
  name: string;
  code: string;
  address: string;
  manager: string;
  teardownDate: string;
}

export interface SKU {
  id: string;
  name: string;
  code: string;
  category: '样品' | '赠品' | '试用装' | '正品';
  unit: string;
}

export interface InventoryQty {
  sample: number;
  gift: number;
  trial: number;
  damaged: number;
}

export interface StoreInventory {
  storeId: string;
  skuId: string;
  quantities: InventoryQty;
  lastUpdated: string;
  lastOperator: string;
}

export interface TransferItem {
  id: string;
  skuId: string;
  quantities: InventoryQty;
  remark: string;
}

export interface TransferOrder {
  id: string;
  orderNo: string;
  fromStoreId: string;
  toStoreId: string;
  status: 'draft' | 'pending' | 'completed' | 'cancelled';
  items: TransferItem[];
  operator: string;
  receiver: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string;
}

export interface LossPhoto {
  id: string;
  url: string;
  name: string;
  uploadedAt: string;
}

export interface LossRecord {
  id: string;
  storeId: string;
  skuId: string;
  quantity: number;
  type: 'unknown' | 'lost' | 'normal_trial';
  photos: LossPhoto[];
  remark: string;
  reporter: string;
  reportedAt: string;
  reviewer: string;
  reviewedAt: string;
}

export interface OperationLog {
  id: string;
  orderId: string;
  lossId: string;
  action: string;
  operator: string;
  timestamp: string;
  detail: string;
}

export interface ValidationError {
  field: string;
  message: string;
  level: 'error' | 'warning';
}

export interface AppFilters {
  storeId: string;
  category: string;
  status: string;
  dateRange: [string, string] | null;
  search: string;
}
"""

os.makedirs('/Users/bill/Documents/solo/workspaces/yzz100427/src/types', exist_ok=True)
with open('/Users/bill/Documents/solo/workspaces/yzz100427/src/types/index.ts', 'w', encoding='utf-8') as f:
    f.write(file1_content.lstrip('\n'))
print('FILE 1 done')
