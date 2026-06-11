import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useComplaintStore } from '@/store/useComplaintStore';
import DataQualityReport from '@/components/DataQualityReport';
import { generateMockData } from '@/utils/mockData';
import { remapRows, getSupportedHeaders } from '@/utils/dataCleaner';
import { Link } from 'react-router-dom';

type Step = 'upload' | 'preview' | 'done';

export default function ImportPage() {
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [headerMatchInfo, setHeaderMatchInfo] = useState<{ matched: number; total: number; unmatched: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { importData, hasData, cleaningReport } = useComplaintStore();

  const supportedHeaders = getSupportedHeaders();

  const handleFile = (file: File) => {
    setFileName(file.name);
    setFileSize(file.size);
    setIsProcessing(true);

    const ext = file.name.toLowerCase().split('.').pop();
    
    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processParsedRows(results.data as Record<string, unknown>[]);
        },
        error: () => {
          setIsProcessing(false);
          alert('CSV文件解析失败，请检查文件格式');
        },
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet) as Record<string, unknown>[];
        processParsedRows(rows);
      };
      reader.readAsArrayBuffer(file);
    } else {
      setIsProcessing(false);
      alert('仅支持 CSV 和 Excel (.xlsx, .xls) 格式文件');
    }
  };

  const processParsedRows = (rows: Record<string, unknown>[]) => {
    if (rows.length === 0) {
      setIsProcessing(false);
      alert('文件中没有数据');
      return;
    }

    const firstRow = rows[0];
    const allHeaders = Object.keys(firstRow);
    const matchedHeaders = new Set<string>();
    const unmatchedHeaders: string[] = [];

    for (const rawHeader of allHeaders) {
      let matched = false;
      for (const { aliases } of supportedHeaders) {
        const normalizedHeader = normalizeHeader(rawHeader);
        const normalizedAliases = aliases.map(a => normalizeHeader(a));
        if (normalizedAliases.includes(normalizedHeader)) {
          matchedHeaders.add(rawHeader);
          matched = true;
          break;
        }
      }
      if (!matched) {
        unmatchedHeaders.push(rawHeader);
      }
    }

    setHeaderMatchInfo({
      matched: matchedHeaders.size,
      total: allHeaders.length,
      unmatched: unmatchedHeaders,
    });

    const remapped = remapRows(rows);
    setRawRows(remapped);
    setIsProcessing(false);
    setStep('preview');
  };

  const normalizeHeader = (header: string): string => {
    let result = header.trim();
    result = result.replace(/^\uFEFF/, '');
    result = result.replace(/\r/g, '');
    result = result.replace(/\s+/g, '');
    return result.toLowerCase();
  };

  const handleLoadMock = () => {
    const mock = generateMockData(120);
    setFileName('示例数据（已自动生成）');
    setFileSize(mock.length * 200);
    setHeaderMatchInfo({ matched: 12, total: 12, unmatched: [] });
    setRawRows(mock);
    setStep('preview');
  };

  const handleConfirmImport = () => {
    importData(rawRows);
    setStep('done');
  };

  const handleReset = () => {
    setStep('upload');
    setFileName('');
    setFileSize(0);
    setRawRows([]);
    setHeaderMatchInfo(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const displayColumns = [
    { key: 'orderNo', label: '工单号' },
    { key: 'ownerName', label: '业主姓名' },
    { key: 'phone', label: '联系电话' },
    { key: 'roomNumber', label: '房号' },
    { key: 'community', label: '小区' },
    { key: 'building', label: '楼栋' },
    { key: 'problemType', label: '问题类型' },
    { key: 'source', label: '来源' },
    { key: 'receiveTime', label: '受理时间' },
    { key: 'responseTime', label: '响应时间' },
    { key: 'closeTime', label: '关闭时间' },
    { key: 'staffName', label: '处理管家' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-serif font-bold text-warm-800 mb-2">数据导入</h2>
        <p className="text-warm-500">上传工单系统导出文件，系统将自动识别中文表头并进行数据清洗</p>
      </div>

      <div className="flex items-center justify-center mb-8">
        {[
          { key: 'upload', label: '上传文件', icon: Upload },
          { key: 'preview', label: '数据预览', icon: FileSpreadsheet },
          { key: 'done', label: '导入完成', icon: CheckCircle },
        ].map((s, idx, arr) => {
          const Icon = s.icon;
          const isActive = step === s.key;
          const isDone = arr.findIndex(x => x.key === step) > idx;
          return (
            <div key={s.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                  ${isDone ? 'bg-green-500 text-white' : 
                    isActive ? 'bg-primary-700 text-white shadow-lg scale-110' : 
                    'bg-warm-100 text-warm-400'}
                `}>
                  {isDone ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className={`text-xs mt-2 font-medium ${isActive || isDone ? 'text-warm-700' : 'text-warm-400'}`}>
                  {s.label}
                </span>
              </div>
              {idx < arr.length - 1 && (
                <div className={`w-24 h-0.5 mx-2 ${isDone ? 'bg-green-400' : 'bg-warm-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      {step === 'upload' && (
        <div className="card p-8">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200
              ${dragActive 
                ? 'border-primary-500 bg-primary-50 scale-[1.01]' 
                : 'border-warm-300 hover:border-primary-400 hover:bg-warm-50'}
            `}
          >
            <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-primary-600" />
            </div>
            <p className="text-lg font-medium text-warm-800 mb-1">点击选择或拖拽文件到此处</p>
            <p className="text-sm text-warm-500 mb-4">支持 CSV、Excel (.xlsx, .xls) 格式</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          <div className="mt-6 text-center">
            <button onClick={handleLoadMock} className="btn-secondary inline-flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              使用示例数据快速体验
            </button>
          </div>

          <div className="mt-8 p-5 bg-warm-50 rounded-xl border border-warm-200">
            <h4 className="font-semibold text-warm-800 mb-3 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              支持的字段及别名
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              {supportedHeaders.map(({ internal, aliases }) => {
                const displayLabel = displayColumns.find(c => c.key === internal)?.label || internal;
                return (
                  <div key={internal} className="bg-white rounded-lg p-3 border border-warm-100">
                    <p className="font-medium text-primary-700 mb-1">{displayLabel}</p>
                    <p className="text-xs text-warm-500 line-clamp-2">
                      {aliases.join(' / ')}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-warm-500 mt-4">
              💡 提示：系统支持中英文混合表头，会自动识别字段别名并映射到正确的内部字段
            </p>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-6">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-warm-800">{fileName}</h3>
                  <p className="text-sm text-warm-500">
                    {formatSize(fileSize)} · 共 {rawRows.length} 行数据
                  </p>
                </div>
              </div>
              <button onClick={handleReset} className="text-sm text-warm-500 hover:text-accent-500 transition-colors">
                重新上传
              </button>
            </div>

            {headerMatchInfo && (
              <div className={`
                p-3 rounded-lg mb-4 flex items-center gap-2
                ${headerMatchInfo.unmatched.length === 0 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-yellow-50 border border-yellow-200'}
              `}>
                <AlertCircle className={`w-4 h-4 ${headerMatchInfo.unmatched.length === 0 ? 'text-green-600' : 'text-yellow-600'}`} />
                <span className="text-sm">
                  已识别 <span className="font-bold text-primary-700">{headerMatchInfo.matched}</span> 个字段
                  {headerMatchInfo.unmatched.length > 0 && (
                    <>
                      ，<span className="font-bold text-yellow-600">{headerMatchInfo.unmatched.length}</span> 个字段未匹配：
                      {headerMatchInfo.unmatched.slice(0, 5).join('、')}
                      {headerMatchInfo.unmatched.length > 5 && `等${headerMatchInfo.unmatched.length}个`}
                    </>
                  )}
                </span>
              </div>
            )}

            <div className="overflow-x-auto scrollbar-thin border border-warm-200 rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="px-3 py-2.5 text-left">#</th>
                    {displayColumns.slice(0, 8).map(col => (
                      <th key={col.key} className="px-3 py-2.5 text-left whitespace-nowrap">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rawRows.slice(0, 8).map((row, idx) => (
                    <tr key={idx} className="table-row">
                      <td className="px-3 py-2.5 text-warm-400 font-mono">{idx + 1}</td>
                      {displayColumns.slice(0, 8).map(col => (
                        <td key={col.key} className="px-3 py-2.5 text-warm-700 max-w-[150px] truncate">
                          {String((row as any)[col.key] || '-')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rawRows.length > 8 && (
              <p className="text-center text-xs text-warm-400 mt-3">
                仅显示前 8 行，共 {rawRows.length} 行数据
              </p>
            )}
          </div>

          {isProcessing ? (
            <div className="card p-12 text-center">
              <RefreshCw className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-3" />
              <p className="text-warm-600">正在执行数据清洗处理...</p>
            </div>
          ) : (
            <>
              <DataQualityReport />
              <div className="flex justify-end gap-3">
                <button onClick={handleReset} className="btn-secondary">
                  返回修改
                </button>
                <button onClick={handleConfirmImport} className="btn-primary inline-flex items-center gap-2">
                  确认导入并查看看板
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 'done' && (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-xl font-serif font-bold text-warm-800 mb-2">数据导入成功</h3>
          <p className="text-warm-500 mb-6">
            已成功导入 {cleaningReport?.validRows || 0} 条有效工单数据
          </p>
          <div className="flex justify-center gap-3">
            <button onClick={handleReset} className="btn-secondary inline-flex items-center gap-2">
              <Upload className="w-4 h-4" />
              继续导入
            </button>
            <Link to="/" className="btn-primary inline-flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              前往看板
            </Link>
          </div>
        </div>
      )}

      {hasData && step === 'upload' && (
        <div className="card p-4 flex items-center justify-between border-primary-200 bg-primary-50/50">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-primary-600" />
            <span className="text-sm text-primary-700">检测到已有数据，新导入将覆盖当前看板数据</span>
          </div>
          <Link to="/" className="text-sm text-primary-700 font-medium hover:underline">
            返回看板 →
          </Link>
        </div>
      )}
    </div>
  );
}
