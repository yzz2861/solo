import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Users, UserCheck, XCircle, Sparkles } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { parsePlainText, parseCSV, parsedLinesToFeedback } from '@/utils/io';
import type { FeedbackSource } from '@/types';
import type { ParsedLine } from '@/utils/io';
import { cn } from '@/lib/utils';
import { multiLabelClassify } from '@/utils/clustering';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
}

type Tab = 'text' | 'file';
type PreviewSource = FeedbackSource | 'auto';

const SOURCE_OPTIONS: { value: PreviewSource; label: string; icon: any; hint: string }[] = [
  { value: 'auto', label: '自动识别', icon: Sparkles, hint: '根据前缀 S:/TA:/W: 自动区分' },
  { value: 'student', label: '学生反馈', icon: Users, hint: 'S: 开头的内容归为学生' },
  { value: 'ta', label: '助教批注', icon: UserCheck, hint: 'TA: 开头的内容归为助教' },
  { value: 'wrong_answer', label: '错题说明', icon: XCircle, hint: 'W: 开头的内容归为错题' },
];

export function ImportModal({ open, onClose }: ImportModalProps) {
  const batchAdd = useAppStore(s => s.batchAddFeedback);
  const [tab, setTab] = useState<Tab>('text');
  const [text, setText] = useState('');
  const [source, setSource] = useState<PreviewSource>('auto');
  const [homework, setHomework] = useState('HW3');
  const [preview, setPreview] = useState<ParsedLine[]>([]);
  const [importing, setImporting] = useState(false);
  const [success, setSuccess] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const SAMPLE_TEXT = `# 学生反馈
S: 拉普拉斯变换的定义不理解，公式也经常套错
S: 题目表述不清楚，看不懂在问什么
S: MATLAB画伯德图报错，不会用工具

# 助教批注
TA: 概念理解有偏差，建议回顾定义
TA: 解题步骤跳太多，缺少中间推导

# 错题说明
W: 第2题全班50%做错，主要是公式记错了`;

  const analyzeText = (content: string, defaultSource: PreviewSource) => {
    if (!content.trim()) { setPreview([]); return; }
    let lines = parsePlainText(content);
    if (defaultSource !== 'auto') {
      lines = lines.map(l => ({ ...l, source: defaultSource as FeedbackSource }));
    }
    setPreview(lines);
  };

  const handleTextChange = (v: string) => {
    setText(v);
    analyzeText(v, source);
  };

  const handleFile = async (file: File) => {
    const content = await file.text();
    const ext = file.name.toLowerCase().split('.').pop();
    let lines: ParsedLine[];
    if (ext === 'csv') {
      lines = parseCSV(content);
    } else {
      lines = parsePlainText(content);
    }
    if (source !== 'auto') {
      lines = lines.map(l => ({ ...l, source: source as FeedbackSource }));
    }
    setText(content);
    setPreview(lines);
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setImporting(true);
    try {
      const result = await batchAdd(preview, homework || undefined);
      setSuccess(result.total);
      setTimeout(() => {
        setSuccess(null);
        setText('');
        setPreview([]);
        onClose();
      }, 1200);
    } finally {
      setImporting(false);
    }
  };

  if (!open) return null;

  const sourceCounts = preview.reduce((acc, p) => {
    acc[p.source] = (acc[p.source] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalWithTags = preview.filter(p => multiLabelClassify(p.content).length > 0).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-brand-950/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl max-h-[85vh] bg-white rounded-3xl shadow-hover flex flex-col overflow-hidden animate-fade-in-up">
        <div className="px-7 py-5 border-b border-brand-100 flex items-center justify-between bg-gradient-to-r from-brand-600 to-brand-500 text-white">
          <div>
            <h2 className="font-serif text-xl font-bold flex items-center gap-2">
              <Upload className="w-5 h-5" />
              导入作业反馈
            </h2>
            <p className="text-sm text-white/80 mt-0.5">
              支持纯文本粘贴或 CSV 文件上传，系统会自动进行多标签聚类
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl hover:bg-white/15 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="flex gap-2 p-1 rounded-xl bg-paper-50 w-fit">
            <button
              onClick={() => setTab('text')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                tab === 'text' ? 'bg-white text-brand-700 shadow-soft' : 'text-brand-500 hover:text-brand-700'
              )}
            >
              <FileText className="w-4 h-4" /> 粘贴文本
            </button>
            <button
              onClick={() => setTab('file')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                tab === 'file' ? 'bg-white text-brand-700 shadow-soft' : 'text-brand-500 hover:text-brand-700'
              )}
            >
              <Upload className="w-4 h-4" /> 上传文件
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {SOURCE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setSource(opt.value); analyzeText(text, opt.value); }}
                className={cn(
                  'p-3 rounded-xl text-left transition-all border-2',
                  source === opt.value
                    ? 'bg-brand-50 border-brand-400 shadow-soft'
                    : 'bg-white border-brand-100 hover:border-brand-200'
                )}
              >
                <opt.icon className={cn(
                  'w-5 h-5 mb-2',
                  source === opt.value ? 'text-brand-600' : 'text-brand-400'
                )} />
                <div className={cn(
                  'text-sm font-semibold',
                  source === opt.value ? 'text-brand-700' : 'text-brand-600'
                )}>
                  {opt.label}
                </div>
                <div className="text-[10px] text-brand-400 mt-1 line-clamp-2">
                  {opt.hint}
                </div>
              </button>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium text-brand-700 mb-2 block">作业编号（可选）</label>
            <input
              value={homework}
              onChange={e => setHomework(e.target.value)}
              placeholder="如 HW3、第三章作业"
              className="input max-w-xs"
            />
          </div>

          {tab === 'text' ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-brand-700">反馈内容</label>
                <button
                  onClick={() => handleTextChange(SAMPLE_TEXT)}
                  className="text-xs text-brand-500 hover:text-brand-700 underline underline-offset-2"
                >
                  填入示例数据
                </button>
              </div>
              <textarea
                value={text}
                onChange={e => handleTextChange(e.target.value)}
                placeholder={`每行一条，可用前缀区分来源：
S: 学生反馈内容
TA: 助教批注内容
W: 错题统计说明

或选择上方"自动识别"以外的选项统一归类`}
                rows={10}
                className="textarea font-mono text-xs leading-relaxed"
              />
            </div>
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-brand-200 rounded-2xl p-10 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/50 transition-all"
            >
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.csv"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
              />
              <Upload className="w-12 h-12 text-brand-300 mx-auto mb-3" />
              <p className="font-medium text-brand-700">点击或拖拽文件到此处</p>
              <p className="text-sm text-brand-400 mt-1">支持 .txt 纯文本 或 .csv 格式</p>
              <p className="text-xs text-brand-300 mt-3">
                CSV 列：content(必填) | source | author | homework
              </p>
            </div>
          )}

          {preview.length > 0 && (
            <div className="rounded-2xl border border-brand-100 overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-paper-50 to-white border-b border-brand-100 flex items-center justify-between">
                <div className="font-medium text-brand-700 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  预览解析结果
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="badge bg-brand-50 text-brand-600 border-brand-100">
                    共 {preview.length} 条
                  </span>
                  {Object.entries(sourceCounts).map(([k, v]) => (
                    <span key={k} className="badge bg-white text-brand-500 border-brand-100">
                      {k === 'student' ? '学生' : k === 'ta' ? '助教' : '错题'}: {String(v)}
                    </span>
                  ))}
                  <span className="badge bg-emerald-50 text-emerald-600 border-emerald-100">
                    {totalWithTags} 条可识别主题
                  </span>
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto divide-y divide-brand-50">
                {preview.slice(0, 30).map((p, i) => (
                  <div key={i} className="px-4 py-2.5 hover:bg-paper-50/50 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-md bg-brand-50 text-brand-500 text-[10px] font-mono flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-brand-700 line-clamp-1">{p.content}</p>
                      <p className="text-[11px] text-brand-400 mt-0.5">
                        {p.source === 'student' ? '学生反馈' : p.source === 'ta' ? '助教批注' : '错题说明'}
                        {p.author && ` · ${p.author}`}
                      </p>
                    </div>
                  </div>
                ))}
                {preview.length > 30 && (
                  <div className="px-4 py-2.5 text-center text-xs text-brand-400 bg-paper-50/50">
                    还有 {preview.length - 30} 条未显示...
                  </div>
                )}
              </div>
            </div>
          )}

          {success !== null && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 text-sm flex items-center gap-2 animate-fade-in">
              <Sparkles className="w-5 h-5" />
              成功导入 {success} 条反馈！正在自动聚类分析...
            </div>
          )}
        </div>

        <div className="px-7 py-4 border-t border-brand-100 flex items-center justify-between bg-paper-50/50">
          <p className="text-xs text-brand-400">
            💡 同一条反馈中多个问题将自动归入多个主题（多标签分类）
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost">
              取消
            </button>
            <button
              onClick={handleImport}
              disabled={preview.length === 0 || importing || success !== null}
              className="btn-primary"
            >
              <Upload className="w-4 h-4" />
              {importing ? '正在导入...' : success !== null ? '完成 ✓' : `导入 ${preview.length || ''} 条`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
