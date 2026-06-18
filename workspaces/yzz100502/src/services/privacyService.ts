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

  maskAll(text: string): string {
    if (!text) return text;

    let result = text;

    result = result.replace(/1[3-9]\d{9}/g, (match) => this.maskPhone(match));

    result = result.replace(/\d{17}[\dXx]/g, (match) => this.maskIdCard(match));

    result = result.replace(/\d{15}/g, (match) => this.maskIdCard(match));

    return result;
  },

  maskSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        masked[key] = this.maskAll(value);
      } else if (Array.isArray(value)) {
        masked[key] = value.map((item) =>
          typeof item === 'string' ? this.maskAll(item) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = this.maskSensitiveData(value as Record<string, unknown>);
      } else {
        masked[key] = value;
      }
    }
    return masked;
  },
};
