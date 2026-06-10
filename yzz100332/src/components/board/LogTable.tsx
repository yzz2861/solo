import type { AuditLog, PriceTag } from "@/types";
import { Edit, ShieldCheck, XCircle, Printer } from "lucide-react";

const ACTION_META: Record<
  AuditLog["action"],
  { label: string; icon: typeof Edit; cls: string }
> = {
  edit: { label: "编辑/新增", icon: Edit, cls: "badge-info" },
  confirm: { label: "老板确认", icon: ShieldCheck, cls: "badge-success" },
  reject: { label: "驳回", icon: XCircle, cls: "badge-error" },
  print: { label: "打印", icon: Printer, cls: "badge-warn" },
};

interface Props {
  logs: AuditLog[];
  tags: PriceTag[];
}

export default function LogTable({ logs, tags }: Props) {
  const tagMap = new Map(tags.map((t) => [t.id, t]));

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="th-cell !w-44">时间</th>
            <th className="th-cell !w-24">操作</th>
            <th className="th-cell !w-24">操作人</th>
            <th className="th-cell">价签</th>
            <th className="th-cell">品类</th>
            <th className="th-cell">产地</th>
            <th className="th-cell">详情</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="py-16 text-center text-ink-light text-sm"
              >
                今日尚无操作记录
              </td>
            </tr>
          ) : (
            logs.map((l) => {
              const t = tagMap.get(l.tagId);
              const meta = ACTION_META[l.action];
              const Icon = meta.icon;
              return (
                <tr key={l.id} className="border-t border-gray-100 hover:bg-brand-500/3">
                  <td className="px-3 py-2 font-mono text-xs text-ink-light whitespace-nowrap">
                    {new Date(l.timestamp).toLocaleString("zh-CN", {
                      hour12: false,
                    })}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`badge ${meta.cls} inline-flex gap-1`}>
                      <Icon size={11} />
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-ink font-medium">{l.operator}</td>
                  <td className="px-3 py-2">
                    <span className="font-display text-brand-500 font-semibold">
                      {t?.name || "(已删除)"}
                    </span>
                    {t?.grade && (
                      <span className="ml-1 chip bg-amber-400/15 text-amber-800 text-[10px] py-0">
                        {t.grade}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-ink-light text-xs">
                    {t?.category || "-"}
                  </td>
                  <td className="px-3 py-2 text-ink-light text-xs">
                    {t?.origin || "-"}
                  </td>
                  <td className="px-3 py-2 text-ink/80 text-xs max-w-xs truncate">
                    {l.detail || "-"}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
