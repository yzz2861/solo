import { useStore } from "@/store";
import type { Booking, RecommendedCourt } from "@/types";
import { findAvailableIndoorCourts } from "@/engine/scheduler";
import { useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  Home,
  Users,
  Star,
  Zap,
  Check,
} from "lucide-react";

interface Props {
  booking: Booking;
  onSelect: (courtId: string) => void;
}

export default function IndoorCourtList({ booking, onSelect }: Props) {
  const courts = useStore((s) => s.courts);
  const bookings = useStore((s) => s.bookings);
  const coaches = useStore((s) => s.coaches);
  const members = useStore((s) => s.members);

  const member = members.find((m) => m.id === booking.memberId);
  const level = member?.level ?? "normal";

  const recommendations: RecommendedCourt[] = useMemo(
    () =>
      findAvailableIndoorCourts(
        bookings,
        courts,
        coaches,
        booking.startTime,
        booking.endTime,
        booking.date,
        booking.coachId,
        booking.id
      ),
    [bookings, courts, coaches, booking]
  );

  const topScore = recommendations[0]?.score ?? 1;

  if (recommendations.length === 0) {
    return (
      <div className="p-8 text-center rounded-xl bg-gray-50 border border-dashed border-gray-200">
        <XCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <div className="text-sm text-gray-500">暂时无可用室内场</div>
        <div className="text-[11px] text-gray-400 mt-1">
          建议选择延期或退款方案
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          智能推荐室内场 · 按匹配度排序
        </div>
        <span className="text-[10px] text-gray-400">
          时段 {booking.startTime} - {booking.endTime}
        </span>
      </div>

      <div className="space-y-2.5">
        {recommendations.map((rec, idx) => {
          const hasCapacity = rec.capacityUsed < rec.capacityTotal;
          const isBest = idx === 0 && rec.score >= 60;
          const levelBonus =
            (level === "gold" && idx === 0) || (level === "silver" && idx < 2);

          return (
            <div
              key={rec.court.id}
              className={`relative p-3.5 rounded-2xl border transition-all duration-200 group cursor-pointer ${
                hasCapacity
                  ? isBest
                    ? "bg-gradient-to-br from-court-50 to-cyan-50 border-court-200 hover:border-court-400 hover:shadow-soft"
                    : "bg-white border-gray-200 hover:border-court-300 hover:shadow-soft"
                  : "bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed"
              }`}
              onClick={() => hasCapacity && onSelect(rec.court.id)}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              {isBest && (
                <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-gradient-to-r from-court-500 to-teal-500 text-white text-[10px] font-bold rounded-full flex items-center gap-1 shadow-sm">
                  <Star className="w-3 h-3 fill-white/90" />
                  最佳匹配
                  {levelBonus && <span className="opacity-75">· 会员优享</span>}
                </div>
              )}

              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    hasCapacity
                      ? "bg-court-100 text-court-700"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  <Home className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-800 text-sm">
                      {rec.court.name}
                    </span>
                    {hasCapacity ? (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-100">
                        <CheckCircle2 className="w-3 h-3" />
                        可预约
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 text-[10px] font-medium border border-red-100">
                        <XCircle className="w-3 h-3" />
                        已满
                      </span>
                    )}
                    {booking.coachId && (
                      <span
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${
                          rec.coachAvailable
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : "bg-amber-50 text-amber-700 border-amber-100"
                        }`}
                      >
                        {rec.coachAvailable ? "教练可用" : "教练冲突"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-gray-600 mb-2">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      已用 {rec.capacityUsed}/{rec.capacityTotal} 时段
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">匹配度</span>
                      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-court-400 to-court-600 rounded-full transition-all"
                          style={{
                            width: `${Math.round(
                              (rec.score / Math.max(1, topScore)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="font-mono font-semibold text-court-700 text-[10px]">
                        {Math.round((rec.score / Math.max(1, topScore)) * 100)}%
                      </span>
                    </div>
                  </div>

                  {rec.sameTimeBookings.length > 0 && (
                    <div className="text-[10px] text-gray-400">
                      同场同时段另有 {rec.sameTimeBookings.length} 场预订
                    </div>
                  )}
                </div>

                {hasCapacity && (
                  <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="btn-primary !py-1.5 !px-3 !text-xs">
                      <Check className="w-3.5 h-3.5" />
                      选择此场
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
