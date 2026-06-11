import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, CheckCircle, AlertTriangle, FileText, ArrowRight, Info } from 'lucide-react';
import { useBatchStore } from '@/store/useBatchStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FileUpload } from '@/components/DataImport/FileUpload';
import { DataPreview } from '@/components/DataImport/DataPreview';
import { generateSampleCSV } from '@/utils/csvParser';
import { formatDateTime } from '@/utils/timeParser';

export default function DataImport() {
  const navigate = useNavigate();
  const { importPreview, importCSVFiles, confirmImport, resetImportPreview } = useBatchStore();

  const handleFilesSelected = useCallback((files: File[]) => {
    importCSVFiles(files);
  }, [importCSVFiles]);

  const handleConfirm = () => {
    const batchCount = confirmImport();
    if (batchCount > 0) {
      navigate('/batches');
    }
  };

  const handleDownloadSample = (type: 'temperature' | 'sugar' | 'feeding') => {
    const { content, filename } = generateSampleCSV(type);
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totalRecords = importPreview.temperatureLogs.length + 
    importPreview.sugarReadings.length + 
    importPreview.feedingRecords.length;
  
  const validRecords = importPreview.temperatureLogs.filter(r => !r.isBadRow).length +
    importPreview.sugarReadings.filter(r => !r.isBadRow).length +
    importPreview.feedingRecords.filter(r => !r.isBadRow).length;
  
  const badRecords = importPreview.badRows.length;
  const newBatches = importPreview.previewBatches;

  const hasData = totalRecords > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-amber-900">数据导入</h1>
          <p className="text-amber-600 mt-1">上传温度日志、糖度记录和投料记录</p>
        </div>
        {hasData && (
          <div className="flex gap-3">
            <Button variant="ghost" onClick={resetImportPreview}>
              重新选择
            </Button>
            <Button onClick={handleConfirm} disabled={newBatches.length === 0}>
              确认导入
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {!hasData ? (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <FileUpload onFilesSelected={handleFilesSelected} />
          </div>
          
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Info className="w-4 h-4 text-amber-500" />
                  支持的文件格式
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Badge variant="danger" className="flex-shrink-0">温度日志</Badge>
                  <div>
                    <p className="text-amber-800">分钟级温控数据</p>
                    <p className="text-amber-500 text-xs">列：缸号、时间、温度</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="info" className="flex-shrink-0">糖度记录</Badge>
                  <div>
                    <p className="text-amber-800">每日手抄糖度</p>
                    <p className="text-amber-500 text-xs">列：缸号、时间、糖度(Brix/%)</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="amber" className="flex-shrink-0">投料记录</Badge>
                  <div>
                    <p className="text-amber-800">原料投料信息</p>
                    <p className="text-amber-500 text-xs">列：缸号、时间、类型、数量</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4 text-amber-500" />
                  下载示例文件
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => handleDownloadSample('temperature')}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  温度日志示例.csv
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => handleDownloadSample('sugar')}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  糖度记录示例.csv
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => handleDownloadSample('feeding')}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  投料记录示例.csv
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-amber-600">总记录数</p>
                    <p className="text-2xl font-bold text-amber-900">{totalRecords}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600">有效记录</p>
                    <p className="text-2xl font-bold text-green-700">{validRecords}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-600">待复核</p>
                    <p className="text-2xl font-bold text-orange-700">{badRecords}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600">新增批次</p>
                    <p className="text-2xl font-bold text-blue-700">{newBatches.length}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {newBatches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">将创建以下批次</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {newBatches.map((batch, idx) => (
                    <div key={idx} className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                      <p className="font-medium text-amber-900">{batch.batchNo}</p>
                      <p className="text-sm text-amber-600">{batch.tankNo}</p>
                      <p className="text-xs text-amber-500 mt-1">
                        {formatDateTime(batch.startTime)}
                      </p>
                      <div className="flex gap-2 mt-2 text-xs">
                        <span className="text-amber-600">
                          温度 {batch.temperatureLogs.length}条
                        </span>
                        <span className="text-blue-600">
                          糖度 {batch.sugarReadings.length}条
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <DataPreview 
            preview={importPreview} 
            onConfirm={handleConfirm}
            onCancel={resetImportPreview}
          />
        </div>
      )}
    </div>
  );
}
