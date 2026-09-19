export function SkeletonCard({ className = '' }) {
  return (
    <div className={`glass-card rounded-xl p-4 overflow-hidden ${className}`}>
      <div className="shimmer h-3 bg-white/[0.06] rounded w-2/5 mb-3" />
      <div className="shimmer h-7 bg-white/[0.06] rounded w-3/5 mb-4" />
      <div className="shimmer h-10 bg-white/[0.04] rounded w-full" />
    </div>
  )
}

export function SkeletonChart({ className = '' }) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="flex items-end gap-2" style={{ height: 200 }}>
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className="shimmer flex-1 bg-white/[0.04] rounded-t"
            style={{ height: `${25 + ((i * 37 + 11) % 75)}%` }}
          />
        ))}
      </div>
      <div className="flex gap-4 mt-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="shimmer h-2.5 bg-white/[0.06] rounded" style={{ width: `${50 + i * 20}px` }} />
        ))}
      </div>
    </div>
  )
}
