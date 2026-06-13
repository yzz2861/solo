import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Car, Phone, Calendar, DollarSign, AlertTriangle, Clock } from 'lucide-react';
import { accidentApi } from '../api/client.js';
import { AccidentStatus, StatusLabels, Accident, UserRole } from '../../shared/types.js';
import { formatDate, formatMoney } from '../utils/format.js';
import StatusBadge from '../components/StatusBadge.js';
import { useAuthStore } from '../store/authStore.js';

const statusStats = [
  { key: AccidentStatus.REGISTERED, label: '处理中', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', icon: Clock },
  { key: AccidentStatus.ASSESSING, label: '定损中', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', icon: DollarSign },
  { key: AccidentStatus.PENDING_CLOSE, label: '待结案', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-100', icon: Calendar },
  { key: AccidentStatus.DISPUTED, label: '有争议', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100', icon: AlertTriangle },
];

const filterStatuses = [
  AccidentStatus.REGISTERED,
  AccidentStatus.ASSESSING,
  AccidentStatus.ASSESSED,
  AccidentStatus.PENDING_CONFIRM,
  AccidentStatus.CONFIRMED,
  AccidentStatus.PENDING_CLOSE,
  AccidentStatus.CLOSED,
  AccidentStatus.DISPUTED,
];

export default function AccidentList() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [accidents, setAccidents] = useState<Accident[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [plateSearch, setPlateSearch] = useState('');

  useEffect(() => {
    loadAccidents();
  }, []);

  const loadAccidents = async () => {
    setLoading(true);
    try {
      const filters: { status?: string; plateNumber?: string } = {};
      if (statusFilter) filters.status = statusFilter;
      if (plateSearch.trim()) filters.plateNumber = plateSearch.trim();
      const data = await accidentApi.list(filters);
      setAccidents(data);
    } catch {
      setAccidents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    loadAccidents();
  };

  const handleReset = () => {
    setStatusFilter('');
    setPlateSearch('');
    setAccidents([]);
    setLoading(true);
    accidentApi.list().then(setAccidents).catch(() => setAccidents([])).finally(() => setLoading(false));
  };

  const getStatusCount = (status: AccidentStatus): number => {
    return accidents.filter((a) => a.status === status).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">事故管理</h1>
        {user?.role === UserRole.STAFF && (
          <Link to="/accidents/new" className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            新建事故
          </Link>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {statusStats.map(({ key, label, bg, text, border, icon: Icon }) => (
          <div key={key} className={`card p-4 ${bg} ${border} border`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className={`text-2xl font-bold ${text} mt-1`}>{getStatusCount(key)}</p>
              </div>
              <Icon className={`w-8 h-8 ${text} opacity-40`} />
            </div>
          </div>
        ))}
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field w-40"
            >
              <option value="">全部状态</option>
              {filterStatuses.map((s) => (
                <option key={s} value={s}>
                  {StatusLabels[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索车牌号"
              value={plateSearch}
              onChange={(e) => setPlateSearch(e.target.value)}
              className="input-field"
            />
          </div>

          <button onClick={handleFilter} className="btn-primary text-sm px-4 py-2">
            搜索
          </button>
          <button onClick={handleReset} className="btn-secondary text-sm px-4 py-2">
            重置
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Clock className="w-5 h-5 mr-2 animate-spin" />
            加载中...
          </div>
        ) : accidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Car className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-lg font-medium">暂无事故记录</p>
            <p className="text-sm mt-1">未找到符合条件的事故记录</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">车牌号</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">客户</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">事故时间</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">状态</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">定损金额</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">扣款金额</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accidents.map((accident) => (
                <tr
                  key={accident.id}
                  onClick={() => navigate(`/accidents/${accident.id}`)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-900">{accident.plateNumber}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-900">{accident.customerName}</span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {accident.customerPhone}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-slate-600 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDate(accident.accidentTime)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={accident.status} isOverdue={accident.isOverdue} />
                      {accident.isOverdue && accident.overdueDays && (
                        <span className="inline-flex items-center gap-1 text-xs text-rose-500 font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          超期{accident.overdueDays}天
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-sm text-slate-900">{formatMoney(accident.assessmentAmount)}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-sm text-slate-900">{formatMoney(accident.deductionAmount)}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/accidents/${accident.id}`);
                      }}
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      查看
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
