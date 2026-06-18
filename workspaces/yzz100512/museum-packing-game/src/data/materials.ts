import type { LinerMaterial, FixingMaterial, DesiccantType, BoxType } from '../types';

export interface MaterialInfo {
  id: string;
  name: string;
  description: string;
  properties: string[];
  suitableFor: string[];
  notSuitableFor?: string[];
  icon?: string;
}

export const linerMaterials: Record<LinerMaterial, MaterialInfo> = {
  'bubble-wrap': {
    id: 'bubble-wrap',
    name: '气泡膜',
    description: '轻便、有缓冲作用的塑料包装材料，成本低。',
    properties: ['缓冲性好', '轻便', '防潮', '成本低'],
    suitableFor: ['金属器', '不易碎的器物'],
    notSuitableFor: ['陶器（直接接触）', '彩绘文物'],
  },
  'foam': {
    id: 'foam',
    name: '泡沫板/海绵',
    description: '柔软的发泡材料，有良好的缓冲和支撑作用。',
    properties: ['缓冲性佳', '可塑性强', '轻便'],
    suitableFor: ['陶器', '瓷器', '易碎文物'],
    notSuitableFor: ['高湿环境下的金属器'],
  },
  'acid-free-paper': {
    id: 'acid-free-paper',
    name: '无酸纸',
    description: '不含酸性的专用纸张，对文物表面友好。',
    properties: ['无酸', '透气', '表面温和', '防刮擦'],
    suitableFor: ['金属器', '彩绘陶器', '表面脆弱文物'],
    notSuitableFor: ['重器物单独使用'],
  },
  'cotton': {
    id: 'cotton',
    name: '棉絮/棉布',
    description: '天然纤维材料，柔软透气，吸水性强。',
    properties: ['柔软', '透气', '吸水性强', '天然'],
    suitableFor: ['木器', '竹器', '有机质文物'],
    notSuitableFor: ['金属器（高湿风险）', '潮湿环境'],
  },
  'silk': {
    id: 'silk',
    name: '丝绸',
    description: '高档柔软的丝织品，对文物表面极其温和。',
    properties: ['极柔软', '表面光滑', '透气', '高档'],
    suitableFor: ['珍贵文物', '彩绘层薄的文物', '金属器精品'],
    notSuitableFor: ['粗糙表面'],
  },
};

export const fixingMaterials: Record<FixingMaterial, MaterialInfo> = {
  'velcro': {
    id: 'velcro',
    name: '魔术贴',
    description: '可反复使用的固定材料，拆卸方便。',
    properties: ['可重复使用', '拆卸方便', '固定力中等'],
    suitableFor: ['轻型文物', '需要经常取出的展品'],
    notSuitableFor: ['重器', '表面脆弱文物'],
  },
  'foam-block': {
    id: 'foam-block',
    name: '泡沫块',
    description: '定制形状的泡沫块，从四周固定文物。',
    properties: ['缓冲固定一体', '可定制形状', '支撑力好'],
    suitableFor: ['陶器', '瓷器', '不规则形状文物'],
    notSuitableFor: ['金属器长期接触'],
  },
  'elastic-band': {
    id: 'elastic-band',
    name: '松紧带',
    description: '有弹性的绑带，提供柔性固定。',
    properties: ['有弹性', '柔性固定', '轻便'],
    suitableFor: ['形状规则文物', '轻型器物'],
    notSuitableFor: ['易碎品', '尖锐棱角文物'],
  },
  'cotton-rope': {
    id: 'cotton-rope',
    name: '棉绳',
    description: '天然棉质绳索，捆绑固定用。',
    properties: ['天然材料', '摩擦力大', '结实'],
    suitableFor: ['木器', '竹器', '有机质文物'],
    notSuitableFor: ['表面精细文物', '金属器（可能划伤）'],
  },
  'custom-mold': {
    id: 'custom-mold',
    name: '定制模具',
    description: '根据文物形状定制的内衬模具，完美贴合。',
    properties: ['完美贴合', '保护最佳', '支撑性好', '成本高'],
    suitableFor: ['珍贵文物', '异形文物', '长途运输'],
    notSuitableFor: ['临时包装'],
  },
};

export const desiccantTypes: Record<DesiccantType, MaterialInfo> = {
  'silica-gel': {
    id: 'silica-gel',
    name: '硅胶干燥剂',
    description: '最常用的干燥剂，吸湿量中等，可反复使用。',
    properties: ['吸湿稳定', '可重复使用', '化学性质稳定'],
    suitableFor: ['金属器', '大多数文物', '中等湿度环境'],
    notSuitableFor: ['需要一定湿度的木器'],
  },
  'charcoal': {
    id: 'charcoal',
    name: '活性炭',
    description: '天然吸附材料，兼具除臭和吸湿功能。',
    properties: ['天然', '除臭', '吸湿', '环保'],
    suitableFor: ['木器', '有机质文物', '轻微吸湿需求'],
    notSuitableFor: ['高湿环境金属器'],
  },
  'molecular-sieve': {
    id: 'molecular-sieve',
    name: '分子筛',
    description: '高效干燥剂，吸湿能力极强，适合极低湿度要求。',
    properties: ['吸湿能力极强', '深度干燥', '成本较高'],
    suitableFor: ['精密金属器', '高湿环境', '长期储存'],
    notSuitableFor: ['木器（过于干燥开裂）'],
  },
  'none': {
    id: 'none',
    name: '不使用干燥剂',
    description: '当环境湿度合适或文物本身需要湿润环境时使用。',
    properties: ['无额外成本', '保持环境湿度'],
    suitableFor: ['木器（正常湿度）', '潮湿地区短途运输'],
    notSuitableFor: ['金属器', '高湿环境'],
  },
};

export const boxTypes: Record<BoxType, MaterialInfo> = {
  'cardboard': {
    id: 'cardboard',
    name: '瓦楞纸箱',
    description: '轻便、经济的纸质包装箱，适合短途运输。',
    properties: ['轻便', '成本低', '可回收', '缓冲一般'],
    suitableFor: ['短途运输', '轻型文物', '内部有缓冲时'],
    notSuitableFor: ['长途运输', '重器', '珍贵文物'],
  },
  'wooden': {
    id: 'wooden',
    name: '实木箱',
    description: '坚固的木质包装箱，承重能力强，防护性好。',
    properties: ['坚固', '承重强', '防护性好', '较重'],
    suitableFor: ['长途运输', '重型文物', '珍贵文物'],
    notSuitableFor: ['轻型文物（过度包装）'],
  },
  'aluminum': {
    id: 'aluminum',
    name: '铝合金箱',
    description: '轻便坚固的金属箱体，密封防潮性能好。',
    properties: ['轻便坚固', '密封好', '防潮', '成本高'],
    suitableFor: ['精品文物', '精密金属器', '展览运输'],
    notSuitableFor: ['临时包装', '预算有限时'],
  },
  'foam-box': {
    id: 'foam-box',
    name: '泡沫箱',
    description: '整体发泡的塑料箱体，缓冲隔热性能好。',
    properties: ['缓冲好', '隔热', '轻便', '防潮'],
    suitableFor: ['温度敏感文物', '陶器瓷器', '有一定缓冲需求'],
    notSuitableFor: ['极重文物', '长期储存（可能积聚湿气）'],
  },
};
