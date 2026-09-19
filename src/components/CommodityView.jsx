import { useState, useEffect, useCallback, useRef } from 'react'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { fetchAllCommodities, COMMODITIES } from '../utils/api'
import { SkeletonCard } from './Skeleton'
import { LiveStatus } from './LiveStatus'
import { AnimatedNumber } from './AnimatedNumber'
import { staggerIn } from '../utils/animations'

const REFRESH_MS = 5 * 60 * 1000

// Format a Date in Eastern Time (auto-selects EST / EDT based on DST)
function fmtET(date) {
  if (!date) return null
  return date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
    hour12: false,
  })
}

const CATEGORY_COLORS = {
  Energy:      '#f97316',
  Metals:      '#facc15',
  Agriculture: '#4ade80',
}

const TT = {
  contentStyle: { background: '#0a0e16', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 8, padding: '6px 10px', fontSize: 11 },
  labelStyle: { color: '#71717a', fontSize: 10, marginBottom: 2 },
}

function CommodityCard({ c }) {
  const up = c.change > 0, flat = c.change === 0 || c.change == null
  const catColor = CATEGORY_COLORS[c.category] ?? '#818cf8'
  const lineColor = c.error ? '#3f3f46' : flat ? '#71717a' : up ? '#22c55e' : '#ef4444'
  const trendColor = flat ? 'text-slate-500' : up ? 'text-green-400' : 'text-red-400'

  return (
    <div className="glass-card glass-hover rounded-xl overflow-hidden">
      {/* Category stripe */}
      <div className="h-0.5 w-full" style={{ background: catColor }} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-white text-sm font-semibold leading-tight">{c.label}</p>
            <p className="text-slate-600 text-[10px] mt-0.5">{c.unit}</p>
          </div>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${catColor}20`, color: catColor }}>
            {c.category}
          </span>
        </div>

        <div className="mt-2">
          <p className="text-2xl font-bold text-white tabular-nums">
            {c.error || c.price == null
              ? <span className="text-slate-700 text-base">—</span>
              : <AnimatedNumber value={c.price} format={(v) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} />}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {flat ? <Minus size={11} className="text-slate-600" /> : up ? <TrendingUp size={11} className="text-green-400" /> : <TrendingDown size={11} className="text-red-400" />}
            <span className={`text-xs font-semibold ${trendColor}`}>
              {c.change != null ? `${c.change > 0 ? '+' : ''}${c.change}%` : '—'}
            </span>
            <span className="text-slate-700 text-[10px]">today</span>
          </div>
        </div>

        {c.series?.length > 1 && (
          <div className="mt-3 -mx-1">
            <ResponsiveContainer width="100%" height={52}>
              <AreaChart data={c.series} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`cg-${c.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={lineColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip contentStyle={TT.contentStyle} labelStyle={TT.labelStyle}
                  formatter={(v) => [v.toLocaleString(undefined, { minimumFractionDigits: 2 }), c.label]}
                />
                <Area type="monotone" dataKey="price" stroke={lineColor} fill={`url(#cg-${c.id})`}
                  strokeWidth={1.5} dot={false} animationDuration={900} animationEasing="ease-out" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {c.updatedAt && (
          <p className="text-slate-600 text-[10px] mt-2 tabular-nums font-medium">
            {fmtET(c.updatedAt)}
          </p>
        )}
      </div>
    </div>
  )
}

function CommodityCardSkeleton() {
  return (
    <div className="glass-card rounded-xl p-4 overflow-hidden">
      <div className="shimmer h-3 bg-white/[0.06] rounded w-1/2 mb-2" />
      <div className="shimmer h-7 bg-white/[0.06] rounded w-2/3 mb-2" />
      <div className="shimmer h-3 bg-white/[0.06] rounded w-1/3 mb-3" />
      <div className="shimmer h-12 bg-white/[0.04] rounded" />
    </div>
  )
}

export function CommodityView() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [activeCategory, setActiveCategory] = useState('All')
  const gridRef = useRef(null)

  const categories = ['All', 'Energy', 'Metals', 'Agriculture']

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAllCommodities()
      setItems(data)
      setLastUpdated(new Date())
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, REFRESH_MS)
    return () => clearInterval(id)
  }, [load])

  const [countdown, setCountdown] = useState(REFRESH_MS / 1000)
  useEffect(() => {
    if (!lastUpdated) return
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastUpdated.getTime()) / 1000)
      setCountdown(Math.max(0, Math.floor(REFRESH_MS / 1000) - elapsed))
    }, 1000)
    return () => clearInterval(id)
  }, [lastUpdated])

  useEffect(() => {
    if (gridRef.current && items.length > 0) staggerIn(gridRef.current.children)
  }, [items, activeCategory])

  const displayed = activeCategory === 'All'
    ? items
    : items.filter((c) => c.category === activeCategory)

  const skeletonCount = activeCategory === 'All'
    ? COMMODITIES.length
    : COMMODITIES.filter((c) => c.category === activeCategory).length

  const categoryStats = categories.slice(1).reduce((acc, cat) => {
    const catItems = items.filter((c) => c.category === cat && c.change != null)
    const gainers = catItems.filter((c) => c.change > 0).length
    const losers = catItems.filter((c) => c.change < 0).length
    acc[cat] = { gainers, losers }
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-white font-semibold">Global Commodity Prices</h2>
          <p className="text-slate-600 text-xs">Real-time futures · Yahoo Finance · Refreshes every 5 min</p>
        </div>
        <div className="flex items-center gap-3">
          <LiveStatus online={items.length > 0 && !loading} lastUpdated={lastUpdated} label="Yahoo Finance" />
          {lastUpdated && (
            <div className="flex items-center gap-2 text-xs tabular-nums">
              <span className="text-slate-400 font-semibold">{fmtET(lastUpdated)}</span>
              <span className="text-slate-700">· next in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Category summary */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {categories.slice(1).map((cat) => {
            const { gainers, losers } = categoryStats[cat] ?? { gainers: 0, losers: 0 }
            const catColor = CATEGORY_COLORS[cat]
            return (
              <div key={cat} className="glass-card rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold" style={{ color: catColor }}>{cat}</p>
                  <p className="text-slate-600 text-[10px] mt-0.5">
                    {items.filter((c) => c.category === cat).length} commodities
                  </p>
                </div>
                <div className="flex gap-2 text-xs font-bold">
                  <span className="text-green-400">▲ {gainers}</span>
                  <span className="text-red-400">▼ {losers}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeCategory === cat
                ? cat === 'All' ? 'text-white bg-gradient-brand shadow-[0_2px_12px_-2px_rgba(59,107,245,0.6)]' : 'text-black font-bold'
                : 'bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
            style={activeCategory === cat && cat !== 'All' ? { background: CATEGORY_COLORS[cat] } : {}}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Commodity grid */}
      {loading && items.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: skeletonCount }).map((_, i) => <CommodityCardSkeleton key={i} />)}
        </div>
      ) : (
        <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayed.map((c) => <CommodityCard key={c.id} c={c} />)}
        </div>
      )}
    </div>
  )
}
