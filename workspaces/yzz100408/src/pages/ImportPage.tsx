import { useState } from 'react';
import { useAnalysisStore } from '@/store';
import { Upload, Play, CheckCircle2, AlertCircle, FileText, Database, RefreshCw } from 'lucide-react';
import { DataCategory } from '@/types';
import FileUploadZone from '@/components/filters/FileUploadZone';
import { parseCSV, parseOrders, parseQueueRecords, parsePrices, parseFaults } from '@/engine/parser';
import { formatFileSize, getPriceTypeLabel } from '@/utils/format';

const CATEGORIES: DataCategory[] = ['orders', 'queue', 'prices', 'faults'];

export default function ImportPage() {
  const {
    uploadedFiles, parsedSummary, setData, clearAllData, isUsingMockData, loadMockData,
    uploadedFiles: files,
  } = useAnalysisStore();
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allUploaded = CATEGORIES.every(c => uploadedFiles[c] !== null);

  const handleParse = async () => {
    setParsing(true);
    setError(null);
    try {
      const orders = parseOrders(parseCSV(files.orders?.rawData || ''));
      const queue = parseQueueRecords(parseCSV(files.queue?.rawData || ''));
      const prices = parsePrices(parseCSV(files.prices?.rawData || ''));
      const faults = parseFaults(parseCSV(files.faults?.rawData || ''));
      setData(orders, queue, prices, faults);
    } catch (e) {
      setError(e instanceof Error ? e.message : '数据解析失败，请检查文件格式');
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up max-w-5xl mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-slate">数据导入</h1>
        <p className="text-sm text-neutral-slate-dark mt-1 font-mono">
          上传四类数据源，系统将自动预处理并生成排队峰谷分析
        </p>
      </div>

      {isUsingMockData && (
        <div className="card card-info text-center">
          <div className="flex items-center justify-center gap-3">
            <Database className="w-5 h-5 text-warning-yellow" />
            <p className="text-sm text-neutral-slate">
              当前使用<span className="text-warning-yellow font-semibold mx-1">演示数据</span>体验系统。
              上传真实数据后将自动替换。
            </p>
            <button onClick={loadMockData} className="btn text-xs gap-1.5 ml-4">
              <RefreshCw className="w-3 h-3" />
              重新生成
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {CATEGORIES.map(cat => (
          <FileUploadZone key={cat} category={cat} />
        ))}
      </div>

      {parsedSummary && (
        <div className="card">
          <h2 className="section-title mb-4">
            <CheckCircle2 className="w-4 h-4 text-electric-green" />
            解析结果预览
          </h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-white/[0.03] rounded-sm border border-white/5">
              <div className="stat-label">充电订单</div>
              <div className="stat-value mt-1 text-lg text-electric-green">{parsedSummary.orders.count}</div>
              <div className="text-[10px] font-mono text-neutral-slate-dark mt-1">
                {parsedSummary.orders.dateRange[0]} → {parsedSummary.orders.dateRange[1]}
              </div>
              {parsedSummary.orders.anomalies.map((a, i) => (
                <div key={i} className="text-[10px] text-warning-orange mt-1 flex items-center gap-1">
                  <AlertCircle className="w-2.5 h-2.5" />{a}
                </div>
              ))}
            </div>
            <div className="p-4 bg-white/[0.03] rounded-sm border border-white/5">
              <div className="stat-label">排队记录</div>
              <div className="stat-value mt-1 text-lg text-electric-green">{parsedSummary.queue.count}</div>
              <div className="text-[10px] font-mono text-neutral-slate-dark mt-1">
                {parsedSummary.queue.dateRange[0]} → {parsedSummary.queue.dateRange[1]}
              </div>
            </div>
            <div className="p-4 bg-white/[0.03] rounded-sm border border-white/5">
              <div className="stat-label">电价时段</div>
              <div className="stat-value mt-1 text-lg text-warning-yellow">{parsedSummary.prices.count}</div>
              <div className="flex gap-1 mt-1 flex-wrap">
                {parsedSummary.prices.periods.map(p => (
                  <span key={p} className="chip text-[10px]">{getPriceTypeLabel(p)}</span>
                ))}
              </div>
            </div>
            <div className="p-4 bg-white/[0.03] rounded-sm border border-white/5">
              <div className="stat-label">设备故障</div>
              <div className="stat-value mt-1 text-lg text-warning-orange">{parsedSummary.faults.count}</div>
              <div className="text-[10px] font-mono text-neutral-slate-dark mt-1">
                涉及 {parsedSummary.faults.affectedGuns.join('、') || '无'}
              </div>
              {parsedSummary.faults.anomalies.map((a, i) => (
                <div key={i} className="text-[10px] text-warning-yellow mt-1 flex items-center gap-1">
                  <AlertCircle className="w-2.5 h-2.5" />{a}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="card card-warning">
          <div className="flex items-center gap-2 text-warning-orange">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handleParse}
          disabled={!allUploaded || parsing}
          className={`btn btn-primary text-sm gap-2 ${!allUploaded ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {parsing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {parsing ? '解析中...' : parsedSummary ? '重新解析并分析' : '开始解析并分析'}
        </button>

        {parsedSummary && (
          <button onClick={clearAllData} className="btn btn-danger text-sm gap-2">
            <AlertCircle className="w-4 h-4" />
            清空数据
          </button>
        )}
      </div>

      <div className="card">
        <h2 className="section-title mb-4">
          <FileText className="w-4 h-4" />
          CSV 文件格式说明
        </h2>
        <div className="grid grid-cols-2 gap-6 text-xs text-neutral-slate leading-relaxed">
          <div>
            <h3 className="text-sm font-semibold text-electric-green mb-2">充电订单 (orders.csv)</h3>
            <div className="font-mono space-y-1 text-neutral-slate-dark">
              <p>订单号, 枪位号, 车牌号, 车型,</p>
              <p>排队开始时间, 充电开始时间, 充电结束时间,</p>
              <p>等待时长(分钟), 充电时长(分钟), 充电量(kWh)</p>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-electric-green mb-2">排队记录 (queue.csv)</h3>
            <div className="font-mono space-y-1 text-neutral-slate-dark">
              <p>记录号, 时间戳, 排队车辆数, 枪位号(可选)</p>
              <p className="mt-3 text-neutral-slate">建议每 5 分钟采集一次</p>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-electric-green mb-2">电价时段 (prices.csv)</h3>
            <div className="font-mono space-y-1 text-neutral-slate-dark">
              <p>时段ID, 生效日期, 开始小时, 结束小时,</p>
              <p>电价类型(峰/平/谷/促销), 电价(元/kWh)</p>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-electric-green mb-2">设备故障 (faults.csv)</h3>
            <div className="font-mono space-y-1 text-neutral-slate-dark">
              <p>故障ID, 枪位号, 故障开始时间,</p>
              <p>故障恢复时间, 故障类型, 故障时长(分钟)</p>
            </div>
          </div>
        </div>
        <div className="divider" />
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-neutral-slate-dark">
            * 系统自动处理：跨天订单拆分、车辆提前离开标记、重复故障合并、峰谷边界卡点归一
          </p>
          <span className="chip">{formatFileSize(1024 * 500)} 单文件上限</span>
        </div>
      </div>
    </div>
  );
}
