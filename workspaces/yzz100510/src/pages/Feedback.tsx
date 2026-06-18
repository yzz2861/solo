import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, History, Wind, Volume2, Trash2 } from "lucide-react";
import { useVentStore } from "@/hooks/useVentStore";
import type { WindFeeling, NoiseFeeling, OdorImprovement, FeedbackRecord } from "@/hooks/useVentStore";
import clsx from "clsx";

const WIND_OPTIONS: { label: string; value: WindFeeling; desc: string }[] = [
  { label: "偏弱", value: "weak", desc: "几乎感觉不到风" },
  { label: "适中", value: "moderate", desc: "有明显风感但不扰人" },
  { label: "偏强", value: "strong", desc: "风感明显，可能有吹落物品" },
];

const NOISE_OPTIONS: { label: string; value: NoiseFeeling; desc: string }[] = [
  { label: "安静", value: "quiet", desc: "不影响交谈" },
  { label: "可接受", value: "acceptable", desc: "需提高音量交谈" },
  { label: "较吵", value: "loud", desc: "严重影响交谈" },
];

const ODOR_OPTIONS: { label: string; value: OdorImprovement; desc: string }[] = [
  { label: "无改善", value: "none", desc: "异味与安装前无差别" },
  { label: "部分改善", value: "partial", desc: "异味有所减轻但仍可感知" },
  { label: "明显改善", value: "obvious", desc: "异味基本消除或大幅减轻" },
];

function RadioGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { label: string; value: T; desc: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-slate-600">{label}</label>
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={clsx(
              "rounded-lg border p-3 text-left transition-all duration-200",
              value === opt.value
                ? "border-orange-400 bg-orange-50 ring-2 ring-orange-100"
                : "border-slate-200 bg-white hover:border-slate-300"
            )}
          >
            <div className={clsx(
              "text-sm font-semibold",
              value === opt.value ? "text-orange-700" : "text-slate-700"
            )}>
              {opt.label}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">{opt.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function FeedbackHistoryItem({ record }: { record: FeedbackRecord }) {
  const windLabel = WIND_OPTIONS.find((o) => o.value === record.windFeeling)?.label ?? record.windFeeling;
  const noiseLabel = NOISE_OPTIONS.find((o) => o.value === record.noiseFeeling)?.label ?? record.noiseFeeling;
  const odorLabel = ODOR_OPTIONS.find((o) => o.value === record.odorImprovement)?.label ?? record.odorImprovement;
  const date = new Date(record.createdAt);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400">{dateStr}</span>
        <span className="text-xs text-slate-400 font-mono">
          {record.ventResult.airflowM3h.toFixed(0)} m³/h
        </span>
      </div>
      <div className="flex gap-3 text-xs">
        <span className="flex items-center gap-1 text-slate-600">
          <Wind className="h-3 w-3" /> {windLabel}
        </span>
        <span className="flex items-center gap-1 text-slate-600">
          <Volume2 className="h-3 w-3" /> {noiseLabel}
        </span>
        <span className="text-slate-600">异味: {odorLabel}</span>
      </div>
      {record.notes && (
        <div className="mt-1.5 text-xs text-slate-500 border-t border-slate-100 pt-1.5">
          {record.notes}
        </div>
      )}
    </div>
  );
}

export default function Feedback() {
  const navigate = useNavigate();
  const { ventResult, ventInput, feedbackRecords, addFeedback } = useVentStore();

  const [windFeeling, setWindFeeling] = useState<WindFeeling | null>(null);
  const [noiseFeeling, setNoiseFeeling] = useState<NoiseFeeling | null>(null);
  const [odorImprovement, setOdorImprovement] = useState<OdorImprovement | null>(null);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = windFeeling && noiseFeeling && odorImprovement && ventResult;

  const handleSubmit = () => {
    if (!canSubmit || !ventResult) return;
    addFeedback({
      ventInput,
      ventResult,
      windFeeling,
      noiseFeeling,
      odorImprovement,
      notes,
    });
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#1B2B3A] text-white">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/result")}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-base font-bold tracking-tight">验收反馈</h1>
              <p className="text-xs text-slate-400">记录实际风感体验</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        {submitted ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-emerald-800 mb-1">反馈已记录</h3>
            <p className="text-sm text-emerald-600 mb-4">验收反馈已保存到本地</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate("/")}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
              >
                新建估算
              </button>
              <button
                onClick={() => navigate("/result")}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                返回结果
              </button>
            </div>
          </div>
        ) : (
          <>
            {!ventResult && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                请先完成通风量估算，再记录验收反馈
              </div>
            )}

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="space-y-5">
                <RadioGroup
                  label="风速体感"
                  options={WIND_OPTIONS}
                  value={windFeeling}
                  onChange={(v) => setWindFeeling(v as WindFeeling)}
                />
                <RadioGroup
                  label="噪声体感"
                  options={NOISE_OPTIONS}
                  value={noiseFeeling}
                  onChange={(v) => setNoiseFeeling(v as NoiseFeeling)}
                />
                <RadioGroup
                  label="异味改善程度"
                  options={ODOR_OPTIONS}
                  value={odorImprovement}
                  onChange={(v) => setOdorImprovement(v as OdorImprovement)}
                />

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">备注（可选）</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="记录实际使用感受，如：风管出口风速偏弱、换气后仍有残留气味..."
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all duration-200 resize-none"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="w-full rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 hover:bg-orange-600 disabled:bg-slate-300 disabled:shadow-none transition-all duration-200"
                >
                  提交反馈
                </button>
              </div>
            </section>
          </>
        )}

        {feedbackRecords.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <History className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-800">历史反馈</h3>
              <span className="ml-auto text-xs text-slate-400">{feedbackRecords.length} 条</span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {feedbackRecords.slice(0, 10).map((record) => (
                <FeedbackHistoryItem key={record.id} record={record} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
