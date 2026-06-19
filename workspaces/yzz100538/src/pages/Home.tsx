import { useState, useMemo, useEffect } from 'react';
import { Clock, Coffee, Sparkles, CheckCircle, UserPlus } from 'lucide-react';
import Header from '@/components/layout/Header';
import AlertBar from '@/components/layout/AlertBar';
import BoardColumn from '@/components/boards/BoardColumn';
import RoomCard from '@/components/boards/RoomCard';
import BookingModal from '@/components/modals/BookingModal';
import ExtendModal from '@/components/modals/ExtendModal';
import { useBookingStore } from '@/store/bookingStore';
import type { Booking } from '@/types';
import { startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';

export default function Home() {
  const { bookings, rooms, packages, alerts, selectedDate, init, refreshAlerts } = useBookingStore();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [extendingBooking, setExtendingBooking] = useState<Booking | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshAlerts();
    }, 60000);
    return () => clearInterval(interval);
  }, [refreshAlerts]);

  const todayBookings = useMemo(() => {
    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);

    return bookings.filter((b) => {
      const arrival = parseISO(b.scheduledArrival);
      return isWithinInterval(arrival, { start: dayStart, end: dayEnd });
    });
  }, [bookings, selectedDate]);

  const { pendingBookings, inUseBookings, cleaningBookings, availableRooms } = useMemo(() => {
    const pending: Booking[] = [];
    const inUse: Booking[] = [];
    const cleaning: Booking[] = [];

    for (const booking of todayBookings) {
      if (booking.status === 'pending') {
        pending.push(booking);
      } else if (booking.status === 'checked-in' || booking.status === 'in-use') {
        inUse.push(booking);
      } else if (booking.status === 'completed' && !booking.cleaningEnd) {
        cleaning.push(booking);
      }
    }

    pending.sort((a, b) => (a.scheduledArrival > b.scheduledArrival ? 1 : -1));
    inUse.sort((a, b) => (a.scheduledArrival > b.scheduledArrival ? 1 : -1));
    cleaning.sort((a, b) => (a.scheduledEnd > b.scheduledEnd ? 1 : -1));

    const bookedRoomIds = new Set([
      ...pending.map((b) => b.roomId),
      ...inUse.map((b) => b.roomId),
      ...cleaning.map((b) => b.roomId),
    ]);

    const available = rooms.filter((r) => !bookedRoomIds.has(r.id));

    return {
      pendingBookings: pending,
      inUseBookings: inUse,
      cleaningBookings: cleaning,
      availableRooms: available,
    };
  }, [todayBookings, rooms]);

  const hasAlert = (bookingId: string): boolean => {
    return alerts.some((a) => a.bookingId === bookingId);
  };

  const handleEdit = (booking: Booking) => {
    setEditingBooking(booking);
    setIsBookingModalOpen(true);
  };

  const handleExtend = (booking: Booking) => {
    setExtendingBooking(booking);
    setIsExtendModalOpen(true);
  };

  const handleCloseBookingModal = () => {
    setIsBookingModalOpen(false);
    setEditingBooking(null);
  };

  const handleCloseExtendModal = () => {
    setIsExtendModalOpen(false);
    setExtendingBooking(null);
  };

  const extendingPkg = extendingBooking
    ? packages.find((p) => p.id === extendingBooking.packageId) || null
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 to-orange-50/30">
      <Header onAddBooking={() => setIsBookingModalOpen(true)} />
      <AlertBar />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" style={{ minHeight: '600px' }}>
          <BoardColumn
            title="待到店"
            count={pendingBookings.length}
            icon={<UserPlus className="w-5 h-5" />}
            colorClass="border-blue-400"
            bgClass="bg-blue-50/80"
          >
            {pendingBookings.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无待到店预订</p>
              </div>
            ) : (
              pendingBookings.map((booking) => {
                const room = rooms.find((r) => r.id === booking.roomId);
                const pkg = packages.find((p) => p.id === booking.packageId);
                if (!room || !pkg) return null;
                return (
                  <RoomCard
                    key={booking.id}
                    booking={booking}
                    room={room}
                    pkg={pkg}
                    onEdit={() => handleEdit(booking)}
                    onExtend={() => handleExtend(booking)}
                    hasAlert={hasAlert(booking.id)}
                  />
                );
              })
            )}
          </BoardColumn>

          <BoardColumn
            title="使用中"
            count={inUseBookings.length}
            icon={<Coffee className="w-5 h-5" />}
            colorClass="border-orange-400"
            bgClass="bg-orange-50/80"
          >
            {inUseBookings.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Coffee className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无使用中包间</p>
              </div>
            ) : (
              inUseBookings.map((booking) => {
                const room = rooms.find((r) => r.id === booking.roomId);
                const pkg = packages.find((p) => p.id === booking.packageId);
                if (!room || !pkg) return null;
                return (
                  <RoomCard
                    key={booking.id}
                    booking={booking}
                    room={room}
                    pkg={pkg}
                    onEdit={() => handleEdit(booking)}
                    onExtend={() => handleExtend(booking)}
                    hasAlert={hasAlert(booking.id)}
                  />
                );
              })
            )}
          </BoardColumn>

          <BoardColumn
            title="待清台"
            count={cleaningBookings.length}
            icon={<Sparkles className="w-5 h-5" />}
            colorClass="border-teal-400"
            bgClass="bg-teal-50/80"
          >
            {cleaningBookings.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无待清台包间</p>
              </div>
            ) : (
              cleaningBookings.map((booking) => {
                const room = rooms.find((r) => r.id === booking.roomId);
                const pkg = packages.find((p) => p.id === booking.packageId);
                if (!room || !pkg) return null;
                return (
                  <RoomCard
                    key={booking.id}
                    booking={booking}
                    room={room}
                    pkg={pkg}
                    onEdit={() => handleEdit(booking)}
                    onExtend={() => handleExtend(booking)}
                    hasAlert={hasAlert(booking.id)}
                  />
                );
              })
            )}
          </BoardColumn>

          <BoardColumn
            title="可入座"
            count={availableRooms.length}
            icon={<CheckCircle className="w-5 h-5" />}
            colorClass="border-green-400"
            bgClass="bg-green-50/80"
          >
            {availableRooms.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无可入座包间</p>
              </div>
            ) : (
              availableRooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-white rounded-xl p-4 shadow-sm border border-green-100 hover:border-green-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-800">{room.name}</h3>
                      <p className="text-sm text-gray-500">{room.capacity}人包间</p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      空闲
                    </span>
                  </div>
                  <button
                    onClick={() => setIsBookingModalOpen(true)}
                    className="w-full mt-3 py-2 text-sm text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                  >
                    + 快速预订
                  </button>
                </div>
              ))
            )}
          </BoardColumn>
        </div>
      </main>

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={handleCloseBookingModal}
        editingBooking={editingBooking}
      />

      <ExtendModal
        isOpen={isExtendModalOpen}
        onClose={handleCloseExtendModal}
        booking={extendingBooking}
        pkg={extendingPkg}
      />
    </div>
  );
}
