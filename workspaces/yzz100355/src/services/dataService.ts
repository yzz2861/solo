import type { PatrolShift, ForbiddenZone, Checkpoint, Annotation } from '@/types';
import patrolShiftsData from '@/data/patrolShifts.json';
import forbiddenZonesData from '@/data/forbiddenZones.json';
import checkpointsData from '@/data/checkpoints.json';
import { runAllDetections } from '@/services/detectionService';

const SHIFTS_STORAGE_KEY = 'patrol-shifts';
const ZONES_STORAGE_KEY = 'patrol-zones';
const CHECKPOINTS_STORAGE_KEY = 'patrol-checkpoints';
const ANNOTATIONS_STORAGE_KEY = 'patrol-annotations';

export const loadPatrolShifts = (): PatrolShift[] => {
  try {
    const stored = localStorage.getItem(SHIFTS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load shifts from localStorage, using default data');
  }
  return patrolShiftsData as PatrolShift[];
};

export const savePatrolShifts = (shifts: PatrolShift[]): void => {
  try {
    localStorage.setItem(SHIFTS_STORAGE_KEY, JSON.stringify(shifts));
  } catch (error) {
    console.error('Failed to save shifts to localStorage:', error);
  }
};

export const loadForbiddenZones = (): ForbiddenZone[] => {
  try {
    const stored = localStorage.getItem(ZONES_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load zones from localStorage, using default data');
  }
  return forbiddenZonesData as ForbiddenZone[];
};

export const saveForbiddenZones = (zones: ForbiddenZone[]): void => {
  try {
    localStorage.setItem(ZONES_STORAGE_KEY, JSON.stringify(zones));
  } catch (error) {
    console.error('Failed to save zones to localStorage:', error);
  }
};

export const loadCheckpoints = (): Checkpoint[] => {
  try {
    const stored = localStorage.getItem(CHECKPOINTS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load checkpoints from localStorage, using default data');
  }
  return checkpointsData as Checkpoint[];
};

export const saveCheckpoints = (checkpoints: Checkpoint[]): void => {
  try {
    localStorage.setItem(CHECKPOINTS_STORAGE_KEY, JSON.stringify(checkpoints));
  } catch (error) {
    console.error('Failed to save checkpoints to localStorage:', error);
  }
};

export const loadAnnotations = (): Annotation[] => {
  try {
    const stored = localStorage.getItem(ANNOTATIONS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load annotations from localStorage');
  }
  return [];
};

export const saveAnnotations = (annotations: Annotation[]): void => {
  try {
    localStorage.setItem(ANNOTATIONS_STORAGE_KEY, JSON.stringify(annotations));
  } catch (error) {
    console.error('Failed to save annotations to localStorage:', error);
  }
};

export const importDataFromFile = (file: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.shifts) {
          savePatrolShifts(data.shifts);
        }
        if (data.zones) {
          saveForbiddenZones(data.zones);
        }
        if (data.checkpoints) {
          saveCheckpoints(data.checkpoints);
        }
        if (data.annotations) {
          saveAnnotations(data.annotations);
        }
        resolve();
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

export const exportAllData = (): string => {
  const shifts = loadPatrolShifts();
  const zones = loadForbiddenZones();
  const checkpoints = loadCheckpoints();
  const annotations = loadAnnotations();
  
  return JSON.stringify({
    shifts,
    zones,
    checkpoints,
    annotations,
    exportTime: new Date().toISOString(),
  }, null, 2);
};

export const getDetectionIds = (
  shifts: PatrolShift[],
  zones: ForbiddenZone[]
): string[] => {
  const detectionIds: string[] = [];
  
  shifts.forEach(shift => {
    const detections = runAllDetections(shift.trajectoryPoints, zones);
    detections.forEach(detection => {
      detectionIds.push(detection.id);
    });
  });
  
  return detectionIds;
};

export const validateAnnotationTarget = (
  targetId: string,
  targetType: Annotation['targetType'],
  shifts: PatrolShift[],
  checkpoints: Checkpoint[],
  zones: ForbiddenZone[]
): boolean => {
  switch (targetType) {
    case 'alarm':
      return shifts.some(shift => 
        shift.alarms.some(alarm => alarm.id === targetId)
      );
    case 'point':
      return shifts.some(shift => 
        shift.trajectoryPoints.some(point => point.id === targetId)
      );
    case 'detection': {
      const detectionIds = getDetectionIds(shifts, zones);
      return detectionIds.includes(targetId);
    }
    case 'checkpoint':
      return checkpoints.some(cp => cp.id === targetId);
    case 'zone':
      return zones.some(z => z.id === targetId);
    default:
      return false;
  }
};

export const getAllTargetIds = (
  shifts: PatrolShift[],
  checkpoints: Checkpoint[],
  zones: ForbiddenZone[]
): { alarms: string[]; points: string[]; checkpoints: string[]; zones: string[] } => {
  const alarms: string[] = [];
  const points: string[] = [];
  
  shifts.forEach(shift => {
    shift.alarms.forEach(alarm => alarms.push(alarm.id));
    shift.trajectoryPoints.forEach(point => points.push(point.id));
  });
  
  return {
    alarms,
    points,
    checkpoints: checkpoints.map(cp => cp.id),
    zones: zones.map(z => z.id),
  };
};
