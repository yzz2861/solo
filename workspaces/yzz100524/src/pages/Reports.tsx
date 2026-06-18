import { useEffect, useState } from 'react';
import {
  FileBarChart,
  Download,
  TrendingUp,
  Bike,
  CircleDollarSign,
  AlertTriangle,
  Calendar,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { api } from '@/utils/api';
import { formatMoney, getToday } from '@/utils/format';
import { useToast } from '@/store/app';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
} from 'recharts';
import * as XLSX from 'xlsx';

type Tab = 'conversion' | 'issues' | 'deposit';

function getMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function Reports() {
  const show = useToast((s) => s.show);
  const [tab, setTab] = useState<Tab>('conversion');
  const [startDate, setStartDate] = useState(getMonthStart());
  const [endDate, setEndDate] = useState(getToday());

  const [conversionData, setConversionData] = useState<any>(null);
  const [issueData, setIssueData] = useState<any>(null);
  const [depositData, setDepositData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = { start_date: startDate, end_date: endDate };
      if (tab === 'conversion') {
        setConversionData(await api.reports.conversion(params));
      } else if (tab === 'issues') {
        setIssueData(await api.reports.vehicleIssues(params));
      } else {
        setDepositData(await api.reports.depositFlow(params));
      }
    } catch (e: any) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [tab, startDate, endDate]);

  const handleExport = async (type: string) => {
    try {
      const res: any = await api.reports.exportReport(type, { start_date: startDate, end_date: endDate });
      const ws = XLSX.utils.json_to_sheet(res.data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, res.export_type);
      const fileName = `${res.export_type}_${res.start_date}_${res.end_date}.xlsx`;
      XLSX.writeFile(wb, fileName);
      show(`已导出 ${fileName}`, 'success');
    } catch (e: any) {
      show(e.message || '导出失败', 'error');
    }
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'conversion', label: '试骑转化', icon: TrendingUp },
    { id: 'issues', label: '异常车况', icon: AlertTriangle },
    { id: 'deposit', label: '押金流水', icon: CircleDollarSign },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-500">报表中心</h1>
          <p className="text-sm text-gray-500 mt-1">门店数据统计与导出（店长专属）</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input !w-auto !py-1.5"
            />
            <span className="text-gray-400">至</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input !w-auto !py-1.5"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                active
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-200 hover:text-primary-500'
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'conversion' && (
        <ConversionReport data={conversionData} loading={loading} onExport={() => handleExport('conversion')} />
      )}
      {tab === 'issues' && (
        <IssueReport data={issueData} loading={loading} onExport={() => handleExport('vehicle-issues')} />
      )}
      {tab === 'deposit' && (
        <DepositReport data={depositData} loading={loading} onExport={() => handleExport('deposit-flow')} />
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  suffix,
}: {
  icon: any;
  label: string;
  value: number | string;
  color: string;
  suffix?: string;
}) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-white/80">{label}</div>
          <div className="text-3xl font-bold mt-1">
            {value}
            {suffix && <span className="text-base font-normal ml-1 text-white/80">{suffix}</span>}
          </div>
        </div>
        <Icon size={28} className="text-white/80" />
      </div>
    </div>
  );
}

function ConversionReport({ data, loading, onExport }: { data: any; loading: boolean; onExport: () => void }) {
  if (loading || !data) return <div className="text-center py-20 text-gray-400">加载中...</div>;

  const daily = data.daily_stats || [];
  const modelStats = data.model_stats || [];
  const conversionRate =
    data.unique_customers > 0
      ? ((data.customers_with_feedback || 0) / data.unique_customers) * 100
      : 0;

  const COLORS = ['#1E3A5F', '#F59E0B', '#10B981', '#F97316', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={onExport} className="btn-accent">
          <Download size={16} /> 导出 Excel
        </button>
      </div>

      <div className="grid grid-cols-4 gap-5">
        <StatCard icon={Bike} label="试骑总数" value={data.total_rides} color="bg-primary-500" suffix="次" />
        <StatCard icon={FileBarChart} label="独立客户" value={data.unique_customers} color="bg-accent-500" suffix="人" />
        <StatCard icon={BarChart3} label="有效反馈" value={data.customers_with_feedback || 0} color="bg-success" suffix="人" />
        <StatCard icon={TrendingUp} label="反馈率" value={conversionRate.toFixed(1)} color="bg-warning" suffix="%" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-primary-500 mb-4">每日试骑趋势</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="试骑次数" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-primary-500 mb-4">车型试骑分布</h3>
          {modelStats.length === 0 ? (
            <div className="text-center py-16 text-gray-400">暂无数据</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={modelStats}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={40}
                    dataKey="ride_count"
                    nameKey="model"
                    label={(entry: any) => `${entry.model}: ${entry.ride_count}次`}
                    labelLine={false}
                  >
                    {modelStats.map((_: any, idx: number) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-primary-500 mb-4">车型试骑排行</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">排名</th>
                <th className="th">车型</th>
                <th className="th">试骑次数</th>
                <th className="th">占比</th>
              </tr>
            </thead>
            <tbody>
              {modelStats.map((m: any, i: number) => {
                const total = modelStats.reduce((a: number, b: any) => a + b.ride_count, 0);
                const pct = total > 0 ? ((m.ride_count / total) * 100).toFixed(1) : 0;
                return (
                  <tr key={m.model} className="hover:bg-gray-50">
                    <td className="td">
                      <span
                        className={`w-6 h-6 inline-flex items-center justify-center rounded-full text-xs font-bold ${
                          i === 0 ? 'bg-accent-500 text-white' : i === 1 ? 'bg-gray-400 text-white' : i === 2 ? 'bg-orange-300 text-white' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="td font-medium">{m.model}</td>
                    <td className="td">{m.ride_count} 次</td>
                    <td className="td">
                      <div className="flex items-center gap-2 max-w-[200px]">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function IssueReport({ data, loading, onExport }: { data: any; loading: boolean; onExport: () => void }) {
  if (loading || !data) return <div className="text-center py-20 text-gray-400">加载中...</div>;

  const issues = data.issues || [];
  const severity = data.severity_stats || [];
  const vehicleCount = data.vehicle_issue_count || [];

  const SEVERITY_COLORS: Record<string, string> = { minor: '#F59E0B', major: '#F97316', critical: '#EF4444' };

  const severityLabel = (s: string) => ({ minor: '轻微', major: '严重', critical: '致命' }[s] || s);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={onExport} className="btn-accent">
          <Download size={16} /> 导出 Excel
        </button>
      </div>

      <div className="grid grid-cols-4 gap-5">
        <StatCard
          icon={AlertTriangle}
          label="异常总数"
          value={issues.length}
          color="bg-danger"
          suffix="起"
        />
        <StatCard
          icon={PieChart}
          label="涉及车辆"
          value={vehicleCount.length}
          color="bg-warning"
          suffix="台"
        />
        <StatCard
          icon={AlertTriangle}
          label="未处理"
          value={issues.filter((i: any) => !i.resolved).length}
          color="bg-primary-500"
          suffix="起"
        />
        <StatCard
          icon={FileBarChart}
          label="已处理"
          value={issues.filter((i: any) => i.resolved).length}
          color="bg-success"
          suffix="起"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="card col-span-2">
          <h3 className="font-semibold text-primary-500 mb-4">异常明细</h3>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-white">
                <tr>
                  <th className="th">时间</th>
                  <th className="th">车辆</th>
                  <th className="th">异常类型</th>
                  <th className="th">描述</th>
                  <th className="th">严重程度</th>
                  <th className="th">状态</th>
                </tr>
              </thead>
              <tbody>
                {issues.length === 0 ? (
                  <tr><td colSpan={6} className="td text-center text-gray-400 py-8">暂无异常记录</td></tr>
                ) : (
                  issues.map((i: any) => (
                    <tr key={i.id} className="hover:bg-gray-50">
                      <td className="td text-xs">{i.created_at?.slice(0, 16).replace('T', ' ')}</td>
                      <td className="td">
                        <div className="font-medium text-sm">{i.model}</div>
                        <div className="text-xs text-gray-400">{i.frame_number}</div>
                      </td>
                      <td className="td text-sm">{i.issue_type}</td>
                      <td className="td text-xs text-gray-600 max-w-[200px] truncate" title={i.description}>
                        {i.description || '-'}
                      </td>
                      <td className="td">
                        <span
                          className={`badge ${
                            i.severity === 'critical'
                              ? 'badge-red'
                              : i.severity === 'major'
                              ? 'badge-yellow'
                              : 'badge-blue'
                          }`}
                        >
                          {severityLabel(i.severity)}
                        </span>
                      </td>
                      <td className="td">
                        {i.resolved ? (
                          <span className="badge-green">已处理</span>
                        ) : (
                          <span className="badge-red">未处理</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="font-semibold text-primary-500 mb-4">严重程度分布</h3>
            {severity.length === 0 ? (
              <div className="text-center py-10 text-gray-400">暂无数据</div>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={severity.map((s: any) => ({ ...s, label: severityLabel(s.severity) }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      dataKey="count"
                      nameKey="label"
                      label
                    >
                      {severity.map((s: any, idx: number) => (
                        <Cell key={idx} fill={SEVERITY_COLORS[s.severity] || '#999'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="font-semibold text-primary-500 mb-4">问题车辆 TOP</h3>
            {vehicleCount.length === 0 ? (
              <div className="text-center py-10 text-gray-400">暂无数据</div>
            ) : (
              <div className="space-y-2">
                {vehicleCount.slice(0, 6).map((v: any, i: number) => (
                  <div key={v.model} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                    <span className="text-sm font-medium flex-1 truncate">{v.model}</span>
                    <span className="badge-red">{v.issue_count} 起</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DepositReport({ data, loading, onExport }: { data: any; loading: boolean; onExport: () => void }) {
  if (loading || !data) return <div className="text-center py-20 text-gray-400">加载中...</div>;

  const dailyFlow = data.daily_flow || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={onExport} className="btn-accent">
          <Download size={16} /> 导出 Excel
        </button>
      </div>

      <div className="grid grid-cols-4 gap-5">
        <StatCard
          icon={CircleDollarSign}
          label="收取押金总额"
          value={formatMoney(data.collected_total || 0)}
          color="bg-primary-500"
        />
        <StatCard
          icon={CircleDollarSign}
          label="已退还总额"
          value={formatMoney(data.refunded_total || 0)}
          color="bg-success"
        />
        <StatCard
          icon={AlertTriangle}
          label="扣款总计"
          value={formatMoney(data.deductions_total || 0)}
          color="bg-warning"
        />
        <StatCard
          icon={AlertTriangle}
          label="未退押金"
          value={`${formatMoney(data.unreturned?.total || 0)}（${data.unreturned?.count || 0}笔）`}
          color="bg-danger"
        />
      </div>

      <div className="card">
        <h3 className="font-semibold text-primary-500 mb-4">每日押金流水</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyFlow}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => formatMoney(v)} />
              <Legend />
              <Bar dataKey="collected_amount" name="收取押金" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
              <Bar dataKey="refunded_amount" name="退还押金" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
