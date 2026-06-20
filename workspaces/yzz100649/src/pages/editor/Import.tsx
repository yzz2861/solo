import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Field, TextInput, TextArea } from '@/components/common/Field';
import { Tag } from '@/components/common/Tag';
import { readFileAsText } from '@/services/fileIO';
import { useToast } from '@/components/common/Toast';
import { clsx } from 'clsx';
import { SAMPLE_ARTICLE_CONTENT } from '@/mock/sampleArticle';

export default function EditorImport() {
  const nav = useNavigate();
  const init = useAppStore((s) => s.init);
  const importArticle = useAppStore((s) => s.importArticle);
  const importSample = useAppStore((s) => s.importSample);
  const { push } = useToast();

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [source, setSource] = useState('');
  const [content, setContent] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  init();

  const valid = title.trim().length > 0 && content.trim().length > 50;
  const wordCount = content.length;
  const previewAnnotations = (() => {
    const n = content.length;
    if (n === 0) return 0;
    const keywords = [
      '治愈', '根治', 'mg', 'ml', '每日', '每次', '孕妇', '儿童', '禁用',
      '研究表明', '据统计', '推荐', '神药', '可能有效', '张阿姨',
    ];
    let c = 0;
    for (const k of keywords) c += content.split(k).length - 1;
    return Math.max(1, Math.min(50, Math.round(c / 1.2) + Math.floor(n / 400)));
  })();

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    const file = arr[0];
    try {
      const text = await readFileAsText(file);
      setContent((prev) => (prev ? prev + '\n\n' : '') + text);
      if (!title.trim()) {
        setTitle(file.name.replace(/\.(txt|md|docx?)$/i, '').trim() || '未命名稿件');
      }
      push('success', `已导入文件：${file.name}`);
    } catch {
      push('error', '文件读取失败，请重试');
    }
  };

  const loadSample = () => {
    setTitle('高血压日常用药必看：降压药怎么吃才能不踩坑？');
    setAuthor('健康科普编辑部');
    setSource('公众号·健康新知');
    setContent(SAMPLE_ARTICLE_CONTENT);
    push('info', '已加载示例稿件');
  };

  const submit = () => {
    if (!valid) {
      push('warn', '请填写标题和正文内容（至少 50 字）');
      return;
    }
    const article = importArticle({
      title: title.trim(),
      author: author.trim() || undefined,
      source: source.trim() || undefined,
      content,
    });
    push('success', `稿件导入成功，发现 ${article.annotations.length} 项潜在风险`);
    nav(`/editor/annotate/${article.id}`);
  };

  const sample = () => {
    const a = importSample();
    push('success', `已加载示例，发现 ${a.annotations.length} 项风险`);
    nav(`/editor/annotate/${a.id}`);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Tag className="bg-sky-50 text-sky-700 border border-sky-100">
            <FileText className="w-3 h-3" /> 编辑流程 · 步骤 1 / 3
          </Tag>
        </div>
        <h1 className="text-2xl font-semibold text-slate-800 mb-1">导入稿件</h1>
        <p className="text-sm text-slate-500">粘贴或上传医学科普稿，系统将自动检测风险内容。</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-5">
          <Card title="稿件信息">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="稿件标题" required>
                <TextInput
                  placeholder="例如：高血压日常用药必看：降压药怎么吃？"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Field>
              <Field label="作者 / 编辑">
                <TextInput
                  placeholder="编辑署名"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                />
              </Field>
              <Field label="来源" className="md:col-span-2">
                <TextInput
                  placeholder="例如：公众号·健康新知 / 第X期"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                />
              </Field>
            </div>
          </Card>

          <Card
            title="正文内容"
            extra={
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={loadSample} icon={<Sparkles className="w-4 h-4" />}>
                  填充示例
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".txt,.md,.text,text/plain,application/json"
                  multiple={false}
                  className="hidden"
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Upload className="w-4 h-4" />}
                  onClick={() => fileRef.current?.click()}
                >
                  上传文件
                </Button>
              </div>
            }
          >
            <div
              className={clsx(
                'border-2 border-dashed rounded-xl p-4 mb-4 text-center transition-all',
                dragging
                  ? 'border-[#1e3a5f] bg-[#1e3a5f]/5'
                  : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
              }}
            >
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-xs text-slate-500">
                  拖拽文件到此处，或
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="text-[#1e3a5f] underline underline-offset-2 mx-1"
                  >
                    点击上传
                  </button>
                  （.txt / .md）
                </p>
              </div>
            </div>

            <Field required hint={`已输入 ${wordCount.toLocaleString()} 字`}>
              <TextArea
                rows={18}
                placeholder="在此粘贴医学科普稿正文……&#10;&#10;系统会自动识别：&#10;• 治疗效果（治愈、根治、100%有效等绝对化表述）&#10;• 用药剂量（具体 mg/片/每日次数等）&#10;• 适用人群（孕妇、儿童、老年人等）&#10;• 禁忌（禁用、严禁、绝对不能等）&#10;• 数据来源（研究表明、xx%、引用指南等）"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </Field>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => nav('/')}>返回首页</Button>
            <Button onClick={submit} disabled={!valid} iconRight={<CheckCircle2 className="w-4 h-4" />}>
              开始智能标注
            </Button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <Card title="实时检测预览">
            <div className="grid grid-cols-3 gap-2 mb-4">
              <PreviewStat label="预计风险项" value={previewAnnotations} tone="amber" />
              <PreviewStat label="正文长度" value={Math.round(wordCount / 10) * 10} tone="slate" suffix="字" />
              <PreviewStat
                label="段落数"
                value={content.trim() ? content.trim().split(/\n{2,}/).length : 0}
                tone="indigo"
              />
            </div>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <span>治疗效果类：绝对化疗效表述（治愈/根治/100%有效等）</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                <span>用药剂量类：具体剂量与频次数字</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <span>适用人群类：孕妇 / 儿童 / 老年 / 慢病人群</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                <span>禁忌类：禁用 / 严禁 / 绝对不能 等</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                <span>数据来源类：引用 / 百分比 / 指南号</span>
              </li>
            </ul>
          </Card>

          <Card title="操作提示">
            <div className="space-y-3 text-xs text-slate-600">
              <Tip icon={<AlertCircle className="w-4 h-4 text-amber-500" />} title="注意">
                标注结果仅为辅助识别，最终以编辑人工确认为准，再提交给医生审核。
              </Tip>
              <Tip icon={<Sparkles className="w-4 h-4 text-indigo-500" />} title="快速体验">
                点击右侧按钮直接加载示例稿件，快速浏览完整功能流程。
              </Tip>
            </div>
            <div className="mt-4">
              <Button variant="secondary" className="w-full justify-center" onClick={sample} icon={<Sparkles className="w-4 h-4" />}>
                加载示例稿件并开始标注
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PreviewStat({
  label,
  value,
  tone,
  suffix,
}: {
  label: string;
  value: number;
  tone: 'slate' | 'amber' | 'indigo';
  suffix?: string;
}) {
  const tones = {
    slate: 'bg-slate-50 text-slate-700 border-slate-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  }[tone];
  return (
    <div className={clsx('rounded-lg border p-2.5 text-center', tones)}>
      <div className="text-lg font-semibold leading-none">
        {value.toLocaleString()}
        {suffix && <span className="text-xs font-normal ml-0.5 opacity-80">{suffix}</span>}
      </div>
      <div className="text-[10px] mt-1 opacity-80">{label}</div>
    </div>
  );
}

function Tip({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <div className="font-medium text-slate-700 mb-0.5">{title}</div>
        <div className="text-slate-500 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
