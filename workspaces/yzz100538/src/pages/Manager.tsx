import { useMemo } from 'react';
import Header from '@/components/layout/Header';
import StatsOverview from '@/components/manager/StatsOverview';
import CleaningAnalysis from '@/components/manager/CleaningAnalysis';
import ExportPanel from '@/components/manager/ExportPanel';
import { useBookingStore } from '@/store/bookingStore';
import { calculateDailyStats, calculateSlowRoomAnalysis } from '@/utils/statsCalculator';

export default function Manager() {
  const { bookings, rooms, packages, selectedDate } = useBookingStore();

  const stats = useMemo(() => {
    return calculateDailyStats(bookings, rooms, packages, selectedDate);
  }, [bookings, rooms, packages, selectedDate]);

  const slowRoomAnalysis = useMemo(() => {
    return calculateSlowRoomAnalysis(bookings, rooms, packages, 7);
  }, [bookings, rooms, packages]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 to-orange-50/30">
      <Header onAddBooking={() => {}} />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">店长数据分析</h2>
          <p className="text-gray-500">实时掌握运营数据，优化翻台效率</p>
        </div>

        <StatsOverview stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CleaningAnalysis analysis={slowRoomAnalysis} />
          <ExportPanel />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">包间营收排行</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    包间
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    预订次数
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    平均清台
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    总营收
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.roomStats
                  .sort((a, b) => b.totalRevenue - a.totalRevenue)
                  .map((room, index) => (
                    <tr key={room.roomId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-sm font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="font-medium text-gray-800">{room.roomName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-gray-600">
                        {room.bookings} 次
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {room.avgCleaningTime > 0 ? (
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              room.avgCleaningTime > 25
                                ? 'bg-red-100 text-red-700'
                                : room.avgCleaningTime > 15
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {room.avgCleaningTime} 分钟
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="font-bold text-amber-600">¥{room.totalRevenue}</span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
