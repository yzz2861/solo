import { useState, useMemo } from 'react';
import { Car, CheckCircle, XCircle, RefreshCw, Clock, Search, Sun, Cloud } from 'lucide-react';
import { useStore } from '../store/useStore';
import { VisitorCard } from '../components/VisitorCard';
import { PlateChangeModal } from '../components/PlateChangeModal';
import type { Visitor, TimeSlot } from '../types';
import { getTodayDateString, getCurrentTimeSlot, getTimeSlotLabel } from '../utils/dateUtils';
import { validatePlateNumber } from '../utils/plateValidator';

export default function GatePage() {
  const { visitors, checkInVisitor, checkOutVisitor } = useStore();
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot>(getCurrentTimeSlot());
  const [searchPlate, setSearchPlate] = useState('');
  const [changingPlateVisitor, setChangingPlateVisitor] = useState<Visitor | undefined>();
  const [quickSearch, setQuickSearch] = useState('');
  const [quickSearchResult, setQuickSearchResult] = useState<Visitor | null>(null);
  const [quickSearchError, setQuickSearchError] = useState('');

  const today = getTodayDateString();
  const isToday = selectedDate === today;

  const filteredVisitors = useMemo(() => {
    let result = visitors.filter((v) => {
      if (v.visitDate !== selectedDate) return false;
      if (v.timeSlot !== selectedSlot) return false;
      if (v.status === 'checked_out') return false;
      return true;
    });

    if (searchPlate.trim()) {
      const search = searchPlate.toUpperCase();
      result = result.filter((v) => v.plateNumber.includes(search));
    }

    return result.sort((a, b) => {
      if (a.status === 'arrived' && b.status !== 'arrived') return -1;
      if (a.status !== 'arrived' && b.status === 'arrived') return 1;
      return a.startTime.localeCompare(b.startTime);
    });
  }, [visitors, selectedDate, selectedSlot, searchPlate]);

  const pendingVisitors = filteredVisitors.filter((v) => v.status === 'pending');
  const arrivedVisitors = filteredVisitors.filter((v) => v.status === 'arrived' || v.status === 'overdue');

  const handleQuickSearch = () => {
    setQuickSearchError('');
    setQuickSearchResult(null);

    const plate = quickSearch.trim().toUpperCase();
    if (!plate) {
      setQuickSearchError('请输入车牌号码');
      return;
    }

    if (!validatePlateNumber(plate)) {
      setQuickSearchError('车牌格式不正确');
      return;
    }

    const found = visitors.find(
      (v) =>
        v.visitDate === today &&
        v.plateNumber === plate &&
        v.status !== 'checked_out'
    );

    if (found) {
      setQuickSearchResult(found);
    } else {
      setQuickSearchError('未找到该车牌的预约记录');
    }
  };

  const handleCheckIn = (id: string) => {
    if (confirm('确认车辆已到场？')) {
      checkInVisitor(id);
    }
  };

  const handleCheckOut = (id: string) => {
    if (confirm('确认车辆已离场？')) {
      checkOutVisitor(id);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">门岗放行</h1>
          <p className="text-gray-500 mt-1">查看当前时段可放行车牌，确认到场/离场</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary-500 to-primary-700 rounded-2xl p-6 mb-8 text-white">
        <h2 className="text-lg font-semibold mb-4">快速查询车牌</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60" />
            <input
              type="text"
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickSearch()}
              placeholder="输入车牌快速查询（如：粤A12345）"
              maxLength={8}
              className="w-full pl-12 pr-4 py-4 bg-white/20 border-2 border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-white/60 transition-colors font-mono text-lg tracking-wider"
            />
          </div>
          <button
            onClick={handleQuickSearch}
            className="px-8 py-4 bg-white text-primary-600 rounded-xl font-semibold hover:bg-white/90 transition-colors"
          >
            查询
          </button>
        </div>
        
        {quickSearchError && (
          <p className="mt-3 text-red-200 text-sm">{quickSearchError}</p>
        )}

        {quickSearchResult && (
          <div className="mt-4 bg-white/20 backdrop-blur rounded-xl p-4 animate-fade-in">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-3xl font-bold tracking-wider mb-2">
                  {quickSearchResult.plateNumber}
                </div>
                <div className="space-y-1 text-white/90">
                  <p><span className="opacity-70">来访单位：</span>{quickSearchResult.company}</p>
                  <p><span className="opacity-70">被访人：</span>{quickSearchResult.contactPerson}</p>
                  <p><span className="opacity-70">车位：</span>{quickSearchResult.parkingSpot}</p>
                  <p><span className="opacity-70">时段：</span>{quickSearchResult.startTime} - {quickSearchResult.endTime}</p>
                </div>
                {quickSearchResult.isPlateChanged && (
                  <p className="mt-2 text-accent-300 text-sm">
                    <RefreshCw size={14} className="inline mr-1" />
                    车牌已变更，原车牌：{quickSearchResult.originalPlateNumber}，批准人：{quickSearchResult.plateChangeApprover}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {quickSearchResult.status === 'pending' && (
                  <button
                    onClick={() => {
                      handleCheckIn(quickSearchResult.id);
                      setQuickSearchResult(null);
                      setQuickSearch('');
                    }}
                    className="px-4 py-2 bg-status-arrived text-white rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    <CheckCircle size={18} />
                    确认到场
                  </button>
                )}
                {quickSearchResult.status === 'arrived' && (
                  <button
                    onClick={() => {
                      handleCheckOut(quickSearchResult.id);
                      setQuickSearchResult(null);
                      setQuickSearch('');
                    }}
                    className="px-4 py-2 bg-status-pending text-white rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    <XCircle size={18} />
                    确认离场
                  </button>
                )}
                <button
                  onClick={() => setChangingPlateVisitor(quickSearchResult)}
                  className="px-4 py-2 bg-accent-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  <RefreshCw size={18} />
                  临时换车
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-4 py-2">
          <Clock size={18} className="text-primary-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border-none outline-none text-gray-700 font-medium bg-transparent"
          />
        </div>

        <div className="flex bg-white rounded-lg border border-gray-200 p-1">
          <button
            onClick={() => setSelectedSlot('morning')}
            className={`px-6 py-2 rounded-md font-medium transition-all flex items-center gap-2 ${
              selectedSlot === 'morning'
                ? 'bg-status-morning text-white'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Sun size={16} />
            上午
          </button>
          <button
            onClick={() => setSelectedSlot('afternoon')}
            className={`px-6 py-2 rounded-md font-medium transition-all flex items-center gap-2 ${
              selectedSlot === 'afternoon'
                ? 'bg-status-afternoon text-white'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Cloud size={16} />
            下午
          </button>
        </div>

        <div className="flex-1 min-w-[200px] relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchPlate}
            onChange={(e) => setSearchPlate(e.target.value)}
            placeholder="搜索车牌..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>
      </div>

      {isToday && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">当前时段</p>
                <p className="text-2xl font-bold">{getTimeSlotLabel(getCurrentTimeSlot())}</p>
              </div>
              <Car size={32} className="opacity-50" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">待放行</p>
                <p className="text-2xl font-bold">{pendingVisitors.length}</p>
              </div>
              <CheckCircle size={32} className="opacity-50" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">场内车辆</p>
                <p className="text-2xl font-bold">{arrivedVisitors.length}</p>
              </div>
              <Car size={32} className="opacity-50" />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {arrivedVisitors.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-status-arrived"></span>
              已到场车辆 ({arrivedVisitors.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {arrivedVisitors.map((visitor) => (
                <VisitorCard
                  key={visitor.id}
                  visitor={visitor}
                  onChangePlate={() => setChangingPlateVisitor(visitor)}
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-status-pending"></span>
            待放行车辆 ({pendingVisitors.length})
          </h2>
          {pendingVisitors.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center text-gray-400">
              <Car size={48} className="mx-auto mb-4 opacity-30" />
              <p>{getTimeSlotLabel(selectedSlot)}暂无待放行车辆</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingVisitors.map((visitor) => (
                <div key={visitor.id} className="relative">
                  <VisitorCard
                    visitor={visitor}
                    showActions={false}
                  />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button
                      onClick={() => handleCheckIn(visitor.id)}
                      className="px-4 py-2 bg-status-arrived text-white text-sm rounded-lg font-medium hover:opacity-90 transition-opacity shadow-lg flex items-center gap-1"
                    >
                      <CheckCircle size={16} />
                      放行
                    </button>
                    <button
                      onClick={() => setChangingPlateVisitor(visitor)}
                      className="p-2 bg-accent-500 text-white rounded-lg hover:opacity-90 transition-opacity shadow-lg"
                      title="临时换车"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {changingPlateVisitor && (
        <PlateChangeModal
          visitor={changingPlateVisitor}
          onClose={() => setChangingPlateVisitor(undefined)}
        />
      )}
    </div>
  );
}
