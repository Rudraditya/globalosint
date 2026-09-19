function timeAgo(date) {
  if (!date) return null
  const s = Math.floor((Date.now() - date.getTime()) / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

export function LiveStatus({ online, lastUpdated, label, className = '' }) {
  const ago = timeAgo(lastUpdated)
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${online ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
      <span className={`text-xs font-semibold tracking-wide ${online ? 'text-green-400' : 'text-slate-500'}`}>
        {online ? 'LIVE' : 'OFFLINE'}
      </span>
      {label && <span className="text-slate-600 text-xs">{label}</span>}
      {ago && <span className="text-slate-600 text-xs">{ago}</span>}
    </div>
  )
}
