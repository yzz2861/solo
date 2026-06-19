import { useState, useRef } from 'react';
import { X, Download, FileText, Shield, Scale, Printer, Copy, Check } from 'lucide-react';
import { useCaseStore } from '../../store/useCaseStore';
import { SEVERITY_LABELS, type Severity } from '../../types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface SupplementPreviewProps {
  onClose: () => void;
}

type ExportVersion = 'customer' | 'internal' | 'legal';

const SupplementPreview = ({ onClose }: SupplementPreviewProps) => {
  const { currentCase } = useCaseStore();
  const [activeVersion, setActiveVersion] = useState<ExportVersion>('customer');
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const priorityColors: Record<Severity, string> = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-green-100 text-green-700 border-green-200',
  };

  const versions = [
    { key: 'customer' as const, label: '客服版', icon: FileText, description: '不含敏感信息' },
    { key: 'internal' as const, label: '内部版', icon: Shield, description: '含敏感备注' },
    { key: 'legal' as const, label: '法务版', icon: Scale, description: '含截止日期' },
  ];

  const handleExportPDF = async () => {
    if (!contentRef.current) return;

    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`补件清单_${versions.find(v => v.key === activeVersion)?.label}_${currentCase.caseNumber}.pdf`);
    } catch (error) {
      console.error('PDF 导出失败:', error);
      alert('PDF 导出失败，请重试');
    }
  };

  const handleCopyText = () => {
    const items = currentCase.supplements.filter(s => !s.completed);
    let text = `【补件清单】\n`;
    text += `案件编号：${currentCase.caseNumber}\n`;
    text += `客户：${currentCase.customerName}\n`;
    if (currentCase.supplementDeadline && activeVersion === 'legal') {
      text += `补件截止日：${format(new Date(currentCase.supplementDeadline), 'yyyy年MM月dd日', { locale: zhCN })}\n`;
    }
    text += `\n需补充材料：\n`;
    items.forEach((item, index) => {
      text += `${index + 1}. [${SEVERITY_LABELS[item.priority]}] ${item.title}\n`;
      text += `   ${item.description}\n`;
      if (item.questionToCustomer && activeVersion !== 'legal') {
        text += `   补问：${item.questionToCustomer}\n`;
      }
      if (item.isSensitive && item.internalNote && activeVersion === 'internal') {
        text += `   【内部备注】${item.internalNote}\n`;
      }
      text += `\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const displayItems = currentCase.supplements.filter(s => {
    if (activeVersion === 'customer' && s.isSensitive) return false;
    return !s.completed;
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] mx-4 flex flex-col overflow-hidden animate-slide-up">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-700" />
            补件清单预览
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex gap-2">
            {versions.map((version) => {
              const Icon = version.icon;
              return (
                <button
                  key={version.key}
                  onClick={() => setActiveVersion(version.key)}
                  className={`flex-1 p-3 rounded border-2 transition-all text-left ${
                    activeVersion === version.key
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${
                      activeVersion === version.key ? 'text-primary-600' : 'text-gray-500'
                    }`} />
                    <span className={`text-sm font-medium ${
                      activeVersion === version.key ? 'text-primary-700' : 'text-gray-700'
                    }`}>
                      {version.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{version.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 scrollbar-thin">
          <div ref={contentRef} className="bg-white">
            <div className="text-center mb-6 pb-4 border-b-2 border-primary-900">
              <h2 className="text-xl font-serif font-bold text-primary-900 mb-1">
                补件清单
              </h2>
              <p className="text-sm text-gray-500">
                {versions.find(v => v.key === activeVersion)?.label}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div>
                <span className="text-gray-500">案件编号：</span>
                <span className="font-medium text-gray-800">{currentCase.caseNumber}</span>
              </div>
              <div>
                <span className="text-gray-500">客户姓名：</span>
                <span className="font-medium text-gray-800">{currentCase.customerName}</span>
              </div>
              <div>
                <span className="text-gray-500">生成时间：</span>
                <span className="font-medium text-gray-800">
                  {format(new Date(), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
                </span>
              </div>
              {activeVersion === 'legal' && currentCase.supplementDeadline && (
                <div>
                  <span className="text-gray-500">补件截止日：</span>
                  <span className="font-medium text-accent-red">
                    {format(new Date(currentCase.supplementDeadline), 'yyyy年MM月dd日', { locale: zhCN })}
                  </span>
                </div>
              )}
            </div>

            <div className="mb-4">
              <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-1 h-5 bg-primary-600 rounded-full" />
                需补充材料
                <span className="text-sm font-normal text-gray-500">
                  （共 {displayItems.length} 项）
                </span>
              </h3>

              {displayItems.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  暂无待补充的材料
                </div>
              ) : (
                <div className="space-y-3">
                  {displayItems.map((item, index) => (
                    <div
                      key={item.id}
                      className={`border rounded p-3 ${
                        priorityColors[item.priority]
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium px-1.5 py-0.5 bg-white/60 rounded">
                              优先级：{SEVERITY_LABELS[item.priority]}
                            </span>
                            {item.isSensitive && activeVersion === 'internal' && (
                              <span className="text-xs font-medium px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                                敏感
                              </span>
                            )}
                          </div>
                          <h4 className="font-medium text-gray-800 mb-1">
                            {item.title}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {item.description}
                          </p>
                          {item.questionToCustomer && activeVersion !== 'legal' && (
                            <div className="mt-2 pt-2 border-t border-white/50">
                              <span className="text-xs font-medium text-gray-700">
                                需向客户确认：
                              </span>
                              <p className="text-sm text-gray-600 mt-0.5">
                                {item.questionToCustomer}
                              </p>
                            </div>
                          )}
                          {item.isSensitive && item.internalNote && activeVersion === 'internal' && (
                            <div className="mt-2 pt-2 border-t border-purple-200/50">
                              <span className="text-xs font-medium text-purple-700">
                                【内部备注】
                              </span>
                              <p className="text-sm text-purple-600 mt-0.5">
                                {item.internalNote}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {activeVersion !== 'customer' && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  证据概况
                </h3>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="bg-gray-50 p-2 rounded text-center">
                    <div className="text-lg font-semibold text-gray-700">
                      {currentCase.evidences.length}
                    </div>
                    <div className="text-gray-500">已有证据</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-center">
                    <div className="text-lg font-semibold text-red-600">
                      {currentCase.detections.filter(d => d.severity === 'high' && !d.resolved).length}
                    </div>
                    <div className="text-gray-500">高风险项</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-center">
                    <div className="text-lg font-semibold text-yellow-600">
                      {currentCase.detections.filter(d => d.severity === 'medium' && !d.resolved).length}
                    </div>
                    <div className="text-gray-500">中风险项</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-center">
                    <div className="text-lg font-semibold text-green-600">
                      {currentCase.detections.filter(d => d.resolved).length}
                    </div>
                    <div className="text-gray-500">已处理</div>
                  </div>
                </div>
              </div>
            )}

            {activeVersion === 'legal' && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-xs text-yellow-700 flex items-start gap-2">
                  <span className="font-medium">法务提示：</span>
                  请确保所有补件在截止日前完成收集，逾期可能影响案件处理进度。
                </p>
              </div>
            )}

            <div className="mt-8 pt-4 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-400">
                — 本清单由客服证据附件清单系统自动生成 —
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            当前预览：{versions.find(v => v.key === activeVersion)?.label}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopyText}
              className="btn-secondary text-sm flex items-center gap-1"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  复制文本
                </>
              )}
            </button>
            <button
              onClick={handleExportPDF}
              className="btn-primary text-sm flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              导出 PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplementPreview;
