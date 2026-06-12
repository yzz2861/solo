import { useEffect, useState } from 'react';
import {
  BarChart3,
  Download,
  HandCoins,
  ClipboardCheck,
  Calendar,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import { useRentalStore } from '@/store/rentalStore';
import { downloadCsv, currency } from '@/components/ui/helpers';

type TabKey = 'deposit' | 'claims' | 'availability';

export default function ReportsPage() {
  const { getReport, showToast } = useRentalStore();
  const [tab, setTab] = useState<TabKey>('deposit');

  const today = new Date().toISOString().slice(0, 10);
  const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const nextWeekStart = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const [depositRange, setDepositRange] = useState({ start: thirtyAgo, end: today });
  const [claimStatus, setClaimStatus] = useState<string>('all');
  const [availStart, setAvailStart] = useState(nextWeekStart);

  const [rows, setRows] = useState<Array<Record<string, string | number>>>([]);
  const [loading, setLoading] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      let data: Array<Record<string, string | number>> = [];
      if (tab === 'deposit') {
        data = await getReport('deposit', depositRange);
      } else if (tab === 'claims') {
        data = await getReport('claims', claimStatus === 'all' ? {} : { status: claimStatus });
      } else {
        data = await getReport('availability', { start: availStart });
      }
      setRows(data);
    } catch (e) {
      showToast('error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [tab]);

  function handleExport() {
    const names: Record<TabKey, string> = {
      deposit: `押金明细_${depositRange.start}_${depositRange.end}`,
      claims: `赔损记录_${new Date().toISOString().slice(0, 10)}`,
      availability: `可租装备_${availStart}起`,
    };
    downloadCsv(rows, names[tab] + '.csv');
    showToast('success', '报表已导出');
  }

  const totalAmount = rows.reduce((sum, r) => {
    const v = r['押金'] ?? r['金额'] ?? r['日租价'];
    return sum + (typeof v === 'number' ? v : 0);
  }, 0);

  const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
    { key: 'deposit', label: '押金明细', icon: HandCoins, desc: '按时间段查看押金收取与租客信息' },
    { key: 'claims', label: '赔损记录', icon: ClipboardCheck, desc: '所有赔损申请及店长审批结果' },
    { key: 'availability', label: '可租预报', icon: TrendingUp, desc: '指定日期起可出租的装备清单' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {tabs.map(({ key, label, icon: Icon, desc }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`text-left p-4 rounded-2xl border-2 transition-all ${
              tab === key
                ? 'border-forest-500 bg-gradient-to-br from-forest-50 to-white shadow-card'
                : 'border-cream-200 bg-white/60 hover:border-forest-200'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  tab === key ? 'bg-forest-700 text-white' : 'bg-cream-100 text-bark-500'
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
              </div>
              <span
                className={`font-display text-lg ${
                  tab === key ? 'text-bark-800' : 'text-bark-600'
                }`}
              >
                {label}
              </span>
            </div>
            <p className="text-xs text-bark-400">{desc}</p>
          </button>
        ))}
      </div>

      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-cream-200 shadow-soft p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {tab === 'deposit' && (
            <>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-bark-400" />
                <input
                  type="date"
                  value={depositRange.start}
                  onChange={(e) => setDepositRange({ ...depositRange, start: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-cream-200 text-sm focus:outline-none focus:border-forest-400"
                />
                <span className="text-bark-400 text-sm">至</span>
                <input
                  type="date"
                  value={depositRange.end}
                  onChange={(e) => setDepositRange({ ...depositRange, end: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-cream-200 text-sm focus:outline-none focus:border-forest-400"
                />
              </div>
              <button
                onClick={loadData}
                className="px-3 py-2 rounded-lg bg-cream-100 hover:bg-cream-200 text-bark-700 text-sm font-medium"
              >
                查询
              </button>
            </>
          )}
          {tab === 'claims' && (
            <select
              value={claimStatus}
              onChange={(e) => {
                setClaimStatus(e.target.value);
                setTimeout(loadData, 0);
              }}
              className="px-3 py-2 rounded-lg border border-cream-200 text-sm focus:outline-none focus:border-forest-400"
            >
              <option value="all">全部状态</option>
              <option value="pending">待审批</option>
              <option value="approved">已通过</option>
              <option value="rejected">已驳回</option>
            </select>
          )}
          {tab === 'availability' && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-bark-400" />
              <span className="text-sm text-bark-500">可租起始日</span>
              <input
                type="date"
                value={availStart}
                onChange={(e) => {
                  setAvailStart(e.target.value);
                  setTimeout(loadData, 0);
                }}
                className="px-3 py-2 rounded-lg border border-cream-200 text-sm focus:outline-none focus:border-forest-400"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-bark-500">
            共 <span className="font-semibold text-bark-800">{rows.length}</span> 条
            {totalAmount > 0 && (
              <>
                {' · '}
                {tab === 'availability' ? '日租参考合计' : '金额合计'}：
                <span className="font-semibold text-forest-700">{currency(totalAmount)}</span>
              </>
            )}
          </div>
          <button
            onClick={handleExport}
            disabled={!rows.length}
            className="px-4 py-2 rounded-xl bg-ember-500 hover:bg-ember-600 text-white text-sm font-semibold shadow-soft transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            导出 CSV
          </button>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-cream-200 shadow-soft overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-bark-400 text-sm">加载中...</div>
        ) : rows.length === 0 ? (
          <div className="p-16 text-center text-bark-400">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">暂无数据</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream-50 text-bark-600 text-xs uppercase tracking-wider">
                  {Object.keys(rows[0]).map((h) => (
                    <th key={h} className="text-left px-5 py-3 font-semibold whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={i}
                    className={`border-t border-cream-100 ${i % 2 ? 'bg-cream-50/40' : ''} hover:bg-forest-50/40 transition`}
                  >
                    {Object.values(r).map((v, j) => (
                      <td key={j} className="px-5 py-3 text-bark-700 whitespace-nowrap">
                        {typeof v === 'number' && (j === 2 || String(Object.keys(r)[j]).match(/押金|金额|日租价/))
                          ? currency(v)
                          : String(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {totalAmount > 0 && (
                  <tr className="bg-forest-50 border-t-2 border-forest-200 font-semibold">
                    <td className="px-5 py-3 text-forest-800" colSpan={Object.keys(rows[0]).length - 1}>
                      <CheckCircle2 className="inline w-4 h-4 mr-1.5 -mt-0.5" />
                      合计
                    </td>
                    <td className="px-5 py-3 text-forest-800">{currency(totalAmount)}</td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
