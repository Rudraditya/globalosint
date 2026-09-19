export function Card({ children, className = '', hoverable = false }) {
  return (
    <div className={`glass-card ${hoverable ? 'glass-hover' : ''} rounded-2xl ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-white/[0.06]">
      <div>
        <h2 className="text-white font-semibold text-sm font-display">{title}</h2>
        {subtitle && <p className="text-slate-500 text-xs mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}
