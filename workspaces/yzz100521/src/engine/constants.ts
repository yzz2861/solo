export const DENSITY = {
  milk: 1.03,
  cream: 0.98,
  sugar: 1.59,
  fruitPuree: 1.05,
  alcohol: 0.79,
  stabilizer: 1.0,
  water: 1.0,
} as const;

export const COMPOSITION = {
  milk: {
    fat: 0.035,
    solids: 0.12,
    sugar: 0.05,
    water: 0.88,
  },
  cream: {
    fat: 0.35,
    solids: 0.40,
    sugar: 0.04,
    water: 0.60,
  },
  sugar: {
    solids: 1.0,
    sugar: 1.0,
    water: 0,
  },
  fruitPuree: {
    low: { sugar: 0.09, solids: 0.12, water: 0.88 },
    medium: { sugar: 0.135, solids: 0.17, water: 0.83 },
    high: { sugar: 0.20, solids: 0.24, water: 0.76 },
  },
  alcohol: {
    solids: 1.0,
    water: 0,
  },
  stabilizer: {
    solids: 1.0,
    water: 0,
  },
} as const;

export const FRUIT_SUGAR_CONTENT: Record<string, { level: 'low' | 'medium' | 'high'; sugar: number }> = {
  strawberry: { level: 'low', sugar: 0.08 },
  raspberry: { level: 'low', sugar: 0.09 },
  blueberry: { level: 'low', sugar: 0.10 },
  blackberry: { level: 'low', sugar: 0.09 },
  peach: { level: 'medium', sugar: 0.13 },
  mango: { level: 'medium', sugar: 0.15 },
  apricot: { level: 'medium', sugar: 0.13 },
  pineapple: { level: 'medium', sugar: 0.14 },
  grape: { level: 'high', sugar: 0.18 },
  lychee: { level: 'high', sugar: 0.22 },
  mango_ripe: { level: 'high', sugar: 0.20 },
  date: { level: 'high', sugar: 0.60 },
} as const;

export const MOLAR_MASS = {
  sucrose: 342.3,
  glucose: 180.2,
  lactose: 342.3,
  ethanol: 46.07,
  salt: 58.44,
} as const;

export const FREEZING_POINT_CONSTANT = 1.86;

export const RISK_THRESHOLDS = {
  alcohol: {
    warning: 0.05,
    danger: 0.08,
  },
  fat: {
    warning: 0.06,
    danger: 0.04,
  },
  sugar: {
    warning: 0.25,
    danger: 0.30,
  },
  stabilizer: {
    warning: 0.005,
    danger: 0.01,
  },
} as const;

export const SOLIDS_RATIO = {
  minIdeal: 0.35,
  maxIdeal: 0.45,
  minAcceptable: 0.30,
  maxAcceptable: 0.50,
} as const;

export const ALCOHOL_EFFECT = {
  perPercent: 0.5,
} as const;

export const DEFAULT_INGREDIENTS = {
  milk: { amount: 0, unit: 'g' as const },
  cream: { amount: 0, unit: 'g' as const },
  sugar: { amount: 0, unit: 'g' as const },
  fruitPuree: { amount: 0, unit: 'g' as const, sugarContent: 'medium' as const },
  alcohol: { amount: 0, unit: 'ml' as const, abv: 40 },
  stabilizer: { amount: 0, unit: 'g' as const },
  targetYield: { amount: 1000, unit: 'g' as const },
} as const;

export const SUGAR_CONTENT_LABELS: Record<'low' | 'medium' | 'high', { label: string; description: string }> = {
  low: {
    label: '低糖水果',
    description: '草莓、覆盆子、蓝莓等，含糖量约8-10%',
  },
  medium: {
    label: '中糖水果',
    description: '桃子、芒果、菠萝等，含糖量约12-15%',
  },
  high: {
    label: '高糖水果',
    description: '葡萄、荔枝、熟芒果等，含糖量约18-22%',
  },
} as const;
