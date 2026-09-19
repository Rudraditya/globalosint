import { animate, stagger } from 'animejs'

// Fade + rise entrance for a container's direct children (cards, rows, etc.)
export function staggerIn(targets, opts = {}) {
  if (!targets || (Array.isArray(targets) && targets.length === 0)) return
  return animate(targets, {
    opacity: [0, 1],
    y: [14, 0],
    duration: 480,
    delay: stagger(45, { start: opts.delay ?? 0 }),
    ease: 'outQuart',
  })
}

// Whole-page / view fade+rise, used when switching dashboard tabs
export function pageEnter(el, opts = {}) {
  if (!el) return
  return animate(el, {
    opacity: [0, 1],
    y: [10, 0],
    duration: 380,
    ease: 'outQuart',
    ...opts,
  })
}

// Modal backdrop + panel open animation
export function modalOpen(backdropEl, panelEl) {
  if (backdropEl) {
    animate(backdropEl, { opacity: [0, 1], duration: 200, ease: 'outQuad' })
  }
  if (panelEl) {
    animate(panelEl, {
      opacity: [0, 1],
      scale: [0.94, 1],
      y: [16, 0],
      duration: 360,
      ease: 'outExpo',
    })
  }
}

// Modal backdrop + panel close animation; calls onComplete when the panel finishes
export function modalClose(backdropEl, panelEl, onComplete) {
  if (backdropEl) {
    animate(backdropEl, { opacity: [1, 0], duration: 180, ease: 'inQuad' })
  }
  animate(panelEl, {
    opacity: [1, 0],
    scale: [1, 0.96],
    y: [0, 10],
    duration: 200,
    ease: 'inQuad',
    onComplete,
  })
}
