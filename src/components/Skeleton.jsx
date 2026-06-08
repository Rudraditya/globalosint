export function SkeletonCard({ className = '' }) {
  return (
    <div className={`animate-pulse bg-zinc-950 rounded-xl p-4 border border-zinc-900 ${className}`}>
      <div className="h-3 bg-zinc-800 rounded w-2/5 mb-3" />
      <div className="h-7 bg-zinc-800 rounded w-3/5 mb-4" />
      <div className="h-10 bg-zinc-900 rounded w-full" />
    </div>
  )
}

export function SkeletonChart({ className = '' }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="flex items-end gap-2" style={{ height: 200 }}>
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-zinc-900 rounded-t"
            style={{ height: `${25 + ((i * 37 + 11) % 75)}%` }}
          />
        ))}
      </div>
      <div className="flex gap-4 mt-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-2.5 bg-zinc-800 rounded" style={{ width: `${50 + i * 20}px` }} />
        ))}
      </div>
    </div>
  )
}
