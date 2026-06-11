import dayjs from 'dayjs';
import { getBookings, getTodayBookings, checkTimeConflict } from './bookings';
import { checkAllImages } from './designs';
import type { Alert, BookingDetail, ImageCheckResult } from '../../shared/types';

export async function generateAllAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = [];

  const imageCheckResult = checkAllImages();
  alerts.push(...generateImageAlerts(imageCheckResult));

  const todayBookings = getTodayBookings();
  alerts.push(...generateTodayBookingAlerts(todayBookings));

  const pendingDepositBookings = getBookings({ status: 'pending_deposit' });
  alerts.push(...generateDepositAlerts(pendingDepositBookings));

  alerts.push(...generateRevisionAlerts(todayBookings));
  alerts.push(...generateAllergyAlerts(todayBookings));

  return alerts;
}

function generateImageAlerts(result: ImageCheckResult): Alert[] {
  return result.invalid.map((item) => ({
    id: `image_${item.versionId}`,
    type: 'image_invalid' as const,
    level: 'error' as const,
    message: `图案"${item.designName}"的图片路径已失效，请重新上传`,
    relatedId: item.designId,
    relatedType: 'design' as const,
  }));
}

function generateTodayBookingAlerts(bookings: BookingDetail[]): Alert[] {
  const alerts: Alert[] = [];

  for (const booking of bookings) {
    if (booking.body_part_is_sensitive || booking.is_sensitive_area) {
      alerts.push({
        id: `sensitive_${booking.id}`,
        type: 'sensitive_area' as const,
        level: 'warning' as const,
        message: `客户"${booking.client_name}"的${booking.body_part_name || '部位'}属于敏感区域，需准备遮挡措施`,
        relatedId: booking.id,
        relatedType: 'booking' as const,
      });
    }

    const conflictResult = checkTimeConflict(
      booking.artist_id,
      booking.start_time,
      booking.end_time,
      booking.id
    );
    if (conflictResult.hasConflict) {
      alerts.push({
        id: `conflict_${booking.id}`,
        type: 'time_conflict' as const,
        level: 'error' as const,
        message: `师傅"${booking.artist_name}"在${dayjs(booking.start_time).format('HH:mm')}时段存在预约冲突`,
        relatedId: booking.id,
        relatedType: 'booking' as const,
      });
    }
  }

  return alerts;
}

function generateDepositAlerts(bookings: BookingDetail[]): Alert[] {
  const alerts: Alert[] = [];
  const now = dayjs();

  for (const booking of bookings) {
    const bookingDate = dayjs(booking.start_time);
    const daysUntil = bookingDate.diff(now, 'day');

    if (daysUntil <= 3 && daysUntil >= 0) {
      alerts.push({
        id: `deposit_${booking.id}`,
        type: 'deposit_pending' as const,
        level: 'warning' as const,
        message: `客户"${booking.client_name}"的预约( ${bookingDate.format('MM-DD HH:mm')} )还有${daysUntil}天，仍未支付定金`,
        relatedId: booking.id,
        relatedType: 'booking' as const,
      });
    }
  }

  return alerts;
}

function generateRevisionAlerts(bookings: BookingDetail[]): Alert[] {
  return bookings
    .filter((b) => b.revision_count >= 3)
    .map((booking) => ({
      id: `revision_${booking.id}`,
      type: 'revision_high' as const,
      level: 'info' as const,
      message: `客户"${booking.client_name}"的图案已改稿${booking.revision_count}次，请确认最终版本`,
      relatedId: booking.id,
      relatedType: 'booking' as const,
    }));
}

function generateAllergyAlerts(bookings: BookingDetail[]): Alert[] {
  return bookings
    .filter((b) => b.client_allergies || b.client_is_sensitive_skin)
    .map((booking) => ({
      id: `allergy_${booking.id}`,
      type: 'allergy_warning' as const,
      level: 'warning' as const,
      message: `客户"${booking.client_name}"有过敏史${booking.client_is_sensitive_skin ? '或敏感肌肤' : ''}，请注意：${booking.client_allergies || '敏感肌肤'}`,
      relatedId: booking.id,
      relatedType: 'booking' as const,
    }));
}

export function getAlertTypeLabel(type: Alert['type']): string {
  const labels: Record<Alert['type'], string> = {
    image_invalid: '图片失效',
    time_conflict: '时段冲突',
    deposit_pending: '待付定金',
    sensitive_area: '敏感部位',
    revision_high: '多次改稿',
    allergy_warning: '过敏提醒',
  };
  return labels[type];
}

export default { generateAllAlerts, getAlertTypeLabel };
