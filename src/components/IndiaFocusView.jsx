import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { fetchIndiaMacro, fetchIndiaRBIForex } from '../utils/api'
import { SkeletonChart, SkeletonCard } from './Skeleton'
import { ErrorState } from './ErrorState'
import { LiveStatus } from './LiveStatus'

const INDIA_ORANGE = '#ff6b35'

const TT = {
  contentStyle: { background: '#0a0a0a', border: '1px solid #27272a', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.8)', padding: '10px 14px' },
  labelStyle: { color: '#d4d4d8', fontWeight: 600, marginBottom: 4, fontSize: 12 },
}

function Card({ children, className = '' }) {
  return <div className={`bg-zinc-950 rounded-xl border border-zinc-900 ${className}`}>{children}</div>
}

function CardHeader({ title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-zinc-900">
      <div>
        <h2 className="text-white font-semibold text-sm">{title}</h2>
        {subtitle && <p className="text-zinc-600 text-xs mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

function MetricCard({ label, value, unit, year, change, color = INDIA_ORANGE, loading, error }) {
  const up = change > 0, flat = change === 0 || change == null
  const trendColor = flat ? 'text-zinc-500' : up ? 'text-green-400' : 'text-red-400'

  if (loading) return <SkeletonCard />

  return (
    <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-900 hover:border-zinc-800 transition-colors"
      style={{ borderTopColor: color, borderTopWidth: 2 }}>
      <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold mb-2">{label}</p>
      <p className="text-2xl font-bold text-white tabular-nums mb-1">
        {error ? <span className="text-zinc-700 text-base">Unavailable</span>
          : value != null ? `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : <span className="text-zinc-700">—</span>}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-zinc-600 text-xs">{unit}{year ? ` · ${year}` : ''}</span>
        {change != null && (
          <div className="flex items-center gap-1">
            {flat ? <Minus size={10} className="text-zinc-600" /> : up ? <TrendingUp size={10} className="text-green-400" /> : <TrendingDown size={10} className="text-red-400" />}
            <span className={`text-xs font-semibold ${trendColor}`}>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  )
}

function MiniLineChart({ series, color, dataKey = 'value', unit = '' }) {
  if (!series?.length) return <div className="h-[160px] flex items-center justify-center text-zinc-700 text-xs">No data</div>
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
        <XAxis dataKey="year" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={{ stroke: '#18181b' }} tickLine={false} interval={2} />
        <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}`} />
        <Tooltip
          contentStyle={TT.contentStyle} labelStyle={TT.labelStyle}
          formatter={(v) => [`${v} ${unit}`, '']}
        />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false}
          activeDot={{ r: 4, strokeWidth: 0, fill: color }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}

function TradeChart({ exports, imports }) {
  if (!exports?.length && !imports?.length) return <div className="h-[200px] flex items-center justify-center text-zinc-700 text-xs">No data</div>
  const years = [...new Set([...exports.map((r) => r.year), ...imports.map((r) => r.year)])].sort()
  const data = years.map((y) => ({
    year: y,
    exports: exports.find((r) => r.year === y)?.value ?? null,
    imports: imports.find((r) => r.year === y)?.value ?? null,
  })).map((r) => ({
    ...r,
    balance: r.exports != null && r.imports != null ? parseFloat((r.exports - r.imports).toFixed(2)) : null,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }} barCategoryGap="25%">
        <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
        <XAxis dataKey="year" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={{ stroke: '#18181b' }} tickLine={false} interval={2} />
        <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}B`} />
        <Tooltip contentStyle={TT.contentStyle} labelStyle={TT.labelStyle}
          formatter={(v, name) => [`$${v} B`, name.charAt(0).toUpperCase() + name.slice(1)]} />
        <Legend formatter={(v) => <span style={{ color: '#71717a', fontSize: 11 }}>{v.charAt(0).toUpperCase() + v.slice(1)}</span>} wrapperStyle={{ paddingTop: 8 }} />
        <ReferenceLine y={0} stroke="#3f3f46" />
        <Bar dataKey="exports" fill="#22c55e" fillOpacity={0.8} radius={[3, 3, 0, 0]} maxBarSize={18} />
        <Bar dataKey="imports" fill="#ef4444" fillOpacity={0.8} radius={[3, 3, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function GDPDeflatorChart({ nomSeries, realSeries }) {
  if (!nomSeries?.length || !realSeries?.length) return <div className="h-[180px] flex items-center justify-center text-zinc-700 text-xs">No data</div>
  const data = nomSeries.map((row) => {
    const real = realSeries.find((r) => r.year === row.year)
    const deflator = real?.value && real.value !== 0 ? parseFloat(((row.value / real.value) * 100).toFixed(2)) : null
    return { year: row.year, deflator }
  }).filter((r) => r.deflator != null)

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id="deflatorGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
        <XAxis dataKey="year" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={{ stroke: '#18181b' }} tickLine={false} interval={2} />
        <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
        <Tooltip contentStyle={TT.contentStyle} labelStyle={TT.labelStyle}
          formatter={(v) => [`${v}`, 'Deflator Index (Nom/Real × 100)']} />
        <Area type="monotone" dataKey="deflator" stroke="#f59e0b" fill="url(#deflatorGrad)" strokeWidth={2}
          dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: '#f59e0b' }} connectNulls />
      </AreaChart>
    </ResponsiveContainer>
  )
}


function RBIForexCard({ rbiData }) {
  if (!rbiData?.rates || !Object.keys(rbiData.rates).length) return null
  return (
    <div className="grid grid-cols-3 gap-3">
      {Object.entries(rbiData.rates).map(([base, info]) => (
        <div key={base} className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 text-center">
          <p className="text-zinc-500 text-xs font-semibold tracking-wider mb-1">{info.label}</p>
          <p className="text-xl font-bold text-white tabular-nums">
            {info.rate != null ? info.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '—'}
          </p>
          {info.date && <p className="text-zinc-600 text-[10px] mt-1">{info.date}</p>}
        </div>
      ))}
    </div>
  )
}

// ── Main view ──────────────────────────────────────────────────────────────

export function IndiaFocusView() {
  const [macro, setMacro] = useState(null)
  const [macroLoading, setMacroLoading] = useState(false)
  const [macroUpdated, setMacroUpdated] = useState(null)
  const [rbiForex, setRbiForex] = useState(null)
  const [rbiLoading, setRbiLoading] = useState(false)
  const [rbiUpdated, setRbiUpdated] = useState(null)

  const loadMacro = useCallback(async () => {
    setMacroLoading(true)
    try {
      const data = await fetchIndiaMacro()
      setMacro(data)
      setMacroUpdated(new Date())
    } catch { /* silent */ }
    finally { setMacroLoading(false) }
  }, [])

  const loadRBI = useCallback(async () => {
    setRbiLoading(true)
    try {
      const data = await fetchIndiaRBIForex()
      setRbiForex(data)
      setRbiUpdated(new Date())
    } catch { /* silent */ }
    finally { setRbiLoading(false) }
  }, [])

  useEffect(() => {
    loadMacro()
    loadRBI()
  }, [loadMacro, loadRBI])

  const m = macro
  const getLatest = (key) => m?.[key]?.latest
  const getYear = (key) => m?.[key]?.latestYear
  const getSeries = (key) => m?.[key]?.series ?? []
  const isError = (key) => m?.[key]?.error

  // YoY % change between the two most-recent data points for any indicator
  const yoy = (key) => {
    const s = getSeries(key)
    if (s.length < 2) return null
    const prev = s.at(-2)?.value, curr = s.at(-1)?.value
    if (prev == null || prev === 0 || curr == null) return null
    return parseFloat((((curr - prev) / prev) * 100).toFixed(1))
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xl" style={{ background: '#ff6b3520', border: '1px solid #ff6b3540' }}>
            🇮🇳
          </div>
          <div>
            <h2 className="text-white font-semibold">India Economic Dashboard</h2>
            <p className="text-zinc-600 text-xs">World Bank · RBI · Last 10 years data</p>
          </div>
        </div>
        <LiveStatus online={!macroLoading && !!macro} lastUpdated={macroUpdated} label="World Bank" />
      </div>

      {/* Key metrics row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="GDP (Nominal)" value={getLatest('gdp_nom')} unit="B USD" year={getYear('gdp_nom')} change={yoy('gdp_nom')} loading={macroLoading && !macro} error={isError('gdp_nom')} />
        <MetricCard label="CPI Inflation" value={getLatest('inflation')} unit="%" year={getYear('inflation')} change={yoy('inflation')} color="#f59e0b" loading={macroLoading && !macro} error={isError('inflation')} />
        <MetricCard label="FDI Net Inflows" value={getLatest('fdi')} unit="B USD" year={getYear('fdi')} change={yoy('fdi')} color="#22c55e" loading={macroLoading && !macro} error={isError('fdi')} />
        <MetricCard label="Forex Reserves" value={getLatest('forex_res')} unit="B USD" year={getYear('forex_res')} change={yoy('forex_res')} color="#38bdf8" loading={macroLoading && !macro} error={isError('forex_res')} />
      </div>

      {/* Key metrics row 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Exports (G&S)" value={getLatest('exports')} unit="B USD" year={getYear('exports')} change={yoy('exports')} color="#4ade80" loading={macroLoading && !macro} error={isError('exports')} />
        <MetricCard label="Imports (G&S)" value={getLatest('imports')} unit="B USD" year={getYear('imports')} change={yoy('imports')} color="#ef4444" loading={macroLoading && !macro} error={isError('imports')} />
        <MetricCard label="Interest Rate" value={getLatest('int_rate')} unit="% p.a." year={getYear('int_rate')} change={yoy('int_rate')} color="#c084fc" loading={macroLoading && !macro} error={isError('int_rate')} />
        <MetricCard label="External Debt" value={getLatest('ext_debt')} unit="B USD" year={getYear('ext_debt')} change={yoy('ext_debt')} color="#fb923c" loading={macroLoading && !macro} error={isError('ext_debt')} />
      </div>

      {/* Portfolio equity + gross savings */}
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
        <MetricCard label="Portfolio Equity (FII)" value={getLatest('fii')} unit="B USD" year={getYear('fii')} change={yoy('fii')} color="#818cf8" loading={macroLoading && !macro} error={isError('fii')} />
        <MetricCard label="Gross Savings" value={getLatest('gross_sav')} unit="% GNI" year={getYear('gross_sav')} change={yoy('gross_sav')} color="#fbbf24" loading={macroLoading && !macro} error={isError('gross_sav')} />
      </div>

      {/* GDP trend + deflator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="GDP — Nominal vs Real" subtitle="USD Billions · 10-year view" right={<LiveStatus online={!macroLoading && !!macro} lastUpdated={macroUpdated} />} />
          <div className="px-5 py-5">
            {macroLoading && !macro ? <SkeletonChart /> : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={(() => {
                  const nom = getSeries('gdp_nom'), real = getSeries('gdp_real')
                  const years = [...new Set([...nom.map(r => r.year), ...real.map(r => r.year)])].sort()
                  return years.map(y => ({
                    year: y,
                    nominal: nom.find(r => r.year === y)?.value ?? null,
                    real: real.find(r => r.year === y)?.value ?? null,
                  }))
                })()} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                  <XAxis dataKey="year" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={{ stroke: '#18181b' }} tickLine={false} interval={2} />
                  <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}B`} />
                  <Tooltip contentStyle={TT.contentStyle} labelStyle={TT.labelStyle}
                    formatter={(v, name) => [`$${v} B`, name.charAt(0).toUpperCase() + name.slice(1)]} />
                  <Legend formatter={(v) => <span style={{ color: '#71717a', fontSize: 11 }}>{v.charAt(0).toUpperCase() + v.slice(1)}</span>} wrapperStyle={{ paddingTop: 8 }} />
                  <Line type="monotone" dataKey="nominal" stroke={INDIA_ORANGE} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: INDIA_ORANGE }} connectNulls />
                  <Line type="monotone" dataKey="real" stroke="#60a5fa" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: '#60a5fa' }} connectNulls strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="GDP Deflator" subtitle="(Nominal GDP / Real GDP) × 100 · Base = constant USD prices" />
          <div className="px-5 py-5">
            {macroLoading && !macro ? <SkeletonChart /> : (
              <GDPDeflatorChart nomSeries={getSeries('gdp_nom')} realSeries={getSeries('gdp_real')} />
            )}
          </div>
        </Card>
      </div>

      {/* Trade balance + FDI trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Exports vs Imports" subtitle="Goods & Services · USD Billions" />
          <div className="px-5 py-5">
            {macroLoading && !macro ? <SkeletonChart /> : (
              <TradeChart exports={getSeries('exports')} imports={getSeries('imports')} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="FDI Net Inflows" subtitle="Foreign Direct Investment · USD Billions" />
          <div className="px-5 py-5">
            {macroLoading && !macro ? <SkeletonChart /> : (
              <MiniLineChart series={getSeries('fdi')} color="#22c55e" unit="B USD" />
            )}
          </div>
        </Card>
      </div>

      {/* Inflation + interest rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="CPI Inflation" subtitle="Annual % change" />
          <div className="px-5 py-5">
            {macroLoading && !macro ? <SkeletonChart /> : (
              <MiniLineChart series={getSeries('inflation')} color="#f59e0b" unit="%" />
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Lending Interest Rate" subtitle="Commercial banks lending rate % p.a." />
          <div className="px-5 py-5">
            {macroLoading && !macro ? <SkeletonChart /> : (
              <MiniLineChart series={getSeries('int_rate')} color="#c084fc" unit="%" />
            )}
          </div>
        </Card>
      </div>

      {/* RBI Forex rates */}
      <Card>
        <CardHeader
          title="INR Exchange Rates"
          subtitle="USD/INR · EUR/INR · GBP/INR · Source: Yahoo Finance"
          right={<LiveStatus online={!!rbiForex} lastUpdated={rbiUpdated} label="Yahoo Finance" />}
        />
        <div className="px-5 py-5">
          {rbiLoading && !rbiForex ? (
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : rbiForex ? (
            <RBIForexCard rbiData={rbiForex} />
          ) : (
            <ErrorState message="RBI forex data unavailable" onRetry={loadRBI} />
          )}
        </div>
      </Card>

      {/* Forex reserves trend */}
      <Card>
        <CardHeader title="Forex Reserves" subtitle="Total reserve assets · USD Billions · World Bank + IMF (quarterly)" />
        <div className="px-5 py-5">
          {macroLoading && !macro ? <SkeletonChart /> : (
            <MiniLineChart series={getSeries('forex_res')} color="#38bdf8" unit="B USD" />
          )}
        </div>
      </Card>

    </div>
  )
}
