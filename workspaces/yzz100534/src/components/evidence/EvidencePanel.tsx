import { useState, useRef, useCallback } from 'react';
import { Upload, Image, FileText, ClipboardList, MessageSquare, Trash2, Eye, X } from 'lucide-react';
import { useCaseStore } from '../../store/useCaseStore';
import { EVIDENCE_TYPE_LABELS, type EvidenceType, type Evidence } from '../../types';

const EvidencePanel = () => {
  const { currentCase, addEvidence, removeEvidence, getEvidencesByType } = useCaseStore();
  const [activeTab, setActiveTab] = useState<EvidenceType>('chat_screenshot');
  const [previewEvidence, setPreviewEvidence] = useState<Evidence | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const typeIcons: Record<EvidenceType, typeof Image> = {
    chat_screenshot: MessageSquare,
    logistics_photo: Image,
    inspection_report: ClipboardList,
    customer_statement: FileText,
  };

  const generateId = () => Math.random().toString(36).substring(2, 11);

  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const newEvidence: Evidence = {
          id: generateId(),
          caseId: currentCase.id,
          type: activeTab,
          title: file.name.replace(/\.[^/.]+$/, ''),
          description: '',
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          dataUrl,
          uploadTime: new Date(),
          evidenceTime: new Date(),
          annotations: [],
          isDuplicate: false,
          hasIssues: false,
        };
        addEvidence(newEvidence);
      };
      reader.readAsDataURL(file);
    });
  }, [activeTab, addEvidence, currentCase.id]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const evidences = getEvidencesByType(activeTab);
  const Icon = typeIcons[activeTab];

  const tabs: EvidenceType[] = ['chat_screenshot', 'logistics_photo', 'inspection_report', 'customer_statement'];

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-primary-900 mb-3 flex items-center gap-2">
          <Image className="w-5 h-5" />
          证据管理
        </h2>
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => {
            const TabIcon = typeIcons[tab];
            const count = getEvidencesByType(tab).length;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-xs font-medium flex flex-col items-center gap-1 border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-primary-900 text-primary-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                <span>{EVIDENCE_TYPE_LABELS[tab]}</span>
                {count > 0 && (
                  <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto scrollbar-thin">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors mb-4"
        >
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-1">
            点击或拖拽上传{EVIDENCE_TYPE_LABELS[activeTab]}
          </p>
          <p className="text-xs text-gray-400">支持 JPG、PNG、PDF 等格式</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.doc,.docx"
          onChange={(e) => handleFileUpload(e.target.files)}
          className="hidden"
        />

        <div className="space-y-2">
          {evidences.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Icon className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">暂无{EVIDENCE_TYPE_LABELS[activeTab]}</p>
            </div>
          ) : (
            evidences.map((evidence) => (
              <div
                key={evidence.id}
                className="border border-gray-200 rounded p-3 hover:border-primary-300 hover:shadow-sm transition-all group"
              >
                <div className="flex gap-3">
                  <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {evidence.fileType.startsWith('image/') ? (
                      <img
                        src={evidence.dataUrl}
                        alt={evidence.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Icon className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-800 truncate">
                      {evidence.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {(evidence.fileSize / 1024).toFixed(1)} KB
                    </p>
                    {evidence.hasIssues && (
                      <span className="tag tag-high text-[10px] mt-1">有异常</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewEvidence(evidence);
                      }}
                      className="p-1.5 hover:bg-gray-100 rounded"
                      title="查看"
                    >
                      <Eye className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeEvidence(evidence.id);
                      }}
                      className="p-1.5 hover:bg-red-50 rounded"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500 flex justify-between">
          <span>共 {currentCase.evidences.length} 个证据</span>
          <span>{currentCase.evidences.filter(e => e.hasIssues).length} 个异常</span>
        </div>
      </div>

      {previewEvidence && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full mx-4 overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                {previewEvidence.title}
              </h3>
              <button
                onClick={() => setPreviewEvidence(null)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
              {previewEvidence.fileType.startsWith('image/') ? (
                <img
                  src={previewEvidence.dataUrl}
                  alt={previewEvidence.title}
                  className="max-w-full h-auto mx-auto"
                />
              ) : (
                <div className="text-center py-20 text-gray-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>文件预览暂不支持此格式</p>
                  <p className="text-sm mt-2">{previewEvidence.fileName}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidencePanel;
