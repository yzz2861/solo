import { useState } from 'react';
import { Clock, User, Users, Package as PackageIcon, Coffee, ChevronDown, ChevronUp, Edit2, Trash2, PlusCircle, CheckCircle, Sparkles } from 'lucide-react';
import type { Booking, Room, Package } from '@/types';
import { useBookingStore } from '@/store/bookingStore';
import { formatTime, formatCurrency, formatDuration } from '@/utils/timeUtils';

interface RoomCardProps {
  booking: Booking;
  room: Room;
  pkg: Package;
  onEdit: () => void;
  onExtend: () => void;
  hasAlert?: boolean;
}

export default function RoomCard({ booking, room, pkg, onEdit, onExtend, hasAlert }: RoomCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { checkIn, completeBooking, finishCleaning, togglePackageReady } = useBookingStore();

  const getStatusBadge = () => {
    switch (booking.status) {
      case 'pending':
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
            待到店
          </span>
        );
      case 'checked-in':
        return (
          <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
            已到店
          </span>
        );
      case 'in-use':
        return (
          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
            使用中
          </span>
        );
      case 'completed':
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
            已完成
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusActions = () => {
    switch (booking.status) {
      case 'pending':
        return (
          <button
            onClick={() => checkIn(booking.id)}
            className="flex-1 py-2 px-3 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <CheckCircle className="w-4 h-4" />
            确认到店
          </button>
        );
      case 'checked-in':
      case 'in-use':
        return (
          <>
            <button
              onClick={onExtend}
              className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              <PlusCircle className="w-4 h-4" />
              加钟
            </button>
            <button
              onClick={() => completeBooking(booking.id)}
              className="flex-1 py-2 px-3 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              <Coffee className="w-4 h-4" />
              结束使用
            </button>
          </>
        );
      case 'completed':
        if (!booking.cleaningEnd) {
          return (
            <button
              onClick={() => finishCleaning(booking.id)}
              className="flex-1 py-2 px-3 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              <Sparkles className="w-4 h-4" />
              清台完成
            </button>
          );
        }
        return null;
      default:
        return null;
    }
  };

  return (
    <div
      id={`booking-${booking.id}`}
      className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-300 hover:shadow-md ${
        hasAlert ? 'border-red-300 ring-2 ring-red-200' : 'border-transparent'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-gray-800 text-lg">{room.name}</h3>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {room.capacity}人包间 · {booking.guestCount}人
            </p>
          </div>
          {getStatusBadge()}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <User className="w-4 h-4 text-gray-400" />
            <span>{booking.customerName}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <PackageIcon className="w-4 h-4 text-gray-400" />
            <span>{pkg.name}</span>
            <span className="text-amber-600 font-medium">{formatCurrency(pkg.price)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>
              {formatTime(booking.scheduledArrival)} - {formatTime(booking.scheduledEnd)}
            </span>
          </div>
        </div>

        {booking.extendedMinutes > 0 && (
          <div className="mt-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-sm text-amber-700">
              <PlusCircle className="w-3 h-3 inline mr-1" />
              已加钟 {formatDuration(booking.extendedMinutes)}
              <span className="ml-2 font-medium">+{formatCurrency(booking.extendedFee)}</span>
            </p>
          </div>
        )}

        {booking.status === 'pending' && (
          <div className="mt-3">
            <button
              onClick={() => togglePackageReady(booking.id)}
              className={`w-full py-2 px-3 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1 ${
                booking.packageReady
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              {booking.packageReady ? '套餐已备齐' : '套餐未备齐'}
            </button>
          </div>
        )}

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-3 py-1 text-gray-400 hover:text-gray-600 flex items-center justify-center"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
            {booking.notes && (
              <p className="text-sm text-gray-500">
                <span className="font-medium">备注：</span>
                {booking.notes}
              </p>
            )}
            {booking.customerPhone && (
              <p className="text-sm text-gray-500">
                <span className="font-medium">电话：</span>
                {booking.customerPhone}
              </p>
            )}
            {booking.actualArrival && (
              <p className="text-sm text-gray-500">
                <span className="font-medium">实际到店：</span>
                {formatTime(booking.actualArrival)}
              </p>
            )}
            {booking.actualEnd && (
              <p className="text-sm text-gray-500">
                <span className="font-medium">实际结束：</span>
                {formatTime(booking.actualEnd)}
              </p>
            )}
            <div className="flex gap-2 pt-2">
              <button
                onClick={onEdit}
                className="flex-1 py-1.5 px-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                编辑
              </button>
              <button
                onClick={() => {
                  if (confirm('确定要删除这条预订吗？')) {
                    useBookingStore.getState().deleteBooking(booking.id);
                  }
                }}
                className="flex-1 py-1.5 px-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                删除
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pb-4 flex gap-2">
        {getStatusActions()}
      </div>
    </div>
  );
}
