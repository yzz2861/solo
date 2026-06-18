import { useStore } from "@/store";
import { useState, useEffect } from "react";
import {
  X,
  User,
  Home,
  Clock,
  UserPen,
  Wallet,
  CalendarClock,
  RefreshCw,
  CalendarX,
  ChevronRight,
  FileText,
  StickyNote,
  Crown,
  Medal,
  Award,
  ShieldCheck,
  History,
  CheckCircle2,
} from "lucide-react";
import ConflictBanner from "@/components/alerts/ConflictBanner";
import IndoorCourtList from "@/components/recommend/IndoorCourtList";
import { buildConflictAlerts, checkRescheduleLimit } from "@/engine/rules";
import { calculateRefund, minutesBetween } from "@/engine/refund";
import { todayStr, addDaysStr } from "@/data/seed";
import type { Booking, Member, Court, Coach as CoachType } from "@/types";
import { copyToClipboard, generateNotify } from "@/utils/notify";

const levelMap = {
  gold: { icon: Crown, cls: "text-amber-500 bg-amber-50 border-amber-100", zh: "金卡会员" },
  silver: { icon: Medal, cls: "text-slate-500 bg-slate-50 border-slate-100", zh: "银卡会员" },
  normal: { icon: Award, cls: "text-gray-500 bg-gray-50 border-gray-100", zh: "普通会员" },
};

const roleNames = { reception: "前台", manager: "店长", coach: "教练" };
const actionNames = { create: "创建/编辑", stop: "停场", switch: "换场", reschedule: "延期", refund: "退款" };

export default function BookingDrawer() {
  const drawerId = useStore((s) => s.drawerBookingId);
  const close = useStore((s) => s.setDrawerBookingId);
  const booking = useStore((s) => s.bookings.find((b) => b.id === drawerId) || null);
  const members = useStore((s) => s.members);
  const courts = useStore((s) => s.courts);
  const coaches = useStore((s) => s.coaches);
  const weatherNote = useStore((s) => s.weatherNote);
  const switchCourt = useStore((s) => s.switchCourt);
  const rescheduleBooking = useStore((s) => s.rescheduleBooking);
  const refundBooking = useStore((s) => s.refundBooking);
  const addCompensation = useStore((s) => s.addCompensation);
  const getLogsForBooking = useStore((s) => s.getLogsForBooking);
  const getCompensationsForBooking = useStore((s) => s.getCompensationsForBooking);
  const currentRole = useStore((s) => s.currentRole);
  const pushToast = useStore((s) => s.pushToast);

  const [tab, setTab] = useState<"switch" | "reschedule" | "refund">("switch");
  const [rescheduleDate, setRescheduleDate] = useState(addDaysStr(todayStr, 1));
  const [overrideLimit, setOverrideLimit] = useState(false);
  const [rescheduleRemark, setRescheduleRemark] = useState("");
  const [refundRemark, setRefundRemark] = useState("");
  const [switchRemark, setSwitchRemark] = useState("");
  const [compForm, setCompForm] = useState({
    amount: 0,
    plan: "",
    approver: "",
  });

  useEffect(() => {
    if (booking) {
      setOverrideLimit(false);
      setRescheduleRemark("");
      setRefundRemark("");
      setSwitchRemark("");
      if (booking.coachId) {
        setCompForm({
          amount: Math.round(booking.paidAmount * 0.3 * 100) / 100,
          plan: "雨天停场补偿（30%课时费）",
          approver: "",
        });
      }
    }
  }, [booking?.id]);

  if (!booking) return null;

  const member = members.find((m) => m.id === booking.memberId) as Member;
  const court = courts.find((c) => c.id === booking.courtId) as Court;
  const switchToCourt = courts.find((c) => c.id === booking.switchToCourtId);
  const coach = coaches.find((c) => c.id === booking.coachId) as CoachType | undefined;
  const logs = getLogsForBooking(booking.id);
  const compensations = getCompensationsForBooking(booking.id);

  const alerts = buildConflictAlerts(
    booking,
    member,
    coach?.name,
    courts,
    useStore.getState().bookings
  );
  const rescheduleCheck = checkRescheduleLimit(member);
  const totalMin = minutesBetween(booking.startTime, booking.endTime);
  const refundResult = calculateRefund(booking.elapsedMinutes, totalMin, booking.paidAmount);
  const levelConf = levelMap[member?.level ?? "normal"];
  const LevelIcon = levelConf.icon;

  const canEdit = currentRole !== "coach";
  const canOverride = currentRole === "manager";

  const handleSwitch = (courtId: string) => {
    const ok = switchCourt(booking.id, courtId, switchRemark || null);
    if (ok) {
      if (booking.coachId) {
        addCompensation({
          bookingId: booking.id,
          coachId: booking.coachId,
          coachCompensation: compForm.amount,
          compensationPlan: compForm.plan,
          operatorRole: currentRole,
          operatorName: useStore.getState().currentUser,
          approverId: compForm.approver || null,
        });
      }
      close(null);
    }
  };

  const handleReschedule = () => {
    const ok = rescheduleBooking(booking.id, rescheduleDate, rescheduleRemark || null, overrideLimit);
    if (ok) {
      if (booking.coachId) {
        addCompensation({
          bookingId: booking.id,
          coachId: booking.coachId,
          coachCompensation: compForm.amount,
          compensationPlan: compForm.plan,
          operatorRole: currentRole,
          operatorName: useStore.getState().currentUser,
          approverId: compForm.approver || null,
        });
      }
      close(null);
    }
  };

  const handleRefund = () => {
    refundBooking(booking.id, refundRemark || null);
    close(null);
  };

  const handleCopyNotify = async () => {
    const notify = generateNotify(
      booking,
      member,
      court,
      switchToCourt,
      weatherNote.remark
    );
    const text = `【短信】${notify.sms}\n\n【微信】${notify.wechat}`;
    const ok = await copyToClipboard(text);
    if (ok) pushToast("success", "会员通知模板已复制到剪贴板");
  };

  return (
    <div className="fixed inset-0 z-40">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => close(null)}
      />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-[640px] bg-white shadow-2xl overflow-hidden flex flex-col animate-slide-in-right">
        <div className="px-5 py-4 border-b border-gray-100 flex items-start gap-3 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="font-bold text-gray-800 text-lg">订单详情</h3>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${levelConf.cls}`}>
                <LevelIcon className="w-3 h-3" />
                {levelConf.zh}
              </span>
            </div>
            <div className="text-[11px] text-gray-400 font-mono">{booking.id.slice(-12)}</div>
          </div>
          <button
            onClick={() => close(null)}
            className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-5 space-y-5">
            <ConflictBanner alerts={alerts} />

            <div className="grid grid-cols-2 gap-3">
              <InfoCard icon={User} title="会员" value={member?.name ?? "-"} sub={member?.phone} />
              <InfoCard icon={Home} title="场地" value={court?.name ?? "-"} sub={court?.type === "indoor" ? "室内" : "室外"} />
              <InfoCard icon={Clock} title="时段" value={`${booking.startTime} - ${booking.endTime}`} sub={`${booking.date} · 共${totalMin}分钟`} />
              <InfoCard
                icon={UserPen}
                title="教练"
                value={coach?.name ?? "无教练"}
                sub={coach ? `课时费 ¥${coach.hourlyRate}/h · ${coach.specialty}` : undefined}
              />
              <InfoCard
                icon={Wallet}
                title="付款"
                value={`¥${booking.paidAmount.toFixed(2)}`}
                sub={{ wechat: "微信", alipay: "支付宝", card: "刷卡", cash: "现金" }[booking.payMethod]}
              />
              <InfoCard
                icon={CalendarClock}
                title="已开场"
                value={`${booking.elapsedMinutes} 分钟`}
                sub={`退款比例 ${Math.round(refundResult.refundRatio * 100)}% · ${refundResult.tier}`}
              />
            </div>

            <div className="border-t border-gray-100 pt-5">
              <div className="flex items-center gap-1 p-1 bg-gray-50 rounded-xl border border-gray-100 mb-4">
                {[
                  { k: "switch", icon: RefreshCw, label: "换场" },
                  { k: "reschedule", icon: CalendarX, label: "延期" },
                  { k: "refund", icon: Wallet, label: "退款" },
                ].map((t) => (
                  <button
                    key={t.k}
                    onClick={() => canEdit && setTab(t.k as any)}
                    disabled={!canEdit}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                      tab === t.k
                        ? "bg-white text-court-700 shadow-sm border border-court-100"
                        : "text-gray-500 hover:text-gray-700 disabled:opacity-50"
                    }`}
                  >
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === "switch" && (
                <div className="space-y-4">
                  <IndoorCourtList booking={booking} onSelect={handleSwitch} />
                  <div>
                    <label className="label">换场备注（可选）</label>
                    <textarea
                      value={switchRemark}
                      onChange={(e) => setSwitchRemark(e.target.value)}
                      className="input min-h-[60px] resize-y"
                      placeholder="前台可填写换场原因或特殊说明..."
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              )}

              {tab === "reschedule" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">延期至</label>
                      <input
                        type="date"
                        value={rescheduleDate}
                        min={todayStr}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        className="input"
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <label className="label">改期次数</label>
                      <div className={`h-[38px] px-3 rounded-xl border flex items-center gap-2 text-sm ${
                        rescheduleCheck.exceed
                          ? "bg-red-50 border-red-200 text-red-700"
                          : "bg-gray-50 border-gray-200 text-gray-700"
                      }`}>
                        <History className="w-4 h-4" />
                        <span className="font-mono font-semibold">{rescheduleCheck.count} / {rescheduleCheck.limit} 次</span>
                        <span className="text-[11px] opacity-70">（近7天）</span>
                      </div>
                    </div>
                  </div>
                  {rescheduleCheck.exceed && canOverride && (
                    <label className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={overrideLimit}
                        onChange={(e) => setOverrideLimit(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-600"
                      />
                      <span className="text-xs text-amber-800">
                        <ShieldCheck className="w-3.5 h-3.5 inline mr-1" />
                        店长审批：允许超过改期次数限制
                      </span>
                    </label>
                  )}
                  <div>
                    <label className="label">延期备注（可选）</label>
                    <textarea
                      value={rescheduleRemark}
                      onChange={(e) => setRescheduleRemark(e.target.value)}
                      className="input min-h-[60px] resize-y"
                      placeholder="说明延期原因..."
                      disabled={!canEdit}
                    />
                  </div>
                  {canEdit && (
                    <button
                      onClick={handleReschedule}
                      disabled={rescheduleCheck.exceed && !overrideLimit}
                      className="btn-primary w-full disabled:opacity-50"
                    >
                      确认延期至 {rescheduleDate}
                    </button>
                  )}
                </div>
              )}

              {tab === "refund" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
                    <div className="text-xs text-amber-700 mb-2 font-medium">退款明细</div>
                    <div className="space-y-2">
                      <Row k="原付款金额" v={`¥${booking.paidAmount.toFixed(2)}`} />
                      <Row k="已开场时长" v={`${booking.elapsedMinutes} 分钟`} />
                      <Row k="退款规则" v={refundResult.tier} highlight />
                      <Row k="退款比例" v={`${Math.round(refundResult.refundRatio * 100)}%`} />
                      <div className="pt-2 border-t border-amber-200/60 mt-2">
                        <Row k="应退金额" v={`¥${refundResult.refundAmount.toFixed(2)}`} big />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="label">退款备注（可选）</label>
                    <textarea
                      value={refundRemark}
                      onChange={(e) => setRefundRemark(e.target.value)}
                      className="input min-h-[60px] resize-y"
                      placeholder="退款方式、特殊情况说明..."
                      disabled={!canEdit}
                    />
                  </div>
                  {canEdit && (
                    <button onClick={handleRefund} className="btn-danger w-full">
                      确认退款 ¥{refundResult.refundAmount.toFixed(2)}
                    </button>
                  )}
                </div>
              )}
            </div>

            {booking.coachId && (
              <div className="border-t border-gray-100 pt-5">
                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-3">
                  <StickyNote className="w-4 h-4 text-court-600" />
                  教练补偿方案
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">补偿金额（元）</label>
                    <input
                      type="number"
                      value={compForm.amount}
                      onChange={(e) => setCompForm({ ...compForm, amount: Number(e.target.value) })}
                      className="input font-mono"
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <label className="label">审批人</label>
                    <input
                      type="text"
                      value={compForm.approver}
                      onChange={(e) => setCompForm({ ...compForm, approver: e.target.value })}
                      className="input"
                      placeholder="店长姓名"
                      disabled={!canEdit}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="label">补偿方案说明</label>
                  <textarea
                    value={compForm.plan}
                    onChange={(e) => setCompForm({ ...compForm, plan: e.target.value })}
                    className="input min-h-[60px] resize-y text-xs"
                    disabled={!canEdit}
                  />
                </div>
                {compensations.length > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="text-[11px] text-gray-500 mb-2 font-medium">已留痕补偿记录</div>
                    {compensations.map((c) => (
                      <div key={c.id} className="text-[11px] text-gray-600 py-1.5 border-b border-gray-100 last:border-0">
                        <div className="flex justify-between">
                          <span>¥{c.coachCompensation.toFixed(2)}</span>
                          <span className="text-gray-400">{new Date(c.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="text-gray-500 mt-0.5">{c.compensationPlan}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-gray-100 pt-5">
              <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-3">
                <FileText className="w-4 h-4 text-court-600" />
                历史变更记录 <span className="text-[11px] text-gray-400 font-normal">（供会员追溯）</span>
              </h4>
              <div className="relative">
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gray-200" />
                <div className="space-y-3">
                  {logs.map((log, i) => (
                    <div key={log.id} className="relative pl-8">
                      <div className={`absolute left-0 top-1 w-[22px] h-[22px] rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                        log.action === "refund" ? "bg-red-400" :
                        log.action === "switch" ? "bg-court-500" :
                        log.action === "reschedule" ? "bg-blue-500" :
                        log.action === "stop" ? "bg-amber-500" : "bg-gray-400"
                      }`}>
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-800">
                            {actionNames[log.action]}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded bg-white border border-gray-200">
                            {roleNames[log.operatorRole]} {log.operatorName}
                          </span>
                          {log.remark && (
                            <>
                              <ChevronRight className="w-3 h-3" />
                              <span>{log.remark}</span>
                            </>
                          )}
                        </div>
                        {log.beforeSnapshot && log.afterSnapshot && i > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-200/60 grid grid-cols-2 gap-2 text-[10px]">
                            <div>
                              <div className="text-gray-400 mb-0.5">变更前</div>
                              <div className="text-gray-600 font-mono truncate">
                                {log.beforeSnapshot.status} · {(log.beforeSnapshot as any).courtId?.slice(-3)}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-400 mb-0.5">变更后</div>
                              <div className="text-court-700 font-mono truncate">
                                {log.afterSnapshot.status} · {(log.afterSnapshot as any).switchToCourtId ? (log.afterSnapshot as any).switchToCourtId.slice(-3) : (log.afterSnapshot as any).rescheduleToDate || "-"}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2 bg-gray-50/50">
          <button onClick={handleCopyNotify} className="btn-secondary !py-2 !text-xs flex-1">
            生成会员通知模板
          </button>
          {canEdit && (
            <button
              onClick={() => {
                if (tab === "switch") {
                  pushToast("info", "请在上方推荐列表中选择室内场");
                } else if (tab === "reschedule") {
                  handleReschedule();
                } else {
                  handleRefund();
                }
              }}
              className="btn-primary !py-2 !text-xs flex-1"
            >
              确认当前操作
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  value,
  sub,
}: {
  icon: any;
  title: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-[11px] text-gray-500 font-medium">{title}</span>
      </div>
      <div className="text-sm font-semibold text-gray-800 truncate">{value}</div>
      {sub && <div className="text-[11px] text-gray-400 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

function Row({ k, v, highlight, big }: { k: string; v: string; highlight?: boolean; big?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs ${highlight ? "text-amber-700 font-medium" : "text-amber-600/80"}`}>{k}</span>
      <span className={`${big ? "text-lg font-bold text-amber-700" : highlight ? "text-sm font-semibold text-amber-800" : "text-sm font-mono text-amber-900"}`}>
        {v}
      </span>
    </div>
  );
}
