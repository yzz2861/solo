import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FolderOpen, Plus, FileText, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Input } from '@/components/ui/Form';
import Progress from '@/components/ui/Progress';
import StampBadge from '@/components/ui/StampBadge';
import useArchiveStore from '@/store/useArchiveStore';
import { createImportPreview, processImportData, type ImportMapping } from '@/services/import';
import { generateMockProject } from '@/mock';
import { formatDate } from '@/utils/common';
import type { ImportPreview } from '@/types';

const ImportPage = () => {
  const navigate = useNavigate();
  const { projects, addProject, addRecords, setCurrentProject, deleteProject } = useArchiveStore();
  const [isDragging, setIsDragging] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [columnMapping, setColumnMapping] = useState<ImportMapping>({});
  const [showMapping, setShowMapping] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFileSelect(files[0]);
    }
  }, []);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    if (['csv', 'json', 'txt'].includes(ext || '')) {
      const preview = await createImportPreview(file);
      setImportPreview(preview);
      setColumnMapping({} as ImportMapping);
      setShowMapping(true);
    } else {
      alert('请选择 CSV、JSON 或 TXT 格式的文件');
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileSelect(files[0]);
    }
  };

  const handleMappingChange = (column: string, field: string) => {
    setColumnMapping(prev => {
      const newMapping = { ...prev };
      if (field === '') {
        delete newMapping[column as keyof ImportMapping];
      } else {
        (newMapping as Record<string, string>)[field] = column;
      }
      return newMapping;
    });
  };

  const handleStartImport = async () => {
    if (!projectName.trim()) {
      alert('请输入项目名称');
      return;
    }
    
    if (!importPreview || !selectedFile) return;
    
    setIsProcessing(true);
    
    try {
      const project = addProject(projectName.trim(), projectDescription.trim());
      
      const { parseCSV, parseJSON, parseTXT } = await import('@/services/import');
      let data: Record<string, string>[] = [];
      
      if (importPreview.fileType === 'csv') {
        const result = await parseCSV(selectedFile);
        data = result.data;
      } else if (importPreview.fileType === 'json') {
        data = await parseJSON(selectedFile) as Record<string, string>[];
      } else if (importPreview.fileType === 'txt') {
        const paragraphs = await parseTXT(selectedFile);
        data = paragraphs.map((p, i) => ({
          '序号': (i + 1).toString(),
          'OCR文本': p
        }));
      }
      
      const finalMapping: ImportMapping = {
        ocrText: 'OCR文本',
        photoPath: '照片路径',
        ...columnMapping
      };
      
      if (importPreview.fileType === 'csv' || importPreview.fileType === 'json') {
        Object.entries(importPreview.suggestedMappings).forEach(([column, target]) => {
          if (!(target in finalMapping)) {
            (finalMapping as Record<string, string>)[target] = column;
          }
        });
      }
      
      const records = processImportData(data, finalMapping, project.id);
      addRecords(project.id, records);
      
      setCurrentProject(project.id);
      navigate('/workspace');
    } catch (error) {
      console.error('导入失败:', error);
      alert('导入失败，请检查文件格式');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadDemo = () => {
    const { project, records } = generateMockProject();
    const existingProject = projects.find(p => p.name === project.name);
    
    if (existingProject) {
      setCurrentProject(existingProject.id);
    } else {
      useArchiveStore.setState(state => ({
        projects: [...state.projects, project],
        records: [...state.records, ...records],
        currentProjectId: project.id
      }));
    }
    
    navigate('/workspace');
  };

  const handleSelectProject = (projectId: string) => {
    setCurrentProject(projectId);
    navigate('/workspace');
  };

  const handleDeleteProject = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (confirm('确定要删除此项目吗？此操作不可恢复。')) {
      deleteProject(projectId);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-archive-900 mb-1">
            档案照片OCR校对系统
          </h1>
          <p className="text-archive-500 text-sm">
            导入OCR文本和照片索引，智能抽取字段，高效校对老档案
          </p>
        </div>
        <Button variant="secondary" onClick={handleLoadDemo} leftIcon={<FileText className="w-4 h-4" />}>
          加载演示数据
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>导入数据</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${
                  isDragging 
                    ? 'border-archive-500 bg-archive-50' 
                    : 'border-archive-200 hover:border-archive-400 hover:bg-archive-50/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('fileInput')?.click()}
              >
                <input
                  id="fileInput"
                  type="file"
                  accept=".csv,.json,.txt"
                  className="hidden"
                  onChange={handleFileInput}
                />
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                    isDragging ? 'bg-archive-100' : 'bg-archive-50'
                  }`}>
                    <Upload className={`w-8 h-8 transition-colors ${isDragging ? 'text-archive-600' : 'text-archive-400'}`} />
                  </div>
                  <div>
                    <p className="text-archive-700 font-medium">
                      {isDragging ? '松开鼠标上传文件' : '拖拽文件到此处或点击上传'}
                    </p>
                    <p className="text-archive-500 text-sm mt-1">
                      支持 CSV、JSON、TXT 格式
                    </p>
                  </div>
                </div>
              </div>

              {selectedFile && (
                <div className="bg-archive-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <FileText className="w-5 h-5 text-archive-500" />
                      </div>
                      <div>
                        <p className="font-medium text-archive-800">{selectedFile.name}</p>
                        <p className="text-xs text-archive-500">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    {importPreview && (
                      <Badge variant="success">
                        已解析 {importPreview.totalRows} 行
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {showMapping && importPreview && (
                <div className="space-y-4 border-t border-archive-100 pt-4">
                  <h4 className="font-medium text-archive-800">字段映射配置</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {['ocrText', 'photoPath', 'name', 'date', 'documentNumber', 'pageNumber', 'materialType'].map(field => (
                      <div key={field} className="flex items-center gap-3">
                        <label className="w-20 text-sm text-archive-600 shrink-0">
                          {field === 'ocrText' ? 'OCR文本' :
                           field === 'photoPath' ? '照片路径' :
                           field === 'name' ? '姓名' :
                           field === 'date' ? '日期' :
                           field === 'documentNumber' ? '编号' :
                           field === 'pageNumber' ? '页码' : '材料类型'}
                        </label>
                        <select
                          className="flex-1 px-3 py-2 text-sm border border-archive-200 rounded-lg focus:ring-2 focus:ring-archive-500/30 focus:border-archive-500"
                          value={Object.entries(columnMapping).find(([_, v]) => v === field)?.[0] || importPreview.suggestedMappings[field as keyof typeof importPreview.suggestedMappings] || ''}
                          onChange={(e) => handleMappingChange(e.target.value, field)}
                        >
                          <option value="">自动识别</option>
                          {importPreview.headers.map(header => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedFile && (
                <div className="space-y-4 border-t border-archive-100 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="项目名称"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="请输入项目名称"
                    />
                    <Input
                      label="项目描述（可选）"
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      placeholder="简要描述项目内容"
                    />
                  </div>
                  
                  <Button
                    onClick={handleStartImport}
                    isLoading={isProcessing}
                    leftIcon={<Plus className="w-4 h-4" />}
                    className="w-full"
                  >
                    开始导入并创建项目
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>导入预览</CardTitle>
            </CardHeader>
            <CardContent>
              {importPreview ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-archive-500">
                    <span>文件类型：{importPreview.fileType.toUpperCase()}</span>
                    <span>共 {importPreview.totalRows} 行数据</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-archive-100">
                          {importPreview.headers.map(header => (
                            <th key={header} className="text-left py-2 px-3 font-medium text-archive-700 bg-archive-50">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.sampleData.map((row, i) => (
                          <tr key={i} className="border-b border-archive-50 hover:bg-archive-50/50">
                            {importPreview.headers.map(header => (
                              <td key={header} className="py-2 px-3 text-archive-600 max-w-xs truncate">
                                {row[header]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-archive-500">
                  <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>导入文件后可预览数据内容</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>我的项目</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {projects.length === 0 ? (
                <div className="text-center py-8 text-archive-500">
                  <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无项目</p>
                  <p className="text-xs mt-1">导入数据创建第一个项目</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {projects.map(project => (
                    <div
                      key={project.id}
                      className="p-4 bg-archive-50 rounded-lg hover:bg-archive-100 transition-colors cursor-pointer group"
                      onClick={() => handleSelectProject(project.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <StampBadge status={project.status === 'completed' ? 'approved' : project.status === 'ready' ? 'corrected' : 'reviewing'} size="sm" />
                            <h4 className="font-medium text-archive-800 truncate">{project.name}</h4>
                          </div>
                          {project.description && (
                            <p className="text-xs text-archive-500 mb-2 line-clamp-2">
                              {project.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-archive-500">
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {project.recordCount} 条
                            </span>
                            <span className="flex items-center gap-1 text-warning">
                              <AlertCircle className="w-3 h-3" />
                              {project.lowConfidenceCount} 低置信
                            </span>
                          </div>
                          <div className="mt-3">
                            <Progress 
                              value={project.recordCount > 0 ? Math.round((project.recordCount - project.lowConfidenceCount) / project.recordCount * 100) : 0} 
                            />
                          </div>
                          <p className="text-xs text-archive-400 mt-2">
                            {formatDate(project.updatedAt)}
                          </p>
                        </div>
                        <button
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-error/10 rounded transition-all text-error"
                          onClick={(e) => handleDeleteProject(e, project.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>快速统计</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-archive-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-archive-700 font-serif">
                    {projects.length}
                  </p>
                  <p className="text-xs text-archive-500">总项目数</p>
                </div>
                <div className="bg-archive-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-archive-700 font-serif">
                    {projects.reduce((sum, p) => sum + p.recordCount, 0)}
                  </p>
                  <p className="text-xs text-archive-500">总记录数</p>
                </div>
                <div className="bg-warning/5 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-warning font-serif">
                    {projects.reduce((sum, p) => sum + p.lowConfidenceCount, 0)}
                  </p>
                  <p className="text-xs text-archive-500">待校对</p>
                </div>
                <div className="bg-success/5 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-success font-serif">
                    {projects.filter(p => p.status === 'completed').length}
                  </p>
                  <p className="text-xs text-archive-500">已完成</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="bg-gradient-to-br from-archive-950 to-archive-800 rounded-xl p-5 text-white">
            <h4 className="font-serif font-semibold mb-3">使用指南</h4>
            <ul className="space-y-2 text-sm text-archive-100">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-archive-300" />
                <span>导入OCR文本和照片索引文件</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-archive-300" />
                <span>系统自动抽取姓名字段</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-archive-300" />
                <span>重点校对低置信度标记的字段</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-archive-300" />
                <span>生成抽检清单智能复核</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-archive-300" />
                <span>导出完整档案目录</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportPage;
