# GlobalOSInt Dashboard — Data Sources Reference

Internal reference for where every figure on the dashboard comes from. Last verified: 2026-06-13.

---

## 1. Live API Integrations

### World Bank API (`https://api.worldbank.org/v2`, no proxy needed — CORS-open)

| Indicator code | Label in UI | View | Status |
|---|---|---|---|
| `NY.GDP.MKTP.CD` | GDP (Nominal), B USD | India Focus / Macro | Active. Confirmed valid. |
| `NY.GDP.MKTP.KD` | GDP (Real), B USD | India Focus | Active. Confirmed valid. |
| `NY.GDP.DEFL.ZS` | GDP Deflator (index) | India Focus | Active. Confirmed valid. |
| `FP.CPI.TOTL.ZG` | CPI Inflation (%) | India Focus | Active. Confirmed valid. |
| `BX.KLT.DINV.CD.WD` | FDI Net Inflows, B USD | India Focus | Active. Confirmed valid. |
| `BX.PEF.TOTL.CD.WD` | Portfolio Equity (FII), B USD | India Focus | Active. Confirmed valid. |
| `NE.EXP.GNFS.CD` | Exports (G&S), B USD | India Focus | Active. Confirmed valid. |
| `NE.IMP.GNFS.CD` | Imports (G&S), B USD | India Focus | Active. Confirmed valid. |
| `FR.INR.LEND` | Lending Interest Rate (%) | India Focus | Active. Confirmed valid. |
| `FI.RES.TOTL.CD` | Forex Reserves, B USD | India Focus (supplemented by IMF, see below) | Active. Confirmed valid. |
| `NY.GNS.ICTR.GN.ZS` | Gross Savings (% GNI) | India Focus | Active. Confirmed valid. |
| `DT.DOD.DECT.CD` | External Debt, B USD | India Focus | Active. Confirmed valid. |
| `NV.IND.TOTL.ZS` | Industry value added (% of GDP) | Supply/Production | Active. Confirmed valid. Label matches indicator definition ("Industry, including construction, value added % of GDP"). |
| `GC.TAX.TOTL.GD.ZS` | Tax revenue (% of GDP) → used as "Threat of Entry" barrier signal | Market Entry — Country tier | Active, real (replaced discontinued `IC.REG.DURS`). **See discrepancy note below.** |
| `BX.GSR.CCIS.ZS` | ICT service exports (% of total service exports) → trade-exposure signal for Software & IT Services industry | Market Entry — Industry tier (Software & IT Services only) | Active. Confirmed valid; label matches indicator definition exactly. |

**Discontinued / not used (correctly avoided):**
- `IC.REG.DURS` ("Time required to start a business") — World Bank metadata confirms Doing Business project discontinued 2021-09-16. Querying India returns zero records for any recent year range. Code comment in `fiveForcesApi.js` is accurate; `GC.TAX.TOTL.GD.ZS` is a reasonable real-data substitute.

### Eurostat (`/eurostat-api` → `https://ec.europa.eu`)
- `nama_10_gdp` dataset, `B1GQ` (GDP at market prices), `CP_MEUR` unit — used for DEU/FRA/ITA GDP in `fetchEurostatGDP`. Falls back to World Bank on failure. Not independently re-verified this run (unchanged since prior sessions); structure looks correct for Eurostat's JSON-stat dissemination API.

### IMF Data Services (`/imf-data` → `https://dataservices.imf.org`)
- `CompactData/IFS/Q.IN.1L_D_BP6_USD` — India quarterly reserve assets (USD millions), used to supplement/override India forex reserves with more recent quarters than World Bank's annual series. Endpoint shape (CompactData SDMX-JSON, `@UNIT_MULT`, `@OBS_VALUE`, `@TIME_PERIOD`) matches IMF IFS conventions. Not independently re-queried this run.

### Yahoo Finance (`/yahoo-finance` → `https://query1.finance.yahoo.com`)

| Ticker | Label | View | Status |
|---|---|---|---|
| `CL=F` | Crude Oil (WTI) | Commodities, Market Snapshot | **Confirmed correct** — CL=F is the NYMEX WTI crude futures continuation contract on Yahoo Finance. |
| `BZ=F` | Brent Crude | Commodities | Standard ICE Brent futures ticker on Yahoo Finance — looks correct. |
| `NG=F` | Natural Gas | Commodities | Standard Henry Hub futures ticker — looks correct. |
| `HO=F` | Heating Oil | Commodities | Standard NYMEX heating oil futures — looks correct. |
| `GC=F` / `SI=F` / `HG=F` / `ALI=F` | Gold/Silver/Copper/Aluminium | Commodities | Standard COMEX/LME futures tickers — looks correct. |
| `ZC=F` / `ZW=F` / `ZS=F` | Corn/Wheat/Soybeans | Commodities | Standard CBOT futures tickers — looks correct. |
| `AUDUSD=X` | AUD/USD | Forex panel | **Confirmed correct direction** — Yahoo Finance quotes AUD (like EUR, GBP, NZD) as a "direct" base currency, so `AUDUSD=X` returns USD-per-AUD (~0.6-0.7 range), matching the `base: 'AUD', quote: 'USD'` definition. Consistent with the commit that fixed this from the earlier `USDAUD=X`. |
| `EURUSD=X`, `GBPUSD=X`, `USDINR=X`, `USDJPY=X`, `USDCNY=X`, `USDBRL=X`, `USDKRW=X`, `USDCAD=X`, `USDZAR=X` | Various forex pairs | Forex panel | Ticker directions match Yahoo's standard conventions (USD as quote for EUR/GBP, USD as base for the rest). Not individually re-tested this run. |
| `SPY`, `VIS`, `CL=F`, `CPER`, `UUP` | S&P 500, Global Industry ETF, Crude Oil (WTI), Copper ETF, US Dollar Index | Market Snapshot | ETF proxies — `VIS` (Vanguard Industrials ETF) and `CPER` (copper ETF) and `UUP` (USD bullish fund) are reasonable real-world proxies for the labeled concepts, though they are fund/ETF prices, not raw indices (e.g. "US Dollar Index" via `UUP` tracks the ICE Dollar Index but isn't identical to the DXY index value itself — label is directionally accurate but not numerically identical to the headline DXY figure). Minor labeling note, not an error. |

### DBnomics / OECD KEI (`https://api.db.nomics.world/v22`, no proxy)
- `OECD/KEI/PRINTO01.<ISO3>.ST.M` — Industrial Production index, monthly, seasonally adjusted, used for `computeAnnualGrowth`. Series codes follow OECD KEI naming convention (PRINTO01 = Production, Total Industry, STSA). Not independently re-queried this run; structure is consistent with known DBnomics/OECD KEI series naming.

---

## 2. Mock / Curated Data — Market Entry Strategy Lab (`fiveForcesApi.js`)

All MOCK indicators below are clearly commented in source with a suggested real replacement.

| Indicator | Tier | Status | Suggested real source (per code comments) |
|---|---|---|---|
| `marketConcentration` | Country | MOCK | World Bank Enterprise Surveys or national HHI dataset |
| `supplierConcentration` | Country | MOCK | `NV.IND.TOTL.ZS` or DBnomics input-output tables |
| `importDependency` | Country | MOCK | `NE.IMP.GNFS.ZS` (Imports, % of GDP) |
| `startupCostPctGNI` | Country | MOCK | `IC.REG.COST.PC.ZS` (Doing Business archive — confirmed this indicator's metadata still exists in WB archive but is part of the discontinued Doing Business set; would need archive-specific query) |
| `tariffRate` | Country | MOCK | `TM.TAX.MRCH.WM.AR.ZS` (confirmed active WB indicator) |
| `rndExpenditurePctGDP` | Country | MOCK | `GB.XPD.RSDV.GD.ZS` (confirmed active WB indicator) |
| `taxRevenuePctGDP` | Country | **REAL** | `GC.TAX.TOTL.GD.ZS` — see discrepancy note below |
| `capacityUtilization`, `ppiYoY` | Sector | MOCK (seeded random) | OECD STAN + national statistics agency PPI series |
| `importPenetration` (most industries) | Industry | MOCK (seeded random) | UN Comtrade HS6 query (reporter=country, partner=World, commodity=HS6 code) — requires subscription key, not proxied |
| `importPenetration` (Software & IT Services only) | Industry | **REAL** | `BX.GSR.CCIS.ZS` |

### MOCK_INDICATORS baseline plausibility check (IND/USA/CHN/DEU/GBR/JPN/BRA)

Spot-checked against known real-world ranges:

- **R&D % of GDP**: USA 3.45%, DEU 3.13%, JPN 3.30%, GBR 2.93%, CHN 2.40%, IND 0.64%, BRA 1.15% — all within plausible real ranges (actual recent figures: USA ~3.5%, DEU ~3.1%, JPN ~3.3%, CHN ~2.4%, India ~0.6-0.7%, Brazil ~1.1-1.3%). **Well calibrated.**
- **Tariff rate**: India 17.6%, China 7.5%, USA 3.4%, EU members 5.0%, Japan 4.0%, Brazil 13.4% — broadly consistent with WTO/WB weighted-mean applied tariff rankings (India and Brazil notably higher than advanced economies). **Plausible.**
- **Startup cost % GNI**: USA 1.0%, UK 0.3%, China 0.5% (very low, consistent with streamlined registration regimes); India 13.8%, Japan 7.5%, Brazil 4.0%, Germany 2.1% — directionally plausible (India and Japan have historically had higher relative business-registration costs in the old Doing Business series), though these are now stale/frozen since Doing Business was discontinued in 2021. **Plausible but dated** — flagged as MOCK already, no action needed.
- **Market/supplier concentration**: all in 0.18-0.55 range, internally consistent and used only for relative scoring — no external benchmark expected since these are illustrative HHI-style proxies.

No values were badly miscalibrated (no order-of-magnitude errors found).

---

## 3. Mock / Curated Data — CR4 Peer Revenue Tables (`industryTaxonomy.js`)

All figures are commented as "illustrative/approximate, FY company-wide". Cross-checked against ~FY2024 public revenue figures (10-K/annual reports, Statista, company press releases).

| Industry | Peer | Code value ($bn) | ~FY2024 actual ($bn) | Delta | Flag |
|---|---|---|---|---|---|
| Oil & Gas | Saudi Aramco | 440 | ~480 | -8% | Minor |
| Oil & Gas | ExxonMobil | 344 | ~339 | +1.5% | OK |
| Oil & Gas | Shell | 316 | ~284 | +11% | Minor |
| Oil & Gas | TotalEnergies | 218 | ~196 | +11% | Minor |
| Oil & Gas | Chevron | 200 | ~193 | +4% | OK |
| Solar | LONGi/JinkoSolar/Trina/Canadian Solar/First Solar | 14 / 12 / 11 / 7 / 3.3 | Not independently re-verified | — | Unverifiable (volatile sector, not checked this run) |
| Passenger Vehicles | Volkswagen Group | 322 | ~352 | -9% | Minor |
| Passenger Vehicles | Toyota | 280 | ~308 | -9% | Minor |
| Passenger Vehicles | Stellantis | 190 | ~170 | +12% | Minor |
| Passenger Vehicles | **Hyundai Motor** | **180** | **~122** | **+48%** | **Inconsistent — overstated by ~48%, may distort CR4 ranking (currently ranks ahead of GM, likely shouldn't)** |
| Passenger Vehicles | General Motors | 171 | ~187 | -9% | Minor |
| Auto Components | Bosch/Denso/Magna/ZF/Continental | 92/50/43/46/41 | Not independently re-verified | — | Unverifiable (not checked this run) |
| Semiconductors | Samsung Electronics | 200 | ~252 (whole-company; semiconductor division alone is lower) | -21% (whole co.) | Minor — ambiguous whether figure represents whole company or semiconductor division; if division-only, 200 may be closer |
| Semiconductors | TSMC | 75 | ~90 | -17% | Minor |
| Semiconductors | Intel | 54 | ~53 | +2% | OK |
| Semiconductors | Micron Technology | 25 | ~25.1 (FY2024) | ~0% | OK |
| Semiconductors | **SK Hynix** | **31** | **~46** | **-33%** | **Inconsistent — understated by ~33%, likely understates semiconductor CR4** |
| Consumer Electronics | Apple | 383 | ~398 | -4% | OK |
| Consumer Electronics | Samsung Electronics | 200 | ~252 | -21% | Minor (same ambiguity as above) |
| Consumer Electronics | **Huawei** | **92** | **~119** | **-23%** | **Inconsistent — understated by ~23%** |
| Consumer Electronics | Xiaomi | 37 | ~51 | -27% | Minor-Inconsistent |
| Consumer Electronics | OPPO (BBK) | 35 | Not independently re-verified | — | Unverifiable |
| IT Hardware | Dell/HP/Lenovo/Apple/ASUSTeK | 88/54/62/383/17 | Apple cross-checked above (-4%); others not re-verified | — | Partial |
| Software & IT Services | Microsoft/Oracle/Accenture/SAP/TCS | 245/52/64/34/29 | Not independently re-verified this run | — | Unverifiable |

**Net effect on CR4**: The Hyundai overstatement (+48%) and SK Hynix/Huawei understatements (-33%/-23%) are the most material. None flip an industry's `classifyConcentration()` bucket (Fragmented <40% / Moderate 40-70% / High >=70%) based on rough recompute, but Hyundai's figure inflates its `share` in the Passenger Vehicles top4 table and likely misorders it relative to GM.

---

## 4. Discrepancy Notes

### GC.TAX.TOTL.GD.ZS for India — anomalous 2022 value
India's `GC.TAX.TOTL.GD.ZS` (Tax revenue, % of GDP) series from World Bank:
- 2014: 9.98% → 2015: 10.57% → 2016: 11.15% → 2017: 11.39% → 2018: 12.02% → **2019-2021: null** → **2022: 6.73%** → 2023-2025: null

`fetchWorldBankLatest` correctly skips nulls and returns the latest non-null value, so it will currently return **2022's 6.73%**, not 2018's 12.0%. The 6.73% figure is a sharp drop from the 2014-2018 trend (~10-12%) and is noticeably lower than India's commonly cited general government tax revenue (~17-18% of GDP per IMF/RBI figures, which include state-level taxes not captured by this central-government-focused IMF GFS series). This appears to be a **source-data quirk in World Bank's series itself** (possibly a methodology break or partial-year reporting for 2022), not a bug in the dashboard code. No code change needed, but if the "Threat of Entry" score for India looks oddly low in the UI, this 6.73% (vs. the more representative ~10-12% historical range) is why — confidence: **Medium** (the WB API value is verified as-returned, but whether 6.73% is a genuinely representative 2022 figure vs. a data artifact is unverifiable without IMF GFS Yearbook access).

### "US Dollar Index" via UUP ETF
Labeled "US Dollar Index" but backed by `UUP` (Invesco DB US Dollar Index Bullish Fund), an ETF that tracks — but is not numerically identical to — the ICE US Dollar Index (DXY). Directionally fine for a dashboard; flagged as a **Minor** labeling precision issue only.

---

## Summary of Issues

- **Critical**: None.
- **Fixed**: Hyundai Motor revenue (180 → 122), SK Hynix revenue (31 → 46), Huawei revenue (92 → 119) in `industryTaxonomy.js` peer tables — updated to ~FY2024 figures for more accurate CR4 calculations.
- **Stale**: `startupCostPctGNI` mock baselines are frozen at pre-2021 Doing Business-era relative values (already flagged as MOCK in code, no action needed unless a replacement source is implemented).
- **Unverifiable**: Solar, Auto Components, IT Hardware (Dell/HP/Lenovo/ASUSTeK), Software & IT Services (Microsoft/Oracle/Accenture/SAP/TCS), Xiaomi/OPPO, and Samsung's segment-vs-whole-company revenue split — not independently re-verified this run; treat as "illustrative" per existing code comments.
- **Minor**: ExxonMobil, Chevron, Intel, Micron are within ~5% of FY2024 actuals (fine). Saudi Aramco, Shell, TotalEnergies, Volkswagen, Toyota, Stellantis, GM, Samsung, TSMC, Xiaomi are 8-21% off but same order of magnitude — acceptable for "illustrative" framing, update opportunistically.

## Methodology Notes
- World Bank indicator codes verified live against `https://api.worldbank.org/v2/indicator/<CODE>?format=json` (metadata) and `https://api.worldbank.org/v2/country/<ISO2>/indicator/<CODE>?format=json&date=...` (data availability), retrieved 2026-06-13.
- Company revenue figures verified via web search against FY2024 annual reports / 10-K filings / press releases / Statista, retrieved 2026-06-13. Most recent full fiscal year used as common baseline; some companies (e.g. Micron) report on non-calendar fiscal years.
- Yahoo Finance ticker conventions verified via web search + existing knowledge of Yahoo's forex quoting conventions (AUD/EUR/GBP/NZD quoted as direct currencies).
- Eurostat, IMF, and DBnomics endpoints were not re-queried this run (unchanged since prior verified sessions per commit history) — flagged as not independently re-verified.
