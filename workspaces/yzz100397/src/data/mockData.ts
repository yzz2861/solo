import type { Dish, DailyRecord, Weather } from '@/types';
import { formatDate, getDaysAgo } from '@/utils/analytics';

export const MOCK_DISHES: Dish[] = [
  { id: 'd1', name: '白粥', aliases: ['大米粥'], defaultUnit: 'plate', unitCost: 8, conversionFactor: 5, category: 'staple' },
  { id: 'd2', name: '肉包子', aliases: ['包子'], defaultUnit: 'portion', unitCost: 2.5, conversionFactor: 0.1, category: 'staple' },
  { id: 'd3', name: '豆浆', aliases: [], defaultUnit: 'plate', unitCost: 6, conversionFactor: 4, category: 'beverage' },
  { id: 'd4', name: '油条', aliases: [], defaultUnit: 'portion', unitCost: 1.8, conversionFactor: 0.06, category: 'staple' },
  { id: 'd5', name: '煎鸡蛋', aliases: ['煎蛋'], defaultUnit: 'portion', unitCost: 1.5, conversionFactor: 0.05, category: 'hot' },
  { id: 'd6', name: '炒时蔬', aliases: ['青菜'], defaultUnit: 'plate', unitCost: 12, conversionFactor: 3, category: 'hot' },
  { id: 'd7', name: '培根', aliases: [], defaultUnit: 'kg', unitCost: 85, conversionFactor: 1, category: 'hot' },
  { id: 'd8', name: '香肠', aliases: [], defaultUnit: 'kg', unitCost: 45, conversionFactor: 1, category: 'hot' },
  { id: 'd9', name: '凉拌黄瓜', aliases: [], defaultUnit: 'plate', unitCost: 10, conversionFactor: 2.5, category: 'cold' },
  { id: 'd10', name: '牛奶', aliases: [], defaultUnit: 'plate', unitCost: 15, conversionFactor: 4, category: 'beverage' },
  { id: 'd11', name: '吐司面包', aliases: ['面包'], defaultUnit: 'portion', unitCost: 1.2, conversionFactor: 0.04, category: 'staple' },
  { id: 'd12', name: '炒米粉', aliases: [], defaultUnit: 'plate', unitCost: 18, conversionFactor: 3, category: 'hot' },
];

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const WEATHERS: Weather[] = ['sunny', 'cloudy', 'rainy', 'sunny', 'cloudy', 'sunny', 'rainy', 'snowy', 'sunny', 'cloudy'];

export function generateMockRecords(days: number): DailyRecord[] {
  const records: DailyRecord[] = [];
  const random = seededRand(42);

  for (let i = days - 1; i >= 0; i--) {
    const date = getDaysAgo(i);
    const weather = WEATHERS[Math.floor(random() * WEATHERS.length)];
    const baseOccupancy = 65 + random() * 25;
    const hasGroup = random() > 0.6;
    const groupGuests = hasGroup ? randInt(20, 80) : 0;
    const occupancyRate = Math.min(100, baseOccupancy + (hasGroup ? groupGuests * 0.3 : 0));
    const groupCancel = hasGroup && random() > 0.85;

    const dishRecords = MOCK_DISHES.map((dish, idx) => {
      let basePrep: number;
      if (dish.defaultUnit === 'plate') {
        basePrep = 2 + random() * 3;
      } else if (dish.defaultUnit === 'portion') {
        basePrep = 80 + random() * 80;
      } else {
        basePrep = 3 + random() * 5;
      }

      const weatherFactor = weather === 'rainy' ? 1.2 : weather === 'snowy' ? 1.15 : 1;
      const groupFactor = 1 + groupGuests * 0.004;
      const preparedQty = Math.round(basePrep * weatherFactor * groupFactor * 100) / 100;

      const isRainyBad = weather === 'rainy' && random() > 0.5;
      const baseWaste = 0.12 + random() * 0.15;
      let wasteFactor = baseWaste;
      if (isRainyBad) wasteFactor += 0.15 + random() * 0.1;
      if (groupCancel) wasteFactor += 0.25 + random() * 0.15;

      const missingWeight = random() > 0.92;
      const leftoverQty = missingWeight
        ? null
        : Math.round(preparedQty * wasteFactor * 100) / 100;

      return {
        id: `rec-${date}-${dish.id}`,
        date,
        dishId: dish.id,
        preparedQty,
        preparedUnit: dish.defaultUnit,
        leftoverQty,
        leftoverUnit: missingWeight ? null : dish.defaultUnit,
        missingWeight,
        missingReason: missingWeight ? (idx % 2 === 0 ? '太忙忘记称重' : '称重器临时故障') : undefined,
      };
    });

    let specialNote: string | undefined;
    if (groupCancel) {
      specialNote = '团队客临时取消，原定50人未到';
    } else if (random() > 0.93) {
      specialNote = '白粥今日改名大米粥';
    }

    records.push({
      date,
      occupancyRate: Math.round(occupancyRate),
      groupGuests,
      groupNote: hasGroup ? `${groupGuests}人旅游团` : undefined,
      weather,
      specialNote,
      dishRecords,
    });
  }

  return records;
}

export const MOCK_RECORDS = generateMockRecords(35);
