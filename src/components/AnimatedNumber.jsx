import { useEffect, useRef } from 'react'
import { animate } from 'animejs'

// Animates a numeric span from its previous value to `value` whenever it changes.
// `format` receives the in-progress number and returns display text.
export function AnimatedNumber({ value, format = (v) => v, duration = 700, className = '' }) {
  const elRef = useRef(null)
  const prevRef = useRef(value)

  useEffect(() => {
    const el = elRef.current
    if (!el) return
    if (value == null || typeof value !== 'number' || Number.isNaN(value)) {
      el.textContent = value == null ? '—' : format(value)
      prevRef.current = value
      return
    }
    const from = typeof prevRef.current === 'number' ? prevRef.current : 0
    const proxy = { v: from }
    el.textContent = format(from)
    const anim = animate(proxy, {
      v: value,
      duration,
      ease: 'outExpo',
      onUpdate: () => { el.textContent = format(proxy.v) },
    })
    prevRef.current = value
    return () => anim.pause()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return <span ref={elRef} className={className}>{value != null ? format(typeof value === 'number' ? value : value) : '—'}</span>
}
