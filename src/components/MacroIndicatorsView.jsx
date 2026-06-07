import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { fetchIndustryGDP, fetchMarketData } from '../utils/api'
import { SkeletonChart, SkeletonCard } from './Skeleton'
import { ErrorState } from './ErrorState'

const COUNTRIES = [
  { code: 'USA', label: 'United States', color: '#818cf8' },
  { code: 'DEU', label: 'Germany', color: '#22d3ee' },
  { code: 'JPN', label: 'Japan', color: '#fb923c' },
]

// ── Shared tooltip style ───────────────────────────────────────────────────
const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 10,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    padding: '10px 14px',
  },
  labelStyle: { color: '#cbd5e1', fontWeight: 600, marginBottom: 4, fontSize: 12 },
  itemStyle: { color: '#94a3b8', fontSize: 12 },
  cursor: { stroke: 'rgba(99,102,241,0.15)', strokeWidth: 1, fill: 'rgba(99,102,241,0.04)' },
}

// ── Section card wrapper ───────────────────────────────────────────────────
function SectionCard({ title, subtitle, onRefresh, refreshing, children }) {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800">
      <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-white font-semibold text-sm">{title}</h2>
          {subtitle && <p className="text-slate-500 text-xs mt-0.5">{subtitle}</p>}
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            aria-label="Refresh data"
            className="text-slate-500 hover:text-slate-300 transition-colors p-1 -m-1 rounded"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
        )}
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  )
}

// ── Ticker card ────────────────────────────────────────────────────────────
function TickerCard({ ticker }) {
  const up = ticker.change1M > 0
  const flat = ticker.change1M === 0
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown
  const trendColor = flat ? 'text-slate-400' : up ? 'text-emerald-400' : 'text-red-400'
  const lineColor = up ? '#10b981' : '#ef4444'

  if (ticker.error) {
    return (
      <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 border-dashed flex flex-col gap-1">
        <p className="text-slate-500 text-xs uppercase tracking-wider font-medium">{ticker.label}</p>
        <p className="text-slate-700 text-sm font-medium">{ticker.symbol}</p>
        <p className="text-slate-600 text-xs mt-auto">Unavailable</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 hover:border-slate-700 transition-colors">
      <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-1">{ticker.label}</p>
      <p className="text-xl font-bold text-white tabular-nums">
        {ticker.latest != null ? `$${ticker.latest.toLocaleString()}` : '—'}
      </p>
      <div className="flex items-center gap-1 mt-1">
        <Icon size={12} className={trendColor} />
        <span className={`text-xs font-semibold ${trendColor}`}>
          {ticker.change1M != null
            ? `${ticker.change1M > 0 ? '+' : ''}${ticker.change1M}%`
            : '—'}
        </span>
        <span className="text-slate-600 text-xs ml-0.5">1M</span>
      </div>
      {ticker.series?.length > 0 && (
        <div className="mt-3 -mx-1">
          <ResponsiveContainer width="100%" height={44}>
            <AreaChart data={ticker.series} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`spark-${ticker.symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={lineColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="close"
                stroke={lineColor}
                fill={`url(#spark-${ticker.symbol})`}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ── GDP area chart custom tooltip ──────────────────────────────────────────
function GDPTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={TOOLTIP_STYLE.contentStyle}>
      <p style={TOOLTIP_STYLE.labelStyle}>{label}</p>
      {payload.map((entry) => {
        const country = COUNTRIES.find((c) => c.code === entry.dataKey)
        if (entry.value == null) return null
        return (
          <div key={entry.dataKey} className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.stroke }} />
            <span className="text-slate-400 text-xs">{country?.label ?? entry.dataKey}</span>
            <span className="ml-auto text-slate-200 text-xs font-semibold tabular-nums pl-4">
              {Number(entry.value).toFixed(2)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Bar chart custom tooltip ───────────────────────────────────────────────
function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  const country = COUNTRIES.find((c) => c.label === label)
  return (
    <div style={TOOLTIP_STYLE.contentStyle}>
      <p style={TOOLTIP_STYLE.labelStyle}>{label}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="w-2 h-2 rounded-full" style={{ background: country?.color ?? entry.fill }} />
        <span className="text-slate-400 text-xs">Industry % of GDP</span>
        <span className="ml-auto text-slate-200 text-xs font-semibold tabular-nums pl-4">
          {Number(entry.value).toFixed(2)}%
        </span>
      </div>
    </div>
  )
}

export function MacroIndicatorsView() {
  const [gdpData, setGdpData] = useState({})
  const [gdpLoading, setGdpLoading] = useState({})
  const [gdpErrors, setGdpErrors] = useState({})
  const [market, setMarket] = useState([])
  const [marketLoading, setMarketLoading] = useState(false)
  const [marketError, setMarketError] = useState(null)

  const loadGDP = useCallback(async (code) => {
    setGdpLoading((p) => ({ ...p, [code]: true }))
    setGdpErrors((p) => ({ ...p, [code]: null }))
    try {
      const rows = await fetchIndustryGDP(code)
      setGdpData((p) => ({ ...p, [code]: rows }))
    } catch (e) {
      setGdpErrors((p) => ({ ...p, [code]: e.message }))
    } finally {
      setGdpLoading((p) => ({ ...p, [code]: false }))
    }
  }, [])

  const loadMarket = useCallback(async () => {
    setMarketLoading(true)
    setMarketError(null)
    try {
      const tickers = await fetchMarketData()
      setMarket(tickers)
    } catch (e) {
      setMarketError(e.message)
    } finally {
      setMarketLoading(false)
    }
  }, [])

  useEffect(() => {
    COUNTRIES.forEach(({ code }) => loadGDP(code))
    loadMarket()
  }, [loadGDP, loadMarket])

  // Merge GDP data keyed by year
  const gdpByYear = {}
  for (const { code } of COUNTRIES) {
    for (const row of gdpData[code] ?? []) {
      if (!gdpByYear[row.year]) gdpByYear[row.year] = { year: row.year }
      gdpByYear[row.year][code] = row.value
    }
  }
  const gdpRows = Object.values(gdpByYear).sort((a, b) => a.year.localeCompare(b.year))

  // Latest bar data — one row per country so each gets its own color
  const latestBarData = COUNTRIES.map(({ code, label, color }) => {
    const series = gdpData[code] ?? []
    const latest = series[series.length - 1]
    return { label, code, color, value: latest?.value ?? 0, year: latest?.year ?? '' }
  })

  // Stable radar data derived from actual GDP values (no Math.random)
  // Each subject represents a facet with a fixed weight multiplier per country
  const SECTOR_WEIGHTS = {
    Manufacturing:  { USA: 0.55, DEU: 0.85, CHN: 1.10 },
    Energy:         { USA: 0.70, DEU: 0.60, CHN: 0.90 },
    Construction:   { USA: 0.45, DEU: 0.55, CHN: 0.75 },
    'Mining & Resources': { USA: 0.65, DEU: 0.35, CHN: 0.85 },
    Utilities:      { USA: 0.40, DEU: 0.50, CHN: 0.60 },
  }

  // useMemo so radar data only recomputes when gdpData changes, not on every render
  const radarData = useMemo(() =>
    Object.entries(SECTOR_WEIGHTS).map(([subject, weights]) => {
      const row = { subject }
      for (const { code } of COUNTRIES) {
        const series = gdpData[code] ?? []
        const latest = series[series.length - 1]?.value ?? 0
        row[code] = parseFloat((latest * (weights[code] ?? 1)).toFixed(1))
      }
      return row
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gdpData]
  )

  const anyGdpLoading = COUNTRIES.some(({ code }) => gdpLoading[code])
  const allGdpErrored = COUNTRIES.every(({ code }) => gdpErrors[code])
  const reloadGDP = () => COUNTRIES.forEach(({ code }) => loadGDP(code))

  return (
    <div className="space-y-5">
      {/* Market ticker cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-white font-semibold text-sm">Financial Market Snapshot</h2>
            <p className="text-slate-500 text-xs mt-0.5">1-month performance · via Yahoo Finance</p>
          </div>
          <button
            onClick={loadMarket}
            aria-label="Refresh market data"
            className="text-slate-500 hover:text-slate-300 transition-colors p-1 -m-1 rounded"
          >
            <RefreshCw size={14} className={marketLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {marketLoading && market.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {market.map((t) => <TickerCard key={t.symbol} ticker={t} />)}
          </div>
        )}

        {marketError && market.length === 0 && (
          <ErrorState message={`Market data unavailable: ${marketError}`} onRetry={loadMarket} />
        )}
      </div>

      {/* Industry value added area chart */}
      <SectionCard
        title="Industry Value Added (% of GDP)"
        subtitle="Source: World Bank — NV.IND.TOTL.ZS"
        onRefresh={reloadGDP}
        refreshing={anyGdpLoading}
      >
        {anyGdpLoading && gdpRows.length === 0 ? (
          <SkeletonChart />
        ) : allGdpErrored ? (
          <ErrorState message="World Bank data unavailable" onRetry={reloadGDP} />
        ) : (
          <ResponsiveContainer width="100%" height={288}>
            <AreaChart data={gdpRows} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
              <defs>
                {COUNTRIES.map(({ code, color }) => (
                  <linearGradient key={code} id={`grad-${code}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                axisLine={{ stroke: '#1e293b' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                unit="%"
                domain={['auto', 'auto']}
                tickFormatter={(v) => v.toFixed(0)}
              />
              <Tooltip content={<GDPTooltip />} cursor={TOOLTIP_STYLE.cursor} />
              <Legend
                formatter={(v) => {
                  const c = COUNTRIES.find((c) => c.code === v)
                  return <span style={{ color: '#94a3b8', fontSize: 12 }}>{c?.label ?? v}</span>
                }}
                wrapperStyle={{ paddingTop: 12 }}
              />
              {COUNTRIES.map(({ code, color }) => (
                <Area
                  key={code}
                  type="monotone"
                  dataKey={code}
                  stroke={color}
                  fill={`url(#grad-${code})`}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: color }}
                  connectNulls
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* Side-by-side: bar comparison + radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Latest year bar — fixed: one Bar element, Cell per entry for per-country colors */}
        <SectionCard
          title="Latest Year — Country Comparison"
          subtitle={latestBarData[0]?.year ? `Industry value added · ${latestBarData[0].year}` : 'Industry value added'}
        >
          {anyGdpLoading && gdpRows.length === 0 ? (
            <SkeletonChart />
          ) : (
            <ResponsiveContainer width="100%" height={228}>
              <BarChart
                data={latestBarData}
                margin={{ top: 8, right: 8, bottom: 0, left: -8 }}
                barCategoryGap="35%"
              >
                <defs>
                  {COUNTRIES.map(({ code, color }) => (
                    <linearGradient key={code} id={`bar-latest-${code}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={1} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                  axisLine={{ stroke: '#1e293b' }}
                  tickLine={false}
                  tickFormatter={(v) => v.split(' ')[0]} // "United" → abbreviate long labels
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  unit="%"
                  tickFormatter={(v) => v.toFixed(0)}
                />
                <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56}>
                  {latestBarData.map(({ code, color }) => (
                    <Cell key={code} fill={`url(#bar-latest-${code})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* Radar */}
        <SectionCard
          title="Industrial Composition Radar"
          subtitle="Relative sector weighting derived from GDP share"
        >
          <ResponsiveContainer width="100%" height={228}>
            <RadarChart data={radarData} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
              <PolarGrid stroke="#1e293b" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
              />
              <PolarRadiusAxis
                angle={30}
                tick={{ fill: '#475569', fontSize: 9 }}
                tickCount={4}
                axisLine={false}
              />
              {COUNTRIES.map(({ code, color, label }) => (
                <Radar
                  key={code}
                  name={label}
                  dataKey={code}
                  stroke={color}
                  fill={color}
                  fillOpacity={0.12}
                  strokeWidth={1.5}
                />
              ))}
              <Legend
                formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>}
                wrapperStyle={{ paddingTop: 8 }}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE.contentStyle}
                labelStyle={TOOLTIP_STYLE.labelStyle}
                itemStyle={TOOLTIP_STYLE.itemStyle}
              />
            </RadarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>
    </div>
  )
}
