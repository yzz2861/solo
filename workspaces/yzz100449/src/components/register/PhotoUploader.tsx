import { useRef } from 'react';
import { Camera, X, Image as ImageIcon } from 'lucide-react';

interface Props {
  photos: string[];
  onChange: (p: string[]) => void;
}

const LABELS = ['正面', '背面', '边框', '细节1', '细节2', '细节3'];
const MAX = 6;

export default function PhotoUploader({ photos, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const slotsLeft = MAX - photos.length;
    const picked = files.slice(0, slotsLeft);
    const newPhotos: string[] = [];
    for (const f of picked) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(f);
      });
      newPhotos.push(dataUrl);
    }
    onChange([...photos, ...newPhotos]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const remove = (i: number) => onChange(photos.filter((_, idx) => idx !== i));

  return (
    <div className="card p-6 space-y-4">
      <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs flex items-center justify-center font-black">3</span>
        实物照片（最多 {MAX} 张）
      </h3>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {photos.map((p, i) => (
          <div key={i} className="relative group aspect-square rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-100">
            <img src={p} className="w-full h-full object-cover" alt={LABELS[i]} />
            <div className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {LABELS[i] ?? `图${i + 1}`}
            </div>
            <button type="button" onClick={() => remove(i)}
              className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-danger-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
              <X size={14} />
            </button>
          </div>
        ))}
        {photos.length < MAX && (
          <button type="button" onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-brand-500 hover:bg-brand-50 transition-all flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:text-brand-600">
            <Camera size={26} />
            <span className="text-xs font-bold">上传照片</span>
            <span className="text-[10px] text-slate-400">剩余 {MAX - photos.length} 张</span>
          </button>
        )}
        {photos.length === 0 && (
          <div className="col-span-3 md:col-span-5 flex items-center gap-3 p-4 rounded-2xl bg-blue-50/50 border border-blue-100 text-blue-700 text-sm">
            <ImageIcon size={20} />
            <span>建议依次拍摄：正面屏幕 → 背面 → 边框 → 划痕/磕碰特写</span>
          </div>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={onFile} />
    </div>
  );
}
