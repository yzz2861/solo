import React, { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Package,
  ShoppingCart,
  Cloud,
  Tag,
  ChevronDown,
  ChevronUp,
  Info,
  Download,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import type { ImportDataResult } from '../../../types';

interface ImportFile {
  type: string;
  file: File | null;
  preview: string[];
  result: ImportDataResult | null;
}

export default function DataImportPage() {
  const { state, dispatch } = useApp();

  const [importFiles, setImportFiles] = useState<Record<string, ImportFile>>({
    sales: { type: 'sales', file: null, preview: [], result: null },
    waste: { type: 'waste', file: null, preview: [], result: null },
    delivery: { type: 'delivery', file: null, preview: [], result: null },
    weather: { type: 'weather', file: null, preview: [], result: null },
    promotion: { type: 'promotion', file: null, preview: [], result: null },
  });

  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const importTypes = [
    {
      type: 'sales',
      title: '销售数据',
      description: '包含商品销售记录、时段、促销类型等信息',
      icon: <ShoppingCart className="w-6 h-6" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      fields: ['日期', '门店', '商品', '时段', '数量', '金额', '促销类型'],
    },
    {
      type: 'waste',
      title: '报损数据',
      description: '包含报损商品、数量、原因、照片等记录',
      icon: <Package className="w-6 h-6" />,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      fields: ['日期', '门店', '商品', '时段', '数量', '原因', '照片链接'],
    },
    {
      type: 'delivery',
      title: '生产到店数据',
      description: '包含每日配送到店的商品数量记录',
      icon: <FileSpreadsheet className="w-6 h-6" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      fields: ['日期', '门店', '商品', '配送数量'],
    },
    {
      type: 'weather',
      title: '天气数据',
      description: '包含每日天气类型、温度等信息',
      icon: <Cloud className="w-6 h-6" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      fields: ['日期', '城市', '天气类型', '温度'],
    },
    {
      type: 'promotion',
      title: '促销活动数据',
      description: '包含时段折扣、买一赠一、团购等促销活动',
      icon: <Tag className="w-6 h-6" />,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      fields: ['活动名称', '类型', '时段', '折扣率', '开始日期', '结束日期'],
    },
  ];

  const handleFileUpload = (type: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').slice(0, 6).filter(l => l.trim());

      setImportFiles(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          file,
          preview: lines,
          result: null,
        },
      }));
    };
    reader.readAsText(file);
  };

  const handleImport = (type: string) => {
    const fileData = importFiles[type];
    if (!fileData.file) return;

    const mockResult: ImportDataResult = {
      type: type as ImportDataResult['type'],
      totalRecords: Math.floor(Math.random() * 500) + 100,
      successCount: Math.floor(Math.random() * 50) + 95,
      errorCount: Math.floor(Math.random() * 5),
      errors: [],
    };

    for (let i = 0; i < mockResult.errorCount; i++) {
      mockResult.errors.push(`第 ${Math.floor(Math.random() * 100)} 行：数据格式错误`);
    }
    mockResult.successCount = mockResult.totalRecords - mockResult.errorCount;

    setImportFiles(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        result: mockResult,
      },
    }));
  };

  const handleRemoveFile = (type: string) => {
    setImportFiles(prev => ({
      ...prev,
      [type]: {
        type,
        file: null,
        preview: [],
        result: null,
      },
    }));
  };

  const toggleSection = (type: string) => {
    setExpandedSection(prev => prev === type ? null : type);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">数据导入</h1>
          <p className="text-gray-500 mt-1">
            导入销售、报损、配送、天气、促销等数据，支持CSV格式
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">数据导入说明</p>
            <ul className="space-y-1">
              <li>• 支持 CSV 格式文件，UTF-8 编码</li>
              <li>• 请确保文件格式与模板一致，可下载模板参考</li>
              <li>• 导入的数据将用于报损分析和订货建议</li>
              <li>• 建议每日营业结束后导入当日数据</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {importTypes.map(importType => {
          const fileData = importFiles[importType.type];
          const isExpanded = expandedSection === importType.type;

          return (
            <div
              key={importType.type}
              className={`bg-white rounded-xl shadow-card overflow-hidden border transition-colors ${
                fileData.result ? 'border-green-200' : fileData.file ? 'border-primary-300' : 'border-transparent'
              }`}
            >
              <button
                onClick={() => toggleSection(importType.type)}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${importType.bgColor} rounded-xl flex items-center justify-center ${importType.color}`}>
                    {importType.icon}
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-800">{importType.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{importType.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {fileData.result && (
                    <span className="flex items-center gap-1 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      已导入 {fileData.result.successCount} 条
                    </span>
                  )}
                  {fileData.file && !fileData.result && (
                    <span className="text-sm text-primary-600 font-medium">
                      待导入
                    </span>
                  )}
                  {!fileData.file && (
                    <span className="text-sm text-gray-400">
                      未上传
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100 p-5">
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">包含字段</div>
                    <div className="flex flex-wrap gap-2">
                      {importType.fields.map(field => (
                        <span
                          key={field}
                          className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>

                  {!fileData.file ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-primary-300 hover:bg-primary-50/30 transition-colors">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => handleFileUpload(importType.type, e)}
                        className="hidden"
                        id={`file-${importType.type}`}
                      />
                      <label
                        htmlFor={`file-${importType.type}`}
                        className="cursor-pointer"
                      >
                        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          点击上传或拖拽文件到此处
                        </p>
                        <p className="text-xs text-gray-400">
                          支持 CSV 格式，最大 10MB
                        </p>
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-primary-500" />
                          <div>
                            <div className="font-medium text-gray-800">{fileData.file.name}</div>
                            <div className="text-xs text-gray-400">
                              {(fileData.file.size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveFile(importType.type)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {fileData.preview.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-2">数据预览</div>
                          <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
                            <pre className="text-xs text-green-400 font-mono">
                              {fileData.preview.join('\n')}
                            </pre>
                          </div>
                        </div>
                      )}

                      {fileData.result ? (
                        <div className={`p-4 rounded-xl ${
                          fileData.result.errorCount === 0
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-yellow-50 border border-yellow-200'
                        }`}>
                          <div className="flex items-center gap-3 mb-3">
                            {fileData.result.errorCount === 0 ? (
                              <CheckCircle className="w-6 h-6 text-green-500" />
                            ) : (
                              <AlertTriangle className="w-6 h-6 text-yellow-500" />
                            )}
                            <div>
                              <div className={`font-semibold ${
                                fileData.result.errorCount === 0 ? 'text-green-800' : 'text-yellow-800'
                              }`}>
                                {fileData.result.errorCount === 0 ? '导入成功' : '导入完成，部分数据异常'}
                              </div>
                              <div className="text-sm text-gray-600">
                                共 {fileData.result.totalRecords} 条记录，
                                成功 {fileData.result.successCount} 条，
                                失败 {fileData.result.errorCount} 条
                              </div>
                            </div>
                          </div>

                          {fileData.result.errors.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-yellow-200">
                              <div className="text-sm font-medium text-yellow-800 mb-2">错误详情</div>
                              <ul className="text-xs text-yellow-700 space-y-1">
                                {fileData.result.errors.map((err, i) => (
                                  <li key={i}>• {err}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleImport(importType.type)}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
                          >
                            <Upload className="w-4 h-4" />
                            开始导入
                          </button>
                          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-600">
                            <Download className="w-4 h-4" />
                            下载模板
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-card p-5">
        <h3 className="font-semibold text-gray-800 mb-4">导入历史</h3>
        <div className="space-y-3">
          {[
            { type: 'sales', date: '2024-01-18 22:30', records: 342, status: 'success' },
            { type: 'waste', date: '2024-01-18 22:35', records: 86, status: 'success' },
            { type: 'weather', date: '2024-01-18 06:00', records: 7, status: 'success' },
            { type: 'delivery', date: '2024-01-18 05:30', records: 108, status: 'warning' },
          ].map((record, index) => {
            const typeInfo = importTypes.find(t => t.type === record.type);
            return (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 ${typeInfo?.bgColor || 'bg-gray-100'} rounded-lg flex items-center justify-center ${typeInfo?.color || 'text-gray-600'}`}>
                    {typeInfo?.icon || <FileText className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-800">
                      {typeInfo?.title || record.type}
                    </div>
                    <div className="text-xs text-gray-400">{record.date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">{record.records} 条记录</span>
                  {record.status === 'success' ? (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      成功
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-yellow-600">
                      <AlertTriangle className="w-3 h-3" />
                      部分异常
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
