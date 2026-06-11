import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Edit3,
  Eye,
  Save,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Shield,
  Clock,
  History,
  Download,
  CheckCircle2,
  AlertTriangle,
  EyeOff,
  User,
  Phone,
  Hash,
  Calendar,
  Edit,
  Trash2,
  Undo2,
  Redo2,
  Zap
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import Button from '../components/Button';
import Card from '../components/Card';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { EVIDENCE_TYPE_LABELS } from '../../shared/types';
import type { AppealSummary, SummaryVersion, Evidence } from '../../shared/types';

export default function Summary() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const {
    evidence,
    summaries,
    currentSummary,
    loading,
    generating,
    currentProject,
    setCurrentProject,
    projectApi,
    loadEvidence,
    loadSummary,
    generateSummary,
    saveSummary,
    createSummaryVersion
  } = useAppStore();

  const [content, setContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editNote, setEditNote] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (projectId) {
      loadEvidence(projectId);
      loadSummary(projectId);
      if (!currentProject) {
        projectApi.getById(projectId).then(res => {
          if (res.success && res.data) {
            setCurrentProject(res.data);
          }
        });
      }
    }
  }, [projectId, loadEvidence, loadSummary, currentProject, setCurrentProject, projectApi]);

  useEffect(() => {
    if (currentSummary) {
      setContent(currentSummary.content);
    }
  }, [currentSummary]);

  const confirmedEvidence = useMemo(() => {
    return evidence.filter(e => e.confirmed);
  }, [evidence]);

  const handleGenerate = async () => {
    if (!projectId) return;
    generateSummary(projectId);
  };

  const handleSave = async () => {
    if (!projectId || !content.trim()) return;
    
    const versionNote = editNote.trim() || '人工修改';
    await saveSummary(projectId, content, versionNote);
    setEditNote('');
    setLastSaved(new Date());
  };

  const handleRestoreVersion = (version: SummaryVersion) => {
    if (confirm('确定要恢复到 "' + version.versionNote + '" 这个版本吗？')) {
      setContent(version.content);
    }
  };

  const maskPhone = (text: string): string => {
    return text.replace(/1[3-9]\d{9}/g, (match) => {
      return match.slice(0, 3) + '****' + match.slice(7);
    });
  };

  const renderMarkdown = (md: string) => {
    let result = md;
    result = result.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-slate-800 mt-6 mb-3">$1</h3>');
    result = result.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-slate-900 mt-8 mb-4 pb-2 border-b border-slate-200">$1</h2>');
    result = result.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-slate-900 mb-6 pb-3 border-b-2 border-primary-200">$1</h1>');
    result = result.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
    result = result.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
    result = result.replace(/^- (.+)$/gm, '<li class="ml-4 text-slate-700 leading-relaxed list-disc">$1</li>');
    result = result.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-slate-700 leading-relaxed list-decimal">$1</li>');
    result = result.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-primary-600 hover:underline">$1</a>');
    result = result.replace(/\n/g, '<br/>');
    return result;
  };

  const previewContent = useMemo(() => {
    const masked = maskPhone(content);
    return renderMarkdown(masked);
  }, [content]);

  const versions = useMemo((): SummaryVersion[] => {
    const allSummaries = currentSummary 
      ? [currentSummary, ...summaries.filter(s => s.id !== currentSummary.id)]
      : summaries;
    
    return allSummaries.map(s => ({
      id: s.id,
      projectId: s.projectId,
      content: s.content,
      version: s.version,
      versionNote: s.changeLog,
      createdAt: s.createdAt,
      modifiedBy: s.modifiedBy,
    }));
  }, [currentSummary, summaries]);

  return (
    <div className="p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold text-slate-900 mb-1">申诉摘要</h1>
            <p className="text-slate-500 text-sm">编辑申诉文档，自动脱敏，保留修改历史</p>
          </div>
          <div className="flex items-center gap-3">
            {lastSaved && (
              <span className="text-sm text-slate-500">
                上次保存：{format(lastSaved, 'HH:mm:ss', { locale: zhCN })}
              </span>
            )}
            <Button
              variant="secondary"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={handleGenerate}
              loading={generating}
              disabled={confirmedEvidence.length === 0}
            >
              {generating ? '生成中...' : '重新生成'}
            </Button>
            <Button
              variant="ghost"
              leftIcon={<History className="w-4 h-4" />}
              onClick={() => setShowHistory(!showHistory)}
              disabled={versions.length === 0}
            >
              版本历史 ({versions.length})
            </Button>
            <Button
              variant="primary"
              leftIcon={<Save className="w-4 h-4" />}
              onClick={handleSave}
              disabled={!content.trim()}
            >
              保存修改
            </Button>
            <Button
              variant="accent"
              rightIcon={<ChevronRight className="w-4 h-4" />}
              onClick={() => navigate('/project/' + projectId + '/export')}
            >
              下一步：材料导出
            </Button>
          </div>
        </div>

        {(!currentSummary || content.length === 0) && !generating && (
          <Card className="mb-8 bg-gradient-to-r from-primary-50 to-accent-50 border-primary-200">
            <Card.Body className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center">
                <FileText className="w-10 h-10 text-primary-700" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">生成申诉摘要</h3>
              <p className="text-slate-600 mb-6 max-w-lg mx-auto">
                系统将基于已确认的 {confirmedEvidence.length} 条证据自动生成结构化的申诉文档，
                包含订单信息、事实陈述、证据清单和申诉请求。生成后您可以自由编辑。
              </p>
              {confirmedEvidence.length === 0 ? (
                <div className="inline-flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                  请先在智能识别页面确认证据
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  leftIcon={<Zap className="w-5 h-5" />}
                  onClick={handleGenerate}
                  loading={generating}
                >
                  生成申诉摘要
                </Button>
              )}
            </Card.Body>
          </Card>
        )}

        {generating && (
          <Card className="mb-8">
            <Card.Body className="py-12">
              <div className="flex items-center justify-center gap-4">
                <RefreshCw className="w-8 h-8 text-primary-600 animate-spin" />
                <div>
                  <h3 className="font-semibold text-slate-800">正在生成申诉摘要...</h3>
                  <p className="text-sm text-slate-500 mt-1">正在整理证据、脱敏隐私信息、生成结构化文档</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        )}

        {content && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <Card.Header>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-5 h-5 text-primary-600" />
                      <h2 className="font-semibold text-slate-800">编辑摘要内容</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowPreview(!showPreview)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
                          showPreview
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        )}
                      >
                        {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showPreview ? '关闭预览' : '预览'}
                      </button>
                    </div>
                  </div>
                </Card.Header>
                <Card.Body className="p-0">
                  {showPreview ? (
                    <div
                      className="p-6 min-h-[500px] prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: previewContent }}
                    />
                  ) : (
                    <div className="flex flex-col">
                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full min-h-[450px] p-6 font-mono text-sm text-slate-700 leading-relaxed resize-none focus:outline-none border-0 focus:ring-0"
                        placeholder="在此编辑申诉摘要内容..."
                        spellCheck={false}
                      />
                      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            placeholder="本次修改说明（如：补充了物流延误说明）"
                            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                          <span className="text-xs text-slate-400">
                            字数：{content.length} 字
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <Card.Header>
                  <h2 className="font-semibold text-slate-800">摘要信息</h2>
                </Card.Header>
                <Card.Body className="space-y-4">
                  {currentProject && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                        <Hash className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500">订单号</p>
                          <p className="text-sm font-medium text-slate-800">{currentProject.orderNo}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                        <User className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500">客户</p>
                          <p className="text-sm font-medium text-slate-800">{currentProject.customerName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500">下单时间</p>
                          <p className="text-sm font-medium text-slate-800">
                            {format(new Date(currentProject.orderTime), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100">
                    <h3 className="text-xs font-medium text-slate-500 mb-2">已确认证据</h3>
                    <div className="space-y-2">
                      {confirmedEvidence.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-slate-700 truncate">{item.content}</span>
                      </div>
                    ))}
                    {confirmedEvidence.length > 5 && (
                      <p className="text-xs text-slate-400 pl-6">
                        还有 {confirmedEvidence.length - 5} 条证据...
                      </p>
                    )}
                    </div>
                  </div>
                </Card.Body>
              </Card>

              <Card>
                <Card.Header>
                  <h2 className="font-semibold text-slate-800">脱敏处理</h2>
                </Card.Header>
                <Card.Body className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-700">手机号自动脱敏</span>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-700">身份证自动脱敏</span>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-700">地址部分脱敏</span>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-xs text-slate-500 pt-2">
                      导出时自动脱敏，原文保留在系统中
                    </p>
                  </Card.Body>
              </Card>

              {showHistory && versions.length > 0 && (
                <Card>
                  <Card.Header>
                    <h2 className="font-semibold text-slate-800">版本历史</h2>
                  </Card.Header>
                  <Card.Body className="max-h-[300px] overflow-y-auto">
                    <div className="space-y-3">
                      {versions.map((version, index) => (
                        <div
                          key={version.id}
                          className={cn(
                            "p-3 rounded-lg border transition-all",
                            index === 0
                              ? "bg-primary-50 border-primary-200"
                              : "bg-slate-50 border-slate-200 hover:bg-slate-100 cursor-pointer"
                          )}
                          onClick={() => index !== 0 && handleRestoreVersion(version)}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-800">
                                {version.versionNote}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                {format(new Date(version.createdAt), 'MM-dd HH:mm', { locale: zhCN })}
                              </p>
                            </div>
                            {index === 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-xs font-medium">
                                当前
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card.Body>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
