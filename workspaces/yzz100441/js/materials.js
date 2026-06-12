const FREQ_BANDS = [125, 250, 500, 1000, 2000, 4000];

const MATERIALS_DB = {
  gypsum_board_12mm: {
    name: '石膏板 (12mm)',
    category: 'wall',
    alpha: { 125: 0.05, 250: 0.10, 500: 0.15, 1000: 0.20, 2000: 0.15, 4000: 0.10 },
    price: 45,
    source: 'GB/T 20247-2006 混响室法'
  },
  concrete_raw: {
    name: '清水混凝土/水泥墙',
    category: 'wall',
    alpha: { 125: 0.02, 250: 0.03, 500: 0.04, 1000: 0.05, 2000: 0.07, 4000: 0.08 },
    price: 0,
    source: '建筑声学设计手册'
  },
  brick_painted: {
    name: '砖墙 (刷漆)',
    category: 'wall',
    alpha: { 125: 0.02, 250: 0.03, 500: 0.04, 1000: 0.05, 2000: 0.06, 4000: 0.07 },
    price: 8,
    source: '建筑声学设计手册'
  },
  glass_single: {
    name: '单层玻璃窗 (5mm)',
    category: 'wall',
    alpha: { 125: 0.08, 250: 0.10, 500: 0.06, 1000: 0.04, 2000: 0.03, 4000: 0.02 },
    price: 180,
    source: '玻璃厂商声学数据'
  },
  wood_panel: {
    name: '实木板 (15mm)',
    category: 'wall',
    alpha: { 125: 0.10, 250: 0.08, 500: 0.06, 1000: 0.08, 2000: 0.10, 4000: 0.12 },
    price: 220,
    source: '建筑声学设计手册'
  },
  mineral_wool_25mm: {
    name: '矿棉吸音板 (25mm)',
    category: 'absorber_medium',
    alpha: { 125: 0.15, 250: 0.45, 500: 0.90, 1000: 0.95, 2000: 0.95, 4000: 0.85 },
    price: 65,
    source: 'GB/T 20247-2006'
  },
  mineral_wool_50mm: {
    name: '矿棉/玻璃棉 (50mm, 后空腔)',
    category: 'absorber_medium',
    alpha: { 125: 0.35, 250: 0.70, 500: 0.95, 1000: 0.95, 2000: 0.90, 4000: 0.80 },
    price: 95,
    source: 'Owens Corning 703 参考'
  },
  mineral_wool_100mm: {
    name: '玻璃棉 (100mm, 低频陷阱)',
    category: 'absorber_bass',
    alpha: { 125: 0.70, 250: 0.90, 500: 0.95, 1000: 0.95, 2000: 0.90, 4000: 0.85 },
    price: 160,
    source: '声学厂家实测'
  },
  polyester_fiber_25mm: {
    name: '聚酯纤维吸音板 (25mm)',
    category: 'absorber_medium',
    alpha: { 125: 0.10, 250: 0.30, 500: 0.70, 1000: 0.85, 2000: 0.90, 4000: 0.80 },
    price: 75,
    source: '厂家标称值'
  },
  fabric_wrapped_50mm: {
    name: '布艺软包 (50mm 棉芯)',
    category: 'absorber_medium',
    alpha: { 125: 0.20, 250: 0.55, 500: 0.85, 1000: 0.95, 2000: 0.90, 4000: 0.80 },
    price: 180,
    source: 'GB/T 20247-2006'
  },
  perforated_wood: {
    name: '穿孔木质吸音板',
    category: 'absorber_bass',
    alpha: { 125: 0.55, 250: 0.80, 500: 0.60, 1000: 0.40, 2000: 0.30, 4000: 0.25 },
    price: 260,
    source: '穿孔板亥姆霍兹共振原理'
  },
  perforated_gk: {
    name: '穿孔石膏吸声板',
    category: 'absorber_bass',
    alpha: { 125: 0.45, 250: 0.70, 500: 0.55, 1000: 0.35, 2000: 0.25, 4000: 0.20 },
    price: 110,
    source: 'GB/T 25998-2010'
  },
  diffuser_qrd: {
    name: 'QRD 二次余数扩散体',
    category: 'diffuser',
    alpha: { 125: 0.05, 250: 0.10, 500: 0.20, 1000: 0.15, 2000: 0.10, 4000: 0.08 },
    price: 680,
    source: '扩散为主，吸声为辅'
  },
  wood_floor: {
    name: '实木地板 (龙骨)',
    category: 'floor',
    alpha: { 125: 0.15, 250: 0.12, 500: 0.10, 1000: 0.08, 2000: 0.07, 4000: 0.06 },
    price: 280,
    source: '建筑声学设计手册'
  },
  concrete_floor: {
    name: '水泥地面/瓷砖',
    category: 'floor',
    alpha: { 125: 0.02, 250: 0.03, 500: 0.04, 1000: 0.05, 2000: 0.05, 4000: 0.06 },
    price: 120,
    source: '建筑声学设计手册'
  },
  carpet_thick: {
    name: '厚地毯 (8mm 带胶垫)',
    category: 'floor',
    alpha: { 125: 0.10, 250: 0.25, 500: 0.55, 1000: 0.70, 2000: 0.75, 4000: 0.70 },
    price: 220,
    source: 'ASTM C423 参考'
  },
  suspended_gypsum: {
    name: '吊顶石膏板',
    category: 'ceiling',
    alpha: { 125: 0.15, 250: 0.10, 500: 0.08, 1000: 0.06, 2000: 0.05, 4000: 0.04 },
    price: 75,
    source: '建筑声学设计手册'
  },
  mineral_ceiling: {
    name: '矿棉吸声吊顶 (15mm)',
    category: 'ceiling',
    alpha: { 125: 0.20, 250: 0.45, 500: 0.75, 1000: 0.90, 2000: 0.85, 4000: 0.75 },
    price: 85,
    source: 'GB/T 25998-2010'
  },
  bass_trap_corner: {
    name: '墙角低频陷阱 (专)',
    category: 'absorber_bass',
    alpha: { 125: 0.85, 250: 0.95, 500: 0.90, 1000: 0.80, 2000: 0.70, 4000: 0.60 },
    price: 320,
    source: '专业声学厂家'
  },
  custom: {
    name: '✎ 自定义吸声系数',
    category: 'custom',
    alpha: { 125: 0.10, 250: 0.10, 500: 0.10, 1000: 0.10, 2000: 0.10, 4000: 0.10 },
    price: 0,
    source: '用户自定义'
  }
};

const CURTAIN_TYPES = {
  heavy: {
    name: '厚丝绒/遮光窗帘',
    alpha: { 125: 0.15, 250: 0.35, 500: 0.55, 1000: 0.65, 2000: 0.70, 4000: 0.65 },
    note: '褶皱比例 2:1'
  },
  medium: {
    name: '中厚棉麻窗帘',
    alpha: { 125: 0.10, 250: 0.25, 500: 0.45, 1000: 0.55, 2000: 0.60, 4000: 0.55 },
    note: '褶皱比例 1.5:1'
  },
  thin: {
    name: '薄纱/百叶帘',
    alpha: { 125: 0.03, 250: 0.08, 500: 0.18, 1000: 0.25, 2000: 0.30, 4000: 0.28 },
    note: '近似开敞'
  }
};

const FURNITURE_TYPES = {
  sofa_large: {
    name: '三人布艺沙发',
    eqArea: 3.5,
    alphaProfile: 'sofa',
    price: 0,
    note: '展开吸声面积 ~3.5㎡'
  },
  sofa_small: {
    name: '单人/双人沙发',
    eqArea: 1.8,
    alphaProfile: 'sofa',
    price: 0,
    note: ''
  },
  desk_chair: {
    name: '工作台 + 办公椅',
    eqArea: 1.2,
    alphaProfile: 'mixed',
    price: 0,
    note: ''
  },
  studio_chair: {
    name: '录音棚监听椅',
    eqArea: 0.9,
    alphaProfile: 'fabric',
    price: 0,
    note: ''
  },
  rack_equipment: {
    name: '设备机柜 (含设备)',
    eqArea: 2.0,
    alphaProfile: 'mixed',
    price: 0,
    note: '42U 标准机柜估算'
  },
  piano_grand: {
    name: '三角钢琴',
    eqArea: 2.8,
    alphaProfile: 'wood',
    price: 0,
    note: '音板辐射面估'
  },
  piano_upright: {
    name: '立式钢琴',
    eqArea: 1.8,
    alphaProfile: 'wood',
    price: 0,
    note: ''
  },
  instrument_racks: {
    name: '吉他/乐器架组',
    eqArea: 1.0,
    alphaProfile: 'mixed',
    price: 0,
    note: ''
  },
  bookshelf_full: {
    name: '满装书架 (1m宽)',
    eqArea: 1.5,
    alphaProfile: 'books',
    price: 0,
    note: '非常好的扩散+吸声'
  }
};

const FURNITURE_ALPHA_PROFILES = {
  sofa:    { 125: 0.35, 250: 0.55, 500: 0.70, 1000: 0.75, 2000: 0.70, 4000: 0.65 },
  mixed:   { 125: 0.10, 250: 0.20, 500: 0.35, 1000: 0.40, 2000: 0.40, 4000: 0.35 },
  fabric:  { 125: 0.15, 250: 0.30, 500: 0.45, 1000: 0.50, 2000: 0.48, 4000: 0.40 },
  wood:    { 125: 0.20, 250: 0.15, 500: 0.12, 1000: 0.10, 2000: 0.08, 4000: 0.07 },
  books:   { 125: 0.15, 250: 0.30, 500: 0.50, 1000: 0.60, 2000: 0.65, 4000: 0.70 }
};

const PURPOSES = {
  voice_studio: {
    name: '语音录音棚 (播客/配音)',
    rtRange: { min: 0.30, max: 0.50 },
    flatness: 0.15,
    hint: '强调语言清晰度，中高频平直为主'
  },
  music_studio: {
    name: '音乐录音棚 (独唱/小乐队)',
    rtRange: { min: 0.40, max: 0.80 },
    flatness: 0.25,
    hint: '低频可略高 (125Hz 可到 0.8s)，音乐更丰满'
  },
  mixing_room: {
    name: '混音/母带室',
    rtRange: { min: 0.20, max: 0.40 },
    flatness: 0.10,
    hint: '要求非常平直，偏差不超过 ±10%'
  },
  listening_room: {
    name: 'HiFi 试听室',
    rtRange: { min: 0.30, max: 0.60 },
    flatness: 0.20,
    hint: '参考 ITU-R BS.1116 标准'
  },
  rehearsal: {
    name: '乐队排练室',
    rtRange: { min: 0.40, max: 0.90 },
    flatness: 0.30,
    hint: '注意控制低频避免轰轰作响'
  },
  custom: {
    name: '自定义目标',
    rtRange: { min: 0.30, max: 0.50 },
    flatness: 0.20,
    hint: '由用户自定义各频段目标值'
  }
};

const AIR_ABSORPTION_M = {
  125:  0.000,
  250:  0.000,
  500:  0.000,
  1000: 0.002,
  2000: 0.007,
  4000: 0.022
};

const SURFACE_LABELS = {
  north:   '北墙',
  south:   '南墙',
  east:    '东墙',
  west:    '西墙',
  floor:   '地面',
  ceiling: '顶面'
};

const FOOT_TO_METER = 0.3048;

function getMaterialAlpha(materialId, customAlpha) {
  if (customAlpha) {
    const out = {};
    for (const f of FREQ_BANDS) out[f] = (typeof customAlpha[f] === 'number') ? customAlpha[f] : 0.05;
    return out;
  }
  const mat = MATERIALS_DB[materialId];
  if (!mat) {
    const out = {};
    for (const f of FREQ_BANDS) out[f] = 0.05;
    return out;
  }
  const out = {};
  for (const f of FREQ_BANDS) {
    out[f] = (typeof mat.alpha[f] === 'number') ? mat.alpha[f] : 0.05;
  }
  return out;
}

function getMaterialPrice(materialId, customPrice) {
  if (typeof customPrice === 'number' && !isNaN(customPrice)) return customPrice;
  return (MATERIALS_DB[materialId] && MATERIALS_DB[materialId].price) || 0;
}

function getMaterialName(materialId) {
  return (MATERIALS_DB[materialId] && MATERIALS_DB[materialId].name) || '未选择';
}
