import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Download,
  FileText,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  History,
  FileDown,
  ShieldCheck,
  Check,
  User,
  Briefcase,
  Calendar,
  Hash,
  Eye,
} from 'lucide-react';
import { useInterviewStore } from '@/store';
import { getRiskLevel, getRiskColor, getRiskLabel } from '@/utils/analysis';
import {
  exportInterviewerSuggestions,
  exportArchivedVersion,
  downloadAsFile,
} from '@/utils/export';
import { ANNOTATION_TYPE_LABELS, ANNOTATION_TYPE_COLORS } from '@/types';
import type { RevisionRecord } from '@/types';

export default function ConfirmPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const records = useInterviewStore(s => s.records);
  const updateRecord = useInterviewStore(s => s.updateRecord);
  const setCurrentRecord = useInterviewStore(s => s.setCurrentRecord);
  const [isExporting, setIsExporting] = useState(false);

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
  const sortedRevisions = [...record.revisions].sort((a, b) => b.timestamp - a.timestamp);

  const stats = {
    evidence: record.annotations.filter(a => a.type === 'evidence').length,
    no_evidence: record.annotations.filter(a => a.type === 'no_evidence').length,
    bias: record.annotations.filter(a => a.type === 'bias').length,
    manual: record.annotations.filter(a => a.isManual).length,
  };

  const safeName = (record.candidateName || '候选人').replace(/[^\w\u4e00-\u9fa5]/g, '_');

  const handleExportSuggestions = () => {
    setIsExporting(true);
    const content = exportInterviewerSuggestions(record);
    setTimeout(() => {
      downloadAsFile(content, `面试改进建议_${safeName}_${record.interviewDate}.md`);
      setIsExporting(false);
      updateRecord(record.id, { status: 'exported' });
    }, 400);
  };

  const handleExportArchived = () => {
    setIsExporting(true);
    const content = exportArchivedVersion(record);
    setTimeout(() => {
      downloadAsFile(content, `面试纪要_留档版_${safeName}_${record.interviewDate}.md`);
      setIsExporting(false);
      updateRecord(record.id, { status: 'exported' });
    }, 400);
  };

  const handleExportBoth = () => {
    handleExportSuggestions();
    setTimeout(() => handleExportArchived(), 300);
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6 opacity-0 animate-fade-in">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/analyze/${record.id}`)} className="btn-ghost !p-2 -ml-2">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display text-3xl font-semibold text-brand-950 leading-tight">
                审核确认 & 导出
              </h1>
              <p className="text-sm text-neutral-500 mt-0.5">
                请确认标注结果无误后，导出改进建议给面试官
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 ${getRiskColor(riskLevel)} shadow-soft`}>
              <Sparkles size={16} />
              风险评分 {record.riskScore}/100 · {getRiskLabel(riskLevel)}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-6">
          {[
            { label: '有证据判断', value: stats.evidence, color: 'evidence', icon: CheckCircle2 },
            { label: '缺证据结论', value: stats.no_evidence, color: 'noevidence', icon: AlertTriangle },
            { label: '偏见表述', value: stats.bias, color: 'bias', icon: MessageSquare },
            { label: '人工修正', value: stats.manual, color: 'brand-700', icon: ShieldCheck },
          ].map((item, idx) => {
            const Icon = item.icon;
            const colors = ANNOTATION_TYPE_COLORS[item.color as keyof typeof ANNOTATION_TYPE_COLORS] ||
              { light: 'bg-brand-100', text: 'text-brand-700', border: 'border-brand-500', bg: 'bg-brand-700' };
            return (
              <div
                key={idx}
                className={`glass-card p-5 opacity-0 animate-slide-up stagger-${idx + 1}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${colors.light} flex items-center justify-center`}>
                    <Icon size={20} className={colors.text} strokeWidth={2.2} />
                  </div>
                  <span className={`text-3xl font-bold font-display ${colors.text}`}>{item.value}</span>
                </div>
                <p className="text-sm font-medium text-neutral-600">{item.label}</p>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <div className="glass-card p-6 opacity-0 animate-slide-up stagger-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                  <User size={16} className="text-brand-700" />
                </div>
                <h2 className="font-display text-xl font-semibold text-brand-900">候选人信息</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl bg-white/70 border border-neutral-200 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
                    <User size={12} /> 候选人
                  </div>
                  <p className="font-semibold text-neutral-800">{record.candidateName || '-'}</p>
                </div>
                <div className="rounded-xl bg-white/70 border border-neutral-200 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
                    <Briefcase size={12} /> 岗位
                  </div>
                  <p className="font-semibold text-neutral-800 truncate">{record.position || '-'}</p>
                </div>
                <div className="rounded-xl bg-white/70 border border-neutral-200 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
                    <Hash size={12} /> 轮次
                  </div>
                  <p className="font-semibold text-neutral-800">第{record.round}轮</p>
                </div>
                <div className="rounded-xl bg-white/70 border border-neutral-200 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
                    <Calendar size={12} /> 日期
                  </div>
                  <p className="font-semibold text-neutral-800">{record.interviewDate}</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 opacity-0 animate-slide-up stagger-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                    <History size={16} className="text-brand-700" />
                  </div>
                  <h2 className="font-display text-xl font-semibold text-brand-900">修正记录时间线</h2>
                </div>
                <span className="chip bg-neutral-100 text-neutral-600">
                  {sortedRevisions.length} 条修改
                </span>
              </div>

              {sortedRevisions.length === 0 ? (
                <div className="text-center py-10 text-neutral-400">
                  <Check size={36} className="mx-auto mb-2 text-evidence opacity-50" strokeWidth={1.5} />
                  <p className="text-sm">暂无人工修改，系统标注结果完整</p>
                </div>
              ) : (
                <div className="relative pl-6">
                  <div className="absolute left-2 top-1 bottom-1 w-px bg-neutral-200" />
                  <div className="space-y-4">
                    {sortedRevisions.map((rev, idx) => (
                      <RevisionItem key={rev.id} revision={rev} index={idx} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="glass-card p-6 opacity-0 animate-slide-up stagger-7">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-followup-light flex items-center justify-center">
                    <FileText size={16} className="text-followup-dark" />
                  </div>
                  <h2 className="font-display text-xl font-semibold text-brand-900">下一轮追问建议</h2>
                </div>
                <span className="chip bg-followup-light text-followup-dark">
                  {record.followUpQuestions.length} 条
                </span>
              </div>

              <div className="space-y-2.5">
                {record.followUpQuestions.slice(0, 8).map((q, idx) => (
                  <div
                    key={q.id}
                    className="rounded-xl bg-white/70 border border-neutral-200 p-3.5 hover:border-followup/30 hover:bg-white transition-all"
                    style={{ animationDelay: `${idx * 0.03}s` }}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-followup-light text-followup-dark flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-700 leading-relaxed">{q.question}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className={`chip ${
                            q.priority === 'high' ? 'bg-bias-light text-bias' :
                            q.priority === 'medium' ? 'bg-noevidence-light text-noevidence-dark' :
                            'bg-evidence-light text-evidence-dark'
                          }`}>
                            {q.priority === 'high' ? '高优先级' : q.priority === 'medium' ? '中优先级' : '低优先级'}
                          </span>
                          {q.isCustom && (
                            <span className="chip bg-brand-50 text-brand-700 border border-brand-100">
                              自定义
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {record.followUpQuestions.length > 8 && (
                  <p className="text-center text-xs text-neutral-400 pt-2">
                    还有 {record.followUpQuestions.length - 8} 条追问建议，完整内容见导出文件
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-6 opacity-0 animate-slide-up stagger-5 sticky top-20">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                  <Download size={16} className="text-brand-700" />
                </div>
                <h2 className="font-display text-xl font-semibold text-brand-900">导出文档</h2>
              </div>

              <div className="space-y-3 mb-6">
                <button
                  onClick={handleExportSuggestions}
                  disabled={isExporting}
                  className="w-full group rounded-xl border border-neutral-200 bg-white p-4 hover:border-brand-400 hover:shadow-soft transition-all text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center shadow-soft group-hover:scale-105 transition-transform">
                      <Eye size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-neutral-800 mb-0.5">面试官改进建议</h3>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        精简版，含质量概览、证据/偏见分析、下一轮追问。可直接发给面试官参考
                      </p>
                    </div>
                    <FileDown size={18} className="text-neutral-400 group-hover:text-brand-600 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                </button>

                <button
                  onClick={handleExportArchived}
                  disabled={isExporting}
                  className="w-full group rounded-xl border border-neutral-200 bg-white p-4 hover:border-brand-400 hover:shadow-soft transition-all text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neutral-600 to-neutral-800 text-white flex items-center justify-center shadow-soft group-hover:scale-105 transition-transform">
                      <FileText size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-neutral-800 mb-0.5">完整留档版</h3>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        含原始纪要、所有标注详情、原句位置、人工修正记录，用于内部归档留存
                      </p>
                    </div>
                    <FileDown size={18} className="text-neutral-400 group-hover:text-brand-600 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                </button>
              </div>

              <button
                onClick={handleExportBoth}
                disabled={isExporting}
                className="btn-primary w-full py-3.5 text-base"
              >
                {isExporting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25"/>
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.75"/>
                    </svg>
                    正在导出...
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    确认并导出全部文档
                    <Download size={18} />
                  </>
                )}
              </button>

              <p className="text-xs text-neutral-400 text-center mt-4 leading-relaxed">
                下载为 Markdown 格式，可用 Typora / VS Code 等工具打开
                <br />或直接复制内容发送给面试官
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RevisionItem({ revision, index }: { revision: RevisionRecord; index: number }) {
  const actionConfig = {
    add: { label: '新增标注', color: 'bg-evidence-light text-evidence-dark', border: 'border-evidence' },
    modify: { label: '修改标注', color: 'bg-followup-light text-followup-dark', border: 'border-followup' },
    delete: { label: '删除标注', color: 'bg-bias-light text-bias', border: 'border-bias' },
  }[revision.action];

  return (
    <div className="relative opacity-0 animate-slide-up" style={{ animationDelay: `${index * 0.04}s` }}>
      <div className={`absolute -left-[18px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white ${actionConfig.border} ${actionConfig.color.split(' ')[0]}`} />
      <div className={`rounded-xl border border-neutral-200 bg-white/70 p-3`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`chip ${actionConfig.color}`}>
            {revision.operator === 'user' ? '👤 ' : '🤖 '}{actionConfig.label}
          </span>
          <span className="text-[11px] text-neutral-400">
            {new Date(revision.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
        {revision.oldValue?.text && (
          <p className="text-xs text-neutral-500 mb-1">
            <span className="text-neutral-400">修改前：</span>
            <span className="line-through">{revision.oldValue.text.slice(0, 50)}</span>
          </p>
        )}
        {revision.newValue?.text && (
          <p className="text-xs text-neutral-700">
            <span className="text-neutral-400">{revision.action === 'add' ? '新增内容：' : '修改后：'}</span>
            <span className="font-medium">{revision.newValue.text.slice(0, 60)}</span>
          </p>
        )}
      </div>
    </div>
  );
}
