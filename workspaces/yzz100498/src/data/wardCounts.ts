import { WardCount } from '../types';
import { wards } from './wards';
import { format, subDays } from 'date-fns';

const generateWardCounts = (): WardCount[] => {
  const counts: WardCount[] = [];
  const today = new Date('2026-06-18');
  
  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const date = format(subDays(today, dayOffset), 'yyyy-MM-dd');
    
    wards.forEach((ward, index) => {
      const basePatients = 30 + index * 3;
      const variation = Math.floor(Math.random() * 10) - 5;
      const patientCount = Math.max(20, basePatients + variation);
      const companionCount = Math.floor(patientCount * (0.7 + Math.random() * 0.4));
      const specialMealCount = Math.floor(patientCount * (0.1 + Math.random() * 0.15));
      
      const isLockedDown = ward.id === 'ward-003' && dayOffset >= 2 && dayOffset <= 5;
      
      counts.push({
        id: `wc-${date}-${ward.id}`,
        wardId: ward.id,
        wardName: ward.name,
        reportDate: date,
        patientCount,
        companionCount: isLockedDown ? Math.floor(companionCount * 0.3) : companionCount,
        specialMealCount,
        reporter: ward.nurseInCharge,
        isLockedDown
      });
    });
  }
  
  return counts.sort((a, b) => b.reportDate.localeCompare(a.reportDate));
};

export const wardCounts: WardCount[] = generateWardCounts();
