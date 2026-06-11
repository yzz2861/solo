import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dayjs from 'dayjs';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  MapPin,
  AlertTriangle,
  X,
  Check,
  Trash2,
  DollarSign,
  Upload,
  ImageOff,
} from 'lucide-react';
import {
  Button,
  Select,
  Input,
  Textarea,
  Modal,
  Badge,
  Card,
  AlertBanner,
  ImagePreview,
  Loading,
  EmptyState,
} from '@/components/ui';
import { api } from '@/api';
import { useAppStore } from '@/store';
import {
  getWeekDates,
  getTimeSlots,
  formatTime,
  formatDateTime,
  STATUS_LABELS,
  imageToBase64,
  cn,
} from '@/utils/helpers';
import type {
  BookingDetail,
  BookingInput,
  DepositInput,
  ConflictCheckResult,
  BookingStatus,
} from '@shared/types';

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const TIME_SLOTS = getTimeSlots();
const HOUR_HEIGHT = 60;

interface DepositModalState {
  isOpen: boolean;
  bookingId: number | null;
}

export default function Bookings() {
  const {
    bookings,
    artists,
    clients,
    bodyParts,
    deposits,
    loading,
    selectedArtistId,
    currentDate,
    loadBookings,
    loadArtists,
    loadClients,
    loadBodyParts,
    loadDeposits,
    setSelectedArtist,
    setCurrentDate,
    setLoading,
  } = useAppStore();

  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<BookingDetail | null>(null);
  const [depositModal, setDepositModal] = useState<DepositModalState>({
    isOpen: false,
    bookingId: null,
  });

  const [formData, setFormData] = useState<Partial<BookingInput>>({
    client_id: 0,
    artist_id: 0,
    body_part_id: null,
    start_time: '',
    end_time: '',
    estimated_duration: 120,
    status: 'pending_deposit',
    client_notes: '',
    internal_notes: '',
    is_sensitive_area: 0,
  });

  const [conflictResult, setConflictResult] = useState<ConflictCheckResult | null>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [depositForm, setDepositForm] = useState<Partial<DepositInput>>({
    amount: 0,
    payment_method: 'wechat',
    paid_at: dayjs().format('YYYY-MM-DD HH:mm'),
    notes: '',
    screenshot_path: null,
  });
  const [depositScreenshotPreview, setDepositScreenshotPreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
  const selectedArtist = useMemo(
    () => artists.find((a) => a.id === selectedArtistId) || null,
    [artists, selectedArtistId]
  );
  const selectedBodyPart = useMemo(
    () => bodyParts.find((b) => b.id === formData.body_part_id) || null,
    [bodyParts, formData.body_part_id]
  );

  const artistOptions = useMemo(
    () => [
      { value: 0, label: '全部师傅' },
      ...artists.map((a) => ({ value: a.id, label: a.name })),
    ],
    [artists]
  );

  const clientOptions = useMemo(
    () => clients.map((c) => ({ value: c.id, label: c.name })),
    [clients]
  );

  const bodyPartOptions = useMemo(
    () =>
      bodyParts.map((b) => ({
        value: b.id,
        label: b.is_sensitive ? `${b.name} (敏感)` : b.name,
      })),
    [bodyParts]
  );

  const statusOptions: { value: BookingStatus; label: string }[] = [
    { value: 'pending_deposit', label: '待付定金' },
    { value: 'confirmed', label: '已确认' },
    { value: 'completed', label: '已完成' },
    { value: 'cancelled', label: '已取消' },
  ];

  const paymentMethodOptions = [
    { value: 'wechat', label: '微信支付' },
    { value: 'alipay', label: '支付宝' },
    { value: 'cash', label: '现金' },
    { value: 'bank', label: '银行转账' },
  ];

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (selectedArtistId && b.artist_id !== selectedArtistId) return false;
      const bookingDate = dayjs(b.start_time).format('YYYY-MM-DD');
      const weekStart = dayjs(weekDates[0]).format('YYYY-MM-DD');
      const weekEnd = dayjs(weekDates[6]).format('YYYY-MM-DD');
      return bookingDate >= weekStart && bookingDate <= weekEnd;
    });
  }, [bookings, selectedArtistId, weekDates]);

  useEffect(() => {
    const init = async () => {
      await Promise.all([loadArtists(), loadClients(), loadBodyParts()]);
    };
    init();
  }, [loadArtists, loadClients, loadBodyParts]);

  useEffect(() => {
    const startDate = dayjs(weekDates[0]).format('YYYY-MM-DD');
    const endDate = dayjs(weekDates[6]).format('YYYY-MM-DD');
    loadBookings({
      dateRange: [startDate, endDate],
      ...(selectedArtistId ? { artistId: selectedArtistId } : {}),
    });
  }, [currentDate, selectedArtistId, loadBookings, weekDates]);

  const checkConflict = useCallback(async () => {
    if (!formData.artist_id || !formData.start_time || !formData.end_time) {
      setConflictResult(null);
      return;
    }

    setCheckingConflict(true);
    try {
      const result = await api.bookings.checkConflict(
        formData.artist_id,
        formData.start_time,
        formData.end_time,
        editingBooking?.id
      );
      setConflictResult(result);
    } catch (error) {
      console.error('Conflict check error:', error);
    } finally {
      setCheckingConflict(false);
    }
  }, [formData.artist_id, formData.start_time, formData.end_time, editingBooking?.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkConflict();
    }, 300);
    return () => clearTimeout(timer);
  }, [checkConflict]);

  const handlePrevWeek = () => {
    setCurrentDate(dayjs(currentDate).subtract(7, 'day').format('YYYY-MM-DD'));
  };

  const handleNextWeek = () => {
    setCurrentDate(dayjs(currentDate).add(7, 'day').format('YYYY-MM-DD'));
  };

  const handleToday = () => {
    setCurrentDate(dayjs().format('YYYY-MM-DD'));
  };

  const openBookingModal = (booking?: BookingDetail) => {
    if (booking) {
      setEditingBooking(booking);
      setFormData({
        client_id: booking.client_id,
        artist_id: booking.artist_id,
        body_part_id: booking.body_part_id,
        start_time: booking.start_time,
        end_time: booking.end_time,
        estimated_duration: booking.estimated_duration || 120,
        status: booking.status,
        client_notes: booking.client_notes || '',
        internal_notes: booking.internal_notes || '',
        is_sensitive_area: booking.is_sensitive_area,
      });
    } else {
      setEditingBooking(null);
      const defaultStartTime = dayjs().hour(10).minute(0).second(0);
      setFormData({
        client_id: 0,
        artist_id: selectedArtistId || artists[0]?.id || 0,
        body_part_id: null,
        start_time: defaultStartTime.format('YYYY-MM-DD HH:mm'),
        end_time: defaultStartTime.add(2, 'hour').format('YYYY-MM-DD HH:mm'),
        estimated_duration: 120,
        status: 'pending_deposit',
        client_notes: '',
        internal_notes: '',
        is_sensitive_area: 0,
      });
    }
    setConflictResult(null);
    setFormErrors({});
    setBookingModalOpen(true);
  };

  const closeBookingModal = () => {
    setBookingModalOpen(false);
    setEditingBooking(null);
    setConflictResult(null);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.client_id) {
      errors.client_id = '请选择客户';
    }
    if (!formData.artist_id) {
      errors.artist_id = '请选择师傅';
    }
    if (!formData.start_time) {
      errors.start_time = '请选择开始时间';
    }
    if (!formData.end_time) {
      errors.end_time = '请选择结束时间';
    }
    if (formData.start_time && formData.end_time) {
      if (dayjs(formData.end_time).isBefore(dayjs(formData.start_time))) {
        errors.end_time = '结束时间不能早于开始时间';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveBooking = async () => {
    if (!validateForm()) return;
    if (conflictResult?.hasConflict) {
      const confirmSave = window.confirm(
        '检测到时段冲突，确定要保存吗？'
      );
      if (!confirmSave) return;
    }

    setLoading('saveBooking', true);
    try {
      const saveData: BookingInput = {
        client_id: formData.client_id!,
        artist_id: formData.artist_id!,
        body_part_id: formData.body_part_id || null,
        start_time: formData.start_time!,
        end_time: formData.end_time!,
        estimated_duration: formData.estimated_duration || null,
        status: formData.status as BookingStatus,
        client_notes: formData.client_notes || null,
        internal_notes: formData.internal_notes || null,
        is_sensitive_area: selectedBodyPart?.is_sensitive ? 1 : 0,
      };

      if (editingBooking) {
        saveData.id = editingBooking.id;
      }

      await api.bookings.save(saveData);

      const startDate = dayjs(weekDates[0]).format('YYYY-MM-DD');
      const endDate = dayjs(weekDates[6]).format('YYYY-MM-DD');
      await loadBookings({
        dateRange: [startDate, endDate],
        ...(selectedArtistId ? { artistId: selectedArtistId } : {}),
      });

      closeBookingModal();
    } catch (error) {
      console.error('Save booking error:', error);
    } finally {
      setLoading('saveBooking', false);
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    const confirm = window.confirm('确定要取消这个预约吗？');
    if (!confirm) return;

    setLoading('cancelBooking', true);
    try {
      await api.bookings.cancel(bookingId);
      const startDate = dayjs(weekDates[0]).format('YYYY-MM-DD');
      const endDate = dayjs(weekDates[6]).format('YYYY-MM-DD');
      await loadBookings({
        dateRange: [startDate, endDate],
        ...(selectedArtistId ? { artistId: selectedArtistId } : {}),
      });
    } catch (error) {
      console.error('Cancel booking error:', error);
    } finally {
      setLoading('cancelBooking', false);
    }
  };

  const openDepositModal = (bookingId: number) => {
    setDepositModal({ isOpen: true, bookingId });
    setDepositForm({
      booking_id: bookingId,
      amount: 0,
      payment_method: 'wechat',
      paid_at: dayjs().format('YYYY-MM-DD HH:mm'),
      notes: '',
      screenshot_path: null,
    });
    setDepositScreenshotPreview(null);
    loadDeposits(bookingId);
  };

  const closeDepositModal = () => {
    setDepositModal({ isOpen: false, bookingId: null });
    setDepositScreenshotPreview(null);
  };

  const handleUploadDepositScreenshot = async () => {
    try {
      const filePath = await api.dialog.openFile({
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] }],
      });
      if (!filePath || !depositModal.bookingId) return;

      setUploadingImage(true);
      const result = await api.deposits.uploadImage(filePath, depositModal.bookingId);
      setDepositForm((prev) => ({ ...prev, screenshot_path: result.savedPath }));

      const base64 = await imageToBase64(result.savedPath);
      setDepositScreenshotPreview(base64);
    } catch (error) {
      console.error('Upload screenshot error:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveDeposit = async () => {
    if (!depositModal.bookingId) return;
    if (!depositForm.amount || depositForm.amount <= 0) {
      alert('请输入有效金额');
      return;
    }

    setLoading('saveDeposit', true);
    try {
      await api.deposits.save({
        booking_id: depositModal.bookingId,
        amount: depositForm.amount!,
        payment_method: depositForm.payment_method || null,
        paid_at: depositForm.paid_at || null,
        notes: depositForm.notes || null,
        screenshot_path: depositForm.screenshot_path || null,
      });

      await loadDeposits(depositModal.bookingId);
      closeDepositModal();
    } catch (error) {
      console.error('Save deposit error:', error);
    } finally {
      setLoading('saveDeposit', false);
    }
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    setFormData((prev) => {
      if (!prev.end_time) {
        return { ...prev, start_time: newStart };
      }
      const start = dayjs(newStart);
      const end = dayjs(prev.end_time);
      if (end.isBefore(start)) {
        return {
          ...prev,
          start_time: newStart,
          end_time: start.add(prev.estimated_duration || 120, 'minute').format('YYYY-MM-DD HH:mm'),
        };
      }
      return { ...prev, start_time: newStart };
    });
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const duration = parseInt(e.target.value) || 0;
    setFormData((prev) => {
      if (!prev.start_time) return { ...prev, estimated_duration: duration };
      return {
        ...prev,
        estimated_duration: duration,
        end_time: dayjs(prev.start_time)
          .add(duration, 'minute')
          .format('YYYY-MM-DD HH:mm'),
      };
    });
  };

  const getBookingsForSlot = (
    artistId: number,
    date: Date,
    hour: number
  ): BookingDetail[] => {
    return filteredBookings.filter((b) => {
      if (b.artist_id !== artistId) return false;
      const bookingDate = dayjs(b.start_time).format('YYYY-MM-DD');
      const slotDate = dayjs(date).format('YYYY-MM-DD');
      if (bookingDate !== slotDate) return false;
      const bookingHour = dayjs(b.start_time).hour();
      const bookingEndHour = dayjs(b.end_time).hour();
      return hour >= bookingHour && hour < bookingEndHour;
    });
  };

  const renderBookingCard = (booking: BookingDetail) => {
    const start = dayjs(booking.start_time);
    const end = dayjs(booking.end_time);
    const duration = end.diff(start, 'minute');
    const topOffset = (start.minute() / 60) * HOUR_HEIGHT;
    const height = (duration / 60) * HOUR_HEIGHT - 4;

    return (
      <div
        key={booking.id}
        className="absolute left-1 right-1 z-10 group"
        style={{
          top: `${topOffset}px`,
          height: `${height}px`,
        }}
      >
        <Card
          hoverable
          className={cn(
            'h-full p-2 overflow-hidden',
            'border-l-4',
            booking.is_sensitive_area
              ? 'border-l-gold-500'
              : booking.status === 'cancelled'
                ? 'border-l-ink-500'
                : 'border-l-vermilion-500'
          )}
          onClick={() => openBookingModal(booking)}
        >
          <div className="flex flex-col h-full gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ivory-100 truncate">
                {booking.client_name}
              </span>
              <Badge
                size="sm"
                variant={
                  booking.status === 'confirmed'
                    ? 'success'
                    : booking.status === 'pending_deposit'
                      ? 'warning'
                      : booking.status === 'cancelled'
                        ? 'danger'
                        : 'info'
                }
                className="text-[10px]"
              >
                {STATUS_LABELS[booking.status]}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-ink-300">
              <Clock className="w-3 h-3" />
              <span>
                {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
              </span>
            </div>
            {booking.body_part_name && (
              <div className="flex items-center gap-1 text-[10px] text-ink-400">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{booking.body_part_name}</span>
              </div>
            )}
            {booking.design_image_path && (
              <div className="mt-auto">
                <ImageWithFallback
                  path={booking.design_image_path}
                  alt={booking.design_name || '图案'}
                  className="w-full h-8 rounded"
                />
              </div>
            )}
            {booking.is_sensitive_area && (
              <div className="absolute top-1 right-1">
                <AlertTriangle className="w-3 h-3 text-gold-400" />
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  };

  const renderTimeGrid = () => {
    const displayArtists = selectedArtist ? [selectedArtist] : artists;

    return (
      <div className="relative overflow-auto scrollbar-thin" style={{ maxHeight: '70vh' }}>
        <div className="relative min-w-max">
          <div className="sticky top-0 z-20 flex bg-ink-800 border-b border-ink-700">
            <div className="w-16 flex-shrink-0 border-r border-ink-700" />
            {displayArtists.map((artist) => (
              <div
                key={artist.id}
                className="flex-1 min-w-[150px] p-2 text-center border-r border-ink-700 last:border-r-0"
              >
                <div className="flex items-center justify-center gap-2">
                  <User className="w-4 h-4 text-ink-400" />
                  <span className="font-medium text-ivory-100">{artist.name}</span>
                </div>
                {artist.specialty && (
                  <span className="text-xs text-ink-400">{artist.specialty}</span>
                )}
              </div>
            ))}
          </div>

          <div className="sticky top-[73px] z-20 flex bg-ink-900 border-b border-ink-700">
            <div className="w-16 flex-shrink-0 border-r border-ink-700" />
            {displayArtists.map((artist) => (
              <div
                key={artist.id}
                className="flex-1 min-w-[150px] border-r border-ink-700 last:border-r-0"
              >
                <div className="grid grid-cols-7">
                  {weekDates.map((date) => {
                    const isToday =
                      dayjs(date).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');
                    return (
                      <div
                        key={date.toISOString()}
                        className={cn(
                          'p-1 text-center border-r border-ink-800 last:border-r-0',
                          isToday && 'bg-vermilion-700/20'
                        )}
                      >
                        <div className="text-[10px] text-ink-400">
                          {WEEKDAYS[date.getDay()]}
                        </div>
                        <div
                          className={cn(
                            'text-sm font-medium',
                            isToday ? 'text-vermilion-400' : 'text-ivory-200'
                          )}
                        >
                          {date.getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="relative">
            {TIME_SLOTS.map((timeSlot) => {
              const hour = parseInt(timeSlot.split(':')[0]);
              return (
                <div key={timeSlot} className="flex border-b border-ink-700/50">
                  <div
                    className="w-16 flex-shrink-0 p-1 text-xs text-ink-400 text-right pr-2 border-r border-ink-700"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                  >
                    {timeSlot}
                  </div>
                  {displayArtists.map((artist) => (
                    <div
                      key={artist.id}
                      className="flex-1 min-w-[150px] border-r border-ink-700 last:border-r-0"
                    >
                      <div className="grid grid-cols-7 h-full">
                        {weekDates.map((date) => {
                          const slotBookings = getBookingsForSlot(
                            artist.id,
                            date,
                            hour
                          );
                          const dateStr = dayjs(date).format('YYYY-MM-DD');
                          const isToday =
                            dateStr === dayjs().format('YYYY-MM-DD');
                          return (
                            <div
                              key={`${artist.id}-${dateStr}-${hour}`}
                              className={cn(
                                'relative border-r border-ink-800 last:border-r-0',
                                isToday && hour === dayjs().hour()
                                  ? 'bg-vermilion-700/10'
                                  : 'hover:bg-ink-700/30'
                              )}
                              style={{ height: `${HOUR_HEIGHT}px` }}
                            >
                              {hour === dayjs().hour() &&
                                isToday &&
                                dayjs().minute() > 0 && (
                                  <div
                                    className="absolute left-0 right-0 h-0.5 bg-vermilion-500 z-20"
                                    style={{
                                      top: `${(dayjs().minute() / 60) * HOUR_HEIGHT}px`,
                                    }}
                                  />
                                )}
                              {slotBookings
                                .filter(
                                  (b) =>
                                    dayjs(b.start_time).hour() === hour
                                )
                                .map(renderBookingCard)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-slide-up h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl font-bold text-ivory-100">预约管理</h2>
        <Button
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => openBookingModal()}
        >
          新增预约
        </Button>
      </div>

      <Card decorativeBorder className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-ink-700">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Select
                options={artistOptions}
                value={selectedArtistId || 0}
                onChange={(e) => setSelectedArtist(parseInt(e.target.value) || null)}
                className="w-40"
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<ChevronLeft className="w-4 h-4" />}
                  onClick={handlePrevWeek}
                >
                  上一周
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleToday}
                >
                  今天
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                  onClick={handleNextWeek}
                >
                  下一周
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-ink-300">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">
                {dayjs(weekDates[0]).format('YYYY-MM-DD')} ~{' '}
                {dayjs(weekDates[6]).format('YYYY-MM-DD')}
              </span>
            </div>
          </div>
        </div>

        {loading.bookings ? (
          <div className="flex-1 flex items-center justify-center">
            <Loading text="加载预约中..." />
          </div>
        ) : artists.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              title="暂无师傅数据"
              description="请先在设置中添加师傅信息"
            />
          </div>
        ) : (
          renderTimeGrid()
        )}
      </Card>

      <Modal
        isOpen={bookingModalOpen}
        onClose={closeBookingModal}
        title={editingBooking ? '编辑预约' : '新增预约'}
        size="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            {editingBooking && editingBooking.status !== 'cancelled' && (
              <Button
                variant="danger"
                leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={() => handleCancelBooking(editingBooking.id)}
                loading={loading.cancelBooking}
              >
                取消预约
              </Button>
            )}
            <div className="flex items-center gap-3 ml-auto">
              <Button variant="secondary" onClick={closeBookingModal}>
                取消
              </Button>
              <Button
                onClick={handleSaveBooking}
                loading={loading.saveBooking}
                leftIcon={<Check className="w-4 h-4" />}
              >
                保存
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {conflictResult?.hasConflict && (
            <AlertBanner
              level="error"
              title="时段冲突"
              message={
                <div>
                  <p className="mb-2">该时段与以下预约冲突：</p>
                  <ul className="list-disc list-inside space-y-1">
                    {conflictResult.conflictBookings.map((b) => (
                      <li key={b.id}>
                        {b.client_name} - {formatTime(b.start_time)} ~{' '}
                        {formatTime(b.end_time)}
                      </li>
                    ))}
                  </ul>
                </div>
              }
            />
          )}

          {checkingConflict && (
            <div className="flex items-center gap-2 text-ink-400 text-sm">
              <Loading size="sm" text="检测冲突中..." />
            </div>
          )}

          {selectedBodyPart?.is_sensitive && (
            <AlertBanner
              level="warning"
              title="敏感部位提醒"
              message={`${selectedBodyPart.name} 属于敏感部位，请特别注意客户隐私和沟通。`}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="客户"
              options={clientOptions}
              value={formData.client_id || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  client_id: parseInt(e.target.value),
                }))
              }
              placeholder="请选择客户"
              error={formErrors.client_id}
            />
            <Select
              label="师傅"
              options={artists.map((a) => ({ value: a.id, label: a.name }))}
              value={formData.artist_id || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  artist_id: parseInt(e.target.value),
                }))
              }
              placeholder="请选择师傅"
              error={formErrors.artist_id}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="身体部位"
              options={bodyPartOptions}
              value={formData.body_part_id || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  body_part_id: parseInt(e.target.value) || null,
                }))
              }
              placeholder="请选择部位"
            />
            <Select
              label="状态"
              options={statusOptions}
              value={formData.status}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  status: e.target.value as BookingStatus,
                }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="开始时间"
              type="datetime-local"
              value={
                formData.start_time
                  ? dayjs(formData.start_time).format('YYYY-MM-DDTHH:mm')
                  : ''
              }
              onChange={handleStartTimeChange}
              error={formErrors.start_time}
            />
            <Input
              label="结束时间"
              type="datetime-local"
              value={
                formData.end_time
                  ? dayjs(formData.end_time).format('YYYY-MM-DDTHH:mm')
                  : ''
              }
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  end_time: e.target.value.replace('T', ' '),
                }))
              }
              error={formErrors.end_time}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="预计时长（分钟）"
              type="number"
              value={formData.estimated_duration || ''}
              onChange={handleDurationChange}
              min="30"
              step="30"
            />
            {editingBooking && (
              <Button
                variant="secondary"
                leftIcon={<DollarSign className="w-4 h-4" />}
                onClick={() => openDepositModal(editingBooking.id)}
                className="self-end"
              >
                定金管理
              </Button>
            )}
          </div>

          <Textarea
            label="客户备注"
            value={formData.client_notes || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                client_notes: e.target.value,
              }))
            }
            placeholder="客户特殊要求等"
            rows={2}
          />

          <Textarea
            label="内部备注"
            value={formData.internal_notes || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                internal_notes: e.target.value,
              }))
            }
            placeholder="仅内部可见的备注"
            rows={2}
          />
        </div>
      </Modal>

      <Modal
        isOpen={depositModal.isOpen}
        onClose={closeDepositModal}
        title="定金管理"
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={closeDepositModal}>
              取消
            </Button>
            <Button
              onClick={handleSaveDeposit}
              loading={loading.saveDeposit}
              leftIcon={<Check className="w-4 h-4" />}
            >
              保存定金
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {deposits.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-ivory-300 mb-2">已有定金记录</h4>
              <div className="space-y-2">
                {deposits.map((deposit) => (
                  <div
                    key={deposit.id}
                    className="p-3 bg-ink-900 rounded border border-ink-700"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-vermilion-400 font-medium">
                        ¥{deposit.amount}
                      </span>
                      <Badge size="sm" variant="success">
                        {deposit.payment_method || '未指定'}
                      </Badge>
                    </div>
                    {deposit.paid_at && (
                      <div className="text-xs text-ink-400 mt-1">
                        支付时间: {formatDateTime(deposit.paid_at)}
                      </div>
                    )}
                    {deposit.notes && (
                      <div className="text-xs text-ink-300 mt-1">
                        备注: {deposit.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="金额（元）"
              type="number"
              value={depositForm.amount || ''}
              onChange={(e) =>
                setDepositForm((prev) => ({
                  ...prev,
                  amount: parseFloat(e.target.value) || 0,
                }))
              }
              placeholder="0.00"
              min="0"
              step="0.01"
            />
            <Select
              label="支付方式"
              options={paymentMethodOptions}
              value={depositForm.payment_method || ''}
              onChange={(e) =>
                setDepositForm((prev) => ({
                  ...prev,
                  payment_method: e.target.value,
                }))
              }
            />
          </div>

          <Input
            label="支付时间"
            type="datetime-local"
            value={
              depositForm.paid_at
                ? dayjs(depositForm.paid_at).format('YYYY-MM-DDTHH:mm')
                : ''
            }
            onChange={(e) =>
              setDepositForm((prev) => ({
                ...prev,
                paid_at: e.target.value.replace('T', ' '),
              }))
            }
          />

          <div>
            <label className="block text-sm font-medium text-ivory-300 mb-1.5">
              支付截图
            </label>
            {depositScreenshotPreview ? (
              <div className="relative">
                <ImagePreview
                  src={depositScreenshotPreview}
                  alt="支付截图"
                  aspectRatio="aspect-video"
                />
                <button
                  onClick={() => {
                    setDepositScreenshotPreview(null);
                    setDepositForm((prev) => ({
                      ...prev,
                      screenshot_path: null,
                    }));
                  }}
                  className="absolute top-2 right-2 p-1 bg-ink-900/80 rounded text-ink-400 hover:text-ivory-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Button
                variant="secondary"
                onClick={handleUploadDepositScreenshot}
                loading={uploadingImage}
                leftIcon={<Upload className="w-4 h-4" />}
                className="w-full"
              >
                上传支付截图
              </Button>
            )}
          </div>

          <Textarea
            label="备注"
            value={depositForm.notes || ''}
            onChange={(e) =>
              setDepositForm((prev) => ({
                ...prev,
                notes: e.target.value,
              }))
            }
            placeholder="相关备注信息"
            rows={2}
          />
        </div>
      </Modal>
    </div>
  );
}

function ImageWithFallback({
  path,
  alt,
  className,
}: {
  path: string;
  alt: string;
  className?: string;
}) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadImage = async () => {
      try {
        const base64 = await imageToBase64(path);
        if (mounted) {
          if (base64) {
            setImageSrc(base64);
          } else {
            setHasError(true);
          }
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setHasError(true);
          setLoading(false);
        }
      }
    };
    loadImage();
    return () => {
      mounted = false;
    };
  }, [path]);

  if (loading) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-ink-900 rounded',
          className
        )}
      >
        <Loading size="sm" />
      </div>
    );
  }

  if (hasError || !imageSrc) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-ink-900 rounded text-ink-500',
          className
        )}
        title="图片加载失败"
      >
        <ImageOff className="w-4 h-4" />
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={cn('object-cover rounded', className)}
    />
  );
}
