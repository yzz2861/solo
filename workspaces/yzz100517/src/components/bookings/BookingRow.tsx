import { CheckCircle2, ChevronDown, ChevronUp, Eye, Pencil, Trash2, Undo2, Trees, Home } from "lucide-react";
import { useState } from "react";
import type { Booking, Court, Coach, Member, BookingStatus } from "@/types";
import { useStore } from "@/store";

interface Props {
  booking: Booking;
  index: number;
  member: Member | undefined;
  court: Court | undefined;
  switchCourt: Court | undefined;
  coach: Coach | undefined;
  statusConf: { cls: string; icon: any; zh: string };
  StatusIcon: any;
  levelConf: { icon: any; cls: string; zh: string };
  LevelIcon: any;
  checked: boolean;
  onToggle: () => void;
  onOpen: () => void;
  canEdit: boolean;
}

export default function BookingRow(props: Props) {
  const {
    booking,
    index,
    member,
    court,
    switchCourt,
    coach,
    statusConf,
    StatusIcon,
    levelConf,
    LevelIcon,
    checked,
    onToggle,
    onOpen,
    canEdit,
  } = props;

  const [expanded, setExpanded] = useState(false);
  const deleteBooking = useStore((s) => s.deleteBooking);
  const revertBooking = useStore((s) => s.revertBooking);
  const refundBooking = useStore((s) => s.refundBooking);
  const pushToast = useStore((s) => s.pushToast);

  const isOutdoor = court?.type === "outdoor";
  const delayed = index * 60;

  return (
    <>
      <tr
        className={`border-b border-gray-50 hover:bg-court-50/30 transition-colors cursor-pointer group ${
          booking.status !== "normal" ? "bg-gray-50/60" : ""
        } ${checked ? "!bg-court-50/70" : ""} animate-fade-in-up`}
        style={{ animationDelay: `${delayed}ms` }}
        onClick={() => {
          if (!canEdit) onOpen();
        }}
      >
        <td className="td-cell" onClick={(e) => e.stopPropagation()}>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={onToggle}
              disabled={!canEdit}
              className="w-4 h-4 rounded border-gray-300 text-court-600 focus:ring-court-500 cursor-pointer"
            />
          </label>
        </td>
        <td className="td-cell">
          <div className="flex flex-col">
            <span className="font-mono font-semibold text-gray-800 text-sm">
              {booking.startTime}
            </span>
            <span className="font-mono text-xs text-gray-400">
              → {booking.endTime}
            </span>
          </div>
        </td>
        <td className="td-cell">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full ${levelConf.cls} flex items-center justify-center shrink-0`}
            >
              <LevelIcon className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-gray-800 text-sm truncate flex items-center gap-1.5">
                {member?.name ?? "未关联会员"}
                <span className="text-[10px] text-gray-400 font-medium">
                  {levelConf.zh}
                </span>
              </div>
              <div className="text-[11px] text-gray-400 font-mono truncate">
                {member?.phone ?? "-"}
              </div>
            </div>
          </div>
        </td>
        <td className="td-cell">
          <div className="space-y-1">
            <div
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${
                isOutdoor
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                  : "bg-cyan-50 text-cyan-700 border border-cyan-100"
              }`}
            >
              {isOutdoor ? (
                <Trees className="w-3 h-3" />
              ) : (
                <Home className="w-3 h-3" />
              )}
              {court?.name ?? "-"}
            </div>
            {switchCourt && booking.status === "switched" && (
              <div className="flex items-center gap-1 text-[10px] text-court-600 font-medium">
                → <Home className="w-2.5 h-2.5" /> {switchCourt.name}
              </div>
            )}
            {booking.rescheduleToDate && booking.status === "rescheduled" && (
              <div className="text-[10px] text-amber-600 font-medium">
                📅 延至 {booking.rescheduleToDate}
              </div>
            )}
          </div>
        </td>
        <td className="td-cell">
          {coach ? (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-court-400 to-court-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {coach.avatar}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-gray-700 text-sm truncate">
                  {coach.name}
                </div>
                <div className="text-[10px] text-gray-400 truncate">
                  {coach.specialty}
                </div>
              </div>
            </div>
          ) : (
            <span className="text-xs text-gray-400">无教练</span>
          )}
        </td>
        <td className="td-cell text-right">
          <div className="font-mono font-bold text-gray-800">
            ¥{booking.paidAmount.toFixed(0)}
          </div>
          {booking.refundAmount > 0 && (
            <div className="text-[10px] text-red-500 font-mono">
              退¥{booking.refundAmount.toFixed(0)}
            </div>
          )}
          <div className="text-[10px] text-gray-400">
            {payMethodZh(booking.payMethod)}
          </div>
        </td>
        <td className="td-cell">
          {booking.elapsedMinutes > 0 ? (
            <div>
              <div className="font-mono font-semibold text-gray-700">
                {booking.elapsedMinutes}分
              </div>
              <div className="progress-track w-16 mt-1">
                <div
                  className="progress-fill bg-gradient-to-r from-amber-400 to-orange-500"
                  style={{
                    width: `${Math.min(
                      100,
                      (booking.elapsedMinutes /
                        Math.max(
                          1,
                          (parseInt(booking.endTime.split(":")[0]) * 60 +
                            parseInt(booking.endTime.split(":")[1])) -
                            (parseInt(booking.startTime.split(":")[0]) * 60 +
                              parseInt(booking.startTime.split(":")[1]))
                        )) *
                        100
                    )}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <span className="text-xs text-gray-400">未开场</span>
          )}
        </td>
        <td className="td-cell">
          <span className={`${statusConf.cls} group-hover:scale-[1.03] transition-transform`}>
            <StatusIcon className="w-3 h-3" />
            {statusConf.zh}
          </span>
        </td>
        <td
          className="td-cell text-right no-print"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {booking.status !== "normal" && (
              <button
                onClick={() => revertBooking(booking.id)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                title="恢复为正常"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            )}
            {booking.status === "stopped" && (
              <button
                onClick={() => {
                  refundBooking(booking.id, "快速退款");
                  pushToast("success", "退款已记录");
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="快速退款"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onOpen}
              className="p-1.5 rounded-lg text-gray-400 hover:text-court-600 hover:bg-court-50 transition-colors"
              title="打开详情"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            {canEdit && (
              <>
                <button
                  onClick={() => {
                    if (confirm("确定删除该订单？此操作无法撤销。")) {
                      deleteBooking(booking.id);
                    }
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="删除订单"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              title={expanded ? "收起详情" : "展开详情"}
            >
              {expanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50/80">
          <td colSpan={9} className="px-8 py-4">
            <div className="grid grid-cols-4 gap-6 text-xs">
              <InfoItem label="订单编号" value={booking.id} mono />
              <InfoItem label="创建时间" value={new Date(booking.createdAt).toLocaleString("zh-CN")} />
              <InfoItem label="更新时间" value={new Date(booking.updatedAt).toLocaleString("zh-CN")} />
              <InfoItem label="天气备注" value={booking.weatherNote ?? "-"} />
              {booking.processRemark && (
                <InfoItem label="处理备注" value={booking.processRemark} />
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function InfoItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] text-gray-400 mb-1">{label}</div>
      <div
        className={`text-gray-700 truncate ${mono ? "font-mono text-[11px]" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function payMethodZh(p: string) {
  const map: Record<string, string> = {
    wechat: "微信",
    alipay: "支付宝",
    card: "刷卡",
    cash: "现金",
  };
  return map[p] ?? p;
}
