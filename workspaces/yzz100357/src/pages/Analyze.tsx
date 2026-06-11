import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Play,
  Filter,
  Eye,
  CheckCheck,
  AlertCircle,
  Zap,
  MessageSquareWarning,
  Truck,
  Calendar,
  Undo2,
  Upload
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import Button from '../components/Button';
import Card from '../components/Card';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { EVIDENCE_TYPE_LABELS, RISK_LEVEL_LABELS } from '../../shared/types';
import type { Evidence, EvidenceType } from '../../shared/types';

const EVIDENCE_TYPES: { value: EvidenceType; label: string; icon: any; color: string }[] = [
  { value: 'shipping_time', label: '发货时间', icon: Truck, color: 'bg-blue-500' },
  { value: 'customer_promise', label: '客户承诺', icon: MessageSquareWarning, color: 'bg-amber-500' },
  { value: 'refund_node', label: '退款节点', icon: RefreshCw, color: 'bg-purple-500' },
  { value: 'violation_speech', label: '违规话术', icon: Shield, color: 'bg-red-500' },
];

export default function Analyze() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const {
    evidence,
    materials,
    loading,
    analyzing,
    loadEvidence,
    analyzeMaterials,
    confirmEvidence,
    confirmAllEvidence,
    deleteEvidence,
    currentProject,
    setCurrentProject,
    projectApi,
    loadMaterials
  } = useAppStore();

  const [selectedType, setSelectedType] = useState<EvidenceType | 'all'>('all');
  const [showUnconfirmedOnly, setShowUnconfirmedOnly] = useState(false);
  const [expandedEvidence, setExpandedEvidence] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      loadEvidence(projectId);
      loadMaterials(projectId);
      if (!currentProject) {
        projectApi.getById(projectId).then(res => {
          if (res.success && res.data) {
            setCurrentProject(res.data);
          }
        });
      }
    }
  }, [projectId, loadEvidence, loadMaterials, currentProject, setCurrentProject, projectApi]);

  const handleAnalyze = async () => {
    if (!projectId) return;
    await analyzeMaterials(projectId);
  };

  const handleConfirmEvidence = async (id: string, confirmed: boolean) => {
    if (confirmed) {
      await confirmEvidence(id);
    }
  };

  const handleConfirmAll = async () => {
    if (!projectId) return;
    await confirmAllEvidence(projectId);
  };

  const getSourceMaterial = (materialId: string) => {
    return materials.find(m => m.id === materialId);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return '高置信度';
    if (confidence >= 0.6) return '中置信度';
    return '低置信度';
  };

  const filteredEvidence = useMemo(() => {
    let result = evidence;
    if (selectedType !== 'all') {
      result = result.filter(e => e.type === selectedType);
    }
    if (showUnconfirmedOnly) {
      result = result.filter(e => !e.confirmed);
    }
    return result.sort((a, b) => {
      if (a.timestamp && b.timestamp) {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      return 0;
    });
  }, [evidence, selectedType, showUnconfirmedOnly]);

  const stats = useMemo(() => {
    const total = evidence.length;
    const confirmed = evidence.filter(e => e.confirmed).length;
    const unconfirmed = total - confirmed;
    const byType = EVIDENCE_TYPES.map(type => ({
      ...type,
      count: evidence.filter(e => e.type === type.value).length
    }));
    const highRisk = evidence.filter(e => e.riskLevel === 'high' && e.type === 'violation_speech').length;
    return { total, confirmed, unconfirmed, byType, highRisk };
  }, [evidence]);

  const timelines = useMemo(() => {
    const events: Array<{
      id: string;
      time: string;
      label: string;
      type: 'event' | 'evidence';
      evidence?: Evidence;
      icon: any;
      color: string;
    }> = [];

    evidence.forEach(e => {
      if (e.timestamp) {
        const typeConfig = EVIDENCE_TYPES.find(t => t.value === e.type);
        events.push({
          id: e.id,
          time: e.timestamp,
          label: EVIDENCE_TYPE_LABELS[e.type],
          type: 'evidence',
          evidence: e,
          icon: typeConfig?.icon || AlertCircle,
          color: typeConfig?.color || 'bg-slate-500'
        });
      }
    });

    if (currentProject) {
      events.push({
        id: 'order',
        time: currentProject.orderTime,
        label: '订单创建',
        type: 'event',
        icon: Calendar,
        color: 'bg-slate-400'
      });
    }

    return events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [evidence, currentProject]);

  return (
    <div className="p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold text-slate-900 mb-1">智能识别</h1>
            <p className="text-slate-500 text-sm">AI自动分析材料，识别关键证据和违规话术</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={handleAnalyze}
              loading={analyzing}
              disabled={materials.length === 0}
            >
              {analyzing ? '分析中...' : '重新分析'}
            </Button>
            {evidence.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  leftIcon={<CheckCheck className="w-4 h-4" />}
                  onClick={handleConfirmAll}
                  disabled={stats.unconfirmed === 0}
                >
                  全部确认 ({stats.unconfirmed})
                </Button>
                <Button
                  variant="primary"
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                  onClick={() => navigate(`/project/${projectId}/summary`)}
                  disabled={stats.confirmed === 0}
                >
                  下一步：生成摘要
                </Button>
              </>
            )}
          </div>
        </div>

        {materials.length > 0 && evidence.length === 0 && !analyzing && (
          <Card className="mb-8 bg-gradient-to-r from-primary-50 to-accent-50 border-primary-200">
            <Card.Body className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center">
                <Zap className="w-10 h-10 text-primary-700" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">开始智能分析</h3>
              <p className="text-slate-600 mb-6 max-w-lg mx-auto">
                系统将自动分析您上传的 {materials.length} 个材料，识别发货时间、客户承诺、退款节点和可能的违规话术。
                分析过程中会自动标记低置信度证据供您人工确认。
              </p>
              <Button
                variant="primary"
                size="lg"
                leftIcon={<Play className="w-5 h-5" />}
                onClick={handleAnalyze}
                loading={analyzing}
              >
                开始智能识别
              </Button>
            </Card.Body>
          </Card>
        )}

        {analyzing && (
          <Card className="mb-8">
            <Card.Body className="py-12">
              <div className="flex items-center justify-center gap-4">
                <RefreshCw className="w-8 h-8 text-primary-600 animate-spin" />
                <div>
                  <h3 className="font-semibold text-slate-800">正在分析材料...</h3>
                  <p className="text-sm text-slate-500 mt-1">正在解析聊天记录、识别关键信息，请稍候</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        )}

        {evidence.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {stats.byType.map((type, index) => (
                <Card key={type.value} className="animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                  <Card.Body>
                    <div className="flex items-center gap-3">
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', type.color)}>
                        <type.icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-800">{type.count}</p>
                        <p className="text-xs text-slate-500">{type.label}</p>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <Card.Header>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h2 className="font-semibold text-slate-800">识别结果</h2>
                        <span className="px-2.5 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-medium">
                          共 {filteredEvidence.length} 条
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {[
                            { value: 'all', label: '全部' },
                            ...EVIDENCE_TYPES.map(t => ({ value: t.value, label: t.label }))
                          ].map(item => (
                            <button
                              key={item.value}
                              onClick={() => setSelectedType(item.value as any)}
                              className={cn(
                                'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                                selectedType === item.value
                                  ? 'bg-primary-800 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              )}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setShowUnconfirmedOnly(!showUnconfirmedOnly)}
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1',
                            showUnconfirmedOnly
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          )}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          待确认
                        </button>
                      </div>
                    </div>
                  </Card.Header>
                  <Card.Body className="max-h-[600px] overflow-y-auto">
                    <div className="space-y-3">
                      {filteredEvidence.map((item, index) => {
                        const typeConfig = EVIDENCE_TYPES.find(t => t.value === item.type);
                        const sourceMaterial = getSourceMaterial(item.sourceMaterialId);
                        const isExpanded = expandedEvidence === item.id;
                        const lowConfidence = item.confidence < 0.6;
                        const TypeIcon = typeConfig?.icon || AlertCircle;
                        const typeColor = typeConfig?.color || 'bg-slate-500';

                        return (
                          <Card
                            key={item.id}
                            className={cn(
                              'overflow-hidden transition-all animate-slide-up',
                              !item.confirmed && 'border-amber-300 bg-amber-50/30',
                              item.type === 'violation_speech' && item.riskLevel === 'high' && 'border-red-300 bg-red-50/30'
                            )}
                            style={{ animationDelay: `${index * 0.03}s` }}
                          >
                            <Card.Body className="py-3">
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                                  typeColor
                                )}>
                                  <TypeIcon className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-slate-800">
                                          {EVIDENCE_TYPE_LABELS[item.type]}
                                        </span>
                                        {item.riskLevel && (
                                          <span className={cn(
                                            'px-2 py-0.5 rounded text-xs font-medium',
                                            item.riskLevel === 'high' ? 'bg-red-100 text-red-700' :
                                            item.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
                                            'bg-green-100 text-green-700'
                                          )}>
                                            {RISK_LEVEL_LABELS[item.riskLevel]}风险
                                          </span>
                                        )}
                                        <span className={cn(
                                          'px-2 py-0.5 rounded text-xs font-medium',
                                          getConfidenceColor(item.confidence)
                                        )}>
                                          {getConfidenceLabel(item.confidence)} ({(item.confidence * 100).toFixed(0)}%)
                                        </span>
                                        {item.confirmed ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                            <CheckCircle2 className="w-3 h-3" />
                                            已确认
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                                            <AlertCircle className="w-3 h-3" />
                                            待确认
                                          </span>
                                        )}
                                      </div>
                                      
                                      <p className="text-slate-700 mt-2">{item.content}</p>
                                      
                                      {lowConfidence && (
                                        <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                                          <p className="text-xs text-amber-700 flex items-start gap-1.5">
                                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                            置信度较低，可能包含表情、撤回消息或多订单混淆，请人工核实后再确认
                                          </p>
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      {!item.confirmed && (
                                        <>
                                          <button
                                            onClick={() => handleConfirmEvidence(item.id, true)}
                                            className="p-1.5 rounded-lg text-green-600 hover:bg-green-100 transition-all"
                                            title="确认证据"
                                          >
                                            <CheckCircle2 className="w-5 h-5" />
                                          </button>
                                          <button
                                            onClick={() => handleConfirmEvidence(item.id, false)}
                                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-100 transition-all"
                                            title="驳回证据"
                                          >
                                            <XCircle className="w-5 h-5" />
                                          </button>
                                        </>
                                      )}
                                      <button
                                        onClick={() => setExpandedEvidence(isExpanded ? null : item.id)}
                                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-all"
                                      >
                                        {isExpanded ? (
                                          <ChevronDown className="w-5 h-5" />
                                        ) : (
                                          <Eye className="w-5 h-5" />
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  {isExpanded && (
                                    <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                                      <div>
                                        <p className="text-xs font-medium text-slate-500 mb-1">原文出处</p>
                                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                                          <p className="text-sm text-slate-700 font-mono leading-relaxed">
                                            "{item.sourceText}"
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                          <Eye className="w-3 h-3" />
                                          来源：{sourceMaterial?.fileName || '未知文件'}
                                        </span>
                                        {item.sourceLocation && (
                                          <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            位置：{item.sourceLocation}
                                          </span>
                                        )}
                                        {item.timestamp && (
                                          <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            时间：{format(new Date(item.timestamp), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Card.Body>
                          </Card>
                        );
                      })}
                    </div>

                    {filteredEvidence.length === 0 && (
                      <div className="text-center py-12">
                        <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">暂无匹配的识别结果</p>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <Card.Header>
                    <h2 className="font-semibold text-slate-800">事件时间线</h2>
                  </Card.Header>
                  <Card.Body>
                    <div className="relative pl-6 space-y-4 max-h-[400px] overflow-y-auto">
                      <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-slate-200" />
                      {timelines.map((event, index) => {
                        const EventIcon = event.icon;
                        return (
                          <div key={event.id} className="relative">
                            <div className={cn(
                              'absolute -left-6 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white',
                              event.color
                            )}>
                              <EventIcon className="w-3 h-3 text-white" />
                            </div>
                            <div className="pb-4">
                              <p className="text-xs text-slate-400 font-mono">
                                {format(new Date(event.time), 'MM-dd HH:mm', { locale: zhCN })}
                              </p>
                              <p className="text-sm font-medium text-slate-700 mt-0.5">{event.label}</p>
                              {event.evidence && (
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                  {event.evidence.content}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card.Body>
                </Card>

                <Card>
                  <Card.Header>
                    <h2 className="font-semibold text-slate-800">处理进度</h2>
                  </Card.Header>
                  <Card.Body className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-600">证据确认</span>
                        <span className="text-sm font-medium text-slate-800">
                          {stats.confirmed} / {stats.total}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary-500 to-primary-700 transition-all duration-500"
                          style={{ width: `${stats.total > 0 ? (stats.confirmed / stats.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    {stats.unconfirmed > 0 && (
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <p className="text-xs text-amber-700 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          还有 {stats.unconfirmed} 条证据待确认，低置信度证据需要您人工审核
                        </p>
                      </div>
                    )}

                    {stats.highRisk > 0 && (
                      <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                        <p className="text-xs text-red-700 flex items-start gap-2">
                          <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          检测到 {stats.highRisk} 条高风险违规话术，请重点关注
                        </p>
                      </div>
                    )}

                    {stats.confirmed > 0 && (
                      <Button
                        variant="primary"
                        className="w-full"
                        rightIcon={<ChevronRight className="w-4 h-4" />}
                        onClick={() => navigate(`/project/${projectId}/summary`)}
                      >
                        生成申诉摘要 ({stats.confirmed} 条证据)
                      </Button>
                    )}
                  </Card.Body>
                </Card>
              </div>
            </div>
          </>
        )}

        {materials.length === 0 && !analyzing && (
          <Card className="text-center py-16">
            <Card.Body>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <Upload className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-700 mb-2">请先上传材料</h3>
              <p className="text-slate-500 text-sm mb-6">请先在材料导入页面上传聊天记录、物流截图等材料</p>
              <Button
                variant="primary"
                onClick={() => navigate(`/project/${projectId}/import`)}
                leftIcon={<ChevronRight className="w-4 h-4 rotate-180" />}
              >
                前往导入材料
              </Button>
            </Card.Body>
          </Card>
        )}
      </div>
    </div>
  );
}
