import { CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";
import type { Scheme } from "@/types";

type SafetyRating = "pass" | "warning" | "danger";

interface CompareRow {
  label: string;
  values: string[];
  bestIndex: number;
  dangerIndices: number[];
}

function getSafetyRating(scheme: Scheme): SafetyRating {
  const dangerCount = scheme.warnings.filter((w) => w.level === "danger").length;
  const warningCount = scheme.warnings.filter((w) => w.level === "warning").length;
  if (dangerCount > 0) return "danger";
  if (warningCount > 0) return "warning";
  return "pass";
}

function getMaxTension(scheme: Scheme): number {
  return scheme.warnings
    .filter((w) => w.type === "tension")
    .reduce((max, w) => {
      const match = w.message.match(/(\d+\.?\d*)/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
}

function getMinWidth(scheme: Scheme): number {
  return scheme.warnings
    .filter((w) => w.type === "width")
    .reduce((min, w) => {
      const match = w.message.match(/(\d+\.?\d*)/);
      return match ? Math.min(min, Number(match[1])) : min;
    }, Infinity);
}

function getMaxAngle(scheme: Scheme): number {
  return scheme.warnings
    .filter((w) => w.type === "angle")
    .reduce((max, w) => {
      const match = w.message.match(/(\d+\.?\d*)/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
}

function getTotalCapacity(scheme: Scheme): number {
  return scheme.modules.reduce((sum, m) => sum + m.loadCapacity, 0);
}

function SafetyBadge({ rating }: { rating: SafetyRating }) {
  if (rating === "pass") {
    return (
      <span className="inline-flex items-center gap-1 text-[#00D4AA] text-xs font-semibold">
        <CheckCircle size={14} /> 通过
      </span>
    );
  }
  if (rating === "warning") {
    return (
      <span className="inline-flex items-center gap-1 text-yellow-400 text-xs font-semibold">
        <AlertCircle size={14} /> 警告
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-red-400 text-xs font-semibold">
      <AlertTriangle size={14} /> 危险
    </span>
  );
}

export default function SchemeCompare({ schemes }: { schemes: Scheme[] }) {
  if (schemes.length < 2) return null;

  const tensions = schemes.map(getMaxTension);
  const minWidths = schemes.map(getMinWidth);
  const maxAngles = schemes.map(getMaxAngle);
  const capacities = schemes.map(getTotalCapacity);
  const visitorLoads = schemes.map(
    (s) => s.envParams.visitorCount * s.envParams.visitorWeight
  );

  const numericBest = (values: number[], lowerIsBetter = true): number => {
    const finite = values.filter((v) => v !== Infinity && v !== 0);
    if (finite.length === 0) return -1;
    return lowerIsBetter
      ? values.indexOf(Math.min(...finite))
      : values.indexOf(Math.max(...finite));
  };

  const numericDanger = (values: number[], threshold: number, aboveIsDanger = true): number[] => {
    return values
      .map((v, i) => (aboveIsDanger ? v > threshold : v < threshold && v !== Infinity ? i : -1))
      .filter((i) => i >= 0);
  };

  const rows: CompareRow[] = [
    {
      label: "方案名称",
      values: schemes.map((s) => s.name),
      bestIndex: -1,
      dangerIndices: [],
    },
    {
      label: "模块数",
      values: schemes.map((s) => String(s.modules.length)),
      bestIndex: -1,
      dangerIndices: [],
    },
    {
      label: "锚点数",
      values: schemes.map((s) => String(s.anchors.length)),
      bestIndex: -1,
      dangerIndices: [],
    },
    {
      label: "游客荷载",
      values: visitorLoads.map((v) => `${v} kg`),
      bestIndex: numericBest(visitorLoads, true),
      dangerIndices: [],
    },
    {
      label: "总承重",
      values: capacities.map((v) => `${v} kg`),
      bestIndex: numericBest(capacities, false),
      dangerIndices: numericDanger(
        visitorLoads.map((vl, i) => (capacities[i] > 0 ? vl / capacities[i] : Infinity)),
        1,
        true
      ),
    },
    {
      label: "最大拉力",
      values: tensions.map((v) => (v > 0 ? `${v.toFixed(0)} N` : "—")),
      bestIndex: tensions.some((v) => v > 0) ? numericBest(tensions, true) : -1,
      dangerIndices: numericDanger(tensions, 50000, true),
    },
    {
      label: "最小通道宽度",
      values: minWidths.map((v) => (v < Infinity ? `${v.toFixed(2)} m` : "—")),
      bestIndex: minWidths.some((v) => v < Infinity) ? numericBest(minWidths, true) : -1,
      dangerIndices: numericDanger(minWidths, 1.2, false),
    },
    {
      label: "最大连接角度",
      values: maxAngles.map((v) => (v > 0 ? `${v.toFixed(1)}°` : "—")),
      bestIndex: maxAngles.some((v) => v > 0) ? numericBest(maxAngles, true) : -1,
      dangerIndices: numericDanger(maxAngles, 15, true),
    },
  ];

  return (
    <div className="bg-[#0D2E4A] border border-white/10 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-3 text-xs font-semibold opacity-50 uppercase tracking-wide">
                指标
              </th>
              {schemes.map((s) => (
                <th
                  key={s.id}
                  className="text-center px-4 py-3 text-xs font-semibold"
                >
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className="border-b border-white/5 hover:bg-white/[0.02] transition"
              >
                <td className="px-4 py-2.5 text-xs opacity-60 font-medium whitespace-nowrap">
                  {row.label}
                </td>
                {row.values.map((val, i) => {
                  const isBest = i === row.bestIndex;
                  const isDanger = row.dangerIndices.includes(i);
                  return (
                    <td
                      key={i}
                      className={`text-center px-4 py-2.5 text-xs font-mono ${
                        isDanger
                          ? "text-red-400 bg-red-500/5"
                          : isBest
                          ? "text-[#00D4AA] bg-[#00D4AA]/5"
                          : "opacity-80"
                      }`}
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-b border-white/5">
              <td className="px-4 py-2.5 text-xs opacity-60 font-medium">安全评级</td>
              {schemes.map((s) => (
                <td key={s.id} className="text-center px-4 py-2.5">
                  <SafetyBadge rating={getSafetyRating(s)} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
