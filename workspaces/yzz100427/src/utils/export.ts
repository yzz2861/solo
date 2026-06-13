import type { TransferOrder, LossRecord, Store, SKU, StoreInventory } from '@/types';

export function exportBalanceCSV(
  stores: Store[],
  skus: SKU[],
  inventories: StoreInventory[],
  transfers: TransferOrder[]
): string {
  const headers = ['门店', 'SKU编码', 'SKU名称', '品类', '样品', '赠品', '试用装', '残损品', '单位'];
  const rows = inventories.map((inv) => {
    const store = stores.find((s) => s.id === inv.storeId);
    const sku = skus.find((s) => s.id === inv.skuId);
    return [
      store?.name ?? '',
      sku?.code ?? '',
      sku?.name ?? '',
      sku?.category ?? '',
      inv.quantities.sample,
      inv.quantities.gift,
      inv.quantities.trial,
      inv.quantities.damaged,
      sku?.unit ?? '',
    ].join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

export function exportLossCSV(
  stores: Store[],
  skus: SKU[],
  lossRecords: LossRecord[]
): string {
  const headers = ['门店', 'SKU编码', 'SKU名称', '损耗数量', '损耗类型', '备注', '报告人', '报告时间', '审核人'];
  const typeMap: Record<string, string> = { unknown: '待确认', lost: '丢失', normal_trial: '正常试用' };
  const rows = lossRecords.map((r) => {
    const store = stores.find((s) => s.id === r.storeId);
    const sku = skus.find((s) => s.id === r.skuId);
    return [
      store?.name ?? '',
      sku?.code ?? '',
      sku?.name ?? '',
      r.quantity,
      typeMap[r.type] ?? r.type,
      r.remark,
      r.reporter,
      r.reportedAt,
      r.reviewer,
    ].join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

export function exportTransferCSV(
  stores: Store[],
  skus: SKU[],
  transfers: TransferOrder[]
): string {
  const headers = ['调拨单号', '调出门店', '调入门店', '状态', 'SKU名称', '样品', '赠品', '试用装', '残损', '经手人', '接收人', '创建时间', '完成时间'];
  const statusMap: Record<string, string> = { draft: '草稿', pending: '待确认', completed: '已完成', cancelled: '已取消' };
  const rows: string[] = [];
  transfers.forEach((t) => {
    const fromStore = stores.find((s) => s.id === t.fromStoreId);
    const toStore = stores.find((s) => s.id === t.toStoreId);
    t.items.forEach((item) => {
      const sku = skus.find((s) => s.id === item.skuId);
      rows.push([
        t.orderNo,
        fromStore?.name ?? '',
        toStore?.name ?? '',
        statusMap[t.status] ?? t.status,
        sku?.name ?? '',
        item.quantities.sample,
        item.quantities.gift,
        item.quantities.trial,
        item.quantities.damaged,
        t.operator,
        t.receiver,
        t.createdAt,
        t.completedAt,
      ].join(','));
    });
  });
  return [headers.join(','), ...rows].join('\n');
}

export function downloadCSV(content: string, filename: string) {
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
