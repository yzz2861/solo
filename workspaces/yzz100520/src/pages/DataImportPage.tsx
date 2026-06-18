import { useRef, useState, type ChangeEvent } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '@/api/client';
import { cn } from '@/lib/utils';

type TabKey = 'water' | 'occupancy' | 'repairs' | 'holidays';

interface TabConfig {
  key: TabKey;
  label: string;
  fields: string[];
  example: string;
  apiFn: (csv: string, type: 'preview' | 'import') => Promise<{ count?: number; imported?: number; errors?: string[]; preview?: Record<string, unknown>[] }>;
}

const tabs: TabConfig[] = [
  {
    key: 'water',
    label: '水表读数',
    fields: ['楼栋编号', '日期', '时段', '读数', '换表(可选)'],
    example: '楼栋编号,日期,时段,读数,换表\nD1,2024-01-15,夜间,10250,0\nD1,2024-01-15,日间,10320,0',
    apiFn: (csv, type) => api.importWaterReadings(csv, type),
  },
  {
    key: 'occupancy',
    label: '宿舍入住',
    fields: ['楼栋编号', '日期', '入住宿舍', '入住人数', '空置(可选)'],
    example: '楼栋编号,日期,入住宿舍,入住人数,空置\nD1,2024-01-15,68,260,0',
    apiFn: (csv, type) => api.importOccupancy(csv, type),
  },
  {
    key: 'repairs',
    label: '维修记录',
    fields: ['楼栋编号', '报修日期', '维修类型', '描述', '状态'],
    example: '楼栋编号,报修日期,维修类型,描述,状态\nD1,2024-01-15,管道漏水,地下管渗漏,pending',
    apiFn: (csv, type) => api.importRepairs(csv, type),
  },
  {
    key: 'holidays',
    label: '假期日历',
    fields: ['名称', '开始日期', '结束日期', '楼栋(可选)'],
    example: '名称,开始日期,结束日期,楼栋\n五一假期,2024-05-01,2024-05-05,D1,D2,D3',
    apiFn: (csv, type) => api.importHolidays(csv, type),
  },
];

interface ImportState {
  csv: string;
  fileName: string;
  preview: Record<string, unknown>[];
  errors: string[];
  count: number;
  imported: number;
  step: 'idle' | 'preview' | 'done';
}

export default function DataImportPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('water');
  const [state, setState] = useState<ImportState>({
    csv: '',
    fileName: '',
    preview: [],
    errors: [],
    count: 0,
    imported: 0,
    step: 'idle',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentTab = tabs.find((t) => t.key === activeTab)!;

  const handleFileSelect = () => fileInputRef.current?.click();

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const csv = ev.target?.result as string;
      const result = await currentTab.apiFn(csv, 'preview');
      setState({
        csv,
        fileName: file.name,
        preview: (result.preview as Record<string, unknown>[]) || [],
        errors: result.errors || [],
        count: result.count || 0,
        imported: 0,
        step: 'preview',
      });
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImport = async () => {
    const result = await currentTab.apiFn(state.csv, 'import');
    setState((s) => ({
      ...s,
      errors: result.errors || [],
      imported: (result.imported as number) || 0,
      step: 'done',
    }));
  };

  const handleReset = () => {
    setState({ csv: '', fileName: '', preview: [], errors: [], count: 0, imported: 0, step: 'idle' });
  };

  const previewHeaders = state.preview.length > 0 ? Object.keys(state.preview[0]) : [];

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="flex border-b border-ocean-100">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setActiveTab(t.key);
                handleReset();
              }}
              className={cn(
                'px-6 py-4 text-sm font-medium transition-colors',
                activeTab === t.key
                  ? 'text-ocean-700 border-b-2 border-ocean-600 bg-ocean-50'
                  : 'text-ocean-400 hover:text-ocean-600'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-ocean-50 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <FileText className="w-5 h-5 text-ocean-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-ocean-700">CSV 格式说明</p>
                <p className="text-xs text-ocean-500 mt-1">字段：{currentTab.fields.join(' / ')}</p>
                <pre className="mt-2 text-xs text-ocean-600 bg-white rounded p-3 overflow-x-auto">
                  {currentTab.example}
                </pre>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={handleFileSelect}
              className="flex items-center gap-2 px-5 py-2.5 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors text-sm font-medium"
            >
              <Upload className="w-4 h-4" />
              {state.fileName ? state.fileName : '选择 CSV 文件'}
            </button>
            {state.step !== 'idle' && (
              <button
                onClick={handleReset}
                className="text-sm text-ocean-500 hover:text-ocean-700"
              >
                重新选择
              </button>
            )}
          </div>

          {state.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-700">发现 {state.errors.length} 个错误</p>
                  <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                    {state.errors.map((err, i) => (
                      <li key={i} className="text-xs text-red-600">
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {state.step === 'done' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <p className="text-sm font-medium text-green-700">
                  导入成功！共 {state.imported} 条记录
                </p>
              </div>
            </div>
          )}

          {state.preview.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-ocean-700">
                  数据预览（共 {state.count} 条，显示前 10 条）
                </p>
                {state.step === 'preview' && state.errors.length === 0 && (
                  <button
                    onClick={handleImport}
                    className="px-4 py-2 bg-aqua-500 text-white rounded-lg hover:bg-aqua-600 transition-colors text-sm font-medium"
                  >
                    确认导入
                  </button>
                )}
              </div>
              <div className="border border-ocean-100 rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-ocean-50">
                    <tr>
                      {previewHeaders.map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left font-medium text-ocean-600">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {state.preview.map((row, i) => (
                      <tr key={i} className="border-t border-ocean-100">
                        {previewHeaders.map((h) => (
                          <td key={h} className="px-4 py-2.5 text-ocean-700">
                            {String(row[h] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
