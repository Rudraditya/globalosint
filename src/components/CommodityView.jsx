import { useState, useEffect, useCallback } from 'react'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { fetchAllCommodities, COMMODITIES } from '../utils/api'
import { SkeletonCard } from './Skeleton'
import { LiveStatus } from './LiveStatus'

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
  contentStyle: { background: '#0a0a0a', border: '1px solid #27272a', borderRadius: 8, padding: '6px 10px', fontSize: 11 },
  labelStyle: { color: '#71717a', fontSize: 10, marginBottom: 2 },
}

function CommodityCard({ c }) {
  const up = c.change > 0, flat = c.change === 0 || c.change == null
  const catColor = CATEGORY_COLORS[c.category] ?? '#818cf8'
  const lineColor = c.error ? '#3f3f46' : flat ? '#71717a' : up ? '#22c55e' : '#ef4444'
  const trendColor = flat ? 'text-zinc-500' : up ? 'text-green-400' : 'text-red-400'

  return (
    <div className="bg-zinc-950 rounded-xl border border-zinc-900 hover:border-zinc-800 transition-colors overflow-hidden">
      {/* Category stripe */}
      <div className="h-0.5 w-full" style={{ background: catColor }} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-white text-sm font-semibold leading-tight">{c.label}</p>
            <p className="text-zinc-600 text-[10px] mt-0.5">{c.unit}</p>
          </div>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${catColor}20`, color: catColor }}>
            {c.category}
          </span>
        </div>

        <div className="mt-2">
          <p className="text-2xl font-bold text-white tabular-nums">
            {c.error || c.price == null
              ? <span className="text-zinc-700 text-base">—</span>
              : c.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {flat ? <Minus size={11} className="text-zinc-600" /> : up ? <TrendingUp size={11} className="text-green-400" /> : <TrendingDown size={11} className="text-red-400" />}
            <span className={`text-xs font-semibold ${trendColor}`}>
              {c.change != null ? `${c.change > 0 ? '+' : ''}${c.change}%` : '—'}
            </span>
            <span className="text-zinc-700 text-[10px]">today</span>
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
                  strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {c.updatedAt && (
          <p className="text-zinc-600 text-[10px] mt-2 tabular-nums font-medium">
            {fmtET(c.updatedAt)}
          </p>
        )}
      </div>
    </div>
  )
}

function CommodityCardSkeleton() {
  return (
    <div className="bg-zinc-950 rounded-xl border border-zinc-900 p-4 animate-pulse">
      <div className="h-3 bg-zinc-800 rounded w-1/2 mb-2" />
      <div className="h-7 bg-zinc-800 rounded w-2/3 mb-2" />
      <div className="h-3 bg-zinc-800 rounded w-1/3 mb-3" />
      <div className="h-12 bg-zinc-900 rounded" />
    </div>
  )
}

export function CommodityView() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [activeCategory, setActiveCategory] = useState('All')

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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-white font-semibold">Global Commodity Prices</h2>
          <p className="text-zinc-600 text-xs">Real-time futures · Yahoo Finance · Refreshes every 5 min</p>
        </div>
        <div className="flex items-center gap-3">
          <LiveStatus online={items.length > 0 && !loading} lastUpdated={lastUpdated} label="Yahoo Finance" />
          {lastUpdated && (
            <div className="flex items-center gap-2 text-xs tabular-nums">
              <span className="text-zinc-400 font-semibold">{fmtET(lastUpdated)}</span>
              <span className="text-zinc-700">· next in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</span>
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
              <div key={cat} className="bg-zinc-950 rounded-xl p-3 border border-zinc-900 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold" style={{ color: catColor }}>{cat}</p>
                  <p className="text-zinc-600 text-[10px] mt-0.5">
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
                ? 'text-black font-bold'
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            style={activeCategory === cat ? { background: cat === 'All' ? '#ff6b35' : CATEGORY_COLORS[cat] } : {}}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayed.map((c) => <CommodityCard key={c.id} c={c} />)}
        </div>
      )}
    </div>
  )
}
