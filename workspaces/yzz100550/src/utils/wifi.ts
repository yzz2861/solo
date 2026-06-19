export function generateWifiPassword(length: number = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateWifiUsername(visitorName: string, phone: string): string {
  const namePart = visitorName.replace(/\s+/g, '').slice(0, 4).toLowerCase();
  const phonePart = phone.slice(-4);
  const timestamp = Date.now().toString(36);
  return `v_${namePart}_${phonePart}_${timestamp}`;
}

export function validatePhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

export function validateChineseName(name: string): boolean {
  return /^[\u4e00-\u9fa5·]{2,20}$/.test(name) || /^[a-zA-Z\s]{2,50}$/.test(name);
}
