import axios from 'axios'

// ─── Country Definitions ─────────────────────────────────────────────────────

export const ALL_COUNTRIES = [
  { code: 'IND', label: 'India',          iso2: 'IN', color: '#ff6b35', region: 'Asia',        eurostat: null,  g20: true  },
  { code: 'USA', label: 'United States',  iso2: 'US', color: '#818cf8', region: 'Americas',    eurostat: null,  g20: true  },
  { code: 'CHN', label: 'China',          iso2: 'CN', color: '#ff4444', region: 'Asia',        eurostat: null,  g20: true  },
  { code: 'DEU', label: 'Germany',        iso2: 'DE', color: '#00e5ff', region: 'Europe',      eurostat: 'DE',  g20: true  },
  { code: 'GBR', label: 'United Kingdom', iso2: 'GB', color: '#c084fc', region: 'Europe',      eurostat: null,  g20: true  },
  { code: 'FRA', label: 'France',         iso2: 'FR', color: '#60a5fa', region: 'Europe',      eurostat: 'FR',  g20: true  },
  { code: 'JPN', label: 'Japan',          iso2: 'JP', color: '#fbbf24', region: 'Asia',        eurostat: null,  g20: true  },
  { code: 'ITA', label: 'Italy',          iso2: 'IT', color: '#4ade80', region: 'Europe',      eurostat: 'IT',  g20: true  },
  { code: 'CAN', label: 'Canada',         iso2: 'CA', color: '#f87171', region: 'Americas',    eurostat: null,  g20: true  },
  { code: 'KOR', label: 'South Korea',    iso2: 'KR', color: '#38bdf8', region: 'Asia',        eurostat: null,  g20: true  },
  { code: 'AUS', label: 'Australia',      iso2: 'AU', color: '#86efac', region: 'Oceania',     eurostat: null,  g20: true  },
  { code: 'BRA', label: 'Brazil',         iso2: 'BR', color: '#facc15', region: 'Americas',    eurostat: null,  g20: true  },
  { code: 'ARG', label: 'Argentina',      iso2: 'AR', color: '#c4b5fd', region: 'Americas',    eurostat: null,  g20: true  },
  { code: 'MEX', label: 'Mexico',         iso2: 'MX', color: '#fde68a', region: 'Americas',    eurostat: null,  g20: true  },
  { code: 'SAU', label: 'Saudi Arabia',   iso2: 'SA', color: '#fb923c', region: 'Middle East', eurostat: null,  g20: true  },
  { code: 'TUR', label: 'Turkey',         iso2: 'TR', color: '#fb7185', region: 'Europe/Asia', eurostat: null,  g20: true  },
  { code: 'IDN', label: 'Indonesia',      iso2: 'ID', color: '#a3e635', region: 'Asia',        eurostat: null,  g20: true  },
  { code: 'RUS', label: 'Russia',         iso2: 'RU', color: '#e879f9', region: 'Europe/Asia', eurostat: null,  g20: true  },
  { code: 'ZAF', label: 'South Africa',   iso2: 'ZA', color: '#2dd4bf', region: 'Africa',      eurostat: null,  g20: true  },
  { code: 'NGA', label: 'Nigeria',        iso2: 'NG', color: '#bbf7d0', region: 'Africa',      eurostat: null,  g20: false },
  { code: 'EGY', label: 'Egypt',          iso2: 'EG', color: '#fde047', region: 'Africa',      eurostat: null,  g20: false },
]

// ─── World Bank helpers ──────────────────────────────────────────────────────

const WB_BASE = 'https://api.worldbank.org/v2'

async function wbFetch(iso2, indicator, yearsBack = 12) {
  const year = new Date().getFullYear()
  const from = year - yearsBack
  const url = `${WB_BASE}/country/${iso2}/indicator/${indicator}?format=json&date=${from}:${year}&per_page=30`
  const { data } = await axios.get(url)
  const records = data?.[1]
  if (!records?.length) throw new Error(`No WB data: ${indicator}/${iso2}`)
  return records
    .filter((r) => r.value != null)
    .map((r) => ({ year: String(r.date), value: parseFloat(Number(r.value).toFixed(6)) }))
    .sort((a, b) => a.year.localeCompare(b.year))
}

// GDP in current USD billions
export async function fetchGDPUSD(iso2) {
  const rows = await wbFetch(iso2, 'NY.GDP.MKTP.CD', 12)
  return rows.map((r) => ({ year: r.year, value: parseFloat((r.value / 1e9).toFixed(2)) }))
}

// Latest available { year, value } for any World Bank indicator code.
export async function fetchWorldBankLatest(iso2, indicatorCode, yearsBack = 12) {
  const rows = await wbFetch(iso2, indicatorCode, yearsBack)
  const latest = rows.at(-1)
  if (!latest) throw new Error(`No WB data: ${indicatorCode}/${iso2}`)
  return latest
}

// ─── Eurostat (EU countries only) ────────────────────────────────────────────

export async function fetchEurostatGDP(eurostatCode) {
  const url = `/eurostat-api/eurostat/api/dissemination/statistics/1.0/data/nama_10_gdp?format=JSON&unit=CP_MEUR&na_item=B1GQ&geo=${eurostatCode}&sinceTimePeriod=2013`
  const { data } = await axios.get(url)

  const timeIndex = data?.dimension?.time?.category?.index ?? {}
  const timeLabels = data?.dimension?.time?.category?.label ?? {}
  const values = data?.value ?? {}
  const geoSize = Object.keys(data?.dimension?.geo?.category?.index ?? {}).length || 1
  const geoIdx = data?.dimension?.geo?.category?.index?.[eurostatCode] ?? 0

  const result = []
  for (const [key, tIdx] of Object.entries(timeIndex)) {
    const pos = tIdx * geoSize + geoIdx
    const val = values[String(pos)]
    if (val != null) result.push({ year: String(timeLabels[key] ?? key), valueMEUR: val })
  }
  return result.sort((a, b) => a.year.localeCompare(b.year))
}

// GDP in USD billions — Eurostat for EU, World Bank for all others
export async function fetchGDPForCountry(countryDef, eurToUsd = 1.08) {
  if (countryDef.eurostat) {
    try {
      const rows = await fetchEurostatGDP(countryDef.eurostat)
      return {
        source: 'Eurostat',
        data: rows.map((r) => ({
          year: r.year,
          value: parseFloat((r.valueMEUR * 1e6 * eurToUsd / 1e9).toFixed(2)),
        })),
      }
    } catch {
      // fall through to World Bank
    }
  }
  const rows = await fetchGDPUSD(countryDef.iso2)
  return { source: 'World Bank', data: rows }
}

// ─── FOREX (Yahoo Finance) — 24-hour cache ───────────────────────────────────

let _forexCache = null
let _forexCacheTime = 0
const FOREX_TTL = 24 * 60 * 60 * 1000

export const FOREX_PAIRS = [
  { pair: 'EURUSD=X', label: 'EUR/USD', base: 'EUR', quote: 'USD' },
  { pair: 'GBPUSD=X', label: 'GBP/USD', base: 'GBP', quote: 'USD' },
  { pair: 'USDINR=X', label: 'USD/INR', base: 'USD', quote: 'INR' },
  { pair: 'USDJPY=X', label: 'USD/JPY', base: 'USD', quote: 'JPY' },
  { pair: 'USDCNY=X', label: 'USD/CNY', base: 'USD', quote: 'CNY' },
  { pair: 'USDBRL=X', label: 'USD/BRL', base: 'USD', quote: 'BRL' },
  { pair: 'USDKRW=X', label: 'USD/KRW', base: 'USD', quote: 'KRW' },
  { pair: 'AUDUSD=X', label: 'AUD/USD', base: 'AUD', quote: 'USD' },
  { pair: 'USDCAD=X', label: 'USD/CAD', base: 'USD', quote: 'CAD' },
  { pair: 'USDZAR=X', label: 'USD/ZAR', base: 'USD', quote: 'ZAR' },
]

async function _fetchForexPair(p) {
  const url = `/yahoo-finance/v8/finance/chart/${encodeURIComponent(p.pair)}?interval=1d&range=5d`
  const { data } = await axios.get(url)
  const result = data?.chart?.result?.[0]
  if (!result) throw new Error(`No data for ${p.pair}`)
  const closes = result.indicators?.quote?.[0]?.close ?? []
  let latest = null, prev = null
  for (let i = closes.length - 1; i >= 0; i--) {
    if (closes[i] != null) { if (latest == null) latest = closes[i]; else if (prev == null) { prev = closes[i]; break } }
  }
  if (latest == null) throw new Error(`No close for ${p.pair}`)
  const change = (prev != null && prev !== 0) ? parseFloat((((latest - prev) / prev) * 100).toFixed(3)) : null
  return { ...p, rate: parseFloat(latest.toFixed(4)), change }
}

export async function fetchForexRates() {
  if (_forexCache && Date.now() - _forexCacheTime < FOREX_TTL) return _forexCache
  const results = await Promise.allSettled(FOREX_PAIRS.map(_fetchForexPair))
  const rates = results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { ...FOREX_PAIRS[i], rate: null, change: null, error: true }
  )
  _forexCache = rates
  _forexCacheTime = Date.now()
  return rates
}

export async function getEURUSD() {
  try {
    const rates = await fetchForexRates()
    return rates.find((r) => r.pair === 'EURUSD=X')?.rate ?? 1.08
  } catch { return 1.08 }
}

// ─── Commodity Prices (Yahoo Finance) — 5-min refresh ───────────────────────

export const COMMODITIES = [
  { id: 'wti',       label: 'Crude Oil (WTI)',  ticker: 'CL=F',  unit: 'USD/bbl',   category: 'Energy'      },
  { id: 'brent',     label: 'Brent Crude',       ticker: 'BZ=F',  unit: 'USD/bbl',   category: 'Energy'      },
  { id: 'natgas',    label: 'Natural Gas',       ticker: 'NG=F',  unit: 'USD/MMBtu', category: 'Energy'      },
  { id: 'heatoil',   label: 'Heating Oil',       ticker: 'HO=F',  unit: 'USD/gal',   category: 'Energy'      },
  { id: 'gold',      label: 'Gold',              ticker: 'GC=F',  unit: 'USD/oz',    category: 'Metals'      },
  { id: 'silver',    label: 'Silver',            ticker: 'SI=F',  unit: 'USD/oz',    category: 'Metals'      },
  { id: 'copper',    label: 'Copper',            ticker: 'HG=F',  unit: 'USD/lb',    category: 'Metals'      },
  { id: 'aluminium', label: 'Aluminium',         ticker: 'ALI=F', unit: 'USD/MT',    category: 'Metals'      },
  { id: 'corn',      label: 'Corn',              ticker: 'ZC=F',  unit: 'cents/bu',  category: 'Agriculture' },
  { id: 'wheat',     label: 'Wheat',             ticker: 'ZW=F',  unit: 'cents/bu',  category: 'Agriculture' },
  { id: 'soybeans',  label: 'Soybeans',          ticker: 'ZS=F',  unit: 'cents/bu',  category: 'Agriculture' },
]

async function _fetchCommodity(c) {
  const url = `/yahoo-finance/v8/finance/chart/${encodeURIComponent(c.ticker)}?interval=5m&range=1d`
  const { data } = await axios.get(url)
  const result = data?.chart?.result?.[0]
  if (!result) throw new Error(`No data for ${c.ticker}`)

  const closes = result.indicators?.quote?.[0]?.close ?? []
  const timestamps = result.timestamp ?? []

  let latest = null, latestTs = null, dayOpen = null
  for (let i = closes.length - 1; i >= 0; i--) {
    if (closes[i] != null) { latest = closes[i]; latestTs = timestamps[i]; break }
  }
  for (let i = 0; i < closes.length; i++) {
    if (closes[i] != null) { dayOpen = closes[i]; break }
  }

  const change = latest != null && dayOpen != null && dayOpen !== 0
    ? parseFloat((((latest - dayOpen) / dayOpen) * 100).toFixed(2)) : null

  const series = timestamps
    .map((ts, i) => ({ time: new Date(ts * 1000).toISOString().slice(11, 16), price: closes[i] != null ? parseFloat(closes[i].toFixed(2)) : null }))
    .filter((d) => d.price !== null)
    .slice(-60)

  return { ...c, price: latest != null ? parseFloat(latest.toFixed(2)) : null, change, series, updatedAt: latestTs ? new Date(latestTs * 1000) : new Date() }
}

export async function fetchAllCommodities() {
  const results = await Promise.allSettled(COMMODITIES.map(_fetchCommodity))
  return results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { ...COMMODITIES[i], price: null, change: null, series: [], error: true, updatedAt: new Date() }
  )
}

// ─── India Macro (World Bank) ─────────────────────────────────────────────────

export const INDIA_INDICATORS = {
  gdp_nom:     { code: 'NY.GDP.MKTP.CD',     label: 'GDP (Nominal)',         unit: 'B USD',  divisor: 1e9  },
  gdp_real:    { code: 'NY.GDP.MKTP.KD',     label: 'GDP (Real)',            unit: 'B USD',  divisor: 1e9  },
  gdp_defl:    { code: 'NY.GDP.DEFL.ZS',     label: 'GDP Deflator',          unit: 'index',  divisor: 1    },
  inflation:   { code: 'FP.CPI.TOTL.ZG',     label: 'CPI Inflation',         unit: '%',      divisor: 1    },
  fdi:         { code: 'BX.KLT.DINV.CD.WD',  label: 'FDI Net Inflows',       unit: 'B USD',  divisor: 1e9  },
  fii:         { code: 'BX.PEF.TOTL.CD.WD',  label: 'Portfolio Equity (FII)','unit': 'B USD', divisor: 1e9  },
  exports:     { code: 'NE.EXP.GNFS.CD',     label: 'Exports (G&S)',         unit: 'B USD',  divisor: 1e9  },
  imports:     { code: 'NE.IMP.GNFS.CD',     label: 'Imports (G&S)',         unit: 'B USD',  divisor: 1e9  },
  int_rate:    { code: 'FR.INR.LEND',         label: 'Lending Interest Rate', unit: '%',      divisor: 1    },
  forex_res:   { code: 'FI.RES.TOTL.CD',     label: 'Forex Reserves',        unit: 'B USD',  divisor: 1e9  },
  gross_sav:   { code: 'NY.GNS.ICTR.GN.ZS',  label: 'Gross Savings',         unit: '% GNI',  divisor: 1    },
  ext_debt:    { code: 'DT.DOD.DECT.CD',     label: 'External Debt',         unit: 'B USD',  divisor: 1e9  },
}

// Fetch India forex reserves from IMF quarterly IFS data (1L_D_BP6_USD = reserve assets, USD millions).
// IMF publishes with ~1 quarter lag — gives 2024/2025 data that World Bank doesn't have yet.
async function _fetchIMFForexReservesIndia() {
  const url = '/imf-data/REST/SDMX_JSON.svc/CompactData/IFS/Q.IN.1L_D_BP6_USD.?startPeriod=2013-Q1'
  const { data } = await axios.get(url)

  const series = data?.CompactData?.DataSet?.Series
  if (!series) throw new Error('No IMF series')

  const obs = Array.isArray(series.Obs) ? series.Obs : (series.Obs ? [series.Obs] : [])
  const unitMult = parseInt(series['@UNIT_MULT'] ?? '6')  // 6 = millions USD
  const tobillions = Math.pow(10, unitMult) / 1e9          // → USD billions

  // Keep the latest available quarter per year
  const byYear = {}
  for (const o of obs) {
    const period = o['@TIME_PERIOD'] // e.g. "2025-Q1"
    const val = parseFloat(o['@OBS_VALUE'])
    if (isNaN(val) || !period.includes('-')) continue
    const [year, qStr] = period.split('-')
    const q = parseInt(qStr.replace('Q', ''))
    if (!byYear[year] || q > byYear[year].q) {
      byYear[year] = { q, value: parseFloat((val * tobillions).toFixed(2)) }
    }
  }

  return Object.entries(byYear)
    .map(([year, { value }]) => ({ year, value }))
    .sort((a, b) => a.year.localeCompare(b.year))
}

export async function fetchIndiaMacro() {
  const out = {}
  await Promise.allSettled(
    Object.entries(INDIA_INDICATORS).map(async ([key, ind]) => {
      try {
        const rows = await wbFetch('IN', ind.code, 12)
        const series = rows.map((r) => ({ year: r.year, value: parseFloat((r.value / ind.divisor).toFixed(3)) }))
        out[key] = { ...ind, series, latest: series.at(-1)?.value ?? null, latestYear: series.at(-1)?.year ?? null }
      } catch {
        out[key] = { ...ind, series: [], latest: null, latestYear: null, error: true }
      }
    })
  )

  // Supplement forex_res with IMF quarterly data (more current than World Bank annual)
  try {
    const imfRows = await _fetchIMFForexReservesIndia()
    const existing = out['forex_res']?.series ?? []

    // Build year map: World Bank base, IMF fills or overrides recent years
    const byYear = Object.fromEntries(existing.map((r) => [r.year, r.value]))
    for (const r of imfRows) {
      // Only override/add if IMF year is newer than or equal to the latest WB year
      const latestWBYear = existing.at(-1)?.year ?? '0'
      if (r.year >= latestWBYear) byYear[r.year] = r.value
    }

    const merged = Object.entries(byYear)
      .map(([year, value]) => ({ year, value }))
      .sort((a, b) => a.year.localeCompare(b.year))

    if (merged.length > 0) {
      out['forex_res'] = {
        ...INDIA_INDICATORS['forex_res'],
        series: merged,
        latest: merged.at(-1)?.value ?? null,
        latestYear: merged.at(-1)?.year ?? null,
      }
    }
  } catch { /* fall back to World Bank only */ }

  return out
}

// ─── India INR Forex Rates (Yahoo Finance) ───────────────────────────────────
// Replaces unreliable fluentax endpoint; Yahoo Finance proxy is already working.

const INR_PAIRS = [
  { ticker: 'USDINR=X', base: 'USD', label: 'USD/INR' },
  { ticker: 'EURINR=X', base: 'EUR', label: 'EUR/INR' },
  { ticker: 'GBPINR=X', base: 'GBP', label: 'GBP/INR' },
]

export async function fetchIndiaRBIForex() {
  const results = await Promise.allSettled(INR_PAIRS.map(async (p) => {
    const url = `/yahoo-finance/v8/finance/chart/${encodeURIComponent(p.ticker)}?interval=1d&range=5d`
    const { data } = await axios.get(url)
    const result = data?.chart?.result?.[0]
    const closes = result?.indicators?.quote?.[0]?.close ?? []
    const timestamps = result?.timestamp ?? []
    let rate = null, ts = null
    for (let i = closes.length - 1; i >= 0; i--) {
      if (closes[i] != null) { rate = closes[i]; ts = timestamps[i]; break }
    }
    return { ...p, rate: rate ? parseFloat(rate.toFixed(4)) : null, date: ts ? new Date(ts * 1000).toLocaleDateString('en-IN') : null }
  }))
  const rates = {}
  results.forEach((r) => {
    if (r.status === 'fulfilled' && r.value.rate != null) {
      rates[r.value.base] = { rate: r.value.rate, label: r.value.label, date: r.value.date }
    }
  })
  if (!Object.keys(rates).length) throw new Error('No INR rates available')
  return { rates, source: 'Yahoo Finance' }
}


// ─── DBnomics / OECD KEI (Industrial Production) ────────────────────────────

const DBNOMICS_BASE = 'https://api.db.nomics.world/v22'

const OECD_SERIES = {
  USA: 'PRINTO01.USA.ST.M', DEU: 'PRINTO01.DEU.ST.M', JPN: 'PRINTO01.JPN.ST.M',
  GBR: 'PRINTO01.GBR.ST.M', FRA: 'PRINTO01.FRA.ST.M', CAN: 'PRINTO01.CAN.ST.M',
  ITA: 'PRINTO01.ITA.ST.M', KOR: 'PRINTO01.KOR.ST.M', AUS: 'PRINTO01.AUS.ST.M',
  MEX: 'PRINTO01.MEX.ST.M', TUR: 'PRINTO01.TUR.ST.M',
}

export function hasOECDSeries(code) { return !!OECD_SERIES[code] }

export async function fetchIndustrialProduction(countryCode) {
  const seriesCode = OECD_SERIES[countryCode]
  if (!seriesCode) throw new Error(`No OECD series for ${countryCode}`)
  const url = `${DBNOMICS_BASE}/series/OECD/KEI/${seriesCode}?observations=1`
  const { data } = await axios.get(url)
  const series = data?.series?.docs?.[0]
  if (!series) throw new Error('Series not found')
  const periods = series.period, values = series.value
  if (!periods?.length || !values?.length) throw new Error('No observations')
  const all = periods
    .map((p, i) => { const v = typeof values[i] === 'string' ? parseFloat(values[i]) : Number(values[i]); return { period: p, value: v } })
    .filter((d) => !isNaN(d.value) && isFinite(d.value))
  return all.slice(-72)
}

export function computeAnnualGrowth(observations) {
  const annual = {}
  for (const { period, value } of observations) {
    const y = period.slice(0, 4)
    if (!annual[y]) annual[y] = []
    annual[y].push(value)
  }
  const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length
  const years = Object.keys(annual).sort()
  return years.slice(1).reduce((acc, year) => {
    const py = String(Number(year) - 1)
    if (!annual[py]?.length) return acc
    const curr = avg(annual[year]), prev = avg(annual[py])
    if (prev === 0) return acc
    acc.push({ year, growth: parseFloat((((curr - prev) / prev) * 100).toFixed(2)) })
    return acc
  }, [])
}

export async function fetchIndustryGDP(countryCode) {
  const c = ALL_COUNTRIES.find((x) => x.code === countryCode)
  if (!c) throw new Error(`Unknown country ${countryCode}`)
  const rows = await wbFetch(c.iso2, 'NV.IND.TOTL.ZS', 12)
  return rows
}

// ─── Market Snapshot (Yahoo Finance) ─────────────────────────────────────────

const MARKET_TICKERS = {
  'S&P 500': 'SPY', 'Global Industry ETF': 'VIS',
  'Crude Oil (WTI)': 'CL=F', 'Copper ETF': 'CPER', 'US Dollar Index': 'UUP',
}

async function _fetchTicker(symbol, label) {
  const url = `/yahoo-finance/v8/finance/chart/${symbol}?interval=1d&range=1mo`
  const { data } = await axios.get(url)
  const result = data?.chart?.result?.[0]
  if (!result) throw new Error(`No data for ${symbol}`)
  const quotes = result.indicators?.quote?.[0]
  const timestamps = result.timestamp
  if (!quotes || !timestamps?.length) throw new Error(`Incomplete data for ${symbol}`)
  const closes = quotes.close ?? []
  let latest = null, first = null
  for (let i = closes.length - 1; i >= 0; i--) { if (closes[i] != null) { latest = closes[i]; break } }
  for (let i = 0; i < closes.length; i++) { if (closes[i] != null) { first = closes[i]; break } }
  if (latest == null || first == null) throw new Error(`No valid close for ${symbol}`)
  const change1M = parseFloat((((latest - first) / first) * 100).toFixed(2))
  const series = timestamps
    .map((ts, i) => ({ date: new Date(ts * 1000).toISOString().slice(0, 10), close: closes[i] != null ? parseFloat(closes[i].toFixed(2)) : null }))
    .filter((d) => d.close !== null)
  return { symbol, label, latest: parseFloat(latest.toFixed(2)), change1M, series }
}

export async function fetchMarketData() {
  const results = await Promise.allSettled(
    Object.entries(MARKET_TICKERS).map(([label, sym]) => _fetchTicker(sym, label))
  )
  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value
    const [label, symbol] = Object.entries(MARKET_TICKERS)[i]
    return { symbol, label, latest: null, change1M: null, series: [], error: r.reason?.message }
  })
}
