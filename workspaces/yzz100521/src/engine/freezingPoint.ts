import { COMPOSITION, MOLAR_MASS, FREEZING_POINT_CONSTANT, ALCOHOL_EFFECT } from './constants';
import type { CalculationStep } from './types';

export function calculateFreezingPoint(
  weights: {
    milk: number;
    cream: number;
    sugar: number;
    fruitPuree: number;
    alcohol: number;
    stabilizer: number;
    total: number;
  },
  sugarBreakdown: {
    bySource: { milk: number; cream: number; added: number; fruit: number };
  },
  alcoholAbv: number
): { freezingPoint: number; alcoholContent: number; calculationSteps: CalculationStep[] } {
  const calculationSteps: CalculationStep[] = [];

  const lactose = sugarBreakdown.bySource.milk + sugarBreakdown.bySource.cream;
  const sucrose = sugarBreakdown.bySource.added;
  const fructose = sugarBreakdown.bySource.fruit;

  calculationSteps.push({
    name: '分类糖的种类',
    formula: 'lactose = milkSugar + creamSugar; sucrose = addedSugar; fructose = fruitSugar',
    variables: {
      lactose,
      sucrose,
      fructose,
    },
    result: lactose + sucrose + fructose,
  });

  const totalWater =
    weights.milk * COMPOSITION.milk.water +
    weights.cream * COMPOSITION.cream.water +
    weights.fruitPuree * COMPOSITION.fruitPuree.medium.water;

  calculationSteps.push({
    name: '计算总水分含量',
    formula: 'totalWater = milkWater + creamWater + fruitWater',
    variables: {
      milkWater: weights.milk * COMPOSITION.milk.water,
      creamWater: weights.cream * COMPOSITION.cream.water,
      fruitWater: weights.fruitPuree * COMPOSITION.fruitPuree.medium.water,
    },
    result: totalWater,
    unit: 'g',
  });

  const waterKg = totalWater / 1000;

  calculationSteps.push({
    name: '水分转换为千克',
    formula: 'waterKg = totalWater / 1000',
    variables: { totalWater },
    result: waterKg,
    unit: 'kg',
  });

  const lactoseMolality = lactose / MOLAR_MASS.lactose / waterKg;
  const sucroseMolality = sucrose / MOLAR_MASS.sucrose / waterKg;
  const fructoseMolality = fructose / MOLAR_MASS.glucose / waterKg;

  calculationSteps.push({
    name: '乳糖摩尔浓度',
    formula: 'molality = lactose / molarMass / waterKg',
    variables: {
      lactose,
      molarMass: MOLAR_MASS.lactose,
      waterKg,
    },
    result: lactoseMolality,
    unit: 'mol/kg',
  });

  calculationSteps.push({
    name: '蔗糖摩尔浓度',
    formula: 'molality = sucrose / molarMass / waterKg',
    variables: {
      sucrose,
      molarMass: MOLAR_MASS.sucrose,
      waterKg,
    },
    result: sucroseMolality,
    unit: 'mol/kg',
  });

  calculationSteps.push({
    name: '果糖摩尔浓度',
    formula: 'molality = fructose / molarMass / waterKg',
    variables: {
      fructose,
      molarMass: MOLAR_MASS.glucose,
      waterKg,
    },
    result: fructoseMolality,
    unit: 'mol/kg',
  });

  const totalSugarMolality = lactoseMolality + sucroseMolality + fructoseMolality;

  calculationSteps.push({
    name: '总糖摩尔浓度',
    formula: 'totalMolality = lactoseMolality + sucroseMolality + fructoseMolality',
    variables: {
      lactoseMolality,
      sucroseMolality,
      fructoseMolality,
    },
    result: totalSugarMolality,
    unit: 'mol/kg',
  });

  const sugarFreezingPointDepression = FREEZING_POINT_CONSTANT * totalSugarMolality;

  calculationSteps.push({
    name: '糖引起的凝固点降低',
    formula: 'ΔT_sugar = Kf × totalMolality',
    variables: {
      Kf: FREEZING_POINT_CONSTANT,
      totalMolality: totalSugarMolality,
    },
    result: sugarFreezingPointDepression,
    unit: '°C',
  });

  const pureAlcoholWeight = weights.alcohol * (alcoholAbv / 100);
  const alcoholContent = (pureAlcoholWeight / weights.total) * 100;

  calculationSteps.push({
    name: '纯酒精重量',
    formula: 'pureAlcohol = alcoholWeight × (abv / 100)',
    variables: {
      alcoholWeight: weights.alcohol,
      abv: alcoholAbv,
    },
    result: pureAlcoholWeight,
    unit: 'g',
  });

  calculationSteps.push({
    name: '酒精体积百分比',
    formula: 'alcoholContent = (pureAlcohol / totalWeight) × 100',
    variables: {
      pureAlcohol: pureAlcoholWeight,
      totalWeight: weights.total,
    },
    result: alcoholContent,
    unit: '%',
  });

  const alcoholFreezingPointDepression = (alcoholContent / 100) * ALCOHOL_EFFECT.perPercent * 100;

  calculationSteps.push({
    name: '酒精引起的凝固点降低',
    formula: 'ΔT_alcohol = alcoholContent × effectPerPercent',
    variables: {
      alcoholContent: alcoholContent / 100,
      effectPerPercent: ALCOHOL_EFFECT.perPercent * 100,
    },
    result: alcoholFreezingPointDepression,
    unit: '°C',
  });

  const totalDepression = sugarFreezingPointDepression + alcoholFreezingPointDepression;
  const freezingPoint = -totalDepression;

  calculationSteps.push({
    name: '总凝固点降低',
    formula: 'ΔT_total = ΔT_sugar + ΔT_alcohol',
    variables: {
      ΔT_sugar: sugarFreezingPointDepression,
      ΔT_alcohol: alcoholFreezingPointDepression,
    },
    result: totalDepression,
    unit: '°C',
  });

  calculationSteps.push({
    name: '最终凝固点',
    formula: 'freezingPoint = 0 - ΔT_total',
    variables: {
      ΔT_total: totalDepression,
    },
    result: freezingPoint,
    unit: '°C',
  });

  return {
    freezingPoint,
    alcoholContent,
    calculationSteps,
  };
}
