import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  RotateCcw,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  User,
  Briefcase,
  Calendar,
  Hash,
} from 'lucide-react';
import { useInterviewStore } from '@/store';
import { HighlightedContent } from '@/components/annotation/HighlightedContent';
import { AnnotationList } from '@/components/annotation/AnnotationList';
import { FollowUpPanel } from '@/components/annotation/FollowUpPanel';
import {
  analyzeInterview,
  splitIntoParagraphs,
  getRiskLevel,
  getRiskColor,
  getRiskLabel,
} from '@/utils/analysis';
import { ANNOTATION_TYPE_COLORS, ANNOTATION_TYPE_LABELS } from '@/types';
import type { Annotation, AnnotationType, FollowUpQuestion } from '@/types';
import { generateId } from '@/utils/analysis/textProcessor';

export default function AnalyzePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const records = useInterviewStore(s => s.records);
  const updateRecord = useInterviewStore(s => s.updateRecord);
  const addAnnotation = useInterviewStore(s => s.addAnnotation);
  const updateAnnotation = useInterviewStore(s => s.updateAnnotation);
  const deleteAnnotation = useInterviewStore(s => s.deleteAnnotation);
  const setAnnotations = useInterviewStore(s => s.setAnnotations);
  const addFollowUp = useInterviewStore(s => s.addFollowUp);
  const updateFollowUp = useInterviewStore(s => s.updateFollowUp);
  const deleteFollowUp = useInterviewStore(s => s.deleteFollowUp);
  const setFollowUps = useInterviewStore(s => s.setFollowUps);
  const addRevision = useInterviewStore(s => s.addRevision);
  const setCurrentRecord = useInterviewStore(s => s.setCurrentRecord);

  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  const record = useMemo(() => {
    const r = records.find(rec => rec.id === id);
    if (r) setCurrentRecord(r.id);
    return r || null;
  }, [records, id, setCurrentRecord]);

  if (!record) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-neutral-500 mb-4">未找到该面试记录</p>
          <button onClick={() => navigate('/')} className="btn-primary">返回首页</button>
        </div>
      </div>
    );
  }

  const riskLevel = getRiskLevel(record.riskScore);

  const stats = {
    evidence: record.annotations.filter(a => a.type === 'evidence').length,
    no_evidence: record.annotations.filter(a => a.type === 'no_evidence').length,
    bias: record.annotations.filter(a => a.type === 'bias').length,
  };

  const handleReanalyze = async () => {
    setIsReanalyzing(true);
    await new Promise(r => setTimeout(r, 600));
    const paragraphs = splitIntoParagraphs(record.content);
    const result = analyzeInterview(record.content, record.candidateName, record.position);
    setAnnotations(record.id, result.annotations);
    setFollowUps(record.id, result.followUpQuestions);
    updateRecord(record.id, {
      riskScore: result.riskScore,
      paragraphs,
    });
    setIsReanalyzing(false);
  };

  const handleSelectAnnotation = (annId: string | null) => {
    setSelectedAnnotationId(annId);
  };

  const handleAddAnnotation = (text: string, start: number, end: number, paragraphIndex: number) => {
    const newAnn: Annotation = {
      id: generateId('ann'),
      type: 'no_evidence',
      text,
      start,
      end,
      paragraphIndex,
      reason: '人工添加标注',
      isManual: true,
      createdAt: Date.now(),
    };
    addAnnotation(record.id, newAnn);
    addRevision(record.id, {
      id: generateId('rev'),
      action: 'add',
      annotationId: newAnn.id,
      newValue: { ...newAnn },
      timestamp: Date.now(),
      operator: 'user',
    });
  };

  const handleUpdateAnnotation = (annId: string, updates: Partial<Annotation>) => {
    const existing = record.annotations.find(a => a.id === annId);
    if (existing) {
      addRevision(record.id, {
        id: generateId('rev'),
        action: 'modify',
        annotationId: annId,
        oldValue: { ...existing },
        newValue: updates,
        timestamp: Date.now(),
        operator: 'user',
      });
    }
    updateAnnotation(record.id, annId, updates);
  };

  const handleDeleteAnnotation = (annId: string) => {
    const existing = record.annotations.find(a => a.id === annId);
    if (existing) {
      addRevision(record.id, {
        id: generateId('rev'),
        action: 'delete',
        annotationId: annId,
        oldValue: { ...existing },
        timestamp: Date.now(),
        operator: 'user',
      });
    }
    deleteAnnotation(record.id, annId);
    if (selectedAnnotationId === annId) setSelectedAnnotationId(null);
  };

  const handleAddFollowUp = (q: Omit<FollowUpQuestion, 'id'>) => {
    addFollowUp(record.id, { ...q, id: generateId('fq') });
  };

  const handleResetAnnotations = () => {
    if (!confirm('确定要重置所有标注和追问吗？')) return;
    setAnnotations(record.id, []);
    setFollowUps(record.id, []);
    updateRecord(record.id, { riskScore: 0, revisions: [] });
  };

  const handleConfirmAndExport = () => {
    updateRecord(record.id, { status: 'confirmed' });
    navigate(`/confirm/${record.id}`);
  };

  const legendItems: { type: AnnotationType; icon: typeof CheckCircle2 }[] = [
    { type: 'evidence', icon: CheckCircle2 },
    { type: 'no_evidence', icon: AlertTriangle },
    { type: 'bias', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6">
        <div className="glass-card p-4 lg:p-5 mb-5 opacity-0 animate-fade-in">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
            <div className="flex-1 flex flex-wrap items-center gap-3 lg:gap-5">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-800 text-white flex items-center justify-center font-semibold text-sm shadow-soft">
                  {record.candidateName ? record.candidateName.charAt(0) : '?'}
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold text-brand-900 leading-tight">
                    {record.candidateName || '未命名候选人'}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <Briefcase size={12} />
                    <span>{record.position || '未填岗位'}</span>
                    <span className="text-neutral-300">|</span>
                    <Hash size={12} />
                    <span>第{record.round}轮</span>
                  </div>
                </div>
              </div>

              <div className="h-8 w-px bg-neutral-200 hidden lg:block" />

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-sm text-neutral-600">
                  <User size={14} className="text-neutral-400" />
                  <span>{record.interviewerAlias || '未填面试官'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-neutral-600">
                  <Calendar size={14} className="text-neutral-400" />
                  <span>{record.interviewDate}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/70 border border-neutral-200">
                {legendItems.map(item => {
                  const Icon = item.icon;
                  const colors = ANNOTATION_TYPE_COLORS[item.type];
                  return (
                    <div key={item.type} className="flex items-center gap-1.5">
                      <div className={`w-6 h-6 rounded-lg ${colors.light} flex items-center justify-center`}>
                        <Icon size={12} className={colors.text} strokeWidth={2.5} />
                      </div>
                      <span className="text-xs font-medium text-neutral-600 hidden md:inline">
                        {ANNOTATION_TYPE_LABELS[item.type]}
                      </span>
                      <span className={`text-xs font-bold ${colors.text}`}>
                        {stats[item.type]}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className={`px-3.5 py-2 rounded-xl font-semibold flex items-center gap-2 ${getRiskColor(riskLevel)} shadow-soft`}>
                <Sparkles size={14} />
                风险 {record.riskScore}/100
                <span className="text-[11px] font-medium opacity-80">({getRiskLabel(riskLevel)})</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleReanalyze}
                  disabled={isReanalyzing}
                  className="btn-secondary !px-3 !py-2"
                  title="重新分析"
                >
                  <RefreshCw size={16} className={isReanalyzing ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={handleResetAnnotations}
                  className="btn-ghost !px-3 !py-2"
                  title="重置标注"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid xl:grid-cols-12 gap-5" style={{ height: 'calc(100vh - 240px)', minHeight: '600px' }}>
          <div className="xl:col-span-5 glass-card p-5 lg:p-6 opacity-0 animate-slide-up stagger-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-700">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <h3 className="font-display text-lg font-semibold text-brand-900">原始纪要</h3>
              </div>
              <span className="text-xs text-neutral-400">
                选中文字可手动标注
              </span>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin pr-4 pl-6">
              <HighlightedContent
                paragraphs={record.paragraphs}
                annotations={record.annotations}
                content={record.content}
                selectedAnnotationId={selectedAnnotationId}
                onSelectAnnotation={handleSelectAnnotation}
                onAddAnnotation={handleAddAnnotation}
              />
            </div>

            <div className="mt-4 pt-4 border-t border-neutral-200/60">
              <button
                onClick={handleConfirmAndExport}
                className="btn-primary w-full py-3"
              >
                <CheckCircle2 size={18} />
                审核确认并导出
                <ArrowRight size={18} />
              </button>
            </div>
          </div>

          <div className="xl:col-span-4 glass-card p-5 lg:p-6 opacity-0 animate-slide-up stagger-2 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-noevidence-light flex items-center justify-center">
                  <AlertTriangle size={16} className="text-noevidence-dark" />
                </div>
                <h3 className="font-display text-lg font-semibold text-brand-900">标注列表</h3>
              </div>
            </div>

            <div className="flex-1 overflow-hidden min-h-0">
              <AnnotationList
                annotations={record.annotations}
                selectedId={selectedAnnotationId}
                onSelect={handleSelectAnnotation}
                onUpdate={handleUpdateAnnotation}
                onDelete={handleDeleteAnnotation}
                onAdd={() => {}}
              />
            </div>
          </div>

          <div className="xl:col-span-3 glass-card p-5 lg:p-6 opacity-0 animate-slide-up stagger-3 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-hidden min-h-0">
              <FollowUpPanel
                questions={record.followUpQuestions}
                onAdd={handleAddFollowUp}
                onUpdate={updateFollowUp.bind(null, record.id)}
                onDelete={deleteFollowUp.bind(null, record.id)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
