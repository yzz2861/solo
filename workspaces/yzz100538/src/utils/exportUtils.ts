import type { Booking, Room, Package } from '@/types';
import { formatDate, formatTime, formatDuration } from './timeUtils';

const toCSV = (rows: string[][]): string => {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(',')
    )
    .join('\n');
};

export const exportBookingsCSV = (
  bookings: Booking[],
  rooms: Room[],
  packages: Package[]
): void => {
  const headers = [
    '预订ID',
    '包间',
    '套餐',
    '客人姓名',
    '联系电话',
    '人数',
    '预计到店',
    '预计结束',
    '实际到店',
    '实际结束',
    '加钟时长',
    '加钟费用',
    '套餐价格',
    '总金额',
    '状态',
    '套餐是否备齐',
    '清台开始',
    '清台结束',
    '清台时长',
    '备注',
    '创建时间',
  ];

  const rows = bookings.map((b) => {
    const room = rooms.find((r) => r.id === b.roomId);
    const pkg = packages.find((p) => p.id === b.packageId);
    const totalPrice = (pkg?.price || 0) + b.extendedFee;
    const cleaningDuration =
      b.cleaningStart && b.cleaningEnd
        ? formatDuration(
            (new Date(b.cleaningEnd).getTime() - new Date(b.cleaningStart).getTime()) / 60000
          )
        : '';

    return [
      b.id,
      room?.name || '',
      pkg?.name || '',
      b.customerName,
      b.customerPhone,
      String(b.guestCount),
      formatDateTime(b.scheduledArrival),
      formatDateTime(b.scheduledEnd),
      b.actualArrival ? formatDateTime(b.actualArrival) : '',
      b.actualEnd ? formatDateTime(b.actualEnd) : '',
      formatDuration(b.extendedMinutes),
      `¥${b.extendedFee}`,
      pkg ? `¥${pkg.price}` : '',
      `¥${totalPrice}`,
      statusToChinese(b.status),
      b.packageReady ? '是' : '否',
      b.cleaningStart ? formatDateTime(b.cleaningStart) : '',
      b.cleaningEnd ? formatDateTime(b.cleaningEnd) : '',
      cleaningDuration,
      b.notes,
      formatDateTime(b.createdAt),
    ];
  });

  const csvContent = toCSV([headers, ...rows]);
  downloadFile(csvContent, `包间预订记录_${formatDate(new Date().toISOString())}.csv`, 'text/csv');
};

export const exportRevenueCSV = (
  bookings: Booking[],
  rooms: Room[],
  packages: Package[]
): void => {
  const roomStats = new Map<string, { bookings: number; revenue: number; extendRevenue: number }>();

  for (const room of rooms) {
    roomStats.set(room.id, { bookings: 0, revenue: 0, extendRevenue: 0 });
  }

  for (const booking of bookings) {
    if (booking.status === 'cancelled') continue;
    const stat = roomStats.get(booking.roomId);
    const pkg = packages.find((p) => p.id === booking.packageId);
    if (stat && pkg) {
      stat.bookings++;
      stat.revenue += pkg.price + booking.extendedFee;
      stat.extendRevenue += booking.extendedFee;
    }
  }

  const headers = ['包间', '预订次数', '总营收', '加钟收入', '加钟占比'];
  const rows = Array.from(roomStats.entries()).map(([roomId, stat]) => {
    const room = rooms.find((r) => r.id === roomId);
    const extendRatio = stat.revenue > 0 ? ((stat.extendRevenue / stat.revenue) * 100).toFixed(1) + '%' : '0%';
    return [room?.name || '', String(stat.bookings), `¥${stat.revenue}`, `¥${stat.extendRevenue}`, extendRatio];
  });

  const totalBookings = bookings.filter((b) => b.status !== 'cancelled').length;
  const totalRevenue = rows.reduce((sum, r) => sum + parseInt(r[2].replace('¥', '')), 0);
  const totalExtend = rows.reduce((sum, r) => sum + parseInt(r[3].replace('¥', '')), 0);
  const totalRatio = totalRevenue > 0 ? ((totalExtend / totalRevenue) * 100).toFixed(1) + '%' : '0%';

  rows.push(['合计', String(totalBookings), `¥${totalRevenue}`, `¥${totalExtend}`, totalRatio]);

  const csvContent = toCSV([headers, ...rows]);
  downloadFile(csvContent, `营收统计_${formatDate(new Date().toISOString())}.csv`, 'text/csv');
};

const statusToChinese = (status: string): string => {
  const map: Record<string, string> = {
    pending: '待到店',
    'checked-in': '已到店',
    'in-use': '使用中',
    completed: '已完成',
    cancelled: '已取消',
  };
  return map[status] || status;
};

const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob(['\uFEFF' + content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const generatePrintData = (
  bookings: Booking[],
  rooms: Room[],
  packages: Package[],
  date: Date = new Date()
): {
  date: string;
  rooms: Array<{
    roomName: string;
    bookings: Array<{
      time: string;
      customer: string;
      package: string;
      guests: number;
      status: string;
      notes: string;
    }>;
  }>;
} => {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const todayBookings = bookings.filter((b) => {
    const arrival = new Date(b.scheduledArrival);
    return arrival >= dayStart && arrival <= dayEnd;
  });

  const roomList = rooms.map((room) => {
    const roomBookings = todayBookings
      .filter((b) => b.roomId === room.id && b.status !== 'cancelled')
      .sort((a, b) => (a.scheduledArrival > b.scheduledArrival ? 1 : -1))
      .map((b) => {
        const pkg = packages.find((p) => p.id === b.packageId);
        return {
          time: `${formatTime(b.scheduledArrival)}-${formatTime(b.scheduledEnd)}`,
          customer: b.customerName,
          package: pkg?.name || '',
          guests: b.guestCount,
          status: statusToChinese(b.status),
          notes: b.notes,
        };
      });

    return {
      roomName: room.name,
      bookings: roomBookings,
    };
  });

  return {
    date: formatDate(date.toISOString()),
    rooms: roomList,
  };
};
