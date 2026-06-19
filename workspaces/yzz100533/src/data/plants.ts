import type { PlantConfig, PlantType, Season, Weather } from '@/types';

export const PLANT_CONFIGS: Record<PlantType, PlantConfig> = {
  succulent: {
    type: 'succulent',
    name: '多肉',
    waterFrequencyMin: 7,
    waterFrequencyMax: 10,
    preferredAmount: 1,
    drainNeed: 5,
    lightNeed: 5,
    moistureMin: 20,
    moistureMax: 40,
    evaporationRate: 3,
    specialRule: '连续浇水会烂根，积水1天即警告',
  },
  mint: {
    type: 'mint',
    name: '薄荷',
    waterFrequencyMin: 2,
    waterFrequencyMax: 3,
    preferredAmount: 2,
    drainNeed: 3,
    lightNeed: 2,
    moistureMin: 40,
    moistureMax: 65,
    evaporationRate: 5,
    specialRule: '忌积水但喜湿润，叶片最先反应缺水',
  },
  seedling: {
    type: 'seedling',
    name: '幼苗',
    waterFrequencyMin: 1,
    waterFrequencyMax: 2,
    preferredAmount: 2,
    drainNeed: 3,
    lightNeed: 3,
    moistureMin: 35,
    moistureMax: 60,
    evaporationRate: 6,
    specialRule: '极其脆弱，大水冲击可致命，需稳定湿度',
  },
  flowering: {
    type: 'flowering',
    name: '开花植物',
    waterFrequencyMin: 3,
    waterFrequencyMax: 4,
    preferredAmount: 3,
    drainNeed: 4,
    lightNeed: 4,
    moistureMin: 40,
    moistureMax: 70,
    evaporationRate: 4,
    specialRule: '花期需水增加，积水导致落蕾',
  },
};

export const PLANT_EMOJI: Record<PlantType, string> = {
  succulent: '🪴',
  mint: '🌿',
  seedling: '🌱',
  flowering: '🌸',
};

export const SEASON_INFO: Record<Season, { name: string; icon: string; tempRange: [number, number]; sunMultiplier: number; rainChance: number }> = {
  spring: { name: '春天', icon: '🌸', tempRange: [15, 22], sunMultiplier: 0.8, rainChance: 0.2 },
  summer: { name: '夏天', icon: '☀️', tempRange: [25, 35], sunMultiplier: 1.2, rainChance: 0.15 },
  autumn: { name: '秋天', icon: '🍂', tempRange: [12, 20], sunMultiplier: 0.7, rainChance: 0.2 },
  winter: { name: '冬天', icon: '❄️', tempRange: [0, 10], sunMultiplier: 0.5, rainChance: 0.1 },
};

export const WEATHER_INFO: Record<Weather, { name: string; icon: string; moistureEffect: number }> = {
  sunny: { name: '晴天', icon: '☀️', moistureEffect: 0 },
  cloudy: { name: '阴天', icon: '☁️', moistureEffect: 5 },
  rainy: { name: '雨天', icon: '🌧️', moistureEffect: 20 },
};

export const ERROR_EXPLANATIONS = {
  overwater: '土壤已经湿润，再多浇水会让根系泡在水里无法呼吸，就像我们被捂住口鼻一样难受。根系长时间泡水会发黑腐烂！',
  underwater: '土壤太干了，根系吸不到水分，叶片就会蔫下来，就像我们渴了很久没喝水一样。长时间缺水，根系会干枯断裂！',
  drain_miss: '没有排水孔的花盆就像一个浴缸，水排不出去，根系一直泡着就会腐烂变黑。记得选择有排水孔的花盆哦！',
  rain_water: '下雨天空气和土壤都很潮湿，植物已经能从空气里吸收水分，再浇水就太多了。雨天要让植物好好"喝"自然的雨水！',
  consecutive_water: '连续几天浇大水对植物伤害很大！根系需要呼吸的时间，就像我们不能一直喝水不喘气一样。土壤需要干湿交替，让根系既有水喝又能呼吸空气。',
};

export const BADGE_NAMES: Record<PlantType, string> = {
  succulent: '多肉达人',
  mint: '薄荷能手',
  seedling: '幼苗守护者',
  flowering: '花语专家',
};

export const BADGE_LEVELS = [
  { level: 1, name: '入门', threshold: 5 },
  { level: 2, name: '熟练', threshold: 15 },
  { level: 3, name: '达人', threshold: 30 },
];

export const WATER_AMOUNT_LABELS: Record<number, string> = {
  1: '少量',
  2: '适中',
  3: '大量',
};

export const WATER_MOISTURE_MAP: Record<number, number> = {
  1: 15,
  2: 30,
  3: 50,
};

export const DEFAULT_TEMPLATES: PlantType[] = ['succulent', 'mint', 'seedling', 'flowering'];
