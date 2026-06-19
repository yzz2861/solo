import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, Printer, BarChart3, RefreshCw, Calendar, Coffee } from 'lucide-react';
import { useBookingStore } from '@/store/bookingStore';
import { formatDateShort } from '@/utils/timeUtils';
import { generatePrintData } from '@/utils/exportUtils';

interface HeaderProps {
  onAddBooking: () => void;
}

export default function Header({ onAddBooking }: HeaderProps) {
  const location = useLocation();
  const { selectedDate, setSelectedDate, refreshAlerts, bookings, rooms, packages } = useBookingStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshAlerts();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handlePrint = () => {
    const printData = generatePrintData(bookings, rooms, packages, selectedDate);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>当日包间单 - ${printData.date}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: "Microsoft YaHei", sans-serif; padding: 20px; color: #333; }
          h1 { text-align: center; font-size: 24px; margin-bottom: 10px; color: #5D4E37; }
          .date { text-align: center; font-size: 16px; color: #666; margin-bottom: 20px; }
          .room-section { margin-bottom: 20px; border: 1px solid #ddd; break-inside: avoid; }
          .room-title { background: #5D4E37; color: white; padding: 8px 12px; font-size: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
          th { background: #f5f1e8; font-weight: normal; color: #666; }
          .empty { padding: 20px; text-align: center; color: #999; }
          @media print {
            body { padding: 10px; }
          }
        </style>
      </head>
      <body>
        <h1>🍵 当日包间单</h1>
        <p class="date">${printData.date}</p>
        ${printData.rooms
          .map(
            (room) => `
          <div class="room-section">
            <div class="room-title">${room.roomName}</div>
            ${room.bookings.length > 0
              ? `
              <table>
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>客人</th>
                    <th>套餐</th>
                    <th>人数</th>
                    <th>状态</th>
                    <th>备注</th>
                  </tr>
                </thead>
                <tbody>
                  ${room.bookings
                    .map(
                      (b) => `
                    <tr>
                      <td>${b.time}</td>
                      <td>${b.customer}</td>
                      <td>${b.package}</td>
                      <td>${b.guests}人</td>
                      <td>${b.status}</td>
                      <td>${b.notes || '-'}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            `
              : '<div class="empty">今日暂无预订</div>'}
          </div>
        `
          )
          .join('')}
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(new Date(e.target.value));
  };

  const formatDateInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const isManagerPage = location.pathname === '/manager';

  return (
    <header className="bg-gradient-to-r from-tea-900 to-tea-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Coffee className="w-8 h-8 text-amber-400" />
            <div>
              <h1 className="text-xl font-bold font-serif tracking-wide">茶馆包间翻台管理</h1>
              <p className="text-xs text-tea-200">实时掌控包间状态，高效翻台</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-tea-700/50 rounded-lg px-3 py-2">
              <Calendar className="w-4 h-4 text-amber-300" />
              <input
                type="date"
                value={formatDateInput(selectedDate)}
                onChange={handleDateChange}
                className="bg-transparent border-none text-white text-sm focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-3 py-2 bg-tea-700/50 hover:bg-tea-600/50 rounded-lg transition-all duration-200"
              title="刷新"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {!isManagerPage ? (
              <>
                <button
                  onClick={onAddBooking}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-tea-900 font-medium rounded-lg transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>新增预订</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-3 py-2 bg-tea-700/50 hover:bg-tea-600/50 rounded-lg transition-all duration-200"
                >
                  <Printer className="w-4 h-4" />
                  <span className="text-sm">打印当日单</span>
                </button>

                <Link
                  to="/manager"
                  className="flex items-center gap-2 px-3 py-2 bg-tea-700/50 hover:bg-tea-600/50 rounded-lg transition-all duration-200"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm">店长分析</span>
                </Link>
              </>
            ) : (
              <Link
                to="/"
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-tea-900 font-medium rounded-lg transition-all duration-200 hover:shadow-md"
              >
                <span>返回翻台页</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
