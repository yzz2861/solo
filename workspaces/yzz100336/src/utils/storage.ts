export function saveToLocalStorage(key: string, data: unknown): void {
  localStorage.setItem(key, JSON.stringify(data))
}

export function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return defaultValue
    return JSON.parse(raw) as T
  } catch {
    return defaultValue
  }
}
