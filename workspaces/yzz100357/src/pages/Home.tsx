import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  FileText, 
  Clock, 
  ChevronRight,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Package
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import Button from '../components/Button';
import Card from '../components/Card';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { STATUS_LABELS } from '../../shared/types';
import type { Order } from '../../shared/types';

export default function Home() {
  const navigate = useNavigate();
  const { projects, loading, loadProjects, createProject, setCurrentProject } = useAppStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    orderNo: '',
    customerName: '',
    orderTime: '',
    appealDeadline: ''
  });

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreateProject = async () => {
    if (!formData.orderNo || !formData.customerName || !formData.orderTime || !formData.appealDeadline) {
      return;
    }
    
    const project = await createProject(formData);
    if (project) {
      setCurrentProject(project);
      setShowCreateModal(false);
      navigate(`/project/${project.id}/import`);
    }
  };

  const handleOpenProject = (project: Order) => {
    setCurrentProject(project);
    navigate(`/project/${project.id}/import`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-100 text-slate-600';
      case 'analyzing': return 'bg-blue-100 text-blue-700';
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'exported': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const isUrgent = (deadline: string) => {
    const diff = new Date(deadline).getTime() - new Date().getTime();
    return diff < 24 * 60 * 60 * 1000;
  };

  const getStepProgress = (status: string) => {
    switch (status) {
      case 'draft': return 25;
      case 'analyzing': return 50;
      case 'confirmed': return 75;
      case 'exported': return 100;
      default: return 0;
    }
  };

  return (
    <div className="p-8 animate-fade-in">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold text-slate-900 mb-1">申诉项目列表</h1>
            <p className="text-slate-500 text-sm">管理您的差评申诉项目，快速整理证据材料</p>
          </div>
          <Button
            variant="primary"
            size="lg"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            新建申诉项目
          </Button>
        </div>

        {loading && projects.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-slate-400">加载中...</div>
          </div>
        ) : projects.length === 0 ? (
          <Card className="text-center py-16">
            <Card.Body>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-700 mb-2">暂无申诉项目</h3>
              <p className="text-slate-500 text-sm mb-6">创建您的第一个差评申诉项目，开始整理证据材料</p>
              <Button
                variant="primary"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setShowCreateModal(true)}
              >
                新建项目
              </Button>
            </Card.Body>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, index) => (
              <Card
                key={project.id}
                hoverable
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => handleOpenProject(project)}
              >
                <Card.Header>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', getStatusColor(project.status))}>
                          {STATUS_LABELS[project.status]}
                        </span>
                        {isUrgent(project.appealDeadline) && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600 animate-pulse-soft">
                            <AlertTriangle className="w-3 h-3" />
                            紧急
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-800 truncate">{project.orderNo}</h3>
                      <p className="text-sm text-slate-500 truncate mt-0.5">{project.customerName}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 mt-1" />
                  </div>
                </Card.Header>
                <Card.Body>
                  <div className="space-y-3">
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-primary-700 transition-all duration-500"
                        style={{ width: `${getStepProgress(project.status)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        下单：{format(new Date(project.orderTime), 'MM-dd', { locale: zhCN })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        截止：{format(new Date(project.appealDeadline), 'MM-dd', { locale: zhCN })}
                      </span>
                    </div>
                  </div>
                </Card.Body>
                <Card.Footer>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      创建于 {format(new Date(project.createdAt), 'yyyy-MM-dd', { locale: zhCN })}
                    </span>
                    <div className="flex items-center gap-1 text-primary-600 font-medium">
                      继续处理
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </Card.Footer>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-bounce-in overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-primary-800 to-primary-900">
              <h2 className="text-xl font-display font-bold text-white">新建申诉项目</h2>
              <p className="text-primary-200 text-sm mt-1">填写订单基本信息，开始整理申诉材料</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">订单号</label>
                <input
                  type="text"
                  value={formData.orderNo}
                  onChange={(e) => setFormData({ ...formData, orderNo: e.target.value })}
                  placeholder="请输入订单号"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">客户昵称</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="请输入客户昵称"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">下单时间</label>
                  <input
                    type="datetime-local"
                    value={formData.orderTime}
                    onChange={(e) => setFormData({ ...formData, orderTime: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">申诉截止时间</label>
                  <input
                    type="datetime-local"
                    value={formData.appealDeadline}
                    onChange={(e) => setFormData({ ...formData, appealDeadline: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowCreateModal(false)}
              >
                取消
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateProject}
                disabled={!formData.orderNo || !formData.customerName || !formData.orderTime || !formData.appealDeadline}
              >
                创建项目
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
