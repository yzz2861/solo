export function maskIdCard(id: string): string {
  if (!id || id.length < 8) return id;
  return id.slice(0, 4) + '*'.repeat(id.length - 8) + id.slice(-4);
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + '*'.repeat(phone.length - 7) + phone.slice(-4);
}

export function maskAll(text: string): string {
  if (!text) return text;
  let result = text;
  result = result.replace(/\b1[3-9]\d{9}\b/g, (m) => maskPhone(m));
  result = result.replace(/\b[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g, (m) => maskIdCard(m));
  return result;
}
