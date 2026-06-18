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
  XCircle, Download, Info, Trash2, Clock, FileText
} from 'lucide-react';
import Papa from 'papaparse';

type ImportType = 'orders' | 'refunds' | 'wardCounts' | 'holidays';

interface ImportFile {
  type: ImportType;
  file: File | null;
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  message: string;
  records: number;
  errors: string[];
}

const DataImport: React.FC = () => {
  const { hasAccess } = useRoleAccess();
  const { orders, refunds, wardCounts, holidays } = useDataStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState<ImportType>('orders');
  const [importFiles, setImportFiles] = useState<Record<ImportType, ImportFile>>({
    orders: { type: 'orders', file: null, status: 'idle', progress: 0, message: '', records: 0, errors: [] },
    refunds: { type: 'refunds', file: null, status: 'idle', progress: 0, message: '', records: 0, errors: [] },
    wardCounts: { type: 'wardCounts', file: null, status: 'idle', progress: 0, message: '', records: 0, errors: [] },
    holidays: { type: 'holidays', file: null, status: 'idle', progress: 0, message: '', records: 0, errors: [] }
  });
  
  const [previewData, setPreviewData] = useState<any[]>([]);
  
  const importTypeConfig: Record<ImportType, { label: string; description: string; icon: React.ReactNode; color: string }> = {
    orders: {
      label: '订餐记录',
      description: '导入患者家属的线上订餐记录',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      color: 'blue'
    },
    refunds: {
      label: '退餐记录',
      description: '导入各类原因的退餐记录',
      icon: <Trash2 className="w-5 h-5" />,
      color: 'red'
    },
    wardCounts: {
      label: '病区人数',
      description: '导入各病区每日上报的陪护人数',
      icon: <FileText className="w-5 h-5" />,
      color: 'green'
    },
    holidays: {
      label: '节假日备注',
      description: '导入节假日及特殊日期备注',
      icon: <Clock className="w-5 h-5" />,
      color: 'purple'
    }
  };
  
  const getCurrentRecordCount = (type: ImportType) => {
    switch (type) {
      case 'orders': return orders.length;
      case 'refunds': return refunds.length;
      case 'wardCounts': return wardCounts.length;
      case 'holidays': return holidays.length;
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImportFiles(prev => ({
      ...prev,
      [selectedType]: {
        ...prev[selectedType],
        file,
        status: 'idle',
        progress: 0,
        message: `已选择文件: ${file.name}`,
        errors: []
      }
    }));
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: 5,
      complete: (results) => {
        setPreviewData(results.data);
      }
    });
  };
  
  const handleImport = async (type: ImportType) => {
    const importFile = importFiles[type];
    if (!importFile.file) return;
    
    setImportFiles(prev => ({
      ...prev,
      [type]: { ...prev[type], status: 'uploading', progress: 0 }
    }));
    
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setImportFiles(prev => ({
        ...prev,
        [type]: { ...prev[type], progress: i }
      }));
    }
    
    Papa.parse(importFile.file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const errors: string[] = [];
        const validRecords = results.data.filter((row: any, index: number) => {
          if (!row.id || !row.orderDate) {
            errors.push(`第 ${index + 2} 行: 缺少必要字段`);
            return false;
          }
          return true;
        });
        
        if (errors.length > 0) {
          setImportFiles(prev => ({
            ...prev,
            [type]: {
              ...prev[type],
              status: 'error',
              progress: 100,
              message: `导入完成，但有 ${errors.length} 条记录存在问题`,
              records: validRecords.length,
              errors
            }
          }));
        } else {
          setImportFiles(prev => ({
            ...prev,
            [type]: {
              ...prev[type],
              status: 'success',
              progress: 100,
              message: `成功导入 ${validRecords.length} 条记录`,
              records: validRecords.length,
              errors: []
            }
          }));
        }
      },
      error: (error) => {
        setImportFiles(prev => ({
          ...prev,
          [type]: {
            ...prev[type],
            status: 'error',
            progress: 100,
            message: `导入失败: ${error.message}`,
            records: 0,
            errors: [error.message]
          }
        }));
      }
    });
  };
  
  const handleReset = (type: ImportType) => {
    setImportFiles(prev => ({
      ...prev,
      [type]: { type, file: null, status: 'idle', progress: 0, message: '', records: 0, errors: [] }
    }));
    setPreviewData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const getStatusIcon = (status: ImportFile['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'uploading': return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      default: return null;
    }
  };
  
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
              导入订餐记录、退餐记录、病区人数和节假日数据
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(Object.keys(importTypeConfig) as ImportType[]).map(type => {
            const config = importTypeConfig[type];
            const importFile = importFiles[type];
            
            return (
              <Card 
                key={type}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedType === type ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                }`}
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
                    <span className="text-sm font-mono font-bold text-gray-700">
                      {getCurrentRecordCount(type)} 条
                    </span>
                  </div>
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
              <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  importFiles[selectedType].file 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                {importFiles[selectedType].file ? (
                  <div className="space-y-3">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                    <div className="font-medium text-gray-800">
                      {importFiles[selectedType].file?.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {(importFiles[selectedType].file?.size / 1024).toFixed(1)} KB
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReset(selectedType);
                      }}
                    >
                      重新选择
                    </Button>
                  </div>
                ) : (
                  <div 
                    className="cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <div className="font-medium text-gray-600 mb-1">
                      点击或拖拽文件到此处
                    </div>
                    <div className="text-sm text-gray-400">
                      支持 CSV 格式文件
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
              
              {importFiles[selectedType].status === 'uploading' && (
                <div className="mt-6">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">正在导入...</span>
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
              
              {importFiles[selectedType].errors.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                  <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    导入错误详情
                  </h4>
                  <ul className="text-sm text-red-600 space-y-1 max-h-32 overflow-y-auto">
                    {importFiles[selectedType].errors.slice(0, 5).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                    {importFiles[selectedType].errors.length > 5 && (
                      <li className="text-red-400">...还有 {importFiles[selectedType].errors.length - 5} 条错误</li>
                    )}
                  </ul>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => handleReset(selectedType)}
                disabled={importFiles[selectedType].status === 'uploading'}
              >
                重置
              </Button>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-1" />
                  下载模板
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleImport(selectedType)}
                  disabled={!importFiles[selectedType].file || importFiles[selectedType].status === 'uploading'}
                >
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
              {previewData.length > 0 && (
                <Badge variant="default">
                  前 {previewData.length} 条
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {previewData.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(previewData[0]).slice(0, 6).map(key => (
                          <TableHead key={key} className="text-xs">
                            {key}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((row, i) => (
                        <TableRow key={i}>
                          {Object.values(row).slice(0, 6).map((value: any, j) => (
                            <TableCell key={j} className="text-xs text-gray-600">
                              {String(value).slice(0, 15)}{String(value).length > 15 ? '...' : ''}
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
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    文件编码必须为 UTF-8 或 GBK
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    第一行为表头，字段名需与模板一致
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    日期格式统一使用 YYYY-MM-DD
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    时间格式统一使用 HH:MM:SS
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">字段说明（订餐记录）</h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">*</span>
                    <span><strong>id</strong>: 订单唯一标识（必填）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">*</span>
                    <span><strong>orderDate</strong>: 订餐日期（必填）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">*</span>
                    <span><strong>mealType</strong>: 餐次类型（breakfast/lunch/dinner/supper）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 font-bold">*</span>
                    <span><strong>refundReason</strong>: 退餐原因（如有退餐）</span>
                  </li>
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
