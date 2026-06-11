import { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Phone,
  MapPin,
  AlertTriangle,
  CheckSquare,
  Square,
  Eye,
  FileText,
  Sparkles,
  User,
  Users,
  CheckCircle2,
  Wallet,
  CircleCheck,
} from 'lucide-react';
import { api } from '@/api';
import { useAppStore } from '@/store';
import {
  formatTime,
  STATUS_LABELS,
  getStatusBadgeClass,
  imageToBase64,
  cn,
} from '@/utils/helpers';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Modal,
  AlertBanner,
  Loading,
  EmptyState,
  ImagePreview,
} from '@/components/ui';
import type { BookingDetail } from '@shared/types';

interface LocalBookingState {
  disinfectionConfirmed: boolean;
  designConfirmed: boolean;
}

export default function TodayView() {
  const { artists, loadArtists, loadBookings } = useAppStore();
  const [todayBookings, setTodayBookings] = useState<BookingDetail[]>([]);
  const [selectedArtistId, setSelectedArtistId] = useState<number | null>(null);
  const [localStates, setLocalStates] = useState<Record<number, LocalBookingState>>({});
  const [loading, setLoading] = useState(true);
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; booking: BookingDetail | null }>({
    isOpen: false,
    booking: null,
  });
  const [exportingId, setExportingId] = useState<number | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [imagePreviews, setImagePreviews] = useState<Record<number, string | null>>({});

  const fetchTodayBookings = useCallback(async (artistId?: number) => {
    setLoading(true);
    try {
      const bookings = await api.bookings.today(artistId ?? undefined);
      const sorted = [...bookings].sort((a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      setTodayBookings(sorted);

      const previews: Record<number, string | null> = {};
      for (const booking of sorted) {
        if (booking.design_image_path) {
          previews[booking.id] = await imageToBase64(booking.design_image_path);
        }
      }
      setImagePreviews(previews);
    } catch (error) {
      console.error('Failed to load today bookings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArtists();
  }, [loadArtists]);

  useEffect(() => {
    fetchTodayBookings(selectedArtistId ?? undefined);
  }, [selectedArtistId, fetchTodayBookings]);

  const toggleLocalState = (bookingId: number, field: keyof LocalBookingState) => {
    setLocalStates((prev) => ({
      ...prev,
      [bookingId]: {
        ...prev[bookingId],
        disinfectionConfirmed: prev[bookingId]?.disinfectionConfirmed ?? false,
        designConfirmed: prev[bookingId]?.designConfirmed ?? false,
        [field]: !prev[bookingId]?.[field],
      },
    }));
  };

  const handleExportConfirmation = async (bookingId: number) => {
    setExportingId(bookingId);
    try {
      const result = await api.export.confirmation(bookingId, 'client');
      if (result.success) {
        setAlert({ type: 'success', message: `确认单已导出: ${result.filePath}` });
      } else {
        setAlert({ type: 'error', message: '导出失败，请重试' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: '导出失败，请重试' });
    } finally {
      setExportingId(null);
    }
  };

  const stats = {
    total: todayBookings.length,
    confirmed: todayBookings.filter((b) => b.status === 'confirmed').length,
    pendingDeposit: todayBookings.filter((b) => b.status === 'pending_deposit').length,
    completed: todayBookings.filter((b) => b.status === 'completed').length,
  };

  return (
    <div className="animate-slide-up space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-ivory-100">当日前台</h2>
        <div className="text-ink-400 text-sm">
          {new Date().toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          })}
        </div>
      </div>

      {alert && (
        <AlertBanner
          level={alert.type}
          message={alert.message}
          dismissible
          onDismiss={() => setAlert(null)}
        />
      )}

      <Card decorativeBorder>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedArtistId(null)}
              className={cn(
                'flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200',
                selectedArtistId === null
                  ? 'bg-vermilion-700 border-vermilion-600 text-ivory-100'
                  : 'bg-ink-800 border-ink-700 text-ink-300 hover:border-ink-600 hover:text-ivory-200'
              )}
            >
              <Users className="w-4 h-4" />
              <span>全部师傅</span>
            </button>
            {artists.map((artist) => (
              <button
                key={artist.id}
                onClick={() => setSelectedArtistId(artist.id)}
                className={cn(
                  'flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200',
                  selectedArtistId === artist.id
                    ? 'bg-vermilion-700 border-vermilion-600 text-ivory-100'
                    : 'bg-ink-800 border-ink-700 text-ink-300 hover:border-ink-600 hover:text-ivory-200'
                )}
              >
                <User className="w-4 h-4" />
                <span>{artist.name}</span>
                {artist.specialty && (
                  <span className="text-xs opacity-70">· {artist.specialty}</span>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-ink-800 to-ink-900">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-ink-700 rounded-lg">
                <Users className="w-5 h-5 text-ivory-300" />
              </div>
              <div>
                <div className="text-2xl font-bold text-ivory-100">{stats.total}</div>
                <div className="text-sm text-ink-400">今日总预约</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-military-800/50 to-ink-900">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-military-700/50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-military-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-military-400">{stats.confirmed}</div>
                <div className="text-sm text-ink-400">已确认</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gold-800/30 to-ink-900">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gold-700/30 rounded-lg">
                <Wallet className="w-5 h-5 text-gold-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gold-400">{stats.pendingDeposit}</div>
                <div className="text-sm text-ink-400">待付定金</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-ink-700/50 to-ink-900">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-ink-600/50 rounded-lg">
                <CircleCheck className="w-5 h-5 text-ivory-300" />
              </div>
              <div>
                <div className="text-2xl font-bold text-ivory-300">{stats.completed}</div>
                <div className="text-sm text-ink-400">已完成</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card decorativeBorder className="min-h-[500px]">
        <CardContent className="py-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loading size="lg" />
            </div>
          ) : todayBookings.length === 0 ? (
            <EmptyState
              title="今日暂无预约"
              description="选择不同的师傅或查看其他日期"
              icon={<Sparkles className="w-12 h-12 text-ink-500" />}
            />
          ) : (
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-px bg-ink-700" />

              <div className="space-y-6">
                {todayBookings.map((booking) => {
                  const localState = localStates[booking.id] ?? {
                    disinfectionConfirmed: false,
                    designConfirmed: false,
                  };
                  const hasAllergyWarning = booking.client_allergies || booking.client_is_sensitive_skin;
                  const isSensitivePart = booking.body_part_is_sensitive === 1 || booking.is_sensitive_area === 1;

                  return (
                    <div key={booking.id} className="relative pl-16">
                      <div className="absolute left-4 top-6 w-4 h-4 rounded-full bg-ink-800 border-2 border-ink-600 z-10" />
                      <div className="absolute left-[22px] top-[26px] w-2 h-2 rounded-full bg-vermilion-600" />

                      <Card hoverable className="transition-all duration-300">
                        <CardContent className="p-4">
                          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                            <div className="flex items-center gap-4 flex-shrink-0">
                              <div className="text-center">
                                <div className="flex items-center gap-1 text-vermilion-400">
                                  <Clock className="w-4 h-4" />
                                  <span className="text-xl font-bold font-mono">
                                    {formatTime(booking.start_time)}
                                  </span>
                                </div>
                                <div className="text-xs text-ink-500 mt-1">
                                  约 {booking.estimated_duration || '?'} 分钟
                                </div>
                              </div>

                              <div className="hidden lg:block w-px h-16 bg-ink-700" />

                              {imagePreviews[booking.id] ? (
                                <ImagePreview
                                  src={imagePreviews[booking.id]!}
                                  alt={booking.design_name || '图案'}
                                  className="w-16 h-16 rounded-lg object-cover border border-ink-700"
                                />
                              ) : (
                                <div className="w-16 h-16 rounded-lg bg-ink-700 flex items-center justify-center border border-ink-600">
                                  <Sparkles className="w-6 h-6 text-ink-500" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="font-semibold text-ivory-100">
                                  {booking.client_name}
                                </span>
                                {booking.client_phone && (
                                  <a
                                    href={`tel:${booking.client_phone}`}
                                    className="flex items-center gap-1 text-sm text-ink-400 hover:text-ivory-300 transition-colors"
                                  >
                                    <Phone className="w-3 h-3" />
                                    {booking.client_phone}
                                  </a>
                                )}
                                <span className={getStatusBadgeClass(booking.status)}>
                                  {STATUS_LABELS[booking.status]}
                                </span>
                                {isSensitivePart && (
                                  <Badge variant="danger" size="sm">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    敏感部位
                                  </Badge>
                                )}
                                {hasAllergyWarning && (
                                  <Badge variant="warning" size="sm" title="过敏史/敏感肌肤">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    过敏警告
                                  </Badge>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-4 text-sm text-ink-300">
                                <div className="flex items-center gap-1">
                                  <User className="w-4 h-4 text-ink-500" />
                                  <span>{booking.artist_name}</span>
                                </div>
                                <div
                                  className={cn(
                                    'flex items-center gap-1',
                                    isSensitivePart && 'text-vermilion-400'
                                  )}
                                >
                                  <MapPin className="w-4 h-4 text-ink-500" />
                                  <span>{booking.body_part_name || '未指定部位'}</span>
                                </div>
                                {booking.design_name && (
                                  <div className="flex items-center gap-1">
                                    <Sparkles className="w-4 h-4 text-ink-500" />
                                    <span className="truncate max-w-[200px]">
                                      {booking.design_name}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 lg:gap-4 pt-2 lg:pt-0 border-t lg:border-t-0 border-ink-700 lg:border-0">
                              <div className="flex flex-wrap gap-4 flex-1 lg:flex-none">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                  {localState.disinfectionConfirmed ? (
                                    <CheckSquare className="w-5 h-5 text-military-500" />
                                  ) : (
                                    <Square className="w-5 h-5 text-ink-500 group-hover:text-ivory-400 transition-colors" />
                                  )}
                                  <span
                                    className={cn(
                                      'text-sm',
                                      localState.disinfectionConfirmed
                                        ? 'text-military-400 line-through'
                                        : 'text-ink-300'
                                    )}
                                  >
                                    消毒准备
                                  </span>
                                  <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={localState.disinfectionConfirmed}
                                    onChange={() => toggleLocalState(booking.id, 'disinfectionConfirmed')}
                                  />
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer group">
                                  {localState.designConfirmed ? (
                                    <CheckSquare className="w-5 h-5 text-military-500" />
                                  ) : (
                                    <Square className="w-5 h-5 text-ink-500 group-hover:text-ivory-400 transition-colors" />
                                  )}
                                  <span
                                    className={cn(
                                      'text-sm',
                                      localState.designConfirmed
                                        ? 'text-military-400 line-through'
                                        : 'text-ink-300'
                                    )}
                                  >
                                    图案确认
                                  </span>
                                  <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={localState.designConfirmed}
                                    onChange={() => toggleLocalState(booking.id, 'designConfirmed')}
                                  />
                                </label>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  leftIcon={<Eye className="w-4 h-4" />}
                                  onClick={() => setDetailModal({ isOpen: true, booking })}
                                >
                                  详情
                                </Button>
                                <Button
                                  size="sm"
                                  variant="primary"
                                  leftIcon={<FileText className="w-4 h-4" />}
                                  loading={exportingId === booking.id}
                                  onClick={() => handleExportConfirmation(booking.id)}
                                >
                                  导出
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ isOpen: false, booking: null })}
        title="预约详情"
        size="lg"
        footer={
          detailModal.booking && (
            <>
              <Button
                variant="secondary"
                onClick={() => setDetailModal({ isOpen: false, booking: null })}
              >
                关闭
              </Button>
              <Button
                leftIcon={<FileText className="w-4 h-4" />}
                loading={exportingId === detailModal.booking.id}
                onClick={() => {
                  handleExportConfirmation(detailModal.booking!.id);
                  setDetailModal({ isOpen: false, booking: null });
                }}
              >
                导出确认单
              </Button>
            </>
          )
        }
      >
        {detailModal.booking && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-ink-400 uppercase tracking-wider">客户姓名</label>
                <p className="text-ivory-100 font-medium">{detailModal.booking.client_name}</p>
              </div>
              <div>
                <label className="text-xs text-ink-400 uppercase tracking-wider">联系电话</label>
                <p className="text-ivory-100">{detailModal.booking.client_phone || '-'}</p>
              </div>
              <div>
                <label className="text-xs text-ink-400 uppercase tracking-wider">预约时间</label>
                <p className="text-ivory-100">
                  {formatTime(detailModal.booking.start_time)} -{' '}
                  {formatTime(detailModal.booking.end_time)}
                </p>
              </div>
              <div>
                <label className="text-xs text-ink-400 uppercase tracking-wider">预计时长</label>
                <p className="text-ivory-100">{detailModal.booking.estimated_duration || '-'} 分钟</p>
              </div>
              <div>
                <label className="text-xs text-ink-400 uppercase tracking-wider">师傅</label>
                <p className="text-ivory-100">{detailModal.booking.artist_name}</p>
              </div>
              <div>
                <label className="text-xs text-ink-400 uppercase tracking-wider">身体部位</label>
                <p
                  className={cn(
                    detailModal.booking.body_part_is_sensitive === 1 && 'text-vermilion-400'
                  )}
                >
                  {detailModal.booking.body_part_name || '-'}
                </p>
              </div>
            </div>

            {(detailModal.booking.client_allergies || detailModal.booking.client_is_sensitive_skin) && (
              <div className="p-4 bg-gold-900/20 border border-gold-700/50 rounded-lg">
                <h4 className="text-gold-400 font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  健康警告
                </h4>
                {detailModal.booking.client_allergies && (
                  <p className="text-sm text-gold-300">
                    过敏史: {detailModal.booking.client_allergies}
                  </p>
                )}
                {detailModal.booking.client_is_sensitive_skin && (
                  <p className="text-sm text-gold-300">敏感肌肤</p>
                )}
                {detailModal.booking.client_contraindications && (
                  <p className="text-sm text-gold-300">
                    禁忌: {detailModal.booking.client_contraindications}
                  </p>
                )}
              </div>
            )}

            {detailModal.booking.client_notes && (
              <div>
                <label className="text-xs text-ink-400 uppercase tracking-wider">客户备注</label>
                <p className="text-ivory-200 mt-1">{detailModal.booking.client_notes}</p>
              </div>
            )}

            {detailModal.booking.internal_notes && (
              <div>
                <label className="text-xs text-ink-400 uppercase tracking-wider">内部备注</label>
                <p className="text-ivory-200 mt-1">{detailModal.booking.internal_notes}</p>
              </div>
            )}

            {detailModal.booking.design_image_path && imagePreviews[detailModal.booking.id] && (
              <div>
                <label className="text-xs text-ink-400 uppercase tracking-wider">图案</label>
                <div className="mt-2">
                  <ImagePreview
                    src={imagePreviews[detailModal.booking.id]!}
                    alt={detailModal.booking.design_name || '图案'}
                    className="max-w-xs rounded-lg border border-ink-700"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
