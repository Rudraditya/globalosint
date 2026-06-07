import { useState } from 'react'
import { Globe, BarChart3, Activity, ChevronRight } from 'lucide-react'
import { SupplyProductionView } from './components/SupplyProductionView'
import { MacroIndicatorsView } from './components/MacroIndicatorsView'

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

  const active = VIEWS.find((v) => v.id === view)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600/20 ring-1 ring-indigo-500/40">
              <Activity className="text-indigo-400" size={15} />
            </div>
            <span className="font-bold text-white tracking-tight">GlobalOSInt</span>
            <span className="text-slate-600 text-sm hidden sm:inline">/ Demo</span>
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
