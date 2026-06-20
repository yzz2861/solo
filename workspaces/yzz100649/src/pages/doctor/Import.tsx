import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Shield, FileSearch, Sparkles, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Field, TextInput } from '@/components/common/Field';
import { Tag } from '@/components/common/Tag';
import {
  parseRevisionManifest,
  parseReviewReport,
  readFileAsText,
  revisionManifestToArticle,
} from '@/services/fileIO';
import { useToast } from '@/components/common/Toast';
import { clsx } from 'clsx';
import type { RevisionManifest } from '@/types';

export default function DoctorImport() {
  const nav = useNavigate();
  const init = useAppStore((s) => s.init);
  const importRevisionAsArticle = useAppStore((s) => s.importRevisionAsArticle);
  const articles = useAppStore((s) => s.articles);
  const { push } = useToast();

  const [doctorName, setDoctorName] = useState('');
  const [preview, setPreview] = useState<RevisionManifest | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  init();

  const pending = articles.filter((a) => a.stage === 'sent_to_doctor');

  const handleText = async (text: string, name?: string) => {
    const manifest = parseRevisionManifest(text);
    const report = parseReviewReport(text);
    if (report) {
      push('warn', '该文件为审核报告，请选择修订清单 JSON 文件');
      return;
    }
    if (!manifest) {
      push('error', '文件解析失败，请确认是编辑导出的修订清单 JSON');
      return;
    }
    setPreview(manifest);
    push('success', `已解析清单：${manifest.article.title}`);
    if (name && !doctorName.trim()) {
      const guess = name.replace(/\.(json|csv)$/i, '').split('_')[0];
      if (/[\u4e00-\u9fa5]/.test(guess) && guess.length < 10) {
        // 文件名不推断医生名
      }
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    const file = arr[0];
    try {
      const text = await readFileAsText(file);
      await handleText(text, file.name);
    } catch (e) {
      console.error(e);
      push('error', '文件读取失败');
    }
  };

  const confirmImport = () => {
    if (!preview) return;
    const article = revisionManifestToArticle(preview);
    importRevisionAsArticle(article);
    push('success', `已导入：${article.title}，共 ${article.annotations.length} 项待审核`);
    nav(`/doctor/review/${article.id}`);
  };

  const openLocal = (id: string) => nav(`/doctor/review/${id}`);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Tag className="bg-violet-50 text-violet-700 border border-violet-100">
            <Shield className="w-3 h-3" /> 医生流程 · 步骤 1 / 2
          </Tag>
        </div>
        <h1 className="text-2xl font-semibold text-slate-800 mb-1">导入修订清单</h1>
        <p className="text-sm text-slate-500">
          导入编辑导出的 JSON 修订清单文件，开始医学专业审核。
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-5">
          <Card
            title={
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#1e3a5f]" />
                上传修订清单
              </div>
            }
            extra={
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
            }
          >
            <div className="space-y-4">
              <Field label="您的姓名 / 标识" required hint="用于审核签名，将显示在最终报告中">
                <TextInput
                  placeholder="例如：李医生 / Dr.Li"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                />
              </Field>

              <div
                className={clsx(
                  'border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer',
                  dragging
                    ? 'border-[#1e3a5f] bg-[#1e3a5f]/5'
                    : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-50'
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
                onClick={() => fileRef.current?.click()}
              >
                <div className="mx-auto w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-3 shadow-sm">
                  <Upload className="w-6 h-6 text-[#1e3a5f]" />
                </div>
                <p className="text-sm text-slate-700 font-medium mb-1">
                  拖拽 JSON 文件到此处，或点击选择
                </p>
                <p className="text-xs text-slate-400">支持编辑端导出的修订清单 .json 文件</p>
              </div>

              {preview && (
                <div className="border border-emerald-200 bg-emerald-50/60 rounded-xl p-4 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs text-emerald-600 font-semibold mb-1">✓ 已解析清单</div>
                      <div className="text-sm font-medium text-emerald-900">{preview.article.title}</div>
                    </div>
                    <Tag className="bg-emerald-100 text-emerald-700 border border-emerald-200">
                      {preview.annotations.length} 项待审核
                    </Tag>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-emerald-800/80">
                    <span>段落数：{preview.article.paragraphCount}</span>
                    <span>作者：{preview.article.author || '未填写'}</span>
                    <span>导出于：{new Date(preview.exportedAt).toLocaleString()}</span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={confirmImport} disabled={!doctorName.trim()} iconRight={<Sparkles className="w-4 h-4" />}>
                      开始审核
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>
                      清除
                    </Button>
                  </div>
                  {!doctorName.trim() && (
                    <p className="text-[11px] text-amber-600 flex items-center gap-1 pt-1">
                      <AlertTriangle className="w-3 h-3" /> 请先填写您的姓名标识
                    </p>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <Card
            title={
              <div className="flex items-center gap-2">
                <FileSearch className="w-4 h-4 text-violet-600" />
                本地已有待审稿件
              </div>
            }
            extra={<span className="text-[11px] text-slate-400">{pending.length} 份</span>}
          >
            {pending.length === 0 ? (
              <div className="py-10 text-center text-[12px] text-slate-400">
                暂无待审稿件，请导入 JSON 清单
              </div>
            ) : (
              <ul className="space-y-2">
                {pending.slice(0, 6).map((a) => (
                  <li key={a.id}>
                    <button
                      onClick={() => openLocal(a.id)}
                      className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-violet-300 hover:bg-violet-50/30 transition group"
                    >
                      <div className="text-sm font-medium text-slate-800 truncate group-hover:text-violet-700">
                        {a.title}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                        <span>{a.annotations.length} 项</span>
                        <span>·</span>
                        <span>编辑：{a.author || '未填写'}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="审核要点">
            <ul className="text-xs text-slate-600 space-y-2.5 leading-relaxed">
              <Tip title="疗效表述">
                避免&quot;治愈、根治、100%有效&quot;等绝对化措辞，建议改为有循证依据的表述。
              </Tip>
              <Tip title="用药剂量">
                核对剂量范围、频次、给药途径，必要时补充&quot;遵医嘱&quot;说明。
              </Tip>
              <Tip title="适用人群 / 禁忌">
                特殊人群必须注明安全性证据等级；禁忌需来源于说明书或权威指南。
              </Tip>
              <Tip title="引用与数据">
                数据来源需可追溯，指南请注明版本号，百分比需给出研究出处。
              </Tip>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Tip({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
      <div>
        <div className="font-medium text-slate-700 mb-0.5">{title}</div>
        <div className="text-slate-500">{children}</div>
      </div>
    </li>
  );
}
