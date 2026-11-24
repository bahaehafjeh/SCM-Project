import { useEffect, useState } from 'react'

/** Counts from 0 to `target` once on mount (ease-out); returns the target at once under reduced motion. */
export function useCountUp(target: number, duration = 900, delay = 0) {
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [value, setValue] = useState(reduce ? target : 0)
  useEffect(() => {
    if (reduce || document.hidden) return setValue(target)
    let raf = 0
    let start = 0
    const tick = (t: number) => {
      if (!start) start = t
      const p = Math.min(1, Math.max(0, (t - start - delay) / duration))
      setValue(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, delay, reduce])
  return value
}
