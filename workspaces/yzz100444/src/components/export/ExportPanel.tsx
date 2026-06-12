import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, FileJson, CheckCircle, AlertCircle } from 'lucide-react';
import { ExportOptions, ExportFormat } from '../../types';
import { useProjectStore } from '../../store/useProjectStore';
import { exportProject } from '../../utils/export';
import Button from '../common/Button';
import Card from '../common/Card';
import Checkbox from '../common/Checkbox';
import Badge from '../common/Badge';
import Modal from '../common/Modal';
import EmptyState from '../common/EmptyState';

interface ExportPanelProps {
  className?: string;
}

const ExportPanel: React.FC<ExportPanelProps> = ({ className = '' }) => {
  const { currentProject } = useProjectStore();
  const [options, setOptions] = useState<ExportOptions>({
    format: 'markdown',
    includeRawAnswers: true,
    includeRepresentativesOnly: false,
    includeRiskAnalysis: true,
  });
  const [exporting, setExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const updateOption = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const handleExport = async () => {
    if (!currentProject) return;

    setExporting(true);
    setExportSuccess(null);

    try {
      await exportProject(currentProject, options);
      setExportSuccess(`已成功导出 ${currentProject.name} 报告`);
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const handlePreview = async () => {
    if (!currentProject) return;

    try {
      const content = await exportProject(currentProject, { ...options, returnContent: true } as any);
      if (typeof content === 'string') {
        setPreviewContent(content);
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Preview failed:', error);
    }
  };

  if (!currentProject) {
    return (
      <EmptyState
        title="未找到项目"
        description="请先导入数据并完成聚类分析后再导出"
      />
    );
  }

  const formatOptions = [
    {
      value: 'markdown' as ExportFormat,
      label: 'Markdown 报告',
      icon: <FileText className="w-5 h-5" />,
      description: '适合产品经理阅读的结构化报告，包含风险分析和代表原话',
      extension: '.md',
    },
    {
      value: 'csv' as ExportFormat,
      label: 'CSV 表格',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      description: '适合 Excel 进一步分析的表格数据',
      extension: '.csv',
    },
    {
      value: 'json' as ExportFormat,
      label: 'JSON 数据',
      icon: <FileJson className="w-5 h-5" />,
      description: '完整的结构化数据，适合程序处理',
      extension: '.json',
    },
  ];

  return (
    <div className={className}>
      {exportSuccess && (
        <div className="mb-4 p-4 bg-success-50 border border-success-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-success-600" />
          <span className="text-sm text-success-700">{exportSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-neutral-900 font-serif mb-4">
              选择导出格式
            </h3>
            <div className="space-y-3">
              {formatOptions.map((format) => (
                <div
                  key={format.value}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    options.format === format.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                  onClick={() => updateOption('format', format.value)}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        options.format === format.value
                          ? 'bg-primary-100 text-primary-600'
                          : 'bg-neutral-100 text-neutral-500'
                      }`}
                    >
                      {format.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-neutral-900">{format.label}</h4>
                        <Badge variant="default" size="sm">
                          {format.extension}
                        </Badge>
                      </div>
                      <p className="text-sm text-neutral-500 mt-1">{format.description}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                        options.format === format.value
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-neutral-300'
                      }`}
                    >
                      {options.format === format.value && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-neutral-900 font-serif mb-4">
              导出选项
            </h3>
            <div className="space-y-4">
              <Checkbox
                checked={options.includeRiskAnalysis}
                onChange={(checked) => updateOption('includeRiskAnalysis', checked)}
                label="包含风险分析"
              />
              <Checkbox
                checked={options.includeRepresentativesOnly}
                onChange={(checked) => updateOption('includeRepresentativesOnly', checked)}
                label="仅导出代表回答（精简报告）"
              />
              <Checkbox
                checked={options.includeRawAnswers}
                onChange={(checked) => updateOption('includeRawAnswers', checked)}
                label="包含所有原始回答"
              />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-neutral-900 font-serif mb-4">
              导出预览
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-neutral-50 rounded-lg">
                <h4 className="text-sm font-medium text-neutral-900 mb-2">
                  {currentProject.name}
                </h4>
                <div className="space-y-1 text-xs text-neutral-500">
                  <p>总回答数：{currentProject.answers.length}</p>
                  <p>主题数量：{currentProject.topics.length}</p>
                  <p>风险主题：{currentProject.topics.filter((t) => t.isRisk).length}</p>
                  <p>置顶主题：{currentProject.topics.filter((t) => t.isPinned).length}</p>
                </div>
              </div>

              <div className="p-3 bg-warning-50 rounded-lg border border-warning-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-warning-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-warning-700">
                    导出的报告将自动置顶风险主题，确保重要问题不被遗漏。
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handlePreview}
                  disabled={exporting}
                >
                  预览报告
                </Button>
                <Button
                  variant="primary"
                  className="w-full"
                  icon={<Download className="w-4 h-4" />}
                  onClick={handleExport}
                  loading={exporting}
                  disabled={currentProject.topics.length === 0}
                >
                  {currentProject.topics.length === 0 ? '请先运行聚类' : '导出报告'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="报告预览"
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowPreview(false)}>
              关闭
            </Button>
            <Button variant="primary" onClick={handleExport} loading={exporting}>
              导出此报告
            </Button>
          </>
        }
      >
        <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
          {options.format === 'markdown' ? (
            <pre className="text-sm text-neutral-800 font-mono whitespace-pre-wrap bg-neutral-50 p-4 rounded-lg">
              {previewContent}
            </pre>
          ) : (
            <div className="p-4 bg-neutral-50 rounded-lg">
              <p className="text-sm text-neutral-600">
                {options.format === 'csv' ? 'CSV 格式预览' : 'JSON 格式预览'}
              </p>
              <pre className="text-xs text-neutral-700 font-mono mt-2 overflow-x-auto">
                {previewContent.slice(0, 2000)}
                {previewContent.length > 2000 && '...'}
              </pre>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ExportPanel;
