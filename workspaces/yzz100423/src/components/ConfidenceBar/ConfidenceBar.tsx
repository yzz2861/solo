import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

interface ConfidenceBarProps {
  value: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function ConfidenceBar({
  value,
  showLabel = true,
  size = "md",
}: ConfidenceBarProps) {
  const getColor = () => {
    if (value >= 80) return "bg-emerald-500";
    if (value >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  const getTextColor = () => {
    if (value >= 80) return "text-emerald-600";
    if (value >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const getIcon = () => {
    if (value >= 80) return <CheckCircle2 className="w-4 h-4" />;
    if (value >= 60) return <AlertTriangle className="w-4 h-4" />;
    return <XCircle className="w-4 h-4" />;
  };

  const heightClass = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-3.5",
  }[size];

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className={getTextColor()}>{getIcon()}</span>
            <span className="text-sm font-medium text-gray-700">AI置信度</span>
          </div>
          <span className={`text-sm font-bold ${getTextColor()}`}>{value}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-100 rounded-full overflow-hidden ${heightClass}`}>
        <div
          className={`h-full rounded-full ${getColor()} transition-all duration-500 ease-out`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
