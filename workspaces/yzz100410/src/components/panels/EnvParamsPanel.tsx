import { Wind, Waves, Users, Compass } from "lucide-react";
import { useStore } from "@/store/useStore";

function SliderField({
  label,
  icon,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs opacity-70">
          {icon}
          {label}
        </div>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-16 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-xs font-mono text-right outline-none"
          />
          <span className="text-[10px] opacity-40">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 accent-[#00D4AA] cursor-pointer"
      />
    </div>
  );
}

export default function EnvParamsPanel() {
  const envParams = useStore((s) => s.envParams);
  const modules = useStore((s) => s.modules);
  const setEnvParams = useStore((s) => s.setEnvParams);

  const totalCapacity = modules.reduce((sum, m) => sum + m.loadCapacity, 0);
  const visitorLoad = envParams.visitorCount * envParams.visitorWeight;
  const overloadRatio = totalCapacity > 0 ? visitorLoad / totalCapacity : 0;

  return (
    <div className="bg-[#0A2540] text-white p-4 rounded-lg w-72 flex flex-col gap-4 overflow-y-auto max-h-screen">
      <h2 className="text-sm font-semibold tracking-wide uppercase opacity-70">环境参数</h2>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold opacity-60">
          <Wind size={14} />
          风力
        </div>
        <div className="pl-4 flex flex-col gap-3">
          <SliderField
            label="方向"
            icon={<Compass size={12} />}
            value={envParams.windDirection}
            min={0}
            max={360}
            step={1}
            unit="°"
            onChange={(v) => setEnvParams({ windDirection: v })}
          />
          <SliderField
            label="风速"
            icon={<Wind size={12} />}
            value={envParams.windSpeed}
            min={0}
            max={30}
            step={0.1}
            unit="m/s"
            onChange={(v) => setEnvParams({ windSpeed: v })}
          />
        </div>
      </div>

      <div className="border-t border-white/10" />

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold opacity-60">
          <Waves size={14} />
          波浪
        </div>
        <div className="pl-4 flex flex-col gap-3">
          <SliderField
            label="方向"
            icon={<Compass size={12} />}
            value={envParams.waveDirection}
            min={0}
            max={360}
            step={1}
            unit="°"
            onChange={(v) => setEnvParams({ waveDirection: v })}
          />
          <SliderField
            label="浪高"
            icon={<Waves size={12} />}
            value={envParams.waveHeight}
            min={0}
            max={2}
            step={0.01}
            unit="m"
            onChange={(v) => setEnvParams({ waveHeight: v })}
          />
        </div>
      </div>

      <div className="border-t border-white/10" />

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold opacity-60">
          <Users size={14} />
          游客
        </div>
        <div className="pl-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs opacity-60">人数</span>
            <input
              type="number"
              min={1}
              max={500}
              value={envParams.visitorCount}
              onChange={(e) => setEnvParams({ visitorCount: Number(e.target.value) })}
              className="w-16 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-xs font-mono text-right outline-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs opacity-60">人均体重</span>
            <input
              type="number"
              min={30}
              max={200}
              step={1}
              value={envParams.visitorWeight}
              onChange={(e) => setEnvParams({ visitorWeight: Number(e.target.value) })}
              className="w-16 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-xs font-mono text-right outline-none"
            />
          </div>
          <div className="text-xs opacity-50 text-right font-mono">
            总载: {visitorLoad} kg
          </div>
        </div>
      </div>

      <div className="border-t border-white/10" />

      <div className="flex items-center justify-between text-xs">
        <span className="opacity-60">桥承重 vs 游客载</span>
        <span className={`font-mono ${overloadRatio > 1 ? "text-red-400" : "text-[#00D4AA]"}`}>
          {totalCapacity} / {visitorLoad} kg
        </span>
      </div>
      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            overloadRatio > 1 ? "bg-red-500" : overloadRatio > 0.8 ? "bg-yellow-500" : "bg-[#00D4AA]"
          }`}
          style={{ width: `${Math.min(overloadRatio * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}
