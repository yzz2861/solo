import { format } from "date-fns";

export function formatPrice(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "¥0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "¥0";
  return `¥${num.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return "--";
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(date.getTime())) return "--";
  return format(date, "yyyy-MM-dd");
}

export function formatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return "--";
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(date.getTime())) return "--";
  return format(date, "yyyy-MM-dd HH:mm");
}

export function formatShutter(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "0";
  const num = typeof value === "string" ? parseInt(value, 10) : Math.floor(value);
  if (isNaN(num)) return "0";
  return num.toLocaleString("zh-CN");
}

export type GradeLevel = "S" | "A" | "B" | "C" | "D";

export function gradeColor(grade: GradeLevel | string): { bg: string; text: string; border: string; name: string } {
  switch (grade.toUpperCase()) {
    case "S":
      return {
        bg: "bg-emerald-400/15",
        text: "text-emerald-300",
        border: "border-emerald-400/40",
        name: "全新级",
      };
    case "A":
      return {
        bg: "bg-blue-400/15",
        text: "text-blue-300",
        border: "border-blue-400/40",
        name: "优品级",
      };
    case "B":
      return {
        bg: "bg-brass-400/20",
        text: "text-brass-300",
        border: "border-brass-400/40",
        name: "良品级",
      };
    case "C":
      return {
        bg: "bg-signal-orange/15",
        text: "text-signal-orange",
        border: "border-signal-orange/40",
        name: "使用级",
      };
    case "D":
      return {
        bg: "bg-signal-red/15",
        text: "text-signal-red",
        border: "border-signal-red/40",
        name: "瑕疵级",
      };
    default:
      return {
        bg: "bg-space-600/40",
        text: "text-space-400",
        border: "border-space-500/40",
        name: "未分级",
      };
  }
}
