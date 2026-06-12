import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Pill, 
  Clock, 
  AlertCircle, 
  CheckCircle2,
  User,
  Calendar,
  FileText,
  Info
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { StatusBadge } from '../components/status/StatusBadge';
import { RiskBadge } from '../components/status/RiskBadge';
import { useAuthStore } from '../store/useAuthStore';
import { useDataStore } from '../store/useDataStore';
import { formatDateCN, getWeekday, getRecentDays } from '../utils/format';
import { TIME_SLOT_CONFIG, STATUS_CONFIG, calculateAdherenceRate } from '../utils/analysis';
import type { MedicationAnalysis } from '../../shared/types';

export function ElderlyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { elderlyList, medications, analyzeElderlyMedications, getElderlyRisks } = useDataStore();
  
  const [selectedDate, setSelectedDate] = useState(formatDateCN(new Date()).replace(/年|月/g, '-').replace('日', ''));
  
  const elderly = elderlyList.find(e => e.id === id);
  const risks = getElderlyRisks();
  const risk = risks.find(r => r.elderlyId === id);

  const recentDays = getRecentDays(7).reverse();

  const records = useMemo(() => {
    if (!id) return [];
    const endDate = recentDays[0];
    const startDate = recentDays[recentDays.length - 1];
    return analyzeElderlyMedications(id, startDate, endDate);
  }, [id, analyzeElderlyMedications, recentDays]);

  const selectedDayRecords = useMemo(() => {
    return records.filter(r => r.date === selectedDate).sort((a, b) => {
      const slotOrder = ['breakfast', 'lunch', 'dinner', 'bedtime'];
      return slotOrder.indexOf(a.timeSlot) - slotOrder.indexOf(b.timeSlot);
    });
  }, [records, selectedDate]);

  const adherenceRate = useMemo(() => {
    return calculateAdherenceRate(records);
  }, [records]);

  const getMedicationName = (medId: string) => {
    const med = medications.find(m => m.id === medId);
    return med?.name || '未知药品';
  };

  if (!elderly) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">未找到老人信息</div>
        </div>
      </Layout>
    );
  }

  const isNurse = user?.role === 'nurse';

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{elderly.name}</h1>
            <p className="text-gray-500">
              {elderly.age}岁 · {elderly.gender === 'male' ? '男' : '女'} · {elderly.floor}楼{elderly.roomNumber}室
            </p>
          </div>
          {risk && <RiskBadge level={risk.riskLevel} />}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Pill className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{adherenceRate}%</div>
                <div className="text-xs text-gray-500">30天依从率</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{risk?.missedCount || 0}</div>
                <div className="text-xs text-gray-500">漏服次数</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{risk?.lateCount || 0}</div>
                <div className="text-xs text-gray-500">迟服次数</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <User className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {records.filter(r => r.status === 'supplemented').length}
                </div>
                <div className="text-xs text-gray-500">人工补录</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">服药记录</h2>
          
          <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
            {recentDays.map(date => {
              const dayRecords = records.filter(r => r.date === date);
              const hasAbnormal = dayRecords.some(r => 
                ['missed', 'late', 'conflict', 'offline'].includes(r.status)
              );
              const isSelected = selectedDate === date;
              
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`flex-shrink-0 px-4 py-3 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                      : hasAbnormal
                      ? 'bg-red-50 text-red-700 hover:bg-red-100'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium">{parseInt(date.split('-')[2])}日</div>
                  <div className={`text-xs ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>
                    {getWeekday(date)}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-4">
            {selectedDayRecords.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{formatDateCN(selectedDate)} 无服药记录</p>
              </div>
            ) : (
              selectedDayRecords.map(record => (
                <div
                  key={record.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    ['missed', 'late', 'conflict', 'offline'].includes(record.status)
                      ? 'border-red-200 bg-red-50/30 hover:bg-red-50/50'
                      : 'border-gray-100 bg-gray-50/30 hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${STATUS_CONFIG[record.status].color}15` }}
                      >
                        {record.status === 'taken' || record.status === 'supplemented' ? (
                          <CheckCircle2 className="w-6 h-6" style={{ color: STATUS_CONFIG[record.status].color }} />
                        ) : record.status === 'discontinued' ? (
                          <FileText className="w-6 h-6" style={{ color: STATUS_CONFIG[record.status].color }} />
                        ) : (
                          <AlertCircle className="w-6 h-6" style={{ color: STATUS_CONFIG[record.status].color }} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-3 mb-1">
                          <span className="font-semibold text-gray-900">
                            {record.medicationName || getMedicationName(record.medicationId)}
                          </span>
                          <StatusBadge status={record.status} size="sm" />
                          <span className="text-sm text-gray-500">
                            {TIME_SLOT_CONFIG[record.timeSlot].name}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center space-x-4">
                            <span>计划时间：{record.plannedTime}</span>
                            {record.actualTime && <span>实际时间：{record.actualTime}</span>}
                            {record.delayMinutes && (
                              <span className="text-orange-600">延迟 {record.delayMinutes} 分钟</span>
                            )}
                          </div>
                          {isNurse && (
                            <div className="flex items-start space-x-2 mt-2 p-3 bg-white/80 rounded-xl">
                              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700">{record.explanation}</span>
                            </div>
                          )}
                          {!isNurse && record.status !== 'discontinued' && (
                            <div className="flex items-start space-x-2 mt-2 p-3 bg-white/80 rounded-xl">
                              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700">{record.explanation}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isNurse && (record.pillboxRecord || record.nurseRecord || record.prescription) && (
                    <div className="mt-4 pt-4 border-t border-gray-200/50">
                      <div className="text-xs font-medium text-gray-500 mb-3">原始记录溯源</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {record.pillboxRecord && (
                          <div className="p-3 bg-blue-50 rounded-xl">
                            <div className="text-xs font-medium text-blue-700 mb-1">药盒打卡</div>
                            <div className="text-xs text-blue-600 space-y-0.5">
                              <div>设备：{record.pillboxRecord.deviceId}</div>
                              <div>时间：{record.pillboxRecord.timestamp}</div>
                              <div>状态：{record.pillboxRecord.deviceStatus === 'online' ? '在线' : 
                                       record.pillboxRecord.deviceStatus === 'offline' ? '离线' : '低电量'}</div>
                            </div>
                          </div>
                        )}
                        {record.nurseRecord && (
                          <div className="p-3 bg-purple-50 rounded-xl">
                            <div className="text-xs font-medium text-purple-700 mb-1">护理记录</div>
                            <div className="text-xs text-purple-600 space-y-0.5">
                              <div>护理员：{record.nurseRecord.nurseName}</div>
                              <div>时间：{record.nurseRecord.timestamp}</div>
                              <div>类型：{record.nurseRecord.type === 'supplement' ? '补服' : 
                                       record.nurseRecord.type === 'missed' ? '漏服' : '备注'}</div>
                              <div>备注：{record.nurseRecord.note}</div>
                            </div>
                          </div>
                        )}
                        {record.prescription && (
                          <div className="p-3 bg-green-50 rounded-xl">
                            <div className="text-xs font-medium text-green-700 mb-1">医嘱信息</div>
                            <div className="text-xs text-green-600 space-y-0.5">
                              <div>医生：{record.prescription.doctorName}</div>
                              <div>开始：{record.prescription.startDate}</div>
                              {record.prescription.endDate && <div>结束：{record.prescription.endDate}</div>}
                              <div>状态：{record.prescription.status === 'active' ? '有效' : 
                                         record.prescription.status === 'discontinued' ? '已停药' : '已完成'}</div>
                              {record.prescription.changeReason && <div>原因：{record.prescription.changeReason}</div>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
