import type { Hazard } from '@/types';
import { isCreatedToday } from './dateUtils';

export interface DuplicateCheckResult {
  hasDuplicate: boolean;
  duplicates: Hazard[];
}

export const checkDuplicateLocationToday = (
  hazards: Hazard[],
  location: string
): DuplicateCheckResult => {
  const normalized = location.trim().toLowerCase();
  if (!normalized) return { hasDuplicate: false, duplicates: [] };

  const duplicates = hazards.filter((h) => {
    if (!isCreatedToday(h.createdAt)) return false;
    const hLoc = h.location.trim().toLowerCase();
    return hLoc.includes(normalized) || normalized.includes(hLoc);
  });

  return { hasDuplicate: duplicates.length > 0, duplicates };
};
