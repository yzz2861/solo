import type { AuditLog } from "@/types";
import { Clock, User, Tag, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface AuditTimelineProps {
  logs: AuditLog[];
}

export default function AuditTimeline({ logs }: AuditTimelineProps) {
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const getIcon = (action: string) => {
    if (action.includes("上传")) return <User className="w-3.5 h-3.5" />;
    if (action.includes("AI") || action.includes("初筛")) return <Tag className="w-3.5 h-3.5" />;
    if (action.includes("添加") || action.includes("修改") || action.includes("调整"))
      return <CheckCircle className="w-3.5 h-3.5" />;
    if (action.includes("删除")) return <XCircle className="w-3.5 h-3.5" />;
    if (action.includes("争议") || action.includes("状态"))
      return <AlertTriangle className="w-3.5 h-3.5" />;
    return <Clock className="w-3.5 h-3.5" />;
  };

  const getIconBg = (action: string) => {
    if (action.includes("上传")) return "bg-sky-100 text-sky-600";
    if (action.includes("AI") || action.includes("初筛")) return "bg-indigo-100 text-indigo-600";
    if (action.includes("添加") || action.includes("修改") || action.includes("调整"))
      return "bg-emerald-100 text-emerald-600";
    if (action.includes("删除")) return "bg-red-100 text-red-600";
    if (action.includes("争议")) return "bg-amber-100 text-amber-600";
    if (action.includes("状态")) return "bg-purple-100 text-purple-600";
    return "bg-gray-100 text-gray-600";
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;

    return date.toLocaleDateString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-0">
      {sortedLogs.map((log, index) => (
        <div key={log.id} className="relative pl-7 pb-4 last:pb-0">
          {index < sortedLogs.length - 1 && (
            <div className="absolute left-[11px] top-6 bottom-0 w-px bg-gray-200"></div>
          )}

          <div
            className={`absolute left-0 top-0.5 w-6 h-6 rounded-full flex items-center justify-center ${getIconBg(
              log.action
            )}`}
          >
            {getIcon(log.action)}
          </div>

          <div className="pt-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-800">{log.action}</span>
              <span className="text-xs text-gray-400">{formatTime(log.createdAt)}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">操作人：{log.operator}</p>

            {(log.beforeValue || log.afterValue) && (
              <div className="mt-1.5 text-xs">
                {log.beforeValue && (
                  <div className="text-gray-500">
                    <span className="text-gray-400">修改前：</span>
                    {log.beforeValue}
                  </div>
                )}
                {log.afterValue && (
                  <div className="text-gray-700">
                    <span className="text-gray-400">修改后：</span>
                    <span className="font-medium">{log.afterValue}</span>
                  </div>
                )}
              </div>
            )}

            {log.remark && (
              <p className="mt-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                {log.remark}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
