import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { modalOpen, modalClose } from '../utils/animations'

const MAX_WIDTH = {
  md: 'max-w-3xl',
  lg: 'max-w-6xl',
}

export function Modal({ open, onClose, title, subtitle, children, width = 'md' }) {
  const [rendered, setRendered] = useState(open)
  const backdropRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    if (open) {
      setRendered(true)
      return
    }
    if (rendered) {
      modalClose(backdropRef.current, panelRef.current, () => setRendered(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (open && rendered) {
      modalOpen(backdropRef.current, panelRef.current)
    }
  }, [open, rendered])

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!rendered) return null

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', opacity: 0 }}
    >
      <div
        ref={panelRef}
        className={`bg-[#0b1120] border border-white/[0.1] rounded-2xl w-full ${MAX_WIDTH[width]} max-h-[88vh] flex flex-col shadow-2xl shadow-black/60`}
        style={{ opacity: 0, boxShadow: '0 1px 0 0 rgba(255,255,255,0.05) inset, 0 24px 60px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(59,107,245,0.06)' }}
      >
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-white/[0.06] flex-shrink-0">
          <div>
            <h2 className="text-white font-semibold text-sm font-display">{title}</h2>
            {subtitle && <p className="text-slate-500 text-xs mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-white transition-colors ml-4 mt-0.5"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-5">
          {children}
        </div>
      </div>
    </div>
  )
}
