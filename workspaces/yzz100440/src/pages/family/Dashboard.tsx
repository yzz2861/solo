import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { StatusBadge } from '../../components/status/StatusBadge';
import { useAuthStore } from '../../store/useAuthStore';
import { useDataStore } from '../../store/useDataStore';
import { getMonthDays, formatDateCN, getWeekday, isToday } from '../../utils/format';
import { TIME_SLOT_CONFIG, STATUS_CONFIG, calculateAdherenceRate } from '../../utils/analysis';
import type { MedicationAnalysis } from '../../../shared/types';

export function FamilyDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { getElderlySummary, analyzeElderlyMedications, elderlyList } = useDataStore();

  const [currentMonth, setCurrentMonth] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  });

  const elderlyId = user?.elderlyIds?.[0] || elderlyList[0]?.id;
  const elderlyInfo = elderlyList.find(e => e.id === elderlyId);

  const summary = useMemo(() => {
    if (!elderlyId) return null;
    return getElderlySummary(elderlyId);
  }, [elderlyId, getElderlySummary]);

  const monthDays = useMemo(() => {
    return getMonthDays(currentMonth.year, currentMonth.month);
  }, [currentMonth]);

  const monthRecords = useMemo(() => {
    if (!elderlyId || monthDays.length === 0) return {};
    const startDate = monthDays[0];
    const endDate = monthDays[monthDays.length - 1];
    const records = analyzeElderlyMedications(elderlyId, startDate, endDate);
    
    const grouped: Record<string, MedicationAnalysis[]> = {};
    records.forEach(r => {
      if (!grouped[r.date]) grouped[r.date] = [];
      grouped[r.date].push(r);
    });
    return grouped;
  }, [elderlyId, monthDays, analyzeElderlyMedications]);

  const getDayStatus = (date: string): 'normal' | 'abnormal' | 'mixed' | 'none' => {
    const records = monthRecords[date];
    if (!records || records.length === 0) return 'none';
    
    const hasAbnormal = records.some(r => 
      ['missed', 'late', 'conflict', 'offline'].includes(r.status)
    );
    const hasNormal = records.some(r => 
      ['taken', 'supplemented', 'discontinued'].includes(r.status)
    );
    
    if (hasAbnormal && hasNormal) return 'mixed';
    if (hasAbnormal) return 'abnormal';
    return 'normal';
  };

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selectedRecords = selectedDate ? monthRecords[selectedDate] || [] : [];

  const prevMonth = () => {
    setCurrentMonth(prev => {
      const newMonth = prev.month - 1;
      if (newMonth < 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { ...prev, month: newMonth };
    });
  };

  const nextMonth = () => {
    setCurrentMonth(prev => {
      const newMonth = prev.month + 1;
      if (newMonth > 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { ...prev, month: newMonth };
    });
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const firstDayOfMonth = new Date(currentMonth.year, currentMonth.month, 1).getDay();
  const emptyDays = Array(firstDayOfMonth).fill(null);

  const statusColors = {
    normal: 'bg-green-100 border-green-300 text-green-700',
    abnormal: 'bg-red-100 border-red-300 text-red-700',
    mixed: 'bg-orange-100 border-orange-300 text-orange-700',
    none: 'bg-gray-50 border-gray-200 text-gray-400',
  };

  if (!summary || !elderlyInfo) {
    return (
      <Layout requiredRole="family">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-gray-400">加载中...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout requiredRole="family">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">服药概览</p>
              <h1 className="text-2xl font-bold mt-1">{elderlyInfo.name} 的服药记录</h1>
              <p className="text-blue-100 mt-2">
                {elderlyInfo.age}岁 · {elderlyInfo.gender === 'male' ? '男' : '女'} · {elderlyInfo.floor}楼{elderlyInfo.roomNumber}室
              </p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold">{summary.adherenceRate}%</div>
              <p className="text-blue-100 text-sm mt-1">本月依从率</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{summary.thisMonth.normal}</div>
                <div className="text-sm text-gray-500">正常服药</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{summary.thisMonth.abnormal}</div>
                <div className="text-sm text-gray-500">异常记录</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{summary.thisMonth.total}</div>
                <div className="text-sm text-gray-500">总服药次数</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">服药日历</h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <span className="font-medium text-gray-900 min-w-[120px] text-center">
                {currentMonth.year}年{currentMonth.month + 1}月
              </span>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {emptyDays.map((_, idx) => (
              <div key={`empty-${idx}`} className="aspect-square" />
            ))}
            {monthDays.map(date => {
              const status = getDayStatus(date);
              const isSelected = selectedDate === date;
              const records = monthRecords[date] || [];
              
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(isSelected ? null : date)}
                  className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all hover:scale-105 ${
                    statusColors[status]
                  } ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 scale-105' : ''} ${
                    isToday(date) ? 'font-bold' : ''
                  }`}
                >
                  <span className={`text-lg ${isToday(date) ? 'text-blue-600' : ''}`}>
                    {parseInt(date.split('-')[2])}
                  </span>
                  {records.length > 0 && (
                    <div className="flex space-x-0.5 mt-1">
                      {records.slice(0, 3).map((r, i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: STATUS_CONFIG[r.status].color }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-center space-x-6 mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded bg-green-100 border border-green-300" />
              <span className="text-sm text-gray-600">全部正常</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded bg-orange-100 border border-orange-300" />
              <span className="text-sm text-gray-600">部分异常</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded bg-red-100 border border-red-300" />
              <span className="text-sm text-gray-600">全部异常</span>
            </div>
          </div>
        </div>

        {selectedDate && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                {formatDateCN(selectedDate)} · {getWeekday(selectedDate)}
              </h3>
              <button
                onClick={() => navigate(`/elderly/${elderlyId}`)}
                className="text-sm text-blue-500 hover:text-blue-600 flex items-center"
              >
                查看完整记录 <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {selectedRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Info className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>当日无服药记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedRecords.map(record => (
                  <div
                    key={record.id}
                    className={`p-4 rounded-xl border ${
                      ['missed', 'late', 'conflict'].includes(record.status)
                        ? 'border-red-200 bg-red-50/50'
                        : 'border-gray-100 bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${STATUS_CONFIG[record.status].color}15` }}
                        >
                          {['taken', 'supplemented'].includes(record.status) ? (
                            <CheckCircle2 className="w-5 h-5" style={{ color: STATUS_CONFIG[record.status].color }} />
                          ) : ['missed', 'conflict'].includes(record.status) ? (
                            <AlertCircle className="w-5 h-5" style={{ color: STATUS_CONFIG[record.status].color }} />
                          ) : (
                            <Clock className="w-5 h-5" style={{ color: STATUS_CONFIG[record.status].color }} />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {record.medicationName}
                          </div>
                          <div className="text-sm text-gray-500 mt-0.5">
                            {TIME_SLOT_CONFIG[record.timeSlot].name} · 计划 {record.plannedTime}
                            {record.actualTime && ` · 实际 ${record.actualTime}`}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={record.status} size="sm" />
                    </div>
                    <div className="mt-3 text-sm text-gray-600 pl-13">
                      <div className="flex items-start space-x-2">
                        <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span>{record.explanation}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">最近记录</h2>
          <div className="space-y-3">
            {summary.recentRecords.slice(-5).reverse().map(record => (
              <div
                key={record.id}
                className="flex items-center p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 text-center mr-4">
                  <div className="text-lg font-bold text-gray-900">
                    {parseInt(record.date.split('-')[2])}
                  </div>
                  <div className="text-xs text-gray-400">
                    {record.date.split('-')[1]}月
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{record.medicationName}</span>
                    <span className="text-xs text-gray-400">
                      {TIME_SLOT_CONFIG[record.timeSlot].name}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {record.explanation}
                  </div>
                </div>
                <StatusBadge status={record.status} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
