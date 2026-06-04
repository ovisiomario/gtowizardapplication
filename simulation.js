/**
 * MTT variance simulation using explicit payout tables (GGPoker-style).
 */

function sampleFinishRank(fieldSize, skill) {
  const u = Math.random();
  const adjusted = Math.pow(u, skill);
  const rank = Math.ceil(adjusted * fieldSize);
  return Math.min(fieldSize, Math.max(1, rank));
}

function tournamentProfit(rank, placesPaid, payouts, totalBuyIn) {
  if (rank > placesPaid) return -totalBuyIn;
  return payouts[rank - 1] - totalBuyIn;
}

function calibrateSkill({ fieldSize, placesPaid, payouts, totalBuyIn, roiPercent }) {
  const targetEv = (roiPercent / 100) * totalBuyIn;
  let lo = 0.05;
  let hi = 8;

  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    let sum = 0;
    const trials = 8000;
    for (let t = 0; t < trials; t += 1) {
      const rank = sampleFinishRank(fieldSize, mid);
      sum += tournamentProfit(rank, placesPaid, payouts, totalBuyIn);
    }
    const ev = sum / trials;
    if (ev < targetEv) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function percentile(sorted, p) {
  const idx = Math.floor((sorted.length - 1) * p);
  return sorted[idx];
}

function histogram(values, bins = 40) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const counts = new Array(bins).fill(0);
  const step = range / bins;
  for (const v of values) {
    let b = Math.floor((v - min) / step);
    if (b >= bins) b = bins - 1;
    counts[b] += 1;
  }
  const labels = counts.map((_, i) => min + (i + 0.5) * step);
  return { labels, counts, min, max };
}

export function runSimulation(params) {
  const {
    totalBuyIn,
    fieldSize,
    placesPaid,
    payouts,
    roiPercent,
    numTournaments,
    numSamples,
    startingBankroll,
    fee,
    poolEntry,
  } = params;

  const skill = calibrateSkill({
    fieldSize,
    placesPaid,
    payouts,
    totalBuyIn,
    roiPercent,
  });

  const startingBankrollAmount = startingBankroll;
  const finalProfits = [];
  let ruinCount = 0;
  const samplePaths = [];
  let bestPath = null;
  let worstPath = null;
  let bestProfit = -Infinity;
  let worstProfit = Infinity;
  const confidenceBands = Array.from({ length: numTournaments + 1 }, () => []);

  for (let s = 0; s < numSamples; s += 1) {
    let bankroll = startingBankrollAmount;
    let profit = 0;
    const path = [0];
    let ruined = false;

    for (let t = 0; t < numTournaments; t += 1) {
      const rank = sampleFinishRank(fieldSize, skill);
      const result = tournamentProfit(rank, placesPaid, payouts, totalBuyIn);
      profit += result;
      bankroll += result;
      path.push(profit);
      if (bankroll <= 0) ruined = true;
    }

    finalProfits.push(profit);
    if (ruined) ruinCount += 1;

    for (let i = 0; i < path.length; i += 1) {
      confidenceBands[i].push(path[i]);
    }

    if (profit > bestProfit) {
      bestProfit = profit;
      bestPath = path;
    }
    if (profit < worstProfit) {
      worstProfit = profit;
      worstPath = path;
    }

    if (s < 20) samplePaths.push(path);
  }

  finalProfits.sort((a, b) => a - b);

  const bands = confidenceBands.map((arr) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return {
      p10: percentile(sorted, 0.1),
      p15: percentile(sorted, 0.15),
      p50: percentile(sorted, 0.5),
      p85: percentile(sorted, 0.85),
      p90: percentile(sorted, 0.9),
    };
  });

  const dist = histogram(finalProfits);
  const stillDownPct =
    (finalProfits.filter((p) => p < 0).length / finalProfits.length) * 100;
  const profitablePct = 100 - stillDownPct;
  const medianProfit = percentile(finalProfits, 0.5);
  const p10Profit = percentile(finalProfits, 0.1);
  const p25Profit = percentile(finalProfits, 0.25);
  const p75Profit = percentile(finalProfits, 0.75);
  const p90Profit = percentile(finalProfits, 0.9);
  const ruinPct = (ruinCount / numSamples) * 100;

  const minBankrollBuyIns = estimateMinBankroll({
    fieldSize,
    skill,
    placesPaid,
    payouts,
    totalBuyIn,
    numTournaments,
  });

  return {
    stillDownPct,
    profitablePct,
    medianProfit,
    p10Profit,
    p25Profit,
    p75Profit,
    p90Profit,
    bestProfit,
    worstProfit,
    ruinPct,
    minBankrollBuyIns,
    minBankrollDollars: minBankrollBuyIns * totalBuyIn,
    expectedProfit: (roiPercent / 100) * totalBuyIn * numTournaments,
    samplePaths,
    bestPath,
    worstPath,
    bands,
    dist,
    numTournaments,
    numSamples,
    fee,
    poolEntry,
    minCash: payouts[payouts.length - 1],
    firstPlace: payouts[0],
  };
}

function estimateMinBankroll(ctx) {
  const { fieldSize, skill, placesPaid, payouts, totalBuyIn, numTournaments } = ctx;
  const samples = 2500;

  function ruinRate(buyIns) {
    const start = buyIns * totalBuyIn;
    let ruined = 0;
    for (let s = 0; s < samples; s += 1) {
      let bankroll = start;
      for (let t = 0; t < numTournaments; t += 1) {
        const rank = sampleFinishRank(fieldSize, skill);
        bankroll += tournamentProfit(rank, placesPaid, payouts, totalBuyIn);
        if (bankroll <= 0) {
          ruined += 1;
          break;
        }
      }
    }
    return ruined / samples;
  }

  let lo = 10;
  let hi = 500;
  while (ruinRate(hi) > 0.05 && hi < 2000) hi *= 1.5;

  for (let i = 0; i < 22; i += 1) {
    const mid = Math.round((lo + hi) / 2);
    if (ruinRate(mid) <= 0.05) hi = mid;
    else lo = mid;
  }
  return hi;
}
