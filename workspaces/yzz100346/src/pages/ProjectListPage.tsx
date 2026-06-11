import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Edit, Eye, FileText, Calendar, Shield, AlertTriangle, Search, Plus } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import type { Project } from '../types/project';
import { DEVICE_TYPE_LABELS } from '../constants/colors';

export default function ProjectListPage() {
  const navigate = useNavigate();
  const { getAllProjects, loadProject, deleteProject, initNewProject } = useProjectStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Project | null>(null);

  useEffect(() => {
    refreshProjects();
  }, []);

  const refreshProjects = () => {
    setProjects(getAllProjects().sort((a, b) => b.updatedAt - a.updatedAt));
  };

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (project: Project) => {
    setDeleteConfirm(project);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteProject(deleteConfirm.id);
      refreshProjects();
      setDeleteConfirm(null);
    }
  };

  const handleOpen = (project: Project) => {
    loadProject(project.id);
    navigate('/');
  };

  const handleView = (project: Project) => {
    navigate(`/projects/${project.id}`);
  };

  const handleNewProject = () => {
    initNewProject();
    navigate('/');
  };

  const getRiskSummary = (project: Project) => {
    const critical = project.risks.filter(r => r.level === 'critical').length;
    const warning = project.risks.filter(r => r.level === 'warning').length;
    const info = project.risks.filter(r => r.level === 'info').length;
    return { critical, warning, info };
  };

  const getDeviceSummary = (project: Project) => {
    const counts: Record<string, number> = {};
    project.devices.forEach(d => {
      counts[d.type] = (counts[d.type] || 0) + 1;
    });
    return counts;
  };

  return (
    <div className="min-h-screen bg-[#1a1d23] text-[#f8fafc]">
      <header className="h-14 bg-[#23272f] border-b border-[#3a4150] flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4" />
            返回编辑器
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#3b82f6]" />
            <h1 className="text-lg font-semibold">方案管理</h1>
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleNewProject}
        >
          <Plus className="w-4 h-4" />
          新建方案
        </Button>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-md relative">
              <Search className="w-4 h-4 text-[#64748b] absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="搜索方案名称..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="info" size="md">
              共 {filteredProjects.length} 个方案
            </Badge>
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <Card variant="glass">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-[#2d323b] flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-[#64748b]" />
              </div>
              <p className="text-[#94a3b8] mb-2">
                {searchQuery ? '没有找到匹配的方案' : '暂无保存的方案'}
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={handleNewProject}
                className="mt-2"
              >
                <Plus className="w-4 h-4" />
                创建第一个方案
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => {
              const risks = getRiskSummary(project);
              const devices = getDeviceSummary(project);
              const hasCriticalRisk = risks.critical > 0;

              return (
                <Card
                  key={project.id}
                  variant="glass"
                  className={`transition-all hover:border-[#3b82f6] ${
                    hasCriticalRisk ? 'border-[#ef4444]/50' : ''
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base mb-1">{project.name}</CardTitle>
                        <div className="flex items-center gap-2 text-[10px] text-[#64748b]">
                          <Calendar className="w-3 h-3" />
                          {new Date(project.updatedAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                      {hasCriticalRisk && (
                        <Badge variant="danger" size="sm">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {risks.critical} 严重
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(devices).map(([type, count]) => (
                        <Badge key={type} variant="default" size="sm">
                          {DEVICE_TYPE_LABELS[type as keyof typeof DEVICE_TYPE_LABELS]}: {count}
                        </Badge>
                      ))}
                      {Object.keys(devices).length === 0 && (
                        <span className="text-xs text-[#64748b]">暂无设备</span>
                      )}
                    </div>

                    {(risks.critical > 0 || risks.warning > 0 || risks.info > 0) && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-[#64748b]">风险:</span>
                        {risks.critical > 0 && (
                          <span className="text-[#ef4444] font-medium">{risks.critical} 严重</span>
                        )}
                        {risks.warning > 0 && (
                          <span className="text-[#f59e0b] font-medium">{risks.warning} 警告</span>
                        )}
                        {risks.info > 0 && (
                          <span className="text-[#3b82f6] font-medium">{risks.info} 提示</span>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2 border-t border-[#3a4150]">
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleOpen(project)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        编辑
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleView(project)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(project)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="确认删除"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
              取消
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              确认删除
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[#f8fafc]">
            确定要删除方案 <span className="font-mono text-[#3b82f6]">{deleteConfirm?.name}</span> 吗？
          </p>
          <p className="text-xs text-[#64748b]">
            此操作不可恢复，方案数据和历史记录将被永久删除。
          </p>
        </div>
      </Modal>
    </div>
  );
}
