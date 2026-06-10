export const standardDefects = [
  '霉味', '发酸', '发酵味', '涩感', '焦苦', '木味',
  '药味', '泥土味', '纸板味', '橡胶味', '洋葱味', '咸味',
  '平淡', '单薄', '杂味', '不干净', '过度烘焙', '烘焙不足',
  '烟味', '苦味', '涩口', '粗糙', '尖锐', '沉闷',
  '陈味', '谷壳味', '稻草味', '皮革味', '鱼腥味', '霉臭味'
];

export const defectSuggestions: Record<string, string> = {
  '发霉': '霉味',
  '有霉味': '霉味',
  '酸了': '发酸',
  '太酸': '发酸',
  '酸味': '发酸',
  '涩': '涩感',
  '涩味': '涩感',
  '发涩': '涩感',
  '苦': '焦苦',
  '苦感': '焦苦',
  '焦味': '焦苦',
  '木头味': '木味',
  '木质味': '木味',
  '药': '药味',
  '中药味': '药味',
  '土味': '泥土味',
  '泥巴味': '泥土味',
  '纸味': '纸板味',
  '报纸味': '纸板味',
  '胶皮味': '橡胶味',
  '塑料味': '橡胶味',
  '洋葱': '洋葱味',
  '蒜味': '洋葱味',
  '咸': '咸味',
  '没味道': '平淡',
  '淡': '平淡',
  '风味淡': '平淡',
  '薄': '单薄',
  '太薄': '单薄',
  '杂': '杂味',
  '有杂味': '杂味',
  '脏': '不干净',
  '不干净的': '不干净',
  '烘过了': '过度烘焙',
  '太深': '过度烘焙',
  '深烘': '过度烘焙',
  '烘太浅': '烘焙不足',
  '太浅': '烘焙不足',
  '浅烘': '烘焙不足',
  '烟熏味': '烟味',
  '烟感': '烟味',
  '很苦': '焦苦',
};

export const getDefectSuggestion = (input: string): string | null => {
  if (standardDefects.includes(input)) {
    return null;
  }
  
  if (defectSuggestions[input]) {
    return defectSuggestions[input];
  }
  
  for (const standard of standardDefects) {
    if (input.length >= 2 && standard.length >= 2) {
      if (standard.includes(input) || input.includes(standard)) {
        return standard;
      }
      const similarity = calculateSimilarity(input, standard);
      if (similarity > 0.6) {
        return standard;
      }
    }
  }
  
  return null;
};

const calculateSimilarity = (s1: string, s2: string): number => {
  const len1 = s1.length;
  const len2 = s2.length;
  const maxLen = Math.max(len1, len2);
  if (maxLen === 0) return 1;
  
  let matches = 0;
  const set1 = new Set(s1.split(''));
  const set2 = new Set(s2.split(''));
  
  for (const char of set1) {
    if (set2.has(char)) {
      matches++;
    }
  }
  
  return matches / new Set([...set1, ...set2]).size;
};
