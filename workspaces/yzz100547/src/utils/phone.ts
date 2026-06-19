export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) {
    return phone;
  }
  const prefix = phone.substring(0, 3);
  const suffix = phone.substring(phone.length - 4);
  return `${prefix}****${suffix}`;
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}
