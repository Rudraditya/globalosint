import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { fetchIndustrialProduction, computeAnnualGrowth } from '../utils/api'
import { SkeletonChart, SkeletonCard } from './Skeleton'
import { ErrorState } from './ErrorState'
import { WorldMap } from './WorldMap'
import { LiveStatus } from './LiveStatus'

// G20 countries with OECD KEI industrial production data
const COUNTRIES = [
  { code: 'USA', label: 'United States',  color: '#818cf8' },
  { code: 'DEU', label: 'Germany',         color: '#00e5ff' },
  { code: 'JPN', label: 'Japan',           color: '#fbbf24' },
  { code: 'GBR', label: 'United Kingdom',  color: '#c084fc' },
  { code: 'FRA', label: 'France',          color: '#60a5fa' },
  { code: 'KOR', label: 'South Korea',     color: '#38bdf8' },
]

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#0a0a0a',
    border: '1px solid #27272a',
    borderRadius: 10,
    boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
    padding: '10px 14px',
  },
  labelStyle: { color: '#d4d4d8', fontWeight: 600, marginBottom: 4, fontSize: 12 },
  itemStyle: { color: '#71717a', fontSize: 12 },
  cursor: { fill: 'rgba(249,115,22,0.06)' },
}

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, trend, color, loading }) {
  const isUp = trend > 0
  const isFlat = trend === 0
  const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown
  const trendColor = trend == null
    ? 'text-zinc-600'
    : isUp ? 'text-green-400' : isFlat ? 'text-zinc-500' : 'text-red-400'

  if (loading) return <SkeletonCard />

  return (
    <div
      className="bg-zinc-950 rounded-xl p-4 border border-zinc-900 hover:border-zinc-800 transition-colors"
      style={{ borderTopColor: color, borderTopWidth: 2 }}
    >
      <p className="text-zinc-500 text-xs uppercase tracking-wider font-medium mb-2">{label}</p>
      <p className="text-2xl font-bold text-white tabular-nums mb-1.5">
        {value ?? <span className="text-zinc-700">—</span>}
      </p>
      <div className="flex items-center gap-1.5">
        {trend != null && <Icon size={12} className={trendColor} />}
        <span className={`text-xs font-medium ${trendColor}`}>{sub}</span>
      </div>
    </div>
  )
}

// ── Custom bar chart tooltip ───────────────────────────────────────────────
function GrowthTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={TOOLTIP_STYLE.contentStyle}>
      <p style={{ ...TOOLTIP_STYLE.labelStyle }}>{label}</p>
      {payload.map((entry) => {
        const country = COUNTRIES.find((c) => c.code === entry.dataKey)
        const val = entry.value
        if (val == null) return null
        return (
          <div key={entry.dataKey} className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.fill }} />
            <span className="text-slate-400 text-xs">{country?.label ?? entry.dataKey}</span>
            <span className="ml-auto text-slate-200 text-xs font-semibold tabular-nums pl-4">
              {val > 0 ? '+' : ''}{val}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Custom line chart tooltip ──────────────────────────────────────────────
function IndexTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={TOOLTIP_STYLE.contentStyle}>
      <p style={{ ...TOOLTIP_STYLE.labelStyle }}>{label?.slice(0, 7)}</p>
      {payload.map((entry) => {
        const country = COUNTRIES.find((c) => c.code === entry.dataKey)
        if (entry.value == null) return null
        return (
          <div key={entry.dataKey} className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.stroke }} />
            <span className="text-slate-400 text-xs">{country?.label ?? entry.dataKey}</span>
            <span className="ml-auto text-slate-200 text-xs font-semibold tabular-nums pl-4">
              {Number(entry.value).toFixed(1)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Section card wrapper ───────────────────────────────────────────────────
function SectionCard({ title, subtitle, lastUpdated, online, children }) {
  return (
    <div className="bg-zinc-950 rounded-xl border border-zinc-900">
      <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-zinc-900">
        <div>
          <h2 className="text-white font-semibold text-sm">{title}</h2>
          {subtitle && <p className="text-zinc-600 text-xs mt-0.5">{subtitle}</p>}
        </div>
        <LiveStatus online={online} lastUpdated={lastUpdated} />
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

export function SupplyProductionView() {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState({})
  const [errors, setErrors] = useState({})
  const [lastUpdated, setLastUpdated] = useState(null)

  const load = useCallback(async (code) => {
    setLoading((p) => ({ ...p, [code]: true }))
    setErrors((p) => ({ ...p, [code]: null }))
    try {
      const raw = await fetchIndustrialProduction(code)
      const growth = computeAnnualGrowth(raw)
      setData((p) => ({ ...p, [code]: { raw, growth } }))
      setLastUpdated(new Date())
    } catch (e) {
      setErrors((p) => ({ ...p, [code]: e.message }))
    } finally {
      setLoading((p) => ({ ...p, [code]: false }))
    }
  }, [])

  useEffect(() => {
    COUNTRIES.forEach(({ code }) => load(code))
  }, [load])

  // Merge annual growth rows keyed by year — last 6 years
  const growthByYear = {}
  for (const { code } of COUNTRIES) {
    for (const row of data[code]?.growth ?? []) {
      if (!growthByYear[row.year]) growthByYear[row.year] = { year: row.year }
      growthByYear[row.year][code] = row.growth
    }
  }
  const growthRows = Object.values(growthByYear)
    .sort((a, b) => a.year.localeCompare(b.year))
    .slice(-6)

  // Merge monthly index rows — last 24 months
  const indexByPeriod = {}
  for (const { code } of COUNTRIES) {
    for (const row of data[code]?.raw?.slice(-24) ?? []) {
      if (!indexByPeriod[row.period]) indexByPeriod[row.period] = { period: row.period }
      indexByPeriod[row.period][code] = row.value
    }
  }
  const indexRows = Object.values(indexByPeriod).sort((a, b) => a.period.localeCompare(b.period))

  const anyLoading = COUNTRIES.some(({ code }) => loading[code])
  const allErrored = COUNTRIES.every(({ code }) => errors[code])
  const reloadAll = () => COUNTRIES.forEach(({ code }) => load(code))
  const isOnline = !anyLoading && Object.keys(data).length > 0

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {COUNTRIES.map(({ code, label, color }) => {
          const growth = data[code]?.growth ?? []
          const latest = growth[growth.length - 1]
          return (
            <StatCard
              key={code}
              label={label}
              color={color}
              loading={loading[code] && !data[code]}
              value={latest ? `${latest.growth > 0 ? '+' : ''}${latest.growth}%` : null}
              sub={
                latest
                  ? `YoY growth · ${latest.year}`
                  : errors[code]
                  ? 'Failed to load'
                  : loading[code]
                  ? 'Loading…'
                  : 'No data'
              }
              trend={latest?.growth}
            />
          )
        })}
      </div>

      {/* Annual growth bar chart */}
      <SectionCard
        title="Industrial Production — Annual Growth"
        subtitle="YoY % change from monthly index averages · OECD KEI · G20 economies"
        online={isOnline}
        lastUpdated={lastUpdated}
      >
        {anyLoading && growthRows.length === 0 ? (
          <SkeletonChart />
        ) : allErrored ? (
          <ErrorState message="Could not load production data" onRetry={reloadAll} />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={growthRows} margin={{ top: 8, right: 8, bottom: 0, left: -8 }} barCategoryGap="30%">
              <defs>
                {COUNTRIES.map(({ code, color }) => (
                  <linearGradient key={code} id={`bar-grad-${code}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={1} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fill: '#52525b', fontSize: 11, fontWeight: 500 }}
                axisLine={{ stroke: '#1e293b' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#52525b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}%`}
              />
              <Tooltip content={<GrowthTooltip />} />
              <Legend
                formatter={(v) => {
                  const c = COUNTRIES.find((c) => c.code === v)
                  return <span style={{ color: '#71717a', fontSize: 11 }}>{c?.label ?? v}</span>
                }}
                wrapperStyle={{ paddingTop: 12 }}
              />
              <ReferenceLine y={0} stroke="#334155" strokeWidth={1} />
              {COUNTRIES.map(({ code }) => (
                <Bar key={code} dataKey={code} fill={`url(#bar-grad-${code})`} radius={[3, 3, 0, 0]} maxBarSize={24} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* Monthly index line chart */}
      <SectionCard
        title="Industrial Production Index — Last 24 Months"
        subtitle="Base period = 100 · Monthly observations · OECD KEI"
        online={isOnline}
        lastUpdated={lastUpdated}
      >
        {anyLoading && indexRows.length === 0 ? (
          <SkeletonChart />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={indexRows} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
              <defs>
                {COUNTRIES.map(({ code, color }) => (
                  <linearGradient key={code} id={`line-glow-${code}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                    <stop offset="50%" stopColor={color} stopOpacity={1} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.4} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
              <XAxis
                dataKey="period"
                tick={{ fill: '#52525b', fontSize: 10, fontWeight: 500 }}
                axisLine={{ stroke: '#1e293b' }}
                tickLine={false}
                tickFormatter={(v) => {
                  const [y, m] = v.split('-')
                  return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m - 1]} ${y.slice(2)}`
                }}
                interval={3}
              />
              <YAxis
                tick={{ fill: '#52525b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                domain={['auto', 'auto']}
                tickFormatter={(v) => v.toFixed(0)}
              />
              <Tooltip content={<IndexTooltip />} />
              <Legend
                formatter={(v) => {
                  const c = COUNTRIES.find((c) => c.code === v)
                  return <span style={{ color: '#71717a', fontSize: 11 }}>{c?.label ?? v}</span>
                }}
                wrapperStyle={{ paddingTop: 12 }}
              />
              {COUNTRIES.map(({ code, color }) => (
                <Line
                  key={code}
                  type="monotone"
                  dataKey={code}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: color }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* World Map */}
      <WorldMap />
    </div>
  )
}
