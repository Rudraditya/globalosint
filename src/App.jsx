import { useState, useEffect } from 'react'
import { Globe, BarChart3, Activity, ChevronRight, Cpu, MemoryStick, RefreshCw } from 'lucide-react'
import { SupplyProductionView } from './components/SupplyProductionView'
import { MacroIndicatorsView } from './components/MacroIndicatorsView'

function fmtBytes(b) {
  if (b == null) return '—'
  if (b >= 1024 * 1024 * 1024) return `${(b / 1024 / 1024 / 1024).toFixed(1)} GB`
  return `${(b / 1024 / 1024).toFixed(0)} MB`
}

function fmtUptime(ms) {
  if (ms == null) return '—'
  const s = Math.floor((Date.now() - ms) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h}h ${m}m`
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
      } catch {
        if (!cancelled) setError(true)
      }
    }
    poll()
    const id = setInterval(poll, intervalMs)
    return () => { cancelled = true; clearInterval(id) }
  }, [intervalMs])

  return { stats, error }
}

const STATUS_STYLE = {
  online:   { dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'online' },
  stopping: { dot: 'bg-amber-400',   text: 'text-amber-400',   label: 'stopping' },
  stopped:  { dot: 'bg-slate-500',   text: 'text-slate-400',   label: 'stopped' },
  errored:  { dot: 'bg-red-500',     text: 'text-red-400',     label: 'errored' },
}

function PM2Badge({ stats, error }) {
  if (error || !stats) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
        <span className="text-slate-600 text-xs font-medium">pm2 offline</span>
      </div>
    )
  }

  const s = STATUS_STYLE[stats.status] ?? STATUS_STYLE.stopped
  return (
    <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs font-medium">
      {/* Status */}
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${stats.status === 'online' ? 'animate-pulse' : ''}`} />
        <span className={s.text}>{s.label}</span>
      </div>
      {/* Divider */}
      <span className="w-px h-3 bg-slate-700" />
      {/* CPU */}
      <div className="flex items-center gap-1 text-slate-400">
        <Cpu size={11} className="text-slate-500" />
        <span>{stats.cpu ?? 0}%</span>
      </div>
      {/* Memory */}
      <div className="flex items-center gap-1 text-slate-400">
        <MemoryStick size={11} className="text-slate-500" />
        <span>{fmtBytes(stats.memory)}</span>
      </div>
      {/* Uptime */}
      <div className="flex items-center gap-1 text-slate-400">
        <RefreshCw size={10} className="text-slate-500" />
        <span>{fmtUptime(stats.uptime)}</span>
      </div>
      {/* Restarts */}
      {stats.restarts > 0 && (
        <span className="text-amber-500">↺{stats.restarts}</span>
      )}
    </div>
  )
}

const VIEWS = [
  {
    id: 'supply',
    label: 'Global Supply & Production',
    short: 'Supply',
    icon: Globe,
    description: 'Industrial output · Trade routes · Production indices',
  },
  {
    id: 'macro',
    label: 'Macro Indicators',
    short: 'Macro',
    icon: BarChart3,
    description: 'Industry GDP share · Market data · Sector radar',
  },
]

export default function App() {
  const [view, setView] = useState('supply')
  const { stats, error } = usePM2Stats(5000)

  const active = VIEWS.find((v) => v.id === view)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600/20 ring-1 ring-indigo-500/40">
                <Activity className="text-indigo-400" size={15} />
              </div>
              <span className="font-bold text-white tracking-tight">GlobalOSInt</span>
              <span className="text-slate-600 text-sm hidden sm:inline">/ Demo</span>
            </div>
            <PM2Badge stats={stats} error={error} />
          </div>

          {/* Nav tabs */}
          <nav className="flex gap-1" aria-label="Dashboard views">
            {VIEWS.map((v) => {
              const Icon = v.icon
              const isActive = view === v.id
              return (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon size={15} />
                  <span className="hidden sm:inline">{v.label}</span>
                  <span className="sm:hidden">{v.short}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Page heading */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-7 pb-5">
        <div className="flex items-center gap-2 text-slate-600 text-xs mb-2 font-medium">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span className="text-slate-400">{active?.label}</span>
        </div>
        <h1 className="text-xl font-semibold text-white tracking-tight mb-1">{active?.label}</h1>
        <p className="text-slate-500 text-sm">{active?.description}</p>
      </div>

      {/* View container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        {view === 'supply' && <SupplyProductionView />}
        {view === 'macro' && <MacroIndicatorsView />}
      </main>
    </div>
  )
}
