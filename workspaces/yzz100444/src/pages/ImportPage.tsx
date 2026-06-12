import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Play, Database, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { ImportOptions } from '../types';
import { generateSampleProjectData } from '../data/sampleData';
import PageLayout from '../components/layout/PageLayout';
import FileUpload from '../components/import/FileUpload';
import TextPaste from '../components/import/TextPaste';
import ImportSettings from '../components/import/ImportSettings';
import PreviewList from '../components/import/PreviewList';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import Loading from '../components/common/Loading';
import Progress from '../components/common/Progress';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import Card from '../components/common/Card';

const ImportPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    projects,
    currentProject,
    isProcessing,
    processingProgress,
    error,
    createProject,
    setCurrentProject,
    importAnswers,
    runClustering,
    loadProjectsFromStorage,
    deleteProject,
    loadProject,
  } = useProjectStore();

  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [importedTexts, setImportedTexts] = useState<string[]>([]);
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    format: 'text',
    hasHeader: true,
    removeEmojis: true,
    correctTypos: true,
    markDuplicates: true,
    filterShortAnswers: true,
    clusteringSensitivity: 0.5,
  });
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadProjectsFromStorage();
  }, [loadProjectsFromStorage]);

  const handleDataLoaded = (data: string[]) => {
    setImportedTexts(data);
    setImportError(null);
    setImportSuccess(`已加载 ${data.length} 条回答`);
    setTimeout(() => setImportSuccess(null), 3000);
  };

  const handleCreateProject = () => {
    if (projectName.trim()) {
      const project = createProject(projectName.trim());
      setCurrentProject(project);
      setShowNewProjectModal(false);
      setProjectName('');
    }
  };

  const handleLoadSampleData = () => {
    const sampleData = generateSampleProjectData();
    const texts = sampleData.answers.map((a) => a.originalText);
    handleDataLoaded(texts);

    if (!currentProject) {
      const project = createProject('示例分析项目');
      setCurrentProject(project);
    }
  };

  const handleImportAndCluster = async () => {
    if (!currentProject || importedTexts.length === 0) return;

    setImportError(null);

    try {
      await importAnswers(importedTexts, {
        clusteringSensitivity: importOptions.clusteringSensitivity,
      });

      await runClustering();

      setImportSuccess('聚类分析完成！');
      setTimeout(() => {
        navigate('/analysis');
      }, 1000);
    } catch (err) {
      setImportError((err as Error).message);
    }
  };

  const handleLoadProject = (projectId: string) => {
    loadProject(projectId);
    navigate('/analysis');
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 font-serif mb-1">
                  问卷开放题归并分析
                </h1>
                <p className="text-sm text-neutral-500">
                  智能归并开放题回答，自动识别重要风险，让您的分析更高效
                </p>
              </div>
              <Button
                variant="primary"
                size="md"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setShowNewProjectModal(true)}
              >
                新建项目
              </Button>
            </div>

            {importError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-700">{importError}</span>
              </div>
            )}

            {importSuccess && (
              <div className="p-4 bg-success-50 border border-success-200 rounded-lg flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-success-500 flex-shrink-0" />
                <span className="text-sm text-success-700">{importSuccess}</span>
              </div>
            )}

            {isProcessing && (
              <Card className="p-6">
                <Loading text="正在处理数据..." className="py-4" />
                <Progress
                  value={processingProgress}
                  showLabel
                  className="mt-4"
                />
              </Card>
            )}

            {!isProcessing && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Database className="w-5 h-5 text-primary-600" />
                      <h2 className="text-lg font-semibold text-neutral-900 font-serif">
                        上传文件
                      </h2>
                    </div>
                    <FileUpload
                      onDataLoaded={handleDataLoaded}
                      onError={(err) => setImportError(err)}
                    />
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-5 h-5 text-primary-600" />
                      <h2 className="text-lg font-semibold text-neutral-900 font-serif">
                        粘贴文本
                      </h2>
                    </div>
                    <TextPaste onDataLoaded={handleDataLoaded} />
                  </Card>
                </div>

                {importedTexts.length > 0 && currentProject && (
                  <>
                    <PreviewList answers={currentProject.answers.length > 0 ? currentProject.answers : importedTexts.map((text, index) => ({
                      id: `temp-${index}`,
                      projectId: currentProject.id,
                      topicId: null,
                      originalText: text,
                      cleanedText: text,
                      isDuplicate: false,
                      isPinned: false,
                      importanceScore: 0,
                      matchedRiskKeywords: [],
                      sentimentScore: 0,
                      hasEmoji: false,
                      hasTypo: false,
                      riskScore: 0,
                      sentiment: 0,
                    }))} />

                    <div className="flex justify-end gap-3">
                      <Button
                        variant="primary"
                        size="lg"
                        icon={<Play className="w-4 h-4" />}
                        onClick={handleImportAndCluster}
                        disabled={importedTexts.length === 0}
                      >
                        开始聚类分析
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <div className="space-y-6">
            <ImportSettings
              settings={importOptions}
              onSettingsChange={setImportOptions}
              onUseSampleData={handleLoadSampleData}
            />

            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-neutral-900">
                  历史项目
                </h3>
                <Badge variant="info" size="sm">
                  {projects.length} 个
                </Badge>
              </div>

              {projects.length === 0 ? (
                <EmptyState
                  title="暂无项目"
                  description="创建新项目或加载示例数据开始分析"
                  className="py-6"
                />
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="p-3 rounded-lg border border-neutral-200 hover:border-primary-300 hover:bg-primary-50/30 transition-all cursor-pointer group"
                      onClick={() => handleLoadProject(project.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-neutral-900 truncate">
                            {project.name}
                          </h4>
                          <p className="text-xs text-neutral-500 mt-1">
                            {formatDate(project.updatedAt)}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="default" size="sm">
                              {project.answers.length} 条回答
                            </Badge>
                            <Badge variant="default" size="sm">
                              {project.topics.length} 个主题
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteProject(project.id);
                          }}
                        >
                          删除
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        title="新建项目"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowNewProjectModal(false)}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateProject}
              disabled={!projectName.trim()}
            >
              创建
            </Button>
          </>
        }
      >
        <Input
          label="项目名称"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="请输入项目名称"
          autoFocus
        />
      </Modal>
    </PageLayout>
  );
};

export default ImportPage;
