import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Wind,
  Volume2,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Wrench,
  ClipboardCheck,
} from "lucide-react";
import { useVentStore } from "@/hooks/useVentStore";
import { WarningBanner } from "@/components/FormFields";
import clsx from "clsx";

function MetricCard({
  label,
  value,
  unit,
  subValue,
  subUnit,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  unit: string;
  subValue?: string;
  subUnit?: string;
  icon: React.ElementType;
  accent: "orange" | "blue" | "green";
}) {
  const colors = {
    orange: "bg-orange-50 text-orange-600 border-orange-200",
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-emerald-50 text-emerald-600 border-emerald-200",
  };
  const iconBg = {
    orange: "bg-orange-500",
    blue: "bg-blue-500",
    green: "bg-emerald-500",
  };

  return (
    <div className={clsx("rounded-xl border p-4", colors[accent])}>
      <div className="flex items-center gap-2 mb-2">
        <div className={clsx("flex h-7 w-7 items-center justify-center rounded-lg", iconBg[accent])}>
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-xs font-medium opacity-70">{label}</span>
      </div>
      <div className="font-mono text-2xl font-bold tracking-tight">{value}</div>
      <div className="text-xs opacity-60">{unit}</div>
      {subValue && (
        <div className="mt-1.5 pt-1.5 border-t border-current/10">
          <span className="font-mono text-sm font-semibold">{subValue}</span>
          <span className="text-xs opacity-60 ml-1">{subUnit}</span>
        </div>
      )}
    </div>
  );
}

function ProcurementReport() {
  const { ventResult, ventInput } = useVentStore();
  if (!ventResult) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-emerald-800">采购推荐参数</h3>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg bg-white/80 p-4 border border-emerald-100">
            <div className="text-xs text-emerald-600 font-medium mb-1">推荐风量范围</div>
            <div className="font-mono text-xl font-bold text-emerald-800">
              {ventResult.recommendedAirflowRange.min.toFixed(0)} ~ {ventResult.recommendedAirflowRange.max.toFixed(0)}
            </div>
            <div className="text-xs text-emerald-500">m³/h</div>
            <div className="font-mono text-sm text-emerald-600 mt-1">
              {(ventResult.recommendedAirflowRange.min * 0.5886).toFixed(0)} ~ {(ventResult.recommendedAirflowRange.max * 0.5886).toFixed(0)} CFM
            </div>
          </div>

          <div className="rounded-lg bg-white/80 p-4 border border-emerald-100">
            <div className="text-xs text-emerald-600 font-medium mb-1">推荐风压范围</div>
            <div className="font-mono text-xl font-bold text-emerald-800">
              {ventResult.recommendedPressureRange.min.toFixed(0)} ~ {ventResult.recommendedPressureRange.max.toFixed(0)}
            </div>
            <div className="text-xs text-emerald-500">Pa（含安全系数 1.1~1.3）</div>
          </div>

          <div className="rounded-lg bg-white/80 p-4 border border-emerald-100">
            <div className="text-xs text-emerald-600 font-medium mb-1">噪声要求</div>
            <div className="flex items-center gap-2">
              {ventResult.noiseCompliant ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              <span className="font-mono text-lg font-bold text-emerald-800">
                ≤ {ventInput.noiseLimit} dB(A)
              </span>
            </div>
            {!ventResult.noiseCompliant && (
              <p className="mt-2 text-xs text-amber-600">
                ⚠ 估算噪声可能超标，建议选择低噪声风机或增加消声措施
              </p>
            )}
          </div>
        </div>
      </div>

      {ventInput.odorSource && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500 font-medium mb-1">气味来源备注</div>
          <div className="text-sm text-slate-700">{ventInput.odorSource}</div>
        </div>
      )}
    </div>
  );
}

function FacilityReport() {
  const { ventResult, ventInput } = useVentStore();
  if (!ventResult) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-300 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <Wrench className="h-4 w-4 text-slate-700" />
          <h3 className="text-sm font-semibold text-slate-800">厂务详细计算</h3>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
            <div className="text-xs text-slate-500 font-medium mb-2">管道阻力分解</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">直管摩擦阻力</span>
                <span className="font-mono text-sm font-semibold text-slate-800">{ventResult.ductFrictionLoss.toFixed(1)} Pa</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">弯头局部阻力 ({ventInput.elbowCount}个 × ζ=0.5)</span>
                <span className="font-mono text-sm font-semibold text-slate-800">{ventResult.elbowLoss.toFixed(1)} Pa</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">
                  过滤网阻力
                  {ventResult.filterLossIsEstimated && (
                    <span className="ml-1 text-amber-500 font-medium">⚠ 估算值</span>
                  )}
                </span>
                <span className="font-mono text-sm font-semibold text-slate-800">{ventResult.filterLoss.toFixed(1)} Pa</span>
              </div>
              <div className="border-t border-slate-300 pt-2 flex items-center justify-between">
                <span className="text-xs text-slate-700 font-semibold">系统总阻力</span>
                <span className="font-mono text-sm font-bold text-slate-900">{ventResult.totalPressure.toFixed(1)} Pa</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
            <div className="text-xs text-slate-500 font-medium mb-2">计算参数</div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">管道风速</span>
                <span className="font-mono text-xs text-slate-700">{ventResult.ductVelocity.toFixed(2)} m/s</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">动压</span>
                <span className="font-mono text-xs text-slate-700">{ventResult.dynamicPressure.toFixed(2)} Pa</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">摩擦系数 (f)</span>
                <span className="font-mono text-xs text-slate-700">0.025（镀锌钢板）</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">空气密度 (ρ)</span>
                <span className="font-mono text-xs text-slate-700">1.2 kg/m³</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 p-3 border border-amber-200">
            <div className="text-xs text-amber-700 font-medium mb-2">不确定项</div>
            <div className="space-y-1.5">
              {ventResult.filterLossIsEstimated && (
                <div className="flex items-start gap-1.5">
                  <span className="text-amber-500 text-xs mt-0.5">●</span>
                  <span className="text-xs text-amber-700">过滤网阻力为估算值，实际阻力取决于滤材品牌、积尘程度，建议实测或咨询供应商</span>
                </div>
              )}
              <div className="flex items-start gap-1.5">
                <span className="text-amber-500 text-xs mt-0.5">●</span>
                <span className="text-xs text-amber-700">弯头阻力系数取 0.5（标准 90° 弯头），实际值受弯头类型（圆弯/方弯）影响</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-amber-500 text-xs mt-0.5">●</span>
                <span className="text-xs text-amber-700">未计入排风口、风阀等其他附件阻力，实际总阻力可能偏高</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-amber-500 text-xs mt-0.5">●</span>
                <span className="text-xs text-amber-700">安全系数：风量 ×1.0~1.2，风压 ×1.1~1.3，建议选型时取上限</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-300 bg-white p-4">
        <div className="text-xs text-slate-500 font-medium mb-2">噪声单独判定</div>
        <div className="flex items-center gap-2">
          {ventResult.noiseCompliant ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-500" />
          )}
          <div>
            <div className="text-sm font-semibold text-slate-800">
              噪声限值：{ventInput.noiseLimit} dB(A)
            </div>
            <div className="text-xs text-slate-500">
              同风量轴流风机估算噪声范围约 55-75 dB(A)
            </div>
          </div>
        </div>
        {!ventResult.noiseCompliant && (
          <div className="mt-2 rounded-lg bg-red-50 p-2.5 border border-red-200">
            <p className="text-xs text-red-700">
              ⚠ 可能超出噪声限制。建议：①降低风量/换气次数 ②选用离心风机替代轴流风机 ③增加消声器/消声弯头 ④管道外包隔音棉
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EstimateResult() {
  const navigate = useNavigate();
  const { ventResult, ventInput, reportMode, setReportMode } = useVentStore();

  if (!ventResult) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">请先完成参数输入</p>
          <button
            onClick={() => navigate("/")}
            className="text-orange-500 font-medium text-sm hover:text-orange-600"
          >
            返回输入页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#1B2B3A] text-white">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-base font-bold tracking-tight">估算结果</h1>
              <p className="text-xs text-slate-400">风量与风压范围</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        {ventResult.airChangeWarning !== "none" && (
          <WarningBanner
            level={ventResult.airChangeWarning}
            message={
              ventResult.airChangeWarning === "red"
                ? "换气次数严重不足！建议提高至 6 次/h 以上"
                : "换气次数偏低，一般车间建议不低于 6 次/h"
            }
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="所需风量"
            value={ventResult.airflowM3h.toFixed(0)}
            unit="m³/h"
            subValue={ventResult.airflowCFM.toFixed(0)}
            subUnit="CFM"
            icon={Wind}
            accent="orange"
          />
          <MetricCard
            label="系统总阻力"
            value={ventResult.totalPressure.toFixed(1)}
            unit="Pa"
            icon={Gauge}
            accent="blue"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="管道风速"
            value={ventResult.ductVelocity.toFixed(1)}
            unit="m/s"
            icon={Wind}
            accent="green"
          />
          <MetricCard
            label="噪声判定"
            value={ventResult.noiseCompliant ? "合规" : "超标"}
            unit={`限值 ${ventInput.noiseLimit} dB(A)`}
            icon={Volume2}
            accent={ventResult.noiseCompliant ? "green" : "orange"}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-1 flex gap-1">
          <button
            onClick={() => setReportMode("procurement")}
            className={clsx(
              "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
              reportMode === "procurement"
                ? "bg-emerald-500 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            采购版
          </button>
          <button
            onClick={() => setReportMode("facility")}
            className={clsx(
              "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
              reportMode === "facility"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Wrench className="h-3.5 w-3.5" />
            厂务版
          </button>
        </div>

        {reportMode === "procurement" ? <ProcurementReport /> : <FacilityReport />}

        <button
          onClick={() => navigate("/feedback")}
          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-orange-500 bg-orange-50 px-6 py-3 text-sm font-semibold text-orange-600 hover:bg-orange-100 transition-all duration-200"
        >
          <ClipboardCheck className="h-4 w-4" />
          记录验收反馈
        </button>
      </main>
    </div>
  );
}
