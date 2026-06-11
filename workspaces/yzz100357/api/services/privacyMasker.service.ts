const PHONE_PATTERN = /(?:\+?86[-\s]?)?1[3-9]\d{9}/g;
const ID_CARD_PATTERN = /[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]/g;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const BANK_CARD_PATTERN = /\d{16,19}/g;
const ADDRESS_PATTERN = /(?:[省市区县镇村路街道号弄楼单元室]+[\d-]*[室号]?)/g;

export function maskPhone(text: string): string {
  return text.replace(PHONE_PATTERN, (match) => {
    if (match.length === 11) {
      return match.substring(0, 3) + '****' + match.substring(7);
    }
    const digits = match.replace(/\D/g, '');
    if (digits.length === 11) {
      const prefix = match.substring(0, match.length - 8);
      return prefix + digits.substring(0, 3) + '****' + digits.substring(7);
    }
    return match;
  });
}

export function maskIdCard(text: string): string {
  return text.replace(ID_CARD_PATTERN, (match) => {
    return match.substring(0, 6) + '********' + match.substring(14);
  });
}

export function maskEmail(text: string): string {
  return text.replace(EMAIL_PATTERN, (match) => {
    const [username, domain] = match.split('@');
    if (username.length <= 2) {
      return '**@' + domain;
    }
    return username.substring(0, 2) + '***@' + domain;
  });
}

export function maskBankCard(text: string): string {
  return text.replace(BANK_CARD_PATTERN, (match) => {
    return match.substring(0, 4) + ' **** **** ' + match.substring(match.length - 4);
  });
}

export function maskAddress(text: string): string {
  return text.replace(ADDRESS_PATTERN, (match) => {
    if (match.length <= 5) return match;
    return match.substring(0, 5) + '***';
  });
}

export function maskAll(text: string): string {
  let result = text;
  result = maskPhone(result);
  result = maskIdCard(result);
  result = maskEmail(result);
  result = maskBankCard(result);
  return result;
}

export function containsSensitiveInfo(text: string): {
  hasPhone: boolean;
  hasIdCard: boolean;
  hasEmail: boolean;
  hasBankCard: boolean;
} {
  return {
    hasPhone: PHONE_PATTERN.test(text),
    hasIdCard: ID_CARD_PATTERN.test(text),
    hasEmail: EMAIL_PATTERN.test(text),
    hasBankCard: BANK_CARD_PATTERN.test(text)
  };
}
