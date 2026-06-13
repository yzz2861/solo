import { useState, useEffect, useCallback } from 'react';
import { managerApi, accidentApi, getPhotoUrl } from '../api/client.js';
import { AccidentStatus, Accident, AuditLog } from '../../shared/types.js';
import { formatDate, formatMoney, getStatusLabel } from '../utils/format.js';
import StatusBadge from '../components/StatusBadge.js';
import { useNavigate, Link } from 'react-router-dom';
import {
  Download,
  AlertTriangle,
  Clock,
  FileText,
  Shield,
  Camera,
  DollarSign,
  ChevronRight,
  Eye
} from 'lucide-react';

type TabKey = 'unclosed' | 'overdue' | 'disputed';

interface AuditTimelineData {
  photoEvents: AuditLog[];
  feeEvents: AuditLog[];
}

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('unclosed');

  const [unclosedList, setUnclosedList] = useState<Accident[]>([]);
  const [overdueList, setOverdueList] = useState<Accident[]>([]);
  const [disputedList, setDisputedList] = useState<Accident[]>([]);
  const [loading, setLoading] = useState(true);

  const [timelineAccidentId, setTimelineAccidentId] = useState('');
  const [timelineData, setTimelineData] = useState<AuditTimelineData | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const loadAllLists = useCallback(async () => {
    setLoading(true);
    try {
      const [unclosed, overdue, disputed] = await Promise.all([
        managerApi.getUnclosed(),
        managerApi.getOverdue(),
        managerApi.getDisputed()
      ]);
      setUnclosedList(unclosed);
      setOverdueList(overdue);
      setDisputedList(disputed);
    } catch (err) {
      console.error('Failed to load lists:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllLists();
  }, [loadAllLists]);

  const handleExport = async (type: TabKey) => {
    try {
      const blob = await managerApi.export(type);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleClose = async (id: string) => {
    try {
      await managerApi.closeAccident(id);
      await loadAllLists();
    } catch (err) {
      console.error('Close failed:', err);
    }
  };

  const handleMarkDisputed = async (id: string) => {
    try {
      await managerApi.markDisputed(id);
      await loadAllLists();
    } catch (err) {
      console.error('Mark disputed failed:', err);
    }
  };

  const handleLoadTimeline = async () => {
    if (!timelineAccidentId.trim()) return;
    setTimelineLoading(true);
    try {
      const data = await managerApi.getAuditTimeline(timelineAccidentId.trim());
      setTimelineData({
        photoEvents: data.photoEvents || [],
        feeEvents: data.feeEvents || []
      });
    } catch (err) {
      console.error('Timeline load failed:', err);
      setTimelineData(null);
    } finally {
      setTimelineLoading(false);
    }
  };

  const getLastPhotoTimeBefore = (feeTime: Date | string): Date | null => {
    if (!timelineData || timelineData.photoEvents.length === 0) return null;
    const feeDate = new Date(feeTime).getTime();
    let last: Date | null = null;
    for (const pe of timelineData.photoEvents) {
      const peDate = new Date(pe.timestamp).getTime();
      if (peDate <= feeDate) {
        last = new Date(pe.timestamp);
      }
    }
    return last;
  };

  const isFeeChangeSuspicious = (feeTime: Date | string): boolean => {
    const lastPhotoTime = getLastPhotoTimeBefore(feeTime);
    if (!lastPhotoTime) return false;
    const diffMs = new Date(feeTime).getTime() - lastPhotoTime.getTime();
    return diffMs > 60 * 60 * 1000;
  };

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'unclosed', label: '未结案清单', count: unclosedList.length },
    { key: 'overdue', label: '超期定损清单', count: overdueList.length },
    { key: 'disputed', label: '扣款争议清单', count: disputedList.length }
  ];

  const currentList =
    activeTab === 'unclosed'
      ? unclosedList
      : activeTab === 'overdue'
        ? overdueList
        : disputedList;

  const renderTable = (list: Accident[], showOverdueDays: boolean) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Clock className="w-5 h-5 animate-spin mr-2" />
          加载中...
        </div>
      );
    }

    if (list.length === 0) {
      return (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <FileText className="w-5 h-5 mr-2" />
          暂无数据
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="text-left py-3 px-4 font-medium">车牌号</th>
              <th className="text-left py-3 px-4 font-medium">客户</th>
              <th className="text-left py-3 px-4 font-medium">事故时间</th>
              <th className="text-left py-3 px-4 font-medium">状态</th>
              <th className="text-left py-3 px-4 font-medium">定损金额</th>
              <th className="text-left py-3 px-4 font-medium">扣款金额</th>
              {showOverdueDays && (
                <th className="text-left py-3 px-4 font-medium">超期天数</th>
              )}
              <th className="text-left py-3 px-4 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((accident) => (
              <tr
                key={accident.id}
                className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                  showOverdueDays && accident.isOverdue
                    ? 'border-l-4 border-l-red-500'
                    : ''
                }`}
              >
                <td className="py-3 px-4 font-medium text-slate-800">
                  {accident.plateNumber}
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {accident.customerName}
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {formatDate(accident.accidentTime)}
                </td>
                <td className="py-3 px-4">
                  <StatusBadge
                    status={accident.status}
                    isOverdue={accident.isOverdue}
                  />
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {formatMoney(accident.assessmentAmount)}
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {formatMoney(accident.deductionAmount)}
                </td>
                {showOverdueDays && (
                  <td className="py-3 px-4">
                    {accident.overdueDays ? (
                      <span className="text-red-600 font-semibold">
                        {accident.overdueDays}天
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                )}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/accidents/${accident.id}`}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      查看
                    </Link>
                    <button
                      onClick={() => handleClose(accident.id)}
                      className="btn-success text-xs px-2.5 py-1.5 rounded-md font-medium"
                    >
                      结案
                    </button>
                    <button
                      onClick={() => handleMarkDisputed(accident.id)}
                      className="btn-warning text-xs px-2.5 py-1.5 rounded-md font-medium"
                    >
                      标记争议
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-7 h-7 text-slate-800" />
          <h1 className="text-2xl font-bold text-slate-900">经理工作台</h1>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between border-b border-slate-200">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-5 py-3.5 text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.key
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:text-slate-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  {tab.label}
                  <span
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                      activeTab === tab.key
                        ? 'bg-white text-slate-900'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={() => handleExport(activeTab)}
            className="btn-secondary flex items-center gap-1.5 text-sm px-3 py-2 mr-4 rounded-lg"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
        </div>

        <div className="p-0">
          {renderTable(
            currentList,
            activeTab === 'overdue'
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-5 h-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">
            审计时间线对比
          </h2>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <input
            type="text"
            value={timelineAccidentId}
            onChange={(e) => setTimelineAccidentId(e.target.value)}
            placeholder="输入事故ID"
            className="flex-1 max-w-xs border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLoadTimeline();
            }}
          />
          <button
            onClick={handleLoadTimeline}
            disabled={timelineLoading}
            className="flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <Eye className="w-4 h-4" />
            查看
          </button>
        </div>

        {timelineData && (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                <Camera className="w-4 h-4" />
                照片上传记录
              </h3>
              {timelineData.photoEvents.length === 0 ? (
                <p className="text-sm text-slate-400 py-4">暂无照片记录</p>
              ) : (
                <div className="space-y-0">
                  {timelineData.photoEvents.map((event, idx) => (
                    <div key={event.id} className="flex items-start gap-3 relative">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center z-10">
                          <Camera className="w-4 h-4 text-blue-600" />
                        </div>
                        {idx < timelineData.photoEvents.length - 1 && (
                          <div className="w-0.5 flex-1 bg-slate-200 my-1" />
                        )}
                      </div>
                      <div className="pb-4 flex-1 min-w-0">
                        <p className="text-xs text-slate-400">
                          {formatDate(event.timestamp)}
                        </p>
                        <p className="text-sm text-slate-700 font-medium truncate">
                          {event.oldValue || event.operation}
                        </p>
                        <p className="text-xs text-slate-400">
                          {event.operatorName}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                <DollarSign className="w-4 h-4" />
                费用变更记录
              </h3>
              {timelineData.feeEvents.length === 0 ? (
                <p className="text-sm text-slate-400 py-4">暂无费用变更</p>
              ) : (
                <div className="space-y-0">
                  {timelineData.feeEvents.map((event, idx) => {
                    const suspicious = isFeeChangeSuspicious(event.timestamp);
                    return (
                      <div
                        key={event.id}
                        className={`flex items-start gap-3 relative ${
                          suspicious ? 'bg-red-50 -mx-2 px-2 rounded-lg' : ''
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                              suspicious
                                ? 'bg-red-100'
                                : 'bg-amber-100'
                            }`}
                          >
                            <DollarSign
                              className={`w-4 h-4 ${
                                suspicious
                                  ? 'text-red-600'
                                  : 'text-amber-600'
                              }`}
                            />
                          </div>
                          {idx < timelineData.feeEvents.length - 1 && (
                            <div className="w-0.5 flex-1 bg-slate-200 my-1" />
                          )}
                        </div>
                        <div className="pb-4 flex-1 min-w-0">
                          <p className="text-xs text-slate-400">
                            {formatDate(event.timestamp)}
                          </p>
                          {event.fieldName && (
                            <p className="text-sm text-slate-700">
                              <span className="font-medium">
                                {event.fieldName}
                              </span>
                              ：{event.oldValue || '-'}
                              <ChevronRight className="inline w-3 h-3 mx-1 text-slate-400" />
                              {event.newValue || '-'}
                            </p>
                          )}
                          {!event.fieldName && (
                            <p className="text-sm text-slate-700 font-medium">
                              {event.operation}
                            </p>
                          )}
                          <p className="text-xs text-slate-400">
                            {event.operatorName}
                          </p>
                          {suspicious && (
                            <div className="flex items-center gap-1 mt-1" title="费用变更距上次照片上传超过1小时">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                              <span className="text-xs text-red-600 font-medium">
                                费用变更距上次照片上传超过1小时
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
