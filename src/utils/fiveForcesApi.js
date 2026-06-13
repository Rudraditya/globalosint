// ─── Five Forces — Country Tier (20% weight) — Indicator API Mapping ────────
//
// These functions are MOCKS. Each one is shaped like the real fetchers in
// `api.js` (async, takes a country code, returns a plain number) so that it
// can be swapped for a live DBnomics / World Bank / Eurostat call without
// touching `deriveForcesFromIndicators` or any UI code below. The exception is
// `fetchTaxBurden`, which is real (World Bank `GC.TAX.TOTL.GD.ZS`).
//
// Note: the original "Time required to start a business" (`IC.REG.DURS`) and
// the rest of the Doing Business indicator set were removed from the World
// Bank API entirely after the 2021 Doing Business discontinuation — the API
// now returns "indicator not found" for them, so tax revenue (% of GDP) is
// used instead as the real regulatory/macro signal.
//
// Mapping summary (indicator → Five Forces dimension):
//   marketConcentration   → Rivalry              (low concentration = many rivals = high rivalry)
//   supplierConcentration → Supplier Power        (few large suppliers = high supplier power)
//   importDependency      → Buyer Power           (buyers can source from imports = more power)
//   startupCostPctGNI     → Threat of New Entry   (high startup cost = high barrier = low threat)
//   tariffRate            → Threat of New Entry   (high tariffs = protects incumbents = low threat)
//   taxRevenuePctGDP      → Threat of New Entry   (higher tax burden = higher cost of doing business = low threat)
//   rndExpenditurePctGDP  → Threat of Substitution (high R&D intensity = faster substitute innovation)

import { ALL_COUNTRIES, fetchWorldBankLatest } from './api'
import { computeCR4 } from './industryTaxonomy'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const iso2For = (countryCode) => ALL_COUNTRIES.find((c) => c.code === countryCode)?.iso2

// Hand-curated baseline for a few major economies; everything else falls
// back to a deterministic pseudo-random profile so every country code in
// `ALL_COUNTRIES` still returns a plausible (and stable) result.
const MOCK_INDICATORS = {
  IND: { marketConcentration: 0.18, supplierConcentration: 0.35, importDependency: 28, startupCostPctGNI: 13.8, rndExpenditurePctGDP: 0.64, tariffRate: 17.6 },
  USA: { marketConcentration: 0.42, supplierConcentration: 0.55, importDependency: 14, startupCostPctGNI: 1.0,  rndExpenditurePctGDP: 3.45, tariffRate: 3.4 },
  CHN: { marketConcentration: 0.30, supplierConcentration: 0.40, importDependency: 18, startupCostPctGNI: 0.5,  rndExpenditurePctGDP: 2.40, tariffRate: 7.5 },
  DEU: { marketConcentration: 0.38, supplierConcentration: 0.50, importDependency: 38, startupCostPctGNI: 2.1,  rndExpenditurePctGDP: 3.13, tariffRate: 5.0 },
  GBR: { marketConcentration: 0.40, supplierConcentration: 0.48, importDependency: 30, startupCostPctGNI: 0.3,  rndExpenditurePctGDP: 2.93, tariffRate: 5.0 },
  JPN: { marketConcentration: 0.45, supplierConcentration: 0.52, importDependency: 22, startupCostPctGNI: 7.5,  rndExpenditurePctGDP: 3.30, tariffRate: 4.0 },
  BRA: { marketConcentration: 0.28, supplierConcentration: 0.38, importDependency: 16, startupCostPctGNI: 4.0,  rndExpenditurePctGDP: 1.15, tariffRate: 13.4 },
}

// Deterministic per-country pseudo-randomness so codes without a curated
// entry still produce stable, repeatable mock indicators.
function seededRandom(seed) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return () => {
    h = (h * 1664525 + 1013904223) >>> 0
    return h / 0xffffffff
  }
}

function indicatorsFor(countryCode) {
  if (MOCK_INDICATORS[countryCode]) return MOCK_INDICATORS[countryCode]
  const rnd = seededRandom(countryCode)
  return {
    marketConcentration: parseFloat((0.15 + rnd() * 0.35).toFixed(2)),
    supplierConcentration: parseFloat((0.25 + rnd() * 0.45).toFixed(2)),
    importDependency: parseFloat((10 + rnd() * 35).toFixed(1)),
    startupCostPctGNI: parseFloat((0.5 + rnd() * 15).toFixed(1)),
    rndExpenditurePctGDP: parseFloat((0.3 + rnd() * 3.2).toFixed(2)),
    tariffRate: parseFloat((2 + rnd() * 18).toFixed(1)),
  }
}

// MOCK — swap for a real concentration-ratio source, e.g. World Bank Enterprise
// Surveys or a national competition authority's HHI dataset for the sector.
export async function fetchMarketConcentration(countryCode) {
  await delay(150)
  return indicatorsFor(countryCode).marketConcentration
}

// MOCK — swap for: fetchWorldBankIndicator(iso2, 'NV.IND.TOTL.ZS') or a sector-level
// supplier HHI from DBnomics input-output tables.
export async function fetchSupplierConcentration(countryCode) {
  await delay(150)
  return indicatorsFor(countryCode).supplierConcentration
}

// MOCK — swap for: fetchWorldBankIndicator(iso2, 'NE.IMP.GNFS.ZS') (imports, % of GDP)
// as a proxy for how easily buyers can switch to imported alternatives.
export async function fetchImportDependency(countryCode) {
  await delay(150)
  return indicatorsFor(countryCode).importDependency
}

// MOCK — swap for: fetchWorldBankIndicator(iso2, 'IC.REG.COST.PC.ZS') (Doing Business:
// cost of business start-up procedures, % of GNI per capita).
export async function fetchStartupCostIndex(countryCode) {
  await delay(150)
  return indicatorsFor(countryCode).startupCostPctGNI
}

// MOCK — swap for: fetchWorldBankIndicator(iso2, 'TM.TAX.MRCH.WM.AR.ZS') (tariff rate,
// applied, weighted mean, all products) as a trade-barrier proxy.
export async function fetchTariffRate(countryCode) {
  await delay(150)
  return indicatorsFor(countryCode).tariffRate
}

// MOCK — swap for: fetchWorldBankIndicator(iso2, 'GB.XPD.RSDV.GD.ZS') (R&D expenditure,
// % of GDP) as a proxy for the rate at which substitute products/technologies emerge.
export async function fetchRnDIntensity(countryCode) {
  await delay(150)
  return indicatorsFor(countryCode).rndExpenditurePctGDP
}

// REAL — World Bank GC.TAX.TOTL.GD.ZS: "Tax revenue (% of GDP)".
// Used as a proxy for the overall regulatory/fiscal burden a new entrant
// faces. Higher values mean a heavier tax burden, i.e. a stronger barrier to
// entry. Returns null if World Bank has no data for this country (the derive
// function below falls back gracefully, e.g. Nigeria has no data point).
export async function fetchTaxBurden(countryCode) {
  const iso2 = iso2For(countryCode)
  if (!iso2) return null
  try {
    const { value } = await fetchWorldBankLatest(iso2, 'GC.TAX.TOTL.GD.ZS')
    return value
  } catch {
    return null
  }
}

// Fetches every Country-tier indicator in parallel.
export async function fetchFiveForcesIndicators(countryCode) {
  const [marketConcentration, supplierConcentration, importDependency, startupCostPctGNI, tariffRate, rndExpenditurePctGDP, taxRevenuePctGDP] =
    await Promise.all([
      fetchMarketConcentration(countryCode),
      fetchSupplierConcentration(countryCode),
      fetchImportDependency(countryCode),
      fetchStartupCostIndex(countryCode),
      fetchTariffRate(countryCode),
      fetchRnDIntensity(countryCode),
      fetchTaxBurden(countryCode),
    ])
  return { marketConcentration, supplierConcentration, importDependency, startupCostPctGNI, tariffRate, rndExpenditurePctGDP, taxRevenuePctGDP }
}

export const clamp1to10 = (v) => Math.min(10, Math.max(1, Math.round(v)))

// Maps raw economic indicators onto 1–10 scores for each of Porter's Five Forces.
// This is the Country tier's full force vector (20% weight in the final blend).
export function deriveForcesFromIndicators(ind) {
  // Threat of entry: average three normalised barrier signals — startup cost,
  // tariffs, and (if available) the real World Bank tax burden (% of GDP).
  const barrierFromCost = clamp1to10(ind.startupCostPctGNI / 1.5)   // 0-15% GNI  → 0-10
  const barrierFromTariff = clamp1to10(ind.tariffRate / 2)          // 0-20%      → 0-10
  const barrierSignals = [barrierFromCost, barrierFromTariff]
  if (ind.taxRevenuePctGDP != null) {
    barrierSignals.push(clamp1to10(ind.taxRevenuePctGDP / 2.5)) // 0-25% of GDP → 0-10
  }
  const avgBarrier = barrierSignals.reduce((a, b) => a + b, 0) / barrierSignals.length

  return {
    // Fragmented market (low concentration) → many rivals → high rivalry
    rivalry: clamp1to10(10 - ind.marketConcentration * 10),

    // Concentrated supplier base → suppliers can dictate terms
    supplierPower: clamp1to10(ind.supplierConcentration * 10),

    // Heavy reliance on imports gives buyers more sourcing alternatives → more leverage
    buyerPower: clamp1to10(ind.importDependency / 5),

    // High average barrier (cost + tariffs + regulatory days) = low threat of entry
    threatOfEntry: clamp1to10(10 - avgBarrier),

    // High R&D intensity = faster pace of substitute/alternative innovation
    threatOfSubstitution: clamp1to10(ind.rndExpenditurePctGDP * 2),
  }
}

// ─── Sector Tier (30% weight) — Capacity Utilization & PPI ──────────────────
//
// MOCK — swap for OECD STAN sector-level capacity-utilization series and a
// national statistics agency's Producer Price Index (PPI) YoY series, both
// keyed by (sector, country). Deterministic per (sector, country) so results
// are stable across reloads.

function sectorIndicatorsFor(sectorId, countryCode) {
  const rnd = seededRandom(`${sectorId}-${countryCode}`)
  return {
    capacityUtilization: parseFloat((60 + rnd() * 35).toFixed(1)), // 60% - 95%
    ppiYoY: parseFloat((-5 + rnd() * 20).toFixed(1)),               // -5% - +15%
  }
}

export async function fetchSectorIndicators(sectorId, countryCode) {
  await delay(150)
  return sectorIndicatorsFor(sectorId, countryCode)
}

// Inherits the Country tier's vector, then refines:
//   - rivalry: low capacity utilization (overcapacity) → more price-based rivalry
//   - supplierPower: rising PPI (input costs) → suppliers gaining pricing power
// The other three forces pass through unchanged from the Country tier.
export function deriveSectorForces(countryForces, sectorIndicators) {
  const { capacityUtilization, ppiYoY } = sectorIndicators
  const rivalrySignal = clamp1to10((100 - capacityUtilization) / 4)
  const supplierPowerSignal = clamp1to10(5 + ppiYoY / 2)
  return {
    ...countryForces,
    rivalry: clamp1to10((countryForces.rivalry + rivalrySignal) / 2),
    supplierPower: clamp1to10((countryForces.supplierPower + supplierPowerSignal) / 2),
  }
}

// ─── Industry Tier (50% weight) — Market Concentration & Trade Exposure ─────
//
// `cr4` comes from `computeCR4(industry.peers)` — see industryTaxonomy.js for
// sourcing notes on those peer revenue figures.
//
// `importPenetration` is MOCK — swap for a UN Comtrade HS6 query
// (reporter=countryCode, partner=World, commodity=industry.hs6.code) expressed
// as imports / apparent domestic consumption (%). UN Comtrade requires a
// subscription key and isn't proxied in vite.config.js.
//
// Software & IT Services has no HS6 goods code, so it instead uses the REAL
// World Bank indicator BX.GSR.CCIS.ZS (ICT service exports, % of total service
// exports) as its trade-exposure signal.

function importPenetrationFor(industryId, countryCode) {
  const rnd = seededRandom(`${industryId}-${countryCode}`)
  return parseFloat((5 + rnd() * 55).toFixed(1)) // 5% - 60%
}

export async function fetchIndustryIndicators(industry, countryCode) {
  const { cr4 } = computeCR4(industry.peers)
  const iso2 = iso2For(countryCode)

  if (industry.realIndustryIndicator && iso2) {
    try {
      const { value } = await fetchWorldBankLatest(iso2, industry.realIndustryIndicator)
      return { cr4, importPenetration: Math.min(100, Math.max(0, value)), tradeSource: 'World Bank BX.GSR.CCIS.ZS (ICT service exports, % of services)' }
    } catch {
      // fall through to mock if World Bank has no data for this country
    }
  }

  await delay(150)
  return {
    cr4,
    importPenetration: importPenetrationFor(industry.id, countryCode),
    tradeSource: industry.hs6 ? `Mock HS6 ${industry.hs6.code} (${industry.hs6.label})` : 'Mock',
  }
}

// Inherits the Sector tier's vector, then refines:
//   - rivalry: high CR4 (concentrated/oligopolistic) → less price-based rivalry
//   - buyerPower: high import penetration / ICT export exposure → buyers have
//     more alternative sources → more leverage
// The other three forces pass through unchanged from the Sector tier.
export function deriveIndustryForces(sectorForces, industryIndicators) {
  const { cr4, importPenetration } = industryIndicators
  const rivalrySignal = clamp1to10(10 - cr4 / 10)
  const buyerPowerSignal = clamp1to10(importPenetration / 10)
  return {
    ...sectorForces,
    rivalry: clamp1to10((sectorForces.rivalry + rivalrySignal) / 2),
    buyerPower: clamp1to10((sectorForces.buyerPower + buyerPowerSignal) / 2),
  }
}
