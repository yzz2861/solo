export type PlantType = 'succulent' | 'mint' | 'seedling' | 'flowering';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Weather = 'sunny' | 'cloudy' | 'rainy';
export type ErrorType = 'overwater' | 'underwater' | 'drain_miss' | 'rain_water' | 'consecutive_water';
export type WaterAmount = 1 | 2 | 3;
export type HealthLevel = 'healthy' | 'good' | 'fair' | 'wilted' | 'dying';
export type MoistureLevel = 'flooded' | 'wet' | 'moist' | 'dry' | 'parched';

export interface PlantConfig {
  type: PlantType;
  name: string;
  waterFrequencyMin: number;
  waterFrequencyMax: number;
  preferredAmount: WaterAmount;
  drainNeed: number;
  lightNeed: number;
  moistureMin: number;
  moistureMax: number;
  evaporationRate: number;
  specialRule: string;
}

export interface PlantSlot {
  id: string;
  plantType: PlantType;
  customName: string;
  soilMoisture: number;
  health: number;
  daysSinceWater: number;
  hasDrainHole: boolean;
  correctCareCount: number;
  floodedDays: number;
  lastActionDay: number;
  consecutiveWaterDays: number;
  lastWaterAmount: WaterAmount | 0;
  createdAt: number;
}

export interface HabitRecord {
  id: string;
  errorType: ErrorType;
  plantType: PlantType;
  day: number;
  explanation: string;
  timestamp: number;
}

export interface Badge {
  id: string;
  plantType: PlantType;
  level: number;
  earnedDay: number;
}

export interface PlayerState {
  id: string;
  name: string;
  currentDay: number;
  plants: PlantSlot[];
  habits: HabitRecord[];
  badges: Badge[];
  lastPlayed: number;
}

export interface EnvironmentState {
  season: Season;
  weather: Weather;
  sunlight: number;
  temperature: number;
}

export interface TeacherConfig {
  className: string;
  password: string;
  plantTemplates: PlantTemplateConfig[];
}

export interface PlantTemplateConfig {
  plantType: PlantType;
  customName: string;
  hasDrainHole: boolean;
  initialMoisture: number;
}

export interface WateringResult {
  newMoisture: number;
  newHealth: number;
  errors: { type: ErrorType; explanation: string }[];
  isCorrect: boolean;
}

export interface ActionLog {
  day: number;
  action: 'water' | 'drain' | 'skip';
  amount?: WaterAmount;
  correct: boolean;
  errors: ErrorType[];
}
