/**
 * GGPoker-style MTT payout structures for standard freezeouts (non-PKO).
 *
 * Based on publicly reported online MTT norms and GGMasters reporting:
 * - ~12–16% of field paid (scales with field size)
 * - 1st place ~17–22% of prize pool on large fields
 * - Min-cash typically ~1.5–2× buy-in on flagship events
 *
 * References: GGPoker schedule, Pokerfuse GGMasters coverage, standard online MTT ladders.
 */

export function placesPaidCount(fieldSize, placesPaidPct) {
  if (fieldSize <= 9) return fieldSize;
  const pct = placesPaidPct / 100;
  return Math.max(3, Math.floor(fieldSize * pct));
}

/**
 * Online MTT payout curve — top-heavy with smooth decay.
 * Calibrated so 1st ≈ targetFirstPct of pool, min-cash ≈ targetMinCash × poolEntry.
 */
export function generateGgPayoutTable({
  fieldSize,
  placesPaidPct,
  prizePool,
  poolEntry,
  buyInTotal,
}) {
  const placesPaid = placesPaidCount(fieldSize, placesPaidPct);
  const firstPct = firstPlacePercent(fieldSize);
  const targetFirst = prizePool * (firstPct / 100);

  const alpha = decayAlpha(fieldSize);
  const raw = [];
  for (let i = 1; i <= placesPaid; i += 1) {
    raw.push(1 / Math.pow(i, alpha));
  }
  const rawSum = raw.reduce((a, b) => a + b, 0);

  let payouts = raw.map((w) => (w / rawSum) * prizePool);

  // Scale to hit realistic 1st-place % (online MTT standard)
  const scale = targetFirst / payouts[0];
  payouts = payouts.map((p) => p * scale);

  // Renormalize to full prize pool
  const total = payouts.reduce((a, b) => a + b, 0);
  payouts = payouts.map((p) => (p / total) * prizePool);

  // Floor min-cash at ~1.5× buy-in, cap at prize pool
  const minCashTarget = buyInTotal * 1.5;
  if (placesPaid > 1 && payouts[placesPaid - 1] < minCashTarget) {
    const deficit = minCashTarget - payouts[placesPaid - 1];
    payouts[placesPaid - 1] = minCashTarget;
    const topSlice = payouts.slice(0, placesPaid - 1);
    const topSum = topSlice.reduce((a, b) => a + b, 0);
    const available = prizePool - minCashTarget;
    payouts = topSlice.map((p) => (p / topSum) * available);
    payouts.push(minCashTarget);
  }

  // Final normalize (floating-point drift)
  const sum = payouts.reduce((a, b) => a + b, 0);
  payouts = payouts.map((p) => (p / sum) * prizePool);

  return { placesPaid, payouts, firstPct: (payouts[0] / prizePool) * 100 };
}

function firstPlacePercent(fieldSize) {
  if (fieldSize < 100) return 28;
  if (fieldSize < 500) return 22;
  if (fieldSize < 2000) return 19;
  if (fieldSize < 5000) return 17;
  return 15.5;
}

function decayAlpha(fieldSize) {
  if (fieldSize < 200) return 1.05;
  if (fieldSize < 2000) return 1.12;
  return 1.18;
}

export function buildTournamentModel(tournament, fieldOverride) {
  const fieldSize = fieldOverride ?? tournament.typicalField;
  const prizePool = tournament.poolEntry * fieldSize;
  const table = generateGgPayoutTable({
    fieldSize,
    placesPaidPct: tournament.placesPaidPct,
    prizePool,
    poolEntry: tournament.poolEntry,
    buyInTotal: tournament.buyInTotal,
  });

  return {
    fieldSize,
    prizePool,
    placesPaid: table.placesPaid,
    payouts: table.payouts,
    firstPlacePct: table.firstPct,
    minCash: table.payouts[table.payouts.length - 1],
    placesPaidPct: tournament.placesPaidPct,
  };
}
