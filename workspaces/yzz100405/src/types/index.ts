export type PetType = 'dog' | 'cat' | 'bird' | 'rabbit' | 'other';
export type TaskType = 'feeding' | 'medication' | 'walk' | 'other';
export type TaskStatus = 'pending' | 'completed' | 'abnormal';
export type BoardingStatus = 'active' | 'picked_up';

export interface PetBoarding {
  id: string;
  petName: string;
  petType: PetType;
  breed: string;
  age: number;
  weight: number;
  features: string;
  ownerName: string;
  ownerPhone: string;
  cageNumber: string;
  allergicFood: string;
  checkInDate: string;
  expectedPickupDate: string;
  actualPickupDate: string;
  specialNotes: string;
  status: BoardingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FeedingPlan {
  id: string;
  boardingId: string;
  foodType: string;
  portion: string;
  timeSlots: string[];
  notes: string;
}

export interface MedicationPlan {
  id: string;
  boardingId: string;
  medicineName: string;
  dosage: string;
  unit: string;
  frequency: string;
  timeSlots: string[];
  notes: string;
}

export interface WalkPlan {
  id: string;
  boardingId: string;
  timeSlot: string;
  durationMinutes: number;
  requirements: string;
}

export interface CareTask {
  id: string;
  boardingId: string;
  taskType: TaskType;
  title: string;
  description: string;
  scheduledTime: string;
  completedTime: string;
  status: TaskStatus;
  cageNumber: string;
  petName: string;
  isAbnormal: boolean;
  abnormalReason: string;
}

export interface Warning {
  type: 'same_name' | 'missing_unit' | 'cage_conflict' | 'early_pickup';
  message: string;
  severity: 'warning' | 'error';
  relatedIds: string[];
}

export const PET_TYPE_LABELS: Record<PetType, string> = {
  dog: '🐶 犬',
  cat: '🐱 猫',
  bird: '🐦 鸟',
  rabbit: '🐰 兔',
  other: '🐾 其他',
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  feeding: '🍖 喂食',
  medication: '💊 喂药',
  walk: '🦮 遛放',
  other: '📋 其他',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: '待做',
  completed: '已完成',
  abnormal: '异常',
};
