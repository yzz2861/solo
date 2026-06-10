import { useState, useMemo } from 'react';
import { Layout, PageHeader } from '@/components/Layout';
import { useLibraryStore } from '@/store/useLibraryStore';
import { generateReportData, exportToCSV, getAvailableFields } from '@/utils/exporter';
import { FileBarChart, Download, Settings2, Eye } from 'lucide-react';

export default function ReportPage() {
  const { processed } = useLibraryStore();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includeReviewedOnly, setIncludeReviewedOnly] = useState(true);
  const [includeFields, setIncludeFields] = useState<string[]>(
    getAvailableFields().map((f) => f.key),
  );

  const reportData = useMemo(
    () =>
      generateReportData(processed, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        includeReviewedOnly,
        includeFields,
      }),
    [processed, startDate, endDate, includeReviewedOnly, includeFields],
  );

  const totals = useMemo(() => {
    let shouldFine = 0;
    let waiver = 0;
    let actualFine = 0;
    reportData.forEach((r) => {
      shouldFine += Number(r['shouldFine'] ?? 0);
      waiver += Number(r['finalWaiverAmount'] ?? 0);
      actualFine += Number(r['actualFine'] ?? 0);
    });
    return {
      shouldFine: shouldFine.toFixed(2),
      waiver: waiver.toFixed(2),
      actualFine: actualFine.toFixed(2),
    };
  }, [reportData]);

  const fields = getAvailableFields();

  function toggleField(key: string) {
    setIncludeFields((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  function handleExport() {
    const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    exportToCSV(reportData, `图书馆期末清账报告_${ts}.csv`);
  }

  const previewColumns = includeFields.slice(0, 8);

  return (
    <Layout>
      <PageHeader
        title="报告导出"
        subtitle="配置财务归档报告参数，预览后导出 CSV"
        right={
          <button
            className="btn btn-primary"
            onClick={handleExport}
            disabled={reportData.length === 0}
          >
            <Download className="w-4 h-4" />
            导出 CSV 报告
          </button>
        }
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatBox label="记录条数" value={`${reportData.length}`} icon={<FileBarChart className="w-5 h-5" />} />
        <StatBox label="应缴罚金合计" value={`¥${totals.shouldFine}`} tone="primary" />
        <StatBox label="减免合计" value={`¥${totals.waiver}`} tone="amber" />
        <StatBox label="实缴合计" value={`¥${totals.actualFine}`} tone="green" />
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2 space-y-4">
          <div className="card">
            <div className="card-header flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary/60" />
              <h3 className="font-serif font-semibold text-primary">报告配置</h3>
            </div>
            <div className="card-body space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-primary/60 mb-1.5 font-medium">
                    复核起始日期
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-primary/60 mb-1.5 font-medium">
                    复核结束日期
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeReviewedOnly}
                  onChange={(e) => setIncludeReviewedOnly(e.target.checked)}
                  className="w-4 h-4"
                />
                仅包含已复核的记录
              </label>

              <div>
                <div className="text-xs text-primary/60 mb-2 font-medium flex items-center justify-between">
                  <span>导出字段</span>
                  <span className="flex gap-2">
                    <button
                      className="text-primary underline text-[11px]"
                      onClick={() => setIncludeFields(fields.map((f) => f.key))}
                    >
                      全选
                    </button>
                    <button
                      className="text-primary underline text-[11px]"
                      onClick={() => setIncludeFields([])}
                    >
                      清空
                    </button>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1">
                  {fields.map((f) => (
                    <label
                      key={f.key}
                      className="inline-flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded hover:bg-primary/5"
                    >
                      <input
                        type="checkbox"
                        checked={includeFields.includes(f.key)}
                        onChange={() => toggleField(f.key)}
                        className="w-3.5 h-3.5"
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-3 card">
          <div className="card-header flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary/60" />
            <h3 className="font-serif font-semibold text-primary">
              报告预览（{reportData.length} 条，显示前 {previewColumns.length} 列）
            </h3>
          </div>
          <div className="card-body p-0">
            {reportData.length === 0 ? (
              <div className="py-16 text-center text-primary/40 text-sm">
                暂无预览数据，请调整筛选条件或先导入并复核数据
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-xs">
                  <thead className="bg-primary/5 text-primary/70 sticky top-0">
                    <tr>
                      {previewColumns.map((k) => (
                        <th key={k} className="px-3 py-2.5 text-left font-medium whitespace-nowrap">
                          {fields.find((f) => f.key === k)?.label ?? k}
                        </th>
                      ))}
                      {includeFields.length > previewColumns.length && (
                        <th className="px-3 py-2.5 text-left font-medium text-primary/40">
                          +{includeFields.length - previewColumns.length} 更多列…
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {reportData.slice(0, 100).map((row, i) => (
                      <tr key={i} className={i % 2 ? 'bg-primary/[0.015]' : ''}>
                        {previewColumns.map((k) => (
                          <td key={k} className="px-3 py-2 text-primary/85 whitespace-nowrap">
                            {String(row[k] ?? '')}
                          </td>
                        ))}
                        {includeFields.length > previewColumns.length && <td />}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {reportData.length > 100 && (
              <div className="px-3 py-2 text-xs text-primary/50 border-t border-border">
                * 预览仅显示前 100 行，导出将包含全部 {reportData.length} 行
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StatBox({
  label,
  value,
  icon,
  tone = 'primary',
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: 'primary' | 'amber' | 'green';
}) {
  const toneMap = {
    primary: 'bg-primary/10 text-primary',
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-green-100 text-green-700',
  };
  return (
    <div className="card">
      <div className="card-body flex items-center gap-3">
        {icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${toneMap[tone]}`}>
            {icon}
          </div>
        )}
        <div>
          <div className="text-xs text-primary/55">{label}</div>
          <div className="text-xl font-bold font-serif text-primary mt-0.5">{value}</div>
        </div>
      </div>
    </div>
  );
}
