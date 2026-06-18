import React, { useState, useRef } from 'react';
import Layout from '../components/layout/Layout';
import { useRoleAccess } from '../hooks/useRoleAccess';
import { useDataStore } from '../store/useDataStore';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Alert } from '../components/ui/Alert';
import { Progress } from '../components/ui/Progress';
import {
  Upload, FileSpreadsheet, CheckCircle, AlertCircle,
  XCircle, Download, Info, Trash2, Clock, FileText, RefreshCw, Database
} from 'lucide-react';
import Papa from 'papaparse';
import { parseOrders, parseRefunds, parseWardCounts, parseHolidays, ParseResult } from '../utils/dataParser';
import { Order, Refund, WardCount, Holiday } from '../types';

type ImportType = 'orders' | 'refunds' | 'wardCounts' | 'holidays';

interface ImportFileState<T = any> {
  type: ImportType;
  file: File | null;
  status: 'idle' | 'uploading' | 'parsing' | 'importing' | 'success' | 'error';
  progress: number;
  message: string;
  records: number;
  errors: string[];
  warnings: string[];
  parsedData?: T[];
}

const TEMPLATES: Record<ImportType, { headers: string[]; sample: string[][] }> = {
  orders: {
    headers: ['订单号', '患者ID', '患者姓名', '家属姓名', '病区ID', '病区名称', '餐品ID', '餐品名称', '餐次', '订餐日期', '数量', '价格', '状态', '特殊餐', '饮食类型', '创建时间', '备注'],
    sample: [
      ['ORD-000001', 'P1001', '张三', '张三家属', 'ward-001', '内科一病区', 'MEAL-001', '营养午餐', '午餐', '2026-06-18', '1', '25', '已完成', '否', '', '2026-06-18 10:30:00', ''],
      ['ORD-000002', 'P1002', '李四', '李四爱人', 'ward-002', '外科二病区', 'MEAL-007', '糖尿病餐', '午餐', '2026-06-18', '1', '28', '已确认', '是', 'diabetic', '2026-06-18 11:05:00', '少糖少油'],
    ]
  },
  refunds: {
    headers: ['退餐号', '原订单号', '退餐原因', '原因详情', '退餐金额', '退餐时间', '操作人'],
    sample: [
      ['REF-0001', 'ORD-000001', '出院', '患者今日上午办理出院', '25', '2026-06-18 09:30:00', '王护士'],
      ['REF-0002', 'ORD-000003', '重复', '家属重复下单', '20', '2026-06-18 12:15:00', '系统'],
    ]
  },
  wardCounts: {
    headers: ['ID', '病区ID', '病区名称', '上报日期', '患者人数', '陪护人数', '特殊餐人数', '上报人', '是否封控'],
    sample: [
      ['WC-001', 'ward-001', '内科一病区', '2026-06-18', '40', '35', '5', '张护士长', '否'],
      ['WC-002', 'ward-003', '感染科病区', '2026-06-18', '22', '18', '3', '李护士长', '是'],
    ]
  },
  holidays: {
    headers: ['日期', '节假日名称', '类型', '影响因子', '备注'],
    sample: [
      ['2026-10-01', '国庆节', 'public', '1.3', '预计订餐量上升30%'],
      ['2026-06-18', '医院周年庆', 'hospital', '0.9', '院庆当天食堂供应加餐'],
    ]
  }
};

const DataImport: React.FC = () => {
  const { hasAccess } = useRoleAccess();
  const dataStore = useDataStore();
  const { orders, refunds, wardCounts, holidays, specialMeals } = dataStore;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedType, setSelectedType] = useState<ImportType>('orders');
  const [importFiles, setImportFiles] = useState<Record<ImportType, ImportFileState>>({
    orders: { type: 'orders', file: null, status: 'idle', progress: 0, message: '', records: 0, errors: [], warnings: [] },
    refunds: { type: 'refunds', file: null, status: 'idle', progress: 0, message: '', records: 0, errors: [], warnings: [] },
    wardCounts: { type: 'wardCounts', file: null, status: 'idle', progress: 0, message: '', records: 0, errors: [], warnings: [] },
    holidays: { type: 'holidays', file: null, status: 'idle', progress: 0, message: '', records: 0, errors: [], warnings: [] }
  });

  const [previewData, setPreviewData] = useState<any[]>([]);

  const importTypeConfig: Record<ImportType, { label: string; description: string; icon: React.ReactNode; color: string }> = {
    orders: { label: '订餐记录', description: '导入患者家属的线上订餐记录', icon: <FileSpreadsheet className="w-5 h-5" />, color: 'blue' },
    refunds: { label: '退餐记录', description: '导入各类原因的退餐记录', icon: <Trash2 className="w-5 h-5" />, color: 'red' },
    wardCounts: { label: '病区人数', description: '导入各病区每日上报的陪护人数', icon: <FileText className="w-5 h-5" />, color: 'green' },
    holidays: { label: '节假日备注', description: '导入节假日及特殊日期备注', icon: <Clock className="w-5 h-5" />, color: 'purple' }
  };

  const getCurrentRecordCount = (type: ImportType) => {
    switch (type) {
      case 'orders': return orders.length;
      case 'refunds': return refunds.length;
      case 'wardCounts': return wardCounts.length;
      case 'holidays': return holidays.length;
    }
  };

  const updateState = (type: ImportType, patch: Partial<ImportFileState>) => {
    setImportFiles(prev => ({ ...prev, [type]: { ...prev[type], ...patch } }));
  };

  const downloadTemplate = (type: ImportType) => {
    const tpl = TEMPLATES[type];
    const csv = Papa.unparse({ fields: tpl.headers, data: tpl.sample });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${importTypeConfig[type].label}_模板.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    updateState(selectedType, {
      file,
      status: 'idle',
      progress: 0,
      message: `已选择文件: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
      errors: [],
      warnings: [],
      parsedData: undefined
    });
    Papa.parse(file, {
      header: true, skipEmptyLines: true, preview: 5,
      complete: (results) => setPreviewData(results.data as any[])
    });
  };

  const updateProgress = async (type: ImportType, from: number, to: number, step: number, status: ImportFileState['status']) => {
    for (let i = from; i <= to; i += step) {
      await new Promise(resolve => setTimeout(resolve, 50));
      updateState(type, { progress: i, status });
    }
  };

  const handleImport = async (type: ImportType) => {
    const state = importFiles[type];
    if (!state.file) return;

    try {
      await updateProgress(type, 0, 30, 10, 'uploading');
      updateState(type, { status: 'parsing', message: '正在解析数据...' });

      let result: ParseResult<any>;
      switch (type) {
        case 'orders': result = await parseOrders(state.file); break;
        case 'refunds': result = await parseRefunds(state.file); break;
        case 'wardCounts': result = await parseWardCounts(state.file); break;
        case 'holidays': result = await parseHolidays(state.file); break;
      }

      await updateProgress(type, 31, 60, 5, 'parsing');

      if (result.errors.length > 0 && result.data.length === 0) {
        updateState(type, {
          status: 'error',
          progress: 100,
          message: `解析失败: 存在 ${result.errors.length} 条错误，无有效数据`,
          records: 0,
          errors: result.errors,
          warnings: result.warnings,
          parsedData: result.data
        });
        return;
      }

      updateState(type, { status: 'importing', message: '正在写入业务状态...' });
      await updateProgress(type, 61, 85, 5, 'importing');

      let summary = { count: result.data.length, extra: '' };
      let generatedAlerts: any[] = [];

      switch (type) {
        case 'orders': {
          const res = dataStore.importOrders(result.data as Order[]);
          summary = { count: res.count, extra: `，其中特殊餐 ${res.specialCount} 份` };
          generatedAlerts = res.alerts;
          break;
        }
        case 'refunds': {
          const res = dataStore.importRefunds(result.data as Refund[]);
          summary = { count: res.count, extra: `，已关联更新 ${res.updatedOrders} 笔订单状态` };
          generatedAlerts = res.alerts;
          break;
        }
        case 'wardCounts': {
          const res = dataStore.importWardCounts(result.data as WardCount[]);
          summary = { count: res.count, extra: '' };
          generatedAlerts = res.alerts;
          break;
        }
        case 'holidays': {
          const res = dataStore.importHolidays(result.data as Holiday[]);
          summary = { count: res.count, extra: '' };
          break;
        }
      }

      await updateProgress(type, 86, 100, 5, 'success');

      const hasWarnings = result.warnings.length > 0 || result.errors.length > 0;
      const alertMsg = generatedAlerts.length > 0 ? `，系统自动生成 ${generatedAlerts.length} 条预警` : '';

      updateState(type, {
        status: hasWarnings && result.errors.length > 0 ? 'error' : 'success',
        progress: 100,
        message: `成功导入 ${summary.count} 条记录${summary.extra}${alertMsg}`,
        records: summary.count,
        errors: result.errors,
        warnings: result.warnings,
        parsedData: result.data
      });
    } catch (err: any) {
      updateState(type, {
        status: 'error',
        progress: 100,
        message: `导入失败: ${err?.message || String(err)}`,
        records: 0,
        errors: [err?.message || String(err)],
        warnings: []
      });
    }
  };

  const handleReset = (type: ImportType) => {
    setImportFiles(prev => ({
      ...prev,
      [type]: { type, file: null, status: 'idle', progress: 0, message: '', records: 0, errors: [], warnings: [] }
    }));
    setPreviewData([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleResetAllData = () => {
    if (window.confirm('确定要清空所有业务数据吗？此操作不可撤销（可通过重新导入恢复）')) {
      dataStore.clearAllData();
      setImportFiles({
        orders: { type: 'orders', file: null, status: 'idle', progress: 0, message: '已清空订餐数据', records: 0, errors: [], warnings: [] },
        refunds: { type: 'refunds', file: null, status: 'idle', progress: 0, message: '已清空退餐数据', records: 0, errors: [], warnings: [] },
        wardCounts: { type: 'wardCounts', file: null, status: 'idle', progress: 0, message: '已清空病区人数数据', records: 0, errors: [], warnings: [] },
        holidays: { type: 'holidays', file: null, status: 'idle', progress: 0, message: '已清空节假日数据', records: 0, errors: [], warnings: [] }
      });
    }
  };

  const handleReloadMock = () => {
    if (window.confirm('确定要加载示例数据吗？将覆盖当前已导入的数据')) {
      dataStore.loadMockData();
    }
  };

  const getStatusIcon = (status: ImportFileState['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'uploading':
      case 'parsing':
      case 'importing':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      default: return null;
    }
  };

  const statusBusy = (type: ImportType) =>
    ['uploading', 'parsing', 'importing'].includes(importFiles[type].status);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Upload className="w-7 h-7 text-blue-600" />
              数据导入
            </h1>
            <p className="text-gray-500 mt-1">
              导入订餐记录、退餐记录、病区人数和节假日数据，导入后将自动驱动图表、备餐建议与特殊餐核对
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReloadMock}>
              <RefreshCw className="w-4 h-4 mr-1" />
              加载示例数据
            </Button>
            <Button variant="outline" onClick={handleResetAllData}>
              <Database className="w-4 h-4 mr-1" />
              清空业务数据
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-blue-50/60">
            <CardContent className="pt-4">
              <div className="text-xs text-blue-600 font-medium mb-1">订餐记录</div>
              <div className="text-2xl font-bold text-blue-700">{orders.length}</div>
              <div className="text-xs text-blue-500 mt-1">特殊餐 {specialMeals.length} 份待核对</div>
            </CardContent>
          </Card>
          <Card className="bg-red-50/60">
            <CardContent className="pt-4">
              <div className="text-xs text-red-600 font-medium mb-1">退餐记录</div>
              <div className="text-2xl font-bold text-red-700">{refunds.length}</div>
              <div className="text-xs text-red-500 mt-1">自动关联订单状态</div>
            </CardContent>
          </Card>
          <Card className="bg-green-50/60">
            <CardContent className="pt-4">
              <div className="text-xs text-green-600 font-medium mb-1">病区人数</div>
              <div className="text-2xl font-bold text-green-700">{wardCounts.length}</div>
              <div className="text-xs text-green-500 mt-1">覆盖 {new Set(wardCounts.map(w => w.wardId)).size} 个病区</div>
            </CardContent>
          </Card>
          <Card className="bg-purple-50/60">
            <CardContent className="pt-4">
              <div className="text-xs text-purple-600 font-medium mb-1">节假日备注</div>
              <div className="text-2xl font-bold text-purple-700">{holidays.length}</div>
              <div className="text-xs text-purple-500 mt-1">含影响因子与备注</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(Object.keys(importTypeConfig) as ImportType[]).map(type => {
            const config = importTypeConfig[type];
            const importFile = importFiles[type];
            return (
              <Card
                key={type}
                className={`cursor-pointer transition-all hover:shadow-md ${selectedType === type ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                onClick={() => setSelectedType(type)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${config.color}-100 text-${config.color}-600`}>
                      {config.icon}
                    </div>
                    {getStatusIcon(importFile.status)}
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-1">{config.label}</h3>
                  <p className="text-sm text-gray-500 mb-3">{config.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">现有数据</span>
                    <span className="text-sm font-mono font-bold text-gray-700">{getCurrentRecordCount(type)} 条</span>
                  </div>
                  {statusBusy(type) && (
                    <div className="mt-2">
                      <Progress value={importFile.progress} max={100} variant="info" />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {importTypeConfig[selectedType].icon}
                导入 {importTypeConfig[selectedType].label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${importFiles[selectedType].file ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}>
                {importFiles[selectedType].file ? (
                  <div className="space-y-3">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                    <div className="font-medium text-gray-800">{importFiles[selectedType].file?.name}</div>
                    <div className="text-sm text-gray-500">{(importFiles[selectedType].file?.size / 1024).toFixed(1)} KB</div>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleReset(selectedType); }}>重新选择</Button>
                  </div>
                ) : (
                  <div className="cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <div className="font-medium text-gray-600 mb-1">点击或拖拽文件到此处</div>
                    <div className="text-sm text-gray-400">支持 CSV 格式文件（UTF-8 编码）</div>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
              </div>

              {statusBusy(selectedType) && (
                <div className="mt-6">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">
                      {importFiles[selectedType].status === 'uploading' && '正在读取文件...'}
                      {importFiles[selectedType].status === 'parsing' && '正在解析数据并检测异常...'}
                      {importFiles[selectedType].status === 'importing' && '正在写入业务状态...'}
                    </span>
                    <span className="text-blue-600 font-mono">{importFiles[selectedType].progress}%</span>
                  </div>
                  <Progress value={importFiles[selectedType].progress} max={100} variant="info" />
                </div>
              )}

              {importFiles[selectedType].message && (
                <Alert
                  variant={importFiles[selectedType].status === 'error' ? 'danger' : 'success'}
                  className="mt-4"
                >
                  {importFiles[selectedType].message}
                </Alert>
              )}

              {importFiles[selectedType].warnings.length > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    数据提醒 ({importFiles[selectedType].warnings.length} 条)
                  </h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {importFiles[selectedType].warnings.map((w, i) => <li key={i}>· {w}</li>)}
                  </ul>
                </div>
              )}

              {importFiles[selectedType].errors.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                  <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    导入错误详情 ({importFiles[selectedType].errors.length} 条)
                  </h4>
                  <ul className="text-sm text-red-600 space-y-1 max-h-32 overflow-y-auto">
                    {importFiles[selectedType].errors.slice(0, 5).map((error, i) => <li key={i}>· {error}</li>)}
                    {importFiles[selectedType].errors.length > 5 && (
                      <li className="text-red-400">...还有 {importFiles[selectedType].errors.length - 5} 条错误</li>
                    )}
                  </ul>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => handleReset(selectedType)} disabled={statusBusy(selectedType)}>重置</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => downloadTemplate(selectedType)}>
                  <Download className="w-4 h-4 mr-1" />下载模板
                </Button>
                <Button variant="primary" onClick={() => handleImport(selectedType)} disabled={!importFiles[selectedType].file || statusBusy(selectedType)}>
                  <Upload className="w-4 h-4 mr-1" />
                  开始导入
                </Button>
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-gray-500" />
                数据预览
              </CardTitle>
              {previewData.length > 0 && <Badge variant="default">前 {previewData.length} 条</Badge>}
            </CardHeader>
            <CardContent>
              {previewData.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(previewData[0]).slice(0, 6).map(key => (
                          <TableHead key={key} className="text-xs">{key}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((row, i) => (
                        <TableRow key={i}>
                          {Object.values(row).slice(0, 6).map((value: any, j) => (
                            <TableCell key={j} className="text-xs text-gray-600">
                              {String(value || '').slice(0, 15)}{String(value || '').length > 15 ? '...' : ''}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <FileSpreadsheet className="w-16 h-16 mx-auto mb-3 opacity-50" />
                  <p>选择文件后将在此处预览数据</p>
                  <p className="text-sm mt-1">仅显示前 5 条记录</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-500" />
              导入规范说明
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">CSV文件格式要求</h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />文件编码必须为 UTF-8（推荐）或 GBK</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />第一行为表头，字段名需与模板一致（支持中英文）</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />日期格式统一使用 YYYY-MM-DD</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />时间格式统一使用 HH:MM:SS 或完整时间戳</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />导入成功后数据将立即生效，驱动图表、备餐建议与预测</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">系统自动处理</h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />重复订餐检测：同患者同餐次自动标记 flags.isDuplicate</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />跨午夜识别：夜宵 23:00-02:00 订单自动识别</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />退餐关联：退餐表自动将对应订单标记为 refunded</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />特殊餐生成：导入订餐时 isSpecial=true 的订单自动进入特殊餐核对</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />异常预警：根据导入数据自动生成缺餐/浪费/封控等预警通知</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default DataImport;
