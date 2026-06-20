const traditionalToSimplifiedMap: Record<string, string> = {
  '張': '张', '劉': '刘', '陳': '陈', '楊': '杨', '黃': '黄', '趙': '赵',
  '吳': '吴', '孫': '孙', '馬': '马', '朱': '朱', '胡': '胡', '郭': '郭',
  '何': '何', '林': '林', '羅': '罗', '鄭': '郑', '梁': '梁', '謝': '谢', '宋': '宋',
  '唐': '唐', '許': '许', '韓': '韩', '馮': '冯', '鄧': '邓', '曹': '曹', '彭': '彭', '曾': '曾',
  '蕭': '萧', '田': '田', '董': '董', '袁': '袁', '潘': '潘', '於': '于', '蔣': '蒋', '蔡': '蔡',
  '餘': '余', '杜': '杜', '葉': '叶', '程': '程', '蘇': '苏', '魏': '魏', '呂': '吕', '丁': '丁',
  '任': '任', '沈': '沈', '姚': '姚', '盧': '卢', '傅': '傅', '鍾': '钟', '姜': '姜', '崔': '崔',
  '譚': '谭', '廖': '廖', '範': '范', '汪': '汪', '陸': '陆', '金': '金', '石': '石', '戴': '戴',
  '賈': '贾', '韋': '韦', '夏': '夏', '邱': '邱', '方': '方', '侯': '侯', '鄒': '邹', '熊': '熊',
  '孟': '孟', '秦': '秦', '白': '白', '江': '江', '閻': '阎', '薛': '薛', '尹': '尹', '段': '段',
  '雷': '雷', '黎': '黎', '史': '史', '龍': '龙', '賀': '贺', '顧': '顾', '毛': '毛', '郝': '郝',
  '龔': '龚', '邵': '邵', '萬': '万', '錢': '钱', '嚴': '严', '覃': '覃', '武': '武', '戚': '戚',
  '柳': '柳', '喬': '乔', '賴': '赖', '龐': '庞', '樊': '樊', '藍': '蓝', '殷': '殷', '施': '施',
  '陶': '陶', '洪': '洪', '翟': '翟', '安': '安', '顏': '颜', '倪': '倪', '莊': '庄', '聶': '聂',
  '章': '章', '魯': '鲁', '岳': '岳', '鄔': '邬', '路': '路', '關': '关', '苗': '苗',
  '凌': '凌', '費': '费', '紀': '纪', '靳': '靳', '盛': '盛', '童': '童', '歐': '欧', '甄': '甄',
  '項': '项', '曲': '曲', '成': '成', '遊': '游', '陽': '阳', '裴': '裴', '席': '席', '衛': '卫',
  '查': '查', '屈': '屈', '鮑': '鲍', '位': '位', '霍': '霍', '翁': '翁', '隋': '隋',
  '植': '植', '甘': '甘', '景': '景', '薄': '薄', '單': '单', '包': '包', '司': '司', '柏': '柏',
  '寧': '宁', '柯': '柯', '阮': '阮', '桂': '桂', '歐陽': '欧阳', '司馬': '司马', '上官': '上官',
  '夏侯': '夏侯', '諸葛': '诸葛', '聞人': '闻人', '東方': '东方', '赫連': '赫连',
  '皇甫': '皇甫', '尉遲': '尉迟', '公羊': '公羊', '澹臺': '澹台', '公冶': '公冶', '宗政': '宗政',
  '濮陽': '濮阳', '淳于': '淳于', '單于': '单于', '太叔': '太叔', '申屠': '申屠', '公孫': '公孙',
  '仲孫': '仲孙', '軒轅': '轩辕', '令狐': '令狐', '鍾離': '钟离', '宇文': '宇文', '長孫': '长孙',
  '慕容': '慕容', '鮮于': '鲜于', '閭丘': '闾丘', '司徒': '司徒', '司空': '司空', '亓官': '亓官',
  '司寇': '司寇', '仉': '仉', '督': '督', '子車': '子车', '顓孫': '颛孙', '端木': '端木',
  '巫馬': '巫马', '公西': '公西', '漆雕': '漆雕', '樂正': '乐正', '壤駟': '壤驷', '公良': '公良',
  '拓跋': '拓跋', '夾谷': '夹谷', '宰父': '宰父', '穀梁': '谷梁', '晉': '晋', '楚': '楚',
  '法': '法', '汝': '汝', '鄢': '鄢', '涂': '涂', '欽': '钦', '段干': '段干', '百里': '百里',
  '東郭': '东郭', '南門': '南门', '呼延': '呼延', '歸': '归', '海': '海', '羊舌': '羊舌',
  '微生': '微生', '嶽': '岳', '帥': '帅', '緱': '缑', '亢': '亢', '況': '况', '後': '后',
  '有': '有', '琴': '琴', '梁丘': '梁丘', '左丘': '左丘', '東門': '东门', '西門': '西门',
  '商': '商', '牟': '牟', '佘': '佘', '佴': '佴', '伯': '伯', '賞': '赏', '南宮': '南宫',
  '墨': '墨', '哈': '哈', '譙': '谯', '笪': '笪', '愛': '爱', '佟': '佟',
  '第': '第', '五': '五', '言': '言', '福': '福', '百': '百', '家': '家', '姓': '姓',
  '民': '民', '國': '国', '年': '年', '月': '月', '日': '日', '號': '号', '字': '字',
  '元': '元', '亨': '亨', '利': '利', '貞': '贞', '壹': '壹', '貳': '贰', '參': '参', '肆': '肆',
  '伍': '伍', '柒': '柒', '捌': '捌', '玖': '玖', '拾': '拾', '佰': '佰', '仟': '仟',
  '億': '亿', '零': '零', '兩': '两'
};

const simplifiedToTraditionalMap: Record<string, string> = {};
Object.entries(traditionalToSimplifiedMap).forEach(([t, s]) => {
  simplifiedToTraditionalMap[s] = t;
});

export const toSimplified = (text: string): string => {
  if (!text) return '';
  return text.split('').map(char => traditionalToSimplifiedMap[char] || char).join('');
};

export const toTraditional = (text: string): string => {
  if (!text) return '';
  return text.split('').map(char => simplifiedToTraditionalMap[char] || char).join('');
};

export const hasTraditionalChars = (text: string): boolean => {
  if (!text) return false;
  return text.split('').some(char => traditionalToSimplifiedMap[char] !== undefined);
};

const chineseNumerals: Record<string, number> = {
  '零': 0, '〇': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '廿': 20, '卅': 30, '卌': 40,
  '百': 100, '千': 1000, '万': 10000, '亿': 100000000,
  '壹': 1, '貳': 2, '參': 3, '肆': 4, '伍': 5, '陸': 6, '柒': 7, '捌': 8, '玖': 9,
  '拾': 10, '佰': 100, '仟': 1000, '萬': 10000, '億': 100000000
};

const upperNumerals = ['零', '壹', '貳', '參', '肆', '陸', '柒', '捌', '玖'];
const lowerNumerals = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

export const chineseToArabic = (text: string): number | null => {
  if (!text) return null;
  
  const normalized = toSimplified(text).trim();
  
  if (/^\d+$/.test(normalized)) {
    return parseInt(normalized, 10);
  }
  
  let result = 0;
  let temp = 0;
  let lastUnit = 0;
  
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const value = chineseNumerals[char];
    
    if (value === undefined) continue;
    
    if (value >= 10) {
      if (temp === 0) temp = 1;
      temp *= value;
      if (value >= 10000) {
        result += temp;
        temp = 0;
      }
      lastUnit = value;
    } else {
      if (lastUnit > 10) {
        temp += value;
      } else {
        if (lastUnit === 10) {
          temp += value;
        } else {
          temp = temp * 10 + value;
        }
      }
      lastUnit = value;
    }
  }
  
  result += temp;
  return result > 0 ? result : null;
};

export const arabicToChinese = (num: number, uppercase: boolean = false): string => {
  const numerals = uppercase ? upperNumerals : lowerNumerals;
  const units = ['', '十', '百', '千'];
  const bigUnits = ['', '万', '亿'];
  
  if (num === 0) return numerals[0];
  
  let result = '';
  const str = num.toString();
  const len = str.length;
  
  for (let i = 0; i < len; i++) {
    const digit = parseInt(str[i]);
    const pos = len - i - 1;
    const unitPos = pos % 4;
    const bigUnitPos = Math.floor(pos / 4);
    
    if (digit !== 0) {
      result += numerals[digit] + units[unitPos];
      if (unitPos === 0 && bigUnitPos > 0) {
        result += bigUnits[bigUnitPos];
      }
    } else if (unitPos === 0 && bigUnitPos > 0 && result.slice(-1) !== numerals[0]) {
      result += bigUnits[bigUnitPos];
    } else if (result.slice(-1) !== numerals[0] && i < len - 1) {
      result += numerals[0];
    }
  }
  
  result = result.replace(new RegExp(`${numerals[0]}+`, 'g'), numerals[0]);
  result = result.replace(new RegExp(`^${numerals[0]}|${numerals[0]}$`), '');
  
  if (result.startsWith('十')) {
    result = result.substring(1);
  }
  
  return result;
};

export const parseChineseDate = (text: string): Date | null => {
  if (!text) return null;
  
  const normalized = toSimplified(text).trim();
  
  const yearMatch = normalized.match(/(?:民國|民国)?\s*(\d+|[一二三四五六七八九十百千]+)\s*年/);
  const monthMatch = normalized.match(/(\d+|[一二三四五六七八九十]+)\s*月/);
  const dayMatch = normalized.match(/(\d+|[一二三四五六七八九十]+)\s*[日號]/);
  
  let year: number | null = null;
  let month: number | null = null;
  let day: number | null = null;
  
  if (yearMatch) {
    const yearStr = yearMatch[1];
    year = chineseToArabic(yearStr) || parseInt(yearStr, 10);
    if (normalized.includes('民國') || normalized.includes('民国')) {
      year += 1911;
    }
  }
  
  if (monthMatch) {
    const monthStr = monthMatch[1];
    month = chineseToArabic(monthStr) || parseInt(monthStr, 10);
  }
  
  if (dayMatch) {
    const dayStr = dayMatch[1];
    day = chineseToArabic(dayStr) || parseInt(dayStr, 10);
  }
  
  if (year && month && day) {
    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  return null;
};

export const normalizeDateString = (text: string): string | null => {
  if (!text) return null;
  
  const chineseDate = parseChineseDate(text);
  if (chineseDate) {
    return chineseDate.toISOString().split('T')[0];
  }
  
  const standardMatch = text.match(/(\d{4})[-\/年.](\d{1,2})[-\/月.](\d{1,2})/);
  if (standardMatch) {
    const year = parseInt(standardMatch[1], 10);
    const month = parseInt(standardMatch[2], 10);
    const day = parseInt(standardMatch[3], 10);
    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  const shortMatch = text.match(/(\d{2})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
  if (shortMatch) {
    let year = parseInt(shortMatch[1], 10);
    if (year < 50) year += 2000;
    else if (year < 100) year += 1900;
    const month = parseInt(shortMatch[2], 10);
    const day = parseInt(shortMatch[3], 10);
    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  return null;
};

export const isValidChineseName = (name: string): boolean => {
  if (!name) return false;
  const normalized = toSimplified(name).trim();
  const chineseNameRegex = /^[\u4e00-\u9fa5]{2,4}$/;
  return chineseNameRegex.test(normalized);
};

export const normalizeName = (name: string): string => {
  if (!name) return '';
  let normalized = toSimplified(name).trim();
  normalized = normalized.replace(/[\s\.·]/g, '');
  return normalized;
};

export const areNamesSimilar = (name1: string, name2: string): number => {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  
  if (n1 === n2) return 1.0;
  
  let matches = 0;
  for (const char of n1) {
    if (n2.includes(char)) matches++;
  }
  
  const t1 = toTraditional(n1);
  const t2 = toTraditional(n2);
  if (t1 === t2) return 0.95;
  
  return matches / Math.max(n1.length, n2.length);
};
