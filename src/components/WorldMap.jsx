import { useState, useCallback } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
  ZoomableGroup,
} from 'react-simple-maps'
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { SUPPLY_CHAIN_ROUTES, RISK_COLORS } from '../data/supplyChainRoutes'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

const RISK_ORDER = ['critical', 'high', 'medium', 'low']

const RISK_LABELS = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export function WorldMap() {
  const [selected, setSelected] = useState(null)
  const [filterRisk, setFilterRisk] = useState('all')
  const [zoom, setZoom] = useState(1)
  const [center, setCenter] = useState([0, 20])

  const filtered =
    filterRisk === 'all'
      ? SUPPLY_CHAIN_ROUTES
      : SUPPLY_CHAIN_ROUTES.filter((r) => r.riskLevel === filterRisk)

  const handleMarkerClick = useCallback((route) => {
    setSelected((prev) => (prev?.id === route.id ? null : route))
  }, [])

  const handleDismiss = useCallback(() => setSelected(null), [])

  const handleZoomIn = () => setZoom((z) => Math.min(8, parseFloat((z + 0.75).toFixed(2))))
  const handleZoomOut = () => setZoom((z) => Math.max(1, parseFloat((z - 0.75).toFixed(2))))
  const handleReset = () => { setZoom(1); setCenter([0, 20]); setSelected(null) }

  const routeCount = filtered.length

  return (
    <div className="bg-zinc-950 rounded-xl border border-zinc-900 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-zinc-900">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h2 className="text-white font-semibold text-sm">Global Supply Chain Routes</h2>
            <p className="text-zinc-600 text-xs mt-0.5">
              {routeCount} route{routeCount !== 1 ? 's' : ''} · Click a marker to inspect
            </p>
          </div>

          {/* Risk filters */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilterRisk('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all border ${
                filterRisk === 'all'
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-transparent text-zinc-500 border-zinc-800 hover:border-slate-500 hover:text-zinc-400'
              }`}
            >
              All
            </button>
            {RISK_ORDER.map((level) => (
              <button
                key={level}
                onClick={() => setFilterRisk(level)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all border ${
                  filterRisk === level
                    ? 'border-transparent text-white'
                    : 'bg-transparent text-zinc-500 border-zinc-800 hover:border-slate-500 hover:text-zinc-400'
                }`}
                style={
                  filterRisk === level
                    ? { backgroundColor: RISK_COLORS[level], borderColor: RISK_COLORS[level] }
                    : {}
                }
              >
                {RISK_LABELS[level]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="relative bg-black" style={{ height: 420 }}>
        <ComposableMap
          projection="geoNaturalEarth1"
          style={{ width: '100%', height: '100%' }}
        >
          <ZoomableGroup
            zoom={zoom}
            center={center}
            onMoveEnd={({ zoom: z, coordinates }) => {
              setZoom(z)
              setCenter(coordinates)
            }}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#1e293b"
                    stroke="#0f172a"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: { outline: 'none', fill: '#253347' },
                      pressed: { outline: 'none' },
                    }}
                  />
                ))
              }
            </Geographies>

            {/* Route lines */}
            {filtered.map((route) => {
              const isSelected = selected?.id === route.id
              const isDimmed = selected && !isSelected
              return (
                <Line
                  key={route.id}
                  from={route.from}
                  to={route.to}
                  stroke={route.color}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  strokeLinecap="round"
                  strokeOpacity={isDimmed ? 0.2 : isSelected ? 1 : 0.75}
                  strokeDasharray={route.riskLevel === 'medium' ? '5 3' : undefined}
                  style={{ transition: 'stroke-opacity 0.2s' }}
                />
              )
            })}

            {/* Midpoint markers */}
            {filtered.map((route) => {
              const isSelected = selected?.id === route.id
              const isDimmed = selected && !isSelected
              return (
                <Marker
                  key={`marker-${route.id}`}
                  coordinates={route.midpoint}
                  onClick={() => handleMarkerClick(route)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Pulse ring on selected */}
                  {isSelected && (
                    <circle
                      r={11}
                      fill={route.color}
                      fillOpacity={0.2}
                      stroke={route.color}
                      strokeOpacity={0.4}
                      strokeWidth={1}
                    />
                  )}
                  <circle
                    r={isSelected ? 6 : 4.5}
                    fill={route.color}
                    fillOpacity={isDimmed ? 0.25 : 0.95}
                    stroke="#0f172a"
                    strokeWidth={1.5}
                    style={{ transition: 'r 0.15s, fill-opacity 0.2s' }}
                  />
                </Marker>
              )
            })}
          </ZoomableGroup>
        </ComposableMap>

        {/* Zoom controls */}
        <div className="absolute top-3 right-3 flex flex-col gap-1">
          {[
            { label: <ZoomIn size={13} />, action: handleZoomIn, ariaLabel: 'Zoom in' },
            { label: <ZoomOut size={13} />, action: handleZoomOut, ariaLabel: 'Zoom out' },
            { label: <RotateCcw size={12} />, action: handleReset, ariaLabel: 'Reset view' },
          ].map(({ label, action, ariaLabel }) => (
            <button
              key={ariaLabel}
              onClick={action}
              aria-label={ariaLabel}
              className="w-7 h-7 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-md flex items-center justify-center transition-colors border border-zinc-800/50 backdrop-blur-sm"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div
          className="mx-4 mb-4 mt-0 rounded-xl border overflow-hidden"
          style={{
            borderColor: selected.color + '44',
            background: `linear-gradient(135deg, ${selected.color}0d 0%, transparent 60%)`,
          }}
        >
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className="px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide"
                    style={{ color: selected.color, background: selected.color + '1a' }}
                  >
                    {RISK_LABELS[selected.riskLevel]} Risk
                  </span>
                </div>
                <h3 className="text-white font-semibold text-base mt-1.5">{selected.name}</h3>
                <p className="text-zinc-500 text-xs mt-0.5 font-medium">
                  {selected.share} &nbsp;·&nbsp; {selected.volume}
                </p>
              </div>
              <button
                onClick={handleDismiss}
                aria-label="Close detail panel"
                className="text-zinc-600 hover:text-zinc-400 transition-colors p-1 -mt-0.5 -mr-0.5 rounded flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-zinc-700 text-xs mb-1.5 uppercase tracking-wider font-medium">
                  Commodities
                </p>
                <div className="flex flex-wrap gap-1">
                  {selected.commodities.map((c) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 bg-zinc-900 text-zinc-400 rounded-md text-xs border border-zinc-800"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-zinc-700 text-xs mb-1.5 uppercase tracking-wider font-medium">
                  Primary Risk
                </p>
                <p className="text-zinc-400 text-xs leading-relaxed">{selected.risk}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Risk legend */}
      <div className="px-5 pb-4 flex flex-wrap gap-4">
        {RISK_ORDER.map((level) => (
          <button
            key={level}
            onClick={() => setFilterRisk(filterRisk === level ? 'all' : level)}
            className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: RISK_COLORS[level] }}
            />
            {RISK_LABELS[level]} Risk
          </button>
        ))}
        <span className="text-slate-700 text-xs ml-auto hidden sm:block">
          Scroll to zoom · Drag to pan
        </span>
      </div>
    </div>
  )
}
