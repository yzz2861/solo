import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  File,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  MessageSquare,
  Truck,
  RefreshCw,
  Tag
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import Button from '../components/Button';
import Card from '../components/Card';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { MATERIAL_TYPE_LABELS } from '../../shared/types';
import type { Material, MaterialType } from '../../shared/types';

const MATERIAL_TYPES: { value: MaterialType; label: string; icon: any; color: string }[] = [
  { value: 'chat', label: '聊天记录', icon: MessageSquare, color: 'bg-blue-100 text-blue-700' },
  { value: 'logistics', label: '物流截图', icon: Truck, color: 'bg-green-100 text-green-700' },
  { value: 'refund', label: '退款凭证', icon: RefreshCw, color: 'bg-purple-100 text-purple-700' },
  { value: 'other', label: '其他材料', icon: File, color: 'bg-slate-100 text-slate-700' },
];

export default function MaterialImport() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { 
    materials, 
    loading, 
    loadMaterials, 
    uploadMaterials, 
    deleteMaterial,
    currentProject,
    setCurrentProject,
    projectApi
  } = useAppStore();

  const [isDragging, setIsDragging] = useState(false);
  const [selectedType, setSelectedType] = useState<MaterialType>('other');
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      loadMaterials(projectId);
      if (!currentProject) {
        projectApi.getById(projectId).then(res => {
          if (res.success && res.data) {
            setCurrentProject(res.data);
          }
        });
      }
    }
  }, [projectId, loadMaterials, currentProject, setCurrentProject, projectApi]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  }, [projectId, selectedType]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFileUpload(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (!projectId) return;
    if (files.length === 0) return;

    setUploadProgress(`正在上传 ${files.length} 个文件...`);
    
    const validFiles = files.filter(f => f.size <= 50 * 1024 * 1024);
    if (validFiles.length !== files.length) {
      alert('部分文件超过 50MB 限制，已跳过');
    }

    const result = await uploadMaterials(projectId, validFiles, selectedType);
    
    if (result) {
      setUploadProgress(`成功上传 ${result.length} 个文件`);
      setTimeout(() => setUploadProgress(null), 2000);
    } else {
      setUploadProgress('上传失败，请重试');
      setTimeout(() => setUploadProgress(null), 3000);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (confirm('确定要删除这个材料吗？')) {
      await deleteMaterial(id);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return ImageIcon;
    if (fileType.includes('pdf')) return FileText;
    if (fileType.includes('word') || fileType.includes('document')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const groupedMaterials = MATERIAL_TYPES.map(type => ({
    ...type,
    items: materials.filter(m => m.type === type.value)
  }));

  const totalMaterials = materials.length;

  return (
    <div className="p-8 animate-fade-in">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold text-slate-900 mb-1">材料导入</h1>
            <p className="text-slate-500 text-sm">上传聊天记录、物流截图、退款凭证等申诉材料</p>
          </div>
          <Button
            variant="primary"
            rightIcon={<ChevronRight className="w-4 h-4" />}
            onClick={() => navigate(`/project/${projectId}/analyze`)}
            disabled={totalMaterials === 0}
          >
            下一步：智能识别
          </Button>
        </div>

        <Card className="mb-8">
          <Card.Header>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-800">上传材料</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  支持拖拽或点击上传，支持图片、PDF、Word、TXT 等格式
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">材料类型：</span>
                <div className="flex gap-1">
                  {MATERIAL_TYPES.map(type => (
                    <button
                      key={type.value}
                      onClick={() => setSelectedType(type.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
                        selectedType === type.value
                          ? type.color + ' ring-2 ring-offset-1'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      )}
                    >
                      <type.icon className="w-3.5 h-3.5" />
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card.Header>
          <Card.Body>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all',
                isDragging
                  ? 'border-primary-500 bg-primary-50 scale-[1.01]'
                  : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt,.md"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary-700" />
              </div>
              <h3 className="text-lg font-medium text-slate-700 mb-2">
                {isDragging ? '松开鼠标上传文件' : '拖拽文件到此处，或点击选择'}
              </h3>
              <p className="text-sm text-slate-500">
                单文件最大 50MB，支持批量上传
              </p>
              {uploadProgress && (
                <div className={cn(
                  'mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm',
                  uploadProgress.includes('成功') 
                    ? 'bg-green-100 text-green-700' 
                    : uploadProgress.includes('失败')
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                )}>
                  {uploadProgress.includes('成功') ? <CheckCircle2 className="w-4 h-4" /> : 
                   uploadProgress.includes('失败') ? <AlertCircle className="w-4 h-4" /> :
                   <Upload className="w-4 h-4 animate-pulse" />}
                  {uploadProgress}
                </div>
              )}
            </div>
          </Card.Body>
        </Card>

        <div className="space-y-6">
          {groupedMaterials.map((group, groupIndex) => (
            <div key={group.value} className="animate-slide-up" style={{ animationDelay: `${groupIndex * 0.1}s` }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', group.color)}>
                    <group.icon className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-slate-800">{group.label}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-xs text-slate-600">
                    {group.items.length} 个
                  </span>
                </div>
              </div>

              {group.items.length === 0 ? (
                <Card className="bg-slate-50/50 border-dashed">
                  <Card.Body className="text-center py-8">
                    <File className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">暂无{group.label}材料</p>
                  </Card.Body>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.items.map((material, index) => {
                    const FileIcon = getFileIcon(material.fileType);
                    return (
                      <Card
                        key={material.id}
                        hoverable
                        className="group animate-fade-in"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <Card.Body>
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0',
                              material.parsedContent ? 'bg-green-100' : 'bg-slate-100'
                            )}>
                              <FileIcon className={cn(
                                'w-6 h-6',
                                material.parsedContent ? 'text-green-600' : 'text-slate-500'
                              )} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-medium text-slate-800 truncate" title={material.fileName}>
                                  {material.fileName}
                                </p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteMaterial(material.id);
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                <span>{formatFileSize(material.fileSize)}</span>
                                <span>·</span>
                                <span>{format(new Date(material.uploadedAt), 'MM-dd HH:mm', { locale: zhCN })}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-2">
                                {material.parsedContent ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-xs text-green-700">
                                    <CheckCircle2 className="w-3 h-3" />
                                    已解析
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-xs text-amber-700">
                                    <AlertCircle className="w-3 h-3" />
                                    未解析
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {totalMaterials > 0 && (
          <div className="mt-8 flex justify-end">
            <Button
              variant="primary"
              size="lg"
              rightIcon={<ChevronRight className="w-4 h-4" />}
              onClick={() => navigate(`/project/${projectId}/analyze`)}
            >
              下一步：智能识别 ({totalMaterials} 个材料)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
