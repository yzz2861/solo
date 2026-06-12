import type { WeddingCarOrder, FlowerItem } from '@/types';
import { todayStr } from './dateUtils';

const BOM = '\ufeff';

const escapeCsv = (v: string | number): string => {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const toRow = (cols: (string | number)[]): string => cols.map(escapeCsv).join(',') + '\n';

export interface CostRow {
  花材: string;
  分类: string;
  用量: number;
  单位: string;
  单价: number;
  小计: number;
}

export interface AnomalyRow {
  新人: string;
  车牌: string;
  到店时间: string;
  异常类型: string;
  备注: string;
}

export const aggregateCost = (orders: WeddingCarOrder[], flowers: FlowerItem[], date?: string): CostRow[] => {
  const targetDate = date || todayStr();
  const targetOrders = orders.filter(o => o.date === targetDate);
  const map = new Map<string, { quantity: number; flower: FlowerItem }>();
  targetOrders.forEach(o => {
    o.flowers.forEach(of => {
      const f = flowers.find(ff => ff.id === of.flowerId);
      if (!f) return;
      const cur = map.get(f.id) || { quantity: 0, flower: f };
      cur.quantity += of.quantity;
      map.set(f.id, cur);
    });
  });
  return Array.from(map.values())
    .map(v => ({
      花材: v.flower.name,
      分类: v.flower.category,
      用量: v.quantity,
      单位: v.flower.unit,
      单价: v.flower.price,
      小计: v.quantity * v.flower.price,
    }))
    .sort((a, b) => a.分类.localeCompare(b.分类));
};

export const aggregateAnomalies = (orders: WeddingCarOrder[], date?: string): AnomalyRow[] => {
  const targetDate = date || todayStr();
  const rows: AnomalyRow[] = [];
  orders
    .filter(o => o.date === targetDate)
    .forEach(o => {
      const list = [...o.anomalies];
      if (o.driverArrivedTime && o.status !== 'delivered') {
        list.push(`司机于${o.driverArrivedTime}提前到店`);
      }
      if (list.length === 0) return;
      list.forEach(a => {
        rows.push({
          新人: o.coupleName,
          车牌: o.plateNumber,
          到店时间: o.arrivalTime,
          异常类型: a.includes('司机') ? '司机早到' : (a.includes('库存') ? '库存应急' : '其他'),
          备注: a,
        });
      });
    });
  return rows;
};

export const exportCostCsv = (costRows: CostRow[], date: string): string => {
  let csv = BOM;
  csv += `# 成本明细 - ${date}\n`;
  csv += toRow(['花材', '分类', '用量', '单位', '单价(元)', '小计(元)']);
  let total = 0;
  costRows.forEach(r => {
    total += r.小计;
    csv += toRow([r.花材, r.分类, r.用量, r.单位, r.单价, r.小计]);
  });
  csv += toRow(['合计', '', '', '', '', total]);
  return csv;
};

export const exportAnomalyCsv = (anomalyRows: AnomalyRow[], date: string): string => {
  let csv = BOM;
  csv += `# 异常记录 - ${date}\n`;
  csv += toRow(['新人', '车牌', '到店时间', '异常类型', '备注']);
  anomalyRows.forEach(r => {
    csv += toRow([r.新人, r.车牌, r.到店时间, r.异常类型, r.备注]);
  });
  return csv;
};

export const downloadCsv = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
