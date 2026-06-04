/**
 * GGPoker freezeout MTTs (non-PKO, non-bounty).
 * Buy-in splits sourced from published GGPoker lobby format (prize pool + fee).
 * Guarantees and typical fields from GGPoker schedule / public reporting.
 */

/** @typedef {"regular" | "turbo" | "hyper"} TournamentSpeed */

/** @typedef {{ id: string, name: string, buyInTotal: number, poolEntry: number, fee: number, guarantee: number, typicalField: number, placesPaidPct: number, schedule: string, speed: TournamentSpeed, tags: string[] }} Tournament */

/** @type {Tournament[]} */
export const GG_TOURNAMENTS = [
  {
    id: "ggmasters-asia-25",
    name: "GGMasters Asia",
    buyInTotal: 25,
    poolEntry: 23,
    fee: 2,
    guarantee: 40_000,
    typicalField: 1_800,
    placesPaidPct: 15,
    schedule: "Mon–Sat · 11:00 UTC",
    speed: "turbo",
    tags: ["ggmasters", "freezeout", "daily", "25", "turbo"],
  },
  {
    id: "ggmasters-double-stack-25",
    name: "GGMasters Double Stack",
    buyInTotal: 25,
    poolEntry: 23,
    fee: 2,
    guarantee: 40_000,
    typicalField: 1_750,
    placesPaidPct: 15,
    schedule: "Mon–Sat · 13:00 UTC",
    speed: "regular",
    tags: ["ggmasters", "freezeout", "daily", "25", "double stack"],
  },
  {
    id: "ggmasters-classic-25",
    name: "GGMasters Classic",
    buyInTotal: 25,
    poolEntry: 23,
    fee: 2,
    guarantee: 50_000,
    typicalField: 2_200,
    placesPaidPct: 15,
    schedule: "Mon–Sat · 17:00 UTC",
    speed: "regular",
    tags: ["ggmasters", "freezeout", "daily", "25"],
  },
  {
    id: "daily-major-75",
    name: "Daily Major",
    buyInTotal: 75,
    poolEntry: 69,
    fee: 6,
    guarantee: 25_000,
    typicalField: 360,
    placesPaidPct: 15,
    schedule: "Daily · evening UTC",
    speed: "turbo",
    tags: ["daily guarantees", "freezeout", "75", "turbo"],
  },
  {
    id: "daily-special-150",
    name: "Daily Special",
    buyInTotal: 150,
    poolEntry: 138,
    fee: 12,
    guarantee: 50_000,
    typicalField: 360,
    placesPaidPct: 15,
    schedule: "Daily",
    speed: "regular",
    tags: ["daily guarantees", "freezeout", "150"],
  },
  {
    id: "ggmasters-150",
    name: "GGMasters",
    buyInTotal: 150,
    poolEntry: 138,
    fee: 12,
    guarantee: 1_000_000,
    typicalField: 7_300,
    placesPaidPct: 15,
    schedule: "Sunday · 17:00 UTC",
    speed: "regular",
    tags: ["ggmasters", "freezeout", "flagship", "150", "million"],
  },
  {
    id: "ggmasters-320",
    name: "GGMasters",
    buyInTotal: 320,
    poolEntry: 294,
    fee: 26,
    guarantee: 400_000,
    typicalField: 1_360,
    placesPaidPct: 14,
    schedule: "Sunday · 19:30 UTC",
    speed: "regular",
    tags: ["ggmasters", "freezeout", "320"],
  },
  {
    id: "ggmasters-1050",
    name: "GGMasters High Roller",
    buyInTotal: 1_050,
    poolEntry: 966,
    fee: 84,
    guarantee: 750_000,
    typicalField: 780,
    placesPaidPct: 13,
    schedule: "Sunday · 17:00 UTC",
    speed: "regular",
    tags: ["ggmasters", "freezeout", "high roller", "1050"],
  },
  {
    id: "daily-major-250",
    name: "Daily Major (Sunday)",
    buyInTotal: 250,
    poolEntry: 230,
    fee: 20,
    guarantee: 100_000,
    typicalField: 435,
    placesPaidPct: 14,
    schedule: "Sunday",
    speed: "regular",
    tags: ["daily guarantees", "freezeout", "250"],
  },
  {
    id: "millions-50",
    name: "MILLION$ Kickoff",
    buyInTotal: 50,
    poolEntry: 46,
    fee: 4,
    guarantee: 100_000,
    typicalField: 2_200,
    placesPaidPct: 15,
    schedule: "Series / weekly",
    speed: "turbo",
    tags: ["millions", "freezeout", "50", "turbo"],
  },
  {
    id: "millions-150",
    name: "MILLION$ Main Event",
    buyInTotal: 150,
    poolEntry: 138,
    fee: 12,
    guarantee: 500_000,
    typicalField: 3_650,
    placesPaidPct: 15,
    schedule: "Series",
    speed: "regular",
    tags: ["millions", "freezeout", "150"],
  },
  {
    id: "wsop-super-circuit-525",
    name: "WSOP Super Circuit",
    buyInTotal: 525,
    poolEntry: 483,
    fee: 42,
    guarantee: 300_000,
    typicalField: 575,
    placesPaidPct: 13,
    schedule: "Series",
    speed: "regular",
    tags: ["wsop", "freezeout", "525"],
  },
];

export const SPEED_LABELS = {
  regular: "Regular",
  turbo: "Turbo",
  hyper: "Hyper",
};

/** How blind structure / speed affects achievable ROI (planning guidance, not simulated). */
export function getSpeedRoiImpact(speed) {
  const impacts = {
    regular: {
      roiEffect: "Full edge",
      headline: "Regular speed — best format to realize ROI",
      description:
        "Slower blind levels and deeper stacks mean more postflop decisions. If you have a technical edge, it translates most reliably here — your tracker ROI in regulars is usually the best benchmark for this sim.",
    },
    turbo: {
      roiEffect: "~10–20% lower effective ROI",
      headline: "Turbo — faster blinds compress your edge",
      description:
        "Blinds rise quickly, so there's less room for postflop skill. Push/fold and short-stack spots dominate. Winning regs often run 10–20% lower ROI than in regulars at the same buy-in — not because they play worse, but because the structure limits edge. Variance per hour is higher, but you can play more volume.",
    },
    hyper: {
      roiEffect: "~20–35% lower effective ROI",
      headline: "Hyper — edge is hardest to extract",
      description:
        "Very fast structure with minimal postflop play. Even strong players struggle to maintain the same ROI as regular speeds — edges get diluted and luck weighs more per tournament. Only worth it if you specialize in hyper strategy or need extreme volume.",
    },
  };
  return impacts[speed] ?? impacts.regular;
}

export function searchTournaments(query) {
  const q = query.trim().toLowerCase();
  if (!q) return GG_TOURNAMENTS;
  return GG_TOURNAMENTS.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.includes(q)) ||
      t.speed.includes(q) ||
      SPEED_LABELS[t.speed].toLowerCase().includes(q) ||
      String(t.buyInTotal).includes(q) ||
      t.schedule.toLowerCase().includes(q)
  );
}

export function getTournamentById(id) {
  return GG_TOURNAMENTS.find((t) => t.id === id) ?? GG_TOURNAMENTS[0];
}

export function feePercent(tournament) {
  return (tournament.fee / tournament.poolEntry) * 100;
}

export function minFieldForGuarantee(tournament) {
  return Math.ceil(tournament.guarantee / tournament.poolEntry);
}

export function getFieldProfile(fieldSize) {
  if (fieldSize < 500) {
    return {
      level: "low",
      label: "More predictable",
      shortLabel: "Small field",
      description:
        "Smaller fields mean more ITMs and less reliance on a deep run. Best option with a limited bankroll or short timeframe.",
    };
  }
  if (fieldSize < 2000) {
    return {
      level: "medium",
      label: "Moderate variance",
      shortLabel: "Medium field",
      description:
        "Moderate variance — you need hundreds of tournaments to stabilize results. A balance between decent prizes and manageable swings.",
    };
  }
  return {
    level: "high",
    label: "High variance",
    shortLabel: "Large field",
    description:
      "High variance — one final table changes everything, but you can run 500+ tournaments in the red with a positive ROI. Only makes sense with a large roll and long horizon.",
  };
}
