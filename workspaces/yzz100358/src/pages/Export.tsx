import { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  User,
  Download,
  CheckSquare,
  Square,
  FileText,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/api';
import { useAppStore } from '@/store';
import {
  formatDate,
  formatTime,
  STATUS_LABELS,
  getStatusBadgeClass,
  cn,
} from '@/utils/helpers';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Modal,
  AlertBanner,
  Loading,
  EmptyState,
  Select,
  Input,
} from '@/components/ui';
import type { BookingDetail, BookingStatus } from '@shared/types';

type ExportVersion = 'client' | 'internal';

interface ExportProgress {
  current: number;
  total: number;
  currentBooking?: string;
}

export default function Export() {
  const { artists, loadArtists } = useAppStore();
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [exportVersion, setExportVersion] = useState<ExportVersion>('client');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [filterArtistId, setFilterArtistId] = useState<number | ''>('');
  const [filterStatus, setFilterStatus] = useState<BookingStatus | ''>('');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    bookingIds: number[];
  }>({ isOpen: false, bookingIds: [] });

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const filters: Parameters<typeof api.bookings.list>[0] = {};

      if (dateRange.start && dateRange.end) {
        filters.dateRange = [dateRange.start, dateRange.end];
      }
      if (filterArtistId !== '') {
        filters.artistId = filterArtistId;
      }
      if (filterStatus !== '') {
        filters.status = filterStatus;
      } else {
        filters.status = 'confirmed,pending_deposit';
      }

      const data = await api.bookings.list(filters);
      const sorted = [...data].sort(
        (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      );
      setBookings(sorted);
    } catch (error) {
      console.error('Failed to load bookings:', error);
      setAlert({ type: 'error', message: '加载预约列表失败' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArtists();
  }, [loadArtists]);

  useEffect(() => {
    fetchBookings();
  }, [dateRange, filterArtistId, filterStatus]);

  const filteredBookings = useMemo(() => {
    return bookings.filter(
      (b) => b.status === 'confirmed' || b.status === 'pending_deposit'
    );
  }, [bookings]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredBookings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredBookings.map((b) => b.id)));
    }
  };

  const handleSingleExport = async (bookingId: number) => {
    setConfirmModal({ isOpen: true, bookingIds: [bookingId] });
  };

  const handleBatchExport = () => {
    if (selectedIds.size === 0) {
      setAlert({ type: 'error', message: '请至少选择一个预约' });
      return;
    }
    setConfirmModal({ isOpen: true, bookingIds: Array.from(selectedIds) });
  };

  const executeExport = async () => {
    const { bookingIds } = confirmModal;
    setConfirmModal({ isOpen: false, bookingIds: [] });
    setExportProgress({ current: 0, total: bookingIds.length });

    const results: { success: boolean; bookingId: number; message: string }[] = [];

    for (let i = 0; i < bookingIds.length; i++) {
      const bookingId = bookingIds[i];
      const booking = bookings.find((b) => b.id === bookingId);

      setExportProgress({
        current: i + 1,
        total: bookingIds.length,
        currentBooking: booking?.client_name,
      });

      try {
        const result = await api.export.confirmation(bookingId, exportVersion);
        results.push({
          success: result.success,
          bookingId,
          message: result.success ? `已导出: ${result.filePath}` : '导出失败',
        });
      } catch (error) {
        results.push({
          success: false,
          bookingId,
          message: '导出失败: 网络错误',
        });
      }
    }

    setExportProgress(null);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    if (failCount === 0) {
      setAlert({
        type: 'success',
        message: `成功导出 ${successCount} 个确认单`,
      });
    } else if (successCount === 0) {
      setAlert({
        type: 'error',
        message: `导出失败，共 ${failCount} 个`,
      });
    } else {
      setAlert({
        type: 'success',
        message: `成功导出 ${successCount} 个，失败 ${failCount} 个`,
      });
    }

    setSelectedIds(new Set());
  };

  const resetFilters = () => {
    setDateRange({ start: '', end: '' });
    setFilterArtistId('');
    setFilterStatus('');
  };

  const artistOptions = [
    { value: '', label: '全部师傅' },
    ...artists.map((a) => ({ value: a.id, label: a.name })),
  ];

  const statusOptions: { value: BookingStatus | ''; label: string }[] = [
    { value: '', label: '可导出状态' },
    { value: 'confirmed', label: '已确认' },
    { value: 'pending_deposit', label: '待付定金' },
  ];

  return (
    <div className="animate-slide-up space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-ivory-100">导出中心</h2>
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gold-500" />
            筛选条件
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="开始日期"
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              leftIcon={<Calendar className="w-4 h-4" />}
            />
            <Input
              label="结束日期"
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
              leftIcon={<Calendar className="w-4 h-4" />}
            />
            <Select
              label="师傅"
              value={filterArtistId}
              onChange={(e) =>
                setFilterArtistId(e.target.value === '' ? '' : Number(e.target.value))
              }
              options={artistOptions}
              leftIcon={<User className="w-4 h-4" />}
            />
            <Select
              label="状态"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as BookingStatus | '')}
              options={statusOptions}
            />
          </div>
          <div className="flex justify-end mt-4">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={resetFilters}
            >
              重置筛选
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card decorativeBorder>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gold-500" />
              预约列表
              <Badge variant="info" size="sm">
                {filteredBookings.length} 条
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4 p-4 bg-ink-900/50 rounded-lg border border-ink-700">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                {selectedIds.size === filteredBookings.length && filteredBookings.length > 0 ? (
                  <CheckSquare className="w-5 h-5 text-military-500" />
                ) : (
                  <Square className="w-5 h-5 text-ink-500 group-hover:text-ivory-400 transition-colors" />
                )}
                <span className="text-ink-300">全选</span>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={selectedIds.size === filteredBookings.length && filteredBookings.length > 0}
                  onChange={toggleSelectAll}
                />
              </label>
              {selectedIds.size > 0 && (
                <Badge variant="info">已选 {selectedIds.size} 项</Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-ink-400">导出版本：</span>
                <div className="flex rounded-lg border border-ink-600 overflow-hidden">
                  <button
                    onClick={() => setExportVersion('client')}
                    className={cn(
                      'px-4 py-2 text-sm transition-all duration-200',
                      exportVersion === 'client'
                        ? 'bg-vermilion-700 text-ivory-100'
                        : 'bg-ink-800 text-ink-300 hover:bg-ink-700'
                    )}
                  >
                    客户版
                  </button>
                  <button
                    onClick={() => setExportVersion('internal')}
                    className={cn(
                      'px-4 py-2 text-sm transition-all duration-200',
                      exportVersion === 'internal'
                        ? 'bg-vermilion-700 text-ivory-100'
                        : 'bg-ink-800 text-ink-300 hover:bg-ink-700'
                    )}
                  >
                    内部版
                  </button>
                </div>
              </div>

              <Button
                leftIcon={<Download className="w-4 h-4" />}
                disabled={selectedIds.size === 0}
                onClick={handleBatchExport}
              >
                批量导出 ({selectedIds.size})
              </Button>
            </div>
          </div>

          <div className="mb-4 p-3 bg-ink-900/30 border border-ink-700/50 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-ink-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-ink-400">
                <span className="font-medium text-ink-300">导出版本说明：</span>
                {exportVersion === 'client' ? (
                  <span>
                    客户版 <span className="text-gold-400">隐藏</span> 内部备注和禁忌信息
                  </span>
                ) : (
                  <span>
                    内部版 <span className="text-military-400">完整显示</span> 所有信息
                  </span>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loading size="lg" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <EmptyState
              title="暂无可导出的预约"
              description="调整筛选条件或创建新的预约"
              icon={<FileText className="w-12 h-12 text-ink-500" />}
            />
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {filteredBookings.map((booking) => {
                const isSelected = selectedIds.has(booking.id);

                return (
                  <div
                    key={booking.id}
                    className={cn(
                      'flex flex-col lg:flex-row lg:items-center gap-4 p-4 rounded-lg border transition-all duration-200',
                      isSelected
                        ? 'bg-vermilion-900/20 border-vermilion-700/50'
                        : 'bg-ink-800/50 border-ink-700 hover:border-ink-600'
                    )}
                  >
                    <label className="flex-shrink-0 cursor-pointer">
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={isSelected}
                        onChange={() => toggleSelect(booking.id)}
                      />
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-military-500" />
                      ) : (
                        <Square className="w-5 h-5 text-ink-500 hover:text-ivory-400 transition-colors" />
                      )}
                    </label>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-ivory-100">
                          {booking.client_name}
                        </span>
                        <span className={getStatusBadgeClass(booking.status)}>
                          {STATUS_LABELS[booking.status]}
                        </span>
                        {booking.is_sensitive_area === 1 && (
                          <Badge variant="danger" size="sm">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            敏感
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-ink-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(booking.start_time)}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {booking.artist_name}
                        </span>
                        <span>{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</span>
                        {booking.body_part_name && (
                          <span>· {booking.body_part_name}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<Download className="w-4 h-4" />}
                        onClick={() => handleSingleExport(booking.id)}
                      >
                        导出
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={exportProgress !== null}
        onClose={() => {}}
        title="正在导出"
        closeOnOverlayClick={false}
        closeOnEsc={false}
      >
        {exportProgress && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-300">
                {exportProgress.currentBooking
                  ? `正在导出: ${exportProgress.currentBooking}`
                  : '准备导出...'}
              </span>
              <span className="text-ivory-100 font-medium">
                {exportProgress.current} / {exportProgress.total}
              </span>
            </div>
            <div className="w-full h-2 bg-ink-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-vermilion-600 transition-all duration-300 rounded-full"
                style={{
                  width: `${(exportProgress.current / exportProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, bookingIds: [] })}
        title="确认导出"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmModal({ isOpen: false, bookingIds: [] })}
            >
              取消
            </Button>
            <Button leftIcon={<Download className="w-4 h-4" />} onClick={executeExport}>
              确认导出 {confirmModal.bookingIds.length} 个
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-gold-900/20 border border-gold-700/50 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-gold-400 flex-shrink-0" />
            <div>
              <p className="text-gold-300 font-medium">
                即将导出 {confirmModal.bookingIds.length} 个确认单
              </p>
              <p className="text-sm text-gold-400/70">
                版本: {exportVersion === 'client' ? '客户版' : '内部版'}
              </p>
            </div>
          </div>

          <div className="text-sm text-ink-400">
            {exportVersion === 'client' ? (
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-vermilion-400 flex-shrink-0 mt-0.5" />
                <span>客户版将隐藏内部备注和禁忌信息</span>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-military-400 flex-shrink-0 mt-0.5" />
                <span>内部版将完整显示所有信息，仅供内部使用</span>
              </div>
            )}
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1">
            {confirmModal.bookingIds.map((id) => {
              const booking = bookings.find((b) => b.id === id);
              return (
                <div
                  key={id}
                  className="flex items-center justify-between py-1 px-2 text-sm bg-ink-900/50 rounded"
                >
                  <span className="text-ivory-200">{booking?.client_name}</span>
                  <span className="text-ink-400">
                    {booking && formatDate(booking.start_time)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
}
