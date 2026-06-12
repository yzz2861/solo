import { Reservation, Maintenance } from '../types';
import { format, parseISO } from 'date-fns';

function toCSVRow(values: (string | number)[]): string {
  return values
    .map((v) => {
      const s = String(v ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    })
    .join(',') + '\n';
}

function downloadCSV(filename: string, content: string) {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportTomorrowWorksheet(reservations: Reservation[], tomorrowStr: string) {
  const data = reservations
    .filter((r) => r.workDate === tomorrowStr && r.status !== '已取消')
    .sort((a, b) => {
      if (a.driverId === b.driverId) {
        return a.startTime.localeCompare(b.startTime);
      }
      return a.driverName.localeCompare(b.driverName);
    });

  let csv = '';
  csv += `农机共享预约台 - 明日(${tomorrowStr})作业单\n`;
  csv += toCSVRow([
    '序号', '作业日期', '农户姓名', '联系电话', '村组',
    '地块名称', '亩数', '位置', '作业类型',
    '农机编号', '农机类型', '司机姓名', '司机电话',
    '开始时间', '预计时长(小时)', '预计油费(元)', '顺序号',
  ]);

  data.forEach((r, idx) => {
    csv += toCSVRow([
      idx + 1, r.workDate, r.farmerName, r.farmerPhone, r.farmerVillage,
      r.plotName, r.plotAcres, r.plotLocation, r.workType,
      r.machineName, r.machineType, r.driverName, r.driverPhone,
      r.startTime, r.durationHours, r.estimatedFuel, r.sequence,
    ]);
  });

  csv += '\n';
  csv += `合计作业数,${data.length},,总工时,${data.reduce((s, r) => s + r.durationHours, 0).toFixed(1)},,总油费,${data.reduce((s, r) => s + r.estimatedFuel, 0)}\n`;

  downloadCSV(`明日作业单_${tomorrowStr}.csv`, csv);
}

export function exportFinanceReport(
  reservations: Reservation[],
  startDate: string,
  endDate: string
) {
  const inRange = (d: string) => d >= startDate && d <= endDate;
  const valid = reservations.filter(
    (r) => inRange(r.workDate) && r.status !== '已取消'
  );
  const canceled = reservations.filter(
    (r) => inRange(r.workDate) && r.status === '已取消'
  );

  const byMachineDriver: Record<string, {
    machineId: string; machineName: string;
    driverId: string; driverName: string;
    count: number; hours: number; fuel: number;
    date: string;
  }> = {};

  valid.forEach((r) => {
    const key = `${r.workDate}__${r.machineId}__${r.driverId}`;
    if (!byMachineDriver[key]) {
      byMachineDriver[key] = {
        machineId: r.machineId, machineName: r.machineName,
        driverId: r.driverId, driverName: r.driverName,
        count: 0, hours: 0, fuel: 0, date: r.workDate,
      };
    }
    byMachineDriver[key].count++;
    byMachineDriver[key].hours += r.durationHours;
    byMachineDriver[key].fuel += r.estimatedFuel;
  });

  let csv = '';
  csv += `财务汇总表（时段：${startDate} 至 ${endDate}）\n`;
  csv += '===== Sheet1: 油费工时汇总 =====\n';
  csv += toCSVRow([
    '日期', '农机编号', '司机姓名', '作业次数',
    '总工时(小时)', '总油费(元)',
  ]);
  Object.values(byMachineDriver)
    .sort((a, b) => a.date.localeCompare(b.date) || a.machineName.localeCompare(b.machineName))
    .forEach((r) => {
      csv += toCSVRow([
        r.date, r.machineName, r.driverName,
        r.count, r.hours.toFixed(1), r.fuel,
      ]);
    });

  const totalHours = valid.reduce((s, r) => s + r.durationHours, 0);
  const totalFuel = valid.reduce((s, r) => s + r.estimatedFuel, 0);
  csv += toCSVRow(['合计', '', '', valid.length, totalHours.toFixed(1), totalFuel]);

  csv += '\n===== Sheet2: 已取消预约明细 =====\n';
  csv += toCSVRow([
    '取消记录时间', '原作业日期', '农户姓名', '地块名称',
    '农机', '司机', '取消原因',
  ]);
  canceled
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    .forEach((r) => {
      csv += toCSVRow([
        format(parseISO(r.updatedAt), 'yyyy-MM-dd HH:mm'),
        r.workDate, r.farmerName, r.plotName,
        r.machineName, r.driverName, r.cancelReason || '',
      ]);
    });

  csv += `\n已取消预约总数,${canceled.length}\n`;

  downloadCSV(`财务汇总_${startDate}_${endDate}.csv`, csv);
}

export function exportDriverWorksheet(
  reservations: Reservation[],
  dateStr: string
) {
  const byDriver: Record<string, Reservation[]> = {};
  reservations
    .filter((r) => r.workDate === dateStr && r.status !== '已取消')
    .forEach((r) => {
      if (!byDriver[r.driverId]) byDriver[r.driverId] = [];
      byDriver[r.driverId].push(r);
    });

  let csv = '';
  csv += `司机作业顺序单 - ${dateStr}\n\n`;

  Object.values(byDriver).forEach((list) => {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    const driver = list[0];
    csv += `【${driver.driverName}】 电话: ${driver.driverPhone}\n`;
    csv += toCSVRow([
      '顺序', '到达时间', '地块名称', '位置', '亩数',
      '农户姓名', '联系电话', '作业类型',
      '农机', '预计时长(小时)', '预计油费(元)', '备注',
    ]);
    list.forEach((r, idx) => {
      csv += toCSVRow([
        idx + 1, r.startTime, r.plotName, r.plotLocation, r.plotAcres,
        r.farmerName, r.farmerPhone, r.workType,
        r.machineName, r.durationHours, r.estimatedFuel,
        r.rescheduleFrom ? `改期自:${r.rescheduleFrom}` : '',
      ]);
    });
    csv += '\n';
  });

  downloadCSV(`司机作业单_${dateStr}.csv`, csv);
}

export function exportMaintenanceReport(maintenances: Maintenance[]) {
  let csv = '';
  csv += '农机维修记录\n';
  csv += toCSVRow(['编号', '农机名称', '开始日期', '预计结束', '实际状态', '原因', '登记时间']);
  maintenances
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .forEach((m, idx) => {
      csv += toCSVRow([
        idx + 1, m.machineName, m.startDate, m.endDate,
        m.status, m.reason,
        format(parseISO(m.createdAt), 'yyyy-MM-dd HH:mm'),
      ]);
    });
  downloadCSV(`维修记录_${format(new Date(), 'yyyyMMdd')}.csv`, csv);
}
