import Papa from 'papaparse';
import dayjs from 'dayjs';
import type { RecycleOrder } from '../types';
import { STATUS_LABEL } from '../types';

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    alert('当前没有可导出的数据');
    return;
  }
  const csv = Papa.unparse(rows);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportDailyRecycle(orders: RecycleOrder[], date?: Date) {
  const targetDay = date ?? new Date();
  const dayOrders = orders.filter((o) => dayjs(o.createdAt).isSame(targetDay, 'day'));
  const rows = dayOrders.map((o) => ({
    单号: o.id.slice(0, 8),
    创建时间: dayjs(o.createdAt).format('YYYY-MM-DD HH:mm'),
    品牌: o.brand,
    型号: o.model,
    容量: o.storage,
    颜色: o.color,
    成色: o.appearanceRating,
    序列号: o.serialNumber,
    IMEI: o.imei ?? '',
    初估价: o.initialPrice,
    成交价: o.finalPrice ?? '—',
    差价: o.finalPrice ? o.finalPrice - o.initialPrice : '—',
    议价次数: Math.max(0, o.priceHistory.length),
    状态: STATUS_LABEL[o.status],
    操作人: o.createdBy,
    序列号重复警告: o.duplicateSnWarning ? '是' : '否',
    账号锁退出: o.checkResult.account.idLoggedOut === 'pass' ? '是' : '否',
    电池健康: o.checkResult.battery.health + '%',
    隐私清除确认: o.privacyWiped ? '是' : '否',
  }));
  downloadCsv(`每日回收明细_${dayjs(targetDay).format('YYYYMMDD')}.csv`, rows);
}

export function exportBargainReasons(orders: RecycleOrder[]) {
  const changes = orders.flatMap((o) =>
    o.priceHistory.map((p) => ({
      单号: o.id.slice(0, 8),
      机型: `${o.brand} ${o.model}`,
      序列号: o.serialNumber,
      旧价: p.oldPrice,
      新价: p.newPrice,
      变动金额: p.newPrice - p.oldPrice,
      原因: p.reason || '未填写',
      操作人: p.operator,
      操作时间: dayjs(p.timestamp).format('YYYY-MM-DD HH:mm'),
    }))
  );
  const sorted = changes.sort((a, b) => b.变动金额 - a.变动金额);
  const summary: Array<Record<string, unknown>> = [
    { '===========': '==== 汇总统计 ====' },
    { 总议价次数: changes.length },
    { 平均变动金额: changes.length ? (changes.reduce((s, c) => s + c.变动金额, 0) / changes.length).toFixed(2) : '0' },
    { 最大让价: changes.length ? Math.min(...changes.map((c) => c.变动金额)) : 0 },
    { '===========': '==== 明细列表 ====' },
  ];
  downloadCsv(`让价原因汇总_${dayjs().format('YYYYMMDD_HHmm')}.csv`, [...summary, ...sorted] as any);
}

export function exportRiskMachines(orders: RecycleOrder[]) {
  const risks = orders.filter((o) => {
    const accountRisk = o.checkResult.account.idLoggedOut !== 'pass';
    const privacyRisk = !o.privacyWiped && ['pending_in', 'in_stock'].includes(o.status);
    const snRisk = o.duplicateSnWarning;
    const checkRisk =
      o.checkResult.water.indicator === 'fail' ||
      o.checkResult.battery.bulge === 'fail' ||
      o.checkResult.screen.crack === 'fail';
    return accountRisk || privacyRisk || snRisk || checkRisk;
  });
  const rows = risks.map((o) => ({
    单号: o.id.slice(0, 8),
    机型: `${o.brand} ${o.model}`,
    序列号: o.serialNumber,
    当前状态: STATUS_LABEL[o.status],
    账号锁风险: o.checkResult.account.idLoggedOut !== 'pass' ? '⚠️ 未退出' : '正常',
    隐私清除风险: o.privacyWiped ? '正常' : '⚠️ 未确认',
    序列号重复: o.duplicateSnWarning ? '⚠️ 重复' : '正常',
    硬件风险: [
      o.checkResult.screen.crack === 'fail' ? '屏幕碎裂' : '',
      o.checkResult.battery.bulge === 'fail' ? '电池鼓包' : '',
      o.checkResult.water.indicator === 'fail' ? '疑似进水' : '',
    ].filter(Boolean).join('、') || '正常',
    初估价: o.initialPrice,
    成交价: o.finalPrice ?? '—',
    创建时间: dayjs(o.createdAt).format('YYYY-MM-DD HH:mm'),
    操作人: o.createdBy,
  }));
  downloadCsv(`待处理风险机_${dayjs().format('YYYYMMDD_HHmm')}.csv`, rows);
}
