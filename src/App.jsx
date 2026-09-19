import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { Globe, BarChart3, Activity, ChevronRight, Cpu, MemoryStick, Flag, TrendingUp, Crosshair } from 'lucide-react'
import { animate } from 'animejs'
import { SupplyProductionView } from './components/SupplyProductionView'
import { MacroIndicatorsView } from './components/MacroIndicatorsView'
import { IndiaFocusView } from './components/IndiaFocusView'
import { CommodityView } from './components/CommodityView'
import { pageEnter } from './utils/animations'

const MarketEntryView = lazy(() => import('./components/MarketEntryView').then((m) => ({ default: m.MarketEntryView })))

function fmtBytes(b) {
  if (b == null) return '—'
  if (b >= 1073741824) return `${(b / 1073741824).toFixed(1)} GB`
  return `${(b / 1048576).toFixed(0)} MB`
}

function fmtUptime(ms) {
  if (ms == null) return '—'
  const s = Math.floor((Date.now() - ms) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
}

function usePM2Stats(intervalMs = 5000) {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let cancelled = false
    async function poll() {
      try {
        const res = await fetch('/api/pm2')
        if (!res.ok) throw new Error()
        const { procs } = await res.json()
        const proc = procs.find((p) => p.name === 'globalosint') ?? procs[0]
        if (!cancelled) { setStats(proc); setError(false) }
      } catch { if (!cancelled) setError(true) }
    }
    poll()
    const id = setInterval(poll, intervalMs)
    return () => { cancelled = true; clearInterval(id) }
  }, [intervalMs])
  return { stats, error }
}

function PM2Badge({ stats, error }) {
  if (error || !stats) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.08]">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
        <span className="text-slate-600 text-xs font-medium">pm2 offline</span>
      </div>
    )
  }

  const isOnline = stats.status === 'online'
  return (
    <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs font-medium">
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
        <span className={isOnline ? 'text-green-400' : 'text-slate-500'}>{stats.status}</span>
      </div>
      <span className="w-px h-3 bg-white/[0.08]" />
      <div className="flex items-center gap-1 text-slate-400">
        <Cpu size={11} className="text-slate-600" />
        <span>{stats.cpu ?? 0}%</span>
      </div>
      <div className="flex items-center gap-1 text-slate-400">
        <MemoryStick size={11} className="text-slate-600" />
        <span>{fmtBytes(stats.memory)}</span>
      </div>
      <div className="flex items-center gap-1 text-slate-400">
        <span className="text-slate-600 text-[10px]">↑</span>
        <span>{fmtUptime(stats.uptime)}</span>
      </div>
      {stats.restarts > 0 && <span className="text-amber-500">↺{stats.restarts}</span>}
    </div>
  )
}

const VIEWS = [
  {
    id: 'india',
    label: 'India Focus',
    short: 'India',
    icon: Flag,
    description: 'Indian macro indicators · FDI/FII · Trade · RBI forex · Economic news',
  },
  {
    id: 'macro',
    label: 'Macro Indicators',
    short: 'Macro',
    icon: BarChart3,
    description: 'GDP comparison · Currency rates · G20 + Africa · Eurostat / World Bank',
  },
  {
    id: 'commodities',
    label: 'Global Commodities',
    short: 'Commodities',
    icon: TrendingUp,
    description: 'Real-time commodity prices · Energy · Metals · Agriculture · 5-min refresh',
  },
  {
    id: 'supply',
    label: 'Global Supply & Production',
    short: 'Supply',
    icon: Globe,
    description: 'Industrial output · Trade routes · OECD G20 production indices',
  },
  {
    id: 'entry',
    label: 'Market Entry',
    short: 'Entry',
    icon: Crosshair,
    description: "Porter's Five Forces · indicator-driven scoring · generic strategy recommendation",
  },
]

// Pill tab bar with an anime.js-driven sliding indicator behind the active tab.
function TabNav({ views, active, onChange }) {
  const containerRef = useRef(null)
  const btnRefs = useRef({})
  const indicatorRef = useRef(null)
  const firstRun = useRef(true)

  const positionIndicator = (animated) => {
    const btn = btnRefs.current[active]
    const container = containerRef.current
    const indicator = indicatorRef.current
    if (!btn || !container || !indicator) return
    const cRect = container.getBoundingClientRect()
    const bRect = btn.getBoundingClientRect()
    const left = bRect.left - cRect.left + container.scrollLeft
    if (animated) {
      animate(indicator, { left, width: bRect.width, duration: 420, ease: 'outQuint' })
    } else {
      indicator.style.left = `${left}px`
      indicator.style.width = `${bRect.width}px`
    }
  }

  useEffect(() => {
    positionIndicator(!firstRun.current)
    firstRun.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  useEffect(() => {
    const onResize = () => positionIndicator(false)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative flex items-center gap-0.5 bg-white/[0.03] border border-white/[0.08] rounded-xl p-1 overflow-x-auto max-w-full"
      aria-label="Dashboard views"
      role="tablist"
    >
      <div
        ref={indicatorRef}
        className="absolute top-1 bottom-1 rounded-lg bg-gradient-brand shadow-[0_2px_12px_-2px_rgba(59,107,245,0.6)]"
        style={{ width: 0, left: 0 }}
      />
      {views.map((v) => {
        const Icon = v.icon
        const isActive = v.id === active
        return (
          <button
            key={v.id}
            ref={(el) => { btnRefs.current[v.id] = el }}
            role="tab"
            aria-selected={isActive}
            title={v.label}
            onClick={() => onChange(v.id)}
            className={`relative z-10 flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors duration-200 ${
              isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon size={14} className="flex-shrink-0" />
            <span className="hidden md:inline">{v.short}</span>
          </button>
        )
      })}
    </div>
  )
}

// Fixed decorative aurora glow behind all content — gives the glass cards something to blur.
function Aurora() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -left-32 w-[36rem] h-[36rem] rounded-full bg-brand-600/25 blur-[120px]" />
      <div className="absolute top-1/3 -right-40 w-[30rem] h-[30rem] rounded-full bg-violet-600/20 blur-[130px]" />
      <div className="absolute bottom-0 left-1/4 w-[26rem] h-[26rem] rounded-full bg-sky-500/10 blur-[110px]" />
    </div>
  )
}

export default function App() {
  const [view, setView] = useState('india')
  const { stats, error } = usePM2Stats(5000)
  const active = VIEWS.find((v) => v.id === view)
  const mainRef = useRef(null)

  useEffect(() => {
    if (mainRef.current) pageEnter(mainRef.current)
  }, [view])

  return (
    <div className="min-h-screen bg-[color:var(--color-base)] text-white">
      <Aurora />

      {/* Top bar */}
      <header className="border-b border-white/[0.06] bg-[color:var(--color-base)]/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-brand ring-1 ring-white/10 shadow-[0_2px_12px_-2px_rgba(59,107,245,0.7)]">
                <Activity className="text-white" size={15} />
              </div>
              <span className="font-bold text-white tracking-tight font-display">GlobalOSInt</span>
              <span className="text-slate-600 text-sm hidden sm:inline">/ Demo</span>
            </div>
            <PM2Badge stats={stats} error={error} />
          </div>

          <TabNav views={VIEWS} active={view} onChange={setView} />
        </div>
      </header>

      {/* Page heading */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-3">
        <div className="flex items-center gap-2 text-slate-600 text-xs mb-1 font-medium">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span className="text-slate-400">{active?.label}</span>
        </div>
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-semibold text-white tracking-tight font-display">{active?.label}</h1>
          <p className="text-slate-600 text-xs hidden sm:block">{active?.description}</p>
        </div>
      </div>

      {/* View container */}
      <main key={view} ref={mainRef} className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
        {view === 'supply'      && <SupplyProductionView />}
        {view === 'macro'       && <MacroIndicatorsView />}
        {view === 'india'       && <IndiaFocusView />}
        {view === 'commodities' && <CommodityView />}
        {view === 'entry'       && (
          <Suspense fallback={<div className="flex items-center justify-center h-64 text-slate-600 text-sm">Loading…</div>}>
            <MarketEntryView />
          </Suspense>
        )}
      </main>
    </div>
  )
}
