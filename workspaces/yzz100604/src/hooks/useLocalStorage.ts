import { useState, useEffect, useCallback } from 'react'

export function useLocalStorage<T>(
  key: string,
  initial: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [stored, setStored] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(stored))
    } catch {
      // ignore
    }
  }, [key, stored])

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStored((prev) =>
        value instanceof Function ? value(prev) : value
      )
    },
    []
  )

  const remove = useCallback(() => {
    try {
      window.localStorage.removeItem(key)
      setStored(initial)
    } catch {
      // ignore
    }
  }, [key, initial])

  return [stored, setValue, remove]
}
