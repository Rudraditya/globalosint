import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts'
import { RefreshCw, DollarSign, Sparkles, Crosshair, RotateCcw, Layers } from 'lucide-react'
import { ALL_COUNTRIES } from '../utils/api'
import {
  fetchFiveForcesIndicators, deriveForcesFromIndicators,
  fetchSectorIndicators, deriveSectorForces,
  fetchIndustryIndicators, deriveIndustryForces,
} from '../utils/fiveForcesApi'
import { recommendStrategy, blendForces, TIER_WEIGHTS, FORCE_DEFS, DEFAULT_FORCES } from '../utils/strategyEngine'
import { SECTORS, getIndustriesForSector, getIndustry, computeCR4, classifyConcentration } from '../utils/industryTaxonomy'
import { LiveStatus } from './LiveStatus'
import { Modal } from './Modal'
import { Card, CardHeader } from './Card'
import { AnimatedNumber } from './AnimatedNumber'
import { staggerIn } from '../utils/animations'

const TT = {
  contentStyle: { background: '#0a0e16', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.8)', padding: '10px 14px' },
  labelStyle: { color: '#d4d4d8', fontWeight: 600, marginBottom: 4, fontSize: 12 },
}

const BRAND = '#5a8cff'

const TIER_COLORS = {
  country: '#818cf8',
  sector: '#c084fc',
  industry: '#4ade80',
}

// ── Strategy metadata ───────────────────────────────────────────────────────

const STRATEGY_META = {
  'Cost Leadership': {
    color: '#38bdf8',
    icon: DollarSign,
    blurb: 'Compete by being the lowest-cost producer in the industry, then win on price or margin.',
  },
  'Differentiation': {
    color: '#c084fc',
    icon: Sparkles,
    blurb: 'Compete by offering unique value — brand, quality, or features — that justifies a premium.',
  },
  'Focus': {
    color: '#fbbf24',
    icon: Crosshair,
    blurb: 'Compete by dominating a narrow segment that broad-market competitors underserve.',
  },
}

// ── Indicator → force mapping shown in the tier panels ─────────────────────

const COUNTRY_INDICATOR_META = {
  marketConcentration:     { label: 'Market Concentration',     unit: 'HHI proxy (0–1)',  maps: 'Rivalry',         fmt: (v) => v.toFixed(2) },
  supplierConcentration:   { label: 'Supplier Concentration',   unit: 'HHI proxy (0–1)',  maps: 'Supplier Power',  fmt: (v) => v.toFixed(2) },
  importDependency:        { label: 'Import Dependency',        unit: '% of GDP',         maps: 'Buyer Power',     fmt: (v) => v.toFixed(1) },
  startupCostPctGNI:       { label: 'Startup Cost',              unit: '% GNI/capita',     maps: 'Threat of Entry', fmt: (v) => v.toFixed(1) },
  tariffRate:              { label: 'Tariff Rate',               unit: '% (weighted avg)', maps: 'Threat of Entry', fmt: (v) => v.toFixed(1) },
  taxRevenuePctGDP:        { label: 'Tax Burden',                unit: '% of GDP (World Bank)', maps: 'Threat of Entry', fmt: (v) => v.toFixed(1) },
  rndExpenditurePctGDP:    { label: 'R&D Expenditure',           unit: '% of GDP',         maps: 'Substitution',    fmt: (v) => v.toFixed(2) },
}

const SECTOR_INDICATOR_META = {
  capacityUtilization: { label: 'Capacity Utilization', unit: '%', maps: 'Rivalry',        fmt: (v) => v.toFixed(1) },
  ppiYoY:              { label: 'PPI (YoY)',            unit: '%', maps: 'Supplier Power', fmt: (v) => v.toFixed(1) },
}

function industryIndicatorMeta(industry) {
  return {
    cr4: { label: 'Market Concentration (CR4)', unit: '% (top 4 of 5 peers)', maps: 'Rivalry', fmt: (v) => v.toFixed(1) },
    importPenetration: industry.realIndustryIndicator
      ? { label: 'ICT Service Export Share', unit: '% of service exports (World Bank)', maps: 'Buyer Power', fmt: (v) => v.toFixed(1) }
      : { label: 'Import Penetration', unit: `% (mock, HS6 ${industry.hs6?.code})`, maps: 'Buyer Power', fmt: (v) => v.toFixed(1) },
  }
}

// ── Sliders ──────────────────────────────────────────────────────────────────

function ForceSlider({ def, value, onChange }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-slate-300 text-xs font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: def.color }} />
          {def.label}
        </label>
        <span className="text-white text-xs font-bold tabular-nums w-6 text-right"><AnimatedNumber value={value} format={(v) => Math.round(v)} duration={300} /></span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(def.key, Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-slate-800 cursor-pointer"
        style={{ accentColor: def.color }}
      />
      <p className="text-slate-600 text-[10px] mt-1">{def.description}</p>
    </div>
  )
}

// ── Strategy score bars ─────────────────────────────────────────────────────

function StrategyScoreBars({ scores, winner }) {
  const max = Math.max(...Object.values(scores), 1)
  return (
    <div className="space-y-2">
      {Object.entries(scores).map(([name, score]) => {
        const meta = STRATEGY_META[name]
        const pct = Math.max(4, (score / max) * 100)
        return (
          <div key={name}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-medium ${name === winner ? 'text-white' : 'text-slate-500'}`}>{name}</span>
              <span className="text-slate-500 text-xs tabular-nums">{score}</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: meta.color, opacity: name === winner ? 1 : 0.4 }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Indicator tier panel ─────────────────────────────────────────────────────

function IndicatorPanel({ title, weight, color, meta, values }) {
  return (
    <Card hoverable>
      <CardHeader
        title={title}
        subtitle={values ? 'Live indicator values' : 'Load market indicators to populate'}
        right={
          <span className="text-[10px] font-bold px-2 py-1 rounded-md tabular-nums" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
            {weight}% weight
          </span>
        }
      />
      <div className="px-5 py-4">
        {values ? (
          <div className="space-y-2">
            {Object.entries(meta).map(([key, m]) => {
              const v = values[key]
              return (
                <div key={key} className="flex items-center justify-between text-xs py-1 border-b border-slate-900 last:border-0">
                  <div>
                    <span className="text-slate-300 font-medium">{m.label}</span>
                    <span className="text-slate-600 ml-2">{m.unit}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold tabular-nums">{v != null ? m.fmt(v) : '—'}</span>
                    <span className="text-slate-600">→</span>
                    <span className="font-medium" style={{ color }}>{m.maps}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-24 text-slate-700 text-xs">No indicator data loaded</div>
        )}
      </div>
    </Card>
  )
}

// ── Main view ────────────────────────────────────────────────────────────────

export function MarketEntryView() {
  const [country, setCountry] = useState('IND')
  const [sectorId, setSectorId] = useState(SECTORS[0].id)
  const [industryId, setIndustryId] = useState(getIndustriesForSector(SECTORS[0].id)[0].id)

  const [forces, setForces] = useState(DEFAULT_FORCES)
  const [countryForces, setCountryForces] = useState(null)
  const [sectorForces, setSectorForces] = useState(null)
  const [industryForces, setIndustryForces] = useState(null)

  const [countryIndicators, setCountryIndicators] = useState(null)
  const [sectorIndicators, setSectorIndicators] = useState(null)
  const [industryIndicators, setIndustryIndicators] = useState(null)

  const [layerToggles, setLayerToggles] = useState({ country: true, sector: true, industry: true })

  const [tierModalOpen, setTierModalOpen] = useState(false)

  const [loading, setLoading] = useState(false)
  const [updated, setUpdated] = useState(null)
  const columnsRef = useRef(null)

  const industry = useMemo(() => getIndustry(industryId), [industryId])
  const sectorIndustries = useMemo(() => getIndustriesForSector(sectorId), [sectorId])
  const marketStructure = useMemo(() => computeCR4(industry.peers), [industry])
  const concentration = useMemo(() => classifyConcentration(marketStructure.cr4), [marketStructure])
  const industryMeta = useMemo(() => industryIndicatorMeta(industry), [industry])

  const handleSectorChange = (id) => {
    setSectorId(id)
    setIndustryId(getIndustriesForSector(id)[0].id)
  }

  const loadIndicators = useCallback(async () => {
    setLoading(true)
    try {
      const [countryInd, sectorInd, industryInd] = await Promise.all([
        fetchFiveForcesIndicators(country),
        fetchSectorIndicators(sectorId, country),
        fetchIndustryIndicators(industry, country),
      ])
      const cForces = deriveForcesFromIndicators(countryInd)
      const sForces = deriveSectorForces(cForces, sectorInd)
      const iForces = deriveIndustryForces(sForces, industryInd)

      setCountryIndicators(countryInd)
      setSectorIndicators(sectorInd)
      setIndustryIndicators(industryInd)
      setCountryForces(cForces)
      setSectorForces(sForces)
      setIndustryForces(iForces)
      setForces(blendForces(cForces, sForces, iForces))
      setUpdated(new Date())
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [country, sectorId, industry])

  const setForce = (key, value) => setForces((f) => ({ ...f, [key]: value }))
  const resetForces = () => {
    setForces(DEFAULT_FORCES)
    setCountryForces(null)
    setSectorForces(null)
    setIndustryForces(null)
    setCountryIndicators(null)
    setSectorIndicators(null)
    setIndustryIndicators(null)
    setUpdated(null)
  }

  const toggleLayer = (key) => setLayerToggles((t) => ({ ...t, [key]: !t[key] }))

  useEffect(() => {
    if (columnsRef.current) staggerIn(columnsRef.current.children)
  }, [country, sectorId, industryId])

  const result = useMemo(() => recommendStrategy(forces), [forces])
  const meta = STRATEGY_META[result.strategy]
  const StrategyIcon = meta.icon

  const radarData = useMemo(() => FORCE_DEFS.map((f) => ({
    force: f.short,
    baseline: 5,
    blended: forces[f.key],
    country: countryForces ? countryForces[f.key] : null,
    sector: sectorForces ? sectorForces[f.key] : null,
    industry: industryForces ? industryForces[f.key] : null,
  })), [forces, countryForces, sectorForces, industryForces])

  const countryLabel = useMemo(() => ALL_COUNTRIES.find((c) => c.code === country)?.label ?? country, [country])
  const sectorLabel = useMemo(() => SECTORS.find((s) => s.id === sectorId)?.label ?? sectorId, [sectorId])
  const liveLabel = countryForces ? `${countryLabel} · ${sectorLabel} · ${industry.label}` : undefined

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${BRAND}20`, border: `1px solid ${BRAND}40` }}>
            <Crosshair size={15} style={{ color: BRAND }} />
          </div>
          <div>
            <h2 className="text-white font-semibold text-sm">Market Entry Strategy Lab</h2>
            <p className="text-slate-600 text-xs">Porter's Five Forces · Country → Sector → Industry drill-down · generic strategy engine</p>
          </div>
        </div>
        <LiveStatus online={!!countryForces} lastUpdated={updated} label={liveLabel} />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-slate-300 hover:border-brand-500/40 transition-colors focus:outline-none focus:border-brand-500/60"
        >
          {ALL_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
        <select
          value={sectorId}
          onChange={(e) => handleSectorChange(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-slate-300 hover:border-brand-500/40 transition-colors focus:outline-none focus:border-brand-500/60"
        >
          {SECTORS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <select
          value={industryId}
          onChange={(e) => setIndustryId(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-slate-300 hover:border-brand-500/40 transition-colors focus:outline-none focus:border-brand-500/60"
        >
          {sectorIndustries.map((ind) => (
            <option key={ind.id} value={ind.id}>{ind.label}</option>
          ))}
        </select>
        <button
          onClick={loadIndicators}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-brand hover:brightness-110 disabled:opacity-50 text-white text-xs font-medium transition-all shadow-[0_2px_12px_-2px_rgba(59,107,245,0.6)]"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading…' : 'Load Market Indicators'}
        </button>
        <button
          onClick={resetForces}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:border-white/20 text-slate-400 hover:text-white text-xs font-medium transition-colors"
        >
          <RotateCcw size={12} />
          Reset
        </button>
        <button
          onClick={() => setTierModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:border-white/20 text-slate-400 hover:text-white text-xs font-medium transition-colors"
        >
          <Layers size={12} />
          Tier Indicators
        </button>
      </div>

      <div ref={columnsRef} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Column 1 — Radar chart + Market Structure */}
        <div className="space-y-4">
          <Card hoverable>
            <CardHeader
              title="Five Forces Radar"
              subtitle="1 (weak) – 10 (strong) · dashed line = neutral baseline · toggle layers below"
            />
            <div className="px-5 pt-3 flex items-center gap-4 flex-wrap">
              {[
                { key: 'country', label: 'Country Baseline' },
                { key: 'sector', label: 'Sector Average' },
                { key: 'industry', label: 'Industry Reality' },
              ].map((t) => (
                <label key={t.key} className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={layerToggles[t.key]}
                    onChange={() => toggleLayer(t.key)}
                    className="cursor-pointer"
                    style={{ accentColor: TIER_COLORS[t.key] }}
                  />
                  <span style={{ color: TIER_COLORS[t.key] }}>{t.label}</span>
                </label>
              ))}
            </div>
            <div className="px-5 py-4">
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="#27272a" />
                  <PolarAngleAxis dataKey="force" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickCount={6} />
                  <Tooltip contentStyle={TT.contentStyle} labelStyle={TT.labelStyle} />
                  <Legend formatter={(v) => <span style={{ color: '#71717a', fontSize: 11 }}>{v}</span>} wrapperStyle={{ paddingTop: 8 }} />
                  <Radar name="Neutral (5)" dataKey="baseline" stroke="#52525b" strokeDasharray="4 3" fill="transparent" strokeWidth={1.5} />
                  {countryForces && layerToggles.country && (
                    <Radar name="Country Baseline" dataKey="country" stroke={TIER_COLORS.country} strokeDasharray="3 2" fill={TIER_COLORS.country} fillOpacity={0.04} strokeWidth={1.5} />
                  )}
                  {sectorForces && layerToggles.sector && (
                    <Radar name="Sector Average" dataKey="sector" stroke={TIER_COLORS.sector} strokeDasharray="3 2" fill={TIER_COLORS.sector} fillOpacity={0.04} strokeWidth={1.5} />
                  )}
                  {industryForces && layerToggles.industry && (
                    <Radar name="Industry Reality" dataKey="industry" stroke={TIER_COLORS.industry} strokeDasharray="3 2" fill={TIER_COLORS.industry} fillOpacity={0.06} strokeWidth={1.5} />
                  )}
                  <Radar name="Blended Score" dataKey="blended" stroke={BRAND} fill={BRAND} fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Market Structure */}
          <Card hoverable>
            <CardHeader
              title="Market Structure"
              subtitle={`${industry.label}${industry.hs6 ? ` · HS6 ${industry.hs6.code} (${industry.hs6.label})` : ' · services industry'}`}
            />
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-white tabular-nums"><AnimatedNumber value={marketStructure.cr4} format={(v) => `${v.toFixed(1)}%`} /></p>
                  <p className="text-slate-500 text-xs mt-0.5">CR4 — top 4 of {industry.peers.length} peers · {concentration}</p>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${marketStructure.cr4}%`, background: BRAND }} />
              </div>
              <div className="space-y-1">
                {marketStructure.top4.map((p) => (
                  <div key={p.name} className="flex items-center justify-between text-xs py-1 border-b border-slate-900 last:border-0">
                    <span className="text-slate-300 font-medium">{p.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 tabular-nums">${p.revenueUSDbn.toFixed(1)}B rev.</span>
                      <span className="text-white font-semibold tabular-nums w-12 text-right">{p.share.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-slate-700 text-[10px]">Illustrative peer revenue figures — see industryTaxonomy.js for sourcing notes.</p>
            </div>
          </Card>
        </div>

        {/* Column 2 — Strategy engine */}
        <Card hoverable className="h-fit">
          <CardHeader title="Recommended Strategy" subtitle="Generated from the blended Five Forces score (Country 20% · Sector 30% · Industry 50%)" />
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: `${meta.color}15`, borderColor: `${meta.color}40` }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${meta.color}25` }}>
                <StrategyIcon size={18} style={{ color: meta.color }} />
              </div>
              <div>
                <p className="text-white font-bold text-sm">
                  {result.strategy}{result.focusVariant ? ` — ${result.focusVariant}` : ''}
                </p>
                <p className="text-slate-400 text-xs mt-0.5">{meta.blurb}</p>
              </div>
            </div>

            <div>
              <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-2">Why this strategy</p>
              <ul className="space-y-1.5">
                {result.drivers.map((d, i) => (
                  <li key={i} className="text-slate-400 text-xs leading-relaxed flex gap-2">
                    <span className="text-slate-700 flex-shrink-0">▸</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-2">Strategy fit scores</p>
              <StrategyScoreBars scores={result.scores} winner={result.strategy} />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-900">
              <span>Avg. force intensity: <span className="text-slate-300 font-semibold">{result.avgIntensity}/10</span></span>
              <span>Spread: <span className="text-slate-300 font-semibold">{result.spread}/10</span></span>
            </div>
          </div>
        </Card>

        {/* Column 3 — Sliders + indicator panels */}
        <div className="space-y-4">
          <Card hoverable>
            <CardHeader title="Adjust Force Scores" subtitle="Drag to explore — the recommendation updates instantly from this blended score" />
            <div className="px-5 py-4 space-y-3">
              {FORCE_DEFS.map((def) => (
                <ForceSlider key={def.key} def={def} value={forces[def.key]} onChange={setForce} />
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Indicator → Force mapping, grouped by tier */}
      <Modal
        open={tierModalOpen}
        onClose={() => setTierModalOpen(false)}
        title="Tier Indicators"
        subtitle="Indicator → Force mapping, grouped by Country / Sector / Industry tier"
        width="lg"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <IndicatorPanel
            title="Country Tier"
            weight={Math.round(TIER_WEIGHTS.country * 100)}
            color={TIER_COLORS.country}
            meta={COUNTRY_INDICATOR_META}
            values={countryIndicators}
          />
          <IndicatorPanel
            title="Sector Tier"
            weight={Math.round(TIER_WEIGHTS.sector * 100)}
            color={TIER_COLORS.sector}
            meta={SECTOR_INDICATOR_META}
            values={sectorIndicators}
          />
          <IndicatorPanel
            title="Industry Tier"
            weight={Math.round(TIER_WEIGHTS.industry * 100)}
            color={TIER_COLORS.industry}
            meta={industryMeta}
            values={industryIndicators}
          />
        </div>
      </Modal>
    </div>
  )
}
