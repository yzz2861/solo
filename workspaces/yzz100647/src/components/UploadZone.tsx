import { useCallback, useRef, useState } from 'react';
import { Upload, Image as ImageIcon, FileText, X, CheckCircle2 } from 'lucide-react';
import { useComplaintStore } from '@/store/complaintStore';
import { formatFileSize } from '@/utils/namingGenerator';

export default function UploadZone() {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const addAttachments = useComplaintStore((s) => s.addAttachments);
  const cmp = useComplaintStore((s) => s.getComplaint());
  const attachmentCount = cmp?.attachments.length ?? 0;
  const totalSize = cmp?.attachments.reduce((s, a) => s + a.fileSize, 0) ?? 0;

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArr = Array.from(files).filter(
      (f) =>
        f.type.startsWith('image/') ||
        f.type === 'application/pdf' ||
        /\.(png|jpe?g|gif|webp|pdf|heic)$/i.test(f.name),
    );
    if (fileArr.length > 0) {
      addAttachments(fileArr);
    }
  }, [addAttachments]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="card animate-fade-in">
      <div className="card-header">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warn-50">
            <Upload className="h-4.5 w-4.5 text-warn-600" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-zinc-900">附件上传区</h2>
            <p className="text-[11px] text-zinc-500">
              支持 JPG / PNG / GIF / WEBP / PDF，多文件同时上传
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[12px]">
          <span className="chip bg-brand-50 text-brand-700 border border-brand-200">
            <CheckCircle2 className="h-3 w-3" />
            已上传 <b className="mx-0.5">{attachmentCount}</b> 个
          </span>
          <span className="text-zinc-500">{formatFileSize(totalSize)}</span>
          {attachmentCount > 0 && (
            <button
              onClick={() => inputRef.current?.value !== undefined && (inputRef.current.value = '')}
              className="btn-ghost text-[12px] px-2 py-1"
              title="清空列表（请使用下方单个删除）"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`group cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
            isDragging
              ? 'border-brand-500 bg-brand-50 scale-[1.01] shadow-card'
              : 'border-zinc-200 bg-zinc-25 hover:border-brand-400 hover:bg-brand-50/40'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.heic"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-soft mb-3 transition-transform group-hover:scale-110">
            <Upload className={`h-6 w-6 transition-colors ${isDragging ? 'text-brand-600' : 'text-zinc-400 group-hover:text-brand-500'}`} />
          </div>
          <p className={`text-sm font-medium ${isDragging ? 'text-brand-700' : 'text-zinc-700'}`}>
            {isDragging ? '松开即上传' : '拖拽文件到此处，或点击选择'}
          </p>
          <p className="mt-1 text-[11.5px] text-zinc-400">
            聊天截图 / 检测单 / 快递照片 / 购买凭证等
          </p>

          <div className="mt-5 flex justify-center gap-6">
            {[
              { Icon: ImageIcon, label: '图片', hint: 'JPG/PNG/WEBP' },
              { Icon: FileText, label: '文档', hint: 'PDF' },
            ].map(({ Icon, label, hint }) => (
              <div key={label} className="flex items-center gap-2 text-[11.5px] text-zinc-500">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white border border-zinc-200 shadow-soft">
                  <Icon className="h-3.5 w-3.5 text-zinc-500" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-zinc-700">{label}</div>
                  <div className="text-[10px] text-zinc-400">{hint}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
