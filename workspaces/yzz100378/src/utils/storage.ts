export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key)
    if (data) return JSON.parse(data) as T
  } catch {}
  return defaultValue
}

export function saveToStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {}
}
