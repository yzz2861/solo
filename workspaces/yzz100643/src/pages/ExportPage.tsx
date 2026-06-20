import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle2,
  AlertTriangle,
  Settings,
  Eye,
  FileJson,
  File as FileIcon
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Input, Checkbox } from '@/components/ui/Form';
import ConfidenceIndicator from '@/components/ui/ConfidenceIndicator';
import useArchiveStore from '@/store/useArchiveStore';
import { exportArchive } from '@/services/export';
import { getFieldLabel, getStatusLabel, truncateText } from '@/utils/common';
import type { ExportOptions, FieldType, ExportFormat } from '@/types';

const ExportPage = () => {
  const navigate = useNavigate();
  const { getCurrentProject, getCurrentRecords } = useArchiveStore();
  
  const project = getCurrentProject();
  const records = getCurrentRecords();
  
  const [exportFormat, setExportFormat] = useState<ExportFormat>('xlsx');
  const [filename, setFilename] = useState(`档案目录_${new Date().toISOString().slice(0, 10)}`);
  const [includeOcrValue, setIncludeOcrValue] = useState(true);
  const [includeCorrectedValue, setIncludeCorrectedValue] = useState(true);
  const [includeConfidence, setIncludeConfidence] = useState(true);
  const [includePhotoPath, setIncludePhotoPath] = useState(true);
  const [includeStatus, setIncludeStatus] = useState(true);
  const [selectedFields, setSelectedFields] = useState<FieldType[]>([
    'name', 'date', 'documentNumber', 'pageNumber', 'materialType'
  ]);
  const [isExporting, setIsExporting] = useState(false);

  const fieldOptions: { value: FieldType; label: string }[] = [
    { value: 'name', label: '姓名' },
    { value: 'date', label: '日期' },
    { value: 'documentNumber', label: '编号' },
    { value: 'pageNumber', label: '页码' },
    { value: 'materialType', label: '材料类型' }
  ];

  const handleFieldToggle = (field: FieldType) => {
    setSelectedFields(prev => {
      if (prev.includes(field)) {
        return prev.filter(f => f !== field);
      } else {
        return [...prev, field];
      }
    });
  };

  const exportOptions: ExportOptions = useMemo(() => ({
    format: exportFormat,
    includeOcrValue,
    includeCorrectedValue,
    includeConfidence,
    includePhotoPath,
    includeStatus,
    fieldSelection: selectedFields,
    filename
  }), [
    exportFormat, includeOcrValue, includeCorrectedValue, includeConfidence,
    includePhotoPath, includeStatus, selectedFields, filename
  ]);

  const previewRecords = useMemo(() => {
    if (records.length === 0) return [];
    
    return records.slice(0, 5).map(record => {
      const row: Record<string, string> = {};
      
      row['照片文件名'] = record.photoFileName;
      if (includePhotoPath) row['照片路径'] = record.photoPath;
      if (includeStatus) row['校对状态'] = getStatusLabel(record.status);
      
      for (const fieldName of selectedFields) {
        const field = record.fields.find(f => f.fieldName === fieldName);
        const label = getFieldLabel(fieldName);
        
        if (includeCorrectedValue && field?.correctedValue) {
          row[label] = field.correctedValue;
        } else {
          row[label] = field?.ocrValue || '';
        }
        
        if (includeConfidence) {
          row[`${label}置信度`] = field ? `${(field.confidence * 100).toFixed(0)}%` : '未识别';
        }
      }
      
      row['整体置信度'] = `${(record.overallConfidence * 100).toFixed(0)}%`;
      
      return row;
    });
  }, [records, selectedFields, includeOcrValue, includeCorrectedValue, includeConfidence, includePhotoPath, includeStatus]);

  const stats = useMemo(() => {
    const correctedCount = records.filter(r => 
      r.fields.some(f => f.correctedValue && f.correctedValue !== f.ocrValue)
    ).length;
    
    const lowConfidenceCount = records.filter(r => 
      r.fields.some(f => f.isLowConfidence)
    ).length;
    
    const fieldStats = selectedFields.map(field => {
      const fieldRecords = records.map(r => r.fields.find(f => f.fieldName === field)).filter(Boolean);
      const lowCount = fieldRecords.filter(f => f?.isLowConfidence).length;
      const avgConfidence = fieldRecords.reduce((sum, f) => sum + (f?.confidence || 0), 0) / fieldRecords.length;
      
      return {
        field,
        label: getFieldLabel(field),
        total: records.length,
        lowConfidence: lowCount,
        avgConfidence
      };
    });
    
    return { correctedCount, lowConfidenceCount, fieldStats };
  }, [records, selectedFields]);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-archive-300" />
            <h3 className="font-serif text-xl font-semibold text-archive-800 mb-2">
              请先选择项目
            </h3>
            <p className="text-archive-500 mb-6">
              返回首页选择项目进行导出
            </p>
            <Button onClick={() => navigate('/')}>
              返回首页
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      alert('请至少选择一个导出字段');
      return;
    }
    
    setIsExporting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      exportArchive(records, exportOptions);
    } finally {
      setIsExporting(false);
    }
  };

  const estimatedRows = records.length * (
    (includeOcrValue ? 1 : 0) +
    (includeCorrectedValue ? 1 : 0) +
    (includeConfidence ? 1 : 0)
  ) * selectedFields.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-bold text-archive-900 mb-1">
            目录导出 - {project.name}
          </h1>
          <p className="text-archive-500 text-sm">
            导出包含原OCR、人工修正和照片路径的完整目录表
          </p>
        </div>
        <Button 
          onClick={handleExport}
          isLoading={isExporting}
          size="lg"
          leftIcon={<Download className="w-5 h-5" />}
        >
          导出目录
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-archive-100 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-archive-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-archive-800 font-serif">{records.length}</p>
                <p className="text-xs text-archive-500">导出记录数</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success font-serif">{stats.correctedCount}</p>
                <p className="text-xs text-archive-500">已修正记录</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-warning font-serif">{stats.lowConfidenceCount}</p>
                <p className="text-xs text-archive-500">低置信记录</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-archive-100 flex items-center justify-center">
                <Settings className="w-5 h-5 text-archive-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-archive-800 font-serif">{selectedFields.length}</p>
                <p className="text-xs text-archive-500">导出字段数</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">导出格式</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setExportFormat('xlsx')}
                  className={`p-4 border-2 rounded-xl text-center transition-all ${
                    exportFormat === 'xlsx'
                      ? 'border-archive-950 bg-archive-50'
                      : 'border-archive-200 hover:border-archive-300'
                  }`}
                >
                  <FileSpreadsheet className={`w-8 h-8 mx-auto mb-2 ${
                    exportFormat === 'xlsx' ? 'text-archive-950' : 'text-archive-400'
                  }`} />
                  <p className="font-medium text-archive-800">Excel</p>
                  <p className="text-xs text-archive-500">.xlsx</p>
                </button>
                <button
                  onClick={() => setExportFormat('csv')}
                  className={`p-4 border-2 rounded-xl text-center transition-all ${
                    exportFormat === 'csv'
                      ? 'border-archive-950 bg-archive-50'
                      : 'border-archive-200 hover:border-archive-300'
                  }`}
                >
                  <FileText className={`w-8 h-8 mx-auto mb-2 ${
                    exportFormat === 'csv' ? 'text-archive-950' : 'text-archive-400'
                  }`} />
                  <p className="font-medium text-archive-800">CSV</p>
                  <p className="text-xs text-archive-500">.csv</p>
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">文件名</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="输入文件名"
              />
              <p className="text-xs text-archive-500 mt-2">
                文件将自动添加扩展名 .{exportFormat}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">导出选项</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Checkbox
                label="包含原始OCR值"
                checked={includeOcrValue}
                onChange={(e) => setIncludeOcrValue(e.target.checked)}
              />
              <Checkbox
                label="包含人工修正值"
                checked={includeCorrectedValue}
                onChange={(e) => setIncludeCorrectedValue(e.target.checked)}
              />
              <Checkbox
                label="包含置信度"
                checked={includeConfidence}
                onChange={(e) => setIncludeConfidence(e.target.checked)}
              />
              <Checkbox
                label="包含照片路径"
                checked={includePhotoPath}
                onChange={(e) => setIncludePhotoPath(e.target.checked)}
              />
              <Checkbox
                label="包含校对状态"
                checked={includeStatus}
                onChange={(e) => setIncludeStatus(e.target.checked)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">选择字段</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {fieldOptions.map(field => (
                <Checkbox
                  key={field.value}
                  label={field.label}
                  checked={selectedFields.includes(field.value)}
                  onChange={() => handleFieldToggle(field.value)}
                />
              ))}
              {selectedFields.length === 0 && (
                <p className="text-xs text-error mt-2">请至少选择一个字段</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">导出统计</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.fieldStats.map(stat => (
                <div key={stat.field} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-archive-700">{stat.label}</span>
                    <span className="text-xs text-archive-500">
                      {stat.lowConfidence} 低置信
                    </span>
                  </div>
                  <ConfidenceIndicator confidence={stat.avgConfidence} />
                </div>
              ))}
              
              <div className="pt-3 border-t border-archive-100">
                <p className="text-sm text-archive-600 mb-2">导出信息</p>
                <ul className="space-y-1 text-xs text-archive-500">
                  <li>记录数：{records.length} 条</li>
                  <li>字段数：{selectedFields.length} 个</li>
                  <li>预计单元格数：约 {estimatedRows.toLocaleString()} 个</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="w-5 h-5 text-archive-600" />
                  导出预览
                </CardTitle>
                <Badge variant="info">显示前 5 条</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {records.length === 0 ? (
                <div className="text-center py-12 text-archive-500">
                  <FileIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>暂无数据可导出</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-archive-200">
                        {Object.keys(previewRecords[0] || {}).map((key) => (
                          <th 
                            key={key} 
                            className="text-left py-3 px-4 font-medium text-archive-700 bg-archive-50 whitespace-nowrap"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRecords.map((row, i) => (
                        <tr key={i} className="border-b border-archive-50 hover:bg-archive-50/50">
                          {Object.entries(row).map(([key, value]) => (
                            <td key={key} className="py-3 px-4 text-archive-600 max-w-xs">
                              {truncateText(value, 30)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">导出字段说明</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {selectedFields.map(field => {
                  const label = getFieldLabel(field);
                  return (
                    <div key={field} className="p-3 bg-archive-50 rounded-lg">
                      <p className="font-medium text-archive-800 mb-1">{label}</p>
                      <p className="text-xs text-archive-500">
                        {field === 'name' && '抽取的人员姓名，支持繁简体转换和同名检测'}
                        {field === 'date' && '识别的日期，支持民国纪年、干支纪年等旧写法'}
                        {field === 'documentNumber' && '识别的档案编号，支持多种格式'}
                        {field === 'pageNumber' && '识别的页码，支持中文数字和阿拉伯数字'}
                        {field === 'materialType' && '自动分类的材料类型'}
                      </p>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 p-4 bg-gradient-to-r from-archive-950 to-archive-800 rounded-xl text-white">
                <h4 className="font-serif font-semibold mb-2">导出内容包含</h4>
                <ul className="space-y-1 text-sm text-archive-100">
                  {includeOcrValue && <li>✓ OCR原始识别值，保留原始识别结果用于追溯</li>}
                  {includeCorrectedValue && <li>✓ 人工修正值，记录档案员的校对结果</li>}
                  {includeConfidence && <li>✓ 置信度评估，帮助判断字段可靠性</li>}
                  {includePhotoPath && <li>✓ 照片路径，方便定位原始扫描件</li>}
                  {includeStatus && <li>✓ 校对状态，标记每条记录的处理进度</li>}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">操作提示</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <p className="font-medium text-archive-800 text-sm">Excel格式</p>
                    <p className="text-xs text-archive-500">包含完整目录、低置信字段、统计信息三个工作表</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-archive-100 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-4 h-4 text-archive-600" />
                  </div>
                  <div>
                    <p className="font-medium text-archive-800 text-sm">CSV格式</p>
                    <p className="text-xs text-archive-500">UTF-8编码，带BOM，可直接用Excel打开</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                  </div>
                  <div>
                    <p className="font-medium text-archive-800 text-sm">低置信标记</p>
                    <p className="text-xs text-archive-500">置信度低于60%的字段会用特殊标记突出显示</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-archive-100 flex items-center justify-center shrink-0 mt-0.5">
                    <FileJson className="w-4 h-4 text-archive-600" />
                  </div>
                  <div>
                    <p className="font-medium text-archive-800 text-sm">数据安全</p>
                    <p className="text-xs text-archive-500">所有数据在本地处理，不会上传到任何服务器</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ExportPage;
