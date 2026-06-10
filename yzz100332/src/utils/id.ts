const ALPHABET =
  "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";

export function nanoid(len = 12): string {
  let id = "";
  let i = len;
  const crypto = globalThis.crypto;
  if (crypto?.getRandomValues) {
    const buf = crypto.getRandomValues(new Uint8Array(i));
    while (i--) {
      id += ALPHABET[buf[i] & 63];
    }
  } else {
    while (i--) {
      id += ALPHABET[(Math.random() * 64) | 0];
    }
  }
  return id;
}

export function timestamp(): string {
  return new Date().toISOString();
}

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayStr(): string {
  return formatDate(new Date());
}

export function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d;
}

export function toFixed2(n: number): number {
  return Math.round(n * 100) / 100;
}
