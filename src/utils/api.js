import axios from 'axios'

// ─── DBnomics ────────────────────────────────────────────────────────────────

const DBNOMICS_BASE = 'https://api.db.nomics.world/v22'

// OECD KEI PRINTO01 monthly index (ST.M) — correct series code format is
// PRINTO01.{COUNTRY}.ST.M  (NOT {COUNTRY}.PRINTO01.…).
// The last_n_periods param causes HTTP 400 on v22; slice client-side instead.
const OECD_SERIES = {
  USA: 'PRINTO01.USA.ST.M',
  DEU: 'PRINTO01.DEU.ST.M',
  JPN: 'PRINTO01.JPN.ST.M',
}

export async function fetchIndustrialProduction(countryCode) {
  const seriesCode = OECD_SERIES[countryCode]
  if (!seriesCode) throw new Error(`No OECD series for ${countryCode}`)

  // observations=1 embeds period/value arrays; last_n_periods is unsupported → slice below
  const url = `${DBNOMICS_BASE}/series/OECD/KEI/${seriesCode}?observations=1`
  const { data } = await axios.get(url)
  const series = data?.series?.docs?.[0]
  if (!series) throw new Error('Series not found in DBnomics response')

  const periods = series.period
  const values = series.value
  if (!periods?.length || !values?.length) throw new Error('No observations in series')

  const all = periods
    .map((p, i) => {
      const raw = values[i]
      const value = typeof raw === 'string' ? parseFloat(raw) : Number(raw)
      return { period: p, value }
    })
    .filter((d) => !isNaN(d.value) && isFinite(d.value))

  // Keep last 72 months (6 years) — enough for 5y growth + prior-year baseline
  return all.slice(-72)
}

// Annual YoY growth from monthly index observations.
// Only computes growth for a year when the previous year's data is also present,
// avoiding the (curr - curr) / curr = 0 artifact for the oldest year.
export function computeAnnualGrowth(observations) {
  // Bucket observations by year
  const annual = {}
  for (const { period, value } of observations) {
    const year = period.slice(0, 4)
    if (!annual[year]) annual[year] = []
    annual[year].push(value)
  }

  const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length
  const years = Object.keys(annual).sort()

  return years.slice(1).reduce((acc, year) => {
    const prevYear = String(Number(year) - 1)
    // Only compute if we actually have prior year data — skip to avoid a 0% artifact
    if (!annual[prevYear]?.length) return acc

    const curr = avg(annual[year])
    const prev = avg(annual[prevYear])
    if (prev === 0) return acc

    acc.push({
      year,
      growth: parseFloat((((curr - prev) / prev) * 100).toFixed(2)),
    })
    return acc
  }, [])
}

// ─── World Bank ──────────────────────────────────────────────────────────────

const WB_BASE = 'https://api.worldbank.org/v2'
// NV.IND.TOTL.ZS = Industry (incl. construction) value added as % of GDP
const WB_INDICATOR = 'NV.IND.TOTL.ZS'

const WB_ISO2 = { USA: 'US', DEU: 'DE', JPN: 'JP' }

export async function fetchIndustryGDP(countryCode) {
  const iso2 = WB_ISO2[countryCode]
  if (!iso2) throw new Error(`No WB code for ${countryCode}`)

  const currentYear = new Date().getFullYear()
  // Fetch a wider window (10 years) since World Bank data has ~2-year publication lag
  const fromYear = currentYear - 10
  const url = `${WB_BASE}/country/${iso2}/indicator/${WB_INDICATOR}?format=json&date=${fromYear}:${currentYear}&per_page=20`
  const { data } = await axios.get(url)

  const records = data?.[1]
  if (!records?.length) throw new Error('No records from World Bank')

  return records
    .filter((r) => r.value !== null && r.value !== undefined)
    .map((r) => ({ year: String(r.date), value: parseFloat(r.value.toFixed(2)) }))
    .sort((a, b) => a.year.localeCompare(b.year))
}

// ─── Yahoo Finance (via Vite proxy) ─────────────────────────────────────────

const TICKERS = {
  'S&P 500': 'SPY',
  'Global Industry ETF': 'VIS',
  'Crude Oil': 'USO',
  'Copper ETF': 'CPER',
  'US Dollar Index': 'UUP',
}

async function fetchTicker(symbol, label) {
  const url = `/yahoo-finance/v8/finance/chart/${symbol}?interval=1d&range=1mo`
  const { data } = await axios.get(url)
  const result = data?.chart?.result?.[0]
  if (!result) throw new Error(`No data for ${symbol}`)

  const quotes = result.indicators?.quote?.[0]
  const timestamps = result.timestamp
  if (!quotes || !timestamps?.length) throw new Error(`Incomplete data for ${symbol}`)

  const closes = quotes.close ?? []

  // Array.prototype.findLast is ES2023 — use a safe fallback
  let latest = null
  for (let i = closes.length - 1; i >= 0; i--) {
    if (closes[i] != null) { latest = closes[i]; break }
  }
  let first = null
  for (let i = 0; i < closes.length; i++) {
    if (closes[i] != null) { first = closes[i]; break }
  }

  if (latest == null || first == null) throw new Error(`No valid close prices for ${symbol}`)

  const change1M = parseFloat((((latest - first) / first) * 100).toFixed(2))
  const series = timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      close: closes[i] != null ? parseFloat(closes[i].toFixed(2)) : null,
    }))
    .filter((d) => d.close !== null)

  return { symbol, label, latest: parseFloat(latest.toFixed(2)), change1M, series }
}

export async function fetchMarketData() {
  const results = await Promise.allSettled(
    Object.entries(TICKERS).map(([label, sym]) => fetchTicker(sym, label))
  )
  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value
    const [label, symbol] = Object.entries(TICKERS)[i]
    return { symbol, label, latest: null, change1M: null, series: [], error: r.reason?.message }
  })
}
