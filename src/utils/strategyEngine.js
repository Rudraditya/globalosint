// ─── Five Forces — Strategy Engine ───────────────────────────────────────────
//
// Maps a Five Forces state (each force scored 1–10, where higher = more
// intense / less favourable to an incumbent) onto Porter's three generic
// strategies — Cost Leadership, Differentiation, and Focus — with a plain-
// English justification built from the actual scores.

export const FORCE_DEFS = [
  {
    key: 'rivalry',
    label: 'Rivalry Among Existing Competitors',
    short: 'Rivalry',
    color: '#ff6b35',
    description: 'Intensity of head-to-head competition — price wars, marketing battles, capacity races.',
  },
  {
    key: 'supplierPower',
    label: 'Bargaining Power of Suppliers',
    short: 'Supplier Power',
    color: '#38bdf8',
    description: 'Ability of suppliers to raise input costs, cut quality, or restrict availability.',
  },
  {
    key: 'buyerPower',
    label: 'Bargaining Power of Buyers',
    short: 'Buyer Power',
    color: '#4ade80',
    description: 'Ability of customers to demand lower prices, more features, or better service.',
  },
  {
    key: 'threatOfEntry',
    label: 'Threat of New Entrants',
    short: 'Threat of Entry',
    color: '#c084fc',
    description: 'How easily new competitors can enter the market and erode incumbent advantages.',
  },
  {
    key: 'threatOfSubstitution',
    label: 'Threat of Substitute Products',
    short: 'Substitution',
    color: '#fbbf24',
    description: 'Availability of alternative products or services that satisfy the same customer need.',
  },
]

export const DEFAULT_FORCES = Object.fromEntries(FORCE_DEFS.map((f) => [f.key, 5]))

// Relative influence of each data tier on the final force scores —
// Country (regulatory/macro) < Sector (operational) < Industry (micro/competitive).
export const TIER_WEIGHTS = { country: 0.2, sector: 0.3, industry: 0.5 }

const clamp1to10 = (v) => Math.min(10, Math.max(1, Math.round(v)))

// Combines the three cascading tier vectors (each a full 1-10 force vector —
// see fiveForcesApi.js) into a single blended vector using TIER_WEIGHTS. This
// is the vector passed to recommendStrategy() and shown on the sliders.
export function blendForces(countryForces, sectorForces, industryForces) {
  const blended = {}
  for (const { key } of FORCE_DEFS) {
    const weighted =
      countryForces[key] * TIER_WEIGHTS.country +
      sectorForces[key] * TIER_WEIGHTS.sector +
      industryForces[key] * TIER_WEIGHTS.industry
    blended[key] = clamp1to10(weighted)
  }
  return blended
}

const round1 = (v) => Math.round(v * 10) / 10

// Returns { strategy, focusVariant, scores, avgIntensity, spread, justification, drivers }
export function recommendStrategy(forces) {
  const { rivalry, supplierPower, buyerPower, threatOfEntry, threatOfSubstitution } = forces
  const values = Object.values(forces)
  const avgIntensity = values.reduce((a, b) => a + b, 0) / values.length
  const spread = Math.max(...values) - Math.min(...values)

  let cost = 0, diff = 0, focus = 0
  const costReasons = [], diffReasons = [], focusReasons = []

  // Rivalry: intense head-to-head rivalry rewards the lowest-cost producer;
  // softer rivalry leaves room to compete on non-price factors.
  if (rivalry >= 6) {
    cost += rivalry * 0.4
    costReasons.push(`Rivalry is intense (${rivalry}/10) — competitors are likely fighting on price, so the lowest-cost producer wins share.`)
  } else {
    diff += (10 - rivalry) * 0.25
    diffReasons.push(`Rivalry is contained (${rivalry}/10), leaving room to compete on factors other than price.`)
  }

  // Buyer power: powerful buyers squeeze margins regardless of strategy —
  // differentiation reduces price sensitivity, a low cost base absorbs the squeeze.
  if (buyerPower >= 6) {
    diff += buyerPower * 0.3
    cost += buyerPower * 0.2
    diffReasons.push(`Buyers hold strong bargaining power (${buyerPower}/10) — differentiation builds switching costs that make demand less price-sensitive.`)
    costReasons.push(`Buyers hold strong bargaining power (${buyerPower}/10) — a low-cost base leaves more room to absorb price concessions.`)
  } else {
    diff += (6 - buyerPower) * 0.1
    diffReasons.push(`Buyers have limited leverage (${buyerPower}/10), making it easier to sustain a price premium for differentiated offerings.`)
  }

  // Supplier power: weak suppliers let a firm negotiate inputs down (cost
  // leadership); strong suppliers make that difficult, favouring differentiation.
  if (supplierPower >= 6) {
    diff += supplierPower * 0.25
    diffReasons.push(`Supplier power is high (${supplierPower}/10), making input-cost cuts difficult — differentiation lets premium pricing absorb those costs.`)
  } else {
    cost += (10 - supplierPower) * 0.25
    costReasons.push(`Supplier power is low (${supplierPower}/10), so input costs can be negotiated down to support a cost-leadership position.`)
  }

  // Threat of entry: low threat (high barriers) protects scale-based cost
  // advantages; high threat pushes firms toward defensible brand/niche moats.
  if (threatOfEntry <= 4) {
    cost += (10 - threatOfEntry) * 0.3
    costReasons.push(`Threat of new entrants is low (${threatOfEntry}/10) — high entry barriers protect scale and cost advantages once they're built.`)
  } else {
    diff += threatOfEntry * 0.2
    focus += threatOfEntry * 0.25
    diffReasons.push(`Threat of new entrants is elevated (${threatOfEntry}/10) — brand strength and differentiation create a moat that's hard for newcomers to copy.`)
    focusReasons.push(`Threat of new entrants is elevated (${threatOfEntry}/10) — a narrow, well-defended niche is easier to hold than the broad market.`)
  }

  // Threat of substitution: high threat punishes commodity positioning,
  // favouring differentiation; low threat keeps price as the main lever.
  if (threatOfSubstitution >= 6) {
    diff += threatOfSubstitution * 0.35
    diffReasons.push(`Threat of substitutes is high (${threatOfSubstitution}/10) — unique features or brand loyalty are needed to stop customers switching to alternatives.`)
  } else {
    cost += (10 - threatOfSubstitution) * 0.15
    costReasons.push(`Threat of substitutes is low (${threatOfSubstitution}/10), so price remains the main basis of competition within the category.`)
  }

  // Overall intensity & spread: a uniformly brutal market favours retreating
  // to a defensible niche; a wide spread suggests under-served pockets exist.
  if (avgIntensity >= 6.5) {
    focus += (avgIntensity - 5) * 1.4
    focusReasons.push(`Overall force intensity is high (avg ${round1(avgIntensity)}/10) — competing across the entire market may be unsustainable, so narrowing scope limits exposure.`)
  }
  if (spread >= 4) {
    focus += spread * 0.6
    focusReasons.push(`The forces vary widely (spread of ${spread}/10 between the strongest and weakest) — uneven competitive intensity suggests under-served segments exist for a focus strategy.`)
  }

  const scores = {
    'Cost Leadership': round1(cost),
    'Differentiation': round1(diff),
    'Focus': round1(focus),
  }
  const reasonsMap = {
    'Cost Leadership': costReasons,
    'Differentiation': diffReasons,
    'Focus': focusReasons,
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const strategy = ranked[0][0]
  const runnerUp = ranked[1][0]

  // When Focus wins, indicate whether a cost-based or differentiation-based
  // niche play fits better, based on the secondary scores.
  const focusVariant = strategy === 'Focus'
    ? (scores['Cost Leadership'] >= scores['Differentiation'] ? 'Cost Focus' : 'Differentiation Focus')
    : null

  return {
    strategy,
    focusVariant,
    runnerUp,
    scores,
    avgIntensity: round1(avgIntensity),
    spread,
    justification: reasonsMap[strategy].join(' '),
    drivers: reasonsMap[strategy],
  }
}
