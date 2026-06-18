import type { AppState } from "@/types";
import { getSeedState } from "@/data/seed";

const STORAGE_KEY = "tennis_court_app_v1";
const BACKUP_KEYS = [
  "tennis_court_app_v1_bak_1",
  "tennis_court_app_v1_bak_2",
  "tennis_court_app_v1_bak_3",
];
const SCHEMA_VERSION = 1;

export interface StorageEnvelope {
  schemaVersion: number;
  savedAt: string;
  state: AppState;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function safeParseJSON<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function loadState(): AppState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seed = getSeedState();
    saveState(seed);
    return seed;
  }

  const parsed = safeParseJSON<StorageEnvelope>(raw);
  if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION) {
    for (const bk of BACKUP_KEYS) {
      const bakRaw = localStorage.getItem(bk);
      if (bakRaw) {
        const bak = safeParseJSON<StorageEnvelope>(bakRaw);
        if (bak && bak.schemaVersion === SCHEMA_VERSION) {
          return bak.state;
        }
      }
    }
    const seed = getSeedState();
    saveState(seed);
    return seed;
  }

  return parsed.state;
}

export function saveState(state: AppState): void {
  const clone = deepClone(state);
  const envelope: StorageEnvelope = {
    schemaVersion: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    state: clone,
  };

  const prevRaw = localStorage.getItem(STORAGE_KEY);
  if (prevRaw) {
    for (let i = BACKUP_KEYS.length - 1; i > 0; i--) {
      const prev = localStorage.getItem(BACKUP_KEYS[i - 1]);
      if (prev) localStorage.setItem(BACKUP_KEYS[i], prev);
    }
    localStorage.setItem(BACKUP_KEYS[0], prevRaw);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
}

export function clearAllState(): AppState {
  localStorage.removeItem(STORAGE_KEY);
  BACKUP_KEYS.forEach((k) => localStorage.removeItem(k));
  const seed = getSeedState();
  saveState(seed);
  return seed;
}

export function debounce<F extends (...args: unknown[]) => void>(
  fn: F,
  delay = 500
): (...args: Parameters<F>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
