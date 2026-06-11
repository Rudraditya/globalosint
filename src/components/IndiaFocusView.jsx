import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, X, ChevronRight } from 'lucide-react'
import { fetchIndiaMacro, fetchIndiaRBIForex } from '../utils/api'
import { SkeletonChart, SkeletonCard } from './Skeleton'
import { ErrorState } from './ErrorState'
import { LiveStatus } from './LiveStatus'

const INDIA_ORANGE = '#ff6b35'

const TT = {
  contentStyle: { background: '#0a0a0a', border: '1px solid #27272a', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.8)', padding: '10px 14px' },
  labelStyle: { color: '#d4d4d8', fontWeight: 600, marginBottom: 4, fontSize: 12 },
}

// ── Modal ──────────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, subtitle, children }) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl shadow-black">
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-zinc-900 flex-shrink-0">
          <div>
            <h2 className="text-white font-semibold text-sm">{title}</h2>
            {subtitle && <p className="text-zinc-500 text-xs mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-white transition-colors ml-4 mt-0.5"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-5">
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Card ───────────────────────────────────────────────────────────────────

function Card({ children, className = '' }) {
  return <div className={`bg-zinc-950 rounded-xl border border-zinc-900 ${className}`}>{children}</div>
}

function CardHeader({ title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-zinc-900">
      <div>
        <h2 className="text-white font-semibold text-sm">{title}</h2>
        {subtitle && <p className="text-zinc-600 text-xs mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

// ── Metric card — clickable when onClick provided ──────────────────────────

function MetricCard({ label, value, unit, year, change, color = INDIA_ORANGE, loading, error, onClick }) {
  const up = change > 0, flat = change === 0 || change == null
  const trendColor = flat ? 'text-zinc-500' : up ? 'text-green-400' : 'text-red-400'

  if (loading) return <SkeletonCard />

  return (
    <div
      className={`bg-zinc-950 rounded-xl p-3.5 border border-zinc-900 transition-colors ${onClick ? 'cursor-pointer hover:border-zinc-700 hover:bg-zinc-900/60 group' : 'hover:border-zinc-800'}`}
      style={{ borderTopColor: color, borderTopWidth: 2 }}
      onClick={onClick}
    >
      <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold mb-1.5 flex items-center justify-between">
        <span>{label}</span>
        {onClick && <ChevronRight size={11} className="text-zinc-700 group-hover:text-zinc-500 transition-colors" />}
      </p>
      <p className="text-xl font-bold text-white tabular-nums mb-0.5">
        {error ? <span className="text-zinc-700 text-sm">Unavailable</span>
          : value != null ? `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : <span className="text-zinc-700">—</span>}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-zinc-600 text-[10px]">{unit}{year ? ` · ${year}` : ''}</span>
        {change != null && (
          <div className="flex items-center gap-1">
            {flat ? <Minus size={9} className="text-zinc-600" /> : up ? <TrendingUp size={9} className="text-green-400" /> : <TrendingDown size={9} className="text-red-400" />}
            <span className={`text-[10px] font-semibold ${trendColor}`}>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Charts ─────────────────────────────────────────────────────────────────

function MiniLineChart({ series, color, dataKey = 'value', unit = '', height = 160 }) {
  if (!series?.length) return <div className="flex items-center justify-center text-zinc-700 text-xs" style={{ height }}>No data</div>
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
        <XAxis dataKey="year" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={{ stroke: '#18181b' }} tickLine={false} interval={2} />
        <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
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

function TradeChart({ exports, imports, height = 200 }) {
  if (!exports?.length && !imports?.length) return <div className="flex items-center justify-center text-zinc-700 text-xs" style={{ height }}>No data</div>
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
    <ResponsiveContainer width="100%" height={height}>
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

function GDPDeflatorChart({ nomSeries, realSeries, height = 180 }) {
  if (!nomSeries?.length || !realSeries?.length) return <div className="flex items-center justify-center text-zinc-700 text-xs" style={{ height }}>No data</div>
  const data = nomSeries.map((row) => {
    const real = realSeries.find((r) => r.year === row.year)
    const deflator = real?.value && real.value !== 0 ? parseFloat(((row.value / real.value) * 100).toFixed(2)) : null
    return { year: row.year, deflator }
  }).filter((r) => r.deflator != null)

  return (
    <ResponsiveContainer width="100%" height={height}>
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
          formatter={(v) => [`${v}`, 'Deflator Index']} />
        <Area type="monotone" dataKey="deflator" stroke="#f59e0b" fill="url(#deflatorGrad)" strokeWidth={2}
          dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: '#f59e0b' }} connectNulls />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function GDPNomVsRealChart({ nomSeries, realSeries, height = 200 }) {
  if (!nomSeries?.length || !realSeries?.length) return <div className="flex items-center justify-center text-zinc-700 text-xs" style={{ height }}>No data</div>
  const years = [...new Set([...nomSeries.map(r => r.year), ...realSeries.map(r => r.year)])].sort()
  const data = years.map(y => ({
    year: y,
    nominal: nomSeries.find(r => r.year === y)?.value ?? null,
    real: realSeries.find(r => r.year === y)?.value ?? null,
  }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
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
  )
}

function RBIForexCard({ rbiData }) {
  if (!rbiData?.rates || !Object.keys(rbiData.rates).length) return null
  return (
    <div className="grid grid-cols-3 gap-3">
      {Object.entries(rbiData.rates).map(([base, info]) => (
        <div key={base} className="bg-zinc-900 rounded-xl p-3.5 border border-zinc-800 text-center">
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

// ── Detail modal content for each metric ──────────────────────────────────

function MetricDetailContent({ metricKey, label, getSeries, macro, macroLoading }) {
  const series = getSeries(metricKey)
  const configs = {
    gdp_nom: { color: INDIA_ORANGE, unit: 'B USD', Chart: ({ s }) => <GDPNomVsRealChart nomSeries={s} realSeries={getSeries('gdp_real')} height={220} /> },
    gdp_real: { color: '#60a5fa', unit: 'B USD' },
    inflation: { color: '#f59e0b', unit: '%' },
    fdi: { color: '#22c55e', unit: 'B USD' },
    forex_res: { color: '#38bdf8', unit: 'B USD' },
    exports: { color: '#4ade80', unit: 'B USD', Chart: ({ s }) => <TradeChart exports={s} imports={getSeries('imports')} height={220} /> },
    imports: { color: '#ef4444', unit: 'B USD', Chart: ({ s }) => <TradeChart exports={getSeries('exports')} imports={s} height={220} /> },
    int_rate: { color: '#c084fc', unit: '% p.a.' },
    ext_debt: { color: '#fb923c', unit: 'B USD' },
    fii: { color: '#818cf8', unit: 'B USD' },
    gross_sav: { color: '#fbbf24', unit: '% GNI' },
  }
  const cfg = configs[metricKey] ?? { color: INDIA_ORANGE, unit: '' }

  if (macroLoading && !macro) return <SkeletonChart />

  if (cfg.Chart) return <cfg.Chart s={series} />

  return <MiniLineChart series={series} color={cfg.color} unit={cfg.unit} height={220} />
}

// ── Main view ──────────────────────────────────────────────────────────────

export function IndiaFocusView() {
  const [macro, setMacro] = useState(null)
  const [macroLoading, setMacroLoading] = useState(false)
  const [macroUpdated, setMacroUpdated] = useState(null)
  const [rbiForex, setRbiForex] = useState(null)
  const [rbiLoading, setRbiLoading] = useState(false)
  const [rbiUpdated, setRbiUpdated] = useState(null)

  // Modal state: { key, label } or null
  const [modal, setModal] = useState(null)

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

  const yoy = (key) => {
    const s = getSeries(key)
    if (s.length < 2) return null
    const prev = s.at(-2)?.value, curr = s.at(-1)?.value
    if (prev == null || prev === 0 || curr == null) return null
    return parseFloat((((curr - prev) / prev) * 100).toFixed(1))
  }

  const openModal = (key, label) => setModal({ key, label })

  // Metric definitions for the compact grid
  const metrics = [
    { key: 'gdp_nom',   label: 'GDP (Nominal)',       unit: 'B USD',   color: INDIA_ORANGE },
    { key: 'inflation', label: 'CPI Inflation',        unit: '%',       color: '#f59e0b' },
    { key: 'fdi',       label: 'FDI Net Inflows',      unit: 'B USD',   color: '#22c55e' },
    { key: 'forex_res', label: 'Forex Reserves',       unit: 'B USD',   color: '#38bdf8' },
    { key: 'exports',   label: 'Exports (G&S)',         unit: 'B USD',   color: '#4ade80' },
    { key: 'imports',   label: 'Imports (G&S)',         unit: 'B USD',   color: '#ef4444' },
    { key: 'int_rate',  label: 'Interest Rate',        unit: '% p.a.',  color: '#c084fc' },
    { key: 'ext_debt',  label: 'External Debt',        unit: 'B USD',   color: '#fb923c' },
    { key: 'fii',       label: 'Portfolio Equity (FII)', unit: 'B USD', color: '#818cf8' },
    { key: 'gross_sav', label: 'Gross Savings',        unit: '% GNI',   color: '#fbbf24' },
  ]

  const modalMetric = metrics.find((m) => m.key === modal?.key)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-lg" style={{ background: '#ff6b3520', border: '1px solid #ff6b3540' }}>
            🇮🇳
          </div>
          <div>
            <h2 className="text-white font-semibold text-sm">India Economic Dashboard</h2>
            <p className="text-zinc-600 text-xs">World Bank · RBI · Click any metric for trend chart</p>
          </div>
        </div>
        <LiveStatus online={!macroLoading && !!macro} lastUpdated={macroUpdated} label="World Bank" />
      </div>

      {/* Compact 5-col metric grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {metrics.map(({ key, label, unit, color }) => (
          <MetricCard
            key={key}
            label={label}
            value={getLatest(key)}
            unit={unit}
            year={getYear(key)}
            change={yoy(key)}
            color={color}
            loading={macroLoading && !macro}
            error={isError(key)}
            onClick={() => openModal(key, label)}
          />
        ))}
      </div>

      {/* GDP trend + RBI Forex side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title="GDP — Nominal vs Real"
            subtitle="USD Billions · 10-year view"
            right={<LiveStatus online={!macroLoading && !!macro} lastUpdated={macroUpdated} />}
          />
          <div className="px-5 py-4">
            {macroLoading && !macro ? <SkeletonChart /> : (
              <GDPNomVsRealChart nomSeries={getSeries('gdp_nom')} realSeries={getSeries('gdp_real')} height={180} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="INR Exchange Rates"
            subtitle="USD/INR · EUR/INR · GBP/INR · Yahoo Finance"
            right={<LiveStatus online={!!rbiForex} lastUpdated={rbiUpdated} label="Yahoo Finance" />}
          />
          <div className="px-5 py-4">
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
      </div>

      {/* Trade balance + Forex reserves inline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Exports vs Imports" subtitle="Goods & Services · USD Billions" />
          <div className="px-5 py-4">
            {macroLoading && !macro ? <SkeletonChart /> : (
              <TradeChart exports={getSeries('exports')} imports={getSeries('imports')} height={170} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Forex Reserves" subtitle="Total reserve assets · USD Billions" />
          <div className="px-5 py-4">
            {macroLoading && !macro ? <SkeletonChart /> : (
              <MiniLineChart series={getSeries('forex_res')} color="#38bdf8" unit="B USD" height={170} />
            )}
          </div>
        </Card>
      </div>

      {/* Detail modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.label ?? ''}
        subtitle={modalMetric ? `${modalMetric.unit} · 10-year trend · World Bank` : ''}
      >
        {modal && (
          <MetricDetailContent
            metricKey={modal.key}
            label={modal.label}
            getSeries={getSeries}
            macro={macro}
            macroLoading={macroLoading}
          />
        )}
      </Modal>
    </div>
  )
}
