const VEHICLE_PARTS = {
  front: {
    name: '前部',
    subParts: {
      'front-bumper': { name: '前保险杠', aliases: ['前杠', '前保'] },
      'hood': { name: '引擎盖', aliases: ['机盖', '引擎盖'] },
      'front-grille': { name: '前中网', aliases: ['中网', '进气格栅'] },
      'front-left-fender': { name: '左前翼子板', aliases: ['左前叶子板', '左前翼子'] },
      'front-right-fender': { name: '右前翼子板', aliases: ['右前叶子板', '右前翼子'] },
      'front-left-headlight': { name: '左前大灯', aliases: ['左大灯', '左前照灯'] },
      'front-right-headlight': { name: '右前大灯', aliases: ['右大灯', '右前照灯'] },
      'front-left-fog-light': { name: '左前雾灯', aliases: ['左雾灯'] },
      'front-right-fog-light': { name: '右前雾灯', aliases: ['右雾灯'] },
      'front-windshield': { name: '前挡风玻璃', aliases: ['前挡', '前挡风'] },
      'license-plate-front': { name: '前牌照', aliases: ['前车牌'] },
      'radiator': { name: '散热器', aliases: ['水箱'] },
      'ac-condenser': { name: '空调冷凝器', aliases: ['冷凝器'] }
    }
  },
  rear: {
    name: '后部',
    subParts: {
      'rear-bumper': { name: '后保险杠', aliases: ['后杠', '后保'] },
      'trunk-lid': { name: '后备箱盖', aliases: ['尾门', '后盖', '行李箱盖'] },
      'rear-left-fender': { name: '左后翼子板', aliases: ['左后叶子板', '左后翼子'] },
      'rear-right-fender': { name: '右后翼子板', aliases: ['右后叶子板', '右后翼子'] },
      'rear-left-taillight': { name: '左后尾灯', aliases: ['左尾灯', '左后灯'] },
      'rear-right-taillight': { name: '右后尾灯', aliases: ['右尾灯', '右后灯'] },
      'rear-windshield': { name: '后挡风玻璃', aliases: ['后挡', '后挡风'] },
      'license-plate-rear': { name: '后牌照', aliases: ['后车牌'] },
      'rear-diffuser': { name: '后扩散器', aliases: ['后扰流'] },
      'spare-tire': { name: '备胎', aliases: ['备胎槽'] }
    }
  },
  left: {
    name: '左侧',
    subParts: {
      'left-front-door': { name: '左前门', aliases: ['左前车门'] },
      'left-rear-door': { name: '左后门', aliases: ['左后车门'] },
      'left-front-mirror': { name: '左后视镜', aliases: ['左反光镜', '左倒车镜'] },
      'left-front-window': { name: '左前门玻璃', aliases: ['左前窗'] },
      'left-rear-window': { name: '左后门玻璃', aliases: ['左后窗'] },
      'left-side-skirt': { name: '左侧裙边', aliases: ['左下边梁'] },
      'left-a-pillar': { name: '左A柱', aliases: ['左前柱'] },
      'left-b-pillar': { name: '左B柱', aliases: ['左中柱'] },
      'left-c-pillar': { name: '左C柱', aliases: ['左后柱'] },
      'left-front-wheel': { name: '左前轮', aliases: ['左前轮胎', '左前轮毂'] },
      'left-rear-wheel': { name: '左后轮', aliases: ['左后轮胎', '左后轮毂'] }
    }
  },
  right: {
    name: '右侧',
    subParts: {
      'right-front-door': { name: '右前门', aliases: ['右前车门'] },
      'right-rear-door': { name: '右后门', aliases: ['右后车门'] },
      'right-front-mirror': { name: '右后视镜', aliases: ['右反光镜', '右倒车镜'] },
      'right-front-window': { name: '右前门玻璃', aliases: ['右前窗'] },
      'right-rear-window': { name: '右后门玻璃', aliases: ['右后窗'] },
      'right-side-skirt': { name: '右侧裙边', aliases: ['右下边梁'] },
      'right-a-pillar': { name: '右A柱', aliases: ['右前柱'] },
      'right-b-pillar': { name: '右B柱', aliases: ['右中柱'] },
      'right-c-pillar': { name: '右C柱', aliases: ['右后柱'] },
      'right-front-wheel': { name: '右前轮', aliases: ['右前轮胎', '右前轮毂'] },
      'right-rear-wheel': { name: '右后轮', aliases: ['右后轮胎', '右后轮毂'] }
    }
  },
  roof: {
    name: '车顶',
    subParts: {
      'roof-panel': { name: '车顶面板', aliases: ['车顶', '大顶'] },
      'sunroof': { name: '天窗', aliases: ['全景天窗', '天幕'] },
      'roof-rails': { name: '行李架', aliases: ['车顶架'] },
      'antenna': { name: '天线', aliases: ['鲨鱼鳍'] }
    }
  },
  interior: {
    name: '内饰',
    subParts: {
      'steering-wheel': { name: '方向盘', aliases: ['方向盘'] },
      'dashboard': { name: '仪表台', aliases: ['仪表盘', '中控'] },
      'airbags': { name: '安全气囊', aliases: ['气囊', '气帘'] },
      'seats': { name: '座椅', aliases: ['真皮座椅'] },
      'center-console': { name: '中央控制台', aliases: ['扶手箱'] }
    }
  },
  chassis: {
    name: '底盘',
    subParts: {
      'front-suspension': { name: '前悬挂', aliases: ['前悬架'] },
      'rear-suspension': { name: '后悬挂', aliases: ['后悬架'] },
      'engine-oil-pan': { name: '发动机油底壳', aliases: ['油底壳'] },
      'transmission': { name: '变速箱', aliases: ['波箱'] },
      'exhaust-system': { name: '排气系统', aliases: ['排气管'] },
      'fuel-tank': { name: '油箱', aliases: ['燃油箱'] }
    }
  }
};

const DIRECTION_KEYWORDS = {
  '北': ['北', '向北', '朝北', '往北'],
  '南': ['南', '向南', '朝南', '往南'],
  '东': ['东', '向东', '朝东', '往东'],
  '西': ['西', '向西', '朝西', '往西'],
  '东北': ['东北', '向东北'],
  '东南': ['东南', '向东南'],
  '西北': ['西北', '向西北'],
  '西南': ['西南', '向西南'],
  '直行': ['直行', '向前', '往前', '正常行驶'],
  '左转': ['左转', '左转弯', '向左转', '调头', '掉头'],
  '右转': ['右转', '右转弯', '向右转'],
  '倒车': ['倒车', '后退', '向后倒'],
  '超车': ['超车', '从左侧超', '从右侧超'],
  '变道': ['变道', '并道', '向左并', '向右并']
};

const VAGUE_DIRECTION_WORDS = [
  '前方', '后方', '左侧', '右侧', '旁边', '对面',
  '前面', '后面', '左边', '右边', '侧边',
  '那边', '这边', '那边', '旁边'
];

const LOCATION_PATTERNS = [
  { pattern: /([\u4e00-\u9fa5]+路)/, type: 'road' },
  { pattern: /([\u4e00-\u9fa5]+街)/, type: 'street' },
  { pattern: /([\u4e00-\u9fa5]+大道)/, type: 'avenue' },
  { pattern: /([\u4e00-\u9fa5]+巷)/, type: 'alley' },
  { pattern: /([\u4e00-\u9fa5]+号)/, type: 'number' },
  { pattern: /([\u4e00-\u9fa5]+小区)/, type: 'community' },
  { pattern: /([\u4e00-\u9fa5]+停车场)/, type: 'parking' },
  { pattern: /高速|高速公路|G\d+/, type: 'highway' },
  { pattern: /(交叉口|十字路口|丁字路口|Y字路口)/, type: 'intersection' }
];

const TIME_PATTERNS = [
  { pattern: /(\d{4})[-\/年](\d{1,2})[-\/月](\d{1,2})[日号]?/, type: 'full-date' },
  { pattern: /(\d{1,2})[-\/月](\d{1,2})[日号]?/, type: 'month-day' },
  { pattern: /(\d{1,2})[:点时](\d{1,2})[分]?/, type: 'time' },
  { pattern: /(上午|下午|中午|晚上|凌晨|早上|傍晚)/, type: 'period' },
  { pattern: /(今天|昨天|前天|明天)/, type: 'relative-day' },
  { pattern: /(周一|周二|周三|周四|周五|周六|周日)/, type: 'weekday' }
];

const ACCIDENT_TYPES = {
  '追尾': ['追尾', '追撞', '撞上前方', '撞到前车'],
  '刮擦': ['刮擦', '剐蹭', '刮到', '蹭到', '擦到', '刮伤'],
  '碰撞': ['碰撞', '相撞', '撞到', '碰擦', '撞击'],
  '追尾': ['追尾'],
  '正面碰撞': ['正面碰撞', '正面相撞', '迎头相撞'],
  '侧面碰撞': ['侧面碰撞', '侧撞', '被侧面撞'],
  '翻车': ['翻车', '侧翻', '翻滚'],
  '坠河': ['坠河', '落水', '掉河里'],
  '自燃': ['自燃', '着火', '起火'],
  '涉水': ['涉水', '泡水', '被淹'],
  '高空坠物': ['高空坠物', '掉东西砸', '被砸'],
  '被盗': ['被盗', '被偷', '失窃'],
  '玻璃单独破碎': ['玻璃碎了', '玻璃破了', '玻璃单独破碎']
};

const LIABILITY_CLUES = {
  '对方全责': {
    keywords: ['对方全责', '对方全部责任', '对方全部责任', '我无责', '我无责任', '对方闯红灯', '对方逆行', '对方酒驾', '对方醉驾', '对方变道', '对方倒车', '对方追尾', '对方开门'],
    clue: '对方存在XX行为，根据《道路交通安全法》，应由对方承担全部责任。'
  },
  '我方全责': {
    keywords: ['我全责', '我方全责', '我全部责任', '我方全部责任', '我闯红灯', '我逆行', '我变道', '我倒车', '我追尾', '我开门', '溜车'],
    clue: '我方存在XX行为，根据《道路交通安全法》，应由我方承担全部责任。'
  },
  '主次责任': {
    keywords: ['主次责任', '主责', '次责', '主要责任', '次要责任'],
    clue: '根据双方过错程度，初步判断为主次责任划分，具体以交警认定为准。'
  },
  '同等责任': {
    keywords: ['同等责任', '各半责任', '五五责任'],
    clue: '双方均存在过错，初步判断为同等责任，具体以交警认定为准。'
  },
  '待认定': {
    keywords: ['责任待定', '待认定', '交警认定', '未定'],
    clue: '事故责任有待交警部门进一步调查认定。'
  }
};

const DAMAGE_TYPES = {
  '剐蹭': ['剐蹭', '刮擦', '刮痕', '划痕', '擦痕', '轻微刮伤'],
  '凹陷': ['凹陷', '凹坑', '凹痕', '变形'],
  '破裂': ['破裂', '碎裂', '破碎', '裂开', '裂纹'],
  '脱落': ['脱落', '掉落', '掉下', '脱开'],
  '变形': ['变形', '扭曲', '弯曲', '褶皱'],
  '漏水': ['漏水', '渗水', '漏液', '漏油', '漏防冻液'],
  '漏气': ['漏气', '爆胎', '轮胎破损'],
  '功能损坏': ['不亮', '失灵', '无法使用', '损坏', '故障']
};

const REQUIRED_MATERIALS = [
  { id: 'driving-license', name: '驾驶证', description: '事故双方驾驶证' },
  { id: 'vehicle-license', name: '行驶证', description: '事故双方行驶证' },
  { id: 'insurance-policy', name: '保险单', description: '交强险/商业险保单' },
  { id: 'id-card', name: '身份证', description: '事故双方身份证' },
  { id: 'accident-photos', name: '事故现场照片', description: '含远景、近景、细节、碰撞部位' },
  { id: 'damage-photos', name: '车辆损失照片', description: '各受损部位特写照片' },
  { id: 'police-report', name: '交警认定书', description: '道路交通事故认定书' },
  { id: 'scene-diagram', name: '现场示意图', description: '车辆位置、方向、标线' }
];

module.exports = {
  VEHICLE_PARTS,
  DIRECTION_KEYWORDS,
  VAGUE_DIRECTION_WORDS,
  LOCATION_PATTERNS,
  TIME_PATTERNS,
  ACCIDENT_TYPES,
  LIABILITY_CLUES,
  DAMAGE_TYPES,
  REQUIRED_MATERIALS
};
