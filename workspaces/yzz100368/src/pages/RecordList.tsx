import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ChevronRight,
  FileText,
  Filter,
  Download,
  Calendar,
  User,
  ClipboardList,
} from 'lucide-react';
import { fetchRecords } from '@/lib/api';
import { StatusBadge, ConfidenceBadge } from '@/components/Badges';
import { useAppStore } from '@/store';
import { FIELD_LABELS } from '@shared/types';
import { cn } from '@/lib/utils';

export default function RecordList() {
  const { records, setRecords } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = () => {
    setLoading(true);
    fetchRecords({ status: status || undefined, from: from || undefined, to: to || undefined, search: search || undefined })
      .then((r) => setRecords(r))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [setRecords]);

  return (
    <div className="p-8 max-w-[1440px] mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 font-serif">全部病历</h1>
          <p className="text-sm text-slate-500 mt-1">共 {records.length} 条病历记录</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/upload" className="bg-medical-800 hover:bg-medical-900 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors">
            <FileText className="w-4 h-4" />
            新增病历
          </Link>
        </div>
      </header>

      <div className="bg-white rounded-xl shadow-card border border-slate-100 p-4 mb-5">
        <div className="grid grid-cols-5 gap-3 items-end">
          <div className="col-span-2">
            <label className="text-xs text-slate-500 block mb-1.5 flex items-center gap-1">
              <Search className="w-3 h-3" /> 搜索患者姓名
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="输入患者姓名"
              className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/30 focus:border-medical-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1.5 flex items-center gap-1">
              <Filter className="w-3 h-3" /> 状态
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/30 focus:border-medical-500"
            >
              <option value="">全部</option>
              <option value="uploaded">已上传</option>
              <option value="extracted">已抽取</option>
              <option value="confirmed">已确认</option>
              <option value="archived">已归档</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> 起始日期
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/30 focus:border-medical-500"
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs text-slate-500 block mb-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> 结束日期
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/30 focus:border-medical-500"
              />
            </div>
            <button
              onClick={load}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-md text-sm font-medium text-slate-700 transition-colors"
            >
              查询
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">患者</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">就诊日期</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">来源</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">字段把握度</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">状态</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">加载中...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">暂无数据</td></tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-medical-100 text-medical-700 flex items-center justify-center text-xs font-medium">
                        {r.patient?.name?.[0]}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                          {r.patient?.name}
                          <span className="text-xs text-slate-400">{r.patient?.gender} · {r.patient?.age}岁</span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono">{r.patient?.idCardMasked}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-700">{r.visitDate}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                      {r.sourceType === 'text' ? <ClipboardList className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                      {r.sourceType === 'text' ? '文本录入' : '照片识别'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {r.extractions.slice(0, 3).map((f) => (
                        <ConfidenceBadge key={f.id} level={f.confidence} />
                      ))}
                      {r.extractions.length > 3 && (
                        <span className="text-xs text-slate-400">+{r.extractions.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      to={`/record/${r.id}/${r.status === 'uploaded' ? 'extract' : r.status === 'extracted' ? 'confirm' : 'history'}`}
                      className="inline-flex items-center gap-0.5 text-sm text-medical-700 hover:text-medical-800 font-medium"
                    >
                      查看详情 <ChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
