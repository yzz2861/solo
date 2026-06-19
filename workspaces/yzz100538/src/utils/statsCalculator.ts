import type { Booking, Room, Package, DailyStats, SlowRoomAnalysis, PackageComplexity } from '@/types';
import { startOfDay, endOfDay, isWithinInterval, parseISO, differenceInMinutes, subDays } from 'date-fns';

export const calculateDailyStats = (
  bookings: Booking[],
  rooms: Room[],
  packages: Package[],
  date: Date = new Date()
): DailyStats => {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const todayBookings = bookings.filter((b) => {
    const arrival = parseISO(b.scheduledArrival);
    return isWithinInterval(arrival, { start: dayStart, end: dayEnd });
  });

  const completedBookings = todayBookings.filter((b) => b.status === 'completed');

  let totalRevenue = 0;
  let extendRevenue = 0;
  let totalCleaningTime = 0;
  let cleaningCount = 0;

  const roomStatsMap = new Map<
    string,
    { roomName: string; bookings: number; totalCleaningTime: number; cleaningCount: number; totalRevenue: number }
  >();

  for (const room of rooms) {
    roomStatsMap.set(room.id, {
      roomName: room.name,
      bookings: 0,
      totalCleaningTime: 0,
      cleaningCount: 0,
      totalRevenue: 0,
    });
  }

  for (const booking of completedBookings) {
    const pkg = packages.find((p) => p.id === booking.packageId);
    const price = pkg ? pkg.price : 0;
    const bookingRevenue = price + booking.extendedFee;
    totalRevenue += bookingRevenue;
    extendRevenue += booking.extendedFee;

    if (booking.cleaningStart && booking.cleaningEnd) {
      const cleaningTime = differenceInMinutes(parseISO(booking.cleaningEnd), parseISO(booking.cleaningStart));
      totalCleaningTime += cleaningTime;
      cleaningCount++;

      const roomStat = roomStatsMap.get(booking.roomId);
      if (roomStat) {
        roomStat.totalCleaningTime += cleaningTime;
        roomStat.cleaningCount++;
      }
    }

    const roomStat = roomStatsMap.get(booking.roomId);
    if (roomStat) {
      roomStat.bookings++;
      roomStat.totalRevenue += bookingRevenue;
    }
  }

  const roomStats = Array.from(roomStatsMap.entries()).map(([roomId, stat]) => ({
    roomId,
    roomName: stat.roomName,
    bookings: stat.bookings,
    avgCleaningTime: stat.cleaningCount > 0 ? Math.round(stat.totalCleaningTime / stat.cleaningCount) : 0,
    totalRevenue: stat.totalRevenue,
  }));

  const turnoverRate = rooms.length > 0 ? completedBookings.length / rooms.length : 0;

  return {
    date: dayStart.toISOString(),
    totalBookings: todayBookings.length,
    turnoverRate: Number(turnoverRate.toFixed(2)),
    totalRevenue,
    extendRevenue,
    avgCleaningTime: cleaningCount > 0 ? Math.round(totalCleaningTime / cleaningCount) : 0,
    roomStats,
  };
};

export const calculateSlowRoomAnalysis = (
  bookings: Booking[],
  rooms: Room[],
  packages: Package[],
  days: number = 7
): SlowRoomAnalysis[] => {
  const today = startOfDay(new Date());
  const startDate = subDays(today, days);

  const recentBookings = bookings.filter((b) => {
    if (b.status !== 'completed') return false;
    if (!b.cleaningStart || !b.cleaningEnd) return false;
    const arrival = parseISO(b.scheduledArrival);
    return arrival >= startDate && arrival <= today;
  });

  const analysis: SlowRoomAnalysis[] = [];

  for (const room of rooms) {
    const roomBookings = recentBookings.filter((b) => b.roomId === room.id);

    if (roomBookings.length < 2) continue;

    let totalCleaningTime = 0;
    const packageMap = new Map<
      string,
      { packageName: string; complexity: PackageComplexity; totalTime: number; count: number }
    >();

    for (const booking of roomBookings) {
      const cleaningTime = differenceInMinutes(
        parseISO(booking.cleaningEnd!),
        parseISO(booking.cleaningStart!)
      );
      totalCleaningTime += cleaningTime;

      const pkg = packages.find((p) => p.id === booking.packageId);
      if (pkg) {
        const existing = packageMap.get(pkg.id);
        if (existing) {
          existing.totalTime += cleaningTime;
          existing.count++;
        } else {
          packageMap.set(pkg.id, {
            packageName: pkg.name,
            complexity: pkg.complexity,
            totalTime: cleaningTime,
            count: 1,
          });
        }
      }
    }

    const avgCleaningTime = Math.round(totalCleaningTime / roomBookings.length);
    const slowRatio = avgCleaningTime / room.cleaningDuration;

    const packageBreakdown = Array.from(packageMap.values()).map((p) => ({
      packageName: p.packageName,
      complexity: p.complexity,
      count: p.count,
      avgCleaningTime: Math.round(p.totalTime / p.count),
    }));

    const complexPackages = packageBreakdown.filter((p) => p.complexity === 'complex');
    const simplePackages = packageBreakdown.filter((p) => p.complexity === 'simple');

    let isLikelyPackageIssue = false;
    if (complexPackages.length > 0) {
      const complexAvg =
        complexPackages.reduce((sum, p) => sum + p.avgCleaningTime, 0) / complexPackages.length;
      const simpleAvg =
        simplePackages.length > 0
          ? simplePackages.reduce((sum, p) => sum + p.avgCleaningTime, 0) / simplePackages.length
          : room.cleaningDuration;
      isLikelyPackageIssue = complexAvg > simpleAvg * 1.3;
    }

    let isLikelyStaffIssue = false;
    if (!isLikelyPackageIssue && slowRatio > 1.5) {
      const otherRoomsAvg = calculateOtherRoomsAvg(room.id, recentBookings, rooms, packages);
      isLikelyStaffIssue = avgCleaningTime > otherRoomsAvg * 1.3;
    }

    analysis.push({
      roomId: room.id,
      roomName: room.name,
      avgCleaningTime,
      standardDuration: room.cleaningDuration,
      slowRatio: Number(slowRatio.toFixed(2)),
      sampleCount: roomBookings.length,
      packageBreakdown: packageBreakdown.sort((a, b) => b.avgCleaningTime - a.avgCleaningTime),
      isLikelyPackageIssue,
      isLikelyStaffIssue,
    });
  }

  return analysis.sort((a, b) => b.slowRatio - a.slowRatio);
};

const calculateOtherRoomsAvg = (
  excludeRoomId: string,
  bookings: Booking[],
  rooms: Room[],
  packages: Package[]
): number => {
  const otherBookings = bookings.filter(
    (b) => b.roomId !== excludeRoomId && b.cleaningStart && b.cleaningEnd
  );

  if (otherBookings.length === 0) return 0;

  const totalTime = otherBookings.reduce((sum, b) => {
    return (
      sum + differenceInMinutes(parseISO(b.cleaningEnd!), parseISO(b.cleaningStart!))
    );
  }, 0);

  return Math.round(totalTime / otherBookings.length);
};

export const calculateExtendFee = (
  basePrice: number,
  baseDuration: number,
  extendMinutes: number
): number => {
  const hourlyRate = (basePrice / baseDuration) * 60;
  return Math.round((hourlyRate * extendMinutes) / 60);
};
