import { useNavigate } from "react-router-dom";
import { Wind, ArrowRight } from "lucide-react";
import { useVentStore } from "@/hooks/useVentStore";
import { calculateVent } from "@/utils/ventCalc";
import { NumberInput, UnitToggle, Stepper, SelectField, WarningBanner } from "@/components/FormFields";
import { FILTER_RESISTANCE_MAP } from "@/utils/unitConv";
import type { VolumeUnit, LengthUnit, DiameterUnit, FilterType } from "@/utils/unitConv";

const VOLUME_UNITS: { label: string; value: VolumeUnit }[] = [
  { label: "m³", value: "m3" },
  { label: "ft³", value: "ft3" },
];

const LENGTH_UNITS: { label: string; value: LengthUnit }[] = [
  { label: "m", value: "m" },
  { label: "ft", value: "ft" },
];

const DIAMETER_UNITS: { label: string; value: DiameterUnit }[] = [
  { label: "mm", value: "mm" },
  { label: "in", value: "in" },
];

const FILTER_OPTIONS = Object.entries(FILTER_RESISTANCE_MAP).map(([value, info]) => ({
  label: `${info.label}${info.isEstimated ? ` (~${info.value}Pa)` : ""}`,
  value,
}));

export default function EstimateInput() {
  const navigate = useNavigate();
  const { ventInput, setVentInput, setVentResult } = useVentStore();

  const handleEstimate = () => {
    const result = calculateVent(ventInput);
    setVentResult(result);
    navigate("/result");
  };

  const airChangeWarning =
    ventInput.airChangeRate > 0 && ventInput.airChangeRate < 3
      ? "red"
      : ventInput.airChangeRate >= 3 && ventInput.airChangeRate < 6
        ? "yellow"
        : null;

  const isValid =
    ventInput.roomVolume > 0 &&
    ventInput.airChangeRate > 0 &&
    ventInput.ductLength >= 0 &&
    ventInput.ductDiameter > 0 &&
    ventInput.noiseLimit > 0;

  const showCustomResistance = ventInput.filterType === "custom";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#1B2B3A] text-white">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500">
              <Wind className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">小型风机通风量估算</h1>
              <p className="text-xs text-slate-400">输入参数，估算风量与风压范围</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1B2B3A] text-xs font-bold text-white">1</span>
            <h2 className="text-sm font-semibold text-slate-800">房间参数</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">房间体积</label>
              <div className="flex items-end gap-2">
                <NumberInput
                  value={ventInput.roomVolume}
                  onChange={(v) => setVentInput({ roomVolume: v })}
                  placeholder="输入房间体积"
                  min={0}
                  step={1}
                  className="flex-1"
                />
                <UnitToggle
                  value={ventInput.roomVolumeUnit}
                  options={VOLUME_UNITS}
                  onChange={(v) => setVentInput({ roomVolumeUnit: v })}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">目标换气次数</label>
              <div className="flex items-end gap-2">
                <NumberInput
                  value={ventInput.airChangeRate}
                  onChange={(v) => setVentInput({ airChangeRate: v })}
                  placeholder="次/h"
                  min={0}
                  step={1}
                  unit="次/h"
                  className="flex-1"
                />
              </div>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={ventInput.airChangeRate}
                  onChange={(e) => setVentInput({ airChangeRate: Number(e.target.value) })}
                  className="flex-1 accent-orange-500"
                />
                <span className="text-xs text-slate-400 min-w-[3rem] text-right font-mono">
                  {ventInput.airChangeRate} 次/h
                </span>
              </div>
              {airChangeWarning && (
                <div className="mt-2">
                  <WarningBanner
                    level={airChangeWarning as "yellow" | "red"}
                    message={
                      airChangeWarning === "red"
                        ? "换气次数严重不足（< 3 次/h），一般车间建议不低于 6 次/h，有异味/有害气体时建议 10-20 次/h"
                        : "换气次数偏低（< 6 次/h），一般车间建议不低于 6 次/h"
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1B2B3A] text-xs font-bold text-white">2</span>
            <h2 className="text-sm font-semibold text-slate-800">管道参数</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">管道长度</label>
              <div className="flex items-end gap-2">
                <NumberInput
                  value={ventInput.ductLength}
                  onChange={(v) => setVentInput({ ductLength: v })}
                  placeholder="管道长度"
                  min={0}
                  step={0.5}
                  className="flex-1"
                />
                <UnitToggle
                  value={ventInput.ductLengthUnit}
                  options={LENGTH_UNITS}
                  onChange={(v) => setVentInput({ ductLengthUnit: v })}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">管道直径</label>
              <div className="flex items-end gap-2">
                <NumberInput
                  value={ventInput.ductDiameter}
                  onChange={(v) => setVentInput({ ductDiameter: v })}
                  placeholder="管道直径"
                  min={0}
                  step={10}
                  className="flex-1"
                />
                <UnitToggle
                  value={ventInput.ductDiameterUnit}
                  options={DIAMETER_UNITS}
                  onChange={(v) => setVentInput({ ductDiameterUnit: v })}
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">常见圆形风管：100/150/200/250/300mm</p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">弯头数量</label>
              <Stepper
                value={ventInput.elbowCount}
                onChange={(v) => setVentInput({ elbowCount: v })}
                max={10}
              />
              <p className="mt-1 text-xs text-slate-400">每个 90° 弯头约增加 0.5 倍动压损失</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1B2B3A] text-xs font-bold text-white">3</span>
            <h2 className="text-sm font-semibold text-slate-800">过滤网参数</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">过滤网类型</label>
              <SelectField
                value={ventInput.filterType}
                options={FILTER_OPTIONS}
                onChange={(v) => setVentInput({ filterType: v as FilterType })}
              />
              {ventInput.filterType === "unknown" && (
                <p className="mt-1.5 text-xs text-amber-600">
                  ⚠ 未知过滤网阻力将采用保守估算值 150Pa，实际值可能偏差较大
                </p>
              )}
            </div>

            {showCustomResistance && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">自定义过滤网阻力</label>
                <NumberInput
                  value={ventInput.filterResistance ?? 0}
                  onChange={(v) => setVentInput({ filterResistance: v })}
                  placeholder="过滤网阻力"
                  min={0}
                  step={10}
                  unit="Pa"
                />
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1B2B3A] text-xs font-bold text-white">4</span>
            <h2 className="text-sm font-semibold text-slate-800">噪声限制</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">噪声限值</label>
              <NumberInput
                value={ventInput.noiseLimit}
                onChange={(v) => setVentInput({ noiseLimit: v })}
                placeholder="噪声限值"
                min={30}
                max={100}
                step={1}
                unit="dB(A)"
              />
            </div>
            <div className="flex gap-3 text-xs text-slate-400">
              <span>办公区 ~50dB</span>
              <span>车间 ~65dB</span>
              <span>高噪声区 ~75dB</span>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-400 text-xs font-bold text-white">+</span>
            <h2 className="text-sm font-semibold text-slate-800">气味来源（可选）</h2>
          </div>

          <textarea
            value={ventInput.odorSource}
            onChange={(e) => setVentInput({ odorSource: e.target.value })}
            placeholder="描述气味来源，如：焊接烟尘、化学品挥发..."
            rows={2}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all duration-200 resize-none"
          />
        </section>

        <button
          onClick={handleEstimate}
          disabled={!isValid}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-200 hover:bg-orange-600 disabled:bg-slate-300 disabled:shadow-none transition-all duration-200"
        >
          开始估算
          <ArrowRight className="h-4 w-4" />
        </button>
      </main>
    </div>
  );
}
