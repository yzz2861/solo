import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useBookingStore } from '@/store/bookingStore';
import type { Booking } from '@/types';
import { addMinutesToTime, formatTime } from '@/utils/timeUtils';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingBooking?: Booking | null;
}

export default function BookingModal({ isOpen, onClose, editingBooking }: BookingModalProps) {
  const { rooms, packages, addBooking, updateBooking } = useBookingStore();
  const [formData, setFormData] = useState({
    roomId: '',
    packageId: '',
    customerName: '',
    customerPhone: '',
    guestCount: 2,
    scheduledArrival: '',
    scheduledEnd: '',
    notes: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingBooking) {
      setFormData({
        roomId: editingBooking.roomId,
        packageId: editingBooking.packageId,
        customerName: editingBooking.customerName,
        customerPhone: editingBooking.customerPhone,
        guestCount: editingBooking.guestCount,
        scheduledArrival: formatDateTimeLocal(editingBooking.scheduledArrival),
        scheduledEnd: formatDateTimeLocal(editingBooking.scheduledEnd),
        notes: editingBooking.notes,
      });
    } else {
      const now = new Date();
      now.setMinutes(0, 0, 0);
      const start = new Date(now.getTime() + 30 * 60000);
      const end = new Date(start.getTime() + 120 * 60000);

      setFormData({
        roomId: rooms[0]?.id || '',
        packageId: packages[0]?.id || '',
        customerName: '',
        customerPhone: '',
        guestCount: 2,
        scheduledArrival: formatDateTimeLocal(start.toISOString()),
        scheduledEnd: formatDateTimeLocal(end.toISOString()),
        notes: '',
      });
    }
    setError('');
  }, [editingBooking, isOpen, rooms, packages]);

  const formatDateTimeLocal = (isoString: string): string => {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handlePackageChange = (packageId: string) => {
    const pkg = packages.find((p) => p.id === packageId);
    if (pkg && formData.scheduledArrival) {
      const endTime = addMinutesToTime(
        new Date(formData.scheduledArrival).toISOString(),
        pkg.duration
      );
      setFormData((prev) => ({
        ...prev,
        packageId,
        scheduledEnd: formatDateTimeLocal(endTime),
      }));
    } else {
      setFormData((prev) => ({ ...prev, packageId }));
    }
  };

  const handleStartTimeChange = (startTime: string) => {
    const pkg = packages.find((p) => p.id === formData.packageId);
    if (pkg) {
      const endTime = addMinutesToTime(new Date(startTime).toISOString(), pkg.duration);
      setFormData((prev) => ({
        ...prev,
        scheduledArrival: startTime,
        scheduledEnd: formatDateTimeLocal(endTime),
      }));
    } else {
      setFormData((prev) => ({ ...prev, scheduledArrival: startTime }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.roomId) {
      setError('请选择包间');
      return;
    }
    if (!formData.packageId) {
      setError('请选择套餐');
      return;
    }
    if (!formData.customerName.trim()) {
      setError('请输入客人姓名');
      return;
    }
    if (!formData.scheduledArrival || !formData.scheduledEnd) {
      setError('请选择时间');
      return;
    }

    const bookingData = {
      roomId: formData.roomId,
      packageId: formData.packageId,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      guestCount: formData.guestCount,
      scheduledArrival: new Date(formData.scheduledArrival).toISOString(),
      scheduledEnd: new Date(formData.scheduledEnd).toISOString(),
      notes: formData.notes,
    };

    if (editingBooking) {
      updateBooking(editingBooking.id, bookingData);
      onClose();
    } else {
      const result = addBooking(bookingData);
      if (result.success) {
        onClose();
      } else {
        setError(result.message || '添加失败');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            {editingBooking ? '编辑预订' : '新增预订'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                包间 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.roomId}
                onChange={(e) => setFormData((prev) => ({ ...prev, roomId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tea-500 focus:border-tea-500"
              >
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} ({room.capacity}人)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                套餐 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.packageId}
                onChange={(e) => handlePackageChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tea-500 focus:border-tea-500"
              >
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} - ¥{pkg.price}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                客人姓名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, customerName: e.target.value }))
                }
                placeholder="请输入姓名"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tea-500 focus:border-tea-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                联系电话
              </label>
              <input
                type="tel"
                value={formData.customerPhone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, customerPhone: e.target.value }))
                }
                placeholder="请输入电话"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tea-500 focus:border-tea-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              人数
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={formData.guestCount}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, guestCount: parseInt(e.target.value) || 1 }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tea-500 focus:border-tea-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                到店时间 <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.scheduledArrival}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tea-500 focus:border-tea-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                预计结束 <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.scheduledEnd}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, scheduledEnd: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tea-500 focus:border-tea-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              备注
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="选填，如VIP、特殊要求等"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tea-500 focus:border-tea-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 bg-tea-700 hover:bg-tea-600 text-white font-medium rounded-lg transition-colors"
            >
              {editingBooking ? '保存修改' : '确认添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
