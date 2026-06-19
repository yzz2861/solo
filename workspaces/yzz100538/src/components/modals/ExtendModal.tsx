import { useState } from 'react';
import { X, Clock, Plus, Minus } from 'lucide-react';
import { useBookingStore } from '@/store/bookingStore';
import type { Booking, Package } from '@/types';
import { formatTime, formatCurrency, formatDuration } from '@/utils/timeUtils';
import { calculateExtendFee } from '@/utils/statsCalculator';

interface ExtendModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  pkg: Package | null;
}

const EXTEND_OPTIONS = [30, 60, 90, 120];

export default function ExtendModal({ isOpen, onClose, booking, pkg }: ExtendModalProps) {
  const { extendBooking } = useBookingStore();
  const [selectedMinutes, setSelectedMinutes] = useState(60);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !booking || !pkg) return null;

  const extendFee = calculateExtendFee(pkg.price, pkg.duration, selectedMinutes);

  const handleSubmit = () => {
    setError('');
    setIsSubmitting(true);

    const result = extendBooking(booking.id, selectedMinutes);
    if (result.success) {
      setIsSubmitting(false);
      onClose();
    } else {
      setError(result.message || '加钟失败');
      setIsSubmitting(false);
    }
  };

  const adjustMinutes = (delta: number) => {
    setSelectedMinutes((prev) => Math.max(15, Math.min(240, prev + delta)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-scale-in">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">加钟</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="p-4 bg-amber-50 rounded-xl">
            <p className="text-sm text-amber-700 mb-1">当前结束时间</p>
            <p className="text-2xl font-bold text-amber-800">
              {formatTime(booking.scheduledEnd)}
            </p>
            <p className="text-sm text-amber-600 mt-1">
              {pkg.name} · {formatCurrency(pkg.price)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              选择加钟时长
            </label>
            <div className="grid grid-cols-4 gap-2">
              {EXTEND_OPTIONS.map((mins) => (
                <button
                  key={mins}
                  onClick={() => setSelectedMinutes(mins)}
                  className={`py-3 px-2 rounded-lg text-sm font-medium transition-all ${
                    selectedMinutes === mins
                      ? 'bg-amber-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {formatDuration(mins)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => adjustMinutes(-15)}
              className="p-3 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              <Minus className="w-5 h-5 text-gray-600" />
            </button>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-800">{selectedMinutes}</p>
              <p className="text-sm text-gray-500">分钟</p>
            </div>
            <button
              onClick={() => adjustMinutes(15)}
              className="p-3 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              <Plus className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="p-4 bg-green-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-green-700">加钟费用</span>
              <span className="text-2xl font-bold text-green-700">
                {formatCurrency(extendFee)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Clock className="w-4 h-4" />
              <span>新结束时间：{formatTime(addMinutes(booking.scheduledEnd, selectedMinutes))}</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              确认加钟
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function addMinutes(dateStr: string, minutes: number): string {
  const date = new Date(dateStr);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}
