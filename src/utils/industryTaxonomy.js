// ─── Sector & Industry Taxonomy ──────────────────────────────────────────────
//
// Hierarchical Sector → Industry taxonomy for the Market Entry Strategy Lab.
// Each industry carries:
//
//   - an HS6 commodity code, used as the basis for the mock import-penetration
//     / trade-exposure signal at the Industry tier. A real implementation would
//     query UN Comtrade's HS6 trade series for (reporter country, partner=World,
//     commodity=hs6.code) — that API requires a subscription key and isn't
//     proxied in vite.config.js, so it's mocked here.
//
//   - a small peer set with illustrative revenue figures (USD billions, rough
//     FY company-wide figures) used to compute a CR4 concentration ratio. A
//     real implementation would source per-segment revenue from SEC EDGAR XBRL
//     `companyconcept` (US filers) or Yahoo Finance
//     `quoteSummary.financialData.totalRevenue` for global peers — both return
//     `401 Invalid Crumb` / require auth through this dev proxy, so the figures
//     below are hand-curated placeholders.
//
// Software & IT Services has no meaningful HS6 goods code (it's a services
// industry), so its industry-tier "trade exposure" signal instead uses the real
// World Bank indicator `BX.GSR.CCIS.ZS` (ICT service exports, % of total service
// exports) — see `realIndustryIndicator` below and `fiveForcesApi.js`.

export const SECTORS = [
  { id: 'energy',      label: 'Energy',                  color: '#fbbf24' },
  { id: 'automotive',  label: 'Automotive',               color: '#38bdf8' },
  { id: 'electronics', label: 'Electronics',              color: '#c084fc' },
  { id: 'it',          label: 'Information Technology',   color: '#4ade80' },
]

export const INDUSTRIES = [
  {
    id: 'oil-gas', sectorId: 'energy', label: 'Oil & Gas Extraction',
    hs6: { code: '270900', label: 'Petroleum oils, crude' },
    peers: [
      { name: 'Saudi Aramco',  revenueUSDbn: 440 },
      { name: 'ExxonMobil',    revenueUSDbn: 344 },
      { name: 'Shell',         revenueUSDbn: 316 },
      { name: 'TotalEnergies', revenueUSDbn: 218 },
      { name: 'Chevron',       revenueUSDbn: 200 },
    ],
  },
  {
    id: 'solar', sectorId: 'energy', label: 'Renewable Energy (Solar)',
    hs6: { code: '854142', label: 'Photovoltaic cells & modules' },
    peers: [
      { name: 'LONGi Green Energy', revenueUSDbn: 14.0 },
      { name: 'JinkoSolar',         revenueUSDbn: 12.0 },
      { name: 'Trina Solar',        revenueUSDbn: 11.0 },
      { name: 'Canadian Solar',     revenueUSDbn: 7.0 },
      { name: 'First Solar',        revenueUSDbn: 3.3 },
    ],
  },
  {
    id: 'passenger-vehicles', sectorId: 'automotive', label: 'Passenger Vehicles',
    hs6: { code: '870323', label: 'Motor cars, 1500-3000cc' },
    peers: [
      { name: 'Volkswagen Group', revenueUSDbn: 322 },
      { name: 'Toyota',           revenueUSDbn: 280 },
      { name: 'Stellantis',       revenueUSDbn: 190 },
      { name: 'General Motors',   revenueUSDbn: 171 },
      { name: 'Hyundai Motor',    revenueUSDbn: 122 },
    ],
  },
  {
    id: 'auto-components', sectorId: 'automotive', label: 'Auto Components',
    hs6: { code: '870899', label: 'Motor vehicle parts & accessories, nes' },
    peers: [
      { name: 'Bosch',       revenueUSDbn: 92 },
      { name: 'Denso',       revenueUSDbn: 50 },
      { name: 'Magna',       revenueUSDbn: 43 },
      { name: 'ZF Friedrichshafen', revenueUSDbn: 46 },
      { name: 'Continental', revenueUSDbn: 41 },
    ],
  },
  {
    id: 'semiconductors', sectorId: 'electronics', label: 'Semiconductors',
    hs6: { code: '854232', label: 'Memories & integrated circuits' },
    peers: [
      { name: 'Samsung Electronics', revenueUSDbn: 200 },
      { name: 'TSMC',                revenueUSDbn: 75 },
      { name: 'Intel',               revenueUSDbn: 54 },
      { name: 'Micron Technology',   revenueUSDbn: 25 },
      { name: 'SK Hynix',            revenueUSDbn: 46 },
    ],
  },
  {
    id: 'consumer-electronics', sectorId: 'electronics', label: 'Consumer Electronics',
    hs6: { code: '851713', label: 'Smartphones' },
    peers: [
      { name: 'Apple',               revenueUSDbn: 383 },
      { name: 'Samsung Electronics', revenueUSDbn: 200 },
      { name: 'Huawei',              revenueUSDbn: 119 },
      { name: 'Xiaomi',              revenueUSDbn: 37 },
      { name: 'OPPO (BBK)',          revenueUSDbn: 35 },
    ],
  },
  {
    id: 'it-hardware', sectorId: 'it', label: 'IT Hardware',
    hs6: { code: '847130', label: 'Portable automatic data processing machines' },
    peers: [
      { name: 'Dell Technologies', revenueUSDbn: 88 },
      { name: 'HP Inc.',           revenueUSDbn: 54 },
      { name: 'Lenovo',            revenueUSDbn: 62 },
      { name: 'Apple',             revenueUSDbn: 383 },
      { name: 'ASUSTeK',           revenueUSDbn: 17 },
    ],
  },
  {
    id: 'software-it-services', sectorId: 'it', label: 'Software & IT Services',
    hs6: null,
    realIndustryIndicator: 'BX.GSR.CCIS.ZS', // ICT service exports, % of total service exports
    peers: [
      { name: 'Microsoft', revenueUSDbn: 245 },
      { name: 'Oracle',    revenueUSDbn: 52 },
      { name: 'Accenture', revenueUSDbn: 64 },
      { name: 'SAP',       revenueUSDbn: 34 },
      { name: 'TCS',       revenueUSDbn: 29 },
    ],
  },
]

export function getIndustriesForSector(sectorId) {
  return INDUSTRIES.filter((ind) => ind.sectorId === sectorId)
}

export function getIndustry(industryId) {
  return INDUSTRIES.find((ind) => ind.id === industryId)
}

export function getSector(sectorId) {
  return SECTORS.find((s) => s.id === sectorId)
}

// Concentration ratio of the top 4 peers by revenue, as a % of the peer set's
// total revenue. Returns { cr4, top4, total } where top4 is the peer list
// (sorted desc, with a `share` % attached) and total is the full peer-set sum.
export function computeCR4(peers) {
  const sorted = [...peers].sort((a, b) => b.revenueUSDbn - a.revenueUSDbn)
  const total = sorted.reduce((s, p) => s + p.revenueUSDbn, 0)
  const top4 = sorted.slice(0, 4).map((p) => ({
    ...p,
    share: total > 0 ? parseFloat(((p.revenueUSDbn / total) * 100).toFixed(1)) : 0,
  }))
  const cr4 = total > 0
    ? parseFloat((top4.reduce((s, p) => s + p.revenueUSDbn, 0) / total * 100).toFixed(1))
    : 0
  return { cr4, top4, total }
}

export function classifyConcentration(cr4) {
  if (cr4 >= 70) return 'High Concentration (Oligopoly)'
  if (cr4 >= 40) return 'Moderate Concentration'
  return 'Fragmented (Low Concentration)'
}
