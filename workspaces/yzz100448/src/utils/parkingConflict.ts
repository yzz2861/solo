import type { Visitor } from '../types';
import { isTimeOverlapping } from './dateUtils';

export function checkParkingConflict(
  visitors: Visitor[],
  parkingSpot: string,
  visitDate: string,
  startTime: string,
  endTime: string,
  excludeId?: string
): Visitor[] {
  return visitors.filter((v) => {
    if (excludeId && v.id === excludeId) return false;
    if (v.parkingSpot !== parkingSpot) return false;
    if (v.visitDate !== visitDate) return false;
    if (v.status === 'checked_out') return false;
    return isTimeOverlapping(startTime, endTime, v.startTime, v.endTime);
  });
}

export function checkAllDayOccupied(
  visitors: Visitor[],
  parkingSpot: string,
  visitDate: string
): Visitor | null {
  const dayVisitors = visitors.filter(
    (v) => v.parkingSpot === parkingSpot && 
           v.visitDate === visitDate && 
           v.status !== 'checked_out'
  );
  
  if (dayVisitors.length === 0) return null;
  
  const morningOccupied = dayVisitors.some((v) => v.timeSlot === 'morning');
  const afternoonOccupied = dayVisitors.some((v) => v.timeSlot === 'afternoon');
  
  if (morningOccupied && afternoonOccupied) {
    return dayVisitors[0];
  }
  
  return null;
}

export function getAvailableParkingSpots(
  allSpots: string[],
  visitors: Visitor[],
  visitDate: string,
  timeSlot: 'morning' | 'afternoon'
): string[] {
  const occupiedSpots = visitors
    .filter(
      (v) =>
        v.visitDate === visitDate &&
        v.timeSlot === timeSlot &&
        v.status !== 'checked_out'
    )
    .map((v) => v.parkingSpot);
  
  return allSpots.filter((spot) => !occupiedSpots.includes(spot));
}
