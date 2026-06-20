const {
  VEHICLE_PARTS,
  DIRECTION_KEYWORDS,
  VAGUE_DIRECTION_WORDS,
  LOCATION_PATTERNS,
  TIME_PATTERNS,
  ACCIDENT_TYPES,
  LIABILITY_CLUES,
  DAMAGE_TYPES,
  REQUIRED_MATERIALS
} = require('../data/vehicle-parts');

class CompletionEngine {
  constructor() {
    this.allParts = this._flattenParts();
  }

  _flattenParts() {
    const parts = [];
    for (const [zoneKey, zone] of Object.entries(VEHICLE_PARTS)) {
      for (const [partKey, part] of Object.entries(zone.subParts)) {
        parts.push({
          id: partKey,
          name: part.name,
          aliases: part.aliases,
          zone: zoneKey,
          zoneName: zone.name
        });
      }
    }
    return parts;
  }

  async complete(shortDescription, photoNotes = [], context = {}) {
    const result = {
      originalDescription: shortDescription,
      photoNotes: photoNotes,
      accidentTime: this._extractTime(shortDescription, photoNotes, context),
      accidentLocation: this._extractLocation(shortDescription, photoNotes, context),
      accidentDirection: this._extractDirection(shortDescription, photoNotes, context),
      vehicleParts: this._extractVehicleParts(shortDescription, photoNotes),
      accidentType: this._extractAccidentType(shortDescription, photoNotes),
      liabilityClue: this._extractLiability(shortDescription, photoNotes),
      damageDescription: this._extractDamage(shortDescription, photoNotes),
      standardDescription: '',
      missingMaterials: [],
      lowConfidenceFlags: [],
      confidenceScore: 1.0,
      reshootList: [],
      trainingNotes: []
    };

    result.standardDescription = this._generateStandardDescription(result);
    result.missingMaterials = this._checkMissingMaterials(result, photoNotes);
    this._analyzeConfidence(result, shortDescription, photoNotes);
    result.reshootList = this._generateReshootList(result);

    return result;
  }

  _extractTime(description, photoNotes, context) {
    const allText = [description, ...photoNotes].join(' ');
    const extracted = {
      date: null,
      time: null,
      period: null,
      raw: [],
      isComplete: false,
      isVague: true
    };

    if (context.accidentDate) {
      extracted.date = context.accidentDate;
      extracted.isVague = false;
    }
    if (context.accidentTime) {
      extracted.time = context.accidentTime;
      extracted.isVague = false;
    }

    for (const pattern of TIME_PATTERNS) {
      const match = allText.match(pattern.pattern);
      if (match) {
        extracted.raw.push(match[0]);
        if (pattern.type === 'full-date') {
          extracted.date = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
          extracted.isVague = false;
        } else if (pattern.type === 'month-day' && !extracted.date) {
          const year = new Date().getFullYear();
          extracted.date = `${year}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
          extracted.isVague = false;
        } else if (pattern.type === 'time') {
          extracted.time = `${match[1].padStart(2, '0')}:${match[2].padStart(2, '0')}`;
          extracted.isVague = false;
        } else if (pattern.type === 'period') {
          extracted.period = match[1];
        }
      }
    }

    if (extracted.date && extracted.time) {
      extracted.isComplete = true;
    }

    return extracted;
  }

  _extractLocation(description, photoNotes, context) {
    const allText = [description, ...photoNotes].join(' ');
    const extracted = {
      road: null,
      intersection: null,
      details: null,
      raw: [],
      isComplete: false,
      isVague: true
    };

    if (context.accidentLocation) {
      extracted.details = context.accidentLocation;
      extracted.isVague = false;
    }

    for (const pattern of LOCATION_PATTERNS) {
      const match = allText.match(pattern.pattern);
      if (match) {
        extracted.raw.push(match[0]);
        const matchedText = (match[1] || match[0]).replace(/^在/, '');
        if (pattern.type === 'road' || pattern.type === 'street' || pattern.type === 'avenue') {
          extracted.road = matchedText;
          extracted.isVague = false;
        } else if (pattern.type === 'intersection') {
          extracted.intersection = matchedText;
          extracted.isVague = false;
        } else {
          extracted.details = matchedText;
          extracted.isVague = false;
        }
      }
    }

    if (extracted.road && extracted.intersection) {
      extracted.isComplete = true;
    }

    return extracted;
  }

  _extractDirection(description, photoNotes, context) {
    const allText = [description, ...photoNotes].join(' ');
    const extracted = {
      ourDirection: null,
      otherDirection: null,
      raw: [],
      isComplete: false,
      isVague: true,
      hasVagueWords: []
    };

    if (context.ourDirection) {
      extracted.ourDirection = context.ourDirection;
      extracted.isVague = false;
    }
    if (context.otherDirection) {
      extracted.otherDirection = context.otherDirection;
      extracted.isVague = false;
    }

    for (const vagueWord of VAGUE_DIRECTION_WORDS) {
      if (allText.includes(vagueWord)) {
        extracted.hasVagueWords.push(vagueWord);
      }
    }

    const ourPatterns = [
      /我[车方]?(?:车辆)?(?:由|向|朝|往)?([东南西北]{1,2}|直行|左转|右转|倒车|超车|变道)/,
      /我方(?:车辆)?(?:由|向|朝|往)?([东南西北]{1,2}|直行|左转|右转|倒车|超车|变道)/,
      /标的车(?:由|向|朝|往)?([东南西北]{1,2}|直行|左转|右转|倒车|超车|变道)/,
      /甲车(?:由|向|朝|往)?([东南西北]{1,2}|直行|左转|右转|倒车|超车|变道)/
    ];

    const otherPatterns = [
      /对方(?:车辆)?(?:由|向|朝|往)?([东南西北]{1,2}|直行|左转|右转|倒车|超车|变道)/,
      /三者车(?:由|向|朝|往)?([东南西北]{1,2}|直行|左转|右转|倒车|超车|变道)/,
      /乙车(?:由|向|朝|往)?([东南西北]{1,2}|直行|左转|右转|倒车|超车|变道)/,
      /另一车(?:辆)?(?:由|向|朝|往)?([东南西北]{1,2}|直行|左转|右转|倒车|超车|变道)/
    ];

    if (!extracted.ourDirection) {
      for (const pattern of ourPatterns) {
        const match = description.match(pattern);
        if (match) {
          extracted.ourDirection = this._normalizeDirection(match[1]);
          extracted.raw.push(match[0]);
          extracted.isVague = false;
          break;
        }
      }
    }

    if (!extracted.otherDirection) {
      for (const pattern of otherPatterns) {
        const match = description.match(pattern);
        if (match) {
          extracted.otherDirection = this._normalizeDirection(match[1]);
          extracted.raw.push(match[0]);
          extracted.isVague = false;
          break;
        }
      }
    }

    if (!extracted.ourDirection || !extracted.otherDirection) {
      for (const [direction, keywords] of Object.entries(DIRECTION_KEYWORDS)) {
        for (const keyword of keywords) {
          if (allText.includes(keyword)) {
            if (!extracted.ourDirection) {
              extracted.ourDirection = direction;
            } else if (!extracted.otherDirection) {
              extracted.otherDirection = direction;
            }
            extracted.raw.push(keyword);
            extracted.isVague = false;
          }
        }
      }
    }

    if (extracted.ourDirection && extracted.otherDirection) {
      extracted.isComplete = true;
    }

    return extracted;
  }

  _normalizeDirection(dir) {
    if (!dir) return null;
    const dirMap = {
      '南': '南', '北': '北', '东': '东', '西': '西',
      '东南': '东南', '东北': '东北', '西南': '西南', '西北': '西北',
      '直行': '直行', '左转': '左转', '右转': '右转',
      '倒车': '倒车', '超车': '超车', '变道': '变道'
    };
    return dirMap[dir] || dir;
  }

  _extractVehicleParts(description, photoNotes) {
    const allText = [description, ...photoNotes].join(' ');
    const foundParts = [];

    for (const part of this.allParts) {
      const allKeywords = [part.name, ...part.aliases];
      for (const keyword of allKeywords) {
        if (allText.includes(keyword)) {
          const existing = foundParts.find(p => p.id === part.id);
          if (!existing) {
            foundParts.push({
              id: part.id,
              name: part.name,
              zone: part.zone,
              zoneName: part.zoneName,
              matchedKeyword: keyword,
              source: this._findSource(keyword, description, photoNotes),
              isEstimated: false
            });
          }
          break;
        }
      }
    }

    const shortParts = this._extractShortDirectionParts(description, foundParts);
    for (const sp of shortParts) {
      if (!foundParts.find(p => p.id === sp.id)) {
        foundParts.push(sp);
      }
    }

    return foundParts;
  }

  _extractShortDirectionParts(description, existingParts) {
    const inferredParts = [];
    const directionMap = {
      '右前': ['front-right-fender', 'front-right-headlight', 'front-bumper'],
      '右前角': ['front-right-fender', 'front-right-headlight'],
      '左前': ['front-left-fender', 'front-left-headlight', 'front-bumper'],
      '左前角': ['front-left-fender', 'front-left-headlight'],
      '右后': ['rear-right-fender', 'rear-right-taillight', 'rear-bumper'],
      '右后角': ['rear-right-fender', 'rear-right-taillight'],
      '左后': ['rear-left-fender', 'rear-left-taillight', 'rear-bumper'],
      '左后角': ['rear-left-fender', 'rear-left-taillight'],
      '右侧': ['right-front-door', 'right-rear-door', 'right-front-fender', 'right-rear-fender'],
      '左侧': ['left-front-door', 'left-rear-door', 'left-front-fender', 'left-rear-fender'],
      '前部': ['front-bumper', 'hood', 'front-grille'],
      '后部': ['rear-bumper', 'trunk-lid']
    };

    for (const [shortDir, partIds] of Object.entries(directionMap)) {
      if (description.includes(shortDir)) {
        for (const partId of partIds) {
          const part = this.allParts.find(p => p.id === partId);
          if (part && !existingParts.find(p => p.id === partId)) {
            inferredParts.push({
              id: part.id,
              name: part.name,
              zone: part.zone,
              zoneName: part.zoneName,
              matchedKeyword: shortDir,
              source: 'inferred-from-direction',
              isEstimated: true
            });
          }
        }
      }
    }

    return inferredParts;
  }

  _findSource(keyword, description, photoNotes) {
    if (description.includes(keyword)) {
      return 'description';
    }
    for (let i = 0; i < photoNotes.length; i++) {
      if (photoNotes[i].includes(keyword)) {
        return `photo-${i + 1}`;
      }
    }
    return 'unknown';
  }

  _extractAccidentType(description, photoNotes) {
    const allText = [description, ...photoNotes].join(' ');
    
    for (const [type, keywords] of Object.entries(ACCIDENT_TYPES)) {
      for (const keyword of keywords) {
        if (allText.includes(keyword)) {
          return {
            type,
            matchedKeyword: keyword,
            description: this._getAccidentTypeDescription(type)
          };
        }
      }
    }

    return {
      type: '其他',
      matchedKeyword: null,
      description: '待进一步核实事故类型'
    };
  }

  _getAccidentTypeDescription(type) {
    const descriptions = {
      '追尾': '后车与前车尾部发生碰撞',
      '刮擦': '两车或车与物体发生表面刮擦',
      '碰撞': '车辆与物体或车辆间发生碰撞',
      '正面碰撞': '车辆前部与对方车辆或物体正面相撞',
      '侧面碰撞': '车辆侧面受到撞击',
      '翻车': '车辆发生侧翻或翻滚',
      '坠河': '车辆坠入水中',
      '自燃': '车辆因自身原因起火燃烧',
      '涉水': '车辆在积水路段行驶被淹',
      '高空坠物': '车辆被高空坠落物体砸中',
      '被盗': '车辆被盗',
      '玻璃单独破碎': '车辆玻璃单独破碎'
    };
    return descriptions[type] || '待核实事故类型';
  }

  _extractLiability(description, photoNotes) {
    const allText = [description, ...photoNotes].join(' ');
    
    for (const [liability, config] of Object.entries(LIABILITY_CLUES)) {
      for (const keyword of config.keywords) {
        if (allText.includes(keyword)) {
          const behavior = this._extractLiabilityBehavior(allText, keyword);
          return {
            liability,
            matchedKeyword: keyword,
            clue: config.clue.replace('XX', behavior),
            evidence: this._extractLiabilityEvidence(allText, keyword)
          };
        }
      }
    }

    return {
      liability: '待认定',
      matchedKeyword: null,
      clue: '事故责任有待交警部门进一步调查认定。',
      evidence: []
    };
  }

  _extractLiabilityBehavior(text, keyword) {
    const behaviorMap = {
      '闯红灯': '闯红灯',
      '逆行': '逆行',
      '酒驾': '酒驾',
      '醉驾': '醉驾',
      '变道': '违规变道',
      '倒车': '倒车未注意观察',
      '追尾': '未保持安全车距',
      '开门': '开门未注意后方车辆',
      '超速': '超速行驶',
      '溜车': '溜车',
      '未让行': '未按规定让行',
      '压线': '违规压线',
      '对方全责': '违反让行规定',
      '我方全责': '操作不当',
      '我全责': '操作不当',
      '我无责': '正常行驶'
    };

    const evidenceKeywords = ['闯红灯', '逆行', '酒驾', '醉驾', '变道', '倒车', '追尾', '开门', '超速', '溜车', '未让行', '压线'];
    
    for (const ek of evidenceKeywords) {
      if (text.includes(ek)) {
        return behaviorMap[ek] || ek;
      }
    }
    
    return behaviorMap[keyword] || '违规行为';
  }

  _extractLiabilityEvidence(text, keyword) {
    const evidence = [];
    const evidenceKeywords = ['闯红灯', '逆行', '酒驾', '醉驾', '变道', '倒车', '追尾', '开门', '超速', '溜车', '未让行', '压线'];
    
    for (const ek of evidenceKeywords) {
      if (text.includes(ek)) {
        evidence.push(ek);
      }
    }
    
    return evidence;
  }

  _extractDamage(description, photoNotes) {
    const allText = [description, ...photoNotes].join(' ');
    const damages = [];

    for (const [damageType, keywords] of Object.entries(DAMAGE_TYPES)) {
      for (const keyword of keywords) {
        if (allText.includes(keyword)) {
          damages.push({
            type: damageType,
            matchedKeyword: keyword,
            severity: this._assessDamageSeverity(damageType, keyword)
          });
          break;
        }
      }
    }

    if (damages.length === 0) {
      damages.push({
        type: '待查',
        matchedKeyword: null,
        severity: '未知'
      });
    }

    return damages;
  }

  _assessDamageSeverity(damageType, keyword) {
    const severityMap = {
      '剐蹭': '轻微',
      '凹陷': '中度',
      '破裂': '严重',
      '脱落': '严重',
      '变形': '中度',
      '漏水': '严重',
      '漏气': '严重',
      '功能损坏': '严重'
    };
    return severityMap[damageType] || '未知';
  }

  _generateStandardDescription(result) {
    const parts = [];
    
    const datePart = result.accidentTime.date || 'XXXX年XX月XX日';
    const timePart = result.accidentTime.time || 'XX时XX分';
    const periodPart = result.accidentTime.period ? `（${result.accidentTime.period}）` : '';
    parts.push(`${datePart} ${timePart}${periodPart}`);

    if (result.accidentLocation.road || result.accidentLocation.intersection || result.accidentLocation.details) {
      const locParts = [];
      if (result.accidentLocation.road) locParts.push(result.accidentLocation.road);
      if (result.accidentLocation.intersection) locParts.push(result.accidentLocation.intersection);
      if (result.accidentLocation.details && !locParts.includes(result.accidentLocation.details)) {
        locParts.push(result.accidentLocation.details);
      }
      const locStr = locParts.join('');
      if (locStr.startsWith('在')) {
        parts.push(`${locStr}处`);
      } else {
        parts.push(`在${locStr}处`);
      }
    } else {
      parts.push('在事故地点');
    }

    const ourDirText = this._formatDirection(result.accidentDirection.ourDirection);
    const otherDirText = result.accidentDirection.otherDirection ? 
      `，对方${this._formatDirection(result.accidentDirection.otherDirection)}` : '';
    parts.push(`我方车辆${ourDirText}${otherDirText}时`);

    parts.push(`发生${result.accidentType.type}事故`);

    if (result.vehicleParts.length > 0) {
      const partNames = result.vehicleParts.map(p => p.name).join('、');
      const damageDesc = result.damageDescription.map(d => d.type).join('、');
      parts.push(`造成我方车辆${partNames}${damageDesc}`);
    }

    if (result.liabilityClue.liability !== '待认定') {
      const clue = result.liabilityClue.clue.replace(/。$/, '');
      parts.push(`经初步判断：${clue}`);
    }

    let desc = parts.join('，') + '。';
    desc = desc.replace(/。。+$/, '。');
    return desc;
  }

  _formatDirection(direction) {
    if (!direction) return '行驶';
    const dirMap = {
      '北': '由南向北行驶',
      '南': '由北向南行驶',
      '东': '由西向东行驶',
      '西': '由东向西行驶',
      '东北': '向东北方向行驶',
      '东南': '向东南方向行驶',
      '西北': '向西北方向行驶',
      '西南': '向西南方向行驶',
      '直行': '直行',
      '左转': '左转',
      '右转': '右转',
      '倒车': '倒车',
      '超车': '超车',
      '变道': '变道'
    };
    return dirMap[direction] || direction;
  }

  _checkMissingMaterials(result, photoNotes) {
    const missing = [];
    const allText = [result.originalDescription, ...photoNotes].join(' ');

    const materialChecks = {
      'driving-license': !allText.includes('驾驶证') && !allText.includes('驾照'),
      'vehicle-license': !allText.includes('行驶证') && !allText.includes('行驶本'),
      'insurance-policy': !allText.includes('保险') && !allText.includes('保单'),
      'id-card': !allText.includes('身份证') && !allText.includes('身份'),
      'accident-photos': photoNotes.length < 4,
      'damage-photos': result.vehicleParts.length > 0 && result.vehicleParts.some(p => p.isEstimated),
      'police-report': !allText.includes('交警') && !allText.includes('认定书') && !allText.includes('报警'),
      'scene-diagram': !allText.includes('示意图') && !allText.includes('现场图')
    };

    for (const material of REQUIRED_MATERIALS) {
      if (materialChecks[material.id]) {
        missing.push({
          ...material,
          reason: this._getMissingReason(material.id, result, photoNotes)
        });
      }
    }

    return missing;
  }

  _getMissingReason(materialId, result, photoNotes) {
    const reasons = {
      'driving-license': '描述中未提及已核实驾驶证',
      'vehicle-license': '描述中未提及已核实行驶证',
      'insurance-policy': '描述中未提及已核实保险信息',
      'id-card': '描述中未提及已核实双方身份证',
      'accident-photos': `仅提供${photoNotes.length}张照片备注，建议至少4张（远景、近景、碰撞点、刹车痕）`,
      'damage-photos': '存在推测的损失部位，需要特写照片确认损伤程度',
      'police-report': '未提及是否报警及交警处理情况',
      'scene-diagram': '未提及是否绘制现场示意图'
    };
    return reasons[materialId] || '缺少该项材料';
  }

  _analyzeConfidence(result, description, photoNotes) {
    let score = 1.0;
    const flags = [];

    if (result.accidentTime.isVague || !result.accidentTime.date || !result.accidentTime.time) {
      score -= 0.15;
      flags.push({
        type: 'time-vague',
        severity: 'medium',
        message: '事故时间描述不明确，需要补充具体日期和时间',
        suggestion: '请补充事故发生的具体日期和时间（如：2024-01-15 14:30）'
      });
    }

    if (result.accidentLocation.isVague || !result.accidentLocation.road) {
      score -= 0.15;
      flags.push({
        type: 'location-vague',
        severity: 'medium',
        message: '事故地点描述不明确',
        suggestion: '请补充具体道路名称和位置（如：中关村大街与知春路交叉口）'
      });
    }

    if (result.accidentDirection.hasVagueWords.length > 0) {
      score -= 0.1;
      flags.push({
        type: 'direction-vague',
        severity: 'low',
        message: `使用了模糊方位词：${result.accidentDirection.hasVagueWords.join('、')}`,
        suggestion: '请使用精确方向描述（如：由南向北、左转、掉头等）'
      });
    }

    if (!result.accidentDirection.ourDirection || !result.accidentDirection.otherDirection) {
      score -= 0.1;
      flags.push({
        type: 'direction-incomplete',
        severity: 'medium',
        message: '车辆行驶方向描述不完整',
        suggestion: '请补充双方车辆的行驶方向（如：我方直行、对方左转）'
      });
    }

    if (result.vehicleParts.length > 0 && result.vehicleParts.some(p => p.isEstimated)) {
      score -= 0.1;
      flags.push({
        type: 'parts-estimated',
        severity: 'medium',
        message: '部分损失部位是根据方位推测的，需要照片确认',
        suggestion: '请对照照片核实损失部位，必要时补拍特写',
        estimatedParts: result.vehicleParts.filter(p => p.isEstimated).map(p => p.name)
      });
    }

    const multiCarCount = this._detectMultipleCars(description, photoNotes);
    if (multiCarCount > 2) {
      score -= 0.15;
      flags.push({
        type: 'multiple-cars',
        severity: 'high',
        message: `检测到${multiCarCount}车事故，需注意各方责任划分`,
        suggestion: '请逐一核实每辆车的行驶方向、碰撞部位和责任情况'
      });
    }

    const conflicts = this._detectConflicts(description, photoNotes, result);
    if (conflicts.length > 0) {
      score -= conflicts.length * 0.15;
      for (const conflict of conflicts) {
        flags.push({
          type: 'description-conflict',
          severity: 'high',
          message: conflict.message,
          suggestion: conflict.suggestion,
          details: conflict.details
        });
      }
    }

    if (!result.liabilityClue.matchedKeyword && result.liabilityClue.liability === '待认定') {
      score -= 0.05;
      flags.push({
        type: 'liability-unclear',
        severity: 'low',
        message: '事故责任未明确',
        suggestion: '请根据现场情况判断责任，或注明交警认定中'
      });
    }

    result.confidenceScore = Math.max(0, Math.min(1, score));
    result.lowConfidenceFlags = flags;

    if (score < 0.7) {
      result.trainingNotes.push(this._generateTrainingNote(flags, description, result));
    }
  }

  _detectMultipleCars(description, photoNotes) {
    const allText = [description, ...photoNotes].join(' ');
    const carPatterns = [
      /我方|我车|标的车|甲车|A车/g,
      /对方|三者车|乙车|B车/g,
      /第三方|第三车|丙车|C车/g,
      /行人|电动车|摩托车|自行车/g
    ];

    let count = 0;
    for (const pattern of carPatterns) {
      const match = allText.match(pattern);
      if (match && match.length > 0) count++;
    }

    const moreCarKeywords = ['三车', '多车', '四车', '五车', '连环撞'];
    for (const kw of moreCarKeywords) {
      if (allText.includes(kw)) {
        count = Math.max(count, parseInt(kw) || 3);
      }
    }

    return count;
  }

  _detectConflicts(description, photoNotes, result) {
    const conflicts = [];

    const descParts = this._extractVehiclePartsFromText(description);
    const photoParts = [];
    for (const note of photoNotes) {
      photoParts.push(...this._extractVehiclePartsFromText(note));
    }

    for (const dp of descParts) {
      const photoHasPart = photoParts.some(pp => pp.id === dp.id);
      if (!photoHasPart) {
        conflicts.push({
          message: `文字描述提到"${dp.name}"，但照片备注中无对应信息`,
          suggestion: `请确认"${dp.name}"是否确实受损，如受损请补拍照片`,
          details: {
            textPart: dp.name,
            photoMissing: true
          }
        });
      }
    }

    for (const pp of photoParts) {
      const descHasPart = descParts.some(dp => dp.id === pp.id);
      if (!descHasPart) {
        conflicts.push({
          message: `照片备注显示"${pp.name}"受损，但文字描述中未提及`,
          suggestion: `请在文字描述中补充"${pp.name}"的损失情况`,
          details: {
            photoPart: pp.name,
            textMissing: true
          }
        });
      }
    }

    const descDir = this._extractDirectionFromText(description);
    const photoDir = [];
    for (const note of photoNotes) {
      photoDir.push(...this._extractDirectionFromText(note));
    }

    if (descDir.length > 0 && photoDir.length > 0) {
      const descHasOpposite = descDir.some(d => d.includes('右'));
      const photoHasOpposite = photoDir.some(d => d.includes('左'));
      if (descHasOpposite && photoHasOpposite && !descDir.some(d => d.includes('左')) && !photoDir.some(d => d.includes('右'))) {
        conflicts.push({
          message: '文字描述方向与照片备注方向可能存在混淆',
          suggestion: '请确认左右方向描述是否准确，以驾驶员视角为准',
          details: {
            textDirection: descDir,
            photoDirection: photoDir
          }
        });
      }
    }

    return conflicts;
  }

  _extractVehiclePartsFromText(text) {
    const parts = [];
    for (const part of this.allParts) {
      const allKeywords = [part.name, ...part.aliases];
      for (const keyword of allKeywords) {
        if (text.includes(keyword)) {
          parts.push({
            id: part.id,
            name: part.name,
            matchedKeyword: keyword
          });
          break;
        }
      }
    }
    return parts;
  }

  _extractDirectionFromText(text) {
    const directions = [];
    const dirKeywords = ['左', '右', '前', '后', '东', '南', '西', '北'];
    for (const kw of dirKeywords) {
      if (text.includes(kw)) {
        directions.push(kw);
      }
    }
    return directions;
  }

  _generateReshootList(result) {
    const reshoot = [];

    const estimatedParts = result.vehicleParts.filter(p => p.isEstimated);
    for (const part of estimatedParts) {
      reshoot.push({
        id: `reshoot-${part.id}`,
        type: 'part-confirmation',
        partName: part.name,
        reason: `该部位是根据"${part.matchedKeyword}"推测的，需要特写照片确认`,
        angle: '近距离特写，清晰展示损伤程度',
        isCompleted: false
      });
    }

    if (result.photoNotes.length < 4) {
      const requiredShots = [
        { id: 'wide-shot', name: '远景照', description: '拍摄事故全貌，包含两车位置、道路标线、交通标志' },
        { id: 'medium-shot', name: '近景照', description: '拍摄碰撞部位及两车接触关系' },
        { id: 'detail-shot', name: '细节照', description: '拍摄碰撞点特写，展示损伤程度' },
        { id: 'brake-mark', name: '刹车痕照', description: '拍摄路面刹车痕迹、散落物' }
      ];
      for (const shot of requiredShots) {
        reshoot.push({
          id: shot.id,
          type: 'scene-photo',
          shotName: shot.name,
          reason: `缺少${shot.name}`,
          description: shot.description,
          isCompleted: false
        });
      }
    }

    for (const flag of result.lowConfidenceFlags) {
      if (flag.type === 'description-conflict') {
        if (flag.details && flag.details.textPart) {
          reshoot.push({
            id: `conflict-${Date.now()}`,
            type: 'conflict-confirmation',
            partName: flag.details.textPart,
            reason: flag.message,
            angle: '多角度拍摄确认损失情况',
            isCompleted: false
          });
        }
      }
    }

    return reshoot;
  }

  _generateTrainingNote(flags, originalDescription, result) {
    const note = {
      originalDescription,
      standardDescription: result.standardDescription,
      issues: flags.map(f => ({
        type: f.type,
        message: f.message,
        suggestion: f.suggestion
      })),
      improvements: this._generateImprovements(originalDescription, result),
      example: this._generateImprovedExample(originalDescription, result)
    };
    return note;
  }

  _generateImprovements(original, result) {
    const improvements = [];
    
    if (!result.accidentTime.date) {
      improvements.push('补充事故日期，如"2024年1月15日"');
    }
    if (!result.accidentTime.time) {
      improvements.push('补充具体时间，如"14时30分"');
    }
    if (!result.accidentLocation.road) {
      improvements.push('补充具体地点，如"中关村大街与知春路交叉口"');
    }
    if (!result.accidentDirection.ourDirection) {
      improvements.push('补充行驶方向，如"由南向北直行"');
    }
    if (result.vehicleParts.length === 0) {
      improvements.push('明确损失部位，如"右前保险杠、右前大灯"');
    }
    if (result.liabilityClue.liability === '待认定') {
      improvements.push('明确责任判断，如"对方变道导致事故，对方全责"');
    }

    return improvements;
  }

  _generateImprovedExample(original, result) {
    const date = result.accidentTime.date || '2024年1月15日';
    const time = result.accidentTime.time || '14时30分';
    const location = result.accidentLocation.road ? 
      `在${result.accidentLocation.road}` : '在中关村大街与知春路交叉口';
    const direction = result.accidentDirection.ourDirection ? 
      `我方${result.accidentDirection.ourDirection}` : '我方由南向北直行';
    const otherDir = result.accidentDirection.otherDirection ? 
      `，对方${result.accidentDirection.otherDirection}` : '，对方由东向西左转';
    const parts = result.vehicleParts.length > 0 ? 
      result.vehicleParts.map(p => p.name).join('、') : '右前保险杠、右前翼子板';
    const damage = result.damageDescription.length > 0 ? 
      result.damageDescription.map(d => d.type).join('、') : '剐蹭、凹陷';
    const liability = result.liabilityClue.liability !== '待认定' ? 
      `经判断：${result.liabilityClue.clue}` : '经判断：对方转弯未让直行，对方全责。';

    return `${date}${time}，${location}处，${direction}${otherDir}时发生碰撞，造成我方${parts}${damage}。${liability}`;
  }
}

module.exports = CompletionEngine;
