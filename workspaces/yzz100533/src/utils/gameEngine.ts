import type {
  PlantSlot,
  EnvironmentState,
  WaterAmount,
  WateringResult,
  ErrorType,
  Season,
  Weather,
  PlantType,
  Badge,
  HabitRecord,
  HealthLevel,
  MoistureLevel,
  ActionLog,
} from '@/types';
import {
  PLANT_CONFIGS,
  SEASON_INFO,
  ERROR_EXPLANATIONS,
  WATER_MOISTURE_MAP,
  BADGE_NAMES,
  BADGE_LEVELS,
} from '@/data/plants';

const DAYS_PER_SEASON = 7;

export function getHealthLevel(health: number): HealthLevel {
  if (health >= 80) return 'healthy';
  if (health >= 60) return 'good';
  if (health >= 40) return 'fair';
  if (health >= 20) return 'wilted';
  return 'dying';
}

export function getMoistureLevel(moisture: number): MoistureLevel {
  if (moisture >= 80) return 'flooded';
  if (moisture >= 60) return 'wet';
  if (moisture >= 40) return 'moist';
  if (moisture >= 20) return 'dry';
  return 'parched';
}

export function getSeasonFromDay(day: number): Season {
  const seasonIndex = Math.floor((day / DAYS_PER_SEASON) % 4);
  return (['spring', 'summer', 'autumn', 'winter'] as Season[])[seasonIndex];
}

export function generateWeather(season: Season): Weather {
  const rainChance = SEASON_INFO[season].rainChance;
  const rand = Math.random();
  if (rand < rainChance) return 'rainy';
  if (rand < rainChance + 0.25) return 'cloudy';
  return 'sunny';
}

export function generateEnvironment(day: number): EnvironmentState {
  const season = getSeasonFromDay(day);
  const weather = generateWeather(season);
  const info = SEASON_INFO[season];
  const tempRange = info.tempRange;
  const temperature = tempRange[0] + Math.random() * (tempRange[1] - tempRange[0]);
  const sunlight = weather === 'sunny' ? 1.0 * info.sunMultiplier
    : weather === 'cloudy' ? 0.5 * info.sunMultiplier
    : 0.2 * info.sunMultiplier;
  return { season, weather, sunlight, temperature: Math.round(temperature) };
}

export function calculateEvaporation(plant: PlantSlot, env: EnvironmentState): number {
  const config = PLANT_CONFIGS[plant.plantType];
  const tempFactor = env.temperature / 25;
  const sunFactor = 0.5 + env.sunlight * 0.5;
  return config.evaporationRate * tempFactor * sunFactor;
}

export function advanceDay(plant: PlantSlot, env: EnvironmentState): PlantSlot {
  const evaporation = calculateEvaporation(plant, env);
  let newMoisture = plant.soilMoisture - evaporation;
  if (env.weather === 'rainy') {
    newMoisture += 15 + Math.random() * 10;
  }
  newMoisture = Math.max(0, Math.min(100, newMoisture));

  const config = PLANT_CONFIGS[plant.plantType];
  let healthDelta = 0;
  if (newMoisture >= config.moistureMin && newMoisture <= config.moistureMax) {
    healthDelta = 2;
  } else if (newMoisture < config.moistureMin) {
    healthDelta = -3 - (config.moistureMin - newMoisture) * 0.1;
  } else if (newMoisture > config.moistureMax + 20) {
    healthDelta = -4;
  } else {
    healthDelta = -1;
  }

  let floodedDays = plant.floodedDays;
  if (newMoisture > 80 && !plant.hasDrainHole) {
    floodedDays += 1;
    healthDelta -= 2;
  } else {
    floodedDays = 0;
  }

  let consecutiveWaterDays = plant.consecutiveWaterDays;
  if (plant.daysSinceWater > 1) {
    consecutiveWaterDays = 0;
  }

  return {
    ...plant,
    soilMoisture: Math.round(newMoisture),
    health: Math.max(0, Math.min(100, Math.round(plant.health + healthDelta))),
    daysSinceWater: plant.daysSinceWater + 1,
    floodedDays,
    consecutiveWaterDays,
  };
}

export function waterPlant(
  plant: PlantSlot,
  amount: WaterAmount,
  env: EnvironmentState,
  currentDay: number
): { plant: PlantSlot; result: WateringResult } {
  const config = PLANT_CONFIGS[plant.plantType];
  const errors: { type: ErrorType; explanation: string }[] = [];
  let isCorrect = true;

  if (env.weather === 'rainy') {
    errors.push({ type: 'rain_water', explanation: ERROR_EXPLANATIONS.rain_water });
    isCorrect = false;
  }

  if (plant.soilMoisture > 60 && amount > config.preferredAmount) {
    errors.push({ type: 'overwater', explanation: ERROR_EXPLANATIONS.overwater });
    isCorrect = false;
  }

  if (plant.soilMoisture > 75 && amount >= 2) {
    if (!errors.some(e => e.type === 'overwater')) {
      errors.push({ type: 'overwater', explanation: ERROR_EXPLANATIONS.overwater });
      isCorrect = false;
    }
  }

  const newConsecutiveDays = plant.daysSinceWater <= 1 ? plant.consecutiveWaterDays + 1 : 1;
  const isLargeAmount = amount >= 2;
  if (newConsecutiveDays >= 2 && isLargeAmount) {
    errors.push({ type: 'consecutive_water', explanation: ERROR_EXPLANATIONS.consecutive_water });
    isCorrect = false;
  }

  const waterAdded = WATER_MOISTURE_MAP[amount];
  let newMoisture = plant.soilMoisture + waterAdded * (0.8 + Math.random() * 0.4);

  const drainFactor = plant.hasDrainHole ? 0.8 : 0;
  const overflow = Math.max(0, newMoisture - 100) * drainFactor;
  newMoisture = newMoisture - overflow;
  newMoisture = Math.max(0, Math.min(100, newMoisture));

  let healthDelta = 0;
  if (newMoisture >= config.moistureMin && newMoisture <= config.moistureMax) {
    healthDelta = 5;
  } else if (newMoisture > config.moistureMax + 15) {
    healthDelta = -8;
  } else if (newMoisture > config.moistureMax) {
    healthDelta = -2;
  } else if (newMoisture < config.moistureMin - 10) {
    healthDelta = -1;
  }

  if (!isCorrect) {
    healthDelta -= 3;
  }

  if (newConsecutiveDays >= 3 && isLargeAmount) {
    healthDelta -= 5;
  }

  const newPlant: PlantSlot = {
    ...plant,
    soilMoisture: Math.round(newMoisture),
    health: Math.max(0, Math.min(100, Math.round(plant.health + healthDelta))),
    daysSinceWater: 0,
    correctCareCount: isCorrect ? plant.correctCareCount + 1 : plant.correctCareCount,
    lastActionDay: currentDay,
    consecutiveWaterDays: newConsecutiveDays,
    lastWaterAmount: amount,
  };

  return {
    plant: newPlant,
    result: {
      newMoisture: newPlant.soilMoisture,
      newHealth: newPlant.health,
      errors,
      isCorrect,
    },
  };
}

export function drainPlant(plant: PlantSlot): PlantSlot {
  if (!plant.hasDrainHole) return plant;
  const newMoisture = Math.max(0, plant.soilMoisture - 25);
  return {
    ...plant,
    soilMoisture: Math.round(newMoisture),
    floodedDays: 0,
  };
}

export function checkUnderwaterError(plant: PlantSlot, currentDay: number): HabitRecord | null {
  const config = PLANT_CONFIGS[plant.plantType];
  if (plant.daysSinceWater > config.waterFrequencyMax && plant.soilMoisture < config.moistureMin) {
    return {
      id: `uw-${currentDay}-${plant.id}`,
      errorType: 'underwater',
      plantType: plant.plantType,
      day: currentDay,
      explanation: ERROR_EXPLANATIONS.underwater,
      timestamp: Date.now(),
    };
  }
  return null;
}

export function checkDrainMissError(plant: PlantSlot, currentDay: number): HabitRecord | null {
  if (!plant.hasDrainHole && plant.floodedDays >= 2) {
    return {
      id: `dm-${currentDay}-${plant.id}`,
      errorType: 'drain_miss',
      plantType: plant.plantType,
      day: currentDay,
      explanation: ERROR_EXPLANATIONS.drain_miss,
      timestamp: Date.now(),
    };
  }
  return null;
}

export function calculateBadges(plants: PlantSlot[], existingBadges: Badge[], currentDay: number): Badge[] {
  const badges = [...existingBadges];
  const careByType: Record<PlantType, number> = { succulent: 0, mint: 0, seedling: 0, flowering: 0 };

  for (const plant of plants) {
    careByType[plant.plantType] += plant.correctCareCount;
  }

  for (const [plantType, count] of Object.entries(careByType)) {
    const pt = plantType as PlantType;
    const existingLevel = badges.find(b => b.plantType === pt)?.level ?? 0;
    for (const badgeLevel of BADGE_LEVELS) {
      if (count >= badgeLevel.threshold && badgeLevel.level > existingLevel) {
        const idx = badges.findIndex(b => b.plantType === pt);
        if (idx >= 0) {
          badges[idx] = { id: `badge-${pt}`, plantType: pt, level: badgeLevel.level, earnedDay: currentDay };
        } else {
          badges.push({ id: `badge-${pt}`, plantType: pt, level: badgeLevel.level, earnedDay: currentDay });
        }
      }
    }
  }

  return badges;
}

export function createPlant(plantType: PlantType, customName: string, hasDrainHole: boolean, initialMoisture?: number): PlantSlot {
  const config = PLANT_CONFIGS[plantType];
  return {
    id: `plant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    plantType,
    customName: customName || config.name,
    soilMoisture: initialMoisture ?? Math.round((config.moistureMin + config.moistureMax) / 2),
    health: 75,
    daysSinceWater: 0,
    hasDrainHole,
    correctCareCount: 0,
    floodedDays: 0,
    lastActionDay: 0,
    consecutiveWaterDays: 0,
    lastWaterAmount: 0,
    createdAt: Date.now(),
  };
}

export function getHabitStats(habits: HabitRecord[]): Record<ErrorType, number> {
  return {
    overwater: habits.filter(h => h.errorType === 'overwater').length,
    underwater: habits.filter(h => h.errorType === 'underwater').length,
    drain_miss: habits.filter(h => h.errorType === 'drain_miss').length,
    rain_water: habits.filter(h => h.errorType === 'rain_water').length,
    consecutive_water: habits.filter(h => h.errorType === 'consecutive_water').length,
  };
}

export function getActionLogsForPlant(habits: HabitRecord[], plantType: PlantType, limit = 5): ActionLog[] {
  return habits
    .filter(h => h.plantType === plantType)
    .slice(-limit)
    .map(h => ({
      day: h.day,
      action: 'water' as const,
      correct: false,
      errors: [h.errorType],
    }));
}

export function getBestPlantType(plants: PlantSlot[]): { type: PlantType; score: number } | null {
  const typeScores: Record<PlantType, { total: number; count: number }> = {
    succulent: { total: 0, count: 0 },
    mint: { total: 0, count: 0 },
    seedling: { total: 0, count: 0 },
    flowering: { total: 0, count: 0 },
  };

  for (const plant of plants) {
    typeScores[plant.plantType].total += plant.health + plant.correctCareCount * 5;
    typeScores[plant.plantType].count += 1;
  }

  let bestType: PlantType | null = null;
  let bestScore = -1;

  for (const [type, data] of Object.entries(typeScores)) {
    if (data.count === 0) continue;
    const avgScore = data.total / data.count;
    if (avgScore > bestScore) {
      bestScore = avgScore;
      bestType = type as PlantType;
    }
  }

  return bestType ? { type: bestType, score: Math.round(bestScore) } : null;
}
