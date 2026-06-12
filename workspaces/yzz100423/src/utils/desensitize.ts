export function desensitizePhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
}

export function desensitizeName(name: string): string {
  if (!name || name.length <= 1) return name;
  if (name.length === 2) return name.charAt(0) + "*";
  return name.charAt(0) + "*".repeat(name.length - 1);
}

export function desensitizeAddress(address: string): string {
  if (!address) return address;
  const match = address.match(/^(.+?(?:省|市|区|县))/);
  if (match) {
    return match[1] + "***";
  }
  return address.substring(0, Math.min(6, address.length)) + "***";
}

export function desensitizeAll(data: {
  customerName: string;
  phone: string;
  address: string;
}) {
  return {
    customerName: desensitizeName(data.customerName),
    phone: desensitizePhone(data.phone),
    address: desensitizeAddress(data.address),
  };
}
