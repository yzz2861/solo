import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload as UploadIcon,
  FileText,
  Camera,
  AlertCircle,
  ChevronRight,
  User,
  Phone,
  CreditCard,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createRecord } from '@/lib/api';

export default function UploadPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'image' | 'text'>('text');
  const [textContent, setTextContent] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [patient, setPatient] = useState({
    name: '',
    gender: '女' as '男' | '女',
    age: '',
    idCard: '',
    phone: '',
  });
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarn, setDuplicateWarn] = useState<string | null>(null);

  const handleFile = useCallback((f: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImg(e.target?.result as string);
    };
    reader.readAsDataURL(f);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const handleSubmit = async () => {
    setError(null);
    setDuplicateWarn(null);
    if (!patient.name || !patient.age || !patient.idCard || !patient.phone) {
      setError('请填写完整患者基本信息');
      return;
    }
    if (mode === 'text' && !textContent.trim()) {
      setError('请粘贴病历文本内容');
      return;
    }
    if (mode === 'image' && !previewImg) {
      setError('请上传病历照片');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        patient: { ...patient, age: Number(patient.age) },
        visitDate,
        sourceType: mode,
        sourceContent: mode === 'text' ? textContent : previewImg,
      };
      const result = await createRecord(payload);
      if (result.duplicateOf) {
        setDuplicateWarn('该患者今日已有就诊记录，已独立保存（未合并）。');
      }
      setTimeout(() => navigate(`/record/${result.id}/extract`), 800);
    } catch (e: any) {
      setError(e.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = () => {
    setPatient({
      name: '刘桂芳',
      gender: '女',
      age: '68',
      idCard: '110101195802156789',
      phone: '13800001234',
    });
    setTextContent(`刘桂芳 女 68岁
主诉：反复咳嗽咳痰5天，伴胸闷气促2天。
现病史：5天前受凉后出现咳嗽，咳黄白痰，伴低热。
既往史：高血压病史10年。
过敏史：青霉素过敏。
查体：T 37.8℃，双肺呼吸音粗。
诊断：急性支气管炎，高血压2级。
用药：
1. 头孢克肟 0.1g 口服 每日2次 共7天
2. 氨溴索 30mg 口服 每日3次
复诊：一周后复诊。`);
  };

  return (
    <div className="p-8 max-w-[1280px] mx-auto">
      <header className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <span>首页</span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900 font-medium">录入病历</span>
      </header>

      <h1 className="text-2xl font-semibold text-slate-900 font-serif mb-1">录入新病历</h1>
      <p className="text-sm text-slate-500 mb-8">请选择录入方式，填写患者信息后提交</p>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 space-y-6">
          <div className="bg-white rounded-xl shadow-card border border-slate-100 overflow-hidden">
            <div className="flex border-b border-slate-100">
              <button
                onClick={() => setMode('text')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors',
                  mode === 'text'
                    ? 'bg-medical-50 text-medical-800 border-b-2 border-medical-700'
                    : 'text-slate-500 hover:bg-slate-50',
                )}
              >
                <FileText className="w-4 h-4" />
                粘贴护士录入稿
              </button>
              <button
                onClick={() => setMode('image')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors',
                  mode === 'image'
                    ? 'bg-medical-50 text-medical-800 border-b-2 border-medical-700'
                    : 'text-slate-500 hover:bg-slate-50',
                )}
              >
                <Camera className="w-4 h-4" />
                上传病历照片
              </button>
            </div>

            <div className="p-6">
              {mode === 'text' ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700">病历文本</label>
                    <button onClick={fillDemo} className="text-xs text-medical-700 hover:text-medical-800">
                      填入示例
                    </button>
                  </div>
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="粘贴护士手写录入稿或病历原文，包含主诉、诊断、用药、过敏史、复诊建议等内容..."
                    className="w-full h-72 p-4 rounded-lg border border-slate-200 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-medical-500/30 focus:border-medical-500 resize-none font-mono bg-slate-50/50"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    提示：内容越完整，抽取准确率越高。低把握项会在结果页标注并提示护士确认。
                  </p>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">病历照片</label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    onClick={() => fileRef.current?.click()}
                    className={cn(
                      'h-72 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all',
                      dragOver
                        ? 'border-medical-500 bg-medical-50/50'
                        : previewImg
                        ? 'border-slate-200 bg-slate-50 p-2'
                        : 'border-slate-300 hover:border-medical-400 hover:bg-slate-50/50',
                    )}
                  >
                    {previewImg ? (
                      <img src={previewImg} alt="病历预览" className="max-h-full rounded shadow" />
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-medical-50 text-medical-700 flex items-center justify-center mb-3">
                          <UploadIcon className="w-6 h-6" />
                        </div>
                        <div className="text-sm font-medium text-slate-700">拖拽照片到此处，或点击选择</div>
                        <div className="text-xs text-slate-400 mt-1">支持 JPG / PNG，建议清晰、光线充足</div>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-card border border-slate-100 p-6">
            <h2 className="font-serif font-semibold text-slate-900 mb-4">患者基本信息</h2>
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                  <User className="w-3.5 h-3.5" />
                  姓名
                </label>
                <input
                  type="text"
                  value={patient.name}
                  onChange={(e) => setPatient({ ...patient, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/30 focus:border-medical-500"
                  placeholder="请输入姓名"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">性别</label>
                  <select
                    value={patient.gender}
                    onChange={(e) => setPatient({ ...patient, gender: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/30 focus:border-medical-500"
                  >
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">年龄</label>
                  <input
                    type="number"
                    value={patient.age}
                    onChange={(e) => setPatient({ ...patient, age: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/30 focus:border-medical-500"
                    placeholder="岁"
                  />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  身份证号
                </label>
                <input
                  type="text"
                  value={patient.idCard}
                  onChange={(e) => setPatient({ ...patient, idCard: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/30 focus:border-medical-500 font-mono"
                  placeholder="18位身份证号"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  联系电话
                </label>
                <input
                  type="tel"
                  value={patient.phone}
                  onChange={(e) => setPatient({ ...patient, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/30 focus:border-medical-500 font-mono"
                  placeholder="手机号"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  就诊日期
                </label>
                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/30 focus:border-medical-500"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-danger-50 border border-danger-200 rounded-lg p-3 flex gap-2 text-sm text-danger-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}
          {duplicateWarn && (
            <div className="bg-warn-50 border border-warn-200 rounded-lg p-3 flex gap-2 text-sm text-warn-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {duplicateWarn}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-medical-800 hover:bg-medical-900 disabled:bg-medical-800/60 text-white py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-md"
          >
            {submitting ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                提交中...
              </>
            ) : (
              <>
                <UploadIcon className="w-4 h-4" />
                提交并开始抽取
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
