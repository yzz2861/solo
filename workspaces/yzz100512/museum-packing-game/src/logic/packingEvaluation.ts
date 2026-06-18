import type {
  Level,
  PackingChoice,
  PackingResult,
  PackingRisk,
  RiskSeverity,
  MaterialType,
} from '../types';

const RISK_CATEGORIES = {
  LINER: '内衬材料',
  FIXING: '固定方式',
  DESICCANT: '干燥剂选择',
  BOX: '箱体选择',
  SUPPORT: '支撑点',
  ENVIRONMENT: '环境因素',
};

function createRisk(
  id: string,
  category: string,
  severity: RiskSeverity,
  title: string,
  description: string,
  relatedMaterial?: string
): PackingRisk {
  return { id, category, severity, title, description, relatedMaterial };
}

export function evaluatePacking(level: Level, choice: PackingChoice): PackingResult {
  const risks: PackingRisk[] = [];
  const { artifact, transportDistance, optimalSolution } = level;
  const { material } = artifact;

  if (!choice.liner || !choice.fixing || !choice.desiccant || !choice.box) {
    return {
      isCorrect: false,
      score: 0,
      risks: [createRisk('incomplete', '其他', 'critical', '包装不完整', '请选择所有必要的包装材料后再提交。')],
      correctSolution: optimalSolution,
      feedback: '请先选择所有包装材料。',
    };
  }

  evaluateLiner(choice.liner, material, risks);
  evaluateFixing(choice.fixing, material, transportDistance, risks);
  evaluateDesiccant(choice.desiccant, material, transportDistance, risks);
  evaluateBox(choice.box, transportDistance, artifact.size, artifact.weight, material, risks);
  evaluateSupportPoints(choice.supportPoints, artifact.vulnerablePoints.map(v => v.name), material, risks);

  const criticalCount = risks.filter(r => r.severity === 'critical').length;
  const highCount = risks.filter(r => r.severity === 'high').length;
  const mediumCount = risks.filter(r => r.severity === 'medium').length;
  const lowCount = risks.filter(r => r.severity === 'low').length;

  const totalDeduction = criticalCount * 30 + highCount * 15 + mediumCount * 8 + lowCount * 3;
  const score = Math.max(0, 100 - totalDeduction);
  const isCorrect = score >= 80;

  let feedback = '';
  if (score >= 90) {
    feedback = '优秀！你的包装方案非常专业，文物可以安全运输。';
  } else if (score >= 80) {
    feedback = '良好！方案基本正确，还有一些可以改进的地方。';
  } else if (score >= 60) {
    feedback = '及格边缘。包装方案存在一些问题，需要认真学习。';
  } else {
    feedback = '不合格。包装方案有严重问题，文物可能会受损，请仔细学习后重新尝试。';
  }

  return {
    isCorrect,
    score,
    risks,
    correctSolution: optimalSolution,
    feedback,
  };
}

function evaluateLiner(
  liner: string,
  material: MaterialType,
  risks: PackingRisk[]
): void {
  if (material === 'pottery') {
    if (liner === 'cotton') {
      risks.push(createRisk(
        'liner-cotton-pottery',
        RISK_CATEGORIES.LINER,
        'medium',
        '棉絮不适合直接包裹陶器',
        '棉絮纤维可能会附着在陶器表面，特别是有釉面开片的器物，难以清理。建议使用无酸纸或丝绸。'
      ));
    }
    if (liner === 'bubble-wrap') {
      risks.push(createRisk(
        'liner-bubble-pottery',
        RISK_CATEGORIES.LINER,
        'low',
        '气泡膜直接接触陶器不够理想',
        '气泡膜可以提供缓冲，但直接接触陶器表面可能留下压痕。建议先用无酸纸包裹，再用气泡膜做外层缓冲。'
      ));
    }
  }

  if (material === 'wood') {
    if (liner === 'bubble-wrap') {
      risks.push(createRisk(
        'liner-bubble-wood',
        RISK_CATEGORIES.LINER,
        'high',
        '气泡膜不适合木器',
        '气泡膜不透气，容易在表面凝结水汽，导致木器发霉或变形。应该使用棉絮或棉布等透气材料。'
      ));
    }
    if (liner === 'silk') {
      risks.push(createRisk(
        'liner-silk-wood',
        RISK_CATEGORIES.LINER,
        'low',
        '丝绸包裹木器有点奢侈',
        '丝绸当然可以用，但对于一般木器来说有点大材小用，棉布或无酸纸就足够了。'
      ));
    }
  }

  if (material === 'metal') {
    if (liner === 'cotton') {
      risks.push(createRisk(
        'liner-cotton-metal',
        RISK_CATEGORIES.LINER,
        'high',
        '棉/湿布类材料对金属器有害',
        '棉絮等织物吸湿性强，会保持高湿度环境，加速金属器的锈蚀。必须使用无酸纸、丝绸等干燥材料。'
      ));
    }
    if (liner === 'foam') {
      risks.push(createRisk(
        'liner-foam-metal',
        RISK_CATEGORIES.LINER,
        'medium',
        '泡沫直接接触金属器有风险',
        '泡沫材料可能含有化学物质，长期接触可能与金属发生反应。建议先用无酸纸包裹金属器，再用泡沫缓冲。'
      ));
    }
  }
}

function evaluateFixing(
  fixing: string,
  material: MaterialType,
  distance: string,
  risks: PackingRisk[]
): void {
  if (distance === 'long') {
    if (fixing === 'velcro' || fixing === 'elastic-band') {
      risks.push(createRisk(
        'fixing-weak-long',
        RISK_CATEGORIES.FIXING,
        'high',
        '固定方式不足以应对长途运输',
        '长途运输颠簸较多，魔术贴或松紧带的固定力度不够，文物可能在箱内晃动导致损坏。建议使用泡沫块或定制模具。'
      ));
    }
    if (fixing === 'cotton-rope') {
      risks.push(createRisk(
        'fixing-rope-long',
        RISK_CATEGORIES.FIXING,
        'medium',
        '棉绳固定需要专业技巧',
        '棉绳可以用于固定，但需要专业的捆绑技巧，确保受力均匀。长途运输建议使用定制模具更安全。'
      ));
    }
  }

  if (material === 'pottery') {
    if (fixing === 'elastic-band') {
      risks.push(createRisk(
        'fixing-elastic-pottery',
        RISK_CATEGORIES.FIXING,
        'medium',
        '松紧带可能对陶器造成应力集中',
        '松紧带的压力集中在一条线上，可能导致陶器受力不均而破裂。建议使用泡沫块等面接触的固定方式。'
      ));
    }
    if (fixing === 'custom-mold') {
      risks.push(createRisk(
        'fixing-mold-pottery',
        RISK_CATEGORIES.FIXING,
        'low',
        '定制模具是最佳选择',
        '定制模具能完美贴合文物形状，是最安全的固定方式。当然成本也比较高。'
      ));
    }
  }

  if (material === 'wood') {
    if (fixing === 'velcro') {
      risks.push(createRisk(
        'fixing-velcro-wood',
        RISK_CATEGORIES.FIXING,
        'low',
        '魔术贴可以用于木器',
        '魔术贴使用方便，但要注意粘扣面不要接触木器表面，可能会粘掉漆面或木纤维。'
      ));
    }
  }

  if (material === 'metal') {
    if (fixing === 'cotton-rope') {
      risks.push(createRisk(
        'fixing-rope-metal',
        RISK_CATEGORIES.FIXING,
        'medium',
        '棉绳可能划伤金属器表面',
        '棉绳在固定过程中可能会摩擦金属器表面，特别是有鎏金或镀层的器物，容易造成划痕。建议使用软质泡沫块。'
      ));
    }
  }
}

function evaluateDesiccant(
  desiccant: string,
  material: MaterialType,
  distance: string,
  risks: PackingRisk[]
): void {
  if (material === 'metal') {
    if (desiccant === 'none') {
      risks.push(createRisk(
        'desiccant-none-metal',
        RISK_CATEGORIES.DESICCANT,
        'critical',
        '金属器必须使用干燥剂',
        '金属器在潮湿环境中极易氧化生锈，尤其是铁器和青铜器。不使用干燥剂会导致文物严重损坏！'
      ));
    }
    if (desiccant === 'charcoal') {
      risks.push(createRisk(
        'desiccant-charcoal-metal',
        RISK_CATEGORIES.DESICCANT,
        'medium',
        '活性炭吸湿度不够',
        '活性炭的吸湿能力有限，对于金属器来说保护不足。建议使用硅胶或分子筛等高效干燥剂。'
      ));
    }
    if (desiccant === 'silica-gel' && distance === 'long') {
      risks.push(createRisk(
        'desiccant-silica-long',
        RISK_CATEGORIES.DESICCANT,
        'low',
        '硅胶适合中短途',
        '硅胶干燥剂适合中短途运输。如果是超长途或高湿环境，可以考虑吸湿能力更强的分子筛。'
      ));
    }
  }

  if (material === 'wood') {
    if (desiccant === 'molecular-sieve') {
      risks.push(createRisk(
        'desiccant-sieve-wood',
        RISK_CATEGORIES.DESICCANT,
        'high',
        '分子筛干燥度过高会损坏木器',
        '分子筛的吸湿能力太强，会使环境过于干燥，导致木器失水开裂、变形。木器需要保持一定的湿度。'
      ));
    }
    if (desiccant === 'silica-gel') {
      risks.push(createRisk(
        'desiccant-silica-wood',
        RISK_CATEGORIES.DESICCANT,
        'medium',
        '硅胶对木器来说偏干',
        '硅胶干燥剂会降低环境湿度，可能导致木器过于干燥。对于木器，活性炭或不使用干燥剂更合适。'
      ));
    }
    if (desiccant === 'none' && distance === 'long') {
      risks.push(createRisk(
        'desiccant-none-wood-long',
        RISK_CATEGORIES.DESICCANT,
        'medium',
        '长途运输木器建议适量控湿',
        '长途运输环境变化大，完全不控制湿度可能导致木器受潮发霉。可以使用少量活性炭调节。'
      ));
    }
  }

  if (material === 'pottery') {
    if (desiccant === 'molecular-sieve') {
      risks.push(createRisk(
        'desiccant-sieve-pottery',
        RISK_CATEGORIES.DESICCANT,
        'low',
        '陶器不需要超强干燥剂',
        '陶器对湿度的要求不高，分子筛有点大材小用了。普通硅胶干燥剂就足够。'
      ));
    }
    if (desiccant === 'none' && distance === 'long') {
      risks.push(createRisk(
        'desiccant-none-pottery-long',
        RISK_CATEGORIES.DESICCANT,
        'low',
        '长途运输建议放少量干燥剂',
        '虽然陶器不怕潮，但长途运输环境多变，放少量干燥剂可以防止包装箱内结露。'
      ));
    }
  }
}

function evaluateBox(
  box: string,
  distance: string,
  size: string,
  weight: number,
  material: MaterialType,
  risks: PackingRisk[]
): void {
  if (distance === 'long') {
    if (box === 'cardboard') {
      risks.push(createRisk(
        'box-cardboard-long',
        RISK_CATEGORIES.BOX,
        'high',
        '纸箱不足以应对长途运输',
        '瓦楞纸箱的强度和防护性有限，长途运输中容易受到挤压、碰撞而损坏。建议使用实木箱或铝合金箱。'
      ));
    }
    if (box === 'foam-box') {
      risks.push(createRisk(
        'box-foam-long',
        RISK_CATEGORIES.BOX,
        'medium',
        '泡沫箱长途运输可能不够坚固',
        '泡沫箱缓冲性好但整体强度一般，长途运输中如果堆叠可能变形。建议外层再加纸箱或使用木箱。'
      ));
    }
  }

  if (weight > 10) {
    if (box === 'cardboard') {
      risks.push(createRisk(
        'box-cardboard-heavy',
        RISK_CATEGORIES.BOX,
        'high',
        '纸箱承重能力有限',
        '重物（超过10公斤）不宜使用纸箱，箱体可能变形甚至破裂。应该使用实木箱等承重能力强的箱体。'
      ));
    }
    if (box === 'foam-box') {
      risks.push(createRisk(
        'box-foam-heavy',
        RISK_CATEGORIES.BOX,
        'medium',
        '泡沫箱承重有限',
        '泡沫箱本身强度不高，太重的文物可能导致箱体变形。建议使用木箱或铝合金箱。'
      ));
    }
  }

  if (material === 'metal' && box === 'foam-box') {
    risks.push(createRisk(
      'box-foam-metal',
      RISK_CATEGORIES.BOX,
      'low',
      '泡沫箱对金属器来说缓冲很好',
      '泡沫箱的缓冲性能不错，但要注意配合干燥剂使用，因为泡沫箱密封后内部湿度可能较高。'
    ));
  }

  if (size === 'large' && box === 'cardboard' && distance !== 'short') {
    risks.push(createRisk(
      'box-cardboard-large',
      RISK_CATEGORIES.BOX,
      'medium',
      '大尺寸文物用纸箱防护不足',
      '大尺寸文物表面积大，受冲击的概率更高，使用纸箱防护不够。建议使用更坚固的箱体。'
    ));
  }
}

function evaluateSupportPoints(
  selected: string[],
  available: string[],
  material: MaterialType,
  risks: PackingRisk[]
): void {
  if (selected.length === 0) {
    risks.push(createRisk(
      'support-none',
      RISK_CATEGORIES.SUPPORT,
      'high',
      '没有选择支撑点',
      '文物需要合理的支撑点来分散压力，防止局部受力过大而损坏。'
    ));
    return;
  }

  if (selected.length < 2) {
    risks.push(createRisk(
      'support-too-few',
      RISK_CATEGORIES.SUPPORT,
      'medium',
      '支撑点太少',
      '支撑点太少会导致受力集中，文物容易因单点受力过大而损坏。建议选择2-4个支撑点。'
    ));
  }

  if (selected.length > 4) {
    risks.push(createRisk(
      'support-too-many',
      RISK_CATEGORIES.SUPPORT,
      'low',
      '支撑点过多',
      '支撑点并非越多越好，过多的支撑点反而可能因为制作误差导致受力不均。一般2-4个比较合适。'
    ));
  }

  const invalidPoints = selected.filter(p => !available.includes(p));
  if (invalidPoints.length > 0) {
    risks.push(createRisk(
      'support-invalid',
      RISK_CATEGORIES.SUPPORT,
      'high',
      '支撑点位置错误',
      `以下位置不是合理的支撑点：${invalidPoints.join('、')}。支撑点应该选在文物结构坚固的部位。`
    ));
  }

  if (material === 'pottery') {
    if (selected.includes('腹部') && selected.length <= 2) {
      risks.push(createRisk(
        'support-pottery-belly',
        RISK_CATEGORIES.SUPPORT,
        'medium',
        '陶器腹部单独支撑不妥',
        '陶器腹部是器身最宽处，但也是最薄的地方之一。如果只支撑腹部，可能导致器物不稳或腹部受压。'
      ));
    }
    if (!selected.includes('底足') && !selected.includes('底部') && !selected.includes('底座')) {
      risks.push(createRisk(
        'support-pottery-no-base',
        RISK_CATEGORIES.SUPPORT,
        'high',
        '陶器必须有底部支撑',
        '陶器的底足/底部是最主要的承重部位，没有底部支撑的话文物会悬空或倾斜，非常危险。'
      ));
    }
  }

  if (material === 'metal') {
    if (selected.some(s => s.includes('纹饰') || s.includes('表面'))) {
      risks.push(createRisk(
        'support-metal-surface',
        RISK_CATEGORIES.SUPPORT,
        'medium',
        '不能在纹饰表面支撑',
        '金属器表面的纹饰、鎏金层是最脆弱的部分，不能作为支撑点，否则会磨损或压坏纹饰。'
      ));
    }
  }
}

export function getSeverityColor(severity: RiskSeverity): string {
  switch (severity) {
    case 'critical': return 'text-red-600 bg-red-50 border-red-200';
    case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export function getSeverityLabel(severity: RiskSeverity): string {
  switch (severity) {
    case 'critical': return '严重';
    case 'high': return '高风险';
    case 'medium': return '中风险';
    case 'low': return '低风险';
    default: return '未知';
  }
}

export function getMaterialLabel(material: MaterialType): string {
  switch (material) {
    case 'pottery': return '陶器';
    case 'wood': return '木器';
    case 'metal': return '金属器';
    default: return '未知材质';
  }
}

export function getDistanceLabel(distance: string): string {
  switch (distance) {
    case 'short': return '短途（市内/1小时内）';
    case 'medium': return '中途（省内/数小时）';
    case 'long': return '长途（跨省/数天）';
    default: return '未知距离';
  }
}
