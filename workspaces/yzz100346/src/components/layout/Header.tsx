import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, FileText, Download, Settings, FolderOpen, Plus, Shield } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useUIStore } from '../../store/useUIStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { exportProjectReport, exportProjectJSON } from '../../utils/exportReport';

export function Header() {
  const navigate = useNavigate();
  const { project, saveProject, initNewProject, getAllProjects, loadProject } = useProjectStore();
  const { toggleSaveModal, toggleExportModal, showSaveModal, showExportModal } = useUIStore();
  const [projectName, setProjectName] = useState('');
  const [showProjectList, setShowProjectList] = useState(false);

  const handleSave = () => {
    if (project) {
      saveProject(projectName || project.name);
      toggleSaveModal(false);
    }
  };

  const handleExportReport = () => {
    if (project) {
      exportProjectReport(project);
    }
  };

  const handleExportJSON = () => {
    if (project) {
      exportProjectJSON(project);
    }
  };

  const handleNewProject = () => {
    if (project && project.devices.length > 0) {
      if (!confirm('当前方案有未保存的更改，确定要新建方案吗？')) {
        return;
      }
    }
    initNewProject();
  };

  const handleLoadProject = (projectId: string) => {
    loadProject(projectId);
    setShowProjectList(false);
  };

  const savedProjects = getAllProjects();

  return (
    <>
      <header className="h-14 bg-[#23272f] border-b border-[#3a4150] flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#3b82f6]" />
            <h1 className="text-lg font-semibold text-[#f8fafc]">舞台吊点安全预演</h1>
          </div>
          
          {project && (
            <div className="flex items-center gap-2 ml-4">
              <span className="text-xs text-[#64748b]">当前方案:</span>
              <span className="text-sm text-[#f8fafc] font-mono">{project.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleNewProject}
          >
            <Plus className="w-4 h-4" />
            新建
          </Button>
          
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowProjectList(!showProjectList)}
            >
              <FolderOpen className="w-4 h-4" />
              打开
            </Button>
            
            {showProjectList && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-[#23272f] border border-[#3a4150] shadow-xl z-50 max-h-80 overflow-y-auto">
                <div className="p-2 border-b border-[#3a4150]">
                  <p className="text-xs text-[#94a3b8]">已保存的方案</p>
                </div>
                {savedProjects.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-xs text-[#64748b]">暂无保存的方案</p>
                  </div>
                ) : (
                  savedProjects.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 hover:bg-[#2d323b] cursor-pointer border-b border-[#3a4150]/50"
                      onClick={() => handleLoadProject(p.id)}
                    >
                      <p className="text-sm text-[#f8fafc]">{p.name}</p>
                      <p className="text-[10px] text-[#64748b] mt-1">
                        {new Date(p.updatedAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setProjectName(project?.name || '');
              toggleSaveModal(true);
            }}
          >
            <Save className="w-4 h-4" />
            保存
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => toggleExportModal(true)}
          >
            <Download className="w-4 h-4" />
            导出
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/projects')}
          >
            <FileText className="w-4 h-4" />
            方案管理
          </Button>
        </div>
      </header>

      <Modal
        isOpen={showSaveModal}
        onClose={() => toggleSaveModal(false)}
        title="保存方案"
        footer={
          <>
            <Button variant="ghost" onClick={() => toggleSaveModal(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleSave}>
              保存
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="方案名称"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="输入方案名称"
            autoFocus
          />
        </div>
      </Modal>

      <Modal
        isOpen={showExportModal}
        onClose={() => toggleExportModal(false)}
        title="导出方案"
      >
        <div className="space-y-3">
          <Button
            variant="secondary"
            size="md"
            className="w-full justify-start"
            onClick={handleExportReport}
          >
            <FileText className="w-4 h-4" />
            导出安全报告 (Markdown)
            <span className="text-xs text-[#64748b] ml-auto">
              包含风险点、调整建议、设备清单
            </span>
          </Button>
          <Button
            variant="secondary"
            size="md"
            className="w-full justify-start"
            onClick={handleExportJSON}
          >
            <Settings className="w-4 h-4" />
            导出方案数据 (JSON)
            <span className="text-xs text-[#64748b] ml-auto">
              可用于导入和分享
            </span>
          </Button>
        </div>
      </Modal>
    </>
  );
}
