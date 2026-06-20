import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  SearchCheck, 
  Target, 
  ArrowRight,
  CheckCircle,
  XCircle,
  RotateCcw,
  FileText,
  Download
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Input } from '@/components/ui/Form';
import Progress from '@/components/ui/Progress';
import ConfidenceIndicator from '@/components/ui/ConfidenceIndicator';
import useArchiveStore from '@/store/useArchiveStore';
import { getStrategyLabel, getInspectionStats } from '@/services/inspection';
import { generateInspectionReport } from '@/services/export';
import { downloadFile, getFieldLabel, getPriorityColor, getPriorityLabel, formatDate } from '@/utils/common';
import type { InspectionStrategy, InspectionStatus } from '@/types';

const InspectionPage = () => {
  const navigate = useNavigate();
  const {
    getCurrentProject,
    getCurrentRecords,
    inspectionTasks,
    currentTaskId,
    setCurrentTask,
    createInspectionTask,
    updateInspectionItem,
    getCurrentTaskItems,
    setSelectedRecord
  } = useArchiveStore();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [strategy, setStrategy] = useState<InspectionStrategy>('weighted');
  const [sampleRatio, setSampleRatio] = useState(20);
  const [dateWeight, setDateWeight] = useState(3);
  const [numberWeight, setNumberWeight] = useState(2.5);
  const [nameWeight, setNameWeight] = useState(2);
  const [pageWeight, setPageWeight] = useState(1.5);
  const [typeWeight, setTypeWeight] = useState(1);
  const [filterStatus, setFilterStatus] = useState<InspectionStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  
  const project = getCurrentProject();
  const records = getCurrentRecords();
  const projectTasks = inspectionTasks.filter(t => t.projectId === project?.id);
  const currentTask = projectTasks.find(t => t.id === currentTaskId) || projectTasks[0] || null;
  const currentItems = currentTask ? getCurrentTaskItems() : [];
  
  const stats = useMemo(() => {
    if (!currentTask) return null;
    return getInspectionStats(currentItems);
  }, [currentTask, currentItems]);

  const filteredItems = useMemo(() => {
    return currentItems.filter(item => {
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      if (filterPriority !== 'all' && item.priorityLevel !== filterPriority) return false;
      return true;
    });
  }, [currentItems, filterStatus, filterPriority]);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-archive-300" />
            <h3 className="font-serif text-xl font-semibold text-archive-800 mb-2">
              请先选择项目
            </h3>
            <p className="text-archive-500 mb-6">
              返回首页选择项目进行抽检管理
            </p>
            <Button onClick={() => navigate('/')}>
              返回首页
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreateTask = () => {
    if (!taskName.trim()) {
      alert('请输入抽检任务名称');
      return;
    }
    
    const task = createInspectionTask(project.id, taskName.trim(), {
      strategy,
      sampleRatio: sampleRatio / 100,
      priorityWeights: {
        date: dateWeight,
        documentNumber: numberWeight,
        name: nameWeight,
        pageNumber: pageWeight,
        materialType: typeWeight
      }
    });
    
    setCurrentTask(task.id);
    setShowCreateModal(false);
    setTaskName('');
  };

  const handleUpdateItemStatus = (itemId: string, status: 'pending' | 'pass' | 'fail' | 'recheck') => {
    if (!currentTask) return;
    updateInspectionItem(currentTask.id, itemId, { status });
  };

  const handleJumpToRecord = (recordId: string) => {
    setSelectedRecord(recordId);
    navigate('/workspace');
  };

  const handleDownloadReport = () => {
    if (!currentTask) return;
    const report = generateInspectionReport(currentTask.name, currentItems);
    downloadFile(report, `抽检报告_${currentTask.name}.md`, 'text/markdown');
  };

  const statusOptions: { value: InspectionStatus | 'all'; label: string }[] = [
    { value: 'all', label: '全部状态' },
    { value: 'pending', label: '待处理' },
    { value: 'pass', label: '通过' },
    { value: 'fail', label: '不通过' },
    { value: 'recheck', label: '待复核' }
  ];

  const priorityOptions = [
    { value: 'all', label: '全部优先级' },
    { value: 'critical', label: '极优先' },
    { value: 'high', label: '高优先' },
    { value: 'medium', label: '中优先' },
    { value: 'low', label: '低优先' }
  ];

  const strategyOptions: { value: InspectionStrategy; label: string; desc: string }[] = [
    { value: 'lowConfidenceFirst', label: '低置信优先', desc: '优先抽取置信度最低的字段' },
    { value: 'stratified', label: '分层抽样', desc: '按材料类型分层抽取' },
    { value: 'random', label: '随机抽样', desc: '完全随机抽取' },
    { value: 'weighted', label: '加权混合', desc: '综合置信度和字段重要性加权抽取' }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-bold text-archive-900 mb-1">
            抽检管理 - {project.name}
          </h1>
          <p className="text-archive-500 text-sm">
            智能生成抽检清单，优先复核高风险字段
          </p>
        </div>
        <div className="flex items-center gap-3">
          {currentTask && (
            <Button 
              variant="secondary" 
              onClick={handleDownloadReport}
              leftIcon={<Download className="w-4 h-4" />}
            >
              下载报告
            </Button>
          )}
          <Button 
            onClick={() => setShowCreateModal(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            创建抽检任务
          </Button>
        </div>
      </div>

      {projectTasks.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {projectTasks.map(task => (
            <button
              key={task.id}
              onClick={() => setCurrentTask(task.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTask?.id === task.id
                  ? 'bg-archive-950 text-white'
                  : 'bg-white border border-archive-200 text-archive-600 hover:bg-archive-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <SearchCheck className="w-4 h-4" />
                <span>{task.name}</span>
                <Badge 
                  variant={task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'warning' : 'default'}
                  size="sm"
                >
                  {task.status === 'completed' ? '已完成' : task.status === 'in_progress' ? '进行中' : '待开始'}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}

      {currentTask && stats && (
        <>
          <div className="grid grid-cols-5 gap-4">
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-archive-500 mb-1">抽检数量</p>
                <p className="text-2xl font-bold text-archive-800 font-serif">
                  {currentTask.sampleCount}
                </p>
                <p className="text-xs text-archive-400 mt-1">
                  占总记录 {((currentTask.sampleCount / currentTask.totalRecords) * 100).toFixed(1)}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-archive-500 mb-1">待处理</p>
                <p className="text-2xl font-bold text-archive-400 font-serif">
                  {stats.pending}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-archive-500 mb-1">通过</p>
                <p className="text-2xl font-bold text-success font-serif">
                  {stats.pass}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-archive-500 mb-1">不通过</p>
                <p className="text-2xl font-bold text-error font-serif">
                  {stats.fail}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-archive-500 mb-1">待复核</p>
                <p className="text-2xl font-bold text-warning font-serif">
                  {stats.recheck}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{currentTask.name}</CardTitle>
                  <p className="text-sm text-archive-500 mt-1">
                    抽检策略：{getStrategyLabel(currentTask.strategy)}
                    <span className="mx-2">·</span>
                    创建时间：{formatDate(currentTask.createdAt)}
                  </p>
                </div>
                <div className="w-64">
                  <Progress 
                    value={currentTask.completedCount} 
                    max={currentTask.sampleCount} 
                    showLabel
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="flex gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-archive-600">状态筛选：</span>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as InspectionStatus | 'all')}
                    className="px-3 py-1.5 text-sm border border-archive-200 rounded-lg focus:ring-2 focus:ring-archive-500/30 focus:border-archive-500"
                  >
                    {statusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-archive-600">优先级：</span>
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-archive-200 rounded-lg focus:ring-2 focus:ring-archive-500/30 focus:border-archive-500"
                  >
                    {priorityOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1" />
                <div className="text-sm text-archive-500">
                  显示 {filteredItems.length} / {currentItems.length} 项
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-archive-500">
                  <SearchCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>没有符合条件的抽检项</p>
                </div>
              ) : (
                <div className="divide-y divide-archive-50 max-h-[600px] overflow-y-auto">
                  {filteredItems.map((item, index) => {
                    const record = records.find(r => r.id === item.recordId);
                    const nameField = record?.fields.find(f => f.fieldName === 'name');
                    const dateField = record?.fields.find(f => f.fieldName === 'date');
                    
                    return (
                      <div 
                        key={item.id} 
                        className={`p-4 hover:bg-archive-50 transition-colors ${
                          item.status === 'fail' ? 'bg-error/5' :
                          item.status === 'pass' ? 'bg-success/5' :
                          item.status === 'recheck' ? 'bg-warning/5' : ''
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex flex-col items-center gap-1 pt-1">
                            <span className="text-xs text-archive-400 font-mono">#{index + 1}</span>
                            <Badge className={getPriorityColor(item.priorityLevel)} size="sm">
                              {getPriorityLabel(item.priorityLevel)}
                            </Badge>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="flex items-center gap-3 mb-1">
                                  <span className="font-medium text-archive-800">
                                    {getFieldLabel(item.fieldName)}
                                  </span>
                                  <Badge 
                                    variant={
                                      item.status === 'pass' ? 'success' :
                                      item.status === 'fail' ? 'error' :
                                      item.status === 'recheck' ? 'warning' : 'default'
                                    }
                                    size="sm"
                                  >
                                    {item.status === 'pass' ? '通过' :
                                     item.status === 'fail' ? '不通过' :
                                     item.status === 'recheck' ? '待复核' : '待处理'}
                                  </Badge>
                                </div>
                                <p className="text-sm text-archive-500">
                                  档案：{nameField?.correctedValue || nameField?.ocrValue || '未识别'}
                                  {dateField && (
                                    <span className="ml-2">
                                      日期：{dateField?.correctedValue || dateField?.ocrValue || '未识别'}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <button
                                onClick={() => handleJumpToRecord(item.recordId)}
                                className="text-archive-400 hover:text-archive-600 transition-colors flex items-center gap-1 text-sm"
                              >
                                查看详情 <ArrowRight className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div className="p-3 bg-white rounded-lg border border-archive-100">
                                <p className="text-xs text-archive-500 mb-1">OCR识别值</p>
                                <p className="font-medium text-archive-700">
                                  {item.ocrValue || <span className="text-archive-400 italic">未识别</span>}
                                </p>
                              </div>
                              <div className="p-3 bg-white rounded-lg border border-archive-100">
                                <p className="text-xs text-archive-500 mb-1">修正值</p>
                                <p className="font-medium text-success">
                                  {item.correctedValue || <span className="text-archive-400 italic">未修正</span>}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <ConfidenceIndicator 
                                confidence={item.priority} 
                                showLabel={false}
                                size="sm"
                              />
                              <span className="text-xs text-archive-400">风险指数</span>
                              
                              <div className="flex-1" />
                              
                              {item.status === 'pending' && (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="secondary"
                                    onClick={() => handleUpdateItemStatus(item.id, 'pass')}
                                    leftIcon={<CheckCircle className="w-4 h-4" />}
                                  >
                                    通过
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="danger"
                                    onClick={() => handleUpdateItemStatus(item.id, 'fail')}
                                    leftIcon={<XCircle className="w-4 h-4" />}
                                  >
                                    不通过
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => handleUpdateItemStatus(item.id, 'recheck')}
                                    leftIcon={<RotateCcw className="w-4 h-4" />}
                                  >
                                    待复核
                                  </Button>
                                </>
                              )}
                              {item.status !== 'pending' && (
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => handleUpdateItemStatus(item.id, 'pending')}
                                >
                                  重置状态
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!currentTask && projectTasks.length === 0 && (
        <Card>
          <CardContent className="text-center py-16">
            <Target className="w-20 h-20 mx-auto mb-4 text-archive-200" />
            <h3 className="font-serif text-xl font-semibold text-archive-800 mb-2">
              暂无抽检任务
            </h3>
            <p className="text-archive-500 mb-6 max-w-md mx-auto">
              创建抽检任务，系统将根据置信度和字段重要性智能生成抽检清单，
              优先复核低置信度的日期和编号等关键字段，而不是平均翻全部照片。
            </p>
            <Button 
              onClick={() => setShowCreateModal(true)}
              size="lg"
              leftIcon={<Plus className="w-5 h-5" />}
            >
              创建第一个抽检任务
            </Button>
          </CardContent>
        </Card>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
            <Card>
              <CardHeader>
                <CardTitle>创建抽检任务</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Input
                  label="任务名称"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="例如：2024年第一季度档案抽检"
                />

                <div>
                  <label className="block text-sm font-medium text-archive-700 mb-3">
                    抽检策略
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {strategyOptions.map(opt => (
                      <label
                        key={opt.value}
                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          strategy === opt.value
                            ? 'border-archive-950 bg-archive-50'
                            : 'border-archive-200 hover:border-archive-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="strategy"
                          value={opt.value}
                          checked={strategy === opt.value}
                          onChange={(e) => setStrategy(e.target.value as InspectionStrategy)}
                          className="sr-only"
                        />
                        <p className="font-medium text-archive-800 mb-1">{opt.label}</p>
                        <p className="text-xs text-archive-500">{opt.desc}</p>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-archive-700 mb-2">
                    抽检比例：{sampleRatio}% ({Math.max(1, Math.round(records.length * sampleRatio / 100))} 条)
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={sampleRatio}
                    onChange={(e) => setSampleRatio(parseInt(e.target.value))}
                    className="w-full h-2 bg-archive-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-archive-400 mt-1">
                    <span>5%</span>
                    <span>50%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-archive-700 mb-3">
                    字段优先级权重
                  </label>
                  <div className="space-y-3">
                    {[
                      { key: 'date', label: '日期', value: dateWeight, setter: setDateWeight },
                      { key: 'documentNumber', label: '编号', value: numberWeight, setter: setNumberWeight },
                      { key: 'name', label: '姓名', value: nameWeight, setter: setNameWeight },
                      { key: 'pageNumber', label: '页码', value: pageWeight, setter: setPageWeight },
                      { key: 'materialType', label: '材料类型', value: typeWeight, setter: setTypeWeight }
                    ].map(field => (
                      <div key={field.key} className="flex items-center gap-4">
                        <span className="w-20 text-sm text-archive-600">{field.label}</span>
                        <input
                          type="range"
                          min="0"
                          max="5"
                          step="0.5"
                          value={field.value}
                          onChange={(e) => field.setter(parseFloat(e.target.value))}
                          className="flex-1 h-2 bg-archive-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="w-12 text-right text-sm font-medium text-archive-700">
                          {field.value.toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-archive-100">
                  <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                    取消
                  </Button>
                  <Button onClick={handleCreateTask}>
                    创建任务
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default InspectionPage;
