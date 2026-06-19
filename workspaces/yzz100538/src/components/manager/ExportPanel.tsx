import { Download, FileText, BarChart3 } from 'lucide-react';
import { useBookingStore } from '@/store/bookingStore';
import { exportBookingsCSV, exportRevenueCSV } from '@/utils/exportUtils';

export default function ExportPanel() {
  const { bookings, rooms, packages } = useBookingStore();

  const handleExportBookings = () => {
    exportBookingsCSV(bookings, rooms, packages);
  };

  const handleExportRevenue = () => {
    exportRevenueCSV(bookings, rooms, packages);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-100 rounded-lg">
          <Download className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h3 className="font-bold text-gray-800">数据导出</h3>
          <p className="text-sm text-gray-500">导出CSV格式数据，方便Excel分析</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={handleExportBookings}
          className="flex items-center gap-4 p-4 border-2 border-gray-200 hover:border-tea-400 hover:bg-tea-50 rounded-xl transition-all group"
        >
          <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-left">
            <h4 className="font-medium text-gray-800">预订记录</h4>
            <p className="text-sm text-gray-500">包含所有预订详情、时间、金额等</p>
          </div>
        </button>

        <button
          onClick={handleExportRevenue}
          className="flex items-center gap-4 p-4 border-2 border-gray-200 hover:border-tea-400 hover:bg-tea-50 rounded-xl transition-all group"
        >
          <div className="p-3 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors">
            <BarChart3 className="w-6 h-6 text-amber-600" />
          </div>
          <div className="text-left">
            <h4 className="font-medium text-gray-800">营收统计</h4>
            <p className="text-sm text-gray-500">按包间统计营收和加钟收入</p>
          </div>
        </button>
      </div>
    </div>
  );
}
