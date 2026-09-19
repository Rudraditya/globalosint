import { useState, useEffect, useCallback, useRef } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react'
import { ALL_COUNTRIES, fetchGDPForCountry, fetchForexRates, fetchMarketData, getEURUSD } from '../utils/api'
import { SkeletonChart, SkeletonCard } from './Skeleton'
import { ErrorState } from './ErrorState'
import { LiveStatus } from './LiveStatus'
import { Card, CardHeader } from './Card'
import { AnimatedNumber } from './AnimatedNumber'

const DEFAULT_SELECTION = ['IND', 'USA', 'CHN', 'DEU', 'GBR', 'JPN']

const TT = {
  contentStyle: { background: '#0a0e16', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.8)', padding: '10px 14px' },
  labelStyle: { color: '#d4d4d8', fontWeight: 600, marginBottom: 4, fontSize: 12 },
  itemStyle: { color: '#71717a', fontSize: 12 },
  cursor: { stroke: 'rgba(90,140,255,0.2)', strokeWidth: 1, fill: 'rgba(90,140,255,0.05)' },
}

// ── Country selector ───────────────────────────────────────────────────────

function CountrySelector({ selected, onChange }) {
  const [open, setOpen] = useState(false)

  const toggle = (code) => {
    if (selected.includes(code)) {
      if (selected.length > 1) onChange(selected.filter((c) => c !== code))
    } else {
      onChange([...selected, code])
    }
  }

  const regions = [...new Set(ALL_COUNTRIES.map((c) => c.region))]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-slate-300 hover:border-brand-500/40 transition-colors"
      >
        <span>{selected.length} countries</span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-30 w-72 glass-card rounded-xl shadow-2xl shadow-black/80 p-3 max-h-80 overflow-y-auto">
          {regions.map((region) => (
            <div key={region} className="mb-3">
              <p className="text-slate-600 text-[10px] uppercase tracking-widest font-semibold mb-1.5 px-1">{region}</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_COUNTRIES.filter((c) => c.region === region).map((c) => {
                  const active = selected.includes(c.code)
                  return (
                    <button
                      key={c.code}
                      onClick={() => toggle(c.code)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                        active ? 'text-white' : 'bg-white/[0.03] text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]'
                      }`}
                      style={active ? { background: `${c.color}22`, border: `1px solid ${c.color}60`, color: c.color } : {}}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
                      {c.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── GDP tooltip ────────────────────────────────────────────────────────────

function GDPTooltip({ active, payload, label, selectedDefs }) {
  if (!active || !payload?.length) return null
  return (
    <div style={TT.contentStyle}>
      <p style={TT.labelStyle}>{label}</p>
      {payload.map((entry) => {
        const c = selectedDefs.find((x) => x.code === entry.dataKey)
        if (entry.value == null) return null
        return (
          <div key={entry.dataKey} className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.stroke }} />
            <span className="text-slate-400 text-xs">{c?.label ?? entry.dataKey}</span>
            <span className="ml-auto text-white text-xs font-bold tabular-nums pl-4">
              ${Number(entry.value).toLocaleString()} B
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── FOREX card ─────────────────────────────────────────────────────────────

function ForexCard({ fx }) {
  const up = fx.change > 0, flat = fx.change === 0 || fx.change == null
  return (
    <div className="glass-card glass-hover rounded-xl p-4">
      <p className="text-slate-500 text-xs font-semibold tracking-wider mb-1">{fx.label}</p>
      <p className="text-xl font-bold text-white tabular-nums">
        {fx.rate != null ? <AnimatedNumber value={fx.rate} format={(v) => v.toLocaleString(undefined, { maximumFractionDigits: 4 })} /> : '—'}
      </p>
      {fx.change != null && (
        <div className="flex items-center gap-1 mt-1">
          {flat ? <Minus size={11} className="text-slate-500" /> : up ? <TrendingUp size={11} className="text-green-400" /> : <TrendingDown size={11} className="text-red-400" />}
          <span className={`text-xs font-semibold ${flat ? 'text-slate-500' : up ? 'text-green-400' : 'text-red-400'}`}>
            {fx.change > 0 ? '+' : ''}{fx.change}%
          </span>
          <span className="text-slate-700 text-xs ml-0.5">1d</span>
        </div>
      )}
      {fx.error && <p className="text-slate-700 text-xs mt-1">Unavailable</p>}
    </div>
  )
}

// ── Ticker card ────────────────────────────────────────────────────────────

function TickerCard({ ticker }) {
  const up = ticker.change1M > 0, flat = ticker.change1M === 0
  const trendColor = flat ? 'text-slate-400' : up ? 'text-green-400' : 'text-red-400'
  const lineColor = up ? '#22c55e' : '#ef4444'
  if (ticker.error) {
    return (
      <div className="glass-card rounded-xl p-4 border-dashed">
        <p className="text-slate-600 text-xs uppercase tracking-wider font-medium">{ticker.label}</p>
        <p className="text-slate-700 text-xs mt-1">Unavailable</p>
      </div>
    )
  }
  return (
    <div className="glass-card glass-hover rounded-xl p-4">
      <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-1">{ticker.label}</p>
      <p className="text-xl font-bold text-white tabular-nums">
        {ticker.latest != null ? <AnimatedNumber value={ticker.latest} format={(v) => `$${v.toLocaleString()}`} /> : '—'}
      </p>
      <div className="flex items-center gap-1 mt-1">
        {flat ? <Minus size={11} className="text-slate-500" /> : up ? <TrendingUp size={11} className="text-green-400" /> : <TrendingDown size={11} className="text-red-400" />}
        <span className={`text-xs font-semibold ${trendColor}`}>
          {ticker.change1M != null ? `${ticker.change1M > 0 ? '+' : ''}${ticker.change1M}%` : '—'}
        </span>
        <span className="text-slate-700 text-xs ml-0.5">1M</span>
      </div>
      {ticker.series?.length > 0 && (
        <div className="mt-3 -mx-1">
          <ResponsiveContainer width="100%" height={40}>
            <AreaChart data={ticker.series} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`spark-${ticker.symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={lineColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="close" stroke={lineColor} fill={`url(#spark-${ticker.symbol})`} strokeWidth={1.5} dot={false} animationDuration={900} animationEasing="ease-out" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ── Main view ──────────────────────────────────────────────────────────────

export function MacroIndicatorsView() {
  const [selected, setSelected] = useState(DEFAULT_SELECTION)
  const [gdpData, setGdpData] = useState({})
  const [gdpSources, setGdpSources] = useState({})
  const [gdpLoading, setGdpLoading] = useState({})
  const [forexRates, setForexRates] = useState([])
  const [forexLoading, setForexLoading] = useState(false)
  const [forexUpdated, setForexUpdated] = useState(null)
  const [market, setMarket] = useState([])
  const [marketLoading, setMarketLoading] = useState(false)
  const [marketUpdated, setMarketUpdated] = useState(null)
  const eurToUsdRef = useRef(1.08)

  const loadGDP = useCallback(async (code) => {
    const def = ALL_COUNTRIES.find((c) => c.code === code)
    if (!def) return
    setGdpLoading((p) => ({ ...p, [code]: true }))
    try {
      const result = await fetchGDPForCountry(def, eurToUsdRef.current)
      setGdpData((p) => ({ ...p, [code]: result.data }))
      setGdpSources((p) => ({ ...p, [code]: result.source }))
    } catch {
      setGdpData((p) => ({ ...p, [code]: [] }))
    } finally {
      setGdpLoading((p) => ({ ...p, [code]: false }))
    }
  }, [])

  const loadForex = useCallback(async () => {
    setForexLoading(true)
    try {
      const rates = await fetchForexRates()
      setForexRates(rates)
      setForexUpdated(new Date())
      const eur = rates.find((r) => r.pair === 'EURUSD=X')?.rate
      if (eur) eurToUsdRef.current = eur
    } catch { /* silent */ }
    finally { setForexLoading(false) }
  }, [])

  const loadMarket = useCallback(async () => {
    setMarketLoading(true)
    try {
      const tickers = await fetchMarketData()
      setMarket(tickers)
      setMarketUpdated(new Date())
    } catch { /* silent */ }
    finally { setMarketLoading(false) }
  }, [])

  // Track which codes have been fetched (or are in-flight) so we never double-load.
  const fetchedRef = useRef(new Set())

  const loadGDPOnce = useCallback((code) => {
    if (fetchedRef.current.has(code)) return
    fetchedRef.current.add(code)
    loadGDP(code)
  }, [loadGDP])

  // Initial load: fetch forex first so eurToUsdRef is populated before any GDP call.
  useEffect(() => {
    loadForex().then(() => {
      // After forex resolves, load GDP for every currently-selected country.
      selected.forEach(loadGDPOnce)
    })
    loadMarket()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // When the selection changes (user adds/removes countries), load any
  // newly-added countries.  A country is "new" when its data hasn't been
  // fetched yet — we rely on fetchedRef rather than testing gdpData so we
  // correctly handle the case where data is an empty array (falsy guard on
  // `!gdpData[code]` would miss a previously-failed/empty fetch).
  useEffect(() => {
    selected.forEach((code) => {
      if (!fetchedRef.current.has(code)) {
        fetchedRef.current.add(code)
        loadGDP(code)
      }
    })
  }, [selected, loadGDP])

  const selectedDefs = selected.map((code) => ALL_COUNTRIES.find((c) => c.code === code)).filter(Boolean)

  // Merge GDP by year
  const gdpByYear = {}
  for (const code of selected) {
    for (const row of gdpData[code] ?? []) {
      if (!gdpByYear[row.year]) gdpByYear[row.year] = { year: row.year }
      gdpByYear[row.year][code] = row.value
    }
  }
  const gdpRows = Object.values(gdpByYear).sort((a, b) => a.year.localeCompare(b.year))

  const latestBarData = selectedDefs.map((c) => {
    const series = gdpData[c.code] ?? []
    const latest = series.at(-1)
    return { label: c.label, code: c.code, color: c.color, value: latest?.value ?? 0, year: latest?.year ?? '' }
  })

  const anyGdpLoading = selected.some((c) => gdpLoading[c])
  const sourceList = [...new Set(Object.values(gdpSources))].join(', ')

  return (
    <div className="space-y-4">
      {/* Country selector bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-white font-semibold text-sm">GDP Comparison</h2>
          <p className="text-slate-600 text-xs mt-0.5">
            All values in USD billions · {sourceList || 'Eurostat / World Bank'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LiveStatus online={!anyGdpLoading && gdpRows.length > 0} lastUpdated={gdpRows.length > 0 ? new Date() : null} />
          <CountrySelector selected={selected} onChange={setSelected} />
        </div>
      </div>

      {/* Country color legend */}
      <div className="flex flex-wrap gap-2">
        {selectedDefs.map((c) => (
          <span key={c.code} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: `${c.color}18`, border: `1px solid ${c.color}40`, color: c.color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
            {c.label}
            {gdpSources[c.code] && <span className="opacity-50 text-[10px]">{gdpSources[c.code] === 'Eurostat' ? ' · EU' : ''}</span>}
          </span>
        ))}
      </div>

      {/* GDP time series area chart */}
      <Card hoverable>
        <CardHeader title="GDP Trend (USD Billions)" subtitle="10-year time series · Eurostat for EU members · World Bank for others" />
        <div className="px-5 py-4">
          {anyGdpLoading && gdpRows.length === 0 ? (
            <SkeletonChart />
          ) : gdpRows.length === 0 ? (
            <ErrorState message="No GDP data loaded" onRetry={() => selected.forEach(loadGDP)} />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={gdpRows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  {selectedDefs.map(({ code, color }) => (
                    <linearGradient key={code} id={`mgdp-${code}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                <XAxis dataKey="year" tick={{ fill: '#52525b', fontSize: 11 }} axisLine={{ stroke: '#18181b' }} tickLine={false} />
                <YAxis tick={{ fill: '#52525b', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}T` : `$${v}B`} />
                <Tooltip content={(props) => <GDPTooltip {...props} selectedDefs={selectedDefs} />} cursor={TT.cursor} />
                <Legend formatter={(v) => { const c = selectedDefs.find((x) => x.code === v); return <span style={{ color: c?.color ?? '#71717a', fontSize: 11 }}>{c?.label ?? v}</span> }} wrapperStyle={{ paddingTop: 12 }} />
                {selectedDefs.map(({ code, color }) => (
                  <Area key={code} type="monotone" dataKey={code} stroke={color} fill={`url(#mgdp-${code})`}
                    strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: color }} connectNulls />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Latest GDP bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card hoverable>
          <CardHeader title="Latest GDP — Country Comparison" subtitle={latestBarData[0]?.year ? `USD billions · ${latestBarData[0].year}` : 'USD billions'} />
          <div className="px-5 py-4">
            {anyGdpLoading && gdpRows.length === 0 ? (
              <SkeletonChart />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={latestBarData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="30%">
                  <defs>
                    {selectedDefs.map(({ code, color }) => (
                      <linearGradient key={code} id={`mbar-${code}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={1} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.5} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={{ stroke: '#18181b' }} tickLine={false}
                    tickFormatter={(v) => v.length > 8 ? v.split(' ')[0] : v} />
                  <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}T` : `$${v}B`} />
                  <Tooltip
                    contentStyle={TT.contentStyle} labelStyle={TT.labelStyle}
                    formatter={(v, name, props) => [`$${Number(v).toLocaleString()} B`, props.payload?.label ?? name]}
                    cursor={{ fill: 'rgba(90,140,255,0.08)' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={52}>
                    {latestBarData.map(({ code, color }) => (
                      <Cell key={code} fill={`url(#mbar-${code})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* FOREX panel */}
        <Card hoverable>
          <CardHeader
            title="Currency Exchange Rates"
            subtitle="vs USD · Yahoo Finance · 24h refresh"
            right={<LiveStatus online={forexRates.length > 0} lastUpdated={forexUpdated} />}
          />
          <div className="px-5 py-4">
            {forexLoading && forexRates.length === 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto">
                {forexRates.map((fx) => <ForexCard key={fx.pair} fx={fx} />)}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Financial market snapshot */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-baseline gap-3">
            <h2 className="text-white font-semibold text-sm">Financial Market Snapshot</h2>
            <p className="text-slate-600 text-xs">1-month performance · Yahoo Finance</p>
          </div>
          <LiveStatus online={market.length > 0} lastUpdated={marketUpdated} />
        </div>

        {marketLoading && market.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {market.map((t) => <TickerCard key={t.symbol} ticker={t} />)}
          </div>
        )}
      </div>
    </div>
  )
}
