import { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { Upload, FileSpreadsheet, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { DataCategory } from '@/types';
import { formatFileSize } from '@/utils/format';
import { useAnalysisStore } from '@/store';
import { parseCSV, parseOrders, parseQueueRecords, parsePrices, parseFaults, detectCategory } from '@/engine/parser';

const CATEGORY_META: Record<DataCategory, { label: string; icon: typeof FileSpreadsheet; hint: string }> = {
  orders: { label: '充电订单', icon: FileSpreadsheet, hint: '订单号/枪位/排队时间/充电时长/充电量' },
  queue: { label: '排队记录', icon: FileText, hint: '时间戳/排队车辆数' },
  prices: { label: '电价时段', icon: FileText, hint: '开始小时/结束小时/电价类型/单价' },
  faults: { label: '设备故障', icon: FileSpreadsheet, hint: '枪位/故障开始/恢复时间/故障类型' },
};

interface Props {
  category: DataCategory;
}

export default function FileUploadZone({ category }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { uploadedFiles, setUploadedFile } = useAnalysisStore();
  const file = uploadedFiles[category];
  const meta = CATEGORY_META[category];

  const handleFile = async (f: File) => {
    setError(null);
    try {
      const text = await f.text();
      const rows = parseCSV(text);
      if (rows.length === 0) {
        setError('文件为空或格式无法识别');
        return;
      }
      const detected = detectCategory(f.name, Object.keys(rows[0] || {}));

      let parsedCount = 0;
      if (category === 'orders') parsedCount = parseOrders(rows).length;
      else if (category === 'queue') parsedCount = parseQueueRecords(rows).length;
      else if (category === 'prices') parsedCount = parsePrices(rows).length;
      else if (category === 'faults') parsedCount = parseFaults(rows).length;

      setUploadedFile(category, {
        category,
        name: f.name,
        size: f.size,
        rawData: text,
      });

      if (detected !== category) {
        setError(`识别为「${CATEGORY_META[detected].label}」，请确认是否正确`);
      } else {
        setError(null);
      }
      void parsedCount;
    } catch (e) {
      setError('解析失败，请检查文件格式（支持 CSV）');
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const Icon = meta.icon;

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={`relative border-2 border-dashed rounded-sm p-5 cursor-pointer transition-all ${
        isDragging ? 'border-electric-green bg-electric-green/5' :
        file ? 'border-electric-green/40 bg-electric-green/[0.03]' :
        'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.txt"
        className="hidden"
        onChange={onChange}
      />
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-sm flex items-center justify-center shrink-0 ${
          file ? 'bg-electric-green/20' : 'bg-white/5'
        }`}>
          {file ? <CheckCircle2 className="w-5 h-5 text-electric-green" /> :
            <Icon className={`w-5 h-5 ${isDragging ? 'text-electric-green' : 'text-neutral-slate-dark'}`} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-neutral-slate">{meta.label}</div>
          {file ? (
            <>
              <div className="text-xs font-mono text-electric-green mt-1 truncate">{file.name}</div>
              <div className="text-[10px] font-mono text-neutral-slate-dark mt-0.5">{formatFileSize(file.size)}</div>
            </>
          ) : (
            <>
              <div className="text-xs text-neutral-slate-dark mt-1">
                {isDragging ? '释放以开始上传' : '点击或拖拽 CSV 文件到此'}
              </div>
              <div className="text-[10px] font-mono text-neutral-slate-dark/60 mt-1 truncate">{meta.hint}</div>
            </>
          )}
          {error && (
            <div className="flex items-center gap-1 text-[10px] text-warning-orange mt-2">
              <AlertTriangle className="w-3 h-3" />
              {error}
            </div>
          )}
        </div>
        {!file && <Upload className="w-4 h-4 text-neutral-slate-dark shrink-0 mt-1" />}
      </div>
    </div>
  );
}
