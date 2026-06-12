import { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  Edit3,
  Download,
  Calendar,
  Search,
  ChevronDown,
  Eye,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type ReportType = 'missing' | 'near-expiry' | 'adjustments';

interface MissingRow {
  id: string;
  follow_up_date: string;
  patient_id: string;
  'p.name': string;
  'p.phone': string;
  'att.code': string;
  'att.batch_no': string;
  'model.name': string;
  'model.type': string;
  missing_reason: string;
  clinic_room: string;
}

interface NearExpiryRow {
  id: string;
  code: string;
  batch_no: string;
  'model.name': string;
  'model.type': string;
  expiry_date: string;
  days_left: number;
  'loc.clinic': string;
  'loc.shelf': string;
  'loc.slot': string;
}

interface AdjustmentRow {
  id: string;
  created_at: string;
  'att.code': string;
  delta: number;
  reason: string;
  'op.name': string;
}

const missingReasonMap: Record<string, string> = {
  missing_template: '缺模板',
  missing_material: '缺材料',
  missing_batch: '缺批次',
};

const typeLabel: Record<string, string> = {
  template: '模板',
  material: '材料',
  aligner_batch: '牙套批次',
};

export default function Reports() {
  const [activeReport, setActiveReport] = useState<ReportType>('missing');
  const [previewData, setPreviewData] = useState<MissingRow[] | NearExpiryRow[] | AdjustmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [dateFilters, setDateFilters] = useState({
    days: 30,
    from: '',
    to: '',
  });

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    loadPreviewData();
  }, [activeReport, dateFilters]);

  const loadPreviewData = async () => {
    setLoading(true);
    try {
      let url = '';
      switch (activeReport) {
        case 'missing':
          url = '/api/inventory/missing';
          break;
        case 'near-expiry':
          url = `/api/inventory/near-expiry?days=${dateFilters.days}`;
          break;
        case 'adjustments':
          url = '/api/inventory/adjustments';
          if (dateFilters.from) url += `&from=${dateFilters.from}`;
          if (dateFilters.to) url += `&to=${dateFilters.to}`;
          break;
      }
      const res = await fetch(url).then(r => r.json());
      if (res.success) {
        setPreviewData(res.data || []);
      } else {
        showToast('error', res.error || '加载失败');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getDownloadUrl = () => {
    switch (activeReport) {
      case 'missing':
        return '/api/reports/missing';
      case 'near-expiry':
        return `/api/reports/near-expiry?days=${dateFilters.days}`;
      case 'adjustments':
        let url = '/api/reports/adjustments';
        if (dateFilters.from) url += `?from=${dateFilters.from}`;
        if (dateFilters.to) url += (dateFilters.from ? '&' : '?') + `to=${dateFilters.to}`;
        return url;
    }
  };

  const filteredPreview = previewData.filter(row => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return Object.values(row).some(v =>
      String(v).toLowerCase().includes(q)
    );
  });

  const missingCount = activeReport === 'missing' ? previewData.length : 0;
  const nearExpiryCount = activeReport === 'near-expiry' ? previewData.length : 0;
  const adjustmentCount = activeReport === 'adjustments' ? previewData.length : 0;

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      {toast && (
        <div className={cn(
          'fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-popover flex items-center gap-2 animate-slide-down',
          toast.type === 'success' ? 'bg-success-500 text-white' : 'bg-danger-500 text-white'
        )}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <FileSpreadsheet className="w-7 h-7 text-medical-600" />
            导出报表
          </h1>
          <p className="text-sm text-neutral-500 mt-1">导出缺件、近效期和调整记录报表</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => setActiveReport('missing')}
            className={cn(
              'p-5 rounded-xl border-2 text-left transition-all duration-200',
              activeReport === 'missing'
                ? 'bg-warning-50 border-warning-500 shadow-card'
                : 'bg-white border-neutral-200 hover:border-warning-200 hover:shadow-card'
            )}
          >
            <div className="flex items-start justify-between">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                activeReport === 'missing' ? 'bg-warning-500 text-white' : 'bg-warning-50 text-warning-600'
              )}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              {activeReport === 'missing' && (
                <span className="text-xs font-medium text-warning-600 bg-warning-100 px-2 py-0.5 rounded-full">
                  当前查看
                </span>
              )}
            </div>
            <div className="mt-4">
              <div className="text-lg font-semibold text-neutral-900">缺件报表</div>
              <div className="text-sm text-neutral-500 mt-1">
                导出患者复诊缺件明细清单
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-warning-600">
                  {activeReport === 'missing' ? missingCount : '-'}
                </span>
                <span className="text-xs text-neutral-500">条记录</span>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveReport('near-expiry')}
            className={cn(
              'p-5 rounded-xl border-2 text-left transition-all duration-200',
              activeReport === 'near-expiry'
                ? 'bg-danger-50 border-danger-500 shadow-card'
                : 'bg-white border-neutral-200 hover:border-danger-200 hover:shadow-card'
            )}
          >
            <div className="flex items-start justify-between">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                activeReport === 'near-expiry' ? 'bg-danger-500 text-white' : 'bg-danger-50 text-danger-600'
              )}>
                <Clock className="w-6 h-6" />
              </div>
              {activeReport === 'near-expiry' && (
                <span className="text-xs font-medium text-danger-600 bg-danger-100 px-2 py-0.5 rounded-full">
                  当前查看
                </span>
              )}
            </div>
            <div className="mt-4">
              <div className="text-lg font-semibold text-neutral-900">近效期报表</div>
              <div className="text-sm text-neutral-500 mt-1">
                导出即将到期的附件清单
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-danger-600">
                  {activeReport === 'near-expiry' ? nearExpiryCount : '-'}
                </span>
                <span className="text-xs text-neutral-500">条记录</span>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveReport('adjustments')}
            className={cn(
              'p-5 rounded-xl border-2 text-left transition-all duration-200',
              activeReport === 'adjustments'
                ? 'bg-medical-50 border-medical-500 shadow-card'
                : 'bg-white border-neutral-200 hover:border-medical-200 hover:shadow-card'
            )}
          >
            <div className="flex items-start justify-between">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                activeReport === 'adjustments' ? 'bg-medical-500 text-white' : 'bg-medical-50 text-medical-600'
              )}>
                <Edit3 className="w-6 h-6" />
              </div>
              {activeReport === 'adjustments' && (
                <span className="text-xs font-medium text-medical-600 bg-medical-100 px-2 py-0.5 rounded-full">
                  当前查看
                </span>
              )}
            </div>
            <div className="mt-4">
              <div className="text-lg font-semibold text-neutral-900">调整记录报表</div>
              <div className="text-sm text-neutral-500 mt-1">
                导出手工调整库存历史记录
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-medical-600">
                  {activeReport === 'adjustments' ? adjustmentCount : '-'}
                </span>
                <span className="text-xs text-neutral-500">条记录</span>
              </div>
            </div>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-card border border-neutral-200 overflow-hidden">
          <div className="p-4 border-b border-neutral-200 flex flex-wrap items-center gap-3 justify-between">
            <div className="flex flex-wrap items-center gap-3">
              {activeReport === 'near-expiry' && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-neutral-400" />
                  <span className="text-sm text-neutral-600">近效期范围：</span>
                  <select
                    value={dateFilters.days}
                    onChange={e => setDateFilters({ ...dateFilters, days: parseInt(e.target.value) })}
                    className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 bg-white"
                  >
                    <option value={7}>7 天内</option>
                    <option value={15}>15 天内</option>
                    <option value={30}>30 天内</option>
                    <option value={60}>60 天内</option>
                    <option value={90}>90 天内</option>
                  </select>
                </div>
              )}
              {activeReport === 'adjustments' && (
                <>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-neutral-400" />
                    <input
                      type="date"
                      value={dateFilters.from}
                      onChange={e => setDateFilters({ ...dateFilters, from: e.target.value })}
                      className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
                    />
                    <span className="text-neutral-400">至</span>
                    <input
                      type="date"
                      value={dateFilters.to}
                      onChange={e => setDateFilters({ ...dateFilters, to: e.target.value })}
                      className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
                    />
                  </div>
                </>
              )}
              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="搜索预览内容..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadPreviewData}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors font-medium text-sm"
              >
                <Eye className="w-4 h-4" />
                刷新预览
              </button>
              <a
                href={getDownloadUrl()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-medical-600 text-white rounded-lg hover:bg-medical-700 transition-colors font-medium text-sm shadow-card"
              >
                <Download className="w-4 h-4" />
                下载 CSV
              </a>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-20 text-center text-neutral-500">
                <div className="inline-block w-8 h-8 border-4 border-medical-200 border-t-medical-600 rounded-full animate-spin mb-3"></div>
                <div>加载中...</div>
              </div>
            ) : activeReport === 'missing' ? (
              <table className="w-full">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">复诊日期</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">患者姓名</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">电话</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">附件条码</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">型号</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">类型</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">缺件原因</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">诊室</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {(filteredPreview as MissingRow[]).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-neutral-400">暂无缺件记录</td>
                    </tr>
                  ) : (
                    (filteredPreview as MissingRow[]).map(row => (
                      <tr key={row.id} className="hover:bg-neutral-50/50">
                        <td className="px-6 py-4 text-sm text-neutral-700">{row.follow_up_date}</td>
                        <td className="px-6 py-4 text-sm font-medium text-neutral-900">{row['p.name']}</td>
                        <td className="px-6 py-4 text-sm text-neutral-600">{row['p.phone'] || '-'}</td>
                        <td className="px-6 py-4">
                          <code className="text-xs font-mono bg-neutral-100 px-2 py-1 rounded">
                            {row['att.code']}
                          </code>
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-700">{row['model.name']}</td>
                        <td className="px-6 py-4 text-xs text-neutral-500">
                          {row['model.type'] ? typeLabel[row['model.type']] || row['model.type'] : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-warning-50 text-warning-700">
                            {missingReasonMap[row.missing_reason] || row.missing_reason}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-600">{row.clinic_room}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : activeReport === 'near-expiry' ? (
              <table className="w-full">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">附件条码</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">批次</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">型号</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">类型</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">有效期</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">剩余天数</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">存放位置</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {(filteredPreview as NearExpiryRow[]).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-neutral-400">暂无近效期附件</td>
                    </tr>
                  ) : (
                    (filteredPreview as NearExpiryRow[]).map(row => (
                      <tr key={row.id} className="hover:bg-neutral-50/50">
                        <td className="px-6 py-4">
                          <code className="text-xs font-mono bg-neutral-100 px-2 py-1 rounded">
                            {row.code}
                          </code>
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-600">{row.batch_no}</td>
                        <td className="px-6 py-4 text-sm text-neutral-700">{row['model.name']}</td>
                        <td className="px-6 py-4 text-xs text-neutral-500">
                          {row['model.type'] ? typeLabel[row['model.type']] || row['model.type'] : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-600">{row.expiry_date}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                            row.days_left <= 7
                              ? 'bg-danger-50 text-danger-700'
                              : row.days_left <= 30
                                ? 'bg-warning-50 text-warning-700'
                                : 'bg-neutral-100 text-neutral-600'
                          )}>
                            {row.days_left} 天
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-600">
                          {row['loc.clinic'] || '-'}{row['loc.shelf'] ? `-${row['loc.shelf']}` : ''}{row['loc.slot'] ? `-${row['loc.slot']}` : ''}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">操作时间</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">附件条码</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">调整数量</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">原因</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">操作人</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {(filteredPreview as AdjustmentRow[]).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-neutral-400">暂无调整记录</td>
                    </tr>
                  ) : (
                    (filteredPreview as AdjustmentRow[]).map(row => (
                      <tr key={row.id} className="hover:bg-neutral-50/50">
                        <td className="px-6 py-4 text-sm text-neutral-600">{row.created_at}</td>
                        <td className="px-6 py-4">
                          <code className="text-xs font-mono bg-neutral-100 px-2 py-1 rounded">
                            {row['att.code']}
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold',
                            row.delta > 0
                              ? 'bg-success-50 text-success-700'
                              : 'bg-danger-50 text-danger-700'
                          )}>
                            {row.delta > 0 ? '+' : ''}{row.delta}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-700 max-w-xs truncate">{row.reason}</td>
                        <td className="px-6 py-4 text-sm text-neutral-600">{row['op.name'] || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {!loading && previewData.length > 0 && (
            <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between text-sm">
              <div className="text-neutral-500">
                共 <span className="font-semibold text-neutral-700">{previewData.length}</span> 条记录
                {searchQuery && `，匹配 ${filteredPreview.length} 条`}
              </div>
              <div className="text-neutral-500">
                点击右上角「下载 CSV」导出完整报表
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
