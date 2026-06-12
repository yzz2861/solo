import { useState, useRef } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle,
  Download,
  Info
} from 'lucide-react';
import { message, Progress } from 'antd';
import { Layout } from '../../components/layout/Layout';
import { useDataStore } from '../../store/useDataStore';
import type { PillboxRecord, NurseRecord, Prescription } from '../../../shared/types';

type ImportType = 'pillbox' | 'nurse' | 'prescription';

interface FileInfo {
  name: string;
  size: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  imported?: number;
  errors?: Array<{ row: number; message: string }>;
}

export function ImportCenter() {
  const { importPillboxRecords, importNurseRecords, importPrescriptions } = useDataStore();
  const [activeTab, setActiveTab] = useState<ImportType>('pillbox');
  const [file, setFile] = useState<FileInfo | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { key: 'pillbox', label: '药盒打卡记录', icon: FileSpreadsheet, color: '#165DFF' },
    { key: 'nurse', label: '护理员补服记录', icon: FileSpreadsheet, color: '#722ED1' },
    { key: 'prescription', label: '医嘱变更记录', icon: FileSpreadsheet, color: '#00B42A' },
  ];

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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

  const validateAndParseFile = async (fileObj: File): Promise<{
    success: boolean;
    records: any[];
    errors: Array<{ row: number; message: string }>;
  }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          resolve({ success: false, records: [], errors: [{ row: 1, message: '文件内容为空或格式不正确' }] });
          return;
        }

        const errors: Array<{ row: number; message: string }> = [];
        const records: any[] = [];
        const headers = lines[0].split(',').map(h => h.trim());

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const rowNum = i + 1;

          try {
            if (activeTab === 'pillbox') {
              const [elderlyId, medicationId, timestamp, deviceId, deviceStatus, isSuccess] = values;
              if (!elderlyId || !medicationId || !timestamp) {
                errors.push({ row: rowNum, message: '缺少必要字段' });
                continue;
              }
              records.push({
                id: `pill_${Date.now()}_${i}`,
                elderlyId,
                medicationId,
                timestamp,
                deviceId: deviceId || 'UNKNOWN',
                deviceStatus: (deviceStatus as any) || 'online',
                isSuccess: isSuccess?.toLowerCase() !== 'false',
              } as PillboxRecord);
            } else if (activeTab === 'nurse') {
              const [elderlyId, medicationId, timestamp, nurseName, type, note, publicNote] = values;
              if (!elderlyId || !medicationId || !timestamp || !nurseName) {
                errors.push({ row: rowNum, message: '缺少必要字段' });
                continue;
              }
              records.push({
                id: `nurse_${Date.now()}_${i}`,
                elderlyId,
                medicationId,
                timestamp,
                nurseName,
                type: (type as any) || 'supplement',
                note: note || '',
                publicNote,
              } as NurseRecord);
            } else {
              const [elderlyId, medicationId, startDate, endDate, status, changeReason, changeTime, doctorName] = values;
              if (!elderlyId || !medicationId || !startDate || !doctorName) {
                errors.push({ row: rowNum, message: '缺少必要字段' });
                continue;
              }
              records.push({
                id: `rx_${Date.now()}_${i}`,
                elderlyId,
                medicationId,
                startDate,
                endDate: endDate || undefined,
                status: (status as any) || 'active',
                changeReason: changeReason || undefined,
                changeTime: changeTime || undefined,
                doctorName,
              } as Prescription);
            }
          } catch (err) {
            errors.push({ row: rowNum, message: '数据格式错误' });
          }
        }

        resolve({ success: errors.length === 0, records, errors });
      };
      reader.readAsText(fileObj);
    });
  };

  const processFile = async (fileObj: File) => {
    setFile({
      name: fileObj.name,
      size: formatFileSize(fileObj.size),
      status: 'uploading',
      progress: 0,
    });

    try {
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setFile(prev => prev ? { ...prev, progress: i } : null);
      }

      const result = await validateAndParseFile(fileObj);

      if (result.records.length > 0) {
        let importResult;
        if (activeTab === 'pillbox') {
          importResult = importPillboxRecords(result.records);
        } else if (activeTab === 'nurse') {
          importResult = importNurseRecords(result.records);
        } else {
          importResult = importPrescriptions(result.records);
        }

        setFile(prev => prev ? {
          ...prev,
          status: result.errors.length > 0 ? 'error' : 'success',
          progress: 100,
          imported: importResult.imported,
          errors: result.errors,
        } : null);

        if (result.errors.length > 0) {
          message.warning(`导入完成，但有 ${result.errors.length} 条错误`);
        } else {
          message.success(`成功导入 ${importResult.imported} 条记录`);
        }
      } else {
        setFile(prev => prev ? {
          ...prev,
          status: 'error',
          progress: 100,
          errors: result.errors,
        } : null);
        message.error('文件解析失败');
      }
    } catch (error) {
      setFile(prev => prev ? {
        ...prev,
        status: 'error',
        progress: 100,
        errors: [{ row: 0, message: '文件处理失败' }],
      } : null);
      message.error('导入失败');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const downloadTemplate = () => {
    let headers = '';
    let example = '';
    
    if (activeTab === 'pillbox') {
      headers = 'elderlyId,medicationId,timestamp,deviceId,deviceStatus,isSuccess';
      example = 'elderly_001,med_001,2024-01-15 08:05:30,DEV_001,online,true';
    } else if (activeTab === 'nurse') {
      headers = 'elderlyId,medicationId,timestamp,nurseName,type,note,publicNote';
      example = 'elderly_001,med_001,2024-01-15 10:30:00,王护理,supplement,老人忘记服药，已协助补服,已妥善处理';
    } else {
      headers = 'elderlyId,medicationId,startDate,endDate,status,changeReason,changeTime,doctorName';
      example = 'elderly_001,med_001,2024-01-01,2024-01-15,discontinued,血压控制良好，暂停用药,2024-01-15,张医生';
    }

    const content = `${headers}\n${example}`;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeTab}_template.csv`;
    link.click();
    URL.revokeObjectURL(url);
    message.success('模板下载成功');
  };

  return (
    <Layout requiredRole="nurse">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据导入中心</h1>
          <p className="mt-1 text-gray-500">
            批量导入药盒打卡、护理记录和医嘱变更数据
          </p>
        </div>

        <div className="flex space-x-2 p-1 bg-gray-100 rounded-2xl">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key as ImportType);
                  setFile(null);
                }}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-medium transition-all ${
                  isActive
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-5 h-5" style={{ color: isActive ? tab.color : undefined }} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                上传 {tabs.find(t => t.key === activeTab)?.label}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                支持 CSV 格式文件，最大 10MB
              </p>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center space-x-2 px-4 py-2 text-sm text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>下载模板</span>
            </button>
          </div>

          <div
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileSelect}
            />
            
            {!file ? (
              <div className="pointer-events-none">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-blue-500" />
                </div>
                <p className="text-lg font-medium text-gray-900 mb-1">
                  拖拽文件到此处或点击上传
                </p>
                <p className="text-sm text-gray-500">
                  仅支持 CSV 格式文件
                </p>
              </div>
            ) : (
              <div className="pointer-events-none">
                {file.status === 'uploading' ? (
                  <div className="w-16 h-16 mx-auto mb-4">
                    <Progress
                      type="circle"
                      percent={file.progress}
                      size={64}
                      strokeColor="#165DFF"
                    />
                  </div>
                ) : file.status === 'success' ? (
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-50 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                ) : (
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                  </div>
                )}
                
                <p className="text-lg font-medium text-gray-900 mb-1">{file.name}</p>
                <p className="text-sm text-gray-500 mb-4">
                  {file.size} · {file.status === 'uploading' ? '上传中...' : 
                   file.status === 'success' ? `成功导入 ${file.imported} 条` : 
                   '导入失败'}
                </p>

                {file.errors && file.errors.length > 0 && (
                  <div className="max-h-40 overflow-y-auto text-left bg-red-50 rounded-xl p-4 border border-red-100">
                    <p className="text-sm font-medium text-red-700 mb-2">
                      错误记录 ({file.errors.length} 条)：
                    </p>
                    {file.errors.slice(0, 10).map((err, idx) => (
                      <p key={idx} className="text-xs text-red-600 mb-1">
                        第 {err.row} 行：{err.message}
                      </p>
                    ))}
                    {file.errors.length > 10 && (
                      <p className="text-xs text-red-500">... 还有 {file.errors.length - 10} 条错误</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {file && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setFile(null)}
                className="px-6 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                重新上传
              </button>
            </div>
          )}
        </div>

        <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
          <div className="flex space-x-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 mb-2">导入说明</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 请确保 CSV 文件编码为 UTF-8，避免中文乱码</li>
                <li>• 时间格式请使用 "YYYY-MM-DD HH:mm:ss" 或 "YYYY-MM-DD HH:mm"</li>
                <li>• 药盒打卡记录中的 deviceStatus 可选值：online, offline, low_battery</li>
                <li>• 护理记录中的 type 可选值：supplement（补服）, missed（漏服）, noted（备注）</li>
                <li>• 医嘱状态可选值：active（有效）, discontinued（已停药）, completed（已完成）</li>
                <li>• 跨夜时段（21:00-次日02:00）的记录会自动归属到前一天</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
