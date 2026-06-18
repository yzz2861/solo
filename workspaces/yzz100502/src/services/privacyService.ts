const COMMON_SURNAMES = [
  '王','李','张','刘','陈','杨','赵','黄','周','吴',
  '徐','孙','胡','朱','高','林','何','郭','马','罗',
  '梁','宋','郑','谢','韩','唐','冯','于','董','萧',
  '程','曹','袁','邓','许','傅','沈','曾','彭','吕',
  '苏','卢','蒋','蔡','贾','丁','魏','薛','叶','阎',
  '余','潘','杜','戴','夏','钟','汪','田','任','姜',
  '范','方','石','姚','谭','廖','邹','熊','金','陆',
  '郝','孔','白','崔','康','毛','邱','秦','江','史',
  '顾','侯','邵','孟','龙','万','段','雷','钱','汤',
  '尹','黎','易','常','武','乔','贺','赖','龚','文',
];

const SURNAME_PATTERN = COMMON_SURNAMES.join('|');

const CHINESE_NAME_REGEX = new RegExp(
  `(?:${SURNAME_PATTERN})([\\u4e00-\\u9fa5]{1,2})`,
  'g'
);

const TITLE_CHARS = /[医护师长局长主任总经干部老大小姐弟姐妹哥嫂婶伯叔爷奶婆属院科室队组生]/;
const COMMON_VERBS = /[说是在想来去看问找打给叫让把被给]/;
const NAME_PREFIXES = /[叫是找看问我你他她它]/;

export const privacyService = {
  maskName(name: string): string {
    if (!name || name.length <= 1) return name;
    if (name.length === 2) {
      return name.charAt(0) + '*';
    }
    return name.charAt(0) + '*'.repeat(name.length - 2) + name.charAt(name.length - 1);
  },

  maskPhone(phone: string): string {
    if (!phone || phone.length < 7) return phone;
    return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
  },

  maskIdCard(idCard: string): string {
    if (!idCard || idCard.length < 8) return idCard;
    return idCard.substring(0, 4) + '********' + idCard.substring(idCard.length - 4);
  },

  maskChineseNamesInText(text: string): string {
    if (!text) return text;

    const matches: { full: string; surname: string; given: string; index: number }[] = [];
    let match: RegExpExecArray | null;

    const regex = new RegExp(CHINESE_NAME_REGEX.source, 'g');

    while ((match = regex.exec(text)) !== null) {
      const full = match[0];
      const surname = match[0].charAt(0);
      const given = match[1];
      const prevChar = match.index > 0 ? text[match.index - 1] : '';
      const prevPrevChar = match.index > 1 ? text[match.index - 2] : '';
      const nextIdx = match.index + full.length;
      const nextChar = nextIdx < text.length ? text[nextIdx] : '';

      if (full.length === 2 && surname === given) continue;

      if (TITLE_CHARS.test(nextChar)) continue;

      const prevIsChinese = /[\u4e00-\u9fa5]/.test(prevChar);
      const nextIsChinese = /[\u4e00-\u9fa5]/.test(nextChar);

      if (full.length === 3 && nextIsChinese) continue;

      const isAllowedPrefix = NAME_PREFIXES.test(prevChar) ||
        (prevPrevChar + prevChar === '患者') ||
        (prevPrevChar + prevChar === '联系') ||
        (prevPrevChar + prevChar === '找') ||
        (prevPrevChar + prevChar === '叫');

      if (prevIsChinese && !isAllowedPrefix) continue;

      matches.push({ full, surname, given, index: match.index });
    }

    let result = text;
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i];
      let masked: string;
      if (m.full.length === 2) {
        masked = m.surname + '*';
      } else {
        masked = m.surname + '*' + m.given.charAt(m.given.length - 1);
      }
      result = result.substring(0, m.index) + masked + result.substring(m.index + m.full.length);
    }

    return result;
  },

  maskKnownNamesInText(text: string, names: string[]): string {
    if (!text || names.length === 0) return text;

    let result = text;
    for (const name of names) {
      if (!name || name.length <= 1) continue;
      const masked = this.maskName(name);
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(escaped, 'g'), masked);
    }
    return result;
  },

  maskAll(text: string, knownNames?: string[]): string {
    if (!text) return text;

    let result = text;

    result = result.replace(/1[3-9]\d{9}/g, (match) => this.maskPhone(match));

    result = result.replace(/\d{17}[\dXx]/g, (match) => this.maskIdCard(match));

    result = result.replace(/\d{15}/g, (match) => this.maskIdCard(match));

    if (knownNames && knownNames.length > 0) {
      result = this.maskKnownNamesInText(result, knownNames);
    }

    result = this.maskChineseNamesInText(result);

    return result;
  },

  maskSensitiveData(data: Record<string, unknown>, knownNames?: string[]): Record<string, unknown> {
    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        masked[key] = this.maskAll(value, knownNames);
      } else if (Array.isArray(value)) {
        masked[key] = value.map((item) =>
          typeof item === 'string' ? this.maskAll(item, knownNames) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = this.maskSensitiveData(value as Record<string, unknown>, knownNames);
      } else {
        masked[key] = value;
      }
    }
    return masked;
  },
};
