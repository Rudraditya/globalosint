import { useState, useEffect } from 'react'
import { Globe, BarChart3, Activity, ChevronRight, Cpu, MemoryStick, Flag, TrendingUp } from 'lucide-react'
import { SupplyProductionView } from './components/SupplyProductionView'
import { MacroIndicatorsView } from './components/MacroIndicatorsView'
import { IndiaFocusView } from './components/IndiaFocusView'
import { CommodityView } from './components/CommodityView'

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
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
        <span className="text-zinc-600 text-xs font-medium">pm2 offline</span>
      </div>
    )
  }

  const isOnline = stats.status === 'online'
  return (
    <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs font-medium">
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`} />
        <span className={isOnline ? 'text-green-400' : 'text-zinc-500'}>{stats.status}</span>
      </div>
      <span className="w-px h-3 bg-zinc-800" />
      <div className="flex items-center gap-1 text-zinc-400">
        <Cpu size={11} className="text-zinc-600" />
        <span>{stats.cpu ?? 0}%</span>
      </div>
      <div className="flex items-center gap-1 text-zinc-400">
        <MemoryStick size={11} className="text-zinc-600" />
        <span>{fmtBytes(stats.memory)}</span>
      </div>
      <div className="flex items-center gap-1 text-zinc-400">
        <span className="text-zinc-600 text-[10px]">↑</span>
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
]

export default function App() {
  const [view, setView] = useState('india')
  const { stats, error } = usePM2Stats(5000)
  const active = VIEWS.find((v) => v.id === view)

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top bar */}
      <header className="border-b border-zinc-900 bg-zinc-950/95 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-orange-600/20 ring-1 ring-orange-500/40">
                <Activity className="text-orange-400" size={15} />
              </div>
              <span className="font-bold text-white tracking-tight">GlobalOSInt</span>
              <span className="text-zinc-700 text-sm hidden sm:inline">/ Demo</span>
            </div>
            <PM2Badge stats={stats} error={error} />
          </div>

          <nav className="flex gap-1 overflow-x-auto" aria-label="Dashboard views">
            {VIEWS.map((v) => {
              const Icon = v.icon
              const isActive = view === v.id
              return (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                    isActive
                      ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/40'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <Icon size={14} />
                  <span className="hidden md:inline">{v.label}</span>
                  <span className="md:hidden">{v.short}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Page heading */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-3">
        <div className="flex items-center gap-2 text-zinc-700 text-xs mb-1 font-medium">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span className="text-zinc-400">{active?.label}</span>
        </div>
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-semibold text-white tracking-tight">{active?.label}</h1>
          <p className="text-zinc-600 text-xs hidden sm:block">{active?.description}</p>
        </div>
      </div>

      {/* View container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
        {view === 'supply'      && <SupplyProductionView />}
        {view === 'macro'       && <MacroIndicatorsView />}
        {view === 'india'       && <IndiaFocusView />}
        {view === 'commodities' && <CommodityView />}
      </main>
    </div>
  )
}
