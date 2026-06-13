import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  AlertTriangle,
  MessageSquare,
  CheckCircle2,
  Sparkles,
  Clock,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { useInterviewStore } from '@/store';
import { analyzeInterview, splitIntoParagraphs, getRiskLevel, getRiskColor, getRiskLabel } from '@/utils/analysis';
import { getSampleInterviewContent } from '@/store/mockData';

export default function ImportPage() {
  const navigate = useNavigate();
  const records = useInterviewStore(s => s.records);
  const createRecord = useInterviewStore(s => s.createRecord);
  const updateRecord = useInterviewStore(s => s.updateRecord);
  const setAnnotations = useInterviewStore(s => s.setAnnotations);
  const setFollowUps = useInterviewStore(s => s.setFollowUps);
  const setCurrentRecord = useInterviewStore(s => s.setCurrentRecord);

  const [form, setForm] = useState({
    candidateName: '',
    position: '',
    round: 1,
    interviewerAlias: '',
    interviewDate: new Date().toISOString().split('T')[0],
    content: '',
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setForm(prev => ({ ...prev, content: text }));
    };
    reader.readAsText(file);
  };

  const loadSampleData = () => {
    setForm({
      candidateName: '张明远',
      position: '高级后端工程师',
      round: 2,
      interviewerAlias: '李工',
      interviewDate: '2026-06-10',
      content: getSampleInterviewContent(),
    });
  };

  const handleAnalyze = async () => {
    if (!form.content.trim()) return;

    setIsAnalyzing(true);

    await new Promise(resolve => setTimeout(resolve, 800));

    const paragraphs = splitIntoParagraphs(form.content);
    const newRecord = createRecord({
      ...form,
      paragraphs,
    });

    const result = analyzeInterview(form.content, form.candidateName, form.position);

    setAnnotations(newRecord.id, result.annotations);
    setFollowUps(newRecord.id, result.followUpQuestions);
    updateRecord(newRecord.id, {
      riskScore: result.riskScore,
      status: 'analyzed',
    });
    setCurrentRecord(newRecord.id);

    setIsAnalyzing(false);
    navigate(`/analyze/${newRecord.id}`);
  };

  const handleContinueRecord = (id: string) => {
    setCurrentRecord(id);
    navigate(`/analyze/${id}`);
  };

  const handleDeleteRecord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这条纪要吗？')) {
      const newRecords = records.filter(r => r.id !== id);
      useInterviewStore.setState({ records: newRecords });
      localStorage.setItem('interview-bias-assistant-records', JSON.stringify(newRecords));
    }
  };

  const featureCards = [
    { icon: CheckCircle2, color: 'text-evidence', bg: 'bg-evidence-light', title: '有证据判断', desc: '识别符合STAR法则的行为证据' },
    { icon: AlertTriangle, color: 'text-noevidence-dark', bg: 'bg-noevidence-light', title: '缺证据结论', desc: '标出主观感受、模糊评价等' },
    { icon: MessageSquare, color: 'text-bias', bg: 'bg-bias-light', title: '偏见表述', desc: '检测性别、年龄、地域等偏见' },
    { icon: Sparkles, color: 'text-followup-dark', bg: 'bg-followup-light', title: '追问建议', desc: '自动生成下一轮应追问的问题' },
  ];

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="text-center mb-10 lg:mb-14 opacity-0 animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 border border-brand-100 px-3.5 py-1.5 mb-5 shadow-soft">
            <Sparkles size={14} className="text-brand-600" />
            <span className="text-xs font-medium text-brand-700">智能分析 · STAR法则 · 降低招聘偏差</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-brand-950 mb-4 leading-tight">
            让每一句面试评价
            <br />
            <span className="bg-gradient-to-r from-brand-600 via-brand-700 to-evidence-dark bg-clip-text text-transparent">
              都有行为证据支撑
            </span>
          </h1>
          <p className="text-neutral-600 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
            导入面试纪要后，自动标出有证据的能力判断、缺证据的主观结论、
            可能的偏见表述，并生成下一轮追问建议。帮助招聘团队提升面试评估的客观性。
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10 lg:mb-14">
          {featureCards.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div
                key={i}
                className={`glass-card p-4 md:p-5 opacity-0 animate-slide-up stagger-${i + 1}`}
              >
                <div className={`w-10 h-10 rounded-xl ${feat.bg} flex items-center justify-center mb-3`}>
                  <Icon size={20} className={feat.color} strokeWidth={2.2} />
                </div>
                <h3 className="font-semibold text-neutral-800 text-sm md:text-base mb-1">{feat.title}</h3>
                <p className="text-xs md:text-sm text-neutral-500 leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
          <div className="lg:col-span-3 opacity-0 animate-slide-up stagger-5">
            <div className="glass-card p-6 lg:p-7">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                    <FileText size={16} className="text-brand-700" />
                  </div>
                  <h2 className="font-display text-xl font-semibold text-brand-900">导入面试纪要</h2>
                </div>
                <button
                  onClick={loadSampleData}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-100 hover:bg-brand-100 transition-colors"
                >
                  📋 加载示例数据
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">候选人姓名</label>
                  <input
                    type="text"
                    className="input-base"
                    placeholder="如：张明远"
                    value={form.candidateName}
                    onChange={e => setForm(prev => ({ ...prev, candidateName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">应聘岗位</label>
                  <input
                    type="text"
                    className="input-base"
                    placeholder="如：高级后端工程师"
                    value={form.position}
                    onChange={e => setForm(prev => ({ ...prev, position: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">面试轮次</label>
                  <select
                    className="input-base"
                    value={form.round}
                    onChange={e => setForm(prev => ({ ...prev, round: Number(e.target.value) }))}
                  >
                    {[1, 2, 3, 4, 5].map(n => (
                      <option key={n} value={n}>第{n}轮</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">面试官</label>
                  <input
                    type="text"
                    className="input-base"
                    placeholder="如：李工 / 王总"
                    value={form.interviewerAlias}
                    onChange={e => setForm(prev => ({ ...prev, interviewerAlias: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">面试日期</label>
                  <input
                    type="date"
                    className="input-base"
                    value={form.interviewDate}
                    onChange={e => setForm(prev => ({ ...prev, interviewDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-neutral-700">面试纪要内容</label>
                  <span className="text-xs text-neutral-400">{form.content.length} 字</span>
                </div>
                <textarea
                  rows={10}
                  className="input-base resize-none scrollbar-thin leading-relaxed"
                  placeholder="粘贴面试纪要内容...&#10;&#10;支持分段撰写，系统会自动识别：&#10;✅ 有行为证据的判断&#10;⚠️ 缺少证据的主观结论&#10;🚨 可能存在偏见的表述&#10;❓ 下一轮应追问的问题"
                  value={form.content}
                  onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
                />
              </div>

              <div
                className={`mb-5 border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-200 cursor-pointer ${
                  dragOver
                    ? 'border-brand-400 bg-brand-50'
                    : 'border-neutral-200 bg-neutral-50/50 hover:border-brand-300 hover:bg-brand-50/30'
                }`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file && (file.name.endsWith('.txt') || file.name.endsWith('.md'))) {
                    handleFileUpload(file);
                  }
                }}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.txt,.md';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleFileUpload(file);
                  };
                  input.click();
                }}
              >
                <Upload size={24} className="mx-auto mb-2 text-neutral-400" strokeWidth={1.8} />
                <p className="text-sm text-neutral-600 mb-1">点击或拖拽文件到此处</p>
                <p className="text-xs text-neutral-400">支持 .txt / .md 格式</p>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!form.content.trim() || isAnalyzing}
                className="btn-primary w-full py-3 text-base"
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25"/>
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.75"/>
                    </svg>
                    正在智能分析中...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    开始智能分析
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 opacity-0 animate-slide-up stagger-6">
            <div className="glass-card p-6 lg:p-7 h-full">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                    <Clock size={16} className="text-brand-700" />
                  </div>
                  <h2 className="font-display text-xl font-semibold text-brand-900">历史纪要</h2>
                </div>
                <span className="chip bg-neutral-100 text-neutral-600">
                  {records.length} 条
                </span>
              </div>

              {records.length === 0 ? (
                <div className="text-center py-12 text-neutral-400">
                  <FileText size={40} className="mx-auto mb-3 opacity-50" strokeWidth={1.5} />
                  <p className="text-sm">暂无历史纪要</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin pr-1 -mr-1">
                  {records
                    .sort((a, b) => b.updatedAt - a.updatedAt)
                    .map((rec, idx) => {
                      const riskLevel = getRiskLevel(rec.riskScore);
                      return (
                        <div
                          key={rec.id}
                          onClick={() => handleContinueRecord(rec.id)}
                          className="group relative rounded-xl border border-neutral-200 bg-white/80 p-4 hover:border-brand-300 hover:bg-white hover:shadow-soft transition-all duration-200 cursor-pointer"
                          style={{ animationDelay: `${idx * 0.04}s` }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1.5">
                                <h3 className="font-semibold text-neutral-800 truncate">
                                  {rec.candidateName || '未命名候选人'}
                                </h3>
                                <span className={`chip ${getRiskColor(riskLevel)}`}>
                                  {getRiskLabel(riskLevel)}
                                </span>
                              </div>
                              <p className="text-xs text-neutral-500 mb-2">
                                {rec.position || '未填岗位'} · 第{rec.round}轮 · {rec.interviewerAlias || '未填面试官'}
                              </p>
                              <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                                {rec.paragraphs[0]?.slice(0, 60) || '暂无内容'}...
                              </p>
                            </div>
                            <button
                              onClick={(e) => handleDeleteRecord(rec.id, e)}
                              className="p-1.5 rounded-lg text-neutral-300 hover:text-bias hover:bg-bias-light opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex gap-1.5">
                              <span className="chip bg-evidence-light text-evidence-dark">
                                {rec.annotations.filter(a => a.type === 'evidence').length}
                              </span>
                              <span className="chip bg-noevidence-light text-noevidence-dark">
                                {rec.annotations.filter(a => a.type === 'no_evidence').length}
                              </span>
                              <span className="chip bg-bias-light text-bias">
                                {rec.annotations.filter(a => a.type === 'bias').length}
                              </span>
                            </div>
                            <span className="text-[11px] text-neutral-400">
                              {new Date(rec.updatedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
