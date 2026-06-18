import type { Booking, Member, Court } from "@/types";
import { calculateRefund, minutesBetween } from "@/engine/refund";

export interface NotifyContent {
  sms: string;
  wechat: string;
}

export function generateNotify(
  booking: Booking,
  member: Member | undefined,
  originalCourt: Court | undefined,
  newCourt: Court | undefined,
  weatherRemark: string | null
): NotifyContent {
  const name = member?.name ?? "尊敬的会员";
  const levelText =
    member?.level === "gold"
      ? "（金卡会员，优先安排）"
      : member?.level === "silver"
      ? "（银卡会员）"
      : "";
  const courtName = originalCourt?.name ?? "室外场";
  const period = `${booking.date} ${booking.startTime}-${booking.endTime}`;
  const weather = weatherRemark ? `天气：${weatherRemark}。` : "因突降暴雨影响室外场地。";

  const refund = calculateRefund(
    booking.elapsedMinutes,
    minutesBetween(booking.startTime, booking.endTime),
    booking.paidAmount
  );

  let sms = "";
  let wechat = "";

  if (booking.status === "switched" && newCourt) {
    sms = `【XX网球馆】${name}${levelText}您好！${weather}您预定的${courtName}（${period}）已更换为${newCourt.name}，请提前10分钟到场。咨询电话XXX-XXXX。退订回T`;
    wechat = `🎾 ${name} 您好！\n\n由于今日突发降雨，${weather.replace(/。$/, "")}，我们为您调整了场地安排：\n\n✅ <b>变更结果</b>：换场至室内\n📌 <b>原场地</b>：${courtName}\n🏠 <b>新场地</b>：${newCourt.name}\n⏰ <b>时段</b>：${period}\n💰 <b>原付款</b>：¥${booking.paidAmount}（无需补费）\n\n如有疑问请致电前台，感谢您的理解与支持！🌟`;
  } else if (booking.status === "rescheduled") {
    sms = `【XX网球馆】${name}${levelText}您好！${weather}您的${courtName}（${period}）已延期至${booking.rescheduleToDate ?? "新日期"}，具体时段请联系前台确认。咨询XXX-XXXX。退订回T`;
    wechat = `📅 ${name} 您好！\n\n由于今日突发降雨，${weather.replace(/。$/, "")}，我们为您办理了延期：\n\n✅ <b>变更结果</b>：已延期\n📌 <b>原场地</b>：${courtName}\n⏰ <b>原定时段</b>：${period}\n🗓 <b>延期至</b>：${booking.rescheduleToDate ?? "请与前台确认具体日期"}\n💰 <b>付款</b>：¥${booking.paidAmount}（保留原金额）\n📝 <b>改期次数</b>：${member?.rescheduleCount ?? 0}次（7天内上限3次）\n\n请您提前2天联系前台确认具体时段，祝您生活愉快！🌈`;
  } else if (booking.status === "refunded") {
    sms = `【XX网球馆】${name}${levelText}您好！${weather}您的${courtName}（${period}）已办理退款¥${booking.refundAmount}（${refund.tier}），3-5工作日原路退回。咨询XXX-XXXX。退订回T`;
    wechat = `💰 ${name} 您好！\n\n由于今日突发降雨，${weather.replace(/。$/, "")}，我们已为您办理退款：\n\n✅ <b>变更结果</b>：已退款\n📌 <b>原场地</b>：${courtName}\n⏰ <b>原定时段</b>：${period}\n💵 <b>原付款</b>：¥${booking.paidAmount}\n💸 <b>退款金额</b>：¥${booking.refundAmount}（${Math.round(refund.refundRatio * 100)}%）\n📖 <b>退款规则</b>：${refund.tier}\n⏳ <b>到账时间</b>：3-5个工作日原路退回\n\n如有疑问请致电前台，期待下次为您服务！🙏`;
  } else if (booking.status === "stopped") {
    sms = `【XX网球馆】${name}${levelText}您好！${weather}您的${courtName}（${period}）已标记停场，前台将尽快与您联系确认换场/延期/退款方案，请保持电话畅通。`;
    wechat = `⏸ ${name} 您好！\n\n由于今日降雨，您的预订已临时标记停场：\n\n📌 <b>场地</b>：${courtName}\n⏰ <b>时段</b>：${period}\n\n前台将在15分钟内与您联系，请在以下方案中做出选择：\n1️⃣ 🔄 换场至室内场（如有空余）\n2️⃣ 📅 延期至其他日期\n3️⃣ 💰 按规则办理退款\n\n天气多变，感谢您的耐心配合！☔`;
  }

  return { sms, wechat };
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      document.body.removeChild(ta);
      return false;
    }
  }
}
