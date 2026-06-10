import { useRef, useCallback, useEffect } from "react"

export function useGameLoop(
  callback: (dt: number) => void,
  running: boolean
) {
  const callbackRef = useRef(callback)
  const frameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

  callbackRef.current = callback

  const loop = useCallback((time: number) => {
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = time
    }
    const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1)
    lastTimeRef.current = time
    callbackRef.current(dt)
    frameRef.current = requestAnimationFrame(loop)
  }, [])

  useEffect(() => {
    if (running) {
      lastTimeRef.current = 0
      frameRef.current = requestAnimationFrame(loop)
    } else {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [running, loop])
}
