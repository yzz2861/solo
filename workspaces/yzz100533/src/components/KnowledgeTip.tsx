import { Droplets, Droplet, CircleOff, CloudRain } from 'lucide-react';
import type { ErrorType } from '@/types';

interface KnowledgeTipProps {
  errors: { type: ErrorType; explanation: string }[];
  onDismiss: () => void;
}

const errorIcons: Record<ErrorType, React.ReactNode> = {
  overwater: <Droplets size={32} className="text-blue-500" />,
  underwater: <Droplet size={32} className="text-amber-500" />,
  drain_miss: <CircleOff size={32} className="text-orange-500" />,
  rain_water: <CloudRain size={32} className="text-slate-500" />,
  consecutive_water: <Droplets size={32} className="text-cyan-500" />,
};

const errorTitles: Record<ErrorType, string> = {
  overwater: '浇水过多',
  underwater: '浇水不足',
  drain_miss: '缺少排水孔',
  rain_water: '雨天浇水',
  consecutive_water: '连续大水',
};

export default function KnowledgeTip({ errors, onDismiss }: KnowledgeTipProps) {
  if (errors.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm animate-[scaleIn_0.25s_ease-out] rounded-2xl bg-white p-6 shadow-2xl">
        <div className="space-y-5">
          {errors.map((error, i) => (
            <div key={i} className="flex gap-3">
              <div className="shrink-0">{errorIcons[error.type]}</div>
              <div>
                <h3 className="font-bold text-stone-800">{errorTitles[error.type]}</h3>
                <p className="mt-1 text-sm leading-relaxed text-stone-600">{error.explanation}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onDismiss}
          className="mt-6 w-full rounded-xl bg-[#4A7C59] py-3 text-sm font-bold text-white transition-colors hover:bg-[#3D6A4B] active:scale-[0.98]"
        >
          我知道了
        </button>
      </div>
    </div>
  );
}
